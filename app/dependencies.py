from collections.abc import AsyncGenerator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.batcher import InferenceBatcher
from app.classifier import ToxicityClassifier
from app.database import async_session


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


def get_classifier(request: Request) -> ToxicityClassifier:
    return request.app.state.classifier


def get_batcher(request: Request) -> InferenceBatcher:
    return request.app.state.batcher
