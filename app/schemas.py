from datetime import datetime

from pydantic import BaseModel


class ProductOut(BaseModel):
    product_id: str
    name: str
    category: str
    images: list[str]

    model_config = {"from_attributes": True}


class TaskOut(BaseModel):
    id: str
    status: str
    total_count: int
    processed_count: int
    error: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IngestRequest(BaseModel):
    source_url: str


class SearchResult(BaseModel):
    product: ProductOut
    score: float
    matched_image_url: str
