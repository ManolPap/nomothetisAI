from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Literal

from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from app.core.config import settings
from app.features.field_23.schemas import (
    ConsultationArticleSectionOut,
    ConsultationReportCommentIn,
    ConsultationReportItemIn,
    ConsultationReportTotalsOut,
    GenerateConsultationReportRequest,
    GenerateConsultationReportResponse,
)
from app.features.field_23.services.comments.loader import load_stored_legislative_comments

logger = logging.getLogger(__name__)

_MAX_SUMMARY_WORDS = 250
_DEFAULT_MODEL = "gemini-2.0-flash"
_LLM_SEM = asyncio.Semaphore(4)


class ConsultationReportValidationError(ValueError):
    pass


class _SummaryOut(BaseModel):
    adopted_summary: str = Field(default="")
    not_adopted_summary: str = Field(default="")


@dataclass(slots=True)
class _SynthResult:
    adopted_summary: str
    not_adopted_summary: str
    used_llm: bool


def _word_count(text: str) -> int:
    return len(text.split())


def _enforce_summary_word_limit(article_number: str, field_name: str, text: str) -> None:
    count = _word_count(text)
    if count > _MAX_SUMMARY_WORDS:
        raise ConsultationReportValidationError(
            f"Το {field_name} για άρθρο {article_number} υπερβαίνει το όριο "
            f"{_MAX_SUMMARY_WORDS} λέξεων ({count})."
        )


def _canonical_comment_mapping() -> dict[str, str]:
    return {
        comment.id.strip(): comment.target_article_number.strip()
        for comment in load_stored_legislative_comments()
    }


def _canonical_participant_mapping() -> dict[str, str]:
    return {
        comment.id.strip(): (comment.participant or "").strip()
        for comment in load_stored_legislative_comments()
    }


def _dedupe_comments_by_id(
    comments: list[ConsultationReportCommentIn],
) -> list[ConsultationReportCommentIn]:
    # Keep first seen id for stable deterministic behavior.
    seen: set[str] = set()
    out: list[ConsultationReportCommentIn] = []
    for comment in comments:
        cid = comment.comment_id.strip()
        if cid in seen:
            continue
        seen.add(cid)
        out.append(comment)
    return out


def _validate_request_payload(request: GenerateConsultationReportRequest) -> None:
    canonical_by_id = _canonical_comment_mapping()
    has_actionable = False

    for item in request.items:
        article_number = item.article_number.strip()
        if not article_number:
            raise ConsultationReportValidationError("Το article_number είναι υποχρεωτικό.")

        for comment in item.comments:
            cid = comment.comment_id.strip()
            if not cid:
                raise ConsultationReportValidationError("Το comment_id είναι υποχρεωτικό.")
            canonical_article = canonical_by_id.get(cid)
            if canonical_article is None:
                raise ConsultationReportValidationError(f"Άγνωστο comment_id: {cid}")
            if canonical_article != article_number:
                raise ConsultationReportValidationError(
                    f"Το comment_id {cid} ανήκει στο άρθρο {canonical_article}, "
                    f"όχι στο {article_number}."
                )
            has_actionable = True

    if not has_actionable:
        raise ConsultationReportValidationError("Δεν υπάρχουν σχόλια για επεξεργασία.")


def _build_fallback_summary(comments: list[ConsultationReportCommentIn]) -> str:
    if not comments:
        return ""
    parts = [c.rationale_el.strip() for c in comments if c.rationale_el.strip()]
    if not parts:
        return ""
    text = " ".join(parts)
    words = text.split()
    return " ".join(words[:_MAX_SUMMARY_WORDS])


async def _llm_summarize_article(
    article: ConsultationReportItemIn,
    model_name: str,
) -> _SummaryOut:
    adopted = [
        c.rationale_el.strip()
        for c in article.comments
        if c.adopted and c.rationale_el.strip()
    ]
    not_adopted = [
        c.rationale_el.strip()
        for c in article.comments
        if (not c.adopted) and c.rationale_el.strip()
    ]
    llm = ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=(
            settings.feature.field_23_google_api_key.get_secret_value()
            if settings.feature.field_23_google_api_key
            else None
        ),
        temperature=0.1,
    ).with_structured_output(_SummaryOut)

    prompt = (
        "Σύνθεσε συνοπτικό report για δημόσια διαβούλευση ΜΟΝΟ για 'επί των άρθρων'. "
        "Απάντησε αυστηρά στα πεδία adopted_summary και not_adopted_summary, "
        f"με μέγιστο {_MAX_SUMMARY_WORDS} λέξεις ανά πεδίο. "
        "Αν δεν υπάρχουν σχόλια για μια κατηγορία, επέστρεψε κενό string.\n\n"
        f"article_number: {article.article_number}\n"
        f"article_title: {article.article_title}\n"
        f"adopted_rationales:\n- " + "\n- ".join(adopted or [""]) + "\n\n"
        "not_adopted_rationales:\n- " + "\n- ".join(not_adopted or [""])
    )
    async with _LLM_SEM:
        raw = await llm.ainvoke(prompt)
    if isinstance(raw, _SummaryOut):
        return raw
    if isinstance(raw, dict):
        return _SummaryOut.model_validate(raw)
    raise RuntimeError("Unexpected LLM response format")


