from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db
from app.models import Message
from app.schemas import MessageDetail, MessageSummary, PaginatedMessages

router = APIRouter()


@router.get("/messages", response_model=PaginatedMessages)
async def list_messages(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(settings.default_page_size, ge=1, le=settings.max_page_size),
    flagged: bool | None = Query(None),
    source: str | None = Query(None),
    sender: str | None = Query(None),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
):
    base = select(Message)

    if flagged is not None:
        base = base.where(Message.is_flagged == flagged)
    if source is not None:
        base = base.where(Message.source == source)
    if sender is not None:
        base = base.where(Message.sender == sender)
    if start_date is not None:
        base = base.where(Message.created_at >= start_date)
    if end_date is not None:
        base = base.where(Message.created_at < end_date)

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    rows_result = await db.execute(
        base.order_by(Message.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [MessageSummary.model_validate(m) for m in rows_result.scalars().all()]

    return PaginatedMessages(items=items, total=total, page=page, page_size=page_size)


@router.get("/messages/{message_id}", response_model=MessageDetail)
async def get_message(
    message_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Message).where(Message.id == message_id))
    message = result.scalar_one_or_none()
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return message
