"""LLM-based βήματα για το Πεδίο 6 (step1, step3, step5, step6)."""

from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.features.field_6.config import get_llm_fast, get_llm_synthesis
from app.features.field_6.prompt import (
    FACTS_HUMAN_TEMPLATE,
    FACTS_SYSTEM,
    METADATA_HUMAN_TEMPLATE,
    METADATA_SYSTEM,
    QUERIES_HUMAN_TEMPLATE,
    QUERIES_SYSTEM,
    SYNTHESIS_SYSTEM,
    build_synthesis_human,
)

# -------------------------------------------------------
# Helpers
# -------------------------------------------------------

def extract_llm_content(response: Any) -> str:
    """Εξάγει κείμενο από LLM response."""
    content = response.content
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(
            block.get("text", "")
            for block in content
            if isinstance(block, dict)
        )
    return str(content)


def parse_extraction_fields(text: str) -> dict:
    """Κάνει parse το structured output του Βήματος 1."""
    fields: dict[str, str] = {}
    for line in text.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        clean_key = key.strip().upper()
        clean_value = value.strip().strip('"').strip("'")
        fields[clean_key] = clean_value

    return {
        "topic": fields.get("ΘΕΜΑ", "Μη διαθέσιμο"),
        "ministry": fields.get("ΥΠΟΥΡΓΕΙΟ", "Μη διαθέσιμο"),
        "sector": fields.get("ΤΟΜΕΑΣ", "Μη διαθέσιμο"),
        "measures": fields.get("ΜΕΤΡΑ", ""),
        "directive": fields.get("ΟΔΗΓΙΑ", ""),
    }


# -------------------------------------------------------
# Βήμα 1: Εξαγωγή μεταδεδομένων νόμου
# -------------------------------------------------------

def step1_extract_metadata(law_structured: str) -> dict:
    """Εξάγει θέμα, μέτρα, υπουργείο, τομέα, Οδηγία."""
    print("\n" + "=" * 60)
    print("ΒΗΜΑ 1: Εξαγωγή μεταδεδομένων νόμου (Gemini Flash Lite)")
    print("=" * 60)

    response = get_llm_fast().invoke([
        SystemMessage(content=METADATA_SYSTEM),
        HumanMessage(content=METADATA_HUMAN_TEMPLATE.format(
            law_structured=law_structured,
        )),
    ])

    text = extract_llm_content(response)
    print(text)

    parsed = parse_extraction_fields(text)
    print(f"\nΘέμα: {parsed['topic']}")
    print(f"Μέτρα: {parsed['measures']}")
    print(f"Υπουργείο: {parsed['ministry']}")
    print(f"Τομέας: {parsed['sector']}")
    print(f"Οδηγία: {parsed['directive']}")

    return parsed


# -------------------------------------------------------
# Βήμα 3: Παραγωγή search queries
# -------------------------------------------------------

def step3_generate_queries(metadata: dict) -> list[str]:
    """
    Παράγει 5 queries αντίστοιχα με τη δομή του πεδίου 6:
    Query 1: Γενική αναζήτηση θέματος
    Query 2: Πρακτικές χωρών ΕΕ/ΟΟΣΑ (υποπεδίο i)
    Query 3: Όργανα ΕΕ — Οδηγίες, εκθέσεις (υποπεδίο ii)
    Query 4: Διεθνείς οργανισμοί με αξιολογήσεις (υποπεδίο iii)
    Query 5: Πρόσφατες εξελίξεις 2024-2025
    """
    print("\n" + "=" * 60)
    print("ΒΗΜΑ 3: Παραγωγή 5 search queries (Gemini Flash Lite)")
    print("=" * 60)

    directive_info = (
        f"Ο νόμος ενσωματώνει την Οδηγία {metadata['directive']}."
        if metadata["directive"] and metadata["directive"] != "-"
        else "Ο νόμος δεν ενσωματώνει συγκεκριμένη Οδηγία ΕΕ."
    )

    response = get_llm_fast().invoke([
        SystemMessage(content=QUERIES_SYSTEM),
        HumanMessage(content=QUERIES_HUMAN_TEMPLATE.format(
            topic=metadata["topic"],
            measures=metadata["measures"],
            sector=metadata["sector"],
            directive_info=directive_info,
        )),
    ])

    text = extract_llm_content(response)
    queries = [
        q.strip()
        for q in text.strip().split("\n")
        if q.strip() and len(q.strip()) > 10
    ][:5]

    labels = [
        "Γενική αναζήτηση",
        "Πρακτικές χωρών ΕΕ/ΟΟΣΑ",
        "Όργανα ΕΕ",
        "Διεθνείς οργανισμοί",
        "Πρόσφατες εξελίξεις 2024-2025",
    ]

    print("Queries:")
    for i, (q, label) in enumerate(zip(queries, labels, strict=False), 1):
        print(f"  [{i}] {label}: {q}")

    return queries


