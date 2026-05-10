import unittest

from app.features.field_29.services.llm_service import (
    EMPTY_FIELD_29_ANSWER,
    analyze_bill_field_29,
    build_field_29_bill_input,
    classify_field_29_change_type,
    select_field_29_articles,
)


class Field29LlmServiceTests(unittest.TestCase):
    def test_classify_field_29_change_type_uses_title_terms(self) -> None:
        self.assertEqual(
            classify_field_29_change_type(
                "Σκοπός - Ορισμοί - Αντικατάσταση άρθρου 69 Κώδικα"
            ),
            "αντικατάσταση",
        )
        self.assertEqual(
            classify_field_29_change_type("Τροποποίηση και συμπλήρωση διατάξεων"),
            "τροποποίηση / συμπλήρωση",
        )
        self.assertIsNone(classify_field_29_change_type("Σκοπός και πεδίο εφαρμογής"))

    def test_select_field_29_articles_filters_by_title_metadata(self) -> None:
        articles = [
            {
                "article": "1",
                "title": "Σκοπός",
                "text": "Το άρθρο 5 αντικαθίσταται.",
                "part": None,
                "chapter": None,
            },
            {
                "article": "2",
                "title": "Αντικατάσταση άρθρου 5",
                "text": "Το άρθρο 5 αντικαθίσταται ως εξής...",
                "part": None,
                "chapter": None,
            },
        ]

        selected = select_field_29_articles(articles)

        self.assertEqual(len(selected), 1)
        self.assertEqual(selected[0]["article"], "2")
        self.assertEqual(selected[0]["field_29_change_type"], "αντικατάσταση")

    def test_build_field_29_bill_input_includes_change_type(self) -> None:
        bill_input = build_field_29_bill_input(
            [
                {
                    "article": "3",
                    "title": "Συμπλήρωση άρθρου 8",
                    "field_29_change_type": "συμπλήρωση",
                    "text": "Προστίθεται νέα παράγραφος.",
                    "part": {"label": "ΜΕΡΟΣ Α", "title": "Γενικές διατάξεις"},
                    "chapter": None,
                }
            ]
        )

        self.assertIn("ΑΡΘΡΟ 3: Συμπλήρωση άρθρου 8", bill_input)
        self.assertIn("field_29_change_type: συμπλήρωση", bill_input)
        self.assertIn("Προστίθεται νέα παράγραφος.", bill_input)

    def test_analyze_bill_field_29_returns_empty_answer_without_llm_call(self) -> None:
        self.assertEqual(analyze_bill_field_29([]), EMPTY_FIELD_29_ANSWER)


if __name__ == "__main__":
    unittest.main()
