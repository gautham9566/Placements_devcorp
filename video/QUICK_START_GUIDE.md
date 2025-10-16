# Quick Start Guide - Video Metadata Storage

## 🚀 Getting Started

### Step 1: Restart Services
The changes require restarting all microservices to create the new database table and load the updated code.

```powershell
# Navigate to microservices directory
cd microservices

# Stop all running services
.\stop_all_services.ps1

# Start all services
.\start_all_services.ps1
```

### Step 2: Verify Services are Running
Check that all services started successfully:
- Upload Service (port 8001)
- Transcoding Service (port 8002)
- Metadata Service (port 8003)
- Streaming Service (port 8004)
- Admin Service (port 8005)
- Course Service (port 8006)

### Step 3: Test the Implementation

#### Test A: Upload Video in Course Context
1. Navigate to a course in the frontend
2. Upload a video (the course_id will be automatically included)
3. The video metadata should be stored in `courses.db`

#### Test B: Upload Video in Admin Page
1. Navigate to the admin upload page
2. Upload a video (no course_id)
3. The video metadata should be stored in `videos.db`

## 🔍 Verification

### Check Database Contents

#### Check courses.db (Course Videos)
```powershell
cd microservices/shared_storage/databases
sqlite3 courses.db

# View all course videos
SELECT * FROM course_videos;

# View course videos for a specific course
SELECT * FROM course_videos WHERE course_id = 1;

# Exit sqlite
.exit
```

#### Check videos.db (Admin Videos)
```powershell
cd microservices/shared_storage
sqlite3 videos.db

# View all admin videos (no course association)
SELECT * FROM videos WHERE course_id IS NULL;

# View all videos
SELECT * FROM videos;

# Exit sqlite
.exit
```

### Check via API

#### Get Course Videos
```bash
# Get all videos for course ID 1
curl http://localhost:8005/videos/course/1

# Or use browser/Postman
http://localhost:8005/videos/course/1
```

#### Get Admin Videos
```bash
# Get all admin videos
curl http://localhost:8005/videos

# Or use browser/Postman
http://localhost:8005/videos
```

## 📊 Understanding the Flow

### When you upload a video in a COURSE:
```
Frontend (course page)
    ↓ (includes course_id)
Upload Service
    ↓ (detects course_id)
Course Service (/course-videos endpoint)
    ↓
courses.db → course_videos table
```

### When you upload a video in ADMIN page:
```
Frontend (admin page)
    ↓ (no course_id)
Upload Service
    ↓ (no course_id detected)
Metadata Service (/videos endpoint)
    ↓
videos.db → videos table
```

## 🛠️ Troubleshooting

### Issue: Video not appearing in database

**Check 1: Service Logs**
Look at the upload service console output for errors during upload completion.

**Check 2: Course ID**
Verify the course_id is being sent correctly:
- Course uploads: Should have course_id
- Admin uploads: Should NOT have course_id

**Check 3: Database Connection**
Ensure the databases exist:
- `microservices/shared_storage/databases/courses.db`
- `microservices/shared_storage/videos.db`

### Issue: Table doesn't exist

**Solution**: The `course_videos` table is created automatically when the course service starts. If it doesn't exist:

```powershell
# Restart the course service
cd microservices
.\stop_all_services.ps1
.\start_all_services.ps1
```

Or manually create it:
```sql
sqlite3 microservices/shared_storage/databases/courses.db

CREATE TABLE IF NOT EXISTS course_videos (
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

### Issue: 500 Error on Upload

**Check**: Course service is running on port 8006
```powershell
# Test course service health
curl http://localhost:8006/health
```

**Check**: Upload service can reach course service
Look for connection errors in upload service logs.

## 📝 Common Tasks

### View All Course Videos
```sql
sqlite3 microservices/shared_storage/databases/courses.db
SELECT cv.*, c.title as course_title 
FROM course_videos cv 
JOIN courses c ON cv.course_id = c.id;
```

### View All Admin Videos
```sql
sqlite3 microservices/shared_storage/videos.db
SELECT * FROM videos WHERE course_id IS NULL;
```

### Count Videos by Type
```sql
-- Course videos
sqlite3 microservices/shared_storage/databases/courses.db
SELECT COUNT(*) as course_video_count FROM course_videos;

-- Admin videos
sqlite3 microservices/shared_storage/videos.db
SELECT COUNT(*) as admin_video_count FROM videos WHERE course_id IS NULL;
```

## 🎯 Expected Behavior

### ✅ Correct Behavior
- Course video uploads → `courses.db` → `course_videos` table
- Admin video uploads → `videos.db` → `videos` table
- Each video has metadata in only ONE database
- Course videos have a valid `course_id` foreign key

### ❌ Incorrect Behavior
- Course videos appearing in `videos.db`
- Admin videos appearing in `course_videos` table
- Duplicate entries in both databases
- Missing `course_id` in course videos

## 📞 Support

If you encounter issues:
1. Check service logs in the PowerShell windows
2. Verify database contents using sqlite3
3. Test API endpoints directly with curl or Postman
4. Review `IMPLEMENTATION_SUMMARY.md` for detailed information

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Course videos appear in `courses.db` → `course_videos` table
- ✅ Admin videos appear in `videos.db` → `videos` table
- ✅ No errors in service logs during upload
- ✅ Videos can be retrieved via appropriate API endpoints
- ✅ Frontend displays videos correctly in both contexts

---

**Ready to test?** Start with Step 1 above! 🚀

