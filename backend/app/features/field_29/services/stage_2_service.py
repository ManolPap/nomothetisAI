import re
from typing import Any, TypedDict

from app.features.field_29.services.stage_1_service import (
    AffectedProvision,
    Field29StageOneRow,
)
from app.features.field_30.services.legal_corpus_index import (
    CorpusChunk,
    chunk_to_dict,
    extract_case_text,
    find_corpus_chunks,
    normalize_law_number,
    with_case_text,
)

MISSING_EXISTING_PROVISION_TEXT = (
    "Δεν εντοπίστηκε στο διαθέσιμο corpus το κείμενο της υφιστάμενης διάταξης."
)


def is_addition_only_change_type(change_type: str | None) -> bool:
    """True when the row is classified as addition only (no prior provision in corpus)."""
    if not change_type or not str(change_type).strip():
        return False

    labels = {part.strip() for part in str(change_type).split("/")}
    return labels == {"addition"}


class Field29RowWithExisting(Field29StageOneRow):
    existing_provisions_text: str
    matched_chunks: list[dict[str, str | None]]


class ResolvedAffectedProvision(TypedDict):
    text: str
    matched_chunks: list[CorpusChunk]


def split_reference_values(value: str | None) -> list[str]:
    if not value:
        return []

    return [match.group(0) for match in re.finditer(r"\d+[Α-ΩA-Z]?", value)]


def retrieve_chunks_for_affected_provision(
    affected_provision: AffectedProvision,
) -> list[CorpusChunk]:
    if is_addition_only_change_type(affected_provision.get("change_type")):
        return []

    law_number = normalize_law_number(affected_provision.get("law_number"))
    article = affected_provision.get("article")
    if not law_number or not article:
        return []

    paragraph_refs = split_reference_values(affected_provision.get("paragraph"))
    case_label = affected_provision.get("case")

    if paragraph_refs:
        paragraph_chunks: list[CorpusChunk] = []
        for paragraph in paragraph_refs:
            paragraph_chunks.extend(
                find_corpus_chunks(
                    law_number=law_number,
                    article=article,
                    paragraph=paragraph,
                )
            )

        if paragraph_chunks and case_label:
            case_chunks = []
            for chunk in paragraph_chunks:
                case_text = extract_case_text(chunk.text, case_label)
                if case_text:
                    case_chunks.append(with_case_text(chunk, case_label, case_text))

            if case_chunks:
                return case_chunks

            return find_corpus_chunks(law_number=law_number, article=article)

        if paragraph_chunks:
            return paragraph_chunks

    return find_corpus_chunks(law_number=law_number, article=article)


def format_existing_provision(chunks: list[CorpusChunk]) -> str:
    if not chunks:
        return MISSING_EXISTING_PROVISION_TEXT

    first = chunks[0]
    law_label = " ".join(part for part in (first.law_type, first.law_number) if part)
    heading = f"Άρθρο {first.article}"
    if law_label:
        heading = f"{heading} {law_label}"
    if first.fek:
        heading = f"{heading} ({first.fek})"

    parts = [heading]
    if first.article_title:
        parts.append(first.article_title)

    parts.extend(chunk.text for chunk in chunks if chunk.text)
    return "\n\n".join(parts).strip()


def resolve_affected_provision(
    affected_provision: AffectedProvision,
) -> ResolvedAffectedProvision:
    chunks = retrieve_chunks_for_affected_provision(affected_provision)
    return {
        "text": format_existing_provision(chunks),
        "matched_chunks": chunks,
    }


def build_existing_provisions_text(
    affected_provisions: list[AffectedProvision],
) -> tuple[str, list[dict[str, str | None]]]:
    if not affected_provisions:
        return MISSING_EXISTING_PROVISION_TEXT, []

    text_parts: list[str] = []
    matched_chunks: list[CorpusChunk] = []

    for affected_provision in affected_provisions:
        resolved = resolve_affected_provision(affected_provision)
        text = resolved["text"]
        if text not in text_parts:
            text_parts.append(text)
        matched_chunks.extend(resolved["matched_chunks"])

    return "\n\n".join(text_parts).strip(), dedupe_matched_chunks(matched_chunks)


def dedupe_matched_chunks(chunks: list[CorpusChunk]) -> list[dict[str, str | None]]:
    deduped: dict[tuple[str, str, str | None, str | None, str], CorpusChunk] = {}

    for chunk in chunks:
        key = (
            chunk.law_number or "",
            chunk.article,
            chunk.paragraph,
            chunk.case,
            chunk.text,
        )
        deduped.setdefault(key, chunk)

    return [chunk_to_dict(chunk) for chunk in deduped.values()]


def build_field_29_stage_2_rows(
    stage_1_rows: list[Field29StageOneRow],
) -> list[Field29RowWithExisting]:
    rows: list[Field29RowWithExisting] = []

    for row in stage_1_rows:
        existing_text, matched_chunks = build_existing_provisions_text(
            row["affected_provisions"]
        )
        rows.append(
            {
                **row,
                "existing_provisions_text": existing_text,
                "matched_chunks": matched_chunks,
            }
        )

    return rows


def build_field_29_stage_2_response(
    filename: str,
    articles: list[dict[str, Any]],
    stage_1_rows: list[Field29StageOneRow],
) -> dict[str, object]:
    return {
        "filename": filename,
        "total_articles": len(articles),
        "field_29_articles_count": len(stage_1_rows),
        "rows": build_field_29_stage_2_rows(stage_1_rows),
    }
