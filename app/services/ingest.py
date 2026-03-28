import httpx
from sqlalchemy import select

from app.database import SessionLocal
from app.models import ImageEmbedding, Product, Task
from app.services.embedding import encode_image_from_url


def run_ingest(task_id: str, source_url: str):
    """Background job: fetch JSON, upsert products, compute & store embeddings."""
    db = SessionLocal()
    try:
        task = db.get(Task, task_id)
        task.status = "processing"
        db.commit()

        # Fetch product data
        resp = httpx.get(source_url, timeout=60, follow_redirects=True)
        resp.raise_for_status()
        products_data = resp.json()

        task.total_count = len(products_data)
        db.commit()

        for item in products_data:
            pid = str(item["product_id"])

            # Upsert product
            product = db.get(Product, pid)
            if product is None:
                product = Product(
                    product_id=pid,
                    name=item["name"],
                    category=item["category"],
                    images=item.get("images", []),
                )
                db.add(product)
            else:
                product.name = item["name"]
                product.category = item["category"]
                product.images = item.get("images", [])
            db.flush()

            # Skip if embeddings already exist for this product
            existing = db.execute(
                select(ImageEmbedding.id).where(
                    ImageEmbedding.product_id == pid
                )
            ).first()
            if existing:
                task.processed_count += 1
                db.commit()
                continue

            # Generate embeddings for each image
            for img_url in item.get("images", []):
                embedding = encode_image_from_url(img_url)
                if embedding is None:
                    continue
                db.add(
                    ImageEmbedding(
                        product_id=pid,
                        image_url=img_url,
                        embedding=embedding,
                    )
                )

            task.processed_count += 1
            db.commit()

        task.status = "completed"
        db.commit()

    except Exception as e:
        db.rollback()
        task = db.get(Task, task_id)
        if task:
            task.status = "failed"
            task.error = str(e)[:1000]
            db.commit()
        raise
    finally:
        db.close()
