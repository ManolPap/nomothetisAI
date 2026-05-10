import tempfile
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.features.field_4.services.article_splitter import split_articles
from app.features.field_4.services.body_extractor import extract_main_bill_body
from app.features.field_30.services.table_service import (
    analyze_bill_field_30_rows,
    render_field_30_markdown_table,
    select_field_30_articles,
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
        field_30_articles = select_field_30_articles(articles)

        return {
            "filename": filename,
            "articles_count": len(articles),
            "field_30_articles_count": len(field_30_articles),
            "field_30_articles": field_30_articles,
            
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        if pdf_path:
            Path(pdf_path).unlink(missing_ok=True)


@router.post("/analyze")
async def analyze_field_30(file: Annotated[UploadFile, File(...)]) -> dict[str, object]:
    pdf_path: str | None = None

    try:
        filename, pdf_path = await save_upload_to_temp(file)
        main_body = extract_main_bill_body(pdf_path)
        articles = split_articles(main_body)
        field_30_rows = analyze_bill_field_30_rows(articles)

        return {
            "filename": filename,
            "articles_count": len(articles),
            "field_30_articles_count": len(select_field_30_articles(articles)),
            "field_30_rows": field_30_rows,
            "field_30_answer": render_field_30_markdown_table(field_30_rows),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        if pdf_path:
            Path(pdf_path).unlink(missing_ok=True)
