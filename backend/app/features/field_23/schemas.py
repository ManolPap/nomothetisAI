from pydantic import BaseModel, Field


class ArticleOut(BaseModel):
    article_number: str
    header: str
    title: str
    body: str


class SplitLawResponse(BaseModel):
    articles: list[ArticleOut] = Field(default_factory=list)
