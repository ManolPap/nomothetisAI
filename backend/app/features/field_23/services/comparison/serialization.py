from __future__ import annotations

from app.features.field_23.models import ArticleDiff
from app.features.field_23.schemas import ArticleDiffOut, ArticleOut, DiffSegmentOut


def article_diff_to_out(diff: ArticleDiff) -> ArticleDiffOut:
    return ArticleDiffOut(
        old_article=ArticleOut(**diff.old_article.__dict__) if diff.old_article else None,
        new_article=ArticleOut(**diff.new_article.__dict__) if diff.new_article else None,
        change_type=diff.change_type.value,
        similarity_score=diff.similarity_score,
        token_change_fraction=diff.token_change_fraction,
        segments=[
            DiffSegmentOut(operation=s.operation, text=s.text) for s in diff.segments
        ],
    )
