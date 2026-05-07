"""FastAPI router για το Πεδίο 7 — Αντιστοίχιση νόμου με SDGs."""

import os
import tempfile
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.features.field_6.services.pdf_reader import extract_text_from_pdf
from app.features.field_7.schemas import ClassifyRequest, ClassifyResponse
from app.features.field_7.services.llm_service import classify_law

router = APIRouter()


@router.post(
    "/classify",
    response_model=ClassifyResponse,
    summary="Αντιστοίχιση νόμου με τους 17 SDGs",
    description=(
        "Δέχεται PDF αρχείο νόμου ή plain text. Επιστρέφει λίστα από SDGs "
        "που ταιριάζουν με τα μέτρα του νόμου, με συγκεκριμένους υποστόχους "
        "και reasoning. Οι τίτλοι των υποστόχων είναι hardcoded — το LLM "
        "επιστρέφει μόνο IDs και reasoning."
    ),
)
async def classify(
    file: Annotated[UploadFile | None, File(description="PDF αρχείο του νόμου")] = None,
) -> ClassifyResponse:
    if file is None or not file.filename:
        raise HTTPException(status_code=400, detail="Απαιτείται PDF αρχείο νόμου.")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Το αρχείο πρέπει να είναι PDF.")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        law_text = extract_text_from_pdf(tmp_path)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        os.unlink(tmp_path)

    request = ClassifyRequest(law_text=law_text)
    return classify_law(request)
