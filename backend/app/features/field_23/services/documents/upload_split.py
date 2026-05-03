"""Read an uploaded law PDF and split into article dicts."""

from __future__ import annotations

from fastapi import UploadFile

from app.features.field_23.services.documents.pdf import load_documents_from_pdf_bytes
from app.features.field_23.services.documents.split_text import extract_and_split_documents


async def split_uploaded_law(law_pdf: UploadFile) -> list[dict]:
    file_bytes = await law_pdf.read()
    documents = load_documents_from_pdf_bytes(file_bytes)
    return extract_and_split_documents(documents)
