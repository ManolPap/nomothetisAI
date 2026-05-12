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

# --- Title vs operative (body) boundary ------------------------------------
# 3rd-person performative / dispositive openings (sentence-initial, capital in official PDFs).
_DISPOSITIVE_VERBS = (
    r"Δημιουργείται\b|Ορίζεται\b|Δίδεται\b|Καθορίζεται\b|Συνιστάται\b|"
    r"Καταργείται\b|Προστίθεται\b|Αντικαθίσταται\b|Διαγράφεται\b"
)
# Στον/Στο/Στην/… must stay CASE-SENSITIVE: title wraps often produce "στον Κώδικα…"
# (continuation of "…182Α στον\nΚώδικα"), which is NOT the operative "Στον Κώδικα, …".
_OPERATIVE_LEAD = (
    r"(?:"
    r"Στον\b|Στο\s+|Στην\b|Στα\s+|Στις\s+|"
    + _DISPOSITIVE_VERBS
    + r"|(?i:Το\s+άρθρο\b|Τα\s+άρθρα\b|Η\s+παράγραφος\b|Οι\s+(?:διατάξεις|παράγραφοι)\b)"
    r")"
)

# Inline fuse: same physical line glues τίτλος + operative. Split after: 1) …YYYY/ZZZZ)
# 2) …ν. NNNN/YYYY  3) space before dispositive verb (nominative τίτλος, then «Δημιουργείται…»).
TITLE_BODY_INLINE_SPLIT_RE = re.compile(
    rf"(?:"
    rf"(?<=\d{{4}}/\d{{4}}\))"
    rf"|(\b(?:ν|Ν)\.\s*\d{{1,4}}/\d{{4}})"
    rf")(\s*)(?={_OPERATIVE_LEAD})",
)
TITLE_BODY_INLINE_SPLIT_FALLBACK_RE = re.compile(
    rf"\)(\s*)(?={_OPERATIVE_LEAD})",
)
TITLE_BODY_INLINE_SPLIT_VERB_RE = re.compile(rf"(\s+)(?={_DISPOSITIVE_VERBS})")

AMENDMENT_BODY_LINE_START_RE = re.compile(rf"^{_OPERATIVE_LEAD}")

TITLE_LINE_PREFIX_RE = re.compile(r"^\s*τίτλος\s*:", re.IGNORECASE)

SIGNATURE_START_RE = re.compile(
    r"^\s*Αθήνα,\s+\d{1,2}\s+.+?\s+\d{4}\s*$",
    re.IGNORECASE | re.MULTILINE,
)
MINISTERS_HEADER_RE = re.compile(
    r"^\s*ΟΙ\s+ΥΠΟΥΡΓΟΙ\s*$",
    re.IGNORECASE | re.MULTILINE,
)
