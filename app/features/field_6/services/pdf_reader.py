"""Εξαγωγή κειμένου από PDF για το Πεδίο 6."""

import re

import fitz  # type: ignore[import-not-found]


def extract_text_from_pdf(pdf_path: str) -> str:
    """Εξάγει κείμενο από PDF με fitz."""
    doc = fitz.open(pdf_path)
    text = "".join(page.get_text() for page in doc)
    doc.close()

    if not text.strip():
        raise ValueError(f"Δεν βρέθηκε κείμενο στο PDF: {pdf_path}")

    return text


def extract_articles_from_law(text: str) -> str:
    """
    Δομημένη εξαγωγή από το κείμενο του νόμου.
    Κρατά: τίτλο, σκοπό, και τα βασικά σημεία κάθε άρθρου.
    """
    lines = text.split("\n")
    result = []
    current_article: list[str] = []
    article_count = 0
    max_articles = 20

    # Πάντα κρατάμε τις πρώτες 30 γραμμές (τίτλος, σκοπός)
    header = "\n".join(lines[:30])
    result.append("=== ΤΙΤΛΟΣ ΚΑΙ ΕΙΣΑΓΩΓΗ ===")
    result.append(header)

    article_pattern = re.compile(
        r"^(Άρθρο|ΑΡΘΡΟ|Article)\s+\d+", re.IGNORECASE
    )

    for line in lines:
        if article_pattern.match(line.strip()):
            if current_article and article_count < max_articles:
                result.append("\n".join(current_article[:8]))
                article_count += 1
            current_article = [line]
        else:
            current_article.append(line)

    if current_article and article_count < max_articles:
        result.append("\n".join(current_article[:8]))

    result.append("=== ΥΠΟΓΡΑΦΕΣ ===")
    result.append("\n".join(lines[-10:]))

    extracted = "\n\n".join(result)

    # Αν δεν βρέθηκαν άρθρα, επιστρέφουμε τις πρώτες 200 γραμμές
    if article_count == 0:
        return "\n".join(lines[:200])

    return extracted
