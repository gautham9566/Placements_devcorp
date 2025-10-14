from fastapi import FastAPI, HTTPException, Request, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse, ORJSONResponse
import httpx
import requests
import os
import shutil
import time

# Simple cache for videos endpoint
_admin_videos_cache = None
_admin_cache_timestamp = 0
ADMIN_CACHE_TTL = 0.1  # 100ms cache

app = FastAPI(title="Admin Service", default_response_class=ORJSONResponse)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

METADATA_SERVICE_URL = "http://127.0.0.1:8003"
TRANSCODING_SERVICE_URL = "http://127.0.0.1:8002"
UPLOAD_SERVICE_URL = "http://127.0.0.1:8001"
STREAMING_SERVICE_URL = "http://127.0.0.1:8004"

SHARED_STORAGE = os.path.abspath("../shared_storage")
ORIGINALS_PATH = os.path.join(SHARED_STORAGE, "originals")
HLS_PATH = os.path.join(SHARED_STORAGE, "hls")

# ============================================================================
# FRONTEND API GATEWAY ROUTES (Proxy to microservices)
# ============================================================================

@app.get("/videos")
def get_videos():
    """Proxy to metadata service - Get all videos."""
    global _admin_videos_cache, _admin_cache_timestamp

    # Check cache
    current_time = time.time()
    if _admin_videos_cache is not None and (current_time - _admin_cache_timestamp) < ADMIN_CACHE_TTL:
        return _admin_videos_cache

    try:
        response = requests.get(f"{METADATA_SERVICE_URL}/videos", timeout=10)
        if response.status_code == 200:
            data = response.json()
            # Unwrap the videos array for frontend compatibility
            if "videos" in data:
                result = data["videos"]
            else:
                result = data

            # Update cache
            _admin_videos_cache = result
            _admin_cache_timestamp = current_time

            return result
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Metadata service unavailable: {str(e)}")

@app.get("/videos/{video_hash}")
async def get_video_metadata(video_hash: str):
    """Proxy to metadata service - Get video metadata."""
    try:
        response = requests.get(f"{METADATA_SERVICE_URL}/videos/{video_hash}", timeout=10)
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Metadata service unavailable: {str(e)}")


@app.put("/videos/{video_hash}")
async def update_video_metadata(video_hash: str, request: Request):
    """Proxy to metadata service - Update video metadata (used for publishing etc)."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    try:
        resp = requests.put(
            f"{METADATA_SERVICE_URL}/videos/{video_hash}",
            json=body,
            timeout=10
        )
        return JSONResponse(content=resp.json() if resp.text else {}, status_code=resp.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Metadata service unavailable: {str(e)}")

@app.post("/videos")
async def create_video_metadata(request: Request):
    """Proxy to metadata service - Create video metadata."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    try:
        resp = requests.post(
            f"{METADATA_SERVICE_URL}/videos",
            json=body,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        return JSONResponse(content=resp.json() if resp.text else {}, status_code=resp.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Metadata service unavailable: {str(e)}")

@app.delete("/videos/{video_hash}")
async def delete_video(video_hash: str):
    """Delete a video completely (files and metadata)."""
    errors = []
    
    # Delete from metadata service
    try:
        response = requests.delete(f"{METADATA_SERVICE_URL}/videos/{video_hash}", timeout=10)
        if response.status_code not in [200, 404]:
            errors.append(f"Metadata deletion failed: HTTP {response.status_code}")
    except requests.RequestException as e:
        errors.append(f"Metadata service error: {str(e)}")
    
    # Delete original files
    originals_folder = os.path.join(ORIGINALS_PATH, video_hash)
    if os.path.exists(originals_folder):
        try:
            shutil.rmtree(originals_folder)
        except Exception as e:
            errors.append(f"Failed to delete originals: {str(e)}")
    
    # Delete HLS files
    hls_folder = os.path.join(HLS_PATH, video_hash)
    if os.path.exists(hls_folder):
        try:
            shutil.rmtree(hls_folder)
        except Exception as e:
            errors.append(f"Failed to delete HLS files: {str(e)}")
    
    if errors:
        return {
            "status": "partial_success",
            "errors": errors,
            "video_id": video_hash
        }
    
    return {
        "status": "deleted",
        "video_id": video_hash
    }

@app.put("/videos/{video_hash}/stop")
async def stop_transcoding(video_hash: str):
    """Stop transcoding for a video."""
    try:
        response = requests.put(
            f"{METADATA_SERVICE_URL}/videos/{video_hash}/stop",
            timeout=10
        )
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail="Failed to stop transcoding"
            )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Metadata service unavailable: {str(e)}"
        )

