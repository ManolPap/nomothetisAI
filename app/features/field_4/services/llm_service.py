from openai import OpenAI

from app.features.field_4.config import OPENAI_MODEL
from app.features.field_4.prompt import FIELD_4_GLOBAL_PROMPT

client = OpenAI()


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
    bill_input = build_global_bill_input(articles)

    response = client.responses.create(
        model=OPENAI_MODEL,
        input=[
            {"role": "system", "content": FIELD_4_GLOBAL_PROMPT},
            {"role": "user", "content": bill_input},
        ],
        temperature=0,
    )

    return response.output_text.strip()
