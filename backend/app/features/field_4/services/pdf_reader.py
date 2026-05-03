from pypdf import PdfReader


def read_pdf_text(pdf_path: str) -> str:
    reader = PdfReader(pdf_path)
    pages = []

    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append(f"\n\n--- PAGE {i} ---\n\n{text}")

    return "\n".join(pages)