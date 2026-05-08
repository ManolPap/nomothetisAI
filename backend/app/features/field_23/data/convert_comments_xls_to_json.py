from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import xlrd


def _normalize_header(value: Any) -> str:
    return str(value).strip().lower()


def _pick_column(headers: list[str], candidates: tuple[str, ...], label: str) -> int:
    normalized_candidates = {candidate.strip().lower() for candidate in candidates}
    for index, header in enumerate(headers):
        if header in normalized_candidates:
            return index
    available = ", ".join(headers)
    expected = ", ".join(candidates)
    raise ValueError(
        f"Could not find '{label}' column. Expected one of: [{expected}]. "
        f"Available headers: [{available}]"
    )


def _read_xls_rows(path: Path) -> tuple[list[str], list[list[Any]]]:
    workbook = xlrd.open_workbook(path.as_posix())
    sheet = workbook.sheet_by_index(0)
    if sheet.nrows == 0:
        return [], []

    headers = [_normalize_header(sheet.cell_value(0, col)) for col in range(sheet.ncols)]
    rows: list[list[Any]] = []
    for row_idx in range(1, sheet.nrows):
        row = [sheet.cell_value(row_idx, col) for col in range(sheet.ncols)]
        rows.append(row)
    return headers, rows


def _stringify(value: Any) -> str:
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _extract_article_number(article_title: str) -> str:
    normalized = article_title.strip()
    if not normalized:
        return ""

    # Handles variants like "Άρθρο 1", "Αρθρο 1", "article 1".
    match = re.search(r"\b(?:άρθρο|αρθρο|article)\s*([0-9]+)\b", normalized, flags=re.IGNORECASE)
    if match:
        return match.group(1)

    # Fallback for titles that still contain one clear number.
    any_number = re.search(r"\b([0-9]+)\b", normalized)
    if any_number:
        return any_number.group(1)

    return ""


def convert_comments(
    xls_path: Path,
    out_path: Path,
    id_column: str | None = None,
    article_column: str | None = None,
    text_column: str | None = None,
    participant_column: str | None = None,
) -> int:
    headers, rows = _read_xls_rows(xls_path)
    if not headers:
        raise ValueError(f"Empty XLS file: {xls_path}")

    id_candidates = (
        id_column,
        "id",
        "comment_id",
        "κωδικός",
        "κωδικός σχολίου",
        "comment id",
    )
    article_candidates = (
        article_column,
        "target_article_number",
        "article_number",
        "article",
        "άρθρο",
        "αρθρο",
    )
    text_candidates = (
        text_column,
        "text",
        "comment",
        "comments",
        "σχόλιο",
        "σχολιο",
    )
    participant_candidates = (
        participant_column,
        "participant",
        "commenter",
        "author",
        "user",
        "name",
        "σχολιαστής",
        "σχολιαστης",
    )

    id_idx = _pick_column(headers, tuple(c for c in id_candidates if c), "id")
    article_idx = _pick_column(
        headers,
        tuple(c for c in article_candidates if c),
        "target_article_number",
    )
    text_idx = _pick_column(headers, tuple(c for c in text_candidates if c), "text")
    participant_idx = _pick_column(
        headers,
        tuple(c for c in participant_candidates if c),
        "participant",
    )

    output: list[dict[str, str]] = []
    generated_id_counter = 1

    for row in rows:
        raw_article = row[article_idx] if article_idx < len(row) else ""
        raw_text = row[text_idx] if text_idx < len(row) else ""
        article_title_value = _stringify(raw_article)
        text_value = _stringify(raw_text)
        article_number_value = _extract_article_number(article_title_value)

        if not article_title_value or not text_value:
            continue

        raw_id = row[id_idx] if id_idx < len(row) else ""
        raw_participant = row[participant_idx] if participant_idx < len(row) else ""
        id_value = _stringify(raw_id)
        participant_value = _stringify(raw_participant)
        if not id_value:
            id_value = f"comment-{generated_id_counter:04d}"
            generated_id_counter += 1

        output.append(
            {
                "id": id_value,
                "target_article_number": article_number_value,
                "title": article_title_value,
                "participant": participant_value,
                "text": text_value,
            }
        )

    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    return len(output)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert comments XLS into legislative_comments.json format."
    )
    parser.add_argument(
        "--input",
        "--xls",
        type=Path,
        default=Path(__file__).resolve().parent / "comments_5053.xls",
        help="Input .xls path",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "legislative_comments.json",
        help="Output JSON path",
    )
    parser.add_argument(
        "--id-column",
        type=str,
        default=None,
        help="Optional explicit id column header",
    )
    parser.add_argument(
        "--article-column",
        type=str,
        default=None,
        help="Optional explicit article column header",
    )
    parser.add_argument(
        "--text-column",
        type=str,
        default=None,
        help="Optional explicit comment text column header",
    )
    parser.add_argument(
        "--participant-column",
        type=str,
        default=None,
        help="Optional explicit participant/commenter column header",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    count = convert_comments(
        xls_path=args.input,
        out_path=args.output,
        id_column=args.id_column,
        article_column=args.article_column,
        text_column=args.text_column,
        participant_column=args.participant_column,
    )
    print(f"Wrote {count} comments to {args.output}")


if __name__ == "__main__":
    main()
