# Video Backend Microservices

This is a microservices architecture for a video processing platform. The monolithic FastAPI backend has been refactored into 5 independent services that communicate via REST APIs.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Upload Service  │────▶│Metadata Service │◀────│Transcoding Svc  │
│   Port 8001     │     │   Port 8003     │     │   Port 8002     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         │              ┌────────▼────────┐              │
         │              │  Shared Storage │              │
         │              │  - originals/   │              │
         └─────────────▶│  - hls/         │◀─────────────┘
                        │  - videos.db    │
                        └────────┬────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
         ┌───────▼────────┐           ┌─────────▼─────────┐
         │Streaming Svc   │           │   Admin Service   │
         │  Port 8004     │           │    Port 8005      │
         └────────────────┘           └───────────────────┘
```

## Services

### 1. **Upload Service** (Port 8001)
Handles chunked video uploads and file assembly.

**Endpoints:**
- `POST /upload/init` - Initialize chunked upload
- `POST /upload/chunk` - Upload a single chunk
- `POST /upload/complete` - Finalize upload and trigger transcoding
- `GET /api/speedtest` - Network speed test endpoint
- `GET /health` - Health check

**Storage:** `shared_storage/originals/{upload_id}/`

### 2. **Transcoding Service** (Port 8002)
Processes videos using FFmpeg to generate HLS streams in multiple qualities.

**Endpoints:**
- `POST /transcode/start` - Start transcoding job
- `GET /transcode/status/{upload_id}` - Get transcoding progress
- `POST /transcode/resume` - Resume incomplete transcoding jobs
- `GET /health` - Health check

**Quality Presets:**
- 1080p (1920x1080, 5.8 Mbps)
- 720p (1280x720, 3.5 Mbps)
- 480p (854x480, 1.6 Mbps)
- 360p (640x360, 900 Kbps)

**Storage:** `shared_storage/hls/{upload_id}/{quality}/`

### 3. **Metadata Service** (Port 8003)
Manages video metadata using SQLite database.

**Endpoints:**
- `POST /videos` - Create video entry
- `GET /videos` - List all videos
- `GET /videos/{hash}` - Get video metadata
- `PUT /videos/{hash}` - Update video metadata
- `DELETE /videos/{hash}` - Delete video entry
- `GET /videos/{hash}/stopped` - Check if transcoding stopped
- `PUT /videos/{hash}/stop` - Stop transcoding
- `PUT /videos/{hash}/resume` - Resume transcoding flag
- `GET /health` - Health check

**Storage:** `shared_storage/videos.db`

### 4. **Streaming Service** (Port 8004)
Serves HLS manifests and video segments.

**Endpoints:**
- `GET /stream/{video_id}/master.m3u8` - Master playlist
- `GET /stream/{video_id}/{quality}/playlist.m3u8` - Quality playlist
- `GET /stream/{video_id}/{quality}/{segment}` - HLS segment
- `GET /stream/{video_id}/original` - Original video file
- `GET /stream/{video_id}/qualities` - Available qualities
- `GET /stream/{video_id}/{asset_path:path}` - Generic asset endpoint
- `GET /health` - Health check

### 5. **Admin Service** (Port 8005)
Administrative operations and system monitoring.

**Endpoints:**
- `POST /admin/resume_all` - Resume all incomplete transcoding
- `GET /admin/status` - System health status
- `GET /admin/videos` - List all videos
- `DELETE /admin/videos/{video_id}` - Delete video completely
- `POST /admin/videos/{video_id}/stop` - Stop video transcoding
- `POST /admin/videos/{video_id}/resume` - Resume video transcoding
- `GET /admin/videos/{video_id}/status` - Comprehensive video status
- `GET /health` - Health check

## Setup Instructions

### Prerequisites

1. **Python 3.8+** installed
2. **FFmpeg** installed and available in PATH
   - Windows: Download from https://ffmpeg.org/download.html
   - Add FFmpeg to system PATH
3. **Git** (optional, for cloning)

### Installation

1. **Navigate to microservices directory:**
   ```powershell
   cd backend\microservices
   ```

2. **Install dependencies for each service:**
   ```powershell
   # Install for all services
   cd upload_service
   pip install -r requirements.txt
   cd ..\metadata_service
   pip install -r requirements.txt
   cd ..\transcoding_service
   pip install -r requirements.txt
   cd ..\streaming_service
   pip install -r requirements.txt
   cd ..\admin_service
   pip install -r requirements.txt
   cd ..
   ```

   Or install all at once:
   ```powershell
   pip install fastapi==0.104.1 uvicorn==0.24.0 python-multipart==0.0.6 requests==2.31.0 sqlalchemy==2.0.23
   ```

3. **Verify FFmpeg installation:**
   ```powershell
   ffmpeg -version
   ffprobe -version
   ```

## Running the Services

### Option 1: Automated Startup (Recommended)

Run the PowerShell script that starts all services:

```powershell
.\start_all_services.ps1
```

This will open 5 separate PowerShell windows, one for each service.

### Option 2: Manual Startup

Start each service in a separate terminal:

```powershell
# Terminal 1 - Metadata Service
cd metadata_service
python -m uvicorn main:app --host 0.0.0.0 --port 8003

# Terminal 2 - Upload Service
cd upload_service
python -m uvicorn main:app --host 0.0.0.0 --port 8001

# Terminal 3 - Transcoding Service
cd transcoding_service
python -m uvicorn main:app --host 0.0.0.0 --port 8002

# Terminal 4 - Streaming Service
cd streaming_service
python -m uvicorn main:app --host 0.0.0.0 --port 8004

