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
COURSE_SERVICE_URL = "http://127.0.0.1:8006"
TRANSCODING_SERVICE_URL = "http://127.0.0.1:8002"

# Ensure storage exists
os.makedirs(SHARED_STORAGE, exist_ok=True)

ALLOWED_EXT = {"mp4", "mov", "avi", "m4v", "hevc"}

def _is_allowed_filename(filename: str) -> bool:
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return ext in ALLOWED_EXT

@app.post("/upload/init")
async def upload_init(
    filename: str = Form(...),
    total_chunks: str = Form(...),
    course_id: str = Form(None)
):
    """Initialize a chunked upload. Returns an upload_id folder name."""
    # Log received data with type information
    print(f"UPLOAD INIT RECEIVED: filename={filename}, total_chunks={total_chunks}, course_id={course_id}, course_id_type={type(course_id)}")
    print(f"UPLOAD INIT - course_id is None: {course_id is None}, course_id value: '{course_id}'")

    if not _is_allowed_filename(filename):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    upload_id = secrets.token_hex(16)

    # Handle course_id - use "default" if None or empty
    # Check for None, empty string, or string "None"
    if course_id and course_id.lower() != 'none':
        course_folder = str(course_id)
    else:
        course_folder = "default"

    print(f"UPLOAD INIT - Using course_folder: {course_folder}")

    # Create course directory if it doesn't exist
    course_dir = os.path.join(UPLOAD_STORAGE, course_folder)
    os.makedirs(course_dir, exist_ok=True)

    # Create folder under course_id subdirectory
    upload_dir = os.path.join(UPLOAD_STORAGE, course_folder, upload_id)
    os.makedirs(upload_dir, exist_ok=True)

    # Store metadata including course_id
    meta_path = os.path.join(upload_dir, ".meta")
    with open(meta_path, 'w') as f:
        f.write(f"{filename}\n{int(total_chunks)}\n{course_id if course_id else ''}")

    return {"upload_id": upload_id, "course_folder": course_folder}

@app.post("/upload/chunk")
async def upload_chunk(
    upload_id: str = Form(...),
    index: str = Form(...),
    file: UploadFile = File(...),
    course_id: str = Form(None)
):
    # Log received data
    print(f"UPLOAD CHUNK RECEIVED: upload_id={upload_id}, index={index}, filename={file.filename}, course_id={course_id}")

    # Handle course_id - use "default" if None or empty
    if course_id and course_id.lower() != 'none':
        course_folder = str(course_id)
    else:
        course_folder = "default"

    print(f"UPLOAD CHUNK - Using course_folder: {course_folder}")

    # Use course-specific path
    folder_path = os.path.join(UPLOAD_STORAGE, course_folder, upload_id)

    # Check if the folder exists
    if not os.path.exists(folder_path):
        raise HTTPException(status_code=404, detail="Upload ID not found for this course")

    chunk_path = os.path.join(folder_path, f"chunk_{int(index):06d}.part")
    with open(chunk_path, 'wb') as f:
        content = await file.read()
        f.write(content)

    return {"status": "ok", "index": index}

@app.post("/upload/complete")
async def upload_complete(upload_id: str = Form(...), course_id: str = Form(None)):
    # Log received data
    print(f"UPLOAD COMPLETE RECEIVED: upload_id={upload_id}, course_id={course_id}")
    """Assemble chunks into final file, validate type, and register in DB."""

    # Handle course_id - use "default" if None or empty
    if course_id and course_id.lower() != 'none':
        course_folder = str(course_id)
    else:
        course_folder = "default"

    print(f"UPLOAD COMPLETE - Using course_folder: {course_folder}")

    # Find the upload directory
    upload_dir = os.path.join(UPLOAD_STORAGE, course_folder, upload_id)

    # Check if the folder exists
    if not os.path.exists(upload_dir):
        # Create directory if it doesn't exist
        os.makedirs(upload_dir, exist_ok=True)

    meta_path = os.path.join(upload_dir, ".meta")

    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Upload metadata not found")

    with open(meta_path, 'r') as f:
        lines = f.read().splitlines()
    if len(lines) < 2:
        raise HTTPException(status_code=500, detail="Invalid metadata")

    filename = lines[0]
    try:
        total_chunks = int(lines[1])
    except Exception:
        total_chunks = None

    # Extract course_id from metadata if not provided
    if (not course_id or course_id.lower() == 'none') and len(lines) >= 3 and lines[2]:
        try:
            course_id = lines[2]
            if course_id and course_id.lower() != 'none':
                course_folder = str(course_id)
            else:
                course_folder = "default"
        except Exception:
            pass

    # Find chunk files sorted
    chunk_files = sorted([p for p in os.listdir(upload_dir) if p.startswith('chunk_')])
    if total_chunks is not None and len(chunk_files) != total_chunks:
        raise HTTPException(
            status_code=400,
            detail=f"Missing chunks: expected {total_chunks}, got {len(chunk_files)}"
        )

    # Assemble
    final_path = os.path.join(upload_dir, filename)
    with open(final_path, 'wb') as outfile:
        for chunk_name in chunk_files:
            chunk_path = os.path.join(upload_dir, chunk_name)
            with open(chunk_path, 'rb') as infile:
                outfile.write(infile.read())

    # Basic validation by extension
    if not _is_allowed_filename(final_path):
        os.remove(final_path)
        raise HTTPException(status_code=400, detail="Final file has unsupported extension")

    # Register in appropriate database based on course_id
    try:
        metadata_payload = {"hash": upload_id, "filename": filename}

        # If course_id is present, store in courses database
        if course_id is not None and course_id != "" and course_id.lower() != 'none':
            metadata_payload["course_id"] = int(course_id)

            response = requests.post(
                f"{COURSE_SERVICE_URL}/course-videos",
                json=metadata_payload,
                timeout=10
            )
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to register video in course database")
        else:
            # No course_id, store in videos.db (admin uploads)
            response = requests.post(
                f"{METADATA_SERVICE_URL}/videos",
                json=metadata_payload,
                timeout=10
            )
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to register video in metadata service")
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Metadata service unavailable: {str(e)}")

    # Cleanup chunks
    for chunk_name in chunk_files:
        try:
            os.remove(os.path.join(upload_dir, chunk_name))
        except Exception:
            pass

    # Remove meta
    try:
        os.remove(meta_path)
    except Exception:
        pass

    # NOTE: Transcoding is NOT triggered automatically here anymore.
    # It will be triggered when the user clicks "Publish" or "Save as Draft" in the course workflow.

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
