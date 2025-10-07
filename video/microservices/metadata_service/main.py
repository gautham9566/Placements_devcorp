from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, ORJSONResponse
from models import Video, get_db
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
import orjson
import time
from functools import lru_cache

# Simple cache for videos endpoint
_videos_cache = None
_cache_timestamp = 0
CACHE_TTL = 0.1  # 100ms cache

app = FastAPI(title="Metadata Service", default_response_class=ORJSONResponse)

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

class VideoUpdate(BaseModel):
    thumbnail_filename: Optional[str] = None
    original_resolution: Optional[str] = None
    original_quality_label: Optional[str] = None
    stopped: Optional[int] = None

@app.post("/videos")
async def create_video(video: VideoCreate, db: Session = Depends(get_db)):
    """Create a new video entry."""
    
    # Check if exists
    existing = db.query(Video).filter(Video.hash == video.hash).first()
    if existing:
        return {"id": existing.id, "hash": existing.hash}
    
    db_video = Video(
        hash=video.hash,
        filename=video.filename,
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
                "thumbnail_filename": v.thumbnail_filename,
                "original_resolution": v.original_resolution,
                "original_quality_label": v.original_quality_label,
                "stopped": v.stopped
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
        "thumbnail_filename": video.thumbnail_filename,
        "original_resolution": video.original_resolution,
        "original_quality_label": video.original_quality_label,
        "stopped": video.stopped
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
    
    db.commit()
    return {"status": "updated"}

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

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "metadata_service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
