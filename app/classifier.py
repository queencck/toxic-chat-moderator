import logging

import torch
from detoxify import Detoxify

from app.config import settings

logger = logging.getLogger(__name__)

LABELS = ["toxicity", "severe_toxicity", "obscene", "threat", "insult", "identity_attack"]


class ToxicityClassifier:
    def __init__(self) -> None:
        self.model: Detoxify | None = None
        self.model_version = "toxic-bert-v1"
        self.device = "cpu"
        self.quantized = False

    def load(self) -> None:
        if torch.cuda.is_available():
            self.device = "cuda"
            logger.info("CUDA available — loading model on GPU")
        else:
            logger.info("CUDA not available — loading model on CPU")
        self.model = Detoxify("original", device=self.device)

        if settings.quantize_model:
            logger.info("Applying FP16 half-precision quantization...")
            self.model.model.half()
            self.quantized = True
            logger.info("FP16 quantization applied successfully.")
        else:
            logger.info("Model quantization disabled by configuration.")

    def predict(self, text: str) -> dict[str, float]:
        if self.model is None:
            raise RuntimeError("Model not loaded")
        results = self.model.predict(text)
        return {label: float(results[label]) for label in LABELS}

    def predict_batch(self, texts: list[str]) -> list[dict[str, float]]:
        if self.model is None:
            raise RuntimeError("Model not loaded")
        results = self.model.predict(texts)
        return [
            {label: float(results[label][i]) for label in LABELS}
            for i in range(len(texts))
        ]

    @staticmethod
    def is_flagged(scores: dict[str, float], threshold: float) -> bool:
        return any(score >= threshold for score in scores.values())
