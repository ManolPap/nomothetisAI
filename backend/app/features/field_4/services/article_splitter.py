import re

ARTICLE_RE = re.compile(
    r"(?m)^\s*Άρθρο\s+(\d+[Α-ΩA-Z]?)\s*$",
    re.IGNORECASE,
)

# Μετά το γράμμα: τόνοι/απόστροφες και σημεία αρίθμησης τύπου Β΄ (συχνά U+0375 σε PDF/OCR).
_ORD_SUFFIX = "[΄'’\u0384\u0374\u0375]?"

PART_RE = re.compile(
    rf"(?m)^\s*ΜΕΡΟΣ\s+([Α-ΩA-Z]+){_ORD_SUFFIX}\s*$",
    re.IGNORECASE,
)

CHAPTER_RE = re.compile(
    rf"(?m)^\s*ΚΕΦΑΛΑΙΟ\s+([Α-ΩA-Z]+){_ORD_SUFFIX}\s*$",
    re.IGNORECASE,
)

_PARA_BOUNDARY = re.compile(r"\r?\n(?:\s*\r?\n)+")


def get_non_empty_lines(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


def get_title_and_body(article_block: str) -> tuple[str, str]:
    """Τίτλος = όλες οι μη κενές γραμμές πριν το πρώτο κενό παράγραφο, αλλιώς μόνο η 1η γραμμή."""
    m = _PARA_BOUNDARY.search(article_block)
    if m:
        head = article_block[: m.start()]
        tail = article_block[m.end() :].strip()
        head_lines = get_non_empty_lines(head)
        title = " ".join(head_lines) if head_lines else ""
        return title, tail

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


def _nth_nonempty_line_start(text: str, line_no: int) -> int | None:
    """Χαρακτήρας έναρξης της line_no-οστής μη κενής γραμμής (1-based)."""
    if line_no < 1:
        return 0

    count = 0
    offset = 0

    for line in text.splitlines(keepends=True):
        if line.strip():
            count += 1
            if count == line_no:
                return offset
        offset += len(line)

    return None


def truncate_before_structural_heading(block: str, *, scan_from: int = 0) -> str:
    """Κόβει πριν το πρώτο ΜΕΡΟΣ/ΚΕΦΑΛΑΙΟ από τη θέση scan_from και έπειτα."""
    first = len(block)

    for rx in (PART_RE, CHAPTER_RE):
        found = rx.search(block, pos=scan_from)
        if found and found.start() < first:
            first = found.start()

    return block[:first].strip() if first < len(block) else block.strip()


def strip_trailing_structural_overflow(block: str) -> str:
    """
    Αφαιρεί ΜΕΡΟΣ/ΚΕΦΑΛΑΙΟ που μπήκαν λάθος στο τέλος του άρθρου, χωρίς να ψάχνει
    μέσα στον τίτλο (1–2 γραμμές ή πριν πρώτο κενό παράγραφο).
    """
    m = _PARA_BOUNDARY.search(block)
    if m:
        head = block[: m.start()]
        gap = block[m.start() : m.end()]
        tail = block[m.end() :]
        tail_trimmed = truncate_before_structural_heading(tail, scan_from=0)
        return (head + gap + tail_trimmed).strip()

    third = _nth_nonempty_line_start(block, 3)
    scan_from = third if third is not None else 0
    return truncate_before_structural_heading(block, scan_from=scan_from)


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
        article_block = strip_trailing_structural_overflow(article_block)
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