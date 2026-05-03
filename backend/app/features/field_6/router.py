"""FastAPI router για το Πεδίο 6 — Ανάλυση Συνεπειών Ρύθμισης."""

import os
import tempfile
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.features.field_6.schemas import (
    EurostatRequest,
    EurostatResponse,
    LawMetadata,
    MetadataResponse,
    SynthesizeRequest,
    SynthesizeResponse,
    WebSearchRequest,
    WebSearchResponse,
    WebSource,
)
from app.features.field_6.services.llm_service import (
    step1_extract_metadata,
    step3_generate_queries,
    step5_extract_facts,
    step6_synthesize_field6,
)
from app.features.field_6.services.pdf_reader import (
    extract_articles_from_law,
    extract_text_from_pdf,
)
from app.features.field_6.services.web_search import (
    eurostat_dict_to_text,
    step2_eurlex_nim,
    step4_web_search,
    step5b_eurostat_for_countries,
)

router = APIRouter(prefix="/field6", tags=["field6"])


@router.post(
    "/extract-metadata",
    response_model=MetadataResponse,
    summary="Εξαγωγή μεταδεδομένων από PDF νόμου",
    description=(
        "Δέχεται PDF αρχείο νόμου. Εξάγει μεταδεδομένα (θέμα, υπουργείο, "
        "τομέα, μέτρα, Οδηγία) και αναζητά NIM από EUR-Lex."
    ),
)
async def extract_metadata(
    file: Annotated[UploadFile, File(description="PDF αρχείο του νόμου")],
) -> MetadataResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Το αρχείο πρέπει να είναι PDF.")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        full_text = extract_text_from_pdf(tmp_path)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        os.unlink(tmp_path)

    law_structured = extract_articles_from_law(full_text)
    metadata_dict = step1_extract_metadata(law_structured)
    nim_text = step2_eurlex_nim(metadata_dict)

    return MetadataResponse(
        metadata=LawMetadata(**metadata_dict),
        nim_text=nim_text,
    )


@router.post(
    "/web-search",
    response_model=WebSearchResponse,
    summary="Web search και εξαγωγή facts",
    description=(
        "Δέχεται μεταδεδομένα νόμου. Παράγει queries, εκτελεί web search "
        "με Tavily και εξάγει facts ανά υποπεδίο."
    ),
)
async def web_search(body: WebSearchRequest) -> WebSearchResponse:
    metadata_dict = body.metadata.model_dump()
    queries = step3_generate_queries(metadata_dict)
    search_results = step4_web_search(queries)
    facts_text = step5_extract_facts(metadata_dict, search_results, nim_text=body.nim_text)

    sources = [
        WebSource(
            title=r["title"],
            url=r["url"],
            content=r["content"][:600],
        )
        for r in search_results
    ]

    return WebSearchResponse(sources=sources, facts_text=facts_text)


@router.post(
    "/eurostat",
    response_model=EurostatResponse,
    summary="Αναζήτηση Eurostat δεικτών",
    description=(
        "Δέχεται μεταδεδομένα νόμου και facts. Εντοπίζει χώρες στα facts "
        "και επιστρέφει Eurostat δεδομένα για αυτές."
    ),
)
async def eurostat(body: EurostatRequest) -> EurostatResponse:
    metadata_dict = body.metadata.model_dump()
    eurostat_dict = step5b_eurostat_for_countries(metadata_dict, body.facts_text)

    indicator_name = ""
    if eurostat_dict:
        first = next(iter(eurostat_dict.values()))
        indicator_name = first.get("indicator", "")

    return EurostatResponse(
        eurostat_data=eurostat_dict,
        indicator_name=indicator_name,
    )


@router.post(
    "/synthesize",
    response_model=SynthesizeResponse,
    summary="Σύνθεση τελικού κειμένου Πεδίου 6",
    description=(
        "Δέχεται μεταδεδομένα, facts, Eurostat δεδομένα και επιλεγμένες πηγές. "
        "Συνθέτει και επιστρέφει το τελικό κείμενο Πεδίου 6."
    ),
)
async def synthesize(body: SynthesizeRequest) -> SynthesizeResponse:
    metadata_dict = body.metadata.model_dump()
    field6_text = step6_synthesize_field6(
        metadata_dict,
        body.facts_text,
        body.eurostat_text,
    )

    return SynthesizeResponse(
        field6_text=field6_text,
        word_count=len(field6_text.split()),
    )
