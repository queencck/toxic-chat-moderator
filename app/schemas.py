from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ModerateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    sender: str | None = Field(default=None, max_length=128)
    source: str | None = Field(default="api", max_length=64)


class ClassificationResult(BaseModel):
    toxicity: float
    severe_toxicity: float
    obscene: float
    threat: float
    insult: float
    identity_attack: float
    threshold: float
    model_version: str

    model_config = {"from_attributes": True}


class MessageDetail(BaseModel):
    id: UUID
    text: str
    sender: str | None
    source: str | None
    is_flagged: bool
    classification: ClassificationResult
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageSummary(BaseModel):
    id: UUID
    text: str
    sender: str | None
    source: str | None
    is_flagged: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedMessages(BaseModel):
    items: list[MessageSummary]
    total: int
    page: int
    page_size: int


class CategoryBreakdown(BaseModel):
    toxicity: int
    severe_toxicity: int
    obscene: int
    threat: int
    insult: int
    identity_attack: int


class StatsResponse(BaseModel):
    total_messages: int
    flagged_count: int
    unflagged_count: int
    category_breakdown: CategoryBreakdown


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    database: str
