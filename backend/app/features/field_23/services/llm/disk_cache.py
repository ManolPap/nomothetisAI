from __future__ import annotations

import hashlib
from pathlib import Path

from diskcache import Cache

from app.core.config import settings

DEFAULT_CACHE_DIR = Path.home() / ".cache" / "legal_analyzer" / "llm_cache"
CACHE_DIR = Path(settings.feature.field_23_legal_analyzer_cache_dir or str(DEFAULT_CACHE_DIR))
CACHE_DIR.mkdir(parents=True, exist_ok=True)
LLM_CACHE: Cache = Cache(str(CACHE_DIR))


def hash_text(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def clear_llm_cache() -> None:
    """Wipe the on-disk LLM cache."""
    LLM_CACHE.clear()
