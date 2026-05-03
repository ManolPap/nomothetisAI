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


class Field6Response(BaseModel):
    law_name: str = Field(description="Όνομα αρχείου PDF χωρίς επέκταση")
    metadata: LawMetadata
    eurlex_nim: str = Field(
        default="",
        description="Κείμενο από EUR-Lex National Implementation Measures",
    )
    queries_used: list[str] = Field(description="Search queries που χρησιμοποιήθηκαν")
    sources: list[WebSource] = Field(description="Πηγές από web search")
    extracted_facts: str = Field(description="Facts ανά κατηγορία (i, ii, iii)")
    field6_text: str = Field(description="Τελικό κείμενο Πεδίου 6")
    word_count: int = Field(description="Πλήθος λέξεων στο κείμενο Πεδίου 6")


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


class EurostatResponse(BaseModel):
    eurostat_data: dict
    indicator_name: str


class SynthesizeRequest(BaseModel):
    metadata: LawMetadata
    facts_text: str
    eurostat_text: str
    selected_sources: list[WebSource]


class SynthesizeResponse(BaseModel):
    field6_text: str
    word_count: int
