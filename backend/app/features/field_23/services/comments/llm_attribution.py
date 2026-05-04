from __future__ import annotations

import asyncio
import os
from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

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


class _LLMContributionsPayload(BaseModel):
    """Μορφή structured output από το Gemini."""

    contributions: list[CommentContributionOut] = Field(
        ...,
        description=(
            "Μία γραμμή ανά σχόλιο· τα comment_id πρέπει να ταιριάζουν ακριβώς με τα δοθέντα."
        ),
    )


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
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=os.getenv("GOOGLE_API_KEY"),
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
            out.append(j)
        else:
            out.append(
                CommentContributionOut(
                    comment_id=c.id,
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

    model_name = model or os.getenv("FIELD_23_COMMENT_ATTRIBUTION_MODEL", _DEFAULT_MODEL)
    llm = _chat_factory(model_name)
    structured = llm.with_structured_output(_LLMContributionsPayload)

    chain = LEGISLATIVE_COMMENT_ATTRIBUTION_PROMPT | structured

    initial_block = _format_article("ΑΡΧΙΚΟ ΑΡΘΡΟ", item.initial_article)
    final_block = _format_article("ΤΕΛΙΚΟ ΑΡΘΡΟ", item.final_article)
    comments_block = _format_comments_block(comments)

    async with _SEM:
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
