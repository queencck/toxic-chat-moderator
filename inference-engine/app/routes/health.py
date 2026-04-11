from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from app.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(
    request: Request,
):
    classifier = getattr(request.app.state, "classifier", None)
    model_loaded = classifier is not None and classifier.model is not None

    if not model_loaded:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthResponse(
        status="healthy" if model_loaded else "unhealthy",
        model_loaded=model_loaded
    )
