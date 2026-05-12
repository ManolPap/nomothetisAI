import unittest

from app.features.field_30.services.corpus_service import (
    RepealReference,
    extract_repeal_references,
    resolve_repeal_reference,
)
from app.features.field_30.services.table_service import analyze_bill_field_30_rows


class Field30TableServiceTests(unittest.TestCase):
    def test_extract_repeal_references_detects_fixed_corpus_mappings(self) -> None:
        references = extract_repeal_references(
            "Καταργούνται το π.δ. 156/1994 (Α΄ 102) και η περ. Α της παρ. 2 "
            "του άρθρου 74 του ν. 3863/2010 (Α΄ 115)."
        )

        self.assertEqual([ref.law_id for ref in references], ["156/1994", "3863/2010"])
        self.assertTrue(references[0].whole_law)
        self.assertFalse(references[1].whole_law)
        self.assertEqual(references[1].article_number, "74")
        self.assertEqual(references[1].paragraph_number, "2")
        self.assertEqual(references[1].case_label, "α")

    def test_analyze_rows_resolves_whole_pd_and_specific_law_case(self) -> None:
        rows = analyze_bill_field_30_rows(
            [
                {
                    "article": "34",
                    "title": "Καταργούμενες διατάξεις",
                    "text": (
                        "Καταργούνται:\n"
                        "α) το π.δ. 156/1994 (Α΄ 102), και\n"
                        "β) η περ. Α της παρ. 2 του άρθρου 74 του ν. 3863/2010 (Α΄ 115)."
                    ),
                    "part": None,
                    "chapter": None,
                }
            ]
        )

        self.assertEqual(len(rows), 2)

        self.assertEqual(rows[0]["evaluated_provision"], "το π.δ. 156/1994 (Α΄ 102)")
        self.assertEqual(
            rows[1]["evaluated_provision"],
            "η περ. Α της παρ. 2 του άρθρου 74 του ν. 3863/2010 (Α΄ 115).",
        )
        self.assertNotIn("Άρθρο 34", rows[0]["evaluated_provision"])

        pd_text = rows[0]["repealed_provision"]
        head, sep, _ = pd_text.partition("Άρθρο 1")
        self.assertTrue(sep, "Expected corpus text to include Άρθρο 1")
        self.assertGreater(
            len(head.strip()),
            80,
            "Expected PD preamble (title / Έχοντας υπόψη) before Άρθρο 1",
        )
        self.assertIn("Άρθρο 1", pd_text)
        self.assertIn("Σκοπός - Πεδίο εφαρμογής", pd_text)
        self.assertIn("Άρθρο 7", pd_text)
        self.assertNotIn("Άρθρο 8", pd_text)
        self.assertNotIn("ΟΙ ΥΠΟΥΡΓΟΙ", pd_text)

        case_text = rows[1]["repealed_provision"]
        self.assertIn("Άρθρο 74", case_text)
        self.assertIn("παρ. 2, περ. α", case_text)
        self.assertIn("α) Για υπαλλήλους", case_text)
        self.assertNotIn("β) Για υπαλλήλους", case_text)
        self.assertNotIn("warning", rows[1])

    def test_specific_case_fallback_returns_paragraph_with_warning(self) -> None:
        resolved = resolve_repeal_reference(
            RepealReference(
                law_id="3863/2010",
                label="ν. 3863/2010",
                whole_law=False,
                source_text="",
                article_number="74",
                paragraph_number="2",
                case_label="ω",
            )
        )

        self.assertIn("Δεν βρέθηκε ακριβής περ. ω", resolved.warning)
        self.assertIn("παρ. 2", resolved.text)
        self.assertIn("α) Για υπαλλήλους", resolved.text)
        self.assertIn("β) Για υπαλλήλους", resolved.text)


if __name__ == "__main__":
    unittest.main()