# Terminal 5 - Admin Service
cd admin_service
python -m uvicorn main:app --host 0.0.0.0 --port 8005
```

## Stopping the Services

To stop all running services, use the stop script:

```powershell
.\stop_all_services.ps1
```

This will automatically find and stop all microservice processes and close their PowerShell windows.

## Development

### Git Ignore

The `.gitignore` file excludes:
- Python cache files (`__pycache__/`, `*.pyc`)
- Virtual environments (`venv/`, `env/`)
- Build artifacts and distributions
- IDE files (`.vscode/`, `.idea/`)
- Temporary files and logs
- Video files and test data

### Dependencies

Each service has its own `requirements.txt`. To install dependencies for all services:

```powershell
.\install_dependencies.ps1
```

## Testing the Services

### Health Check
```powershell
# Check all services are running
Invoke-RestMethod -Uri http://localhost:8001/health
Invoke-RestMethod -Uri http://localhost:8002/health
Invoke-RestMethod -Uri http://localhost:8003/health
Invoke-RestMethod -Uri http://localhost:8004/health
Invoke-RestMethod -Uri http://localhost:8005/health
```

### Admin Status Dashboard
```powershell
Invoke-RestMethod -Uri http://localhost:8005/admin/status | ConvertTo-Json -Depth 10
```

### API Documentation

Each service provides interactive API documentation via Swagger UI:

- Upload Service: http://localhost:8001/docs
- Transcoding Service: http://localhost:8002/docs
- Metadata Service: http://localhost:8003/docs
- Streaming Service: http://localhost:8004/docs
- Admin Service: http://localhost:8005/docs

## Workflow Example

### 1. Upload a Video

```powershell
# Initialize upload
$response = Invoke-RestMethod -Uri "http://localhost:8001/upload/init" -Method Post -Form @{
    filename = "video.mp4"
    total_chunks = 1
}
$uploadId = $response.upload_id

# Upload chunk (for single file, just upload as chunk 0)
$form = @{
    upload_id = $uploadId
    index = 0
    file = Get-Item "path\to\video.mp4"
}
Invoke-RestMethod -Uri "http://localhost:8001/upload/chunk" -Method Post -Form $form

# Complete upload (triggers transcoding automatically)
Invoke-RestMethod -Uri "http://localhost:8001/upload/complete" -Method Post -Form @{
    upload_id = $uploadId
}
```

### 2. Check Transcoding Status

```powershell
Invoke-RestMethod -Uri "http://localhost:8002/transcode/status/$uploadId" | ConvertTo-Json -Depth 10
```

### 3. Stream the Video

Once transcoding is complete, access the video:

```
http://localhost:8004/stream/{upload_id}/master.m3u8
```

Use in HTML5 video player with HLS.js:
```html
<video id="video" controls></video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<script>
  const video = document.getElementById('video');
  const hls = new Hls();
  hls.loadSource('http://localhost:8004/stream/{upload_id}/master.m3u8');
  hls.attachMedia(video);
</script>
```

## Directory Structure

```
microservices/
├── .gitignore               # Git ignore rules
├── shared_storage/
│   ├── originals/          # Uploaded video files
│   ├── hls/                # Transcoded HLS streams
│   └── videos.db           # SQLite database
├── upload_service/
│   ├── main.py
│   └── requirements.txt
├── metadata_service/
│   ├── main.py
│   ├── models.py
│   └── requirements.txt
├── transcoding_service/
│   ├── main.py
│   └── requirements.txt
├── streaming_service/
│   ├── main.py
│   └── requirements.txt
├── admin_service/
│   ├── main.py
│   └── requirements.txt
├── start_all_services.ps1   # Start all services
├── stop_all_services.ps1    # Stop all services and close PowerShell windows
├── install_dependencies.ps1 # Install all dependencies
├── README.md
├── ARCHITECTURE.md
├── GATEWAY_ROUTES.md
├── QUICKSTART.md
└── ROUTE_FIX.md
```

## Troubleshooting

### Services won't start
- Ensure ports 8001-8005 are not in use
- Check Python and pip are installed: `python --version`
- Verify all dependencies are installed

### FFmpeg errors
- Ensure FFmpeg is in PATH: `ffmpeg -version`
- Windows: Add FFmpeg bin folder to system PATH
- Restart terminals after adding to PATH

### Database errors
- The SQLite database will be created automatically in `shared_storage/videos.db`
- Ensure write permissions for `shared_storage/` directory

### Services can't communicate
- Ensure all services are running on their designated ports
- Check firewall settings
- Verify URLs in service configuration match your setup

## Production Considerations

For production deployment:

1. **Use environment variables** for service URLs and configuration
2. **Add authentication/authorization** to endpoints
3. **Use a process manager** like systemd, supervisor, or Docker
4. **Add logging and monitoring** (e.g., ELK stack, Prometheus)
5. **Use a reverse proxy** (nginx) for load balancing
6. **Implement rate limiting** and request validation
7. **Use a message queue** (RabbitMQ, Redis) for async processing
8. **Replace SQLite** with PostgreSQL or MySQL
9. **Add distributed tracing** (Jaeger, Zipkin)
10. **Implement circuit breakers** for service resilience

## Migration from Monolithic

To migrate from the existing monolithic `backend/main.py`:

1. **Data Migration:**
   - Copy `videos.db` to `microservices/shared_storage/`
   - Copy `videos/` folder contents to `microservices/shared_storage/originals/`

2. **Frontend Updates:**
   Update API endpoints in your frontend:
   - Upload endpoints → `http://localhost:8001`
   - Streaming endpoints → `http://localhost:8004`
   - Admin endpoints → `http://localhost:8005`

3. **Service Discovery:**
   Consider using service discovery (Consul, etcd) if deploying in containers

## License

This microservices architecture maintains compatibility with your existing video processing platform.
