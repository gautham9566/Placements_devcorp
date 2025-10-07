from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from models import Video, get_db
import os
import hashlib
import secrets
import threading
import shutil
from transcode import transcode_video, get_status_snapshot, QUALITY_PRESETS, resume_incomplete_transcoding
from typing import Optional

app = FastAPI()

# Allow CORS from frontend (adjust origin as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to resume incomplete transcoding jobs
@app.on_event("startup")
async def startup_event():
    """Resume any incomplete transcoding jobs when the server starts."""
    try:
        resume_incomplete_transcoding()
    except Exception as e:
        print(f"Error during transcoding recovery: {e}")

HLS_CONTENT_TYPES = {
    ".m3u8": "application/vnd.apple.mpegurl",
    ".ts": "video/mp2t",
    ".mp4": "video/mp4",
}

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Generate random hash
    hash_value = secrets.token_hex(16)

    # Create folder
    folder_path = f"videos/{hash_value}"
    os.makedirs(folder_path, exist_ok=True)

    # Save file
    file_path = f"{folder_path}/{file.filename}"
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Save to DB
    db = get_db()
    db_video = Video(hash=hash_value, filename=file.filename, thumbnail_filename=None)
    db.add(db_video)
    db.commit()
    db.refresh(db_video)

    return {"hash": hash_value}


@app.get("/api/speedtest")
async def speedtest():
    """Return a 1MB test file for network speed measurement."""
    # Create a 1MB response
    data = b'\x00' * (1024 * 1024)  # 1MB of zeros
    from fastapi.responses import Response
    return Response(content=data, media_type="application/octet-stream")


# --- Chunked upload API ---
ALLOWED_EXT = {"mp4", "mov", "avi" "m4v", "hevc"}


def _is_allowed_filename(filename: str) -> bool:
    if not filename or '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in ALLOWED_EXT


@app.post("/upload/init")
async def upload_init(filename: str = Form(...), total_chunks: int = Form(...)):
    """Initialize a chunked upload. Returns an upload_id folder name."""
    if not _is_allowed_filename(filename):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    upload_id = secrets.token_hex(16)
    folder_path = f"videos/{upload_id}"
    os.makedirs(folder_path, exist_ok=True)
    # store metadata
    meta_path = f"{folder_path}/.meta"
    with open(meta_path, 'w') as f:
        f.write(f"{filename}\n{int(total_chunks)}")

    return {"upload_id": upload_id}


@app.post("/upload/chunk")
async def upload_chunk(upload_id: str = Form(...), index: int = Form(...), file: UploadFile = File(...)):
    """Receive a single chunk. index starts at 0."""
    folder_path = f"videos/{upload_id}"
    if not os.path.exists(folder_path):
        raise HTTPException(status_code=404, detail="Upload ID not found")

    chunk_path = f"{folder_path}/chunk_{int(index):06d}.part"
    with open(chunk_path, 'wb') as f:
        content = await file.read()
        f.write(content)

    return {"status": "ok", "index": index}


@app.post("/upload/complete")
async def upload_complete(upload_id: str = Form(...)):
    """Assemble chunks into final file, validate type, and register in DB."""
    folder_path = f"videos/{upload_id}"
    meta_path = f"{folder_path}/.meta"
    if not os.path.exists(folder_path) or not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Upload ID not found or missing metadata")

    with open(meta_path, 'r') as f:
        lines = f.read().splitlines()
    if len(lines) < 2:
        raise HTTPException(status_code=500, detail="Invalid metadata")

    filename = lines[0]
    try:
        total_chunks = int(lines[1])
    except Exception:
        total_chunks = None

    # find chunk files sorted
    chunk_files = sorted([p for p in os.listdir(folder_path) if p.startswith('chunk_')])
    if total_chunks is not None and len(chunk_files) != total_chunks:
        raise HTTPException(status_code=400, detail=f"Missing chunks: expected {total_chunks}, got {len(chunk_files)}")

    # assemble
    final_path = f"{folder_path}/{filename}"
    with open(final_path, 'wb') as outfile:
        for chunk_name in chunk_files:
            chunk_path = f"{folder_path}/{chunk_name}"
            with open(chunk_path, 'rb') as infile:
                outfile.write(infile.read())

    # basic validation by extension
    if not _is_allowed_filename(final_path):
        # cleanup
        os.remove(final_path)
        raise HTTPException(status_code=400, detail="Final file has unsupported extension")

    # Save to DB
    db = get_db()
    db_video = Video(hash=upload_id, filename=filename, thumbnail_filename=None)
    db.add(db_video)
    db.commit()
    db.refresh(db_video)

    # Optionally remove chunk files
    for chunk_name in chunk_files:
        try:
            os.remove(f"{folder_path}/{chunk_name}")
        except Exception:
            pass

    # remove meta
    try:
        os.remove(meta_path)
    except Exception:
        pass

    # spawn background transcode
    try:
        # run in background thread to avoid blocking the request
        db = get_db()
        # start thread that runs transcode_video(upload_id, filename)
        t = threading.Thread(target=transcode_video, args=(upload_id, filename), daemon=True)
        t.start()
    except Exception:
        pass

    return {"hash": upload_id}


