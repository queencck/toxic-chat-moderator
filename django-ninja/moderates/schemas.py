from datetime import datetime

from ninja import Schema
from pydantic import Field

from bots.schemas import PlatformLiteral


class HourlyActivityStatSchema(Schema):
    hour: datetime
    chat_count: int
    active_users: int


class FlaggedMessageSchema(Schema):
    text: str
    toxicity: float
    sender: str
    created_at: datetime


class StatsResponseSchema(Schema):
    hourly_records: list[HourlyActivityStatSchema]
    flagged_count: int
    flagged_messages: list[FlaggedMessageSchema]


class ModerateRequestSchema(Schema):
    text: str = Field(max_length=5000)
    sender: str = Field(max_length=128)
    platform: PlatformLiteral
    group_identifier: str = Field(max_length=255)


class ModerateResponseSchema(Schema):
    text: str
    toxicity: float
    sender: str
    created_at: datetime
    model_version: str
