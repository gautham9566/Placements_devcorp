from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, ORJSONResponse
from models import Video, Category, get_db, SessionLocal
import asyncio
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
import orjson
import time
from functools import lru_cache
import requests
import logging
from contextlib import asynccontextmanager

# Simple cache for videos endpoint
_videos_cache = None
_cache_timestamp = 0
CACHE_TTL = 0.1  # 100ms cache

async def _scheduler_loop():
    """Background loop that publishes scheduled videos when their scheduled_at <= now."""
    while True:
        try:
            db = SessionLocal()
            now = datetime.now()
            scheduled_videos = db.query(Video).filter(Video.status == 'Scheduled', Video.scheduled_at != None).all()
            for v in scheduled_videos:
                try:
                    sched = v.scheduled_at
                    if not sched:
                        continue
                    try:
                        sched_dt = datetime.fromisoformat(sched)
                    except Exception:
                        # ignore parse errors
                        continue
                    if sched_dt <= now:
                        # call the publish endpoint instead of mutating DB here
                        publish_url = f"http://127.0.0.1:8003/videos/{v.hash}/publish"
                        attempts = 0
                        success = False
                        while attempts < 3 and not success:
                            attempts += 1
                            try:
                                resp = requests.post(publish_url, timeout=5)
                                if resp.ok:
                                    logging.info('Scheduler: published %s on attempt %d', v.hash, attempts)
                                    success = True
                                else:
                                    logging.warning('Scheduler: publish %s failed attempt %d: %s', v.hash, attempts, resp.text)
                            except Exception as e:
                                logging.warning('Scheduler: publish %s exception on attempt %d: %s', v.hash, attempts, e)
                            if not success:
                                await asyncio.sleep(2 ** attempts)
                except Exception:
                    db.rollback()
            db.close()
        except Exception:
            # swallow errors and continue
            try:
                db.close()
            except Exception:
                pass
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: start the scheduler loop as a background task
    asyncio.create_task(_scheduler_loop())
    yield
    # Shutdown: nothing to do

app = FastAPI(title="Metadata Service", default_response_class=ORJSONResponse, lifespan=lifespan)

logging.basicConfig(level=logging.INFO)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoCreate(BaseModel):
    hash: str
    filename: str
    thumbnail_filename: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[str] = None

class VideoUpdate(BaseModel):
    thumbnail_filename: Optional[str] = None
    original_resolution: Optional[str] = None
    original_quality_label: Optional[str] = None
    stopped: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime

@app.post("/videos")
async def create_video(video: VideoCreate, db: Session = Depends(get_db)):
    """Create a new video entry."""
    
    # Check if exists
    existing = db.query(Video).filter(Video.hash == video.hash).first()
    if existing:
        updated = False

        if video.title is not None and video.title != existing.title:
            existing.title = video.title or existing.filename
            updated = True

        if video.description is not None and video.description != existing.description:
            existing.description = video.description or None
            updated = True

        if video.thumbnail_filename is not None and video.thumbnail_filename != existing.thumbnail_filename:
            existing.thumbnail_filename = video.thumbnail_filename
            updated = True

        if video.status is not None and video.status != existing.status:
            existing.status = video.status or existing.status
            updated = True

        if video.scheduled_at is not None and video.scheduled_at != existing.scheduled_at:
            existing.scheduled_at = video.scheduled_at or None
            # auto-promote to Scheduled when a schedule is provided and no explicit status override
            if video.status is None:
                existing.status = "Scheduled" if video.scheduled_at else (existing.status or "draft")
            updated = True

        if video.category is not None and video.category != existing.category:
            existing.category = video.category
            updated = True

        if updated:
            db.add(existing)
            db.commit()
            db.refresh(existing)

        return {"id": existing.id, "hash": existing.hash}
    
    db_video = Video(
        hash=video.hash,
        filename=video.filename,
        title=video.title or video.filename,
        description=video.description or None,
        status=video.status or ("Scheduled" if video.scheduled_at else "draft"),
        scheduled_at=video.scheduled_at or None,
        category=video.category or "uncategorized",
        thumbnail_filename=video.thumbnail_filename
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    
    return {"id": db_video.id, "hash": db_video.hash}

@app.get("/videos")
async def get_videos(db: Session = Depends(get_db)):
    """Get all videos."""
    global _videos_cache, _cache_timestamp

    # Check cache
    current_time = time.time()
    if _videos_cache is not None and (current_time - _cache_timestamp) < CACHE_TTL:
        return _videos_cache

    # Fetch from database
    videos = db.query(Video).all()
    result = {
        "videos": [
            {
                "id": v.id,
                "hash": v.hash,
                "filename": v.filename,
                "title": v.title,
                "description": v.description,
                "category": v.category,
                "status": v.status,
                "thumbnail_filename": v.thumbnail_filename,
                "original_resolution": v.original_resolution,
                "original_quality_label": v.original_quality_label,
                "stopped": v.stopped,
                "created_at": v.created_at.isoformat() if v.created_at else None,
                "scheduled_at": v.scheduled_at
            }
            for v in videos
        ]
    }

    # Update cache
    _videos_cache = result
    _cache_timestamp = current_time

    return result

@app.get("/videos/{hash}")
async def get_video(hash: str, db: Session = Depends(get_db)):
    """Get a specific video by hash."""
    video = db.query(Video).filter(Video.hash == hash).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return {
        "id": video.id,
        "hash": video.hash,
        "filename": video.filename,
        "title": video.title,
        "category": video.category,
        "status": video.status,
        "thumbnail_filename": video.thumbnail_filename,
        "original_resolution": video.original_resolution,
        "original_quality_label": video.original_quality_label,
        "stopped": video.stopped,
        "scheduled_at": video.scheduled_at
    }

@app.put("/videos/{hash}")
async def update_video(hash: str, video_update: VideoUpdate, db: Session = Depends(get_db)):
    """Update video metadata."""
    video = db.query(Video).filter(Video.hash == hash).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    if video_update.thumbnail_filename is not None:
        video.thumbnail_filename = video_update.thumbnail_filename
    if video_update.original_resolution is not None:
        video.original_resolution = video_update.original_resolution
    if video_update.original_quality_label is not None:
        video.original_quality_label = video_update.original_quality_label
    if video_update.stopped is not None:
        video.stopped = video_update.stopped
    if video_update.title is not None:
        video.title = video_update.title
    if video_update.description is not None:
        video.description = video_update.description
    if video_update.category is not None:
        video.category = video_update.category
    if video_update.status is not None:
        video.status = video_update.status
    if video_update.scheduled_at is not None:
        video.scheduled_at = video_update.scheduled_at
    
    db.commit()
    return {"status": "updated"}


TRANSCODING_SERVICE_URL = "http://127.0.0.1:8002"


def _publish_video_db(video_hash: str):
    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.hash == video_hash).first()
        if not video:
            return False, 'not found'
        video.status = 'Published'
        db.add(video)
        db.commit()
        return True, 'published'
    except Exception as e:
        db.rollback()
        return False, str(e)
    finally:
        db.close()


