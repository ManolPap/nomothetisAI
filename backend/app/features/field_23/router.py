from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import settings
from app.features.field_23.schemas import (
    ArticleOut,
    AttributeLegislativeCommentsRequest,
    AttributeLegislativeCommentsResponse,
    CompareLawsRequest,
    CompareLawsResponse,
    SplitLawResponse,
)
from app.features.field_23.services.comments import attribute_legislative_comments_llm
from app.features.field_23.services.comparison import run_comparison_pipeline
from app.features.field_23.services.comparison.serialization import article_diff_to_out
from app.features.field_23.services.documents import split_uploaded_law

router = APIRouter()


@router.post(
    "/split-law",
    response_model=SplitLawResponse,
    summary="Διαχωρισμός νόμου σε άρθρα",
    description="Δέχεται νόμο σε μορφή PDF και διαχωρίζει το κείμενο σε άρθρα.",
)
async def split_law_endpoint(
    law_pdf: Annotated[
        UploadFile,
        File(description="Νόμος σε μορφή PDF"),
    ],
) -> SplitLawResponse:
    if not law_pdf.filename or not law_pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Το αρχείο πρέπει να είναι PDF.")
    articles = await split_uploaded_law(law_pdf)
    return SplitLawResponse(articles=[ArticleOut(**a) for a in articles])

@router.post("/compare-laws", 
    response_model=CompareLawsResponse,
    summary="Σύγκριση άρθρων μεταξύ δύο νόμων",
    description="Συγκρίνει άρθρα δύο νόμων και επιστρέφει τις διαφορές μεταξύ τους.",
)
def compare_laws_endpoint(body: CompareLawsRequest) -> CompareLawsResponse:
    initial_dicts = [a.model_dump() for a in body.initial_law_articles]
    final_dicts = [a.model_dump() for a in body.final_law_articles]
    diffs = run_comparison_pipeline(
        initial_dicts,
        final_dicts,
        normalize_before_diff=body.normalize_before_diff,
    )
    return CompareLawsResponse(diffs=[article_diff_to_out(d) for d in diffs])


@router.post(
    "/attribute-legislative-comments",
    response_model=AttributeLegislativeCommentsResponse,
    summary="Σχόλια που συνέβαλαν στην αλλαγή άρθρου",
    description=(
        "Για κάθε item: αρχικό και τελικό άρθρο. Τα σχόλια φορτώνονται από "
        "`field_23/data/legislative_comments.json` όπου `target_article_number` ταιριάζει με "
        "το `article_number` του αρχικού ή του τελικού. Το Gemini (LangChain) εκτιμά αν κάθε "
        "σχόλιο μπορεί να συνέβαλε στη διαφορά. Απαιτείται FEATURE_FIELD_23_GOOGLE_API_KEY."
    ),
)
async def attribute_legislative_comments_endpoint(
    body: AttributeLegislativeCommentsRequest,
) -> AttributeLegislativeCommentsResponse:
    if settings.feature.field_23_google_api_key is None:
        raise HTTPException(
            status_code=503,
            detail="Ρυθμίστε FEATURE_FIELD_23_GOOGLE_API_KEY για κλήσεις στο Gemini.",
        )
    return await attribute_legislative_comments_llm(body)