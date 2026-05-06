"""Eurostat service για το Πεδίο 9 — φέρνει χρονοσειρά για Ελλάδα."""

import logging
import re

import requests  # type: ignore[import-untyped]
from langchain_core.messages import HumanMessage, SystemMessage

from app.features.field_9.config import (
    EUROSTAT_BASE_URL,
    FIELD9_CATALOG,
    get_llm,
)
from app.features.field_9.prompt import (
    SUGGEST_INDICATORS_HUMAN_TEMPLATE,
    SUGGEST_INDICATORS_SYSTEM,
)
from app.features.field_9.schemas import IndicatorData, IndicatorSuggestion, YearlyValue
from app.features.field_9.services.llm_service import extract_llm_content

logger = logging.getLogger(__name__)


def get_five_year_range(reference_year: int) -> list[int]:
    """Επιστρέφει τα 5 έτη πριν από το έτος αναφοράς."""
    return list(range(reference_year - 5, reference_year))


def suggest_indicators(sector: str, law_title: str, year: int) -> list[IndicatorSuggestion]:
    """Χρησιμοποιεί LLM για να προτείνει κατάλληλους δείκτες."""
    catalog_text = "\n".join([
        f"{i + 1}. {did}: {info[0]} — {info[3]}"
        for i, (did, info) in enumerate(FIELD9_CATALOG.items())
        if info[2] == sector or sector in info[2]
    ])

    if not catalog_text:
        catalog_text = "\n".join([
            f"{i + 1}. {did}: {info[0]} — {info[3]}"
            for i, (did, info) in enumerate(FIELD9_CATALOG.items())
        ])

    response = get_llm().invoke([
        SystemMessage(content=SUGGEST_INDICATORS_SYSTEM),
        HumanMessage(content=SUGGEST_INDICATORS_HUMAN_TEMPLATE.format(
            sector=sector,
            law_title=law_title,
            year=year,
            catalog_text=catalog_text,
        )),
    ])

    raw = extract_llm_content(response).strip()
    logger.debug("LLM πρότεινε δείκτες: %s", raw)

    suggestions = []
    catalog_keys = list(FIELD9_CATALOG.keys())
    catalog_values = list(FIELD9_CATALOG.values())

    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        match = re.match(r"^(\d+)\s*:\s*(.*)$", line)
        if not match:
            continue
        idx = int(match.group(1)) - 1
        relevance_reason = match.group(2).strip()
        if 0 <= idx < len(catalog_keys):
            did = catalog_keys[idx]
            info = catalog_values[idx]
            suggestions.append(IndicatorSuggestion(
                dataset_id=did,
                indicator_name=info[0],
                description=info[3],
                sector=info[2],
                relevance_reason=relevance_reason,
            ))

    return suggestions


def fetch_indicator_data(dataset_id: str, reference_year: int) -> IndicatorData | None:
    """Φέρνει δεδομένα από Eurostat για έναν δείκτη για την Ελλάδα."""
    if dataset_id not in FIELD9_CATALOG:
        return None

    info = FIELD9_CATALOG[dataset_id]
    indicator_name = info[0]
    unit = info[1]
    description = info[3]

    years = get_five_year_range(reference_year) + [reference_year]
    time_params = "&".join([f"time={y}" for y in years])

    url = (
        f"{EUROSTAT_BASE_URL}/{dataset_id}"
        f"?format=JSON&lang=EN&unit={unit}&geo=EL&{time_params}"
    )

    logger.debug("Fetching Eurostat: %s", url)

    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()

        values_raw = data.get("value", {})
        dims = data.get("dimension", {})
        time_index = dims.get("time", {}).get("category", {}).get("index", {})

        if not values_raw or not time_index:
            logger.info("Άδεια δεδομένα Eurostat για %s", dataset_id)
            return None

        time_size = len(time_index)
        yearly_values = []

        for year_str, time_pos in time_index.items():
            val = values_raw.get(str(time_pos))
            if val is None:
                for key, v in values_raw.items():
                    if int(key) % time_size == time_pos:
                        val = v
                        break
            yearly_values.append(YearlyValue(
                year=int(year_str),
                value=round(float(val), 2) if val is not None else None,
            ))

        yearly_values.sort(key=lambda x: x.year)

        return IndicatorData(
            dataset_id=dataset_id,
            indicator_name=indicator_name,
            description=description,
            values=yearly_values,
            unit=unit,
            eurostat_url=f"https://ec.europa.eu/eurostat/databrowser/view/{dataset_id}",
        )

    except Exception as e:
        logger.warning("Σφάλμα Eurostat για %s: %s", dataset_id, e)
        return None