"""Web search βήματα για το Πεδίο 6 (step2 EUR-Lex, step4 Tavily, step5b Eurostat)."""

import re
import unicodedata

import requests  # type: ignore[import-untyped]
from langchain_core.messages import HumanMessage, SystemMessage

from app.features.field_6.config import (
    EUROSTAT_CATALOG,
    TRUSTED_DOMAINS,
    get_llm_fast,
    get_tavily,
)
from app.features.field_6.prompt import (
    EUROSTAT_DATASET_HUMAN_TEMPLATE,
    EUROSTAT_DATASET_SYSTEM,
)
from app.features.field_6.services.llm_service import extract_llm_content

# -------------------------------------------------------
# Helpers
# -------------------------------------------------------

def deduplicate_results(results: list[dict]) -> list[dict]:
    """Αφαιρεί διπλότυπα αποτελέσματα βάσει URL."""
    seen_urls: set[str] = set()
    unique = []
    for r in results:
        if r["url"] not in seen_urls:
            seen_urls.add(r["url"])
            unique.append(r)
    return unique


def build_search_context(results: list) -> str:
    """Μετατρέπει τα Tavily results σε context για το LLM."""
    if not results:
        return "Δεν βρέθηκαν αποτελέσματα αναζήτησης."

    lines = []
    for i, r in enumerate(results, 1):
        lines.append(f"Πηγή {i}: {r['title']}")
        lines.append(f"URL: {r['url']}")
        lines.append(f"Περιεχόμενο: {r['content'][:800]}")
        lines.append("")

    return "\n".join(lines)


def fetch_full_content(url: str, max_chars: int = 3000) -> str:
    """
    Κάνει fetch το πλήρες περιεχόμενο μιας σελίδας.
    Χρησιμοποιείται για τις πιο σχετικές πηγές για πλουσιότερο context.
    """
    try:
        response = requests.get(
            url,
            timeout=10,
            headers={"User-Agent": "Mozilla/5.0 (compatible; research bot)"},
        )
        response.raise_for_status()
        text = re.sub(r"<[^>]+>", " ", response.text)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:max_chars]
    except Exception:
        return ""


# -------------------------------------------------------
# Βήμα 2: EUR-Lex SPARQL για National Implementation Measures
# -------------------------------------------------------

def fetch_eurlex_nim_fallback(dir_number: str) -> str:
    """
    Fallback αν το SPARQL αποτύχει:
    Επιστρέφει το URL του EUR-Lex NIM ως πηγή.
    """
    try:
        year, number = dir_number.split("/")
        celex = f"3{year}L{number.zfill(4)}"
        url = (
            f"https://eur-lex.europa.eu/search.html"
            f"?type=named&named=NIM&CELEX_IMPL={celex}"
        )
        return (
            f"Τα εθνικά μέτρα εφαρμογής (National Implementation Measures) "
            f"της Οδηγίας {dir_number} από τα κράτη-μέλη της ΕΕ "
            f"είναι καταχωρισμένα στο EUR-Lex. "
            f"(Πηγή: EUR-Lex NIM, {url})"
        )
    except Exception as e:
        print(f"  EUR-Lex fallback σφάλμα: {e}")
        return ""


