import asyncio
import logging

from app.classifier import ToxicityClassifier

logger = logging.getLogger(__name__)


class QueueFull(Exception):
    """The batcher cannot accept more work right now."""


# text, future, the loop time it was enqueued at
_Item = tuple[str, asyncio.Future[dict[str, float]], float]


class InferenceBatcher:
    def __init__(
        self,
        classifier: ToxicityClassifier,
        max_batch_size: int,
        timeout_ms: float,
        max_queue_size: int,
        max_wait_ms: float,
    ) -> None:
        self.classifier = classifier
        self.max_batch_size = max_batch_size
        self.timeout_ms = timeout_ms
        self.max_wait_ms = max_wait_ms
        # Bounded: an unbounded queue never rejects anything, it just lets
        # latency grow without limit while every caller keeps waiting.
        self._queue: asyncio.Queue[_Item] = asyncio.Queue(maxsize=max_queue_size)
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
            _, future, _ = self._queue.get_nowait()
            if not future.done():
                future.set_exception(RuntimeError("Batcher shutting down"))

    async def predict(self, text: str) -> dict[str, float]:
        loop = asyncio.get_running_loop()
        future: asyncio.Future[dict[str, float]] = loop.create_future()
        try:
            # put_nowait, not await put: waiting for space would move the
            # blocking from the queue to the caller and shed nothing.
            self._queue.put_nowait((text, future, loop.time()))
        except asyncio.QueueFull:
            raise QueueFull("inference queue is full") from None
        return await future

    def _fresh(self, batch: list[_Item], now: float) -> list[tuple[str, asyncio.Future]]:
        """Drop work nobody is waiting for any more.

        Without this, an overloaded server spends its scarce capacity running
        inference for callers that already timed out, so the backlog can never
        drain -- the queue bound alone does not break that loop.
        """
        fresh = []
        for text, future, queued_at in batch:
            if future.done():  # caller gone
                continue
            if (now - queued_at) * 1000 > self.max_wait_ms:
                future.set_exception(QueueFull("queued longer than max_wait_ms"))
                continue
            fresh.append((text, future))
        return fresh

    async def _process_loop(self) -> None:
        loop = asyncio.get_running_loop()
        while True:
            batch: list[_Item] = []

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

            fresh = self._fresh(batch, loop.time())
            if not fresh:
                continue

            texts = [text for text, _ in fresh]
            if len(fresh) != len(batch):
                logger.warning(
                    "Processing batch of %d item(s); dropped %d stale",
                    len(texts), len(batch) - len(fresh),
                )
            else:
                logger.info("Processing batch of %d item(s)", len(texts))

            try:
                results = await asyncio.to_thread(self.classifier.predict_batch, texts)
                for (_, future), result in zip(fresh, results):
                    if not future.done():
                        future.set_result(result)
            except Exception as exc:
                for _, future in fresh:
                    if not future.done():
                        future.set_exception(exc)
