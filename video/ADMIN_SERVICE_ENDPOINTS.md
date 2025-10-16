# Admin Service - Course Video Endpoints

## Overview
All course video endpoints from the course service have been registered in the admin service as proxy routes. This allows the frontend to access course video functionality through the admin service gateway.

## Registered Endpoints

### API-Prefixed Routes (for Frontend)
These routes are used when the frontend calls `NEXT_PUBLIC_API_URL/api/...`

#### 1. Create Course Video
- **Route**: `POST /api/course-videos`
- **Description**: Create video metadata in courses database
- **Proxies to**: `POST http://localhost:8006/course-videos`
- **Request Body**:
  ```json
  {
    "hash": "video_hash_here",
    "filename": "video.mp4",
    "course_id": 1
  }
  ```
- **Response**:
  ```json
  {
    "id": 1,
    "hash": "video_hash_here"
  }
  ```

#### 2. Get All Videos for a Course
- **Route**: `GET /api/course-videos/course/{course_id}`
- **Description**: Get all videos for a specific course from courses database
- **Proxies to**: `GET http://localhost:8006/course-videos/course/{course_id}`
- **Example**: `GET /api/course-videos/course/1`
- **Response**:
  ```json
  {
    "videos": [
      {
        "id": 1,
        "hash": "abc123",
        "filename": "video1.mp4",
        "title": "Introduction",
        "description": "Course intro video",
        "category": "education",
        "status": "draft",
        "thumbnail_filename": "thumb.jpg",
        "original_resolution": "1920x1080",
        "original_quality_label": "1080p",
        "stopped": 0,
        "transcoding_status": "completed",
        "created_at": "2025-10-16T10:00:00",
        "scheduled_at": null,
        "course_id": 1
      }
    ]
  }
  ```

#### 3. Get Specific Video by Hash
- **Route**: `GET /api/course-videos/{hash}`
- **Description**: Get a specific video by hash from courses database
- **Proxies to**: `GET http://localhost:8006/course-videos/{hash}`
- **Example**: `GET /api/course-videos/abc123`
- **Response**:
  ```json
  {
    "id": 1,
    "hash": "abc123",
    "filename": "video1.mp4",
    "title": "Introduction",
    "description": "Course intro video",
    "category": "education",
    "status": "draft",
    "thumbnail_filename": "thumb.jpg",
    "original_resolution": "1920x1080",
    "original_quality_label": "1080p",
    "stopped": 0,
    "transcoding_status": "completed",
    "created_at": "2025-10-16T10:00:00",
    "scheduled_at": null,
    "course_id": 1
  }
  ```

#### 4. Update Video Metadata
- **Route**: `PATCH /api/course-videos/{hash}`
- **Description**: Update a video's metadata in courses database
- **Proxies to**: `PATCH http://localhost:8006/course-videos/{hash}`
- **Example**: `PATCH /api/course-videos/abc123`
- **Request Body** (all fields optional):
  ```json
  {
    "title": "Updated Title",
    "description": "Updated description",
    "category": "tutorial",
    "status": "published",
    "thumbnail_filename": "new_thumb.jpg",
    "transcoding_status": "completed"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Video updated successfully",
    "hash": "abc123"
  }
  ```

#### 5. Delete Video Metadata
- **Route**: `DELETE /api/course-videos/{hash}`
- **Description**: Delete a video from courses database
- **Proxies to**: `DELETE http://localhost:8006/course-videos/{hash}`
- **Example**: `DELETE /api/course-videos/abc123`
- **Response**:
  ```json
  {
    "message": "Video deleted successfully"
  }
  ```

#### 6. Get Videos by Course (Alternative Route)
- **Route**: `GET /api/videos/course/{course_id}`
- **Description**: Get all videos for a specific course (alternative route)
- **Proxies to**: `GET http://localhost:8006/course-videos/course/{course_id}`
- **Example**: `GET /api/videos/course/1`
- **Response**: Same as endpoint #2

---

### Non-API-Prefixed Routes (Direct Admin Service Calls)
These routes are used when calling the admin service directly without the `/api/` prefix.

#### 1. Create Course Video
- **Route**: `POST /course-videos`
- **Proxies to**: `POST http://localhost:8006/course-videos`

#### 2. Get All Videos for a Course
- **Route**: `GET /videos/course/{course_id}`
- **Proxies to**: `GET http://localhost:8006/course-videos/course/{course_id}`

#### 3. Get All Videos for a Course (Alternative)
- **Route**: `GET /course-videos/course/{course_id}`
- **Proxies to**: `GET http://localhost:8006/course-videos/course/{course_id}`

#### 4. Get Specific Video by Hash
- **Route**: `GET /course-videos/{hash}`
- **Proxies to**: `GET http://localhost:8006/course-videos/{hash}`

#### 5. Update Video Metadata
- **Route**: `PATCH /course-videos/{hash}`
- **Proxies to**: `PATCH http://localhost:8006/course-videos/{hash}`

#### 6. Delete Video Metadata
- **Route**: `DELETE /course-videos/{hash}`
- **Proxies to**: `DELETE http://localhost:8006/course-videos/{hash}`

---

## Usage Examples

### Frontend (React/Next.js)

#### Fetch Course Videos
```javascript
// Using API-prefixed route
const fetchCourseVideos = async (courseId) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/course-videos/course/${courseId}`);
  const data = await response.json();
  return data.videos;
};

// Alternative route
const fetchCourseVideosAlt = async (courseId) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/course/${courseId}`);
  const data = await response.json();
  return data.videos;
};
```

#### Update Video Metadata
```javascript
const updateVideoMetadata = async (hash, updates) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/course-videos/${hash}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  return await response.json();
};
```

#### Delete Video
```javascript
const deleteVideo = async (hash) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/course-videos/${hash}`, {
    method: 'DELETE',
  });
  return await response.json();
};
```

### cURL Examples

#### Get Course Videos
```bash
curl http://localhost:8005/api/course-videos/course/1
```

#### Update Video
```bash
curl -X PATCH http://localhost:8005/api/course-videos/abc123 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "status": "published"}'
```

#### Delete Video
```bash
curl -X DELETE http://localhost:8005/api/course-videos/abc123
```

---

## Service Architecture

```
Frontend
    ↓
Admin Service (Port 8005)
    ↓ (Proxy)
Course Service (Port 8006)
    ↓
courses.db → course_videos table
```

---

## Summary

✅ **Total Endpoints Registered**: 12 (6 API-prefixed + 6 non-prefixed)

✅ **All CRUD Operations Supported**:
- Create (POST)
- Read (GET)
- Update (PATCH)
- Delete (DELETE)

✅ **Multiple Route Patterns**:
- `/api/course-videos/*` - Standard course video routes
- `/api/videos/course/{id}` - Alternative route for fetching by course

✅ **Ready for Frontend Integration**: All endpoints are accessible through the admin service gateway

---

**Note**: The admin service acts as a proxy/gateway, forwarding all requests to the course service. This provides a single entry point for the frontend and allows for centralized request handling, logging, and authentication if needed.

