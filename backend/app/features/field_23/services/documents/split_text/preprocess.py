"""Normalize PDF-extracted lines and strip boilerplate tails."""

from __future__ import annotations

import re

from app.features.field_23.services.documents.split_text.patterns import (
    MINISTERS_HEADER_RE,
    PAGE_NUMBER_RE,
    SIGNATURE_START_RE,
)


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = (
        text.replace("\r\n", "\n")
        .replace("\r", "\n")
        .replace("\u00a0", " ")
        .replace("\ufeff", "")
    )
    lines = [line.rstrip() for line in text.split("\n")]
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def is_noise_line(line: str) -> bool:
    s = (line or "").strip()
    if not s:
        return False
    if PAGE_NUMBER_RE.match(s):
        return True
    if re.match(r"^[\-\–\—]?\s*\d+\s*[\-\–\—]?$", s):
        return True
    return False


def clean_noise_lines(text: str) -> str:
    lines = text.split("\n")
    cleaned = [line for line in lines if not is_noise_line(line)]
    text = "\n".join(cleaned)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def remove_trailing_signature_block(text: str) -> str:
    if not text:
        return ""

    candidates = []
    date_match = SIGNATURE_START_RE.search(text)
    if date_match:
        candidates.append(date_match.start())
    ministers_match = MINISTERS_HEADER_RE.search(text)
    if ministers_match:
        candidates.append(ministers_match.start())

    if not candidates:
        return text.strip()

    return text[: min(candidates)].strip()


def remove_trailing_chapters(text: str) -> str:
    if not text:
        return ""

    match = re.search(r"(?im)^\s*(ΚΕΦΑΛΑΙΟ|ΜΕΡΟΣ|ΤΜΗΜΑ)\b.*", text)
    if match:
        return text[: match.start()].strip()

    return text.strip()


def cut_before_first_article(text: str) -> str:
    text = normalize_text(text)
    text = clean_noise_lines(text)

    article1_re = re.compile(
        r"^(Άρθρο|ΑΡΘΡΟ)\s+1[Α-ΩA-Z]?\s*$",
        re.IGNORECASE | re.MULTILINE,
    )
    article1 = article1_re.search(text)
    if article1:
        return text[article1.start() :].strip()

    first_article_re = re.compile(
        r"^(Άρθρο|ΑΡΘΡΟ)\s+\d+[Α-ΩA-Z]?\s*$",
        re.IGNORECASE | re.MULTILINE,
    )
    first_article = first_article_re.search(text)
    if first_article:
        return text[first_article.start() :].strip()

    return text.strip()