# -------------------------------------------------------
# Βήμα 5: Εξαγωγή facts από πηγές
# -------------------------------------------------------

def step5_extract_facts(
    metadata: dict,
    search_results: list[dict],
    nim_text: str,
) -> str:
    """
    Εξάγει συγκεκριμένα, επαληθεύσιμα facts από κάθε πηγή.
    Οργανώνει τα facts ανά υποπεδίο (i, ii, iii).
    Αν υπάρχουν NIM δεδομένα από EUR-Lex, τα προσθέτει στο i).
    """
    from app.features.field_6.services.web_search import fetch_full_content

    print("\n" + "=" * 60)
    print("ΒΗΜΑ 5: Εξαγωγή facts από πηγές (Gemini Flash Lite)")
    print("=" * 60)

    lines: list[str] = []
    for i, r in enumerate(search_results, 1):
        lines.append(f"Πηγή {i}: {r['title']}")
        lines.append(f"URL: {r['url']}")

        if i <= 3:
            full_content = fetch_full_content(r["url"])
            if full_content and len(full_content) > len(r["content"]):
                lines.append(f"Περιεχόμενο (πλήρες): {full_content[:3000]}")
                print(f"  [Πηγή {i}] Fetch πλήρους περιεχομένου: {len(full_content)} χαρ.")
            else:
                lines.append(f"Περιεχόμενο: {r['content'][:1500]}")
        else:
            lines.append(f"Περιεχόμενο: {r['content'][:1500]}")
        lines.append("")

    search_context = "\n".join(lines) if lines else "Δεν βρέθηκαν αποτελέσματα."

    nim_context = ""
    if nim_text:
        nim_context = (
            "\nΕΠΙΠΛΕΟΝ ΔΕΔΟΜΕΝΑ ΑΠΟ EUR-LEX (National Implementation Measures):\n"
            f"{nim_text}\n"
            "Αυτά τα δεδομένα αφορούν ΑΠΟΚΛΕΙΣΤΙΚΑ το υποπεδίο i) (Χώρες ΕΕ/ΟΟΣΑ).\n"
        )

    response = get_llm_fast().invoke([
        SystemMessage(content=FACTS_SYSTEM),
        HumanMessage(content=FACTS_HUMAN_TEMPLATE.format(
            topic=metadata["topic"],
            measures=metadata["measures"],
            nim_context=nim_context,
            search_context=search_context,
        )),
    ])

    facts_text = extract_llm_content(response)

    print("Facts που εξήχθησαν:")
    print("-" * 40)
    print(facts_text)
    print("-" * 40)

    return facts_text


# -------------------------------------------------------
# Βήμα 6: Σύνθεση Πεδίου 6
# -------------------------------------------------------

def step6_synthesize_field6(
    metadata: dict,
    facts_text: str,
    eurostat_text: str = "",
    selected_sources: list[dict] | None = None,
) -> str:
    """
    Συνθέτει το κείμενο του Πεδίου 6 με few-shot examples
    από πραγματικά πεδία 6 της Βουλής.
    """
    print("\n" + "=" * 60)
    print("ΒΗΜΑ 6: Σύνθεση Πεδίου 6 (Gemini 2.5 Flash)")
    print("=" * 60)

    response = get_llm_synthesis().invoke([
        SystemMessage(content=SYNTHESIS_SYSTEM),
        HumanMessage(content=build_synthesis_human(
            topic=metadata["topic"],
            measures=metadata["measures"],
            sector=metadata["sector"],
            ministry=metadata["ministry"],
            facts_text=facts_text,
            eurostat_text=eurostat_text,
            selected_sources=selected_sources,
        )),
    ])

    text = extract_llm_content(response)
    word_count = len(text.split())

    print(f"\nΚείμενο Πεδίου 6 ({word_count} λέξεις):")
    print("-" * 40)
    print(text)
    print("-" * 40)

    if word_count > 250:
        print(f"⚠️  Υπερβαίνει το όριο των 250 λέξεων ({word_count})")
    else:
        print(f"✓ Εντός ορίου ({word_count}/250 λέξεις)")

    return text
