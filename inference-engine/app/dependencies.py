from collections.abc import AsyncGenerator

from fastapi import Request

from app.batcher import InferenceBatcher
from app.classifier import ToxicityClassifier


def get_classifier(request: Request) -> ToxicityClassifier:
    return request.app.state.classifier


def get_batcher(request: Request) -> InferenceBatcher:
    return request.app.state.batcher
