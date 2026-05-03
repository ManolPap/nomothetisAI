from typing import Annotated

from fastapi import APIRouter, File, UploadFile

from app.features.field_23.schemas import ArticleOut, SplitLawResponse
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
    articles = await split_uploaded_law(law_pdf)
    return SplitLawResponse(articles=[ArticleOut(**a) for a in articles])
