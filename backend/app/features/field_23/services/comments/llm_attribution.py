from __future__ import annotations

import asyncio
import logging
from functools import lru_cache
from typing import Literal

from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from app.core.config import settings
from app.features.field_23.schemas import (
    ArticleChangeCommentsItem,
    ArticleOut,
    AttributeLegislativeCommentsRequest,
    AttributeLegislativeCommentsResponse,
    CommentContributionOut,
    ItemAttributionOut,
    StoredLegislativeComment,
)
from app.features.field_23.services.comments.attribution_prompts import (
    LEGISLATIVE_COMMENT_ATTRIBUTION_PROMPT,
)
from app.features.field_23.services.comments.loader import load_stored_legislative_comments

_MAX_ARTICLE_CHARS = 12_000
_DEFAULT_MODEL = "gemini-2.0-flash"
_SEM = asyncio.Semaphore(4)
logger = logging.getLogger(__name__)


def _estimate_tokens(text: str) -> int:
    # Rough heuristic for Gemini-family prompts when tokenizer is unavailable.
    return max(1, len(text) // 4)


class _LLMContributionsPayload(BaseModel):
    """Μορφή structured output από το Gemini."""

    contributions: list["_LLMContributionJudgement"] = Field(
        ...,
        description=(
            "Μία γραμμή ανά σχόλιο· τα comment_id πρέπει να ταιριάζουν ακριβώς με τα δοθέντα."
        ),
    )


class _LLMContributionJudgement(BaseModel):
    comment_id: str
    contribution_likelihood: Literal["none", "low", "medium", "high"]
    rationale_el: str


def _truncate(text: str, limit: int = _MAX_ARTICLE_CHARS) -> str:
    text = text or ""
    if len(text) <= limit:
        return text
    return text[:limit] + "\n\n[... το κείμενο περικόπηκε ...]"


def _format_article(label: str, article: ArticleOut | None) -> str:
    if article is None:
        return f"({label}: δεν παρασχέθηκε.)"
    return "\n".join(
        [
            f"{label}",
            f"article_number: {article.article_number}",
            f"header: {article.header}",
            f"title: {article.title}",
            f"body:\n{_truncate(article.body)}",
        ]
    )


def _article_numbers_for_item(item: ArticleChangeCommentsItem) -> set[str]:
    nums: set[str] = set()
    if item.initial_article is not None:
        nums.add(item.initial_article.article_number.strip())
    if item.final_article is not None:
        nums.add(item.final_article.article_number.strip())
    return nums


def _comments_for_item(item: ArticleChangeCommentsItem) -> list[StoredLegislativeComment]:
    nums = _article_numbers_for_item(item)
    if not nums:
        return []
    seen: dict[str, StoredLegislativeComment] = {}
    for c in load_stored_legislative_comments():
        if c.target_article_number.strip() in nums:
            seen[c.id] = c
    return sorted(seen.values(), key=lambda c: c.id)


def _format_comments_block(comments: list[StoredLegislativeComment]) -> str:
    lines: list[str] = []
    for i, c in enumerate(comments, start=1):
        lines.append(
            f"--- Σχόλιο {i} ---\nid: {c.id}\nστόχος άρθρο: {c.target_article_number}\n"
            f"κείμενο:\n{_truncate(c.text, 6000)}"
        )
    return "\n\n".join(lines)


@lru_cache(maxsize=1)
def _chat_factory(model_name: str) -> ChatGoogleGenerativeAI:
    api_key = (
        settings.feature.field_23_google_api_key.get_secret_value()
        if settings.feature.field_23_google_api_key
        else None
    )
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=0.1,
    )


def _merge_judgements(
    comments: list[StoredLegislativeComment],
    raw: _LLMContributionsPayload | None,
) -> list[CommentContributionOut]:
    if raw is None:
        return [
            CommentContributionOut(
                comment_id=c.id,
                comment_text=c.text,
                contribution_likelihood="none",
                rationale_el="Δεν επεστράφη απάντηση από το μοντέλο.",
            )
            for c in comments
        ]
    by_id = {j.comment_id: j for j in raw.contributions}
    out: list[CommentContributionOut] = []
    for c in comments:
        j = by_id.get(c.id)
        if j is not None:
            out.append(
                CommentContributionOut(
                    comment_id=j.comment_id,
                    comment_text=c.text,
                    contribution_likelihood=j.contribution_likelihood,
                    rationale_el=j.rationale_el,
                )
            )
        else:
            out.append(
                CommentContributionOut(
                    comment_id=c.id,
                    comment_text=c.text,
                    contribution_likelihood="none",
                    rationale_el="Το μοντέλο δεν επέστρεψε κρίση για αυτό το id.",
                )
            )
    return out


async def _attribute_single_item(
    item: ArticleChangeCommentsItem,
    model: str | None,
) -> ItemAttributionOut:
    comments = _comments_for_item(item)
    if not comments:
        return ItemAttributionOut(item_index=item.item_index, contributions=[])

    model_name = model or settings.feature.field_23_comment_attribution_model or _DEFAULT_MODEL
    llm = _chat_factory(model_name)
    structured = llm.with_structured_output(_LLMContributionsPayload)

    chain = LEGISLATIVE_COMMENT_ATTRIBUTION_PROMPT | structured

    initial_block = _format_article("ΑΡΧΙΚΟ ΑΡΘΡΟ", item.initial_article)
    final_block = _format_article("ΤΕΛΙΚΟ ΑΡΘΡΟ", item.final_article)
    comments_block = _format_comments_block(comments)
    estimated_tokens = (
        _estimate_tokens(initial_block)
        + _estimate_tokens(final_block)
        + _estimate_tokens(comments_block)
    )

    async with _SEM:
        logger.warning(
            "field_23.llm.comments.request model=%s item_index=%s "
            "comments_count=%s estimated_tokens=%s",
            model_name,
            item.item_index,
            len(comments),
            estimated_tokens,
        )
        raw = await chain.ainvoke(
            {
                "initial_block": initial_block,
                "final_block": final_block,
                "comments_block": comments_block,
            }
        )

    parsed: _LLMContributionsPayload | None
    if isinstance(raw, _LLMContributionsPayload):
        parsed = raw
    elif isinstance(raw, dict):
        parsed = _LLMContributionsPayload.model_validate(raw)
    else:
        parsed = None

    contributions = _merge_judgements(comments, parsed)
    return ItemAttributionOut(item_index=item.item_index, contributions=contributions)


async def attribute_legislative_comments_llm(
    request: AttributeLegislativeCommentsRequest,
) -> AttributeLegislativeCommentsResponse:
    tasks = [_attribute_single_item(item, request.model) for item in request.items]
    items = await asyncio.gather(*tasks)
    return AttributeLegislativeCommentsResponse(items=list(items))
