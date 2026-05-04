from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from pydantic import TypeAdapter

from app.features.field_23.schemas import StoredLegislativeComment

_FIELD_23_ROOT = Path(__file__).resolve().parent.parent.parent
_COMMENTS_FILE = _FIELD_23_ROOT / "data" / "legislative_comments.json"


@lru_cache(maxsize=1)
def load_stored_legislative_comments() -> tuple[StoredLegislativeComment, ...]:
    """Φόρτωση σχολίων από JSON (αντικατάσταση αρχείου σε production)."""
    if not _COMMENTS_FILE.is_file():
        return ()
    raw = json.loads(_COMMENTS_FILE.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        return ()
    adapter = TypeAdapter(list[StoredLegislativeComment])
    return tuple(adapter.validate_python(raw))