@app.put("/videos/{video_hash}/resume")
async def resume_transcoding(video_hash: str):
    """Resume transcoding for a video."""
    try:
        # First, resume the flag in metadata
        response = requests.put(
            f"{METADATA_SERVICE_URL}/videos/{video_hash}/resume",
            timeout=10
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="Failed to resume transcoding flag"
            )
        
        # Get video info to trigger transcoding
        video_response = requests.get(f"{METADATA_SERVICE_URL}/videos/{video_hash}", timeout=10)
        if video_response.status_code != 200:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_data = video_response.json()
        filename = video_data.get("filename")
        
        # Trigger transcoding
        transcode_response = requests.post(
            f"{TRANSCODING_SERVICE_URL}/transcode/start",
            json={"upload_id": video_hash, "filename": filename, "network_speed": 10.0},
            timeout=10
        )
        
        return {
            "status": "resumed",
            "video_id": video_hash,
            "transcoding_started": transcode_response.status_code == 200
        }
    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Service unavailable: {str(e)}"
        )

@app.post("/videos/{video_hash}/publish")
async def publish_video(video_hash: str):
    """Proxy to metadata service - Publish a video."""
    try:
        response = requests.post(
            f"{METADATA_SERVICE_URL}/videos/{video_hash}/publish",
            timeout=10
        )
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Metadata service unavailable: {str(e)}"
        )

@app.get("/categories")
def get_categories():
    """Proxy to metadata service - Get all categories."""
    try:
        response = requests.get(f"{METADATA_SERVICE_URL}/categories", timeout=10)
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Metadata service unavailable: {str(e)}")

