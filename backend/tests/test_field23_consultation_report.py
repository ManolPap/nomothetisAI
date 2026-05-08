import os
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from pydantic import SecretStr

os.environ.setdefault("FEATURE_FIELD_23_LEGAL_ANALYZER_CACHE_DIR", "./.tmp/llm_cache_tests")

from app.main import create_app
from app.features.field_23.schemas import GenerateConsultationReportRequest
from app.features.field_23.services.comments.consultation_report import (
    _SummaryOut,
    generate_consultation_report,
)


class ConsultationReportEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self._api_key_patcher = patch(
            "app.features.field_23.services.comments.consultation_report.settings.feature.field_23_google_api_key",
            None,
        )
        self._api_key_patcher.start()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        self._api_key_patcher.stop()

    def test_generate_consultation_report_response_shape_and_counts(self) -> None:
        payload = {
            "items": [
                {
                    "item_index": 0,
                    "article_number": "20",
                    "article_title": "Άρθρο 20",
                    "comments": [
                        {
                            "comment_id": "9939",
                            "rationale_el": "Υιοθετήθηκε διότι βελτιώνει τη σαφήνεια.",
                            "adopted": True,
                        },
                        {
                            "comment_id": "9939",
                            "rationale_el": "Διπλό σχόλιο, πρέπει να αγνοηθεί.",
                            "adopted": True,
                        },
                    ],
                }
            ]
        }

        response = self.client.post("/api/field-23/generate-consultation-report", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("totals", data)
        self.assertIn("articles_section", data)
        self.assertIn("final_preview_text", data)
        self.assertIn("llm_status", data)
        self.assertEqual(data["totals"]["comments_total"], 1)
        self.assertEqual(data["totals"]["adopted_total"], 1)
        self.assertEqual(data["totals"]["not_adopted_total"], 0)
        self.assertEqual(data["totals"]["participants_total"], 1)
        self.assertEqual(data["articles_section"][0]["comment_count"], 1)
        self.assertIn("Αριθμός συμμετασχόντων: 1", data["final_preview_text"])
        self.assertEqual(data["llm_status"], "fallback")

    def test_generate_consultation_report_invalid_shape_returns_400(self) -> None:
        payload = {
            "items": [
                {
                    "item_index": 0,
                    "article_number": "20",
                    "article_title": "Άρθρο 20",
                    "comments": [{"comment_id": "9939", "rationale_el": "x"}],
                }
            ]
        }

        response = self.client.post("/api/field-23/generate-consultation-report", json=payload)
        self.assertEqual(response.status_code, 400)

    def test_generate_consultation_report_rejects_non_boolean_adopted(self) -> None:
        invalid_values = ["true", 1, "yes", None]

        for invalid_value in invalid_values:
            with self.subTest(adopted=invalid_value):
                payload = {
                    "items": [
                        {
                            "item_index": 0,
                            "article_number": "20",
                            "article_title": "Άρθρο 20",
                            "comments": [
                                {
                                    "comment_id": "9939",
                                    "rationale_el": "Έλεγχος strict boolean.",
                                    "adopted": invalid_value,
                                }
                            ],
                        }
                    ]
                }

                response = self.client.post(
                    "/api/field-23/generate-consultation-report",
                    json=payload,
                )
                self.assertEqual(response.status_code, 400)

    def test_generate_consultation_report_wrong_article_mapping_returns_400(self) -> None:
        payload = {
            "items": [
                {
                    "item_index": 0,
                    "article_number": "1",
                    "article_title": "Άρθρο 1",
                    "comments": [
                        {
                            "comment_id": "9939",
                            "rationale_el": "Δεν ταιριάζει με το άρθρο.",
                            "adopted": False,
                        }
                    ],
                }
            ]
        }

        response = self.client.post("/api/field-23/generate-consultation-report", json=payload)
        self.assertEqual(response.status_code, 400)

    def test_generate_consultation_report_word_limit_returns_400(self) -> None:
        payload = {
            "items": [
                {
                    "item_index": 0,
                    "article_number": "20",
                    "article_title": "Άρθρο 20",
                    "comments": [
                        {
                            "comment_id": "9939",
                            "rationale_el": "Σύντομο κείμενο.",
                            "adopted": True,
                        }
                    ],
                }
            ]
        }
        very_long = " ".join(["λέξη"] * 251)
        with patch(
            "app.features.field_23.services.comments.consultation_report.settings.feature.field_23_google_api_key",
            SecretStr("dummy"),
        ), patch(
            "app.features.field_23.services.comments.consultation_report._llm_summarize_article",
            new=AsyncMock(
                return_value=_SummaryOut(
                    adopted_summary=very_long,
                    not_adopted_summary="",
                )
            ),
        ):
            response = self.client.post("/api/field-23/generate-consultation-report", json=payload)
        self.assertEqual(response.status_code, 400)


class ConsultationReportSynthesisStatusTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self._api_key_patcher = patch(
            "app.features.field_23.services.comments.consultation_report.settings.feature.field_23_google_api_key",
            None,
        )
        self._api_key_patcher.start()

    def tearDown(self) -> None:
        self._api_key_patcher.stop()

    async def test_generate_consultation_report_partial_status(self) -> None:
        request = GenerateConsultationReportRequest.model_validate(
            {
                "items": [
                    {
                        "item_index": 0,
                        "article_number": "20",
                        "article_title": "Άρθρο 20",
                        "comments": [
                            {
                                "comment_id": "9939",
                                "rationale_el": "Πρώτο σχόλιο.",
                                "adopted": True,
                            }
                        ],
                    },
                    {
                        "item_index": 1,
                        "article_number": "31",
                        "article_title": "Άρθρο 31",
                        "comments": [
                            {
                                "comment_id": "9940",
                                "rationale_el": "Δεύτερο σχόλιο.",
                                "adopted": False,
                            }
                        ],
                    },
                ]
            }
        )

        async def _side_effect(article, _model_name):
            if article.article_number == "20":
                return _SummaryOut(adopted_summary="ok", not_adopted_summary="")
            raise RuntimeError("LLM failure")

        with patch(
            "app.features.field_23.services.comments.consultation_report.settings.feature.field_23_google_api_key",
            SecretStr("dummy"),
        ), patch(
            "app.features.field_23.services.comments.consultation_report._llm_summarize_article",
            new=AsyncMock(side_effect=_side_effect),
        ):
            response = await generate_consultation_report(request)

        self.assertEqual(response.llm_status, "partial")

    async def test_generate_consultation_report_counts_unique_participants(self) -> None:
        request = GenerateConsultationReportRequest.model_validate(
            {
                "items": [
                    {
                        "item_index": 0,
                        "article_number": "20",
                        "article_title": "Άρθρο 20",
                        "comments": [
                            {
                                "comment_id": "9939",
                                "rationale_el": "Πρώτο σχόλιο.",
                                "adopted": True,
                            }
                        ],
                    },
                    {
                        "item_index": 1,
                        "article_number": "31",
                        "article_title": "Άρθρο 31",
                        "comments": [
                            {
                                "comment_id": "9940",
                                "rationale_el": "Δεύτερο σχόλιο.",
                                "adopted": False,
                            }
                        ],
                    },
                ]
            }
        )

        response = await generate_consultation_report(request)

        self.assertEqual(response.totals.comments_total, 2)
        self.assertEqual(response.totals.participants_total, 1)


if __name__ == "__main__":
    unittest.main()
