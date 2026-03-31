from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models import Classification, Message
from app.schemas import CategoryBreakdown, StatsResponse

router = APIRouter()


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db),
):
    count_result = await db.execute(
        select(
            func.count().label("total"),
            func.count().filter(Message.is_flagged.is_(True)).label("flagged"),
        ).select_from(Message)
    )
    row = count_result.one()
    total = row.total
    flagged_count = row.flagged

    cat_result = await db.execute(
        select(
            func.count(case((Classification.toxicity >= Classification.threshold, 1))).label("toxicity"),
            func.count(case((Classification.severe_toxicity >= Classification.threshold, 1))).label("severe_toxicity"),
            func.count(case((Classification.obscene >= Classification.threshold, 1))).label("obscene"),
            func.count(case((Classification.threat >= Classification.threshold, 1))).label("threat"),
            func.count(case((Classification.insult >= Classification.threshold, 1))).label("insult"),
            func.count(case((Classification.identity_attack >= Classification.threshold, 1))).label("identity_attack"),
        )
    )
    cat_row = cat_result.one()

    return StatsResponse(
        total_messages=total,
        flagged_count=flagged_count,
        unflagged_count=total - flagged_count,
        category_breakdown=CategoryBreakdown(
            toxicity=cat_row.toxicity,
            severe_toxicity=cat_row.severe_toxicity,
            obscene=cat_row.obscene,
            threat=cat_row.threat,
            insult=cat_row.insult,
            identity_attack=cat_row.identity_attack,
        ),
    )
