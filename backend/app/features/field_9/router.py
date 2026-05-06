"""FastAPI router για το Πεδίο 9 — Ειδικότεροι στόχοι."""

import logging
import os
import tempfile
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile
from langchain_core.messages import HumanMessage, SystemMessage

from app.features.field_9.config import get_llm
from app.features.field_9.prompt import (
    EXTRACT_SECTOR_HUMAN_TEMPLATE,
    EXTRACT_SECTOR_SYSTEM,
)
from app.features.field_9.schemas import (
    ExtractSectorResponse,
    FetchDataRequest,
    FetchDataResponse,
    SuggestIndicatorsRequest,
    SuggestIndicatorsResponse,
)
from app.features.field_9.services.eurostat import (
    fetch_indicator_data,
    get_five_year_range,
    suggest_indicators,
)
from app.features.field_9.services.llm_service import extract_llm_content
from app.features.field_9.services.pdf_reader import extract_text_from_pdf

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/field9", tags=["field9"])


@router.post("/extract-sector", response_model=ExtractSectorResponse)
async def extract_sector(
    file: Annotated[UploadFile, File(description="PDF αρχείο του νόμου")],
) -> ExtractSectorResponse:
    """Διαβάζει PDF νόμου και εξάγει τομέα, έτος και τίτλο."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Το αρχείο πρέπει να είναι PDF.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        law_text = extract_text_from_pdf(tmp_path)
        law_structured = law_text[:3000]

        response = get_llm().invoke([
            SystemMessage(content=EXTRACT_SECTOR_SYSTEM),
            HumanMessage(content=EXTRACT_SECTOR_HUMAN_TEMPLATE.format(
                law_text=law_structured,
            )),
        ])

        raw = extract_llm_content(response).strip()
        logger.debug("LLM απάντηση extract-sector:\n%s", raw)

        sector = ""
        year = 0
        law_title = ""

        for line in raw.split("\n"):
            if line.startswith("ΤΟΜΕΑΣ:"):
                sector = line.replace("ΤΟΜΕΑΣ:", "").strip()
            elif line.startswith("ΕΤΟΣ:"):
                year_str = line.replace("ΕΤΟΣ:", "").strip()
                year = int(year_str) if year_str.isdigit() else 0
            elif line.startswith("ΤΙΤΛΟΣ:"):
                law_title = line.replace("ΤΙΤΛΟΣ:", "").strip()

        if not sector or not year:
            raise HTTPException(status_code=422, detail="Αδυναμία εξαγωγής τομέα ή έτους")

        return ExtractSectorResponse(
            sector=sector,
            year=year,
            law_title=law_title,
        )

    finally:
        os.unlink(tmp_path)


@router.post("/suggest-indicators", response_model=SuggestIndicatorsResponse)
async def suggest_indicators_endpoint(
    request: SuggestIndicatorsRequest,
) -> SuggestIndicatorsResponse:
    """Προτείνει κατάλληλους δείκτες βάσει τομέα νόμου."""
    logger.info("Πρόταση δεικτών — τομέας: %s, έτος: %d", request.sector, request.year)

    suggestions = suggest_indicators(
        sector=request.sector,
        law_title=request.law_title,
        year=request.year,
    )

    logger.info("Προτάθηκαν %d δείκτες", len(suggestions))
    return SuggestIndicatorsResponse(suggestions=suggestions)


@router.post("/fetch-data", response_model=FetchDataResponse)
async def fetch_data(request: FetchDataRequest) -> FetchDataResponse:
    """Φέρνει Eurostat δεδομένα για τους επιλεγμένους δείκτες."""
    logger.info(
        "Eurostat δεδομένα — δείκτες: %s, έτος αναφοράς: %d",
        request.selected_indicators,
        request.year,
    )

    indicators = []
    for dataset_id in request.selected_indicators:
        data = fetch_indicator_data(dataset_id, request.year)
        if data:
            indicators.append(data)
            logger.debug("%s: %d τιμές", dataset_id, len(data.values))
        else:
            logger.info("%s: δεν βρέθηκαν δεδομένα", dataset_id)

    five_year_range = get_five_year_range(request.year)

    return FetchDataResponse(
        indicators=indicators,
        reference_year=request.year,
        five_year_range=five_year_range,
    )