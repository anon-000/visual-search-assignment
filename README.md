# Image Similarity Search

Visual product similarity search system. Upload a product image and find the top 3 most similar products from the catalog using CLIP embeddings and pgvector.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   FastAPI    │────▶│  PostgreSQL +    │
│  (Next.js)   │     │   Backend    │     │  pgvector        │
│  :3000       │     │   :8000      │     │  :5432           │
└──────────────┘     └──────┬───────┘     └──────────────────┘
                            │
                     ┌──────▼───────┐     ┌──────────────────┐
                     │  RQ Worker   │────▶│     Redis        │
                     │  (CLIP model)│     │     :6379        │
                     └──────────────┘     └──────────────────┘
```

| Service    | Description                                                      |
| ---------- | ---------------------------------------------------------------- |
| **frontend** | Next.js + Tailwind CSS single-page UI                          |
| **api**      | FastAPI backend with REST endpoints                            |
| **worker**   | RQ background worker — downloads images, generates CLIP embeddings |
| **db**       | PostgreSQL 16 with pgvector extension for vector similarity search |
| **redis**    | Message broker for RQ task queue                               |

## Tech Stack

- **Frontend**: Next.js 16, Tailwind CSS, TypeScript
- **Backend**: FastAPI, SQLAlchemy, Pydantic
- **Database**: PostgreSQL + pgvector
- **Embeddings**: OpenAI CLIP (`openai/clip-vit-base-patch32`, 512-dim vectors)
- **Task Queue**: Redis + RQ
- **Containerization**: Docker Compose

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Run

```bash
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Usage

1. Open http://localhost:3000
2. Click **Sync Products** to ingest the product catalog (a progress bar tracks indexing)
3. Browse products in the grid, or filter by name using the search bar
4. Click **Search by Image** to upload a photo and find the top 3 visually similar products

## API Endpoints

| Method | Path               | Description                                          |
| ------ | ------------------ | ---------------------------------------------------- |
| POST   | `/tasks/ingest`    | Start background ingestion. Body: `{"source_url": "..."}` |
| GET    | `/tasks/{task_id}` | Poll task progress (status, processed/total counts)  |
| GET    | `/products`        | List products. Query params: `skip`, `limit`, `category` |
| POST   | `/search`          | Upload an image file, returns top 3 similar products |

## How Search Works

1. The uploaded query image is encoded into a 512-dimensional vector using CLIP
2. pgvector finds the **top 10** nearest image embeddings by cosine distance
3. Results are deduplicated by product (keeping the best-matching image per product)
4. A **category-based reranking** boost (+0.05 similarity) is applied to products matching the dominant category among the top results
5. The **top 3** products are returned with match scores and the matched image URL



## Screenshots
<img width="1470" height="956" alt="Screenshot 2026-03-29 at 12 23 17 AM" src="https://github.com/user-attachments/assets/e4061477-87b5-4119-9cdc-ed8a4a4daf99" />
<img width="1470" height="956" alt="Screenshot 2026-03-29 at 12 32 37 AM" src="https://github.com/user-attachments/assets/8326a484-2d91-47a1-b404-22b577257abf" />
<img width="1470" height="956" alt="Screenshot 2026-03-29 at 12 33 29 AM" src="https://github.com/user-attachments/assets/4904f9d9-c432-4aff-9ee0-b69b52bd93bc" />


## Project Structure

```
├── docker-compose.yml
├── Dockerfile                # Backend + worker image
├── requirements.txt
├── app/
│   ├── main.py               # FastAPI app, CORS, lifespan (pgvector + table setup)
│   ├── config.py             # Settings (DB, Redis, CLIP model)
│   ├── database.py           # SQLAlchemy engine & session
│   ├── models.py             # Product, ImageEmbedding, Task
│   ├── schemas.py            # Pydantic request/response models
│   ├── api/routes/
│   │   ├── tasks.py          # POST /tasks/ingest, GET /tasks/{id}
│   │   ├── products.py       # GET /products
│   │   └── search.py         # POST /search
│   └── services/
│       ├── embedding.py      # CLIP model loading & image encoding
│       ├── ingest.py         # Background job: fetch → upsert → embed
│       └── search.py         # pgvector query + reranking logic
└── frontend/
    ├── Dockerfile
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx      # Single-page UI
        │   └── globals.css
        └── lib/
            └── api.ts        # Typed API client
```
