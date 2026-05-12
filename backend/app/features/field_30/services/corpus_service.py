import re
import unicodedata
from dataclasses import dataclass
from functools import cache
from pathlib import Path

from pypdf import PdfReader

from app.features.field_23.services.documents.split_text.patterns import (
    ENTRY_INTO_FORCE_TITLE_RE,
)
from app.features.field_23.services.documents.split_text.preprocess import (
    clean_noise_lines,
    normalize_text,
)
from app.features.field_23.services.documents.split_text.splitter import (
    split_top_level_articles,
)

CORPUS_DIR = Path(__file__).resolve().parents[4] / "legal_corpus" / "field_30"
CORPUS_PDF_BY_LAW_ID = {
    "156/1994": "102A-94.pdf",
    "3863/2010": "115a_10.1284720457937.pdf",
}

_PD_156_RE = re.compile(r"\bπ\.?\s*δ\.?(?:/τος)?\s*156\s*/\s*1994")
_LAW_3863_RE = re.compile(r"\b(?:ν\.?|νομου|νομος)\s*3863\s*/\s*2010")
_ARTICLE_REF_RE = re.compile(r"αρθρ(?:ο|ου)\s+(\d+)")
_PARAGRAPH_REF_RE = re.compile(r"(?:παρ\.?\s*|παραγραφ(?:ος|ου)\s+)(\d+)")
_CASE_REF_RE = re.compile(r"(?:περ\.?\s*|περιπτωσ(?:η|ης)\s+)([a-zα-ω])")
_PARAGRAPH_MARKER_RE = re.compile(r"(?m)^\s*(\d+)\.\s+")
_CASE_MARKER_RE = re.compile(r"(?m)^\s*([A-Za-zΑ-Ωα-ω])[\)\.]\s+")
_FEK_HEADER_RE = re.compile(
    r"^\s*(?:\d+\s+)?ΕΦΗΜΕΡΙΣ\s+ΤΗΣ\s+ΚΥΒΕΡΝΗΣΕΩΣ\b.*$",
    re.IGNORECASE,
)
_PAGE_MARKER_RE = re.compile(r"^\s*---\s*PAGE\s+\d+\s*---\s*$", re.IGNORECASE)
_PAGE_NUMBER_RE = re.compile(r"^\s*\d{1,5}\s*$")
# Same article-line detection as field_23 cut_before_first_article (local copy for preamble only).
_CORPUS_ARTICLE_1_LINE_RE = re.compile(
    r"^(Άρθρο|ΑΡΘΡΟ)\s+1[Α-ΩA-Z]?\s*$",
    re.IGNORECASE | re.MULTILINE,
)
_CORPUS_FIRST_ARTICLE_LINE_RE = re.compile(
    r"^(Άρθρο|ΑΡΘΡΟ)\s+\d+[Α-ΩA-Z]?\s*$",
    re.IGNORECASE | re.MULTILINE,
)


@dataclass(frozen=True)
class RepealReference:
    law_id: str
    label: str
    whole_law: bool
    source_text: str
    article_number: str | None = None
    paragraph_number: str | None = None
    case_label: str | None = None


@dataclass(frozen=True)
class ResolvedProvision:
    text: str
    warning: str = ""


def normalize_for_matching(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.casefold())
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")


def normalize_case_label(value: str | None) -> str | None:
    if not value:
        return None

    normalized = normalize_for_matching(value).strip().strip(".)")
    if normalized == "a":
        return "α"

    return normalized[:1] or None


def extract_repeal_references(text: str) -> list[RepealReference]:
    normalized = normalize_for_matching(text)
    references: list[RepealReference] = []

    if _PD_156_RE.search(normalized):
        references.append(
            RepealReference(
                law_id="156/1994",
                label="π.δ. 156/1994",
                whole_law=True,
                source_text=text,
            )
        )

    if _LAW_3863_RE.search(normalized):
        article_match = _ARTICLE_REF_RE.search(normalized)
        paragraph_match = _PARAGRAPH_REF_RE.search(normalized)
        case_match = _CASE_REF_RE.search(normalized)
        case_label = normalize_case_label(case_match.group(1) if case_match else None)

        references.append(
            RepealReference(
                law_id="3863/2010",
                label="ν. 3863/2010",
                whole_law=False,
                source_text=text,
                article_number=article_match.group(1) if article_match else None,
                paragraph_number=paragraph_match.group(1) if paragraph_match else None,
                case_label=case_label,
            )
        )

    return references


def resolve_repeal_reference(reference: RepealReference) -> ResolvedProvision:
    if reference.whole_law:
        return resolve_whole_law(reference)

    if not reference.article_number or not reference.paragraph_number:
        return ResolvedProvision(
            text=f"Δεν εντοπίστηκε πλήρης παραπομπή για {reference.label}.",
            warning="Η παραπομπή δεν περιείχε άρθρο και παράγραφο για deterministic extraction.",
        )

    return resolve_specific_provision(reference)


def _preamble_before_first_article(raw: str) -> str:
    text = normalize_text(raw)
    text = clean_noise_lines(text)
    match = _CORPUS_ARTICLE_1_LINE_RE.search(text) or _CORPUS_FIRST_ARTICLE_LINE_RE.search(
        text
    )
    if match:
        return text[: match.start()].strip()
    return ""


