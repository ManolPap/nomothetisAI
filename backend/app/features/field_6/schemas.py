"""Pydantic models για το Πεδίο 6."""

from pydantic import BaseModel, Field


class LawMetadata(BaseModel):
    topic: str = Field(description="Κύριο ρυθμιζόμενο θέμα")
    ministry: str = Field(description="Επισπεύδον Υπουργείο")
    sector: str = Field(description="Τομέας νομοθέτησης")
    measures: str = Field(description="Κύρια μέτρα που εισάγει ο νόμος")
    directive: str = Field(description="Οδηγία ΕΕ που ενσωματώνεται, ή '-'")


class WebSource(BaseModel):
    title: str
    url: str
    content: str = Field(description="Απόσπασμα περιεχομένου (έως 600 χαρ.)")


class MetadataResponse(BaseModel):
    metadata: LawMetadata
    nim_text: str


class WebSearchRequest(BaseModel):
    metadata: LawMetadata
    nim_text: str = ""


class WebSearchResponse(BaseModel):
    sources: list[WebSource]
    facts_text: str


class EurostatRequest(BaseModel):
    metadata: LawMetadata
    facts_text: str


class EurostatCountryEntry(BaseModel):
    name: str = Field(description="Πλήρες όνομα χώρας")
    values: dict[str, float] = Field(description="Τιμές ανά έτος, π.χ. {'2022': 12.3}")
    indicator: str = Field(description="Όνομα δείκτη Eurostat")
    dataset_id: str = Field(description="Κωδικός dataset Eurostat")
    url: str = Field(description="Σύνδεσμος Eurostat databrowser")


class EurostatResponse(BaseModel):
    eurostat_data: dict[str, EurostatCountryEntry] = Field(
        description="Δεδομένα ανά κωδικό χώρας (π.χ. 'DE', 'FR')",
    )
    indicator_name: str


class SynthesizeRequest(BaseModel):
    metadata: LawMetadata
    facts_text: str
    eurostat_text: str
    selected_sources: list[WebSource]


class SynthesizeResponse(BaseModel):
    field6_text: str
    word_count: int
