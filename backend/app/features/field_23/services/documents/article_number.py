"""Stable sort keys for Greek law article labels (e.g. \"12\", \"3Α\")."""

from __future__ import annotations

import re

_ARTICLE_NUMBER_RE = re.compile(r"^(\d+)([Α-ΩA-Z]?)$")


def article_sort_tuple(number_str: str) -> tuple[int, str]:
    m = _ARTICLE_NUMBER_RE.match((number_str or "").strip())
    if not m:
        return (999_999, "")
    return (int(m.group(1)), m.group(2) or "")
