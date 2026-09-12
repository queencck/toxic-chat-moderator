from fastapi import APIRouter, Request, Response, status

from app.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request, response: Response):
    classifier = getattr(request.app.state, "classifier", None)
    model_loaded = classifier is not None and classifier.model is not None

    # Orchestrators read the status code, not the body: a loaded-but-not-ready
    # instance must not be routed traffic.
    if not model_loaded:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthResponse(
        status="healthy" if model_loaded else "unhealthy",
        model_loaded=model_loaded,
    )
