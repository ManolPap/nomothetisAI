"""LLM-based βήματα για το Πεδίο 6 (step1, step3, step5, step6)."""

import re
from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

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
from app.features.field_6.schemas import FactItem, FactsPayload

# -------------------------------------------------------
# Structured facts (βήμα 5)
# -------------------------------------------------------


class _FactRow(BaseModel):
    subject: str = Field(
        default="",
        description="Χώρα/λίστα, όργανο ΕΕ ή διεθνής οργανισμός — κείμενο στα ελληνικά",
    )
    instrument: str = Field(
        default="",
        description="Νόμος, οδηγία, τίτλος — κείμενο στα ελληνικά",
    )
    finding: str = Field(
        default="",
        description="Εύρημα όπως στην πηγή — διατύπωση στα ελληνικά",
    )
    source_url: str = Field(default="", description="URL (ως έχει)")
    source_title: str | None = Field(
        default=None,
        description="Τίτλος πηγής στα ελληνικά αν χρειάζεται μετάφραση",
    )


class _FactsExtractionOut(BaseModel):
    i: list[_FactRow] = Field(default_factory=list)
    ii: list[_FactRow] = Field(default_factory=list)
    iii: list[_FactRow] = Field(default_factory=list)


def _row_nonempty(row: _FactRow) -> bool:
    return bool(
        (row.subject or "").strip()
        or (row.instrument or "").strip()
        or (row.finding or "").strip()
        or (row.source_url or "").strip()
    )


def _build_facts_payload(raw: _FactsExtractionOut) -> FactsPayload:
    def pack(cat: Literal["i", "ii", "iii"], rows: list[_FactRow]) -> list[FactItem]:
        out: list[FactItem] = []
        n = 0
        for row in rows:
            if not _row_nonempty(row):
                continue
            out.append(
                FactItem(
                    id=f"{cat}-{n}",
                    category=cat,
                    subject=(row.subject or "").strip(),
                    instrument=(row.instrument or "").strip(),
                    finding=(row.finding or "").strip(),
                    source_url=(row.source_url or "").strip(),
                    source_title=(row.source_title or "").strip() or None,
                ),
            )
            n += 1
        return out

    return FactsPayload(i=pack("i", raw.i), ii=pack("ii", raw.ii), iii=pack("iii", raw.iii))


def facts_payload_to_text(facts: FactsPayload) -> str:
    """Ίδια λογική με την παλιά γραμμική μορφή για Eurostat και σύνθεση."""

    def lines_for(cat_label: str, prefix: str, items: list[FactItem]) -> list[str]:
        block = [cat_label]
        if items:
            for it in items:
                block.append(
                    f"{prefix}: {it.subject} | {it.instrument} | {it.finding} | {it.source_url}",
                )
        else:
            block.append(f"{prefix}: -")
        return block

    parts: list[str] = []
    parts.extend(lines_for("ΚΑΤΗΓΟΡΙΑ_i (Χώρες ΕΕ/ΟΟΣΑ):", "FACT_i", facts.i))
    parts.append("")
    parts.extend(lines_for("ΚΑΤΗΓΟΡΙΑ_ii (Όργανα ΕΕ):", "FACT_ii", facts.ii))
    parts.append("")
    parts.extend(lines_for("ΚΑΤΗΓΟΡΙΑ_iii (Διεθνείς Οργανισμοί):", "FACT_iii", facts.iii))
    return "\n".join(parts)


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


_METADATA_FIELD_KEYS = ("ΘΕΜΑ", "ΜΕΤΡΑ", "ΥΠΟΥΡΓΕΙΟ", "ΤΟΜΕΑΣ", "ΟΔΗΓΙΑ")
_METADATA_KEY_LINE_RE = re.compile("^(" + "|".join(_METADATA_FIELD_KEYS) + r")\s*:\s*(.*)$")


