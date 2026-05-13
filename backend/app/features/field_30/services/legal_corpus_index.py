import re
import unicodedata
from dataclasses import asdict, dataclass, replace
from functools import cache
from pathlib import Path

from pypdf import PdfReader

from app.features.field_23.services.documents.split_text.splitter import (
    dedupe_by_longest,
    split_top_level_articles,
)
from app.features.field_30.services.corpus_service import clean_legal_text

LEGAL_CORPUS_ROOT = Path(__file__).resolve().parents[4] / "legal_corpus"
DEFAULT_CORPUS_DIRS = (
    LEGAL_CORPUS_ROOT / "field_30",
    LEGAL_CORPUS_ROOT / "field_29",
)

_LAW_HEADING_RE = re.compile(
    r"(?:ΝΟΜΟΣ|NOMOΣ)\s+ΥΠ[’'΄`]\s*ΑΡΙΘΜ?\.?\s*(\d+)",
    re.IGNORECASE,
)
_PD_HEADING_RE = re.compile(
    r"ΠΡΟΕΔΡΙΚΟ\s+ΔΙΑΤΑΓΜΑ\s+ΥΠ[’'΄`]\s*ΑΡΙΘΜ?\.?\s*(\d+)",
    re.IGNORECASE,
)
_DATE_YEAR_RE = re.compile(r"\b(19\d{2}|20\d{2})\b")
_FEK_SHEET_RE = re.compile(r"Αρ\.\s*Φύλλου\s+(\d+)", re.IGNORECASE)
_PARAGRAPH_MARKER_RE = re.compile(
    r"(?m)^\s*(\d+[Α-ΩA-Z]?)(?:\.\s+|\s+(?=[Α-ΩA-Z]\.))"
)
_CASE_MARKER_RE = re.compile(
    r"(?m)^\s*(?:\(([A-Za-zΑ-Ωα-ω])\)|([A-Za-zΑ-Ωα-ω])[\)\.])\s+"
)
_FILENAME_FEK_PATTERNS = (
    re.compile(r"^fek_a_(\d+)_(\d{4})", re.IGNORECASE),
    re.compile(r"^(\d+)a_(\d{2,4})", re.IGNORECASE),
    re.compile(r"^(\d+)a-(\d{2,4})", re.IGNORECASE),
    re.compile(r"^a(\d+)_(\d{2,4})", re.IGNORECASE),
)


@dataclass(frozen=True)
class CorpusMetadata:
    source_file: str
    law_type: str | None
    law_number: str | None
    law_year: str | None
    fek: str | None
    legal_code: str | None


@dataclass(frozen=True)
class CorpusChunk:
    source_file: str
    law_type: str | None
    law_number: str | None
    law_year: str | None
    fek: str | None
    legal_code: str | None
    article: str
    article_title: str | None
    paragraph: str | None
    case: str | None
    text: str


def normalize_for_matching(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.casefold())
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")


def normalize_reference(value: str | None) -> str | None:
    if value is None:
        return None

    compact = re.sub(r"\s+", "", value).strip()
    return compact.upper() or None


def normalize_law_number(value: str | None) -> str | None:
    if not value:
        return None

    match = re.search(r"(\d+[Α-ΩA-Z]?)\s*/\s*(\d{4})", value, re.IGNORECASE)
    if not match:
        return None

    return f"{match.group(1).upper()}/{match.group(2)}"


def normalize_case_label(value: str | None) -> str | None:
    if not value:
        return None

    normalized = normalize_for_matching(value).strip().strip(".)΄'’")
    if normalized == "a":
        return "α"

    return normalized[:1] or None


def paragraph_sort_key(value: str | None) -> tuple[int, str]:
    if value is None:
        return (0, "")

    match = re.match(r"(\d+)(.*)", value)
    if not match:
        return (10_000, value)

    return (int(match.group(1)), match.group(2))


def read_pdf_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def extract_metadata(pdf_path: Path, raw_text: str) -> CorpusMetadata:
    sample = raw_text[:12000]
    law_type = None
    law_number_prefix = None

    pd_match = _PD_HEADING_RE.search(sample)
    law_match = _LAW_HEADING_RE.search(sample)

    if pd_match:
        law_type = "π.δ."
        law_number_prefix = pd_match.group(1)
    elif law_match:
        law_type = "ν."
        law_number_prefix = law_match.group(1)

    law_year = extract_year(pdf_path, sample)
    law_number = f"{law_number_prefix}/{law_year}" if law_number_prefix and law_year else None

    return CorpusMetadata(
        source_file=pdf_path.name,
        law_type=law_type,
        law_number=law_number,
        law_year=law_year,
        fek=extract_fek(pdf_path, sample),
        legal_code=extract_legal_code(sample),
    )


def extract_year(pdf_path: Path, sample: str) -> str | None:
    filename_year = extract_year_from_filename(pdf_path.name)
    if filename_year:
        return filename_year

    years = _DATE_YEAR_RE.findall(sample)
    if years:
        return years[0]

    return None


def extract_year_from_filename(filename: str) -> str | None:
    for pattern in _FILENAME_FEK_PATTERNS:
        match = pattern.search(filename)
        if not match:
            continue

        year = match.group(2)
        if len(year) == 4:
            return year

        numeric_year = int(year)
        return f"20{year}" if numeric_year <= 30 else f"19{year}"

    return None


