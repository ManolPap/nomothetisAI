from __future__ import annotations

import hashlib
import os
from pathlib import Path

from diskcache import Cache

DEFAULT_CACHE_DIR = Path.home() / ".cache" / "legal_analyzer" / "llm_cache"
CACHE_DIR = Path(os.getenv("LEGAL_ANALYZER_CACHE_DIR", str(DEFAULT_CACHE_DIR)))
CACHE_DIR.mkdir(parents=True, exist_ok=True)
LLM_CACHE: Cache = Cache(str(CACHE_DIR))


def hash_text(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def clear_llm_cache() -> None:
    """Wipe the on-disk LLM cache."""
    LLM_CACHE.clear()
