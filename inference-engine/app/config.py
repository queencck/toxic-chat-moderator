from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    api_v1_prefix: str = "/api/v1"
    batch_max_size: int = 256
    batch_timeout_ms: float = 5.0

    # Size the queue by time, not items: at a measured ~1400 req/s this is
    # roughly 0.2s of backlog. Deep enough to absorb a burst, shallow enough
    # that anything accepted is served promptly.
    batch_max_queue: int = 256
    # Safety net for when capacity drops (a CPU fallback, a slow model). Must
    # stay below the caller's HTTP timeout so the server sheds deliberately
    # rather than the client giving up first.
    batch_max_wait_ms: float = 2000.0

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