@app.post("/categories")
async def create_category(request: Request):
    """Proxy to metadata service - Create a new category."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    try:
        response = requests.post(
            f"{METADATA_SERVICE_URL}/categories",
            json=body,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Metadata service unavailable: {str(e)}")

@app.delete("/categories/{category_id}")
async def delete_category(category_id: int):
    """Proxy to metadata service - Delete a category."""
    try:
        response = requests.delete(f"{METADATA_SERVICE_URL}/categories/{category_id}", timeout=10)
        return JSONResponse(content=response.json() if response.content else {}, status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Metadata service unavailable: {str(e)}")

@app.post("/upload/init")
async def upload_init_proxy(filename: str = Form(...), total_chunks: int = Form(...)):
    """Proxy to upload service - Initialize chunked upload."""
    try:
        response = requests.post(
            f"{UPLOAD_SERVICE_URL}/upload/init",
            data={"filename": filename, "total_chunks": total_chunks},
            timeout=30
        )
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Upload service unavailable: {str(e)}")

@app.post("/upload/chunk")
async def upload_chunk(upload_id: str = Form(...), index: int = Form(...), file: UploadFile = File(...)):
    """Proxy to upload service - Upload a chunk."""
    try:
        files = {"file": (file.filename, await file.read(), file.content_type)}
        data = {"upload_id": upload_id, "index": index}
        response = requests.post(
            f"{UPLOAD_SERVICE_URL}/upload/chunk",
            data=data,
            files=files,
            timeout=120
        )
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Upload service unavailable: {str(e)}")

@app.post("/upload/complete")
async def upload_complete(upload_id: str = Form(...)):
    """Proxy to upload service - Complete upload."""
    try:
        response = requests.post(
            f"{UPLOAD_SERVICE_URL}/upload/complete",
            data={"upload_id": upload_id},
            timeout=30
        )
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Upload service unavailable: {str(e)}")

@app.get("/speedtest")
async def speedtest():
    """Proxy to upload service - Network speed test."""
    try:
        response = requests.get(f"{UPLOAD_SERVICE_URL}/api/speedtest", timeout=10)
        return StreamingResponse(
            iter([response.content]),
            media_type="application/octet-stream"
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Upload service unavailable: {str(e)}")

@app.post("/transcode/{video_hash}")
async def transcode_trigger(video_hash: str, request: Request):
    """Proxy to transcoding service - Start transcoding."""
    try:
        body = await request.json()
        qualities = body.get('qualities', [])
        network_speed = body.get('networkSpeed', 10)
    except:
        qualities = []
        network_speed = 10
    
    try:
        # Get video info from metadata
        video_response = requests.get(f"{METADATA_SERVICE_URL}/videos/{video_hash}", timeout=10)
        if video_response.status_code != 200:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_data = video_response.json()
        filename = video_data.get("filename")
        
        # Start transcoding
        transcode_payload = {
            "upload_id": video_hash,
            "filename": filename,
            "network_speed": network_speed
        }
        if qualities:
            transcode_payload["qualities"] = qualities
        
        response = requests.post(
            f"{TRANSCODING_SERVICE_URL}/transcode/start",
            json=transcode_payload,
            timeout=10
        )
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

@app.get("/transcode/{video_hash}/status")
def transcode_status(video_hash: str):
    """Proxy to transcoding service - Get transcoding status."""
    try:
        response = requests.get(f"{TRANSCODING_SERVICE_URL}/transcode/status/{video_hash}", timeout=10)
        if response.status_code == 404:
            return JSONResponse(content={"status": "not_found"}, status_code=404)
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Transcoding service unavailable: {str(e)}")

@app.get("/transcode/{video_hash}/qualities")
async def transcode_qualities(video_hash: str):
    """Proxy to streaming service - Get available qualities."""
    try:
        response = requests.get(f"{STREAMING_SERVICE_URL}/stream/{video_hash}/qualities", timeout=10)
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Streaming service unavailable: {str(e)}")

@app.get("/video/{video_hash}")
@app.get("/video/{video_hash}/{asset_path:path}")
async def video_stream(video_hash: str, asset_path: str = None):
    """Proxy to streaming service - Stream video assets."""
    try:
        if asset_path:
            url = f"{STREAMING_SERVICE_URL}/stream/{video_hash}/{asset_path}"
        else:
            # Default to master playlist or original
            url = f"{STREAMING_SERVICE_URL}/stream/{video_hash}/master.m3u8"
        
        response = requests.get(url, timeout=30, stream=True)
        
        # Check if the response is successful
        if response.status_code == 200:
            # Get content type from response
            content_type = response.headers.get('content-type', 'application/octet-stream')
            
            return StreamingResponse(
                response.iter_content(chunk_size=8192),
                media_type=content_type,
                headers={"Accept-Ranges": "bytes"}
            )
        else:
            # HLS not available, fall back to original file
            raise Exception(f"HLS not available: {response.status_code}")
            
    except Exception as e:
        # If HLS streaming fails, try to serve original file directly
        try:
            # Get video info from metadata
            video_response = requests.get(f"{METADATA_SERVICE_URL}/videos/{video_hash}", timeout=10)
            if video_response.status_code != 200:
                raise HTTPException(status_code=404, detail="Video not found")
            
            video_data = video_response.json()
            filename = video_data.get("filename")
            if not filename:
                raise HTTPException(status_code=404, detail="Video file not found")
            
            file_path = os.path.join(ORIGINALS_PATH, video_hash, filename)
            if not os.path.exists(file_path):
                raise HTTPException(status_code=404, detail="Video file not found on disk")
            
            return FileResponse(
                file_path,
                media_type="video/mp4",
                headers={"Accept-Ranges": "bytes"}
            )
        except Exception:
            raise HTTPException(status_code=404, detail=f"Video not found: {str(e)}")

@app.post("/thumbnail/{video_hash}")
async def upload_thumbnail(video_hash: str, file: UploadFile = File(...)):
    """Upload thumbnail for a video."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    try:
        # Get video info
        video_response = requests.get(f"{METADATA_SERVICE_URL}/videos/{video_hash}", timeout=10)
        if video_response.status_code != 200:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Save thumbnail to originals folder
        folder_path = os.path.join(ORIGINALS_PATH, video_hash)
        os.makedirs(folder_path, exist_ok=True)
        
        thumbnail_filename = "thumbnail.jpg"
        file_path = os.path.join(folder_path, thumbnail_filename)
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Update metadata
        requests.put(
            f"{METADATA_SERVICE_URL}/videos/{video_hash}",
            json={"thumbnail_filename": thumbnail_filename},
            timeout=10
        )
        
        return {"message": "Thumbnail uploaded successfully"}
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

