import re
import unicodedata
from dataclasses import dataclass
from typing import Any, TypedDict

TITLE_CHANGE_KEYWORDS = (
    ("replacement", ("αντικαταστ", "αντικαθιστ")),
    ("modification", ("τροποποι",)),
    ("addition", ("προσθηκ", "προστιθε")),
    ("supplement", ("συμπληρ",)),
    ("repeal", ("καταργ",)),
    ("renumbering", ("αναριθμ",)),
)

REPEAL_TITLE_KEYWORDS: tuple[str, ...] = next(
    keywords for label, keywords in TITLE_CHANGE_KEYWORDS if label == "repeal"
)

ARTICLE_NUMBER_RE = r"\d+[Α-ΩA-Z]?"
PARAGRAPH_RE = rf"{ARTICLE_NUMBER_RE}(?:\s*(?:,|και)\s*{ARTICLE_NUMBER_RE})*"
CASE_RE = r"[α-ωάέήίόύώϊϋΐΰΑ-ΩΆΈΉΊΌΎΏA-Za-z0-9]+[΄'’]?"
LAW_TYPE_RE = r"(?:π\.\s*δ\.|ν\.)"
LAW_NUMBER_RE = rf"{ARTICLE_NUMBER_RE}/\d{{4}}"
FEK_RE = r"[Α-ΩA-Z]\s*[΄'’´`]\s*\d+"
LEGAL_CODE_BOUNDARY_RE = (
    r"(?=\s*\(|\s*,|\s+και\s+στ|\s+και\s+του|\s+επέρχονται|\s+προστίθεται|$)"
)
LEGAL_CODE_RE = (
    r"Κώδικ[αας]\s+[Α-ΩΆΈΉΊΌΎΏΪΫA-Za-zα-ωάέήίόύώϊϋΐΰ0-9\s\-]+?"
)
CHANGE_VERB_RE = r"(?:προστίθεται|προστιθεται|προσθήκη|προσθηκη)"

UNIT_PREFIX_RE = rf"""
    (?:
        (?:περ\.|περίπτωση)\s+(?P<case>{CASE_RE})
        (?:\s*,)?\s*(?:της\s+)?
    )?
    (?:
        (?:παρ\.|παράγραφο[ςυ]?)\s+(?P<paragraph>{PARAGRAPH_RE})
        (?:\s*,)?\s*(?:του\s+)?
    )?
"""

ARTICLE_WITH_CODE_RE = re.compile(
    rf"""
    {UNIT_PREFIX_RE}
    άρθρ(?:ο|ου)\s+(?P<article>{ARTICLE_NUMBER_RE})\s+
    (?:(?:του|στον|στο|στην)\s+)?
    (?P<legal_code>{LEGAL_CODE_RE}){LEGAL_CODE_BOUNDARY_RE}
    (?:
        \s*\(
        (?P<law_type>{LAW_TYPE_RE})\s*(?P<law_number>{LAW_NUMBER_RE})
        (?:\s*,\s*(?P<fek>{FEK_RE}))?
        \)
    )?
    """,
    re.IGNORECASE | re.VERBOSE,
)

ARTICLE_WITH_LAW_RE = re.compile(
    rf"""
    {UNIT_PREFIX_RE}
    άρθρ(?:ο|ου)\s+(?P<article>{ARTICLE_NUMBER_RE})\s+
    (?:(?:του|στον|στο|στην)\s+)?
    (?P<law_type>{LAW_TYPE_RE})\s*(?P<law_number>{LAW_NUMBER_RE})
    (?:\s*\((?P<fek>{FEK_RE})\))?
    """,
    re.IGNORECASE | re.VERBOSE,
)

CODE_FIRST_ADDED_ARTICLE_RE = re.compile(
    rf"""
    (?P<legal_code>{LEGAL_CODE_RE}){LEGAL_CODE_BOUNDARY_RE}
    (?:
        \s*\(
        (?P<law_type>{LAW_TYPE_RE})\s*(?P<law_number>{LAW_NUMBER_RE})
        (?:\s*,\s*(?P<fek>{FEK_RE}))?
        \)
    )?
    .{{0,300}}?
    {CHANGE_VERB_RE}\s+(?:νέο\s+)?άρθρο\s+(?P<article>{ARTICLE_NUMBER_RE})
    """,
    re.IGNORECASE | re.VERBOSE,
)


class AffectedProvision(TypedDict):
    affected_reference: str
    change_type: str
    law_type: str | None
    law_number: str | None
    fek: str | None
    article: str | None
    paragraph: str | None
    case: str | None
    legal_code: str | None


class Field29StageOneRow(TypedDict):
    source_article: str
    source_article_title: str
    evaluated_provision: str
    affected_provisions: list[AffectedProvision]


@dataclass(frozen=True)
class ProvisionParts:
    change_type: str
    article: str | None = None
    paragraph: str | None = None
    case: str | None = None
    law_type: str | None = None
    law_number: str | None = None
    fek: str | None = None
    legal_code: str | None = None


