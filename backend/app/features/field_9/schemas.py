"""Pydantic schemas για το Πεδίο 9."""

from pydantic import BaseModel

# -------------------------------------------------------
# Endpoint 1: extract-sector
# -------------------------------------------------------

class ExtractSectorResponse(BaseModel):
    sector: str
    year: int
    law_title: str


# -------------------------------------------------------
# Endpoint 2: suggest-indicators
# -------------------------------------------------------

class SuggestIndicatorsRequest(BaseModel):
    sector: str
    year: int
    law_title: str


class IndicatorSuggestion(BaseModel):
    dataset_id: str
    indicator_name: str
    description: str
    sector: str


class SuggestIndicatorsResponse(BaseModel):
    suggestions: list[IndicatorSuggestion]


# -------------------------------------------------------
# Endpoint 3: fetch-data
# -------------------------------------------------------

class FetchDataRequest(BaseModel):
    selected_indicators: list[str]
    year: int


class YearlyValue(BaseModel):
    year: int
    value: float | None


class IndicatorData(BaseModel):
    dataset_id: str
    indicator_name: str
    description: str
    values: list[YearlyValue]
    unit: str
    eurostat_url: str


class FetchDataResponse(BaseModel):
    indicators: list[IndicatorData]
    reference_year: int
    five_year_range: list[int]