import json
import re
import unicodedata
from typing import Any

from openai import OpenAI

from app.core.config import settings
from app.features.field_29.prompt import FIELD_29_EXISTING_PROVISIONS_PROMPT

TITLE_CHANGE_KEYWORDS = (
    ("αντικατάσταση", ("αντικαταστ", "αντικαθιστ")),
    ("τροποποίηση", ("τροποποι",)),
    ("συμπλήρωση", ("συμπληρ", "προσθηκ", "προστιθε")),
)

EMPTY_FIELD_29_ANSWER = (
    "Δεν εντοπίστηκαν διατάξεις για το Πεδίο 29 με βάση τους τίτλους των άρθρων."
)
MISSING_FULL_TEXT_MESSAGE = (
    "Δεν παρατίθεται στο υποβληθέν κείμενο η πλήρης υφιστάμενη διατύπωση."
)


def normalize_for_matching(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.casefold())
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")


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


def select_field_29_articles(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    selected = []

    for article in articles:
        title = str(article.get("title") or "")
        change_type = classify_field_29_change_type(title)

        if change_type is None:
            continue

        selected.append({**article, "field_29_change_type": change_type})

    return selected


def build_field_29_bill_input(articles: list[dict[str, Any]]) -> str:
    chunks = []

    for article in articles:
        part = article.get("part") or {}
        chapter = article.get("chapter") or {}

        chunk = f"""
ΜΕΡΟΣ: {part.get("label")} - {part.get("title")}
ΚΕΦΑΛΑΙΟ: {chapter.get("label")} - {chapter.get("title")}
ΑΡΘΡΟ {article["article"]}: {article["title"]}
field_29_change_type: {article["field_29_change_type"]}
ΚΕΙΜΕΝΟ:
{article["text"]}
""".strip()

        chunks.append(chunk)

    return "\n\n" + ("=" * 80 + "\n\n").join(chunks)


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


def build_evaluated_provision(article: dict[str, Any]) -> str:
    title = str(article.get("title") or "").strip()
    text = clean_field_29_display_text(str(article.get("text") or ""))
    parts = [f"Άρθρο {article['article']}"]

    if title:
        parts.append(title)

    if text:
        parts.append(text)

    return "\n".join(parts)


def build_existing_provision_fallback(article: dict[str, Any]) -> str:
    text = clean_field_29_display_text(str(article.get("text") or ""))
    title = str(article.get("title") or "").strip()
    reference = ""
    description = ""

    reference_match = re.search(
        r"(?i)(?:Το|Στο|Στην|Στον)\s+"
        r"((?:άρθρο|παρ\.)\s+[^,.:]+(?:\s+του\s+[^,.:]+)?)",
        text,
    )
    if reference_match:
        reference = reference_match.group(1).strip()

    description_match = re.search(r"(?i),\s*περί\s+([^,.:\n]+)", text)
    if description_match:
        description = description_match.group(1).strip()

    if not reference:
        reference = title

    if description:
        return f"{reference}\n{description}."

    return reference or "Δεν εντοπίστηκε ασφαλής παραπομπή στην υφιστάμενη διάταξη."


def strip_code_fence(value: str) -> str:
    stripped = value.strip()

    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped, flags=re.IGNORECASE)
        stripped = re.sub(r"\s*```$", "", stripped)

    return stripped.strip()


def parse_existing_provisions_response(value: str) -> dict[str, str]:
    try:
        parsed = json.loads(strip_code_fence(value))
    except json.JSONDecodeError:
        return {}

    if not isinstance(parsed, list):
        return {}

    provisions = {}

    for item in parsed:
        if not isinstance(item, dict):
            continue

        article = str(item.get("article") or "").strip()
        existing_provision = str(item.get("existing_provision") or "").strip()

        if article and existing_provision:
            provisions[article] = existing_provision.replace(MISSING_FULL_TEXT_MESSAGE, "").strip()

    return provisions


def render_markdown_table_cell(value: str) -> str:
    return clean_field_29_display_text(value).replace("|", "\\|").replace("\n", "<br>")


def render_field_29_markdown_table(rows: list[dict[str, str]]) -> str:
    if not rows:
        return EMPTY_FIELD_29_ANSWER

    lines = [
        "| Διατάξεις αξιολογούμενης ρύθμισης | Υφιστάμενες διατάξεις |",
        "| --- | --- |",
    ]

    for row in rows:
        lines.append(
            "| "
            f"{render_markdown_table_cell(row['evaluated_provision'])}"
            " | "
            f"{render_markdown_table_cell(row['existing_provision'])}"
            " |"
        )

    return "\n".join(lines)


def get_openai_credentials() -> tuple[str, str]:
    api_key = settings.feature.field_29_openai_api_key or settings.feature.field_4_openai_api_key
    model = settings.feature.field_29_openai_model or settings.feature.field_4_openai_model

    if api_key is None:
        raise RuntimeError("Missing FEATURE_FIELD_29_OPENAI_API_KEY")

    return api_key.get_secret_value(), model


def analyze_bill_field_29(articles: list[dict[str, Any]]) -> str:
    return render_field_29_markdown_table(analyze_bill_field_29_rows(articles))


def analyze_bill_field_29_rows(articles: list[dict[str, Any]]) -> list[dict[str, str]]:
    if not articles:
        return []

    api_key, model = get_openai_credentials()
    client = OpenAI(api_key=api_key)
    bill_input = build_field_29_bill_input(articles)

    response = client.responses.create(
        model=model,
        input=[
            {"role": "system", "content": FIELD_29_EXISTING_PROVISIONS_PROMPT},
            {"role": "user", "content": bill_input},
        ],
        temperature=0,
    )

    existing_by_article = parse_existing_provisions_response(response.output_text)
    rows = []

    for article in articles:
        article_number = str(article["article"])
        existing_provision = existing_by_article.get(article_number)

        if not existing_provision:
            existing_provision = build_existing_provision_fallback(article)

        rows.append(
            {
                "article": article_number,
                "change_type": str(article["field_29_change_type"]),
                "evaluated_provision": build_evaluated_provision(article),
                "existing_provision": existing_provision,
            }
        )

    return rows