def extract_fek(pdf_path: Path, sample: str) -> str | None:
    filename_fek = extract_fek_from_filename(pdf_path.name)
    if filename_fek:
        return filename_fek

    sheet_match = _FEK_SHEET_RE.search(sample)
    if sheet_match:
        return f"Α΄ {sheet_match.group(1)}"

    return None


def extract_fek_from_filename(filename: str) -> str | None:
    for pattern in _FILENAME_FEK_PATTERNS:
        match = pattern.search(filename)
        if match:
            return f"Α΄ {match.group(1)}"

    return None


def extract_legal_code(sample: str) -> str | None:
    normalized = normalize_for_matching(sample)
    if "ατομικου εργατικου δικαιου" in normalized:
        return "Κώδικας Ατομικού Εργατικού Δικαίου"

    return None


def split_paragraphs(body: str) -> list[tuple[str | None, str]]:
    body = clean_legal_text(body)
    if not body:
        return []

    matches = list(_PARAGRAPH_MARKER_RE.finditer(body))
    if not matches:
        return [(None, body)]

    paragraphs: list[tuple[str | None, str]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
        text = clean_legal_text(body[match.start() : end])
        if text:
            paragraphs.append((match.group(1), text))

    return paragraphs


def title_is_paragraph_body(title: str | None) -> bool:
    return bool(title and _PARAGRAPH_MARKER_RE.match(title))


def build_chunks_from_pdf(pdf_path: Path) -> list[CorpusChunk]:
    raw_text = read_pdf_text(pdf_path)
    metadata = extract_metadata(pdf_path, raw_text)
    articles = dedupe_by_longest(split_top_level_articles(raw_text))
    chunks: list[CorpusChunk] = []

    for article in articles:
        article_number = str(article.get("article_number") or "").strip()
        if not article_number:
            continue

        article_title = clean_legal_text(str(article.get("title") or "")) or None
        body = str(article.get("body") or "")

        if title_is_paragraph_body(article_title):
            body = "\n".join(part for part in (article_title, body) if part)
            article_title = None

        for paragraph, text in split_paragraphs(body):
            chunks.append(
                CorpusChunk(
                    **asdict(metadata),
                    article=article_number,
                    article_title=article_title,
                    paragraph=paragraph,
                    case=None,
                    text=text,
                )
            )

    return chunks


@cache
def get_corpus_chunks() -> tuple[CorpusChunk, ...]:
    chunks: list[CorpusChunk] = []

    for corpus_dir in DEFAULT_CORPUS_DIRS:
        if not corpus_dir.exists():
            continue

        for pdf_path in sorted(corpus_dir.glob("*.pdf")):
            chunks.extend(build_chunks_from_pdf(pdf_path))

    return tuple(dedupe_chunks(chunks))


def dedupe_chunks(chunks: list[CorpusChunk]) -> list[CorpusChunk]:
    deduped: dict[tuple[str | None, str, str | None, str], CorpusChunk] = {}

    for chunk in chunks:
        key = (
            normalize_law_number(chunk.law_number),
            normalize_reference(chunk.article) or "",
            normalize_reference(chunk.paragraph),
            clean_legal_text(chunk.text),
        )
        deduped.setdefault(key, chunk)

    return list(deduped.values())


def find_corpus_chunks(
    *,
    law_number: str,
    article: str,
    paragraph: str | None = None,
) -> list[CorpusChunk]:
    normalized_law = normalize_law_number(law_number)
    normalized_article = normalize_reference(article)
    normalized_paragraph = normalize_reference(paragraph)
    chunks = []

    for chunk in get_corpus_chunks():
        if normalize_law_number(chunk.law_number) != normalized_law:
            continue
        if normalize_reference(chunk.article) != normalized_article:
            continue
        if normalized_paragraph and normalize_reference(chunk.paragraph) != normalized_paragraph:
            continue
        chunks.append(chunk)

    return sorted(chunks, key=lambda chunk: paragraph_sort_key(chunk.paragraph))


def extract_case_text(paragraph_text: str, case_label: str | None) -> str:
    normalized_label = normalize_case_label(case_label)
    if not normalized_label:
        return ""

    matches = list(_CASE_MARKER_RE.finditer(paragraph_text))
    for index, match in enumerate(matches):
        marker = match.group(1) or match.group(2)
        if normalize_case_label(marker) != normalized_label:
            continue

        end = matches[index + 1].start() if index + 1 < len(matches) else len(paragraph_text)
        return clean_legal_text(paragraph_text[match.start() : end])

    return ""


def with_case_text(chunk: CorpusChunk, case_label: str, case_text: str) -> CorpusChunk:
    return replace(chunk, case=normalize_case_label(case_label), text=case_text)


def chunk_to_dict(chunk: CorpusChunk) -> dict[str, str | None]:
    return {
        "source_file": chunk.source_file,
        "law_type": chunk.law_type,
        "law_number": chunk.law_number,
        "law_year": chunk.law_year,
        "fek": chunk.fek,
        "legal_code": chunk.legal_code,
        "article": chunk.article,
        "paragraph": chunk.paragraph,
        "case": chunk.case,
        "text": chunk.text,
    }
