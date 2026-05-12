"""Regression tests for field_23 PDF title/body splitting."""

import unittest

from app.features.field_23.services.documents.split_text.splitter import extract_title_and_body


class ExtractTitleBodyFusedLineTests(unittest.TestCase):
    def test_fuses_directive_year_then_ston_kodika(self) -> None:
        lines = [
            "Άρθρο 4",
            (
                "Τίτλος: Δοκιμαστική περίοδος – Δόκιμος εργαζόμενος – Προσθήκη άρθρου 1Α στον "
                "Κώδικα Ατομικού Εργατικού Δικαίου (Άρθρο 8 της Οδηγίας (ΕΕ) 2019/1152) "
                "Στον Κώδικα Ατομικού Εργατικού Δικαίου (π.δ. 80/2022, Α' 222), μετά το άρθρο 1, "
                "προστίθεται."
            ),
        ]
        title, body = extract_title_and_body(lines)
        self.assertTrue(title.rstrip().endswith("2019/1152)"))
        self.assertTrue(body.startswith("Στον Κώδικα"))

    def test_fuses_directive_year_then_to_arthro(self) -> None:
        lines = [
            "Άρθρο 5",
            (
                "Τίτλος: Παροχή πληροφοριών – Χρονοδιάγραμμα και μέσα ενημέρωσης – "
                "Αντικατάσταση άρθρου 71 Κώδικα Ατομικού Εργατικού Δικαίου "
                "(Άρθρα 3 και 5 της Οδηγίας (ΕΕ) 2019/1152) Το άρθρο 71 του Κώδικα Ατομικού "
                "Εργατικού Δικαίου (π.δ. 80/2022, Α' 222), περί των τρόπων"
            ),
        ]
        title, body = extract_title_and_body(lines)
        self.assertTrue(title.rstrip().endswith("2019/1152)"))
        self.assertTrue(body.startswith("Το άρθρο 71"))

    def test_no_space_before_year_after_ee(self) -> None:
        lines = [
            "Άρθρο 3",
            (
                "Τίτλος: Σκοπός - Αντικείμενο και πεδίο εφαρμογής - Ορισμοί - "
                "Αντικατάσταση άρθρου 69 Κώδικα Ατομικού Εργατικού Δικαίου "
                "(Άρθρα 1, 2 και 20 της Οδηγίας (ΕΕ)2019/1152) Το άρθρο 69 του Κώδικα Ατομικού "
                "Εργατικού Δικαίου (π.δ. 80/2022, Α΄ 222), περί του σκοπού"
            ),
        ]
        title, body = extract_title_and_body(lines)
        self.assertIn("2019/1152)", title)
        self.assertTrue(body.startswith("Το άρθρο 69"))

    def test_lowercase_ston_kodika_line_is_title_wrap_not_operative(self) -> None:
        """Lowercase «στον Κώδικα» is title wrap; operative «Στον» uses capital Σ."""
        lines = [
            "Άρθρο 10",
            (
                "Τίτλος: Ελάχιστη προβλεψιμότητα της εργασίας - Προστατευτικά μέτρα - "
                "Προσθήκη άρθρου 182Α"
            ),
            "στον Κώδικα Ατομικού Εργατικού Δικαίου",
            "(Άρθρα 10 και 11 της Οδηγίας (ΕΕ) 2019/1152)",
            (
                "Στον Κώδικα Ατομικού Εργατικού Δικαίου (π.δ. 80/2022, Α' 222), "
                "μετά το άρθρο 182Α προστίθεται."
            ),
        ]
        title, body = extract_title_and_body(lines)
        self.assertIn("στον Κώδικα", title)
        self.assertTrue(title.rstrip().endswith("2019/1152)"))
        self.assertTrue(body.startswith("Στον Κώδικα"))

    def test_title_on_two_lines_then_ston_body_line(self) -> None:
        lines = [
            "Άρθρο 4",
            (
                "Τίτλος: Δοκιμαστική περίοδος – Δόκιμος εργαζόμενος – Προσθήκη άρθρου 1Α στον "
                "Κώδικα Ατομικού Εργατικού Δικαίου (Άρθρο 8 της Οδηγίας (ΕΕ) 2019/1152)"
            ),
            (
                "Στον Κώδικα Ατομικού Εργατικού Δικαίου (π.δ. 80/2022, Α' 222), "
                "μετά το άρθρο 1, προστίθεται."
            ),
        ]
        title, body = extract_title_and_body(lines)
        self.assertNotIn("Στον", title)
        self.assertTrue(title.rstrip().endswith("2019/1152)"))
        self.assertTrue(body.startswith("Στον Κώδικα"))

    def test_fuses_when_no_space_after_closing_paren_before_ston(self) -> None:
        lines = [
            "Άρθρο 4",
            (
                "Τίτλος: Δοκιμαστική περίοδος (Άρθρο 8 της Οδηγίας (ΕΕ) 2019/1152)Στον "
                "Κώδικα Ατομικού Εργατικού Δικαίου, μετά το άρθρο 1."
            ),
        ]
        title, body = extract_title_and_body(lines)
        self.assertTrue(title.rstrip().endswith("2019/1152)"))
        self.assertTrue(body.startswith("Στον Κώδικα"))

    def test_fuses_without_titlos_prefix_when_pattern_present(self) -> None:
        lines = [
            "Άρθρο 4",
            (
                "Δοκιμαστική περίοδος – Δόκιμος εργαζόμενος – Προσθήκη άρθρου 1Α στον "
                "Κώδικα Ατομικού Εργατικού Δικαίου (Άρθρο 8 της Οδηγίας (ΕΕ) 2019/1152) "
                "Στον Κώδικα Ατομικού Εργατικού Δικαίου (π.δ. 80/2022, Α' 222), μετά το άρθρο 1."
            ),
        ]
        title, body = extract_title_and_body(lines)
        self.assertNotIn("Στον", title)
        self.assertTrue(title.rstrip().endswith("2019/1152)"))

    def test_sto_arthro_line_starts_body_not_ston(self) -> None:
        """«Στο άρθρο N…» (not «Στον Κώδικα») begins operative wording."""
        lines = [
            "Άρθρο 17",
            (
                "Τίτλος: Προστασία από την απόλυση και βάρος της απόδειξης – "
                "Τροποποίηση άρθρου 339"
            ),
            "Κώδικα Ατομικού Εργατικού Δικαίου",
            "(Άρθρο 18 της Οδηγίας (ΕΕ) 2019/1152)",
            (
                "Στο άρθρο 339 του Κώδικα Ατομικού Εργατικού Δικαίου (π.δ. 80/2022, Α' 222), "
                "περί της"
            ),
            "προστασίας από τις απολύσεις, επέρχονται οι ακόλουθες τροποποιήσεις: α",
        ]
        title, body = extract_title_and_body(lines)
        self.assertNotIn("Στο άρθρο", title)
        self.assertTrue(title.endswith("2019/1152)"))
        self.assertIn("339", title)
        self.assertIn("Κώδικα Ατομικού Εργατικού Δικαίου", title)
        self.assertTrue(body.startswith("Στο άρθρο 339"))

    def test_fuses_sto_arthro_on_same_line_as_directive_close(self) -> None:
        lines = [
            "Άρθρο 17",
            (
                "Τίτλος: Προστασία – Τροποποίηση άρθρου 339 Κώδικα Ατομικού Εργατικού Δικαίου "
                "(Άρθρο 18 της Οδηγίας (ΕΕ) 2019/1152) Στο άρθρο 339 του Κώδικα Ατομικού "
                "Εργατικού Δικαίου (π.δ. 80/2022, Α' 222), περί της"
            ),
        ]
        title, body = extract_title_and_body(lines)
        self.assertTrue(title.rstrip().endswith("2019/1152)"))
        self.assertTrue(body.startswith("Στο άρθρο 339"))

    def test_article_24_pdf_multiline_no_titlos_prefix(self) -> None:
        """5053 PDF: no «Τίτλος:»; body starts «Στο πρώτο…» after ν. …/…."""
        lines = [
            "Άρθρο 24",
            "Επιχειρησιακός συντονισμός με την Επιθεώρηση Εργασίας για την προστασία της",
            "εργασίας– Τροποποίηση παρ. 2 άρθρου 103 ν. 4808/2021",
            "Στο πρώτο εδάφιο της παρ. 2 του άρθρου 103 του ν. 4808/2021 (Α΄ 101), περί των",
        ]
        title, body = extract_title_and_body(lines)
        self.assertTrue(title.endswith("ν. 4808/2021"))
        self.assertNotIn("Στο πρώτο", title)
        self.assertTrue(body.startswith("Στο πρώτο"))

    def test_article_24_fused_line_after_statute_citation(self) -> None:
        lines = [
            "Άρθρο 24",
            (
                "Επιχειρησιακός συντονισμός με την Επιθεώρηση Εργασίας για την προστασία της "
                "εργασίας– Τροποποίηση παρ. 2 άρθρου 103 ν. 4808/2021 Στο πρώτο εδάφιο της παρ. "
                "2 του άρθρου 103"
            ),
        ]
        title, body = extract_title_and_body(lines)
        self.assertTrue(title.endswith("ν. 4808/2021"))
        self.assertTrue(body.startswith("Στο πρώτο"))

    def test_article_20_dispositive_dimiourgeitai_after_nominative_title(self) -> None:
        """Operative «Δημιουργείται…» after descriptive title (same or next line)."""
        fused = (
            "Τίτλος: Δημιουργία ψηφιακής πλατφόρμας REBRAIN GREECE για τη διασύνδεση "
            "επιστημόνων - εργαζομένων υψηλών δεξιοτήτων που διαμένουν εντός και εκτός "
            "Ελλάδος με την εγχώρια αγορά εργασίας Δημιουργείται ψηφιακή πλατφόρμα με "
            "επωνυμία «REBRAIN GREECE»"
        )
        title, body = extract_title_and_body(["Άρθρο 20", fused])
        self.assertTrue(title.rstrip().endswith("εργασίας"))
        self.assertNotIn("Δημιουργείται", title)
        self.assertIn("REBRAIN GREECE", title)
        self.assertTrue(body.startswith("Δημιουργείται"))

        lines2 = [
            "Άρθρο 20",
            (
                "Τίτλος: Δημιουργία ψηφιακής πλατφόρμας REBRAIN GREECE για τη διασύνδεση "
                "επιστημόνων - εργαζομένων υψηλών δεξιοτήτων που διαμένουν εντός και εκτός "
                "Ελλάδος με την εγχώρια αγορά εργασίας"
            ),
            "Δημιουργείται ψηφιακή πλατφόρμα με επωνυμία «REBRAIN GREECE»",
        ]
        t2, b2 = extract_title_and_body(lines2)
        self.assertTrue(t2.rstrip().endswith("εργασίας"))
        self.assertTrue(b2.startswith("Δημιουργείται"))


if __name__ == "__main__":
    unittest.main()
