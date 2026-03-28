from redis import Redis
from rq import Queue
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Task
from app.schemas import IngestRequest, TaskOut
from app.services.ingest import run_ingest

router = APIRouter(prefix="/tasks", tags=["tasks"])

rq_queue = Queue(connection=Redis.from_url(settings.REDIS_URL))


@router.post("/ingest", response_model=TaskOut, status_code=201)
def create_ingest_task(body: IngestRequest, db: Session = Depends(get_db)):
    task = Task()
    db.add(task)
    db.commit()
    db.refresh(task)

    rq_queue.enqueue(run_ingest, task.id, body.source_url, job_timeout="1h")

    return task


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: str, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if task is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Task not found")
    return task
