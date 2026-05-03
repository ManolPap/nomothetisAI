"""FastAPI router για το Πεδίο 6 — Ανάλυση Συνεπειών Ρύθμισης."""

import os
import tempfile

from fastapi import APIRouter, HTTPException, UploadFile, File

from app.features.field_6.schemas import Field6Response, LawMetadata, WebSource
from app.features.field_6.services.pdf_reader import (
    extract_articles_from_law,
    extract_text_from_pdf,
)
from app.features.field_6.services.llm_service import (
    step1_extract_metadata,
    step3_generate_queries,
    step5_extract_facts,
    step6_synthesize_field6,
)
from app.features.field_6.services.web_search import (
    eurostat_dict_to_text,
    step2_eurlex_nim,
    step4_web_search,
    step5b_eurostat_for_countries,
)

router = APIRouter(prefix="/field6", tags=["field6"])


@router.post(
    "/analyze",
    response_model=Field6Response,
    summary="Αυτόματη συμπλήρωση Πεδίου 6 από PDF νόμου",
    description=(
        "Δέχεται PDF αρχείο νόμου και επιστρέφει το αυτόματα "
        "συμπληρωμένο Πεδίο 6 της ΑΣΡ με διεθνείς πρακτικές."
    ),
)
async def analyze_field6(
    file: UploadFile = File(..., description="PDF αρχείο του νόμου"),
) -> Field6Response:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Το αρχείο πρέπει να είναι PDF.")

    law_name = os.path.splitext(file.filename)[0]

    # Αποθηκεύουμε προσωρινά το PDF για να το διαβάσει το fitz
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

    # Pipeline
    metadata_dict = step1_extract_metadata(law_structured)
    nim_text = step2_eurlex_nim(metadata_dict)
    queries = step3_generate_queries(metadata_dict)
    search_results = step4_web_search(queries)
    facts_text = step5_extract_facts(metadata_dict, search_results, nim_text)
    eurostat_dict = step5b_eurostat_for_countries(metadata_dict, facts_text)
    eurostat_text = eurostat_dict_to_text(eurostat_dict)
    field6_text = step6_synthesize_field6(metadata_dict, facts_text, eurostat_text)

    return Field6Response(
        law_name=law_name,
        metadata=LawMetadata(**metadata_dict),
        eurlex_nim=nim_text,
        queries_used=queries,
        sources=[
            WebSource(
                title=r["title"],
                url=r["url"],
                content=r["content"][:600],
            )
            for r in search_results
        ],
        extracted_facts=facts_text,
        field6_text=field6_text,
        word_count=len(field6_text.split()),
    )