def normalize_for_matching(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.casefold())
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")


def collapse_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def clean_field_29_display_text(value: str) -> str:
    lines = []

    for line in value.splitlines():
        stripped = line.strip()

        if not stripped:
            continue

        if re.fullmatch(r"--- PAGE \d+ ---", stripped):
            continue

        lines.append(stripped)

    return "\n".join(lines).strip()


def classify_field_29_change_type(title: str) -> str | None:
    normalized_title = normalize_for_matching(title)
    matches = [
        label
        for label, keywords in TITLE_CHANGE_KEYWORDS
        if any(keyword in normalized_title for keyword in keywords)
    ]

    if not matches:
        return None

    return " / ".join(dict.fromkeys(matches))


def title_indicates_repeal(title: str) -> bool:
    normalized = normalize_for_matching(title)
    return any(keyword in normalized for keyword in REPEAL_TITLE_KEYWORDS)


def paragraph_marker_tokens(value: str | None) -> list[str]:
    if not value:
        return []

    return [match.group(0) for match in re.finditer(r"\d+[Α-ΩA-Z]?", value, re.IGNORECASE)]


def paragraph_token_sort_key(token: str) -> tuple[int, str]:
    match = re.match(r"(\d+)(.*)", token, re.IGNORECASE)
    if not match:
        return (10_000, token)

    return (int(match.group(1)), match.group(2).upper())


def consolidate_overlapping_provisions(
    provisions: list[ProvisionParts],
) -> list[ProvisionParts]:
    """Merge provisions that target the same law/article (and case) into one paragraph list."""
    if len(provisions) <= 1:
        return provisions

    buckets: dict[tuple[str, str, str, str, str], list[ProvisionParts]] = {}

    for provision in provisions:
        key = (
            provision.law_type or "",
            collapse_whitespace(provision.law_number or ""),
            collapse_whitespace(provision.article or ""),
            collapse_whitespace(provision.case or ""),
            normalize_legal_code(provision.legal_code) or "",
        )
        buckets.setdefault(key, []).append(provision)

    merged: list[ProvisionParts] = []

    for group in buckets.values():
        if len(group) == 1:
            merged.append(group[0])
            continue

        base = max(group, key=count_present_fields)
        if any(p.paragraph is None for p in group):
            merged_paragraph: str | None = None
        else:
            tokens: list[str] = []
            for p in group:
                tokens.extend(paragraph_marker_tokens(p.paragraph))
            merged_paragraph = (
                " και ".join(sorted(set(tokens), key=paragraph_token_sort_key))
                if tokens
                else None
            )

        fek = next((p.fek for p in group if p.fek), base.fek)

        merged.append(
            ProvisionParts(
                change_type=base.change_type,
                article=base.article,
                paragraph=merged_paragraph,
                case=base.case,
                law_type=base.law_type,
                law_number=base.law_number,
                fek=fek,
                legal_code=base.legal_code,
            )
        )

    return merged


