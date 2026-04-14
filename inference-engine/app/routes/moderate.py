from fastapi import APIRouter, Depends, status

from app.batcher import InferenceBatcher
from app.classifier import ToxicityClassifier
from app.dependencies import get_batcher, get_classifier
from app.schemas import ClassificationRequest, ClassificationResult

router = APIRouter()


@router.post("/classify", response_model=ClassificationResult, status_code=status.HTTP_200_OK)
async def classify_message(
    request: ClassificationRequest,
    classifier: ToxicityClassifier = Depends(get_classifier),
    batcher: InferenceBatcher = Depends(get_batcher),
):
    scores = await batcher.predict(request.text)

    return ClassificationResult(
        **request.model_dump(),
        toxicity=scores["toxicity"],
        model_version=classifier.model_version
    )