@app.post('/videos/{hash}/publish')
def publish_video_endpoint(hash: str):
    """Publish a video if transcode completed successfully. Returns JSON status."""
    # Check transcode status via transcoding service
    try:
        r = requests.get(f"{TRANSCODING_SERVICE_URL}/transcode/{hash}/status", timeout=5)
        if r.ok:
            data = r.json()
            overall = (data.get('overall') or '').lower()
            if overall not in ('ok', 'finished', 'completed'):
                return JSONResponse({'status': 'not_ready', 'detail': 'transcode not completed'}, status_code=400)
    except Exception as e:
        logging.warning('Could not check transcode status: %s', e)
        # allow publish if we cannot reach transcoder? Safer to block
        return JSONResponse({'status': 'error', 'detail': 'transcode status unavailable'}, status_code=503)

    ok, msg = _publish_video_db(hash)
    if ok:
        logging.info('Published video %s', hash)
        return {'status': 'published'}
    logging.error('Failed to publish %s: %s', hash, msg)
    return JSONResponse({'status': 'error', 'detail': msg}, status_code=500)

@app.delete("/videos/{hash}")
async def delete_video(hash: str, db: Session = Depends(get_db)):
    """Delete a video entry."""
    video = db.query(Video).filter(Video.hash == hash).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    db.delete(video)
    db.commit()
    return {"status": "deleted"}

@app.get("/videos/{hash}/stopped")
async def is_stopped(hash: str, db: Session = Depends(get_db)):
    """Check if transcoding is stopped for a video."""
    video = db.query(Video).filter(Video.hash == hash).first()
    if not video:
        return {"stopped": False}
    return {"stopped": video.stopped == 1}

@app.put("/videos/{hash}/stop")
async def stop_transcoding(hash: str, db: Session = Depends(get_db)):
    """Stop transcoding for a video."""
    video = db.query(Video).filter(Video.hash == hash).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    video.stopped = 1
    db.commit()
    return {"status": "stopped"}

@app.put("/videos/{hash}/resume")
async def resume_video_flag(hash: str, db: Session = Depends(get_db)):
    """Resume transcoding flag for a video."""
    video = db.query(Video).filter(Video.hash == hash).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    video.stopped = 0
    db.commit()
    return {"status": "resumed"}

@app.get("/categories")
async def get_categories(db: Session = Depends(get_db)):
    """Get all categories."""
    categories = db.query(Category).all()
    return [CategoryResponse(id=c.id, name=c.name, description=c.description, created_at=c.created_at) for c in categories]

@app.post("/categories")
async def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    """Create a new category."""
    # Check if category with this name already exists
    existing = db.query(Category).filter(Category.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    new_category = Category(name=category.name, description=category.description)
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return CategoryResponse(id=new_category.id, name=new_category.name, description=new_category.description, created_at=new_category.created_at)

@app.delete("/categories/{category_id}")
async def delete_category(category_id: int, db: Session = Depends(get_db)):
    """Delete a category by ID."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "metadata_service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
