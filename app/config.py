from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/toxic_moderator"
    toxicity_threshold: float = 0.5
    api_v1_prefix: str = "/api/v1"
    default_page_size: int = 20
    max_page_size: int = 100
    batch_max_size: int = 256
    batch_timeout_ms: float = 5.0
    quantize_model: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
