"""Load LangChain Documents from uploaded PDF bytes (FastAPI helper)."""

from __future__ import annotations

import os
import tempfile

from langchain_community.document_loaders.pdf import PDFPlumberLoader
from langchain_core.documents import Document


def load_documents_from_pdf_bytes(file_bytes: bytes) -> list[Document]:
    """Write PDF bytes to a temp file and return `PDFPlumberLoader(...).load()`."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        tmp_file.write(file_bytes)
        tmp_path = tmp_file.name

    try:
        return PDFPlumberLoader(tmp_path).load()
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
