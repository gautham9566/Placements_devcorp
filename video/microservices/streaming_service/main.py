from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import os
import requests

app = FastAPI(title="Streaming Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SHARED_STORAGE = os.path.abspath("../shared_storage")
ORIGINALS_PATH = os.path.join(SHARED_STORAGE, "originals")
HLS_PATH = os.path.join(SHARED_STORAGE, "hls")
METADATA_SERVICE_URL = "http://127.0.0.1:8003"
TRANSCODING_SERVICE_URL = "http://127.0.0.1:8002"

HLS_CONTENT_TYPES = {
    ".m3u8": "application/vnd.apple.mpegurl",
    ".ts": "video/mp2t",
    ".mp4": "video/mp4",
}

# Quality presets for reference
QUALITY_PRESETS = {
    "1080p": {"width": 1920, "height": 1080, "video_bitrate": 5_800_000, "maxrate": 6_400_000, "audio_bitrate": 192_000},
    "720p": {"width": 1280, "height": 720, "video_bitrate": 3_500_000, "maxrate": 3_900_000, "audio_bitrate": 160_000},
    "480p": {"width": 854, "height": 480, "video_bitrate": 1_600_000, "maxrate": 1_900_000, "audio_bitrate": 128_000},
    "360p": {"width": 640, "height": 360, "video_bitrate": 900_000, "maxrate": 1_100_000, "audio_bitrate": 96_000},
}

@app.get("/stream/{video_id}/master.m3u8")
async def get_master_playlist(video_id: str):
    """Serve master HLS playlist."""
    master_path = os.path.join(HLS_PATH, video_id, "master.m3u8")
    if not os.path.exists(master_path):
        raise HTTPException(status_code=404, detail="Master playlist not found")
    
    return FileResponse(master_path, media_type="application/vnd.apple.mpegurl")

@app.get("/stream/{video_id}/{quality}/playlist.m3u8")
async def get_quality_playlist(video_id: str, quality: str):
    """Serve quality-specific HLS playlist."""
    playlist_path = os.path.join(HLS_PATH, video_id, quality, "playlist.m3u8")
    if not os.path.exists(playlist_path):
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    return FileResponse(playlist_path, media_type="application/vnd.apple.mpegurl")

@app.get("/stream/{video_id}/{quality}/{segment}")
async def get_segment(video_id: str, quality: str, segment: str):
    """Serve HLS segment file."""
    segment_path = os.path.join(HLS_PATH, video_id, quality, segment)
    if not os.path.exists(segment_path):
        raise HTTPException(status_code=404, detail="Segment not found")
    
    ext = os.path.splitext(segment)[1].lower()
    media_type = HLS_CONTENT_TYPES.get(ext, "application/octet-stream")
    
    return FileResponse(segment_path, media_type=media_type)

@app.get("/stream/{video_id}/original")
async def get_original_video(video_id: str):
    """Serve original video file."""
    try:
        # Get video metadata
        response = requests.get(f"{METADATA_SERVICE_URL}/videos/{video_id}", timeout=5)
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_data = response.json()
        filename = video_data.get("filename")
        if not filename:
            raise HTTPException(status_code=404, detail="Filename not found")
        
        original_path = os.path.join(ORIGINALS_PATH, video_id, filename)
        if not os.path.exists(original_path):
            raise HTTPException(status_code=404, detail="Original file not found")
        
        return FileResponse(original_path, media_type="video/mp4")
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Metadata service unavailable")

@app.get("/stream/{video_id}/qualities")
async def get_video_qualities(video_id: str):
    """Get available video qualities and their metadata."""
    hls_base = os.path.join(HLS_PATH, video_id)
    originals_base = os.path.join(ORIGINALS_PATH, video_id)
    
    if not os.path.exists(hls_base) and not os.path.exists(originals_base):
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Get metadata from metadata service
    original_quality_label = None
    original_resolution = None
    try:
        response = requests.get(f"{METADATA_SERVICE_URL}/videos/{video_id}", timeout=5)
        if response.status_code == 200:
            video_data = response.json()
            original_quality_label = video_data.get('original_quality_label')
            original_resolution = video_data.get('original_resolution')
    except requests.RequestException:
        pass
    
    # Get transcode status
    qualities = {}
    try:
        response = requests.get(f"{TRANSCODING_SERVICE_URL}/transcode/status/{video_id}", timeout=5)
        if response.status_code == 200:
            status_data = response.json()
            if not original_quality_label:
                original_quality_label = status_data.get('original_quality_label')
                original_resolution = status_data.get('original_resolution')
    except requests.RequestException:
        pass
    
    # Check available qualities
    for label, cfg in QUALITY_PRESETS.items():
        playlist_path = os.path.join(hls_base, label, 'playlist.m3u8')
        if os.path.exists(playlist_path):
            audio_bitrate = int(cfg.get('audio_bitrate', 128_000))
            video_avg = int(cfg.get('video_bitrate', cfg.get('maxrate', 0)))
            video_peak = int(cfg.get('maxrate', video_avg))
            qualities[label] = {
                "playlist": f"{label}/playlist.m3u8",
                "resolution": f"{cfg['width']}x{cfg['height']}",
                "bandwidth": max(1, video_peak + audio_bitrate),
                "average_bandwidth": max(1, video_avg + audio_bitrate),
            }
    
    # Check for original file
    original_path = None
    if os.path.exists(originals_base):
        for f in os.listdir(originals_base):
            if f.lower().endswith('.mp4'):
                original_path = f
                break
    
    if original_path:
        # Try to probe resolution if not in metadata
        if not original_resolution:
            try:
                import subprocess
                cmd = [
                    'ffprobe', '-v', 'error', '-select_streams', 'v:0',
                    '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x',
                    os.path.join(originals_base, original_path)
                ]
                out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode('utf-8').strip()
                original_resolution = out if out else ''
            except Exception:
                pass
        
        qualities['original'] = {
            'file': original_path,
            'resolution': original_resolution or '',
            'quality_label': original_quality_label or '',
        }
    
    master_path = os.path.join(hls_base, 'master.m3u8')
    response = {
        "master": "master.m3u8" if os.path.exists(master_path) else None,
        "qualities": qualities,
        "available": list(qualities.keys()),
        "original_quality_label": original_quality_label,
        "original_resolution": original_resolution,
    }
    return JSONResponse(response)

@app.get("/stream/{video_id}/{asset_path:path}")
async def get_video_asset(video_id: str, asset_path: str):
    """Generic endpoint to serve any video asset."""
    base_folder = os.path.abspath(os.path.join(HLS_PATH, video_id))
    if not os.path.exists(base_folder):
        raise HTTPException(status_code=404, detail="Video not found")

    normalized = os.path.normpath(asset_path).replace("\\", "/")
    candidate = os.path.abspath(os.path.join(base_folder, normalized))
    
    # Security check - ensure path is within video folder
    if not candidate.startswith(base_folder):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not os.path.exists(candidate):
        raise HTTPException(status_code=404, detail="File not found")

    ext = os.path.splitext(candidate)[1].lower()
    media_type = HLS_CONTENT_TYPES.get(ext, "application/octet-stream")
    return FileResponse(candidate, media_type=media_type)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "streaming_service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
