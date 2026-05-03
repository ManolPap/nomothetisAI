import re


ARTICLE_RE = re.compile(
    r"(?m)^\s*Άρθρο\s+(\d+[Α-ΩA-Z]?)\s*$",
    re.IGNORECASE,
)

PART_RE = re.compile(
    r"(?m)^\s*ΜΕΡΟΣ\s+([Α-ΩA-Z]+)[΄'’]?\s*$",
    re.IGNORECASE,
)

CHAPTER_RE = re.compile(
    r"(?m)^\s*ΚΕΦΑΛΑΙΟ\s+([Α-ΩA-Z]+)[΄'’]?\s*$",
    re.IGNORECASE,
)


def get_non_empty_lines(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


def get_title_and_body(article_block: str) -> tuple[str, str]:
    lines = get_non_empty_lines(article_block)

    if not lines:
        return "", ""

    title = lines[0]
    body = "\n".join(lines[1:]).strip()

    return title, body


def extract_heading_title_after(
    text: str,
    heading_end: int,
    next_stop_idx: int,
) -> str:
    segment = text[heading_end:next_stop_idx]
    lines = get_non_empty_lines(segment)

    title_lines = []

    for line in lines:
        if ARTICLE_RE.match(line) or PART_RE.match(line) or CHAPTER_RE.match(line):
            break
        title_lines.append(line)

    return " ".join(title_lines).strip()


def get_part_and_chapter_titles(
    text: str,
    article_start: int,
    next_article_start: int,
) -> tuple[dict | None, dict | None]:
    part_match = None
    chapter_match = None

    for m in PART_RE.finditer(text[:article_start]):
        part_match = m

    for m in CHAPTER_RE.finditer(text[:article_start]):
        chapter_match = m

    part = None
    chapter = None

    if part_match:
        stops = [article_start]

        next_chapter_after_part = CHAPTER_RE.search(
            text,
            pos=part_match.end(),
            endpos=article_start,
        )

        if next_chapter_after_part:
            stops.append(next_chapter_after_part.start())

        part = {
            "number": part_match.group(1),
            "label": f"ΜΕΡΟΣ {part_match.group(1)}",
            "title": extract_heading_title_after(
                text,
                part_match.end(),
                min(stops),
            ),
        }

    if chapter_match:
        chapter = {
            "number": chapter_match.group(1),
            "label": f"ΚΕΦΑΛΑΙΟ {chapter_match.group(1)}",
            "title": extract_heading_title_after(
                text,
                chapter_match.end(),
                article_start,
            ),
        }

    return part, chapter


def split_articles(main_body: str) -> list[dict]:
    article_matches = list(ARTICLE_RE.finditer(main_body))
    articles = []

    for i, match in enumerate(article_matches):
        article_number = match.group(1)

        article_start = match.start()
        article_content_start = match.end()
        article_end = (
            article_matches[i + 1].start()
            if i + 1 < len(article_matches)
            else len(main_body)
        )

        article_block = main_body[article_content_start:article_end].strip()
        title, body = get_title_and_body(article_block)

        part, chapter = get_part_and_chapter_titles(
            main_body,
            article_start,
            article_end,
        )

        articles.append(
            {
                "article": article_number,
                "title": title,
                "part": part,
                "chapter": chapter,
                "text": body,
            }
        )

    return articles