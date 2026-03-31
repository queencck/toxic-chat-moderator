from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    model_loaded = (
        hasattr(request.app.state, "classifier")
        and request.app.state.classifier.model is not None
    )

    db_status = "connected"
    status_code = 200
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"
        status_code = 503

    if not model_loaded:
        status_code = 503

    from fastapi.responses import JSONResponse

    body = HealthResponse(
        status="healthy" if status_code == 200 else "unhealthy",
        model_loaded=model_loaded,
        database=db_status,
    )
    return JSONResponse(content=body.model_dump(), status_code=status_code)
