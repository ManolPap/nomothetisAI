
from app.features.field_23.models import Article, ChangeType, DiffSegment


def classify_change(
    old_article: Article, new_article: Article, segments: list[DiffSegment]
) -> ChangeType:
    has_changes = False
    for seg in segments:
        if seg.operation in ["insert", "delete"]:
            if seg.text.strip():
                has_changes = True
                break

    is_renumbered = old_article.article_number != new_article.article_number

    if not has_changes and not is_renumbered:
        return ChangeType.UNCHANGED
    if not has_changes and is_renumbered:
        return ChangeType.RENUMBERED
    if has_changes and is_renumbered:
        return ChangeType.RENUMBERED_MODIFIED
    return ChangeType.MODIFIED
