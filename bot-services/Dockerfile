FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN adduser --system --no-create-home bot && chown -R bot /app
USER bot

# No EXPOSE: the bot opens an outbound websocket to Discord and never listens.
CMD ["python", "discord_bot.py"]