async def _synthesize_article(
    item: ConsultationReportItemIn,
    model_name: str | None,
    llm_enabled: bool,
) -> _SynthResult:
    deduped = _dedupe_comments_by_id(item.comments)
    adopted_comments = [c for c in deduped if c.adopted]
    not_adopted_comments = [c for c in deduped if not c.adopted]

    if not llm_enabled:
        return _SynthResult(
            adopted_summary=_build_fallback_summary(adopted_comments),
            not_adopted_summary=_build_fallback_summary(not_adopted_comments),
            used_llm=False,
        )

    try:
        summary = await _llm_summarize_article(item, model_name or _DEFAULT_MODEL)
        return _SynthResult(
            adopted_summary=summary.adopted_summary.strip(),
            not_adopted_summary=summary.not_adopted_summary.strip(),
            used_llm=True,
        )
    except Exception:
        logger.exception("field_23.consultation_report.llm_failed article=%s", item.article_number)
        return _SynthResult(
            adopted_summary=_build_fallback_summary(adopted_comments),
            not_adopted_summary=_build_fallback_summary(not_adopted_comments),
            used_llm=False,
        )


def _compose_final_preview(
    articles: list[ConsultationArticleSectionOut],
    totals: ConsultationReportTotalsOut,
) -> str:
    blocks: list[str] = [
        f"Αριθμός συμμετασχόντων: {totals.participants_total}",
    ]
    for section in articles:
        adopted_n = section.adopted_count
        not_adopted_n = section.not_adopted_count
        lines = [
            f"Άρθρο {section.article_number} - {section.article_title}",
            (
                f"Σχόλια: {section.comment_count} "
                f"(υιοθετήθηκαν: {adopted_n}, μη υιοθετήθηκαν: {not_adopted_n})"
            ),
        ]
        if section.adopted_summary:
            lines.append(f"Υιοθετήθηκαν: {section.adopted_summary}")
        if section.not_adopted_summary:
            lines.append(f"Δεν υιοθετήθηκαν: {section.not_adopted_summary}")
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)


async def generate_consultation_report(
    request: GenerateConsultationReportRequest,
    model_name: str | None = None,
) -> GenerateConsultationReportResponse:
    _validate_request_payload(request)

    llm_enabled = settings.feature.field_23_google_api_key is not None
    synth_results = await asyncio.gather(
        *[_synthesize_article(item, model_name, llm_enabled=llm_enabled) for item in request.items]
    )

    articles_section: list[ConsultationArticleSectionOut] = []
    participants_by_comment_id = _canonical_participant_mapping()
    participant_keys: set[str] = set()
    comments_total = 0
    adopted_total = 0
    not_adopted_total = 0
    llm_successes = 0

    for item, synth in zip(request.items, synth_results, strict=True):
        deduped = _dedupe_comments_by_id(item.comments)
        adopted_count = sum(1 for c in deduped if c.adopted)
        not_adopted_count = len(deduped) - adopted_count
        comments_total += len(deduped)
        adopted_total += adopted_count
        not_adopted_total += not_adopted_count
        for comment in deduped:
            participant = participants_by_comment_id.get(comment.comment_id.strip(), "").strip()
            participant_keys.add(participant or comment.comment_id.strip())

        _enforce_summary_word_limit(item.article_number, "adopted_summary", synth.adopted_summary)
        _enforce_summary_word_limit(
            item.article_number, "not_adopted_summary", synth.not_adopted_summary
        )
        if synth.used_llm:
            llm_successes += 1

        articles_section.append(
            ConsultationArticleSectionOut(
                article_number=item.article_number,
                article_title=item.article_title,
                comment_count=len(deduped),
                adopted_count=adopted_count,
                not_adopted_count=not_adopted_count,
                adopted_summary=synth.adopted_summary,
                not_adopted_summary=synth.not_adopted_summary,
            )
        )

    if llm_successes == len(request.items):
        llm_status: Literal["ok", "fallback", "partial"] = "ok"
    elif llm_successes == 0:
        llm_status = "fallback"
    else:
        llm_status = "partial"

    totals = ConsultationReportTotalsOut(
        comments_total=comments_total,
        adopted_total=adopted_total,
        not_adopted_total=not_adopted_total,
        participants_total=len(participant_keys),
    )

    return GenerateConsultationReportResponse(
        totals=totals,
        articles_section=articles_section,
        final_preview_text=_compose_final_preview(articles_section, totals),
        llm_status=llm_status,
    )
