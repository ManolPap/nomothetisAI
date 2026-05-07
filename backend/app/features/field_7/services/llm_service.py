"""LLM service για το Πεδίο 7 — 3-call SDG classification (μειωμένο context).

Call 1: step1_extract_metadata του field_6 → σύντομο summary (topic/measures/sector).
Call 2: στέλνει μόνο τους 17 τίτλους + summary → λίστα IDs.
Call 3: στέλνει μόνο τους υποστόχους των επιλεγμένων SDGs + summary → JSON με reasoning.
"""

import json
import re
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.features.field_6.prompt import METADATA_HUMAN_TEMPLATE, METADATA_SYSTEM
from app.features.field_6.services.llm_service import (
    parse_extraction_fields,
    step1_extract_metadata,
)
from app.features.field_7.config import get_llm_fallback, get_llm_fast
from app.features.field_7.prompt import (
    SELECT_SDG_SYSTEM,
    SUBTARGETS_SYSTEM,
    build_select_sdg_human,
    build_subtargets_human,
)
from app.features.field_7.schemas import (
    ClassifyRequest,
    ClassifyResponse,
    SDGMatch,
    SubtargetMatch,
)
from app.features.field_7.sdg_data import SDG_DATA

# Fallback όριο όταν αποτυγχάνει το step1_extract_metadata.
LAW_TEXT_FALLBACK_LIMIT = 500


def extract_llm_content(response: Any) -> str:
    """Εξάγει κείμενο από LLM response (ίδιο pattern με field_6)."""
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


def _strip_json_fences(text: str) -> str:
    """
    Αφαιρεί τυχόν markdown code fences (```json ... ```) ή εξωτερικό κείμενο
    γύρω από το JSON array, για robust parsing.
    """
    cleaned = text.strip()

    fenced = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL | re.IGNORECASE)
    if fenced:
        cleaned = fenced.group(1).strip()

    first = cleaned.find("[")
    last = cleaned.rfind("]")
    if first != -1 and last != -1 and last > first:
        cleaned = cleaned[first : last + 1]

    return cleaned.strip()


def _enrich_with_titles(parsed: list[dict]) -> list[SDGMatch]:
    """
    Εμπλουτίζει το LLM output με τους επίσημους τίτλους από το SDG_DATA.
    Φιλτράρει IDs / codes που δεν υπάρχουν στο dict.
    """
    matches: list[SDGMatch] = []

    for item in parsed:
        if not isinstance(item, dict):
            continue

        sdg_id = item.get("sdg_id")
        if not isinstance(sdg_id, int):
            continue

        sdg = SDG_DATA.get(sdg_id)
        if not sdg:
            print(f"  ⚠️  Άγνωστο SDG id από LLM: {sdg_id} — αγνοείται")
            continue

        raw_subtargets = item.get("subtargets") or []
        enriched_subtargets: list[SubtargetMatch] = []

        for sub in raw_subtargets:
            if not isinstance(sub, dict):
                continue
            code = sub.get("code")
            reasoning = sub.get("reasoning") or ""
            if not isinstance(code, str) or not isinstance(reasoning, str):
                continue

            title = sdg["subtargets"].get(code)
            if not title:
                print(f"  ⚠️  Άγνωστος κωδικός υποστόχου από LLM: {code} — αγνοείται")
                continue

            enriched_subtargets.append(
                SubtargetMatch(code=code, title=title, reasoning=reasoning.strip()),
            )

        if not enriched_subtargets:
            continue

        matches.append(
            SDGMatch(
                sdg_id=sdg_id,
                sdg_title=sdg["title"],
                subtargets=enriched_subtargets,
            ),
        )

    return matches


def _is_rate_limit_error(e: Exception) -> bool:
    """Heuristic ανίχνευση 429 (resource exhausted) ή 503 (service unavailable)."""
    msg = str(e).lower()
    return any(
        token in msg
        for token in (
            "429",
            "503",
            "resourceexhausted",
            "resource_exhausted",
            "service unavailable",
            "serviceunavailable",
            "quota",
            "rate limit",
        )
    )


def _invoke_with_rate_limit_fallback(system_content: str, human_content: str) -> Any:
    """
    Πρώτα δοκιμάζει get_llm_fast(). Αν πετύχει 429/503, κάνει retry με
    get_llm_fallback() (Gemini 2.5 Flash). Άλλα exceptions πετιούνται ως έχουν.
    """
    messages = [
        SystemMessage(content=system_content),
        HumanMessage(content=human_content),
    ]
    try:
        return get_llm_fast().invoke(messages)
    except Exception as e:
        if not _is_rate_limit_error(e):
            raise
        print(f"⚠️  Fallback σε Gemini 2.5 Flash (rate limit Flash Lite): {e}")
        return get_llm_fallback().invoke(messages)


