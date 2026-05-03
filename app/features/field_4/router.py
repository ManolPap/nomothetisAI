import tempfile
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.features.field_4.services.article_splitter import split_articles
from app.features.field_4.services.body_extractor import extract_main_bill_body
from app.features.field_4.services.llm_service import analyze_bill_field_4

router = APIRouter()


@router.post("/parse")
async def parse_bill(file: Annotated[UploadFile, File(...)]):
    try:
        filename = file.filename or "uploaded.pdf"
        suffix = Path(filename).suffix or ".pdf"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            pdf_path = tmp.name

        main_body = extract_main_bill_body(pdf_path)
        articles = split_articles(main_body)

        return {
            "filename": filename,
            "articles_count": len(articles),
            "main_body_preview": main_body[:1500],
            "main_body_end_preview": main_body[-1000:],
            "first_article": articles[0] if articles else None,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/analyze")
async def analyze_field_4(file: Annotated[UploadFile, File(...)]):
    try:
        filename = file.filename or "uploaded.pdf"
        suffix = Path(filename).suffix or ".pdf"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            pdf_path = tmp.name

        main_body = extract_main_bill_body(pdf_path)
        articles = split_articles(main_body)
        field_4_answer = analyze_bill_field_4(articles)

        return {
            "filename": filename,
            "articles_count": len(articles),
            "field_4_answer": field_4_answer,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
