FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    # Pin the download caches somewhere predictable so the weights baked in
    # below are the ones found at runtime, whatever user the container runs as.
    HF_HOME=/app/.cache/huggingface \
    TORCH_HOME=/app/.cache/torch

WORKDIR /app

# torch ships CUDA libraries inside its wheel, so no nvidia base image is
# needed -- but that is also why this layer is several GB. Kept separate from
# the source so it stays cached across code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create the user and switch BEFORE downloading the weights. A `chown -R`
# afterwards would rewrite every cached file into a second layer, doubling
# the ~440MB the model occupies.
RUN adduser --system --no-create-home inference \
    && mkdir -p /app/.cache \
    && chown inference /app /app/.cache
USER inference

# Fetch the model at build time. Otherwise every cold start waits on a
# HuggingFace download, which means slow starts and a hard runtime dependency
# on a third party being reachable.
RUN python -c "from detoxify import Detoxify; Detoxify('original', device='cpu')"

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
