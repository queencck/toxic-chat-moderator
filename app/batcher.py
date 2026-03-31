import asyncio
import logging

from app.classifier import ToxicityClassifier

logger = logging.getLogger(__name__)


class InferenceBatcher:
    def __init__(
        self,
        classifier: ToxicityClassifier,
        max_batch_size: int,
        timeout_ms: float,
    ) -> None:
        self.classifier = classifier
        self.max_batch_size = max_batch_size
        self.timeout_ms = timeout_ms
        self._queue: asyncio.Queue[tuple[str, asyncio.Future[dict[str, float]]]] = asyncio.Queue()
        self._task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        self._task = asyncio.create_task(self._process_loop())

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        # Drain any remaining items with an error
        while not self._queue.empty():
            _, future = self._queue.get_nowait()
            if not future.done():
                future.set_exception(RuntimeError("Batcher shutting down"))

    async def predict(self, text: str) -> dict[str, float]:
        loop = asyncio.get_running_loop()
        future: asyncio.Future[dict[str, float]] = loop.create_future()
        await self._queue.put((text, future))
        return await future

    async def _process_loop(self) -> None:
        loop = asyncio.get_running_loop()
        while True:
            batch: list[tuple[str, asyncio.Future[dict[str, float]]]] = []

            # Block until the first item arrives
            item = await self._queue.get()
            batch.append(item)

            # Collect more items up to max_batch_size or timeout
            deadline = loop.time() + self.timeout_ms / 1000
            while len(batch) < self.max_batch_size:
                remaining = deadline - loop.time()
                if remaining <= 0:
                    break
                try:
                    item = await asyncio.wait_for(self._queue.get(), timeout=remaining)
                    batch.append(item)
                except asyncio.TimeoutError:
                    break

            texts = [text for text, _ in batch]
            logger.info("Processing batch of %d item(s)", len(texts))

            try:
                results = await asyncio.to_thread(self.classifier.predict_batch, texts)
                for (_, future), result in zip(batch, results):
                    if not future.done():
                        future.set_result(result)
            except Exception as exc:
                for _, future in batch:
                    if not future.done():
                        future.set_exception(exc)
