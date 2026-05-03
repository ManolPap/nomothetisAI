import re

from app.features.field_4.services.pdf_reader import read_pdf_text


START_SECTION_RE = re.compile(
    r"(?m)^\s*(ΜΕΡΟΣ\s+Α[΄'’]?|ΚΕΦΑΛΑΙΟ\s+Α[΄'’]?)\s*$",
    re.IGNORECASE,
)

ARTICLE_1_RE = re.compile(r"(?m)^\s*Άρθρο\s+1\s*$", re.IGNORECASE)
ARTICLE_2_RE = re.compile(r"(?m)^\s*Άρθρο\s+2\s*$", re.IGNORECASE)
TOC_RE = re.compile(r"ΠΙΝΑΚΑΣ\s+ΠΕΡΙΕΧΟΜΕΝΩΝ", re.IGNORECASE)

END_SECTION_RE = re.compile(
    r"""(?imx)
    ^\s*
    (?:
        ΜΕΡΟΣ\s+[Α-ΩA-Z]+[΄'’]?
        |
        ΚΕΦΑΛΑΙΟ\s+[Α-ΩA-Z]+[΄'’]?
    )
    \s*$
    .{0,800}?
    ^\s*ΕΝΑΡΞΗ\s+ΙΣΧΥΟΣ\s*$
    """
)

END_STOP_RE = re.compile(
    r"""(?imx)
    ^\s*Αθήνα,\s+.*\d{4}\s*$
    |
    ^\s*ΟΙ\s+ΥΠΟΥΡΓΟΙ\s*$
    |
    ^\s*ΣΥΝΟΠΤΙΚΗ\s+ΑΝΑΛΥΣΗ\s+ΣΥΝΕΠΕΙΩΝ\s+ΡΥΘΜΙΣΗΣ\s*$
    |
    ^\s*ΑΝΑΛΥΣΗ\s+ΣΥΝΕΠΕΙΩΝ\s+ΡΥΘΜΙΣΗΣ\s*$
    """
)


def clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def score_start_candidate(text: str, section_start: int) -> int:
    window = text[section_start: section_start + 12000]
    before = text[max(0, section_start - 2000): section_start]

    article_1 = ARTICLE_1_RE.search(window)
    article_2 = ARTICLE_2_RE.search(window)

    if not article_1 or not article_2:
        return -100

    score = 0
    article_1_text = clean_text(window[article_1.end(): article_2.start()])

    score += 10 if len(article_1_text) >= 120 else -10

    if TOC_RE.search(before):
        score -= 8

    if re.search(
        r"Σκοπός\s+του\s+παρόντος|Σκοπός\s+του\s+Μέρους|Ο\s+παρών\s+νόμος",
        article_1_text,
        re.IGNORECASE,
    ):
        score += 5

    return score


def find_main_body_start(text: str) -> int:
    candidates = []

    for match in START_SECTION_RE.finditer(text):
        section_start = match.start()
        score = score_start_candidate(text, section_start)

        if score > 0:
            section_text = match.group(1)

            if re.search(r"ΚΕΦΑΛΑΙΟ\s+Α", section_text, re.IGNORECASE):
                before_start = max(0, section_start - 2000)
                before = text[before_start:section_start]

                previous_part_matches = list(
                    re.finditer(
                        r"(?m)^\s*ΜΕΡΟΣ\s+Α[΄'’]?\s*$",
                        before,
                        re.IGNORECASE,
                    )
                )

                if previous_part_matches:
                    section_start = before_start + previous_part_matches[-1].start()

            candidates.append((score, section_start))

    if not candidates:
        raise ValueError("Δεν βρέθηκε αξιόπιστη αρχή κυρίως σώματος.")

    candidates.sort(reverse=True)
    return candidates[0][1]


def find_main_body_end(text: str, start_idx: int) -> int:
    body = text[start_idx:]
    end_sections = list(END_SECTION_RE.finditer(body))

    if end_sections:
        last_end_section = end_sections[-1]
        tail = body[last_end_section.start():]

        stop = END_STOP_RE.search(tail)

        if stop:
            return start_idx + last_end_section.start() + stop.start()

        return len(text)

    stop = END_STOP_RE.search(body)

    if stop:
        return start_idx + stop.start()

    return len(text)


def extract_main_bill_body(pdf_path: str) -> str:
    full_text = read_pdf_text(pdf_path)

    start_idx = find_main_body_start(full_text)
    end_idx = find_main_body_end(full_text, start_idx)

    return full_text[start_idx:end_idx].strip()