@app.post("/transcode/{hash}")
async def transcode_trigger(hash: str, request: Request):
    """Trigger transcoding for a given video hash. Runs in background and returns immediately."""
    try:
        body = await request.json()
        network_speed = body.get('networkSpeed', 10)  # Default 10 Mbps
    except:
        network_speed = 10

    db = get_db()
    video = db.query(Video).filter(Video.hash == hash).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    folder_path = f"videos/{hash}"
    file_path = f"{folder_path}/{video.filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    # background thread
    try:
        t = threading.Thread(target=transcode_video, args=(hash, video.filename, network_speed), daemon=True)
        t.start()
        return JSONResponse({"status": "started"})
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)


@app.get("/transcode/{hash}/status")
async def transcode_status(hash: str):
    folder_path = f"videos/{hash}"
    status_path = f"{folder_path}/.transcode_status.json"
    if not os.path.exists(status_path):
        return JSONResponse({"status": "not_found"}, status_code=404)
    try:
        data = get_status_snapshot(hash)
        
        # Update database with original resolution if available
        if data and data.get('original_resolution'):
            db = get_db()
            video = db.query(Video).filter(Video.hash == hash).first()
            if video and not video.original_resolution:
                video.original_resolution = data.get('original_resolution')
                video.original_quality_label = data.get('original_quality_label')
                db.commit()
        
        return JSONResponse(data)
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)


@app.post("/admin/resume-transcoding")
async def resume_transcoding():
    """Manually trigger transcoding recovery for all incomplete jobs."""
    try:
        from transcode import resume_incomplete_transcoding
        resume_incomplete_transcoding()
        return JSONResponse({"status": "recovery_started"})
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)


@app.get("/transcode/{hash}/qualities")
async def transcode_qualities(hash: str):
    base = f"videos/{hash}"
    if not os.path.exists(base):
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Get original quality info from database or status
    db = get_db()
    video = db.query(Video).filter(Video.hash == hash).first()
    original_quality_label = None
    original_resolution = None
    
    if video:
        original_quality_label = video.original_quality_label
        original_resolution = video.original_resolution
    
    # If not in database, try to get from transcode status
    if not original_quality_label:
        try:
            status_data = get_status_snapshot(hash)
            if status_data:
                original_quality_label = status_data.get('original_quality_label')
                original_resolution = status_data.get('original_resolution')
        except Exception:
            pass
    
    qualities = {}
    for label, cfg in QUALITY_PRESETS.items():
        playlist_rel = os.path.join(label, 'playlist.m3u8').replace('\\', '/')
        playlist_abs = os.path.join(base, playlist_rel)
        if os.path.exists(playlist_abs):
            audio_bitrate = int(cfg.get('audio_bitrate', 128_000))
            video_avg = int(cfg.get('video_bitrate', cfg.get('maxrate', 0)))
            video_peak = int(cfg.get('maxrate', video_avg))
            qualities[label] = {
                "playlist": playlist_rel,
                "resolution": f"{cfg['width']}x{cfg['height']}",
                "bandwidth": max(1, video_peak + audio_bitrate),
                "average_bandwidth": max(1, video_avg + audio_bitrate),
            }
    # include original file as a quality if present
    original_path = None
    # try to find an mp4 in the base folder
    for f in os.listdir(base):
        if f.lower().endswith('.mp4'):
            original_path = f
            break

    if original_path:
        # probe resolution using ffprobe if available
        try:
            import subprocess
            cmd = [
                'ffprobe', '-v', 'error', '-select_streams', 'v:0',
                '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x',
                os.path.join(base, original_path)
            ]
            out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode('utf-8').strip()
            res = out if out else (original_resolution or '')
        except Exception:
            res = original_resolution or ''
        qualities['original'] = {
            'file': original_path,
            'resolution': res,
            'quality_label': original_quality_label or '',
        }

    master_path = os.path.join(base, 'master.m3u8')
    response = {
        "master": "master.m3u8" if os.path.exists(master_path) else None,
        "qualities": qualities,
        "available": list(qualities.keys()),
        "original_quality_label": original_quality_label,
        "original_resolution": original_resolution,
    }
    return JSONResponse(response)

