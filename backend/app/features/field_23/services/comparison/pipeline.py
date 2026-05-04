from __future__ import annotations

from app.features.field_23.models import Article, ArticleDiff, ChangeType
from app.features.field_23.services.comparison.differ import compute_diff_tokens
from app.features.field_23.services.comparison.matcher import match_articles
from app.features.field_23.services.comparison.normalizer import normalize_for_comparison
from app.features.field_23.services.comparison.scorer import Scorer
from app.features.field_23.services.comparison.significance import classify_change
from app.features.field_23.services.documents.article_number import article_sort_tuple

SIMILARITY_MATCH_THRESHOLD = 0.6


def _combined_article_text(article: Article) -> str:
    return f"{article.title}\n\n{article.body}".strip()


def _diff_article_sort_key(diff: ArticleDiff) -> tuple[int, str]:
    art = diff.new_article or diff.old_article
    return article_sort_tuple(art.article_number if art else "")


def run_comparison_pipeline(
    old_dicts: list[dict],
    new_dicts: list[dict],
    *,
    normalize_before_diff: bool = False,
) -> list[ArticleDiff]:
    old_articles = [Article(**d) for d in old_dicts]
    new_articles = [Article(**d) for d in new_dicts]

    if not old_articles and not new_articles:
        return []

    scorer = Scorer()

    old_norm = [normalize_for_comparison(f"{a.title} {a.body}") for a in old_articles]
    new_norm = [normalize_for_comparison(f"{a.title} {a.body}") for a in new_articles]

    tfidf_scores = scorer.compute_tfidf_similarities(old_norm, new_norm)
    embed_scores = scorer.compute_embedding_similarities(old_norm, new_norm)

    matched_pairs, unmatched_old, unmatched_new = match_articles(
        old_articles,
        new_articles,
        tfidf_scores,
        embed_scores,
        threshold=SIMILARITY_MATCH_THRESHOLD,
    )

    results: list[ArticleDiff] = []

    for old_art, new_art, score in matched_pairs:
        segments, token_change_fraction = compute_diff_tokens(
            _combined_article_text(old_art),
            _combined_article_text(new_art),
            normalize_text=normalize_before_diff,
        )
        change_type = classify_change(old_art, new_art, segments)
        results.append(
            ArticleDiff(
                old_article=old_art,
                new_article=new_art,
                change_type=change_type,
                similarity_score=score,
                token_change_fraction=token_change_fraction,
                segments=segments,
            )
        )

    for old_art in unmatched_old:
        results.append(
            ArticleDiff(
                old_article=old_art,
                new_article=None,
                change_type=ChangeType.REMOVED,
                similarity_score=0.0,
            )
        )

    for new_art in unmatched_new:
        results.append(
            ArticleDiff(
                old_article=None,
                new_article=new_art,
                change_type=ChangeType.ADDED,
                similarity_score=0.0,
            )
        )

    results.sort(key=_diff_article_sort_key)
    return results