def _call1_extract_summary(law_text: str) -> str:
    """
    Call 1: Καλεί το step1_extract_metadata του field_6 για να εξάγει
    topic / measures / sector. Συνθέτει σύντομο summary (~200 χαρ.) που
    χρησιμοποιείται ως input στα Calls 2 & 3 αντί για ολόκληρο το law_text.

    Πρώτα δοκιμάζει step1 (που εσωτερικά χρησιμοποιεί Flash Lite). Σε rate
    limit (429/503), κάνει retry απευθείας με get_llm_fallback() χρησιμοποιώντας
    το ίδιο prompt/parser του field_6. Σε άλλη αποτυχία, fallback σε law_text[:500].
    """
    print("\n--- ΚΛΗΣΗ 1: Εξαγωγή metadata νόμου (reuse field_6.step1) ---")

    metadata: dict | None = None
    try:
        metadata = step1_extract_metadata(law_text)
    except Exception as e:
        if _is_rate_limit_error(e):
            print(f"⚠️  Fallback σε Gemini 2.5 Flash (rate limit Flash Lite): {e}")
            try:
                response = get_llm_fallback().invoke([
                    SystemMessage(content=METADATA_SYSTEM),
                    HumanMessage(content=METADATA_HUMAN_TEMPLATE.format(
                        law_structured=law_text,
                    )),
                ])
                metadata = parse_extraction_fields(extract_llm_content(response))
            except Exception as e2:
                print(f"⚠️  Fallback μοντέλο επίσης απέτυχε: {e2}")
        else:
            print(f"⚠️  step1_extract_metadata απέτυχε: {e}")

    if metadata is None:
        fallback = law_text[:LAW_TEXT_FALLBACK_LIMIT]
        print(f"  → fallback: law_text[:{LAW_TEXT_FALLBACK_LIMIT}] ({len(fallback)} χαρ.)")
        return fallback

    topic = metadata.get("topic") or "—"
    measures = metadata.get("measures") or "—"
    sector = metadata.get("sector") or "—"
    summary = f"{topic}. Μέτρα: {measures}. Τομέας: {sector}"
    print(f"✓ Summary ({len(summary)} χαρ.): {summary}")
    return summary


def _call2_select_sdgs(summary: str) -> list[int]:
    """
    Call 2: Στέλνει μόνο τους 17 τίτλους + σύντομο summary, παίρνει JSON array
    με IDs SDGs που σχετίζονται. Φιλτράρει IDs εκτός 1-17.
    """
    print("\n--- ΚΛΗΣΗ 2: Επιλογή SDGs (μόνο τίτλοι) ---")

    response = _invoke_with_rate_limit_fallback(
        SELECT_SDG_SYSTEM,
        build_select_sdg_human(summary),
    )

    raw_text = extract_llm_content(response)
    print(f"Raw LLM απάντηση Call 2 ({len(raw_text)} χαρ.):")
    print("-" * 40)
    print(raw_text[:500])
    print("-" * 40)

    cleaned = _strip_json_fences(raw_text)
    parsed = json.loads(cleaned)

    if not isinstance(parsed, list):
        raise ValueError(f"Αναμενόμενη λίστα IDs, βρέθηκε: {type(parsed).__name__}")

    valid_ids: list[int] = []
    for item in parsed:
        if isinstance(item, int) and item in SDG_DATA:
            valid_ids.append(item)
        else:
            print(f"  ⚠️  Άγνωστο SDG id: {item} — αγνοείται")

    print(f"✓ Επιλεγμένα SDGs: {valid_ids}")
    return valid_ids


