from typing import List

from ninja import Router
from ninja_jwt.authentication import JWTAuth

from users.schemas import ErrorSchema

from .auth import BotTokenAuth
from .models import Bot
from .schemas import (
    BotActionResponseSchema,
    BotSchema,
    CreateBotRequestSchema,
    LinkBotRequestSchema,
)

router = Router()


@router.get('/list/', response=List[BotSchema], auth=JWTAuth())
def list_bots(request):
    """List all bots linked to the authenticated user"""
    return Bot.objects.filter(user=request.user)


@router.patch('/link/', response={200: BotActionResponseSchema, 404: ErrorSchema}, auth=JWTAuth())
def link_bot(request, payload: LinkBotRequestSchema):
    """Link a bot to the authenticated user"""
    try:
        bot = Bot.objects.get(uuid=payload.bot_id)
    except Bot.DoesNotExist:
        return 404, {'detail': 'Bot not found'}

    bot.user = request.user
    bot.save(update_fields=['user'])

    return 200, {
        'message': 'Bot linked successfully',
        'bot_id': bot.uuid,
        'user_id': request.user.uuid,
    }


@router.post('/create/', response={200: BotActionResponseSchema, 201: BotActionResponseSchema}, auth=BotTokenAuth())
def create_bot(request, payload: CreateBotRequestSchema):
    """Create a new bot instance (called by Discord bot on guild join)"""
    bot = Bot.objects.filter(platform=payload.platform, group_identifier=payload.group_identifier).first()
    if bot:
        return 200, {
            'message': 'Existing bot found and returned successfully',
            'bot_id': bot.uuid,
        }

    bot = Bot.objects.create(
        platform=payload.platform,
        group_identifier=payload.group_identifier,
        group_name=payload.group_name,
    )
    return 201, {
        'message': 'Bot created successfully',
        'bot_id': bot.uuid,
    }
