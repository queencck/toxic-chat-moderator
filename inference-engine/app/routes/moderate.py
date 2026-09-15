from fastapi import APIRouter, Depends, HTTPException, status

from app.batcher import InferenceBatcher, QueueFull
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
    try:
        scores = await batcher.predict(request.text)
    except QueueFull:
        # 503 rather than a hang: tell the caller we are over capacity so it
        # can back off, instead of holding the connection until it times out.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Inference queue is full",
            headers={"Retry-After": "1"},
        ) from None

    return ClassificationResult(
        **request.model_dump(),
        toxicity=scores["toxicity"],
        model_version=classifier.model_version
    )
