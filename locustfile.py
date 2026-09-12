"""Load test simulating Discord chat traffic hitting the moderation pipeline.

Two user classes, each pointed at a different layer:

    InferenceUser    POST /api/v1/classify          -> the model, in isolation
    DiscordFlowUser  POST /v1/moderates/moderate/   -> the full path a real
                                                       Discord message takes
                                                       (auth -> DB -> model -> DB)

Running the two and comparing latency tells you how much of the response time
is the model and how much is everything around it.

    # the model on its own
    locust -f locustfile.py InferenceUser

    # the full pipeline
    locust -f locustfile.py DiscordFlowUser

    # headless, 50 concurrent chatters for 2 minutes
    locust -f locustfile.py InferenceUser --headless -u 50 -r 10 -t 2m

Each simulated user represents one person chatting, pausing a few seconds
between messages -- so `-u 50` means roughly 50 people talking at once, not
50 requests in flight.

Config is read from the environment, falling back to the repo's .env:
    SECRET_TOKEN        bot auth token for the Django endpoint
    LOCUST_GUILD_ID     group_identifier of a registered, user-linked bot
    LOCUST_API_HOST     Host header for django-hosts subdomain routing
"""

import os
import random
from pathlib import Path

from locust import HttpUser, between, task


# --------------------------------------------------------------------------
# config
# --------------------------------------------------------------------------

_ROOT = Path(__file__).parent
# The env files have moved around; check the plausible homes rather than
# assuming one layout.
_ENV_FILES = (_ROOT / ".env", _ROOT / "django-ninja" / ".env")


def _setting(key: str, default: str = "") -> str:
    """Environment first, then any of the repo's .env files, then the default."""
    if value := os.getenv(key):
        return value
    for env_file in _ENV_FILES:
        if not env_file.exists():
            continue
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line.startswith(f"{key}=") and not line.startswith("#"):
                return line.split("=", 1)[1].strip()
    return default


SECRET_TOKEN = _setting("SECRET_TOKEN")
GUILD_ID = _setting("LOCUST_GUILD_ID", "1317367037579890788")
API_HOST_HEADER = _setting("LOCUST_API_HOST", "api.localhost")

# Think-time between messages. The defaults model people chatting, so user
# count means "concurrent chatters". Set both to 0 to saturate instead, which
# is what you want when measuring capacity rather than everyday latency.
WAIT_MIN = float(_setting("LOCUST_WAIT_MIN", "1"))
WAIT_MAX = float(_setting("LOCUST_WAIT_MAX", "5"))


# --------------------------------------------------------------------------
# message corpus
#
# Weighted to look like a real channel: mostly ordinary chat, a thin slice of
# genuinely abusive content, and a band of borderline messages that sit near
# the 0.6 threshold -- those are the interesting ones, because that is where
# the classifier's decisions actually change.
# --------------------------------------------------------------------------

BENIGN = [
    "anyone up for a game later?",
    "gg",
    "thanks, that worked!",
    "lol that's hilarious",
    "what time does the stream start",
    "just finished the assignment finally",
    "has anyone tried the new update yet",
    "brb dinner",
    "welcome to the server!",
    "that boss fight was brutal ngl",
    "can someone help me with the setup, i keep getting an error on step 3",
    "nice screenshot",
    "happy birthday!! hope you have a great one",
    "i'll be online around 8 if anyone wants to queue",
    "where's the rules channel",
    "does anyone have a link to the doc from yesterday",
    "morning everyone",
    "that update broke my config completely, had to reinstall",
]

TOXIC = [
    "shut up nobody asked for your opinion",
    "you're an idiot and everyone here knows it",
    "get lost loser",
    "this server is full of morons",
    "stop being so pathetic, it's embarrassing",
    "nobody likes you, just leave already",
]

BORDERLINE = [
    "that's a pretty dumb take honestly",
    "i disagree but whatever, do what you want",
    "this is getting really annoying",
    "can you please stop doing that",
    "not gonna lie, that was pretty bad",
    "i'm frustrated with how this turned out",
]

SENDERS = [f"user_{i:03d}" for i in range(1, 201)]


def _sender() -> str:
    return random.choice(SENDERS)


# --------------------------------------------------------------------------
# the model, in isolation
# --------------------------------------------------------------------------

class InferenceUser(HttpUser):
    """Hits the inference engine directly, bypassing Django and the database."""

    host = "http://localhost:8080"
    wait_time = between(WAIT_MIN, WAIT_MAX)

    def _classify(self, text: str, label: str) -> None:
        with self.client.post(
            "/api/v1/classify",
            json={"text": text, "sender": _sender(), "source": "discord"},
            name=f"/api/v1/classify [{label}]",
            catch_response=True,
        ) as response:
            if response.status_code != 200:
                response.failure(f"HTTP {response.status_code}")
                return
            # A 200 with a malformed body is still a failure for our purposes.
            try:
                score = response.json()["toxicity"]
            except (ValueError, KeyError) as exc:
                response.failure(f"bad payload: {exc}")
                return
            if not 0.0 <= score <= 1.0:
                response.failure(f"toxicity out of range: {score}")

    @task(85)
    def benign(self) -> None:
        self._classify(random.choice(BENIGN), "benign")

    @task(10)
    def toxic(self) -> None:
        self._classify(random.choice(TOXIC), "toxic")

    @task(5)
    def borderline(self) -> None:
        self._classify(random.choice(BORDERLINE), "borderline")


# --------------------------------------------------------------------------
# the full pipeline a Discord message actually travels
# --------------------------------------------------------------------------

class DiscordFlowUser(HttpUser):
    """Posts exactly what bot-services/discord_bot.py sends on every message."""

    host = "http://localhost:8000"
    wait_time = between(WAIT_MIN, WAIT_MAX)

    def on_start(self) -> None:
        if not SECRET_TOKEN:
            raise RuntimeError(
                "SECRET_TOKEN is not set - the endpoint would reject every request.\n"
                "  Pass it explicitly:  SECRET_TOKEN=... locust -f locustfile.py DiscordFlowUser\n"
                "  Or take it from the running container:\n"
                "    SECRET_TOKEN=$(docker compose exec -T api printenv SECRET_TOKEN) locust ..."
            )
        # django-hosts routes on the subdomain, so the Host header decides
        # which URLconf handles the request.
        self.client.headers.update({
            "Host": API_HOST_HEADER,
            "Authorization": f"Token {SECRET_TOKEN}",
        })

    def _moderate(self, text: str, label: str) -> None:
        with self.client.post(
            "/v1/moderates/moderate/",
            json={
                "text": text,
                "sender": _sender(),
                "platform": "Discord",
                "group_identifier": GUILD_ID,
            },
            name=f"/v1/moderates/moderate/ [{label}]",
            catch_response=True,
        ) as response:
            if response.status_code == 201:
                return
            # Map the endpoint's own error codes onto readable failures rather
            # than a wall of identical "HTTP 4xx" lines.
            detail = {
                400: "bot not registered for this guild, or not linked to a user",
                401: "SECRET_TOKEN rejected",
                502: "inference engine returned an error",
                503: "inference engine unreachable",
                504: "inference engine timed out",
            }.get(response.status_code, f"HTTP {response.status_code}")
            response.failure(detail)

    @task(85)
    def benign(self) -> None:
        self._moderate(random.choice(BENIGN), "benign")

    @task(10)
    def toxic(self) -> None:
        self._moderate(random.choice(TOXIC), "toxic")

    @task(5)
    def borderline(self) -> None:
        self._moderate(random.choice(BORDERLINE), "borderline")
