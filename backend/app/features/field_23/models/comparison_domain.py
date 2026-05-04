"""Domain types for law article comparison (field_23 comparison pipeline)."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


class Article(BaseModel):
    article_number: str
    header: str = ""
    title: str = ""
    body: str = ""


class DiffSegment(BaseModel):
    operation: str
    text: str


class ChangeType(StrEnum):
    UNCHANGED = "unchanged"
    RENUMBERED = "renumbered"
    RENUMBERED_MODIFIED = "renumbered_modified"
    MODIFIED = "modified"
    REMOVED = "removed"
    ADDED = "added"


class ArticleDiff(BaseModel):
    old_article: Article | None = None
    new_article: Article | None = None
    change_type: ChangeType
    similarity_score: float = 0.0
    token_change_fraction: float = 0.0
    segments: list[DiffSegment] = Field(default_factory=list)
