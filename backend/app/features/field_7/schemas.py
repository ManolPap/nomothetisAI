"""Pydantic models για το Πεδίο 7 — αντιστοίχιση με τους 17 SDGs."""

from pydantic import BaseModel, Field


class SubtargetMatch(BaseModel):
    code: str = Field(description="Κωδικός υποστόχου, π.χ. '8.5'")
    title: str = Field(description="Επίσημος τίτλος υποστόχου από SDG_DATA (όχι από LLM)")
    reasoning: str = Field(description="Γιατί ο νόμος ταιριάζει με αυτόν τον υποστόχο — από LLM")


class SDGMatch(BaseModel):
    sdg_id: int = Field(description="Αριθμός SDG (1-17)")
    sdg_title: str = Field(description="Τίτλος SDG από SDG_DATA")
    subtargets: list[SubtargetMatch] = Field(description="Λίστα συσχετιζόμενων υποστόχων")


class ClassifyRequest(BaseModel):
    law_text: str = Field(description="Πλήρες κείμενο του νόμου προς ανάλυση")


class ClassifyResponse(BaseModel):
    matches: list[SDGMatch] = Field(description="Λίστα SDGs που κάνουν match με τον νόμο")
    error: str | None = Field(default=None, description="Μήνυμα σφάλματος αν υπάρχει")
