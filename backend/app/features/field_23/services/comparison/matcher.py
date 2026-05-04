from __future__ import annotations

import numpy as np

from app.features.field_23.models import Article

_EMBEDDING_WEIGHT = 0.7
_TFIDF_WEIGHT = 0.3


def match_articles(
    old_articles: list[Article],
    new_articles: list[Article],
    tfidf_scores: np.ndarray,
    embed_scores: np.ndarray,
    threshold: float = 0.6,
) -> tuple[list[tuple[Article, Article, float]], list[Article], list[Article]]:
    combined_scores = _EMBEDDING_WEIGHT * embed_scores + _TFIDF_WEIGHT * tfidf_scores

    matched_pairs = []
    matched_old_indices = set()
    matched_new_indices = set()

    if combined_scores.size > 0:
        flat_scores = combined_scores.flatten()
        sorted_indices = np.argsort(flat_scores)[::-1]

        num_new = len(new_articles)

        for idx in sorted_indices:
            old_idx = int(idx // num_new)
            new_idx = int(idx % num_new)

            if old_idx in matched_old_indices or new_idx in matched_new_indices:
                continue

            score = combined_scores[old_idx, new_idx]

            if score < threshold:
                break

            matched_pairs.append((old_articles[old_idx], new_articles[new_idx], float(score)))
            matched_old_indices.add(old_idx)
            matched_new_indices.add(new_idx)

    unmatched_old = [
        old_articles[i]
        for i in range(len(old_articles))
        if i not in matched_old_indices
    ]
    unmatched_new = [
        new_articles[i]
        for i in range(len(new_articles))
        if i not in matched_new_indices
    ]

    return matched_pairs, unmatched_old, unmatched_new