def fetch_eurlex_nim(directive_number: str) -> str:
    """
    Κάνει query στο EUR-Lex SPARQL endpoint για να βρει
    ποιες χώρες ενσωμάτωσαν μια συγκεκριμένη Οδηγία ΕΕ.
    """
    match = re.search(r"(\d{4}/\d+)", directive_number)
    if not match:
        return ""

    dir_number = match.group(1)
    year, number = dir_number.split("/")
    celex = f"3{year}L{number.zfill(4)}"

    print(f"  Αναζήτηση NIM για Οδηγία {dir_number} (CELEX: {celex})...")

    sparql_query = f"""
    PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

    SELECT DISTINCT ?country
    WHERE {{
      ?directive cdm:resource_legal_id_celex "{celex}" .
      ?nim cdm:measure_implements_resource_legal ?directive .
      ?nim cdm:measure_implementing_country ?countryUri .
      ?countryUri skos:prefLabel ?country .
      FILTER(LANG(?country) = "en")
    }}
    LIMIT 50
    """

    try:
        response = requests.post(
            "https://publications.europa.eu/webapi/rdf/sparql",
            data={
                "query": sparql_query,
                "format": "application/sparql-results+json",
            },
            headers={"Accept": "application/sparql-results+json"},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        bindings = data.get("results", {}).get("bindings", [])

        if not bindings:
            print("  SPARQL: 0 αποτελέσματα, δοκιμάζω fallback...")
            return fetch_eurlex_nim_fallback(dir_number)

        countries = sorted({
            b["country"]["value"]
            for b in bindings
            if "country" in b
        })

        if not countries:
            return fetch_eurlex_nim_fallback(dir_number)

        print(f"  SPARQL: βρέθηκαν {len(countries)} χώρες")
        return (
            f"Σύμφωνα με το EUR-Lex, η Οδηγία {dir_number} "
            f"έχει ενσωματωθεί στο εθνικό δίκαιο των εξής κρατών-μελών: "
            f"{', '.join(countries)}. "
            f"(Πηγή: EUR-Lex National Implementation Measures, "
            f"https://eur-lex.europa.eu/search.html?type=named&named=NIM"
            f"&CELEX_IMPL={celex})"
        )

    except Exception as e:
        print(f"  EUR-Lex SPARQL σφάλμα: {e}")
        return fetch_eurlex_nim_fallback(dir_number)


def step2_eurlex_nim(metadata: dict) -> str:
    """
    Αν ο νόμος ενσωματώνει Οδηγία ΕΕ, κάνει query στο EUR-Lex
    για να βρει ποιες χώρες την ενσωμάτωσαν.
    """
    print("\n" + "=" * 60)
    print("ΒΗΜΑ 2: EUR-Lex NIM (National Implementation Measures)")
    print("=" * 60)

    directive = metadata.get("directive", "-")

    if not directive or directive == "-":
        print("  Ο νόμος δεν ενσωματώνει Οδηγία ΕΕ — παράλειψη βήματος")
        return ""

    print(f"  Οδηγία: {directive}")
    nim_text = fetch_eurlex_nim(directive)

    if nim_text:
        print("  ✓ Βρέθηκαν NIM δεδομένα")
        print(f"  {nim_text[:200]}...")
    else:
        print("  ✗ Δεν βρέθηκαν NIM δεδομένα")

    return nim_text


# -------------------------------------------------------
# Βήμα 4: Web Search με Tavily
# -------------------------------------------------------

def step4_web_search(queries: list[str]) -> list[dict]:
    """
    Εκτελεί αναζήτηση με ελαστικό domain filtering.
    3 αποτελέσματα ανά query · fallback χωρίς domain filter αν χρειαστεί.
    """
    print("\n" + "=" * 60)
    print("ΒΗΜΑ 4: Αναζήτηση διεθνών πρακτικών (Tavily)")
    print("=" * 60)

    all_results: list[dict] = []

    for i, query in enumerate(queries, 1):
        print(f"[{i}] Ψάχνω: {query}")
        try:
            response = get_tavily().search(
                query=query,
                max_results=3,
                search_depth="advanced",
                include_domains=TRUSTED_DOMAINS,
            )
            results = response.get("results", [])

            if not results:
                print("  → 0 αποτελέσματα με domain filter, δοκιμάζω χωρίς...")
                response = get_tavily().search(
                    query=query,
                    max_results=3,
                    search_depth="advanced",
                )
                results = response.get("results", [])

            all_results.extend(results)
            print(f"  → {len(results)} αποτελέσματα")

        except Exception as e:
            print(f"  → Σφάλμα Tavily: {e}")

    unique_results = deduplicate_results(all_results)
    print(
        f"\nΣύνολο: {len(all_results)} αποτελέσματα "
        f"→ {len(unique_results)} μοναδικές πηγές"
    )
    for i, r in enumerate(unique_results, 1):
        print(f"  [{i}] {r['title']}")
        print(f"       {r['url']}")

    return unique_results


# -------------------------------------------------------
# Βήμα 5β: Eurostat για χώρες που βρέθηκαν στο web search
# -------------------------------------------------------

def _normalize(s: str) -> str:
    return unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode("ascii")


_COUNTRY_MAP: dict[str, str] = {
    "γερμανί": "DE", "germany": "DE",
    "γαλλί": "FR", "france": "FR",
    "ιταλί": "IT", "italy": "IT",
    "ισπανί": "ES", "spain": "ES",
    "ολλανδί": "NL", "netherlands": "NL",
    "βέλγιο": "BE", "belgium": "BE",
    "σουηδί": "SE", "sweden": "SE",
    "δανί": "DK", "denmark": "DK",
    "φινλανδί": "FI", "finland": "FI",
    "αυστρί": "AT", "austria": "AT",
    "πορτογαλί": "PT", "portugal": "PT",
    "ιρλανδί": "IE", "ireland": "IE",
    "πολωνί": "PL", "poland": "PL",
    "τσεχί": "CZ", "czech": "CZ",
    "ουγγαρί": "HU", "hungary": "HU",
    "εσθονί": "EE", "estonia": "EE",
    "λεττονί": "LV", "latvia": "LV",
    "λιθουανί": "LT", "lithuania": "LT",
    "σλοβενί": "SI", "slovenia": "SI",
    "σλοβακί": "SK", "slovakia": "SK",
    "κροατί": "HR", "croatia": "HR",
    "κύπρο": "CY", "cyprus": "CY",
    "νορβηγί": "NO", "norway": "NO",
    "ελβετί": "CH", "switzerland": "CH",
}


def extract_countries_from_facts(facts_text: str) -> list[str]:
    """
    Εξάγει κωδικούς χωρών από τα facts που βρέθηκαν στο web search.
    """
    facts_normalized = _normalize(facts_text)
    found: list[str] = []
    for keyword, code in _COUNTRY_MAP.items():
        if _normalize(keyword) in facts_normalized and code not in found:
            found.append(code)

    print(f"  Χώρες που βρέθηκαν στα facts: {found}")
    return found[:8]


def select_eurostat_dataset_with_llm(metadata: dict) -> tuple | None:
    """
    Χρησιμοποιεί το LLM για να επιλέξει τον πιο κατάλληλο
    Eurostat dataset από τον εκτενή κατάλογο.
    Επιστρέφει (dataset_id, indicator_name, unit, category, sex) ή None.
    """
    topic = metadata.get("topic", "")
    sector = metadata.get("sector", "")
    measures = metadata.get("measures", "")

    catalog_text = "\n".join([
        f"{i + 1}. {did}: {info[0]} — Σχετικό με: {info[4]}"
        for i, (did, info) in enumerate(EUROSTAT_CATALOG.items())
    ])

    response = get_llm_fast().invoke([
        SystemMessage(content=EUROSTAT_DATASET_SYSTEM),
        HumanMessage(content=EUROSTAT_DATASET_HUMAN_TEMPLATE.format(
            topic=topic,
            sector=sector,
            measures=measures,
            catalog_text=catalog_text,
        )),
    ])

    choice = extract_llm_content(response).strip().split()[0]
    print(f"  LLM επέλεξε dataset: {choice}")

    try:
        idx = int(choice) - 1
        if idx < 0:
            return None
        did = list(EUROSTAT_CATALOG.keys())[idx]
        info = EUROSTAT_CATALOG[did]
        return (did, info[0], info[1], info[2], info[3])
    except Exception:
        return None


def step5b_eurostat_for_countries(metadata: dict, facts_text: str) -> dict:
    """
    Βήμα 5β: Ψάχνει στο Eurostat για δείκτες
    μόνο για τις χώρες που βρέθηκαν στο web search.
    Επιστρέφει dict {country_code: {name, values, indicator, dataset_id, url}}.
    """
    print("\n" + "=" * 60)
    print("ΒΗΜΑ 5β: Eurostat Δείκτες για χώρες web search")
    print("=" * 60)

    countries = extract_countries_from_facts(facts_text)

    if not countries:
        print("  Δεν βρέθηκαν χώρες στα facts — παράλειψη Eurostat")
        return {}

    dataset_info = select_eurostat_dataset_with_llm(metadata)

    if not dataset_info:
        print("  Δεν βρέθηκε κατάλληλος δείκτης Eurostat")
        return {}

    dataset_id, indicator_name, unit, _category, _sex = dataset_info
    print(f"  Dataset: {indicator_name} ({dataset_id})")
    print(f"  Χώρες: {countries}")

    try:
        geo_params = "&".join([f"geo={c}" for c in countries])
        url = (
            f"https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset_id}"
            f"?format=JSON&lang=EN&unit={unit}&time=2022&time=2023&{geo_params}"
        )

        response = requests.get(url, timeout=15, headers={"Accept": "application/json"})
        response.raise_for_status()
        data = response.json()

        values = data.get("value", {})
        dims = data.get("dimension", {})

        geo_index = dims.get("geo", {}).get("category", {}).get("index", {})
        time_index = dims.get("time", {}).get("category", {}).get("index", {})
        geo_labels = dims.get("geo", {}).get("category", {}).get("label", {})

        if not geo_index or not values:
            print("  Eurostat: δεν βρέθηκαν δεδομένα")
            return {}

        time_size = len(time_index)
        results: dict[str, dict] = {}

        for country_code in countries:
            if country_code not in geo_index:
                continue
            geo_pos = geo_index[country_code]
            country_name = geo_labels.get(country_code, country_code)
            country_values: dict[str, float] = {}

            for time_label, time_pos in time_index.items():
                idx = str(geo_pos * time_size + time_pos)
                val = values.get(idx)
                if val is not None:
                    country_values[time_label] = val

            if country_values:
                results[country_code] = {
                    "name": country_name,
                    "values": country_values,
                    "indicator": indicator_name,
                    "dataset_id": dataset_id,
                    "url": f"https://ec.europa.eu/eurostat/databrowser/view/{dataset_id}",
                }

        print(f"  ✓ Βρέθηκαν δεδομένα για {len(results)} χώρες")
        return results

    except Exception as e:
        print(f"  Eurostat σφάλμα: {e}")
        return {}


def eurostat_dict_to_text(selected_countries: dict) -> str:
    """Μετατρέπει το Eurostat dict σε κείμενο για τη σύνθεση."""
    if not selected_countries:
        return ""

    first = next(iter(selected_countries.values()))
    indicator = first["indicator"]
    dataset_id = first["dataset_id"]
    url = first["url"]

    parts = [
        f"{info['name']}: "
        + ", ".join(f"{v:.1f}% ({y})" for y, v in info["values"].items())
        for info in selected_countries.values()
    ]

    return (
        f"Eurostat — {indicator} για χώρες που εφάρμοσαν συναφείς πρακτικές: "
        f"{', '.join(parts)} "
        f"(Πηγή: Eurostat, {dataset_id}, {url})"
    )
