from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models import ImageEmbedding, Product
from app.schemas import ProductOut, SearchResult


def search_similar(
    db: Session, query_embedding: list[float], top_k: int = 10, top_n: int = 3
) -> list[SearchResult]:
    """
    1. Find top_k nearest image embeddings via pgvector cosine distance.
    2. Rerank: deduplicate by product, boost score for category consistency.
    3. Return top_n results.
    """
    # pgvector cosine distance: <=> operator (lower = more similar)
    stmt = (
        select(
            ImageEmbedding.product_id,
            ImageEmbedding.image_url,
            ImageEmbedding.embedding.cosine_distance(query_embedding).label(
                "distance"
            ),
        )
        .order_by(text("distance"))
        .limit(top_k)
    )
    rows = db.execute(stmt).all()

    if not rows:
        return []

    # Deduplicate by product_id — keep the best (lowest distance) per product
    seen: dict[str, tuple] = {}
    for row in rows:
        if row.product_id not in seen:
            seen[row.product_id] = row

    # Fetch products
    product_ids = list(seen.keys())
    products = {
        p.product_id: p
        for p in db.execute(
            select(Product).where(Product.product_id.in_(product_ids))
        )
        .scalars()
        .all()
    }

    # Rerank: use the dominant category among top results as a boost signal
    categories = [
        products[pid].category for pid in seen if pid in products
    ]
    dominant_category = max(set(categories), key=categories.count) if categories else None

    scored: list[tuple[str, float, str]] = []
    for pid, row in seen.items():
        if pid not in products:
            continue
        similarity = 1.0 - row.distance  # convert distance to similarity
        # Boost products matching the dominant category
        if products[pid].category == dominant_category:
            similarity += 0.05
        scored.append((pid, similarity, row.image_url))

    scored.sort(key=lambda x: x[1], reverse=True)

    results = []
    for pid, score, image_url in scored[:top_n]:
        product = products[pid]
        results.append(
            SearchResult(
                product=ProductOut.model_validate(product),
                score=round(score, 4),
                matched_image_url=image_url,
            )
        )
    return results
