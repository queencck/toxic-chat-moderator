from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ClassificationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    sender: str | None = Field(default=None, max_length=128)
    source: str | None = Field(default="api", max_length=64)


class ClassificationResult(BaseModel):
    text: str
    sender: str | None
    source: str | None
    toxicity: float
    model_version: str

    model_config = {"from_attributes": True}

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
