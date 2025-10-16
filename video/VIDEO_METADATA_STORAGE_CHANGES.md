# Video Metadata Storage Changes

## Overview
This document describes the changes made to store video metadata in different databases based on the upload context.

## Changes Summary

### Previous Behavior
- All video metadata was stored in `videos.db` (metadata_service)
- Videos uploaded in courses had a `course_id` field set
- Videos uploaded in admin page had `course_id = NULL`

### New Behavior
- **Videos uploaded in courses** (with `course_id`): Metadata stored in `courses.db` (course_service)
- **Videos uploaded in admin page** (without `course_id`): Metadata stored in `videos.db` (metadata_service)

## Modified Files

### 1. Course Service (`microservices/course_service/models.py`)
**Added:**
- New `CourseVideo` model/table in the courses database
- Fields: id, hash, filename, title, description, category, status, thumbnail_filename, original_resolution, original_quality_label, stopped, transcoding_status, created_at, scheduled_at, course_id
- `course_id` is required (NOT NULL) for course videos

### 2. Course Service (`microservices/course_service/main.py`)
**Added:**
- `CourseVideoCreate` and `CourseVideoUpdate` Pydantic models
- New endpoints:
  - `POST /course-videos` - Create video metadata in courses database
  - `GET /course-videos/course/{course_id}` - Get all videos for a course
  - `GET /course-videos/{hash}` - Get specific video by hash
  - `PATCH /course-videos/{hash}` - Update video metadata
  - `DELETE /course-videos/{hash}` - Delete video metadata

### 3. Upload Service (`microservices/upload_service/main.py`)
**Modified:**
- Added `COURSE_SERVICE_URL` constant
- Updated `upload_complete` endpoint logic:
  - If `course_id` is present and valid: POST to `COURSE_SERVICE_URL/course-videos`
  - If `course_id` is absent/None: POST to `METADATA_SERVICE_URL/videos` (existing behavior)

### 4. Admin Service (`microservices/admin_service/main.py`)
**Added:**
- Proxy endpoints for course video operations:
  - `GET /videos/course/{course_id}` - Proxy to course service
  - `GET /course-videos/{hash}` - Proxy to course service
  - `PATCH /course-videos/{hash}` - Proxy to course service
  - `DELETE /course-videos/{hash}` - Proxy to course service

## Database Schema

### courses.db - New `course_videos` Table
```sql
CREATE TABLE course_videos (
    id INTEGER PRIMARY KEY,
    hash TEXT UNIQUE NOT NULL,
    filename TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    status TEXT,
    thumbnail_filename TEXT,
    original_resolution TEXT,
    original_quality_label TEXT,
    stopped INTEGER DEFAULT 0,
    transcoding_status TEXT DEFAULT 'pending',
    created_at DATETIME,
    scheduled_at TEXT,
    course_id INTEGER NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);
```

### videos.db - Existing `videos` Table
- Remains unchanged
- Used for admin page uploads (videos without course association)

## Upload Flow

### Course Upload Flow
1. Frontend uploads video with `course_id` parameter
2. Upload service receives `course_id` in init/chunk/complete endpoints
3. On complete, upload service detects `course_id` is present
4. Upload service POSTs metadata to `COURSE_SERVICE_URL/course-videos`
5. Course service stores metadata in `courses.db` → `course_videos` table

### Admin Upload Flow
1. Frontend uploads video without `course_id` parameter
2. Upload service receives no `course_id` (or None/empty)
3. On complete, upload service detects `course_id` is absent
4. Upload service POSTs metadata to `METADATA_SERVICE_URL/videos`
5. Metadata service stores metadata in `videos.db` → `videos` table

## API Endpoints

### Course Videos (courses.db)
- `POST /course-videos` - Create video metadata
- `GET /course-videos/course/{course_id}` - List videos for course
- `GET /course-videos/{hash}` - Get video by hash
- `PATCH /course-videos/{hash}` - Update video metadata
- `DELETE /course-videos/{hash}` - Delete video metadata

### Admin Videos (videos.db)
- `POST /videos` - Create video metadata (existing)
- `GET /videos` - List all videos (existing)
- `GET /videos/{hash}` - Get video by hash (existing)
- `PATCH /videos/{hash}` - Update video metadata (existing)
- `DELETE /videos/{hash}` - Delete video metadata (existing)

## Frontend Integration

### Fetching Course Videos
```javascript
// Get videos for a specific course (from courses.db)
const response = await fetch(`${API_URL}/videos/course/${courseId}`);
const data = await response.json();
const videos = data.videos; // Array of course videos
```

### Fetching Admin Videos
```javascript
// Get all admin videos (from videos.db)
const response = await fetch(`${API_URL}/videos`);
const data = await response.json();
const videos = data.videos; // Array of admin videos
```

## Migration Notes

### Existing Data
- Existing videos in `videos.db` with `course_id` set will remain there
- No automatic migration is performed
- New course uploads will go to `courses.db`
- Admin uploads continue to go to `videos.db`

### Future Considerations
- Consider migrating existing course videos from `videos.db` to `courses.db`
- Update frontend to query both databases if needed during transition
- Add data migration script if full migration is desired

## Testing

### Test Course Upload
1. Upload a video through the course interface with a valid `course_id`
2. Verify metadata is stored in `courses.db` → `course_videos` table
3. Verify video can be retrieved via `/videos/course/{course_id}`

### Test Admin Upload
1. Upload a video through the admin page without `course_id`
2. Verify metadata is stored in `videos.db` → `videos` table
3. Verify video can be retrieved via `/videos`

## Benefits

1. **Data Isolation**: Course-related video metadata is isolated in the courses database
2. **Better Organization**: Clear separation between course content and standalone admin videos
3. **Scalability**: Each database can be optimized for its specific use case
4. **Data Integrity**: Foreign key constraint ensures course videos are linked to valid courses
5. **Cleaner Architecture**: Course service owns all course-related data including video metadata

