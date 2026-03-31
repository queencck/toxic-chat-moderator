from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.batcher import InferenceBatcher
from app.classifier import ToxicityClassifier
from app.config import settings
from app.dependencies import get_batcher, get_db, get_classifier
from app.models import Classification, Message
from app.schemas import MessageDetail, ModerateRequest

router = APIRouter()


@router.post("/moderate", response_model=MessageDetail, status_code=status.HTTP_201_CREATED)
async def moderate_message(
    body: ModerateRequest,
    db: AsyncSession = Depends(get_db),
    classifier: ToxicityClassifier = Depends(get_classifier),
    batcher: InferenceBatcher = Depends(get_batcher),
):
    scores = await batcher.predict(body.text)
    flagged = classifier.is_flagged(scores, settings.toxicity_threshold)

    message = Message(
        text=body.text,
        sender=body.sender,
        source=body.source,
        is_flagged=flagged,
    )
    db.add(message)
    await db.flush()

    classification = Classification(
        message_id=message.id,
        threshold=settings.toxicity_threshold,
        model_version=classifier.model_version,
        **scores,
    )
    db.add(classification)
    await db.commit()
    await db.refresh(message)

    return message
