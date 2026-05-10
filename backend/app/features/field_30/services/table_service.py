import re
import unicodedata
from typing import Any

EMPTY_FIELD_30_ANSWER = (
    "Δεν εντοπίστηκαν διατάξεις για το Πεδίο 30 με βάση τους τίτλους των άρθρων."
)


def normalize_for_matching(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.casefold())
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")


def is_field_30_title(title: str) -> bool:
    normalized = normalize_for_matching(title)
    return "καταργ" in normalized and "διαταξ" in normalized


def clean_display_text(value: str) -> str:
    lines = []

    for line in value.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if re.fullmatch(r"--- PAGE \d+ ---", stripped):
            continue
        lines.append(stripped)

    return "\n".join(lines).strip()


def select_field_30_articles(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    selected = []

    for article in articles:
        title = str(article.get("title") or "")
        if is_field_30_title(title):
            selected.append(article)

    return selected


def split_repealed_items(text: str) -> list[tuple[str, str]]:
    marker_re = re.compile(r"(?im)(^|\n)\s*([α-ω])\)\s*")
    matches = list(marker_re.finditer(text))

    if not matches:
        cleaned = clean_display_text(text)
        return [("", cleaned)] if cleaned else []

    items: list[tuple[str, str]] = []

    for index, match in enumerate(matches):
        letter = match.group(2)
        content_start = match.end()
        content_end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        content = clean_display_text(text[content_start:content_end])
        content = re.sub(r",?\s+και\s*$", "", content, flags=re.IGNORECASE)
        if content:
            items.append((letter, content))

    return items


def extract_repeals_intro(text: str) -> str:
    marker_re = re.compile(r"(?im)(^|\n)\s*[α-ω]\)\s*")
    match = marker_re.search(text)
    intro = text[: match.start()] if match else text
    return clean_display_text(intro)


def render_markdown_table_cell(value: str) -> str:
    return clean_display_text(value).replace("|", "\\|").replace("\n", "<br>")


def analyze_bill_field_30_rows(articles: list[dict[str, Any]]) -> list[dict[str, str]]:
    rows = []

    for article in select_field_30_articles(articles):
        article_number = str(article["article"])
        title = str(article.get("title") or "").strip()
        text = str(article.get("text") or "")
        intro = extract_repeals_intro(text)
        evaluated = clean_display_text(f"Άρθρο {article_number}\n{title}\n{intro}")

        for letter, content in split_repealed_items(text):
            rows.append(
                {
                    "article": article_number,
                    "item_label": letter,
                    "evaluated_provision": evaluated,
                    "repealed_provision": content,
                }
            )

    return rows


def render_field_30_markdown_table(rows: list[dict[str, str]]) -> str:
    if not rows:
        return EMPTY_FIELD_30_ANSWER

    lines = [
        "| Διατάξεις αξιολογούμενης ρύθμισης που προβλέπουν κατάργηση | Καταργούμενες διατάξεις |",
        "| --- | --- |",
    ]

    for row in rows:
        lines.append(
            "| "
            f"{render_markdown_table_cell(row['evaluated_provision'])}"
            " | "
            f"{render_markdown_table_cell(row['repealed_provision'])}"
            " |"
        )

    return "\n".join(lines)


def analyze_bill_field_30(articles: list[dict[str, Any]]) -> str:
    return render_field_30_markdown_table(analyze_bill_field_30_rows(articles))
