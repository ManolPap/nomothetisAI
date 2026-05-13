import unittest
from unittest.mock import patch

from app.features.field_29.services.stage_2_service import (
    ADDITION_NO_EXISTING_TEXT,
    MISSING_EXISTING_PROVISION_TEXT,
    build_field_29_stage_2_rows,
    retrieve_chunks_for_affected_provision,
)
from app.features.field_30.services.legal_corpus_index import CorpusChunk


def chunk(
    *,
    article: str = "80",
    paragraph: str | None = "1",
    text: str = "1. Υφιστάμενο κείμενο.",
) -> CorpusChunk:
    return CorpusChunk(
        source_file="88a_13.1369120421609.pdf",
        law_type="ν.",
        law_number="4144/2013",
        law_year="2013",
        fek="Α΄ 88",
        legal_code=None,
        article=article,
        article_title="Τίτλος άρθρου",
        paragraph=paragraph,
        case=None,
        text=text,
    )


class Field29Stage2ServiceTests(unittest.TestCase):
    def test_retrieve_exact_paragraph_match(self) -> None:
        with patch(
            "app.features.field_29.services.stage_2_service.find_corpus_chunks",
            return_value=[chunk()],
        ) as find_chunks:
            result = retrieve_chunks_for_affected_provision(
                {
                    "affected_reference": "παρ. 1 άρθρου 80 ν. 4144/2013",
                    "change_type": "modification",
                    "law_type": "ν.",
                    "law_number": "4144/2013",
                    "fek": "Α΄ 88",
                    "article": "80",
                    "paragraph": "1",
                    "case": None,
                    "legal_code": None,
                }
            )

        self.assertEqual(result[0].paragraph, "1")
        find_chunks.assert_called_once_with(
            law_number="4144/2013",
            article="80",
            paragraph="1",
        )

    def test_case_not_found_falls_back_to_article_level(self) -> None:
        paragraph_chunk = chunk(text="1. α) Πρώτη περίπτωση.")
        article_chunks = [
            paragraph_chunk,
            chunk(paragraph="2", text="2. Δεύτερη παράγραφος."),
        ]

        with patch(
            "app.features.field_29.services.stage_2_service.find_corpus_chunks",
            side_effect=[[paragraph_chunk], article_chunks],
        ):
            result = retrieve_chunks_for_affected_provision(
                {
                    "affected_reference": "περ. β παρ. 1 άρθρου 80 ν. 4144/2013",
                    "change_type": "modification",
                    "law_type": "ν.",
                    "law_number": "4144/2013",
                    "fek": "Α΄ 88",
                    "article": "80",
                    "paragraph": "1",
                    "case": "β",
                    "legal_code": None,
                }
            )

        self.assertEqual([item.paragraph for item in result], ["1", "2"])

    def test_stage_2_row_formats_existing_text_and_matched_chunks(self) -> None:
        rows = [
            {
                "source_article": "22",
                "source_article_title": "Τροποποίηση παρ. 1 άρθρου 80 ν. 4144/2013",
                "evaluated_provision": "Άρθρο 22\n...",
                "affected_provisions": [
                    {
                        "affected_reference": "παρ. 1 άρθρου 80 ν. 4144/2013",
                        "change_type": "modification",
                        "law_type": "ν.",
                        "law_number": "4144/2013",
                        "fek": "Α΄ 88",
                        "article": "80",
                        "paragraph": "1",
                        "case": None,
                        "legal_code": None,
                    }
                ],
            }
        ]

        with patch(
            "app.features.field_29.services.stage_2_service.find_corpus_chunks",
            return_value=[chunk(text="1. Πραγματικό κείμενο από corpus.")],
        ):
            result = build_field_29_stage_2_rows(rows)

        self.assertIn("Άρθρο 80 ν. 4144/2013 (Α΄ 88)", result[0]["existing_provisions_text"])
        self.assertIn("Πραγματικό κείμενο από corpus", result[0]["existing_provisions_text"])
        self.assertEqual(result[0]["matched_chunks"][0]["source_file"], "88a_13.1369120421609.pdf")

    def test_missing_match_returns_corpus_message(self) -> None:
        rows = [
            {
                "source_article": "99",
                "source_article_title": "Τροποποίηση άρθρου 1 ν. 9999/2099",
                "evaluated_provision": "Άρθρο 99\n...",
                "affected_provisions": [
                    {
                        "affected_reference": "άρθρο 1 ν. 9999/2099",
                        "change_type": "modification",
                        "law_type": "ν.",
                        "law_number": "9999/2099",
                        "fek": None,
                        "article": "1",
                        "paragraph": None,
                        "case": None,
                        "legal_code": None,
                    }
                ],
            }
        ]

        with patch(
            "app.features.field_29.services.stage_2_service.find_corpus_chunks",
            return_value=[],
        ):
            result = build_field_29_stage_2_rows(rows)

        self.assertEqual(result[0]["existing_provisions_text"], MISSING_EXISTING_PROVISION_TEXT)
        self.assertEqual(result[0]["matched_chunks"], [])

    def test_addition_change_type_skips_corpus_and_shows_addition_notice(self) -> None:
        rows = [
            {
                "source_article": "15",
                "source_article_title": "Προσθήκη άρθρου 99 στον Κώδικα",
                "evaluated_provision": "Άρθρο 15\n...",
                "affected_provisions": [
                    {
                        "affected_reference": "νέο άρθρο 99",
                        "change_type": "addition",
                        "law_type": "ν.",
                        "law_number": "1234/2020",
                        "fek": None,
                        "article": "99",
                        "paragraph": None,
                        "case": None,
                        "legal_code": None,
                    }
                ],
            }
        ]

        with patch(
            "app.features.field_29.services.stage_2_service.find_corpus_chunks",
        ) as find_chunks:
            result = build_field_29_stage_2_rows(rows)

        find_chunks.assert_not_called()
        self.assertEqual(result[0]["existing_provisions_text"], ADDITION_NO_EXISTING_TEXT)
        self.assertEqual(result[0]["matched_chunks"], [])

    def test_missing_message_omitted_when_another_provision_matched(self) -> None:
        hit = chunk(text="1. Κείμενο από corpus.")
        rows = [
            {
                "source_article": "10",
                "source_article_title": "Τροποποίηση διατάξεων",
                "evaluated_provision": "Άρθρο 10\n...",
                "affected_provisions": [
                    {
                        "affected_reference": "παρ. 1 άρθρου 80 ν. 4144/2013",
                        "change_type": "modification",
                        "law_type": "ν.",
                        "law_number": "4144/2013",
                        "fek": "Α΄ 88",
                        "article": "80",
                        "paragraph": "1",
                        "case": None,
                        "legal_code": None,
                    },
                    {
                        "affected_reference": "άρθρο 1 ν. 9999/2099",
                        "change_type": "modification",
                        "law_type": "ν.",
                        "law_number": "9999/2099",
                        "fek": None,
                        "article": "1",
                        "paragraph": None,
                        "case": None,
                        "legal_code": None,
                    },
                ],
            }
        ]

        def fake_find(law_number: str, article: str, paragraph: str | None = None):
            if law_number == "4144/2013":
                return [hit]
            return []

        with patch(
            "app.features.field_29.services.stage_2_service.find_corpus_chunks",
            side_effect=fake_find,
        ):
            result = build_field_29_stage_2_rows(rows)

        self.assertNotIn("Δεν εντοπίστηκε", result[0]["existing_provisions_text"])
        self.assertIn("Κείμενο από corpus", result[0]["existing_provisions_text"])


if __name__ == "__main__":
    unittest.main()
