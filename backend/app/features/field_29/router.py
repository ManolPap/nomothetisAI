import tempfile
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.features.field_4.services.article_splitter import split_articles
from app.features.field_4.services.body_extractor import extract_main_bill_body
from app.features.field_29.services.llm_service import (
    analyze_bill_field_29_rows,
    render_field_29_markdown_table,
    select_field_29_articles,
)

router = APIRouter()


async def save_upload_to_temp(file: UploadFile) -> tuple[str, str]:
    filename = file.filename or "uploaded.pdf"
    suffix = Path(filename).suffix or ".pdf"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        return filename, tmp.name


@router.post("/parse")
async def parse_bill(file: Annotated[UploadFile, File(...)]) -> dict[str, object]:
    pdf_path: str | None = None

    try:
        filename, pdf_path = await save_upload_to_temp(file)
        main_body = extract_main_bill_body(pdf_path)
        articles = split_articles(main_body)
        field_29_articles = select_field_29_articles(articles)

        return {
            "filename": filename,
            "articles_count": len(articles),
            "field_29_articles_count": len(field_29_articles),
            "field_29_articles": field_29_articles,
            "main_body_preview": main_body[:1500],
            "main_body_end_preview": main_body[-1000:],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    finally:
        if pdf_path:
            Path(pdf_path).unlink(missing_ok=True)


@router.post("/analyze")
async def analyze_field_29(file: Annotated[UploadFile, File(...)]) -> dict[str, object]:
    pdf_path: str | None = None

    try:
        filename, pdf_path = await save_upload_to_temp(file)
        main_body = extract_main_bill_body(pdf_path)
        articles = split_articles(main_body)
        field_29_articles = select_field_29_articles(articles)
        field_29_rows = analyze_bill_field_29_rows(field_29_articles)

        return {
            "filename": filename,
            "articles_count": len(articles),
            "field_29_articles_count": len(field_29_articles),
            "field_29_rows": field_29_rows,
            "field_29_answer": render_field_29_markdown_table(field_29_rows),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    finally:
        if pdf_path:
            Path(pdf_path).unlink(missing_ok=True)
