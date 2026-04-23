from datetime import datetime
from typing import Literal
from uuid import UUID

from ninja import Schema

from users.schemas import UserSchema

PlatformLiteral = Literal['API', 'Discord', 'Slack', 'Telegram']


class BotSchema(Schema):
    uuid: UUID
    user: UserSchema | None
    platform: str
    group_identifier: str
    group_name: str
    is_active: bool
    created_at: datetime


class LinkBotRequestSchema(Schema):
    bot_id: UUID


class CreateBotRequestSchema(Schema):
    platform: PlatformLiteral
    group_identifier: str
    group_name: str


class BotActionResponseSchema(Schema):
    message: str
    bot_id: UUID
    user_id: UUID | None = None
