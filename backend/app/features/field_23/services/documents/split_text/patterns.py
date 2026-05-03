"""Compiled regex patterns for splitting Greek legislative PDF text."""

from __future__ import annotations

import re

ARTICLE_RE = re.compile(
    r"^(Άρθρο|ΑΡΘΡΟ)\s+(\d+)([Α-ΩA-Z]?)\s*$",
    re.IGNORECASE | re.MULTILINE,
)
PARAGRAPH_START_RE = re.compile(r"^\d+\.\s+")
PAGE_NUMBER_RE = re.compile(r"^\s*\d+\s*$")
CHAPTER_RE = re.compile(r"^\s*(ΚΕΦΑΛΑΙΟ|ΜΕΡΟΣ|ΤΜΗΜΑ)\b", re.IGNORECASE)
ENTRY_INTO_FORCE_TITLE_RE = re.compile(
    r"^\s*(Έναρξη\s+ισχύος|ΕΝΑΡΞΗ\s+ΙΣΧΥΟΣ)\s*$",
    re.IGNORECASE,
)
SIGNATURE_START_RE = re.compile(
    r"^\s*Αθήνα,\s+\d{1,2}\s+.+?\s+\d{4}\s*$",
    re.IGNORECASE | re.MULTILINE,
)
MINISTERS_HEADER_RE = re.compile(
    r"^\s*ΟΙ\s+ΥΠΟΥΡΓΟΙ\s*$",
    re.IGNORECASE | re.MULTILINE,
)
