FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Pin the download caches somewhere predictable so the weights baked in
    # below are the ones found at runtime, whatever user the container runs as.
    HF_HOME=/app/.cache/huggingface \
    TORCH_HOME=/app/.cache/torch

WORKDIR /app

# torch ships the CUDA libraries inside its wheel, so no nvidia base image is
# needed -- but it is ~5GB of the ~6GB of dependencies, and it changes far less
# often than everything else. Installing it in its own layer means editing
# requirements.txt rebuilds only the small layer below.
#
# The cache mount keeps pip's downloaded wheels between builds. It lives
# outside the image, so it costs nothing in the final size, and it means even
# an invalidated layer reinstalls from disk rather than re-downloading.
ARG TORCH_VERSION=2.11.0
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install "torch==${TORCH_VERSION}"

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

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
