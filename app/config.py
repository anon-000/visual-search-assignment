from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://app:app@db:5432/image_search"
    REDIS_URL: str = "redis://redis:6379/0"
    CLIP_MODEL: str = "openai/clip-vit-base-patch32"
    EMBEDDING_DIM: int = 512


settings = Settings()
