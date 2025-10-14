from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import secrets
import requests

app = FastAPI(title="Upload Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SHARED_STORAGE = os.path.abspath("../shared_storage/originals")

# Use shared storage for uploads
UPLOAD_STORAGE = SHARED_STORAGE

METADATA_SERVICE_URL = "http://127.0.0.1:8003"
TRANSCODING_SERVICE_URL = "http://127.0.0.1:8002"

# Ensure storage exists
os.makedirs(SHARED_STORAGE, exist_ok=True)

ALLOWED_EXT = {"mp4", "mov", "avi", "m4v", "hevc"}

def _is_allowed_filename(filename: str) -> bool:
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return ext in ALLOWED_EXT

@app.post("/upload/init")
async def upload_init(filename: str = Form(...), total_chunks: int = Form(...)):
    """Initialize a chunked upload. Returns an upload_id folder name."""
    if not _is_allowed_filename(filename):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    upload_id = secrets.token_hex(16)
    folder_path = os.path.join(UPLOAD_STORAGE, upload_id)
    os.makedirs(folder_path, exist_ok=True)
    
    # Store metadata
    meta_path = os.path.join(folder_path, ".meta")
    with open(meta_path, 'w') as f:
        f.write(f"{filename}\n{int(total_chunks)}")

    return {"upload_id": upload_id}

@app.post("/upload/chunk")
async def upload_chunk(upload_id: str = Form(...), index: int = Form(...), file: UploadFile = File(...)):
    """Receive a single chunk. index starts at 0."""
    folder_path = os.path.join(UPLOAD_STORAGE, upload_id)
    if not os.path.exists(folder_path):
        raise HTTPException(status_code=404, detail="Upload ID not found")

    chunk_path = os.path.join(folder_path, f"chunk_{int(index):06d}.part")
    with open(chunk_path, 'wb') as f:
        content = await file.read()
        f.write(content)

    return {"status": "ok", "index": index}

@app.post("/upload/complete")
async def upload_complete(upload_id: str = Form(...)):
    """Assemble chunks into final file, validate type, and register in DB."""
    folder_path = os.path.join(UPLOAD_STORAGE, upload_id)
    meta_path = os.path.join(folder_path, ".meta")
    
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

    # Find chunk files sorted
    chunk_files = sorted([p for p in os.listdir(folder_path) if p.startswith('chunk_')])
    if total_chunks is not None and len(chunk_files) != total_chunks:
        raise HTTPException(
            status_code=400, 
            detail=f"Missing chunks: expected {total_chunks}, got {len(chunk_files)}"
        )

    # Assemble
    final_path = os.path.join(folder_path, filename)
    with open(final_path, 'wb') as outfile:
        for chunk_name in chunk_files:
            chunk_path = os.path.join(folder_path, chunk_name)
            with open(chunk_path, 'rb') as infile:
                outfile.write(infile.read())

    # Basic validation by extension
    if not _is_allowed_filename(final_path):
        os.remove(final_path)
        raise HTTPException(status_code=400, detail="Final file has unsupported extension")

    # Register in metadata service
    try:
        response = requests.post(
            f"{METADATA_SERVICE_URL}/videos",
            json={"hash": upload_id, "filename": filename},
            timeout=10
        )
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to register video in metadata service")
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Metadata service unavailable: {str(e)}")

    # Cleanup chunks
    for chunk_name in chunk_files:
        try:
            os.remove(os.path.join(folder_path, chunk_name))
        except Exception:
            pass

    # Remove meta
    try:
        os.remove(meta_path)
    except Exception:
        pass

    # Trigger transcoding
    try:
        requests.post(
            f"{TRANSCODING_SERVICE_URL}/transcode/start",
            json={"upload_id": upload_id, "filename": filename, "network_speed": 10.0},
            timeout=10
        )
    except requests.RequestException:
        # Non-blocking - transcoding can be triggered manually later
        pass

    return {"hash": upload_id}

@app.get("/api/speedtest")
async def speedtest():
    """Return a 1MB test file for network speed measurement."""
    from fastapi.responses import Response
    data = b'\x00' * (1024 * 1024)  # 1MB of zeros
    return Response(content=data, media_type="application/octet-stream")

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "upload_service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
