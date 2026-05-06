from openai import OpenAI

from app.core.config import settings
from app.features.field_4.prompt import FIELD_4_GLOBAL_PROMPT


def build_global_bill_input(articles: list[dict]) -> str:
    chunks = []

    for article in articles:
        part = article.get("part") or {}
        chapter = article.get("chapter") or {}

        chunk = f"""
ΜΕΡΟΣ: {part.get("label")} - {part.get("title")}
ΚΕΦΑΛΑΙΟ: {chapter.get("label")} - {chapter.get("title")}
ΑΡΘΡΟ {article["article"]}: {article["title"]}
ΚΕΙΜΕΝΟ:
{article["text"]}
""".strip()

        chunks.append(chunk)

    return "\n\n" + ("=" * 80 + "\n\n").join(chunks)


def analyze_bill_field_4(articles: list[dict]) -> str:
    api_key = settings.feature.field_4_openai_api_key
    if api_key is None:
        raise RuntimeError("Missing FEATURE_FIELD_4_OPENAI_API_KEY")

    client = OpenAI(api_key=api_key.get_secret_value())
    bill_input = build_global_bill_input(articles)

    response = client.responses.create(
        model=settings.feature.field_4_openai_model,
        input=[
            {"role": "system", "content": FIELD_4_GLOBAL_PROMPT},
            {"role": "user", "content": bill_input},
        ],
        temperature=0,
    )

    return response.output_text.strip()
