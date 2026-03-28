import io

from fastapi import APIRouter, Depends, File, UploadFile
from PIL import Image
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import SearchResult
from app.services.embedding import encode_image
from app.services.search import search_similar

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=list[SearchResult])
async def search_by_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    query_embedding = encode_image(image)
    results = search_similar(db, query_embedding, top_k=10, top_n=3)
    return results
