# Video Metadata Storage Implementation Summary

## ✅ Changes Completed

I've successfully implemented the requested feature to store video metadata in different databases based on the upload context:

- **Videos uploaded in courses** → Stored in `courses.db`
- **Videos uploaded in admin page** → Stored in `videos.db`

## 📋 Files Modified

### 1. **Course Service - Database Model** (`microservices/course_service/models.py`)
- ✅ Added new `CourseVideo` table/model to store course video metadata
- ✅ Includes all necessary fields: hash, filename, title, description, category, status, thumbnail, transcoding status, etc.
- ✅ `course_id` is required (NOT NULL) with foreign key to courses table

### 2. **Course Service - API Endpoints** (`microservices/course_service/main.py`)
- ✅ Added `CourseVideoCreate` and `CourseVideoUpdate` Pydantic models
- ✅ Added 5 new endpoints:
  - `POST /course-videos` - Create video metadata
  - `GET /course-videos/course/{course_id}` - Get all videos for a course
  - `GET /course-videos/{hash}` - Get specific video
  - `PATCH /course-videos/{hash}` - Update video metadata
  - `DELETE /course-videos/{hash}` - Delete video metadata

### 3. **Upload Service** (`microservices/upload_service/main.py`)
- ✅ Added `COURSE_SERVICE_URL` configuration
- ✅ Modified `upload_complete` endpoint to route metadata based on `course_id`:
  - If `course_id` present → POST to course service (`/course-videos`)
  - If `course_id` absent → POST to metadata service (`/videos`)

### 4. **Admin Service - Proxy Routes** (`microservices/admin_service/main.py`)
- ✅ Added proxy endpoints for course video operations:
  - `GET /videos/course/{course_id}` - Get course videos
  - `GET /course-videos/{hash}` - Get specific course video
  - `PATCH /course-videos/{hash}` - Update course video
  - `DELETE /course-videos/{hash}` - Delete course video

## 🔄 How It Works

### Course Upload Flow
```
1. User uploads video in course context (with course_id)
   ↓
2. Upload service receives course_id parameter
   ↓
3. On upload complete, upload service detects course_id
   ↓
4. Upload service → POST to course_service/course-videos
   ↓
5. Video metadata stored in courses.db → course_videos table
```

### Admin Upload Flow
```
1. User uploads video in admin page (no course_id)
   ↓
2. Upload service receives no course_id
   ↓
3. On upload complete, upload service detects no course_id
   ↓
4. Upload service → POST to metadata_service/videos
   ↓
5. Video metadata stored in videos.db → videos table
```

## 📊 Database Schema

### New Table: `course_videos` (in courses.db)
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

### Existing Table: `videos` (in videos.db)
- Remains unchanged
- Used for admin page uploads

## 🧪 Testing the Implementation

### Test 1: Course Video Upload
1. Start all services: `.\start_all_services.ps1`
2. Upload a video through the course interface with a course_id
3. Check `courses.db` → `course_videos` table for the metadata
4. Verify via API: `GET /videos/course/{course_id}`

### Test 2: Admin Video Upload
1. Upload a video through the admin page (no course_id)
2. Check `videos.db` → `videos` table for the metadata
3. Verify via API: `GET /videos`

### Manual Database Check
```powershell
# Check courses.db
cd microservices/shared_storage/databases
sqlite3 courses.db
SELECT * FROM course_videos;

# Check videos.db
cd ..
sqlite3 videos.db
SELECT * FROM videos WHERE course_id IS NULL;
```

## 🔍 API Endpoints Reference

### Course Videos (courses.db)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/course-videos` | Create video metadata |
| GET | `/course-videos/course/{course_id}` | List videos for course |
| GET | `/course-videos/{hash}` | Get video by hash |
| PATCH | `/course-videos/{hash}` | Update video metadata |
| DELETE | `/course-videos/{hash}` | Delete video metadata |

### Admin Videos (videos.db)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/videos` | Create video metadata |
| GET | `/videos` | List all videos |
| GET | `/videos/{hash}` | Get video by hash |
| PATCH | `/videos/{hash}` | Update video metadata |
| DELETE | `/videos/{hash}` | Delete video metadata |

## 📝 Important Notes

### Existing Data
- Existing videos in `videos.db` with `course_id` set will remain there
- No automatic migration is performed
- **New course uploads** will go to `courses.db`
- **Admin uploads** continue to go to `videos.db`

### Frontend Integration
The frontend doesn't need changes for the upload flow (it already sends `course_id`). However, if you want to fetch course videos specifically from the courses database:

```javascript
// Fetch course videos from courses.db
const response = await fetch(`${API_URL}/videos/course/${courseId}`);
const data = await response.json();
const videos = data.videos;
```

### Migration Considerations
If you want to migrate existing course videos from `videos.db` to `courses.db`, you would need to:
1. Create a migration script
2. Query videos with `course_id` from `videos.db`
3. Insert them into `course_videos` table in `courses.db`
4. Delete from `videos.db` (optional)

## ✨ Benefits

1. **Data Isolation**: Course video metadata is isolated in the courses database
2. **Better Organization**: Clear separation between course content and standalone videos
3. **Scalability**: Each database can be optimized independently
4. **Data Integrity**: Foreign key ensures course videos link to valid courses
5. **Cleaner Architecture**: Course service owns all course-related data

## 🚀 Next Steps

1. **Restart Services**: Run `.\stop_all_services.ps1` then `.\start_all_services.ps1` to apply changes
2. **Test Upload**: Try uploading a video in both contexts (course and admin)
3. **Verify Database**: Check both databases to confirm correct storage
4. **Optional**: Create a migration script if you want to move existing course videos

## 📚 Additional Documentation

See `VIDEO_METADATA_STORAGE_CHANGES.md` for detailed technical documentation.

---

**Status**: ✅ Implementation Complete
**Date**: 2025-10-16