def parse_extraction_fields(text: str) -> dict:
    """Κάνει parse το structured output του Βήματος 1."""
    fields: dict[str, str] = {}
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        raw = lines[i].strip()
        m = _METADATA_KEY_LINE_RE.match(raw)
        if not m:
            i += 1
            continue
        key = m.group(1)
        rest = m.group(2).strip().strip('"').strip("'")
        if key == "ΜΕΤΡΑ":
            chunks: list[str] = []
            if rest:
                chunks.append(rest)
            i += 1
            while i < len(lines):
                nxt = lines[i].rstrip()
                if _METADATA_KEY_LINE_RE.match(nxt.strip()):
                    break
                chunks.append(nxt)
                i += 1
            fields[key] = "\n".join(chunks).strip()
        else:
            fields[key] = rest
            i += 1

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
    Παράγει 3 queries για Tavily (υποπεδία ii, iii και πρόσφατες εξελίξεις):
    Query 1: Όργανα ΕΕ — Οδηγίες, εκθέσεις
    Query 2: Διεθνείς οργανισμοί με αξιολογήσεις
    Query 3: Πρόσφατες εξελίξεις 2024-2025
    """
    print("\n" + "=" * 60)
    print("ΒΗΜΑ 3: Παραγωγή 3 search queries (Gemini Flash Lite)")
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
    ][:3]

    labels = [
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
) -> tuple[FactsPayload, str]:
    """
    Εξάγει συγκεκριμένα, επαληθεύσιμα facts από κάθε πηγή.
    Οργανώνει τα facts ανά υποπεδίο (i, ii, iii).
    Αν υπάρχουν NIM δεδομένα από EUR-Lex, τα προσθέτει στο i).
    Επιστρέφει (FactsPayload, facts_text) όπου facts_text είναι η legacy μορφή για downstream.
    """
    from app.features.field_6.services.web_search import fetch_full_content

    print("\n" + "=" * 60)
    print("ΒΗΜΑ 5: Εξαγωγή facts από πηγές (Gemini Flash Lite, structured)")
    print("=" * 60)

    lines: list[str] = []
    for i, r in enumerate(search_results, 1):
        lines.append(f"Πηγή {i}: {r['title']}")
        lines.append(f"URL: {r['url']}")

        url = r.get("url") or ""
        if "knowledge.dlapiper.com" in url:
            lines.append(f"Περιεχόμενο: {(r.get('content') or '')[:6000]}")
        elif "littler.com" in url:
            full_content = fetch_full_content(url, max_chars=6000)
            if full_content:
                lines.append(f"Περιεχόμενο (πλήρες): {full_content[:6000]}")
                print(f"  [Πηγή {i}] Fetch πλήρους περιεχομένου: {len(full_content)} χαρ.")
            else:
                lines.append(f"Περιεχόμενο: {(r.get('content') or '')[:1500]}")
        else:
            lines.append(f"Περιεχόμενο: {(r.get('content') or '')[:1500]}")
        lines.append("")

    search_context = "\n".join(lines) if lines else "Δεν βρέθηκαν αποτελέσματα."

    nim_context = ""
    if nim_text:
        nim_context = (
            "\nΕΠΙΠΛΕΟΝ ΔΕΔΟΜΕΝΑ ΑΠΟ EUR-LEX (National Implementation Measures):\n"
            f"{nim_text}\n"
            "Αυτά τα δεδομένα αφορούν ΑΠΟΚΛΕΙΣΤΙΚΑ το υποπεδίο i) (Χώρες ΕΕ/ΟΟΣΑ).\n"
        )

    messages = [
        SystemMessage(content=FACTS_SYSTEM),
        HumanMessage(content=FACTS_HUMAN_TEMPLATE.format(
            topic=metadata["topic"],
            measures=metadata["measures"],
            nim_context=nim_context,
            search_context=search_context,
        )),
    ]

    try:
        structured_llm = get_llm_fast().with_structured_output(_FactsExtractionOut)
        parsed = structured_llm.invoke(messages)
        if not isinstance(parsed, _FactsExtractionOut):
            raise TypeError(f"Unexpected structured output type: {type(parsed)}")
        facts = _build_facts_payload(parsed)
    except Exception as exc:
        print(f"⚠️ Structured facts extraction απέτυχε ({exc!r}) — κενό αποτέλεσμα.")
        facts = FactsPayload()

    facts_text = facts_payload_to_text(facts)

    print("Facts που εξήχθησαν (structured):")
    print("-" * 40)
    print(facts_text)
    print("-" * 40)

    return facts, facts_text


# -------------------------------------------------------
# Βήμα 6: Σύνθεση Πεδίου 6
# -------------------------------------------------------


def _strip_synthesis_fact_markers_from_output(text: str) -> str:
    """Αφαιρεί ετικέτες FACT_* και URLs από το σύνθετο κείμενο."""
    text = re.sub(r"\s*\(FACT_iii\)\s*", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*\(FACT_ii\)\s*", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*\(FACT_i\)\s*", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*FACT_iii\s*", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*FACT_ii\s*", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*FACT_i\s*", " ", text, flags=re.IGNORECASE)
    # (https://...) / (http://...)
    text = re.sub(r"\(\s*https?://[^)]+\)", " ", text, flags=re.IGNORECASE)
    # γυμνά https://... ή http://... (μέχρι κενό, ), ή ])
    text = re.sub(r"https?://[^\s)\]]+", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"  +", " ", text)
    return text.strip()


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

    messages = [
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
    ]
    try:
        response = get_llm_synthesis().invoke(messages)
    except Exception as e:
        print(f"⚠️ Fallback σε Flash Lite για σύνθεση (σφάλμα: {e})")
        response = get_llm_fast().invoke(messages)

    text = _strip_synthesis_fact_markers_from_output(extract_llm_content(response))
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