@app.get("/thumbnail/{video_hash}")
async def get_thumbnail(video_hash: str):
    """Get thumbnail for a video."""
    try:
        # Get video info
        video_response = requests.get(f"{METADATA_SERVICE_URL}/videos/{video_hash}", timeout=10)
        if video_response.status_code != 200:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_data = video_response.json()
        thumbnail_filename = video_data.get("thumbnail_filename")
        
        if not thumbnail_filename:
            raise HTTPException(status_code=404, detail="Thumbnail not found")
        
        file_path = os.path.join(ORIGINALS_PATH, video_hash, thumbnail_filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Thumbnail file not found")
        
        return FileResponse(file_path, media_type="image/jpeg")
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

# ============================================================================
# ADMIN SERVICE ROUTES (Original admin endpoints)
# ============================================================================

@app.post("/admin/resume_all")
async def resume_all_transcoding():
    """Resume all incomplete transcoding jobs."""
    try:
        response = requests.post(
            f"{TRANSCODING_SERVICE_URL}/transcode/resume",
            timeout=10
        )
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail="Failed to resume transcoding jobs"
            )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Transcoding service unavailable: {str(e)}"
        )

@app.get("/admin/status")
async def get_system_status():
    """Get overall system status including all services."""
    services = {
        "upload_service": UPLOAD_SERVICE_URL,
        "transcoding_service": TRANSCODING_SERVICE_URL,
        "metadata_service": METADATA_SERVICE_URL,
        "streaming_service": STREAMING_SERVICE_URL,
    }
    
    status = {}
    for service_name, service_url in services.items():
        try:
            response = requests.get(f"{service_url}/health", timeout=3)
            if response.status_code == 200:
                status[service_name] = {
                    "status": "healthy",
                    "url": service_url,
                    "response": response.json()
                }
            else:
                status[service_name] = {
                    "status": "unhealthy",
                    "url": service_url,
                    "error": f"HTTP {response.status_code}"
                }
        except requests.RequestException as e:
            status[service_name] = {
                "status": "unavailable",
                "url": service_url,
                "error": str(e)
            }
    
    # Check storage
    storage_status = {
        "originals": os.path.exists(ORIGINALS_PATH),
        "hls": os.path.exists(HLS_PATH),
    }
    
    return {
        "services": status,
        "storage": storage_status,
        "overall": "healthy" if all(s["status"] == "healthy" for s in status.values()) else "degraded"
    }

@app.get("/admin/videos")
async def get_all_videos():
    """Get list of all videos from metadata service."""
    try:
        response = requests.get(f"{METADATA_SERVICE_URL}/videos", timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail="Failed to fetch videos"
            )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Metadata service unavailable: {str(e)}"
        )

@app.delete("/admin/videos/{video_id}")
async def delete_video(video_id: str):
    """Delete a video completely (files and metadata)."""
    errors = []
    
    # Delete from metadata service
    try:
        response = requests.delete(f"{METADATA_SERVICE_URL}/videos/{video_id}", timeout=10)
        if response.status_code not in [200, 404]:
            errors.append(f"Metadata deletion failed: HTTP {response.status_code}")
    except requests.RequestException as e:
        errors.append(f"Metadata service error: {str(e)}")
    
    # Delete original files
    originals_folder = os.path.join(ORIGINALS_PATH, video_id)
    if os.path.exists(originals_folder):
        try:
            shutil.rmtree(originals_folder)
        except Exception as e:
            errors.append(f"Failed to delete originals: {str(e)}")
    
    # Delete HLS files
    hls_folder = os.path.join(HLS_PATH, video_id)
    if os.path.exists(hls_folder):
        try:
            shutil.rmtree(hls_folder)
        except Exception as e:
            errors.append(f"Failed to delete HLS files: {str(e)}")
    
    if errors:
        return {
            "status": "partial_success",
            "errors": errors,
            "video_id": video_id
        }
    
    return {
        "status": "deleted",
        "video_id": video_id
    }

