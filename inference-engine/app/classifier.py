import logging

import torch
from detoxify import Detoxify

logger = logging.getLogger(__name__)

LABELS = ["toxicity", "severe_toxicity", "obscene", "threat", "insult", "identity_attack"]


class ToxicityClassifier:
    def __init__(self) -> None:
        self.model: Detoxify | None = None
        self.model_version = "toxic-bert-v1"
        self.device = "cpu"

    def load(self) -> None:
        if torch.cuda.is_available():
            self.device = "cuda"
            logger.info("CUDA available — loading model on GPU")
        else:
            logger.info("CUDA not available — loading model on CPU")
        self.model = Detoxify("original", device=self.device)
        self.model.model.eval()
        logger.info("Model loaded on %s in fp32.", self.device)

    def predict(self, text: str) -> dict[str, float]:
        if self.model is None:
            raise RuntimeError("Model not loaded")
        results = self.model.predict(text)
        return {"toxicity": float(max(results[label] for label in LABELS))}

    def predict_batch(self, texts: list[str]) -> list[dict[str, float]]:
        if self.model is None:
            raise RuntimeError("Model not loaded")
        results = self.model.predict(texts)
        return [
            {"toxicity": float(max(results[label][i] for label in LABELS))}
            for i in range(len(texts))
        ]