@app.get("/videos")
async def get_videos():
    db = get_db()
    videos = db.query(Video).all()
    return [{
        "id": video.id, 
        "hash": video.hash, 
        "filename": video.filename, 
        "thumbnail_filename": video.thumbnail_filename,
        "original_resolution": video.original_resolution,
        "original_quality_label": video.original_quality_label
    } for video in videos]


@app.delete("/api/videos/{hash}")
@app.delete("/videos/{hash}")
async def delete_video(hash: str):
    """Delete a video's files and database record by hash."""
    db = get_db()
    video = db.query(Video).filter(Video.hash == hash).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    base_folder = f"videos/{hash}"

    # Attempt to remove folder and all contents
    try:
        if os.path.exists(base_folder):
            shutil.rmtree(base_folder)
    except Exception as e:
        # Log error and continue to DB removal
        print(f"Error removing files for {hash}: {e}")

    # Remove DB record
    try:
        db.delete(video)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete video record: {e}")

    return JSONResponse({"status": "deleted"})

@app.get("/video/{hash}")
async def get_video(hash: str, quality: Optional[str] = None, format: Optional[str] = None):
    db = get_db()
    video = db.query(Video).filter(Video.hash == hash).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    base_folder = f"videos/{hash}"
    original_path = os.path.join(base_folder, video.filename)

    if format == 'mp4':
        if not os.path.exists(original_path):
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(original_path, media_type="video/mp4")

    if quality:
        quality_playlist = os.path.join(base_folder, quality, "playlist.m3u8")
        if os.path.exists(quality_playlist):
            return FileResponse(quality_playlist, media_type="application/vnd.apple.mpegurl")

    master_path = os.path.join(base_folder, "master.m3u8")
    if os.path.exists(master_path):
        return FileResponse(master_path, media_type="application/vnd.apple.mpegurl")

    if os.path.exists(original_path):
        return FileResponse(original_path, media_type="video/mp4")

    raise HTTPException(status_code=404, detail="File not found")


@app.get("/video/{hash}/{asset_path:path}")
async def get_video_asset(hash: str, asset_path: str):
    base_folder = os.path.abspath(os.path.join("videos", hash))
    if not os.path.exists(base_folder):
        raise HTTPException(status_code=404, detail="Video not found")

    normalized = os.path.normpath(asset_path).replace("\\", "/")
    candidate = os.path.abspath(os.path.join(base_folder, normalized))
    if not candidate.startswith(base_folder):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not os.path.exists(candidate):
        raise HTTPException(status_code=404, detail="File not found")

    ext = os.path.splitext(candidate)[1].lower()
    media_type = HLS_CONTENT_TYPES.get(ext, "application/octet-stream")
    return FileResponse(candidate, media_type=media_type)

@app.post("/thumbnail/{hash}")
async def upload_thumbnail(hash: str, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    db = get_db()
    video = db.query(Video).filter(Video.hash == hash).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Save thumbnail
    folder_path = f"videos/{hash}"
    thumbnail_filename = "thumbnail.jpg"  # or use file.filename
    file_path = f"{folder_path}/{thumbnail_filename}"
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Update DB
    video.thumbnail_filename = thumbnail_filename
    db.commit()

    return {"message": "Thumbnail uploaded successfully"}

@app.get("/thumbnail/{hash}")
async def get_thumbnail(hash: str):
    db = get_db()
    video = db.query(Video).filter(Video.hash == hash).first()
    if not video or not video.thumbnail_filename:
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    file_path = f"videos/{hash}/{video.thumbnail_filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path, media_type="image/jpeg")

@app.put("/videos/{hash}/stop")
async def stop_transcoding(hash: str):
    """Stop transcoding for a video."""
    db = get_db()
    video = db.query(Video).filter(Video.hash == hash).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    video.stopped = 1
    db.commit()
    return {"status": "stopped"}

@app.put("/videos/{hash}/resume")
async def resume_transcoding(hash: str):
    """Resume transcoding for a video."""
    db = get_db()
    video = db.query(Video).filter(Video.hash == hash).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    video.stopped = 0
    db.commit()
    # Trigger transcoding again
    from transcode import transcode_video
    import threading
    threading.Thread(target=transcode_video, args=(hash,)).start()
    return {"status": "resumed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)