def select_field_29_articles(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    selected = []

    for article in articles:
        title = str(article.get("title") or "")

        if title_indicates_repeal(title):
            continue

        change_type = classify_field_29_change_type(title)

        if change_type is None:
            continue

        selected.append({**article, "field_29_change_type": change_type})

    return selected


def build_evaluated_provision(article: dict[str, Any]) -> str:
    title = str(article.get("title") or "").strip()
    text = clean_field_29_display_text(str(article.get("text") or ""))
    header_parts = [f"Άρθρο {article['article']}"]

    if title:
        header_parts.append(title)

    header = "\n".join(header_parts)
    return f"{header}\n\n{text}" if text else header


def normalize_law_type(value: str | None) -> str | None:
    if not value:
        return None

    compact = re.sub(r"\s+", "", value.casefold())
    if compact == "π.δ.":
        return "π.δ."
    if compact == "ν.":
        return "ν."
    return collapse_whitespace(value)


def normalize_fek(value: str | None) -> str | None:
    if not value:
        return None

    match = re.search(r"([Α-ΩA-Z])\s*[΄'’´`]\s*(\d+)", value.strip(), re.IGNORECASE)
    if not match:
        return collapse_whitespace(value)

    return f"{match.group(1).upper()}΄ {match.group(2)}"


def normalize_legal_code(value: str | None) -> str | None:
    if not value:
        return None

    cleaned = collapse_whitespace(value).strip(" ,.;:")
    if cleaned.startswith("Κώδικα "):
        return "Κώδικας " + cleaned.removeprefix("Κώδικα ")

    return cleaned


def legal_code_reference(value: str | None) -> str | None:
    legal_code = normalize_legal_code(value)
    if not legal_code:
        return None

    if legal_code.startswith("Κώδικας "):
        return "Κώδικα " + legal_code.removeprefix("Κώδικας ")

    return legal_code


def get_reference_scope(article: dict[str, Any]) -> str:
    title = clean_field_29_display_text(str(article.get("title") or ""))
    text = clean_field_29_display_text(str(article.get("text") or ""))
    compact_text = collapse_whitespace(text)
    normalized = normalize_for_matching(compact_text)
    cut_points = [
        normalized.find(marker)
        for marker in (
            "ως εξης",
            "επερχονται οι ακολουθες τροποποιησεις",
            "αντικαθισταται απο",
        )
        if normalized.find(marker) > 0
    ]
    intro = compact_text[: min(cut_points)] if cut_points else compact_text[:2500]

    return "\n".join(part for part in (intro, title) if part).strip()


def provision_from_match(match: re.Match[str], change_type: str) -> ProvisionParts:
    groups = match.groupdict()
    return ProvisionParts(
        change_type=change_type,
        article=collapse_whitespace(groups.get("article") or "") or None,
        paragraph=collapse_whitespace(groups.get("paragraph") or "") or None,
        case=collapse_whitespace(groups.get("case") or "") or None,
        law_type=normalize_law_type(groups.get("law_type")),
        law_number=collapse_whitespace(groups.get("law_number") or "") or None,
        fek=normalize_fek(groups.get("fek")),
        legal_code=normalize_legal_code(groups.get("legal_code")),
    )


def count_present_fields(provision: ProvisionParts) -> int:
    return sum(
        bool(value)
        for value in (
            provision.article,
            provision.paragraph,
            provision.case,
            provision.law_type,
            provision.law_number,
            provision.fek,
            provision.legal_code,
        )
    )


def are_same_provision(left: ProvisionParts, right: ProvisionParts) -> bool:
    if (
        left.article != right.article
        or left.paragraph != right.paragraph
        or left.case != right.case
    ):
        return False

    if left.law_number and right.law_number:
        return left.law_number == right.law_number

    if left.legal_code and right.legal_code:
        return left.legal_code == right.legal_code

    return not left.law_number and not right.law_number


def merge_provisions(provisions: list[ProvisionParts]) -> list[ProvisionParts]:
    merged: list[ProvisionParts] = []

    for provision in provisions:
        for index, previous in enumerate(merged):
            if not are_same_provision(provision, previous):
                continue

            if count_present_fields(provision) > count_present_fields(previous):
                merged[index] = provision
            break
        else:
            merged.append(provision)

    return merged


def build_affected_reference(provision: ProvisionParts) -> str:
    parts = []

    if provision.case:
        parts.append(f"περ. {provision.case}")

    if provision.paragraph:
        parts.append(f"παρ. {provision.paragraph}")

    if provision.article:
        article_label = "άρθρου" if parts else "άρθρο"
        parts.append(f"{article_label} {provision.article}")

    code_reference = legal_code_reference(provision.legal_code)
    if code_reference:
        parts.append(code_reference)

    reference = " ".join(parts).strip()
    law_reference = ""

    if provision.law_type and provision.law_number:
        law_reference = f"{provision.law_type} {provision.law_number}"
        if provision.fek:
            law_reference = f"{law_reference}, {provision.fek}"

    if code_reference and law_reference:
        return f"{reference} ({law_reference})"

    if law_reference:
        if provision.fek and not code_reference:
            law_reference = f"{provision.law_type} {provision.law_number} ({provision.fek})"
        return f"{reference} {law_reference}".strip()

    return reference


def provision_to_dict(provision: ProvisionParts) -> AffectedProvision:
    return {
        "affected_reference": build_affected_reference(provision),
        "change_type": provision.change_type,
        "law_type": provision.law_type,
        "law_number": provision.law_number,
        "fek": provision.fek,
        "article": provision.article,
        "paragraph": provision.paragraph,
        "case": provision.case,
        "legal_code": provision.legal_code,
    }


def extract_affected_provisions(article: dict[str, Any]) -> list[AffectedProvision]:
    title = str(article.get("title") or "")
    change_type = str(
        article.get("field_29_change_type") or classify_field_29_change_type(title) or ""
    )
    if not change_type:
        return []

    reference_scope = get_reference_scope(article)
    provisions: list[ProvisionParts] = []

    for pattern in (
        ARTICLE_WITH_CODE_RE,
        ARTICLE_WITH_LAW_RE,
        CODE_FIRST_ADDED_ARTICLE_RE,
    ):
        provisions.extend(
            provision_from_match(match, change_type)
            for match in pattern.finditer(reference_scope)
        )

    unique_provisions = [
        provision
        for provision in merge_provisions(provisions)
        if provision.article or provision.law_number or provision.legal_code
    ]

    consolidated = consolidate_overlapping_provisions(unique_provisions)

    return [provision_to_dict(provision) for provision in consolidated]


def build_field_29_stage_1_rows(articles: list[dict[str, Any]]) -> list[Field29StageOneRow]:
    rows: list[Field29StageOneRow] = []

    for article in articles:
        rows.append(
            {
                "source_article": str(article["article"]),
                "source_article_title": str(article.get("title") or ""),
                "evaluated_provision": build_evaluated_provision(article),
                "affected_provisions": extract_affected_provisions(article),
            }
        )

    return rows
