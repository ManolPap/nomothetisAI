"""Pydantic models για το Πεδίο 6."""

from typing import Literal

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


class FactItem(BaseModel):
    """Ένα επαληθεύσιμο fact ανά υποπεδίο Πεδίου 6."""

    id: str = Field(description="Σταθερό id π.χ. i-0, ii-1")
    category: Literal["i", "ii", "iii"] = Field(
        description="i=Χώρες ΕΕ/ΟΟΣΑ, ii=Όργανα ΕΕ, iii=Διεθνείς οργανισμοί",
    )
    subject: str = Field(default="", description="Χώρα/λίστα χωρών, όργανο ΕΕ ή οργανισμός")
    instrument: str = Field(default="", description="Νόμος, οδηγία, τίτλος εγγράφου")
    finding: str = Field(default="", description="Εύρημα όπως αναφέρεται ρητά στην πηγή")
    source_url: str = Field(default="", description="URL πηγής")
    source_title: str | None = Field(default=None, description="Τίτλος πηγής αν υπάρχει")


class FactsPayload(BaseModel):
    """Facts ομαδοποιημένα ανά υποπεδίο — stable JSON για UI και downstream."""

    i: list[FactItem] = Field(default_factory=list, description="Χώρες ΕΕ/ΟΟΣΑ")
    ii: list[FactItem] = Field(default_factory=list, description="Όργανα ΕΕ")
    iii: list[FactItem] = Field(default_factory=list, description="Διεθνείς οργανισμοί")


class WebSearchResponse(BaseModel):
    sources: list[WebSource]
    facts: FactsPayload
    facts_text: str = Field(
        description="Κείμενο σε μορφή FACT_i/FACT_ii/FACT_iii για Eurostat και σύνθεση",
    )


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
