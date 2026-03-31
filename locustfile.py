"""Load test for the POST /api/v1/moderate endpoint."""

import random

from locust import HttpUser, task, between

BENIGN_MESSAGES = [
    "Hello, how are you doing today?",
    "Can someone help me with my homework?",
    "I love this community, everyone is so helpful!",
    "What time does the event start tomorrow?",
    "Great job on the presentation, it was very informative.",
    "Does anyone know a good recipe for banana bread?",
    "The weather is really nice outside today.",
    "Thanks for sharing that article, it was a good read.",
    "I just finished reading a great book, highly recommend it.",
    "Happy birthday! Hope you have an amazing day!",
]

TOXIC_MESSAGES = [
    "You are the worst person I have ever met, go away.",
    "Shut up, nobody asked for your stupid opinion.",
    "I hate everything about this, it's all garbage.",
    "You're an idiot and everyone knows it.",
    "This is the dumbest thing I've ever seen in my life.",
]

MIXED_MESSAGES = [
    "I disagree with your point but I see where you're coming from.",
    "That's a bit annoying but whatever, let's move on.",
    "Not gonna lie, that was pretty lame.",
    "I'm frustrated with how this turned out.",
    "Could you please stop doing that? It's really bothering me.",
]

ALL_MESSAGES = BENIGN_MESSAGES + TOXIC_MESSAGES + MIXED_MESSAGES


class ModerateUser(HttpUser):
    """Simulates users sending messages to the moderate endpoint."""

    wait_time = between(0.1, 0.5)

    @task(6)
    def moderate_benign(self):
        """Send a benign message (most common)."""
        self.client.post(
            "/api/v1/moderate",
            json={
                "text": random.choice(BENIGN_MESSAGES),
                "sender": f"user_{random.randint(1, 100)}",
                "source": "load_test",
            },
        )

    @task(2)
    def moderate_toxic(self):
        """Send a toxic message."""
        self.client.post(
            "/api/v1/moderate",
            json={
                "text": random.choice(TOXIC_MESSAGES),
                "sender": f"user_{random.randint(1, 100)}",
                "source": "load_test",
            },
        )

    @task(2)
    def moderate_mixed(self):
        """Send an ambiguous message."""
        self.client.post(
            "/api/v1/moderate",
            json={
                "text": random.choice(MIXED_MESSAGES),
                "sender": f"user_{random.randint(1, 100)}",
                "source": "load_test",
            },
        )