def resolve_whole_law(reference: RepealReference) -> ResolvedProvision:
    raw_text = get_corpus_raw_text(reference.law_id)
    preamble = clean_legal_text(_preamble_before_first_article(raw_text))
    articles = get_corpus_articles(reference.law_id)
    substantive_articles = []

    for article in articles:
        if ENTRY_INTO_FORCE_TITLE_RE.match(article["title"]):
            break
        substantive_articles.append(format_article(article))

    if not substantive_articles:
        return ResolvedProvision(
            text=f"Δεν βρέθηκαν άρθρα ουσιαστικού σώματος για {reference.label}.",
            warning=f"Το PDF για {reference.law_id} δεν απέδωσε άρθρα.",
        )

    body = "\n\n".join(substantive_articles)
    if preamble:
        text = f"{preamble}\n\n{body}"
    else:
        text = body

    return ResolvedProvision(text=text)


def resolve_specific_provision(reference: RepealReference) -> ResolvedProvision:
    article = find_corpus_article(reference.law_id, reference.article_number or "")
    if article is None:
        return ResolvedProvision(
            text=f"Δεν βρέθηκε το άρθρο {reference.article_number} στο {reference.label}.",
            warning=f"Αποτυχία ακριβούς εντοπισμού άρθρου {reference.article_number}.",
        )

    paragraph = extract_paragraph(article["body"], reference.paragraph_number or "")
    if not paragraph:
        return ResolvedProvision(
            text=format_article(article),
            warning=(
                f"Δεν βρέθηκε η παρ. {reference.paragraph_number} στο άρθρο "
                f"{reference.article_number} του {reference.label}· επιστράφηκε όλο το άρθρο."
            ),
        )

    case_text = extract_case(paragraph, reference.case_label)
    article_heading = "\n".join(
        part
        for part in (
            f"Άρθρο {article['article_number']}",
            article["title"],
        )
        if part
    )

    if not case_text:
        return ResolvedProvision(
            text=clean_legal_text(
                f"{article_heading}\nπαρ. {reference.paragraph_number}\n{paragraph}"
            ),
            warning=(
                f"Δεν βρέθηκε ακριβής περ. {reference.case_label} στην παρ. "
                f"{reference.paragraph_number} του άρθρου {reference.article_number} "
                f"του {reference.label}· επιστράφηκε ολόκληρη η παρ. {reference.paragraph_number}."
            ),
        )

    return ResolvedProvision(
        text=clean_legal_text(
            f"{article_heading}\nπαρ. {reference.paragraph_number}, περ. {reference.case_label}\n"
            f"{case_text}"
        )
    )


@cache
def get_corpus_raw_text(law_id: str) -> str:
    pdf_name = CORPUS_PDF_BY_LAW_ID.get(law_id)
    if not pdf_name:
        raise ValueError(f"Δεν υπάρχει mapping για το νομοθέτημα {law_id}.")

    pdf_path = CORPUS_DIR / pdf_name
    if not pdf_path.exists():
        raise FileNotFoundError(f"Δεν βρέθηκε corpus PDF: {pdf_path}")

    return read_pdf_text(pdf_path)


@cache
def get_corpus_articles(law_id: str) -> tuple[dict[str, str], ...]:
    raw_text = get_corpus_raw_text(law_id)
    articles = split_top_level_articles(raw_text)

    return tuple(
        {
            "article_number": str(article.get("article_number") or "").strip(),
            "title": clean_legal_text(str(article.get("title") or "")),
            "body": clean_legal_text(str(article.get("body") or "")),
        }
        for article in articles
        if str(article.get("article_number") or "").strip()
    )


def read_pdf_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def find_corpus_article(law_id: str, article_number: str) -> dict[str, str] | None:
    for article in get_corpus_articles(law_id):
        if article["article_number"] == article_number:
            return article

    return None


def format_article(article: dict[str, str]) -> str:
    parts = [
        f"Άρθρο {article['article_number']}",
        article.get("title", ""),
        article.get("body", ""),
    ]
    return clean_legal_text("\n".join(part for part in parts if part))


def extract_paragraph(text: str, paragraph_number: str) -> str:
    matches = list(_PARAGRAPH_MARKER_RE.finditer(text))

    for index, match in enumerate(matches):
        if match.group(1) != paragraph_number:
            continue

        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        return clean_legal_text(text[match.start() : end])

    return ""


def extract_case(paragraph: str, case_label: str | None) -> str:
    normalized_label = normalize_case_label(case_label)
    if not normalized_label:
        return ""

    matches = list(_CASE_MARKER_RE.finditer(paragraph))

    for index, match in enumerate(matches):
        if normalize_case_label(match.group(1)) != normalized_label:
            continue

        end = matches[index + 1].start() if index + 1 < len(matches) else len(paragraph)
        return clean_legal_text(paragraph[match.start() : end])

    return ""


def clean_legal_text(value: str) -> str:
    lines = []

    for raw_line in value.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()

        if not line:
            continue
        if _PAGE_MARKER_RE.fullmatch(line):
            continue
        if _PAGE_NUMBER_RE.fullmatch(line):
            continue
        if _FEK_HEADER_RE.fullmatch(line):
            continue

        lines.append(line)

    return "\n".join(lines).strip()
