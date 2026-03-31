import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.batcher import InferenceBatcher
from app.classifier import ToxicityClassifier
from app.config import settings
from app.routes import health, messages, moderate, stats

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Attach uvicorn's handler to app loggers so logs appear in the same stream
    app_logger = logging.getLogger("app")
    app_logger.setLevel(logging.INFO)
    app_logger.handlers = logging.getLogger("uvicorn").handlers

    logger.info("Loading toxicity classifier...")
    classifier = ToxicityClassifier()
    classifier.load()
    app.state.classifier = classifier
    logger.info("Classifier loaded successfully.")

    batcher = InferenceBatcher(
        classifier,
        max_batch_size=settings.batch_max_size,
        timeout_ms=settings.batch_timeout_ms,
    )
    await batcher.start()
    app.state.batcher = batcher
    logger.info("Inference batcher started (max_batch=%d, timeout=%.1fms).",
                settings.batch_max_size, settings.batch_timeout_ms)

    yield

    await batcher.stop()


app = FastAPI(title="Toxic Chat Moderator", version="0.1.0", lifespan=lifespan)

app.include_router(health.router)
app.include_router(moderate.router, prefix=settings.api_v1_prefix)
app.include_router(messages.router, prefix=settings.api_v1_prefix)
app.include_router(stats.router, prefix=settings.api_v1_prefix)
