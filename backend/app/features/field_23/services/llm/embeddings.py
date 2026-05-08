from __future__ import annotations

import logging
import re
import time
from collections.abc import Callable

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from pydantic import SecretStr

from app.core.config import settings
from app.features.field_23.services.llm.disk_cache import LLM_CACHE, hash_text

logger = logging.getLogger(__name__)


class CachedEmbeddings:
    """Shared embedding client with per-text persistent cache."""

    def __init__(
        self,
        *,
        model: str = "models/gemini-embedding-2-preview",
        fallback_models: list[str] | None = None,
        api_key: str | None = None,
        namespace: str = "default",
        preprocess: Callable[[str], str] | None = None,
        max_batch_size: int = 40,
        retry_attempts: int = 4,
    ) -> None:
        self._models: list[str] = [model] + list(fallback_models or ["models/gemini-embedding-001"])
        self._models = list(dict.fromkeys(self._models))
        self._active_model = self._models[0]
        self._api_key = (
            api_key
            or (
                settings.feature.field_23_google_api_key.get_secret_value()
                if settings.feature.field_23_google_api_key
                else None
            )
        )
        self._namespace = namespace
        self._preprocess = preprocess
        self._max_batch_size = max(1, int(max_batch_size))
        self._retry_attempts = max(1, int(retry_attempts))
        self._clients: dict[str, GoogleGenerativeAIEmbeddings] = {}
        self.stats: dict[str, int] = {
            "cache_hits": 0,
            "cache_misses": 0,
            "model_fallbacks": 0,
        }

    @staticmethod
    def _slug_model(model: str) -> str:
        return re.sub(r"[^a-zA-Z0-9]+", "_", model).strip("_").lower()

    def _namespace_for_model(self, model: str) -> str:
        # Keep model caches isolated to avoid mixed-vector invalidations.
        return f"{self._namespace}::model::{self._slug_model(model)}"

    def _get_client(self, model: str) -> GoogleGenerativeAIEmbeddings:
        if model not in self._clients:
            api_key_secret = SecretStr(self._api_key) if self._api_key else None
            self._clients[model] = GoogleGenerativeAIEmbeddings(
                model=model,
                api_key=api_key_secret,
            )
        return self._clients[model]

    def _prepare(self, text: str) -> str:
        cleaned = text or ""
        if self._preprocess is not None:
            cleaned = self._preprocess(cleaned)
        return cleaned

    def _cache_key(self, text: str, *, kind: str, model: str | None = None) -> str:
        model_name = model or self._active_model
        return (
            f"embeddings::{self._namespace_for_model(model_name)}::{kind}::"
            f"{hash_text(text)}"
        )

    def _cache_get_vector(self, text: str, *, kind: str) -> tuple[list[float], str] | None:
        """Return (vector, model) from first cache hit across models; primary first."""
        for model in self._models:
            key = self._cache_key(text, kind=kind, model=model)
            cached = LLM_CACHE.get(key)
            if cached is not None:
                return cached, model
        return None

    @staticmethod
    def _is_rate_limited(exc: BaseException) -> bool:
        msg = str(exc).lower()
        return (
            "resource_exhausted" in msg
            or "rate limit" in msg
            or "quota" in msg
            or "429" in msg
        )

    @staticmethod
    def _chunks(items: list[str], size: int) -> list[list[str]]:
        return [items[i : i + size] for i in range(0, len(items), size)]

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        # Rough heuristic for Gemini-family prompts when tokenizer is unavailable.
        return max(1, len(text) // 4)

    @classmethod
    def _estimate_batch_tokens(cls, texts: list[str]) -> int:
        return sum(cls._estimate_tokens(text) for text in texts)

    def _embed_documents_with_retry(
        self, texts: list[str], *, model: str
    ) -> list[list[float]]:
        last_exc: BaseException | None = None
        for attempt in range(1, self._retry_attempts + 1):
            try:
                est_tokens = self._estimate_batch_tokens(texts)
                logger.warning(
                    "field_23.llm.embeddings.request model=%s kind=documents "
                    "attempt=%s/%s batch_size=%s estimated_tokens=%s",
                    model,
                    attempt,
                    self._retry_attempts,
                    len(texts),
                    est_tokens,
                )
                return self._get_client(model).embed_documents(texts)
            except Exception as exc:
                last_exc = exc
                if not self._is_rate_limited(exc) or attempt >= self._retry_attempts:
                    raise
                logger.warning(
                    "field_23.llm.embeddings.retry model=%s attempt=%s/%s reason=%s",
                    model,
                    attempt,
                    self._retry_attempts,
                    str(exc),
                )
                time.sleep(float(2 ** (attempt - 1)))

        assert last_exc is not None
        raise last_exc

    def _embed_documents_with_sub_batches(
        self, texts: list[str], *, model: str, remaining_calls: list[int]
    ) -> list[list[float]]:
        if remaining_calls[0] <= 0:
            raise ValueError(
                "Embedding call budget exceeded while splitting sub-batches (max 10 calls)."
            )
        remaining_calls[0] -= 1
        vectors = self._embed_documents_with_retry(texts, model=model)
        if len(vectors) == len(texts):
            return vectors
        if len(texts) == 1:
            raise ValueError(
                f"Embedding API returned {len(vectors)} vectors for 1 text using model '{model}'."
            )
        mid = max(1, len(texts) // 2)
        left = self._embed_documents_with_sub_batches(
            texts[:mid], model=model, remaining_calls=remaining_calls
        )
        right = self._embed_documents_with_sub_batches(
            texts[mid:], model=model, remaining_calls=remaining_calls
        )
        return left + right

    def _align_vectors_count(
        self, texts: list[str], vectors: list[list[float]], *, model: str
    ) -> list[list[float]]:
        if len(vectors) == len(texts):
            return vectors
        if not vectors:
            raise ValueError(f"Embedding API returned no vectors for model '{model}'.")
        # Keep batching behavior only: retry via recursive sub-batches with a hard call cap.
        return self._embed_documents_with_sub_batches(
            texts, model=model, remaining_calls=[10]
        )

    def _embed_documents_with_fallback(
        self, texts: list[str]
    ) -> tuple[list[list[float]], str]:
        last_exc: BaseException | None = None
        active_index = self._models.index(self._active_model)
        candidate_models = self._models[active_index:] + self._models[:active_index]

        for idx, model in enumerate(candidate_models):
            try:
                vectors = self._embed_documents_with_retry(texts, model=model)
                vectors = self._align_vectors_count(texts, vectors, model=model)
                if model != self._active_model:
                    self._active_model = model
                    self.stats["model_fallbacks"] += 1
                return vectors, model
            except Exception as exc:
                last_exc = exc
                if idx == len(candidate_models) - 1:
                    raise
                continue

        assert last_exc is not None
        raise last_exc

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        prepared = [self._prepare(text) for text in texts]
        n = len(prepared)
        results: list[list[float] | None] = [None] * n
        pending_hits: list[tuple[int, list[float], str]] = []

        for idx, text in enumerate(prepared):
            got = self._cache_get_vector(text, kind="doc")
            if got is not None:
                vector, model = got
                pending_hits.append((idx, vector, model))
            else:
                self.stats["cache_misses"] += 1

        hit_models = {m for _, _, m in pending_hits}
        preferred_model = self._active_model if self._active_model in hit_models else None
        if preferred_model is None and hit_models:
            preferred_model = next(iter(hit_models))

        if len(hit_models) > 1:
            logger.warning(
                "field_23.llm.embeddings.cache model_mismatch namespace=%s "
                "models=%s — using preferred_model=%s and recomputing missing",
                self._namespace,
                sorted(hit_models),
                preferred_model,
            )

        for idx, vector, model in pending_hits:
            if preferred_model is None or model == preferred_model:
                self.stats["cache_hits"] += 1
                results[idx] = vector
            else:
                self.stats["cache_misses"] += 1

        if preferred_model is not None:
            self._active_model = preferred_model

        missing_indices = [i for i in range(n) if results[i] is None]
        if not missing_indices:
            return [vector if vector is not None else [] for vector in results]

        unique_missing_texts: dict[str, list[int]] = {}
        for idx in missing_indices:
            text = prepared[idx]
            unique_missing_texts.setdefault(text, []).append(idx)

        unique_texts = list(unique_missing_texts.keys())
        unique_vectors: dict[str, list[float]] = {}
        for batch in self._chunks(unique_texts, self._max_batch_size):
            embedded_batch, used_model = self._embed_documents_with_fallback(batch)
            for text, vector in zip(batch, embedded_batch, strict=True):
                unique_vectors[text] = vector
                LLM_CACHE[self._cache_key(text, kind="doc", model=used_model)] = vector

        for text, indices in unique_missing_texts.items():
            vector = unique_vectors[text]
            for idx in indices:
                results[idx] = vector

        return [vector if vector is not None else [] for vector in results]

    def embed_query(self, text: str) -> list[float]:
        prepared = self._prepare(text)
        got = self._cache_get_vector(prepared, kind="query")
        if got is not None:
            self.stats["cache_hits"] += 1
            vector, model = got
            self._active_model = model
            return vector

        self.stats["cache_misses"] += 1
        logger.warning(
            "field_23.llm.embeddings.request model=%s kind=query batch_size=1 estimated_tokens=%s",
            self._active_model,
            self._estimate_tokens(prepared),
        )
        vectors, used_model = self._embed_documents_with_fallback([prepared])
        vector = vectors[0]
        LLM_CACHE[self._cache_key(prepared, kind="query", model=used_model)] = vector
        return vector
