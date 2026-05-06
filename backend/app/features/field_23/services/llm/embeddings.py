from __future__ import annotations

import time
from collections.abc import Callable

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from pydantic import SecretStr

from app.core.config import settings
from app.features.field_23.services.llm.disk_cache import LLM_CACHE, hash_text


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
        max_batch_size: int = 32,
        retry_attempts: int = 4,
    ) -> None:
        self._models: list[str] = [model] + list(fallback_models or ["models/embedding-001"])
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
            f"embeddings::{self._namespace}::{model_name}::{kind}::"
            f"{hash_text(text)}"
        )

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

    def _embed_documents_with_retry(
        self, texts: list[str], *, model: str
    ) -> list[list[float]]:
        last_exc: BaseException | None = None
        for attempt in range(1, self._retry_attempts + 1):
            try:
                return self._get_client(model).embed_documents(texts)
            except Exception as exc:
                last_exc = exc
                if not self._is_rate_limited(exc) or attempt >= self._retry_attempts:
                    raise
                time.sleep(float(2 ** (attempt - 1)))

        assert last_exc is not None
        raise last_exc

    def _embed_documents_with_fallback(
        self, texts: list[str]
    ) -> tuple[list[list[float]], str]:
        last_exc: BaseException | None = None
        active_index = self._models.index(self._active_model)
        candidate_models = self._models[active_index:] + self._models[:active_index]

        for idx, model in enumerate(candidate_models):
            try:
                vectors = self._embed_documents_with_retry(texts, model=model)
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

        initial_model = self._active_model
        prepared = [self._prepare(text) for text in texts]
        results: list[list[float] | None] = [None] * len(prepared)
        missing_indices: list[int] = []
        unique_missing_texts: dict[str, list[int]] = {}

        for idx, text in enumerate(prepared):
            key = self._cache_key(text, kind="doc")
            cached = LLM_CACHE.get(key)
            if cached is not None:
                self.stats["cache_hits"] += 1
                results[idx] = cached
            else:
                self.stats["cache_misses"] += 1
                missing_indices.append(idx)
                unique_missing_texts.setdefault(text, []).append(idx)

        if missing_indices:
            unique_texts = list(unique_missing_texts.keys())
            unique_vectors: dict[str, list[float]] = {}
            for batch in self._chunks(unique_texts, self._max_batch_size):
                embedded_batch, used_model = self._embed_documents_with_fallback(batch)
                if used_model != initial_model:
                    return self.embed_documents(texts)
                for text, vector in zip(batch, embedded_batch, strict=True):
                    unique_vectors[text] = vector
                    LLM_CACHE[self._cache_key(text, kind="doc")] = vector

            for text, indices in unique_missing_texts.items():
                vector = unique_vectors[text]
                for idx in indices:
                    results[idx] = vector

        return [vector if vector is not None else [] for vector in results]

    def embed_query(self, text: str) -> list[float]:
        prepared = self._prepare(text)
        key = self._cache_key(prepared, kind="query")
        cached = LLM_CACHE.get(key)
        if cached is not None:
            self.stats["cache_hits"] += 1
            return cached

        self.stats["cache_misses"] += 1
        vectors, _ = self._embed_documents_with_fallback([prepared])
        vector = vectors[0]
        key = self._cache_key(prepared, kind="query")
        LLM_CACHE[key] = vector
        return vector