def _call3_find_subtargets(summary: str, sdg_ids: list[int]) -> list[dict]:
    """
    Call 3: Στέλνει μόνο τους υποστόχους των επιλεγμένων SDGs + σύντομο summary,
    παίρνει JSON array με {sdg_id, subtargets: [{code, reasoning}]}.
    """
    print(f"\n--- ΚΛΗΣΗ 3: Εύρεση υποστόχων για SDGs {sdg_ids} ---")

    response = _invoke_with_rate_limit_fallback(
        SUBTARGETS_SYSTEM,
        build_subtargets_human(summary, sdg_ids),
    )

    raw_text = extract_llm_content(response)
    print(f"Raw LLM απάντηση Call 3 ({len(raw_text)} χαρ.):")
    print("-" * 40)
    print(raw_text[:1500])
    print("-" * 40)

    cleaned = _strip_json_fences(raw_text)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        if "Extra data" not in str(e):
            raise
        # Το LLM έβγαλε πολλαπλά objects χωρίς array wrapper, π.χ.
        # {"sdg_id": 8, ...}\n{"sdg_id": 10, ...} — προσπαθούμε regex extraction
        # απευθείας πάνω στο raw_text (όχι στο cleaned, γιατί το strip θα έχει
        # ήδη αποκόψει στρεβλά μεταξύ πρώτου [ και τελευταίου ]).
        print(f"  ⚠️  JSON 'Extra data' — δοκιμάζω regex extraction πολλαπλών objects: {e}")
        object_matches = re.findall(r"\{(?:[^{}]|\{[^{}]*\})*\}", raw_text)
        parsed = []
        for raw_obj in object_matches:
            try:
                parsed.append(json.loads(raw_obj))
            except json.JSONDecodeError as e2:
                print(f"  ⚠️  Παρέλειψα invalid object: {e2}")
        print(f"  ✓ Ανακτήθηκαν {len(parsed)} objects από {len(object_matches)} regex matches")

    if not isinstance(parsed, list):
        raise ValueError(f"Αναμενόμενη λίστα, βρέθηκε: {type(parsed).__name__}")

    return parsed


def classify_law(request: ClassifyRequest) -> ClassifyResponse:
    """
    Τρεις διαδοχικές κλήσεις στον Gemini Flash Lite με ελάχιστο context:

    1. Call 1 → step1_extract_metadata του field_6 → σύντομο summary (~200 χαρ.).
    2. Call 2 → λίστα IDs σχετιζόμενων SDGs (input: 17 τίτλοι + summary).
    3. Call 3 → υποστόχοι + reasoning (input: μόνο υποστόχοι των επιλεγμένων + summary).

    Αν το Call 2 επιστρέψει empty list, παραλείπει το Call 3.
    Σε αποτυχία του Call 1, fallback σε law_text[:500] και συνεχίζει.
    Σε αποτυχία Calls 2/3, επιστρέφει empty matches + error message.
    """
    print("\n" + "=" * 60)
    print("ΠΕΔΙΟ 7: 3-call αντιστοίχιση νόμου με SDGs (Gemini Flash Lite)")
    print("=" * 60)
    print(f"Συνολικό μήκος κειμένου: {len(request.law_text)} χαρακτήρες")

    # ---------- Call 1: Extract metadata → summary ----------
    summary = _call1_extract_summary(request.law_text)

    # ---------- Call 2: Select SDGs ----------
    try:
        selected_ids = _call2_select_sdgs(summary)
    except json.JSONDecodeError as e:
        print(f"⚠️  Call 2 JSON parsing απέτυχε: {e}")
        return ClassifyResponse(matches=[], error=f"Invalid JSON from LLM (call 2): {e}")
    except Exception as e:
        print(f"⚠️  Call 2 απέτυχε: {e}")
        return ClassifyResponse(matches=[], error=f"LLM call 2 failed: {e}")

    if not selected_ids:
        print("✓ Δεν επιλέχθηκαν SDGs — επιστρέφω empty matches χωρίς Call 3")
        return ClassifyResponse(matches=[], error=None)

    # ---------- Call 3: Find subtargets ----------
    try:
        raw_matches = _call3_find_subtargets(summary, selected_ids)
    except json.JSONDecodeError as e:
        print(f"⚠️  Call 3 JSON parsing απέτυχε: {e}")
        return ClassifyResponse(matches=[], error=f"Invalid JSON from LLM (call 3): {e}")
    except Exception as e:
        print(f"⚠️  Call 3 απέτυχε: {e}")
        return ClassifyResponse(matches=[], error=f"LLM call 3 failed: {e}")

    matches = _enrich_with_titles(raw_matches)

    print(f"\n✓ Τελικά: {len(matches)} SDGs με συνολικά "
          f"{sum(len(m.subtargets) for m in matches)} υποστόχους:")
    for match in matches:
        print(f"  SDG {match.sdg_id} ({match.sdg_title}): "
              f"{', '.join(s.code for s in match.subtargets)}")

    return ClassifyResponse(matches=matches, error=None)
