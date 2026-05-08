from typing import Literal, Self

from pydantic import BaseModel, Field, StrictBool, model_validator


class ArticleOut(BaseModel):
    article_number: str
    header: str
    title: str
    body: str


class SplitLawResponse(BaseModel):
    articles: list[ArticleOut] = Field(default_factory=list)


class CompareLawsRequest(BaseModel):
    """Article lists as returned by `POST /field_23/split-laws` (or equivalent)."""

    initial_law_articles: list[ArticleOut]
    final_law_articles: list[ArticleOut]
    normalize_before_diff: bool = Field(
        default=False,
        description=(
            "If true, apply diff-time text cleanup (punctuation, lowercase, Greek accents, "
            "whitespace) before token diff — same behaviour as Streamlit «normalize» compare."
        ),
    )


class DiffSegmentOut(BaseModel):
    operation: str
    text: str


class ArticleDiffOut(BaseModel):
    old_article: ArticleOut | None = None
    new_article: ArticleOut | None = None
    change_type: str
    similarity_score: float = 0.0
    token_change_fraction: float = 0.0
    segments: list[DiffSegmentOut] = Field(default_factory=list)


class CompareLawsResponse(BaseModel):
    diffs: list[ArticleDiffOut] = Field(default_factory=list)


class StoredLegislativeComment(BaseModel):
    """Σχόλιο στο backend· `target_article_number` = `article_number` του στόχου (π.χ. JSON)."""

    id: str
    target_article_number: str
    text: str
    participant: str | None = None


class ArticleChangeCommentsItem(BaseModel):
    """
    Αρχικό και τελικό άρθρο. Τα σχόλια φορτώνονται στο backend από
    `field_23/data/legislative_comments.json` (κατά `target_article_number`).
    """

    item_index: int = Field(..., ge=0, description="Δείκτης συσχέτισης από το frontend")
    initial_article: ArticleOut | None = None
    final_article: ArticleOut | None = None

    @model_validator(mode="after")
    def at_least_one_article(self) -> Self:
        if self.initial_article is None and self.final_article is None:
            raise ValueError("Απαιτείται τουλάχιστον ένα από initial_article, final_article")
        return self


class AttributeLegislativeCommentsRequest(BaseModel):
    items: list[ArticleChangeCommentsItem] = Field(..., min_length=1, max_length=30)
    model: str | None = Field(
        default=None,
        description=(
            "Προαιρετικό όνομα μοντέλου Gemini· default: env "
            "FEATURE_FIELD_23_COMMENT_ATTRIBUTION_MODEL "
            "ή gemini-2.0-flash"
        ),
    )


class CommentContributionOut(BaseModel):
    comment_id: str
    comment_text: str
    contribution_likelihood: Literal["none", "low", "medium", "high"]
    rationale_el: str


class ItemAttributionOut(BaseModel):
    item_index: int
    contributions: list[CommentContributionOut] = Field(default_factory=list)


class AttributeLegislativeCommentsResponse(BaseModel):
    items: list[ItemAttributionOut] = Field(default_factory=list)


class ConsultationReportCommentIn(BaseModel):
    comment_id: str = Field(..., min_length=1)
    rationale_el: str = Field(..., min_length=1)
    adopted: StrictBool


class ConsultationReportItemIn(BaseModel):
    item_index: int = Field(..., ge=0)
    article_number: str = Field(..., min_length=1)
    article_title: str = Field(..., min_length=1)
    comments: list[ConsultationReportCommentIn] = Field(default_factory=list)


class GenerateConsultationReportRequest(BaseModel):
    items: list[ConsultationReportItemIn] = Field(..., min_length=1)


class ConsultationReportTotalsOut(BaseModel):
    comments_total: int
    adopted_total: int
    not_adopted_total: int
    participants_total: int


class ConsultationArticleSectionOut(BaseModel):
    article_number: str
    article_title: str
    comment_count: int
    adopted_count: int
    not_adopted_count: int
    adopted_summary: str
    not_adopted_summary: str


class GenerateConsultationReportResponse(BaseModel):
    totals: ConsultationReportTotalsOut
    articles_section: list[ConsultationArticleSectionOut] = Field(default_factory=list)
    final_preview_text: str
    llm_status: Literal["ok", "fallback", "partial"]