@app.post("/admin/videos/{video_id}/stop")
async def stop_video_transcoding(video_id: str):
    """Stop transcoding for a specific video."""
    try:
        response = requests.put(
            f"{METADATA_SERVICE_URL}/videos/{video_id}/stop",
            timeout=10
        )
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail="Failed to stop transcoding"
            )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Metadata service unavailable: {str(e)}"
        )

@app.post("/admin/videos/{video_id}/resume")
async def resume_video_transcoding(video_id: str):
    """Resume transcoding for a specific video."""
    try:
        # First, resume the flag in metadata
        response = requests.put(
            f"{METADATA_SERVICE_URL}/videos/{video_id}/resume",
            timeout=10
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="Failed to resume transcoding flag"
            )
        
        # Get video info to trigger transcoding
        video_response = requests.get(f"{METADATA_SERVICE_URL}/videos/{video_id}", timeout=10)
        if video_response.status_code != 200:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_data = video_response.json()
        filename = video_data.get("filename")
        
        # Trigger transcoding
        transcode_response = requests.post(
            f"{TRANSCODING_SERVICE_URL}/transcode/start",
            json={"upload_id": video_id, "filename": filename, "network_speed": 10.0},
            timeout=10
        )
        
        return {
            "status": "resumed",
            "video_id": video_id,
            "transcoding_started": transcode_response.status_code == 200
        }
    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Service unavailable: {str(e)}"
        )

@app.get("/admin/videos/{video_id}/status")
async def get_video_status(video_id: str):
    """Get comprehensive status for a specific video."""
    result = {
        "video_id": video_id,
        "metadata": None,
        "transcoding": None,
        "files": {
            "originals": False,
            "hls": False
        }
    }
    
    # Get metadata
    try:
        response = requests.get(f"{METADATA_SERVICE_URL}/videos/{video_id}", timeout=5)
        if response.status_code == 200:
            result["metadata"] = response.json()
    except requests.RequestException:
        pass
    
    # Get transcoding status
    try:
        response = requests.get(f"{TRANSCODING_SERVICE_URL}/transcode/status/{video_id}", timeout=5)
        if response.status_code == 200:
            result["transcoding"] = response.json()
    except requests.RequestException:
        pass
    
    # Check files
    result["files"]["originals"] = os.path.exists(os.path.join(ORIGINALS_PATH, video_id))
    result["files"]["hls"] = os.path.exists(os.path.join(HLS_PATH, video_id))
    
    return result

# ============================================================================
# COURSE SERVICE PROXY ROUTES
# ============================================================================

COURSE_SERVICE_URL = "http://localhost:8006"

@app.get("/courses")
def get_courses():
    """Proxy to course service - Get all courses."""
    try:
        response = requests.get(f"{COURSE_SERVICE_URL}/api/courses", timeout=10)
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Course service unavailable: {str(e)}")

@app.post("/courses")
async def create_course(request: Request):
    """Proxy to course service - Create a new course."""
    try:
        body = await request.json()
        response = requests.post(f"{COURSE_SERVICE_URL}/api/courses", json=body, timeout=10)
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Course service unavailable: {str(e)}")

@app.post("/courses/{course_id}/thumbnail")
async def upload_course_thumbnail_proxy(course_id: int, file: UploadFile = File(...)):
    """Proxy to course service - Upload thumbnail for course."""
    try:
        files = {"file": (file.filename, await file.read(), file.content_type)}
        response = requests.post(
            f"{COURSE_SERVICE_URL}/api/courses/{course_id}/thumbnail",
            files=files,
            timeout=30
        )
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Course service unavailable: {str(e)}")

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "admin_service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
