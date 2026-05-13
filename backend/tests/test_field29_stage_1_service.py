import unittest

from app.features.field_29.services.stage_1_service import (
    build_evaluated_provision,
    build_field_29_stage_1_rows,
    classify_field_29_change_type,
    extract_affected_provisions,
    select_field_29_articles,
)


class Field29Stage1ServiceTests(unittest.TestCase):
    def test_classify_field_29_change_type_uses_title_terms(self) -> None:
        self.assertEqual(
            classify_field_29_change_type(
                "Σκοπός - Ορισμοί - Αντικατάσταση άρθρου 69 Κώδικα"
            ),
            "replacement",
        )
        self.assertEqual(
            classify_field_29_change_type("Τροποποίηση και συμπλήρωση διατάξεων"),
            "modification / supplement",
        )
        self.assertEqual(
            classify_field_29_change_type("Προσθήκη άρθρου 182Α στον Κώδικα"),
            "addition",
        )
        self.assertEqual(classify_field_29_change_type("Κατάργηση διάταξης"), "repeal")
        self.assertEqual(classify_field_29_change_type("Αναρίθμηση παραγράφων"), "renumbering")
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
        self.assertEqual(selected[0]["field_29_change_type"], "replacement")

    def test_select_field_29_articles_excludes_repeal_titles(self) -> None:
        articles = [
            {
                "article": "1",
                "title": "Κατάργηση άρθρου 5 ν. 1234/2020",
                "text": "Καταργείται το άρθρο 5.",
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

        self.assertEqual([row["article"] for row in selected], ["2"])

    def test_build_evaluated_provision_keeps_full_article_text(self) -> None:
        evaluated = build_evaluated_provision(
            {
                "article": "7",
                "title": "Αντικατάσταση άρθρου 73",
                "text": "Το άρθρο 73 αντικαθίσταται ως εξής:\n\n«Άρθρο 73...»",
            }
        )

        self.assertEqual(
            evaluated,
            "Άρθρο 7\nΑντικατάσταση άρθρου 73\n\n"
            "Το άρθρο 73 αντικαθίσταται ως εξής:\n«Άρθρο 73...»",
        )

    def test_extract_affected_code_article_with_law_and_fek(self) -> None:
        provisions = extract_affected_provisions(
            {
                "article": "9",
                "title": (
                    "Παράλληλη απασχόληση – Αντικατάσταση άρθρου 189 "
                    "Κώδικα Ατομικού Εργατικού Δικαίου"
                ),
                "field_29_change_type": "replacement",
                "text": (
                    "Στο άρθρο 189 του Κώδικα Ατομικού Εργατικού Δικαίου "
                    "(π.δ. 80/2022, Α΄ 222), περί παράλληλης απασχόλησης, "
                    "αντικαθίσταται ως εξής:"
                ),
            }
        )

        self.assertEqual(
            provisions,
            [
                {
                    "affected_reference": (
                        "άρθρο 189 Κώδικα Ατομικού Εργατικού Δικαίου "
                        "(π.δ. 80/2022, Α΄ 222)"
                    ),
                    "change_type": "replacement",
                    "law_type": "π.δ.",
                    "law_number": "80/2022",
                    "fek": "Α΄ 222",
                    "article": "189",
                    "paragraph": None,
                    "case": None,
                    "legal_code": "Κώδικας Ατομικού Εργατικού Δικαίου",
                }
            ],
        )

    def test_extract_affected_paragraph_article_with_law_and_fek(self) -> None:
        provisions = extract_affected_provisions(
            {
                "article": "22",
                "title": "Τροποποίηση παρ. 1 άρθρου 80 ν. 4144/2013",
                "field_29_change_type": "modification",
                "text": (
                    "Στην παρ. 1 του άρθρου 80 του ν. 4144/2013 (Α΄ 88), "
                    "περί καταχώρισης αλλαγής ωραρίου και υπερωριών, "
                    "επέρχονται οι ακόλουθες τροποποιήσεις:"
                ),
            }
        )

        self.assertEqual(
            provisions,
            [
                {
                    "affected_reference": "παρ. 1 άρθρου 80 ν. 4144/2013 (Α΄ 88)",
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
        )

    def test_extract_merges_title_and_intro_paragraph_refs(self) -> None:
        provisions = extract_affected_provisions(
            {
                "article": "29",
                "title": (
                    "Καταβολή ειδικού εποχιακού βοηθήματος - "
                    "Τροποποίηση παρ. 1 και 3 άρθρου 22 ν. 1836/1989"
                ),
                "field_29_change_type": "modification",
                "text": (
                    "1. Στην παρ. 1 του άρθρου 22 του ν. 1836/1989 (Α΄ 79), περί του καθορισμού των "
                    "μερών καταβολής του εποχιακού βοηθήματος, επέρχονται οι ακόλουθες τροποποιήσεις:"
                ),
            }
        )

        self.assertEqual(len(provisions), 1)
        self.assertEqual(provisions[0]["article"], "22")
        self.assertEqual(provisions[0]["law_number"], "1836/1989")
        self.assertEqual(provisions[0]["paragraph"], "1 και 3")
        self.assertEqual(provisions[0]["fek"], "Α΄ 79")

    def test_build_stage_1_rows_maps_source_article_to_affected_provisions(self) -> None:
        rows = build_field_29_stage_1_rows(
            [
                {
                    "article": "22",
                    "title": "Τροποποίηση παρ. 1 άρθρου 80 ν. 4144/2013",
                    "field_29_change_type": "modification",
                    "text": "Στην παρ. 1 του άρθρου 80 του ν. 4144/2013 (Α΄ 88), ...",
                    "part": None,
                    "chapter": None,
                }
            ]
        )

        self.assertEqual(rows[0]["source_article"], "22")
        self.assertEqual(
            rows[0]["source_article_title"],
            "Τροποποίηση παρ. 1 άρθρου 80 ν. 4144/2013",
        )
        self.assertEqual(rows[0]["affected_provisions"][0]["article"], "80")

    def test_extract_affected_multiple_references_from_intro(self) -> None:
        provisions = extract_affected_provisions(
            {
                "article": "23",
                "title": (
                    "Διαδικασία υποβολής στο Πληροφοριακό Σύστημα «ΕΡΓΑΝΗ ΙΙ» – "
                    "Τροποποίηση άρθρου 320 Κώδικα Ατομικού Εργατικού Δικαίου"
                ),
                "field_29_change_type": "modification",
                "text": (
                    "Στο άρθρο 320 του Κώδικα Ατομικού Εργατικού Δικαίου "
                    "(π.δ. 80/2022, Α’ 222) και στο κωδικοποιηθέν άρθρο 38 "
                    "του ν. 4488/2017 (Α’ 137), περί της αναγγελίας λύσης "
                    "της σύμβασης εργασίας, επέρχονται οι ακόλουθες τροποποιήσεις:"
                ),
            }
        )

        self.assertEqual([provision["article"] for provision in provisions], ["320", "38"])
        self.assertEqual(provisions[0]["law_number"], "80/2022")
        self.assertEqual(provisions[1]["law_number"], "4488/2017")

if __name__ == "__main__":
    unittest.main()
