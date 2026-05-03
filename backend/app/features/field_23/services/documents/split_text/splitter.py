"""Detect article boundaries and build structured `{article_number, title, body}` dicts."""

from __future__ import annotations

from app.features.field_23.services.documents.article_number import article_sort_tuple
from app.features.field_23.services.documents.split_text.patterns import (
    ARTICLE_RE,
    CHAPTER_RE,
    ENTRY_INTO_FORCE_TITLE_RE,
    PARAGRAPH_START_RE,
)
from app.features.field_23.services.documents.split_text.preprocess import (
    clean_noise_lines,
    cut_before_first_article,
    remove_trailing_chapters,
    remove_trailing_signature_block,
)


def extract_title_and_body(lines: list[str]) -> tuple[str, str]:
    if len(lines) < 2:
        return "", ""

    title_lines: list[str] = []
    body_lines: list[str] = []
    found_boundary = False

    for i in range(1, len(lines)):
        line = lines[i].strip()

        if line == "":
            found_boundary = True
            body_lines = lines[i + 1 :]
            break

        if PARAGRAPH_START_RE.match(line) or CHAPTER_RE.match(line):
            found_boundary = True
            body_lines = lines[i:]
            break

        title_lines.append(line)

    if not found_boundary:
        continuation_words = {
            "και",
            "ή",
            "ο",
            "η",
            "το",
            "του",
            "της",
            "των",
            "τον",
            "την",
            "τους",
            "τις",
            "τα",
            "σε",
            "με",
            "για",
            "από",
            "προς",
        }

        title_end_idx = 0
        for i in range(1, len(title_lines)):
            prev_line = title_lines[i - 1].strip()
            curr_line = title_lines[i].strip()

            if not prev_line or not curr_line:
                continue

            if curr_line[0].islower():
                title_end_idx = i
                continue

            last_word = prev_line.split()[-1].lower() if prev_line.split() else ""
            if prev_line.endswith(("-", ",", "—", "–")) or last_word in continuation_words:
                title_end_idx = i
                continue

            if curr_line[0].isupper() or curr_line[0].isdigit():
                break

            title_end_idx = i

        title = " ".join(title_lines[: title_end_idx + 1]).strip()
        body = "\n".join([b.strip() for b in title_lines[title_end_idx + 1 :] if b.strip()]).strip()
        return title, body

    title = " ".join(title_lines).strip()
    body = "\n".join([b.strip() for b in body_lines if b.strip()]).strip()
    return title, body


def is_entry_into_force_title(title: str) -> bool:
    return bool(ENTRY_INTO_FORCE_TITLE_RE.match((title or "").strip()))


def get_article_matches(text: str) -> list[dict]:
    matches = []
    for match in ARTICLE_RE.finditer(text):
        matches.append(
            {
                "index": match.start(),
                "number": match.group(2),
                "suffix": match.group(3) or "",
            }
        )
    return matches


def split_top_level_articles(text: str) -> list[dict]:
    text = cut_before_first_article(text)
    matches = get_article_matches(text)
    articles: list[dict] = []

    if not matches:
        return []

    for i in range(len(matches)):
        match = matches[i]
        start = match["index"]
        end = matches[i + 1]["index"] if i + 1 < len(matches) else len(text)

        block = text[start:end].strip()
        block = clean_noise_lines(block)
        block = remove_trailing_signature_block(block)
        block = remove_trailing_chapters(block)

        if not block:
            continue

        raw_lines = [line.strip() for line in block.split("\n")]
        while raw_lines and not raw_lines[0]:
            raw_lines.pop(0)
        while raw_lines and not raw_lines[-1]:
            raw_lines.pop()

        if not raw_lines:
            continue

        header = raw_lines[0]
        number = f"{match['number']}{match['suffix']}"

        title, body = extract_title_and_body(raw_lines)

        articles.append(
            {
                "article_number": number,
                "header": header,
                "title": title,
                "body": body,
            }
        )

        if is_entry_into_force_title(title):
            break

    return articles


def dedupe_by_longest(articles: list[dict]) -> list[dict]:
    best: dict[str, dict] = {}
    for article in articles:
        key = article["article_number"]
        new_len = len(article.get("body", ""))
        old_len = len(best.get(key, {}).get("body", ""))

        if key not in best or new_len > old_len:
            best[key] = article

    return sorted(best.values(), key=lambda a: article_sort_tuple(a.get("article_number", "")))


def extract_and_split_documents(documents: list) -> list[dict]:
    """Join LangChain `Document` page text, then split into top-level articles."""
    text = "\n".join(doc.page_content for doc in documents)
    articles = split_top_level_articles(text)
    return dedupe_by_longest(articles)
