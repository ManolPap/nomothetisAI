# ruff: noqa: E501
"""LLM clients για το Πεδίο 7 — αντιστοίχιση SDGs."""

from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings


@lru_cache(maxsize=1)
def get_llm_fast() -> ChatGoogleGenerativeAI:
    """Gemini Flash Lite: single classification call (500 RPD)."""
    return ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite-preview",
        google_api_key=settings.feature.field_6_9_google_api_key.get_secret_value() if settings.feature.field_6_9_google_api_key else None,
        temperature=0,
    )


@lru_cache(maxsize=1)
def get_llm_fallback() -> ChatGoogleGenerativeAI:
    """Gemini 2.5 Flash: fallback όταν το Flash Lite χτυπάει rate limit."""
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.feature.field_6_9_google_api_key.get_secret_value() if settings.feature.field_6_9_google_api_key else None,
        temperature=0,
    )
