"""FastAPI router για το Πεδίο 9 — Ειδικότεροι στόχοι."""

import os
import tempfile

from fastapi import APIRouter, HTTPException, UploadFile, File
from langchain_core.messages import HumanMessage, SystemMessage

from app.features.field_9.config import get_llm
from app.features.field_9.prompt import (
    EXTRACT_SECTOR_SYSTEM,
    EXTRACT_SECTOR_HUMAN_TEMPLATE,
)
from app.features.field_9.schemas import (
    ExtractSectorResponse,
    SuggestIndicatorsRequest,
    SuggestIndicatorsResponse,
    FetchDataRequest,
    FetchDataResponse,
)
from app.features.field_9.services.eurostat import (
    suggest_indicators,
    fetch_indicator_data,
    get_five_year_range,
)
from app.features.field_9.services.pdf_reader import extract_text_from_pdf

router = APIRouter(prefix="/field9", tags=["field9"])


@router.post("/extract-sector", response_model=ExtractSectorResponse)
async def extract_sector(file: UploadFile = File(...)):
    """Διαβάζει PDF νόμου και εξάγει τομέα, έτος και τίτλο."""
    print("\n" + "=" * 60)
    print("ΠΕΔΙΟ 9 — Βήμα 1: Εξαγωγή τομέα και έτους")
    print("=" * 60)

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

        raw = (response.content[0]["text"] if isinstance(response.content[0], dict) else response.content[0].text).strip() if isinstance(response.content, list) else response.content.strip()
        print(f"  LLM απάντηση:\n{raw}")

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
async def suggest_indicators_endpoint(request: SuggestIndicatorsRequest):
    """Προτείνει κατάλληλους δείκτες βάσει τομέα νόμου."""
    print("\n" + "=" * 60)
    print("ΠΕΔΙΟ 9 — Βήμα 2: Πρόταση δεικτών")
    print("=" * 60)
    print(f"  Τομέας: {request.sector}")

    suggestions = suggest_indicators(
        sector=request.sector,
        law_title=request.law_title,
    )

    print(f"  Προτάθηκαν {len(suggestions)} δείκτες")
    return SuggestIndicatorsResponse(suggestions=suggestions)


@router.post("/fetch-data", response_model=FetchDataResponse)
async def fetch_data(request: FetchDataRequest):
    """Φέρνει Eurostat δεδομένα για τους επιλεγμένους δείκτες."""
    print("\n" + "=" * 60)
    print("ΠΕΔΙΟ 9 — Βήμα 3: Eurostat δεδομένα")
    print("=" * 60)
    print(f"  Δείκτες: {request.selected_indicators}")
    print(f"  Έτος αναφοράς: {request.year}")

    indicators = []
    for dataset_id in request.selected_indicators:
        data = fetch_indicator_data(dataset_id, request.year)
        if data:
            indicators.append(data)
            print(f"  ✓ {dataset_id}: {len(data.values)} τιμές")
        else:
            print(f"  ✗ {dataset_id}: δεν βρέθηκαν δεδομένα")

    five_year_range = get_five_year_range(request.year)

    return FetchDataResponse(
        indicators=indicators,
        reference_year=request.year,
        five_year_range=five_year_range,
    )