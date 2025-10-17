from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from models import get_db, Course, Section, Lesson, CourseVideo
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
import shutil
import uuid
import requests
import logging

app = FastAPI(title="Course Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs
TRANSCODING_SERVICE_URL = "http://127.0.0.1:8002"

# Mount static files for thumbnails from shared storage
thumbnails_dir = os.path.abspath("../shared_storage/thumbnails")
os.makedirs(thumbnails_dir, exist_ok=True)
app.mount("/thumbnails", StaticFiles(directory=thumbnails_dir), name="thumbnails")

# Pydantic models for API
class CourseCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    level: Optional[str] = "Beginner"
    language: Optional[str] = "English"
    price: Optional[float] = 0.0
    currency: Optional[str] = "USD"
    thumbnail_url: Optional[str] = None
    promo_video_id: Optional[str] = None

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    level: Optional[str] = None
    language: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    thumbnail_url: Optional[str] = None
    promo_video_id: Optional[str] = None

class SectionCreate(BaseModel):
    title: str
    order: int
    learning_objectives: Optional[List[str]] = []

class SectionUpdate(BaseModel):
    title: Optional[str] = None
    order: Optional[int] = None
    learning_objectives: Optional[List[str]] = None

class LessonCreate(BaseModel):
    section_id: int
    title: str
    description: Optional[str] = None
    type: str
    video_id: Optional[str] = None
    duration: Optional[int] = None
    order: int
    resources: Optional[List[dict]] = []
    downloadable: Optional[bool] = False

class LessonUpdate(BaseModel):
    section_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    video_id: Optional[str] = None
    duration: Optional[int] = None
    order: Optional[int] = None
    resources: Optional[List[dict]] = None
    downloadable: Optional[bool] = None

class CourseVideoCreate(BaseModel):
    hash: str
    filename: str
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    thumbnail_filename: Optional[str] = None
    scheduled_at: Optional[str] = None
    course_id: int

class CourseVideoUpdate(BaseModel):
    thumbnail_filename: Optional[str] = None
    original_resolution: Optional[str] = None
    original_quality_label: Optional[str] = None
    stopped: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[str] = None
    transcoding_status: Optional[str] = None

# API Endpoints

@app.post("/api/courses", response_model=dict)
async def create_course(course: CourseCreate, db: Session = Depends(get_db)):
    """Create a new course"""
    db_course = Course(**course.dict())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return {"course_id": db_course.id, "message": "Course created successfully"}

@app.get("/api/courses", response_model=List[dict])
async def list_courses(db: Session = Depends(get_db)):
    """List all courses"""
    courses = db.query(Course).all()
    # Return a richer list so frontends can render thumbnails, category and price without fetching each course individually
    return [
        {
            "id": c.id,
            "title": c.title,
            "status": c.status,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat() if getattr(c, 'updated_at', None) else None,
            "thumbnail_url": c.thumbnail_url,
            "category": c.category,
            "price": c.price,
            "currency": c.currency,
        }
        for c in courses
    ]

@app.get("/api/courses/{course_id}", response_model=dict)
async def get_course(course_id: int, db: Session = Depends(get_db)):
    """Get course details"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    sections = []
    for section in course.sections:
        lessons = []
        for lesson in section.lessons:
            lessons.append({
                "id": lesson.id,
                "title": lesson.title,
                "description": lesson.description,
                "type": lesson.type,
                "video_id": lesson.video_id,
                "duration": lesson.duration,
                "order": lesson.order,
                "resources": lesson.resources,
                "downloadable": lesson.downloadable
            })
        sections.append({
            "id": section.id,
            "title": section.title,
            "order": section.order,
            "learning_objectives": section.learning_objectives,
            "lessons": lessons
        })

    return {
        "id": course.id,
        "title": course.title,
        "subtitle": course.subtitle,
        "description": course.description,
        "category": course.category,
        "subcategory": course.subcategory,
        "level": course.level,
        "language": course.language,
        "price": course.price,
        "currency": course.currency,
        "status": course.status,
        "thumbnail_url": course.thumbnail_url,
        "promo_video_id": course.promo_video_id,
        "created_at": course.created_at.isoformat(),
        "updated_at": course.updated_at.isoformat(),
        "sections": sections
    }

@app.put("/api/courses/{course_id}", response_model=dict)
async def update_course(course_id: int, course_update: CourseUpdate, db: Session = Depends(get_db)):
    """Update course"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    for key, value in course_update.dict(exclude_unset=True).items():
        setattr(course, key, value)

    course.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(course)

    # Return full course object with sections and lessons
    sections = []
    for section in course.sections:
        lessons = []
        for lesson in section.lessons:
            lessons.append({
                "id": lesson.id,
                "title": lesson.title,
                "description": lesson.description,
                "type": lesson.type,
                "video_id": lesson.video_id,
                "duration": lesson.duration,
                "order": lesson.order,
                "resources": lesson.resources,
                "downloadable": lesson.downloadable
            })
        sections.append({
            "id": section.id,
            "title": section.title,
            "order": section.order,
            "learning_objectives": section.learning_objectives,
            "lessons": lessons
        })

    return {
        "id": course.id,
        "title": course.title,
        "subtitle": course.subtitle,
        "description": course.description,
        "category": course.category,
        "subcategory": course.subcategory,
        "level": course.level,
        "language": course.language,
        "price": course.price,
        "currency": course.currency,
        "status": course.status,
        "thumbnail_url": course.thumbnail_url,
        "promo_video_id": course.promo_video_id,
        "created_at": course.created_at.isoformat(),
        "updated_at": course.updated_at.isoformat(),
        "sections": sections
    }

@app.delete("/api/courses/{course_id}", response_model=dict)
async def delete_course(course_id: int, db: Session = Depends(get_db)):
    """Delete course"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Collect all video_ids from lessons before deleting
    video_ids = []
    for section in course.sections:
        for lesson in section.lessons:
            if lesson.video_id:
                video_ids.append(lesson.video_id)

    # Store course thumbnail URL before deleting
    course_thumbnail_url = course.thumbnail_url

    # Delete the course (cascade will delete sections and lessons)
    db.delete(course)
    db.commit()

    # Delete associated videos from metadata service and physical files
    import requests
    shared_storage = os.path.abspath("../shared_storage")
    originals_path = os.path.join(shared_storage, "originals")
    hls_path = os.path.join(shared_storage, "hls")

    for video_id in video_ids:
        try:
            # Delete from metadata service
            response = requests.delete(f"http://127.0.0.1:8003/videos/{video_id}")
            if response.status_code not in [200, 404]:  # 404 is ok if video already deleted
                print(f"Warning: Failed to delete video {video_id}: {response.status_code}")
        except Exception as e:
            print(f"Warning: Error deleting video {video_id}: {str(e)}")

        # Delete original files - check course-specific, default, and legacy folders
        try:
            deleted_originals = False

            # Try course-specific folder first
            course_originals_folder = os.path.join(originals_path, str(course_id), video_id)
            if os.path.exists(course_originals_folder):
                shutil.rmtree(course_originals_folder)
                deleted_originals = True
                print(f"Deleted original files from course folder for video {video_id}")

            # Try default folder if not found
            if not deleted_originals:
                default_originals_folder = os.path.join(originals_path, "default", video_id)
                if os.path.exists(default_originals_folder):
                    shutil.rmtree(default_originals_folder)
                    deleted_originals = True
                    print(f"Deleted original files from default folder for video {video_id}")

            # Try legacy flat structure if still not found
            if not deleted_originals:
                legacy_originals_folder = os.path.join(originals_path, video_id)
                if os.path.exists(legacy_originals_folder):
                    shutil.rmtree(legacy_originals_folder)
                    print(f"Deleted original files from legacy folder for video {video_id}")
        except Exception as e:
            print(f"Warning: Error deleting original files for video {video_id}: {str(e)}")

        # Delete HLS files - check course-specific, default, and legacy folders
        try:
            deleted_hls = False

            # Try course-specific HLS folder first
            course_hls_folder = os.path.join(hls_path, str(course_id), video_id)
            if os.path.exists(course_hls_folder):
                shutil.rmtree(course_hls_folder)
                deleted_hls = True
                print(f"Deleted HLS files from course folder for video {video_id}")

            # Try default folder if not found
            if not deleted_hls:
                default_hls_folder = os.path.join(hls_path, "default", video_id)
                if os.path.exists(default_hls_folder):
                    shutil.rmtree(default_hls_folder)
                    deleted_hls = True
                    print(f"Deleted HLS files from default folder for video {video_id}")

            # Try legacy flat structure if still not found
            if not deleted_hls:
                legacy_hls_folder = os.path.join(hls_path, video_id)
                if os.path.exists(legacy_hls_folder):
                    shutil.rmtree(legacy_hls_folder)
                    print(f"Deleted HLS files from legacy folder for video {video_id}")
        except Exception as e:
            print(f"Warning: Error deleting HLS files for video {video_id}: {str(e)}")

    # Delete course-specific folders (even if not empty, since we're deleting the course)
    try:
        # Delete course originals folder
        course_originals_folder = os.path.join(originals_path, str(course_id))
        if os.path.exists(course_originals_folder):
            try:
                # Check if empty first
                if not os.listdir(course_originals_folder):
                    os.rmdir(course_originals_folder)
                    print(f"Deleted empty course originals folder {course_id}")
                else:
                    # Force delete if not empty (cleanup any remaining files)
                    shutil.rmtree(course_originals_folder)
                    print(f"Deleted course originals folder {course_id} (had remaining files)")
            except Exception as e:
                print(f"Warning: Error deleting course originals folder {course_id}: {str(e)}")

        # Delete course HLS folder
        course_hls_folder = os.path.join(hls_path, str(course_id))
        if os.path.exists(course_hls_folder):
            try:
                # Check if empty first
                if not os.listdir(course_hls_folder):
                    os.rmdir(course_hls_folder)
                    print(f"Deleted empty course HLS folder {course_id}")
                else:
                    # Force delete if not empty (cleanup any remaining files)
                    shutil.rmtree(course_hls_folder)
                    print(f"Deleted course HLS folder {course_id} (had remaining files)")
            except Exception as e:
                print(f"Warning: Error deleting course HLS folder {course_id}: {str(e)}")
    except Exception as e:
        print(f"Warning: Error during course folder cleanup: {str(e)}")

    # Delete course thumbnail if it exists
    if course_thumbnail_url:
        try:
            # Extract filename from URL (format: /thumbnails/course_{course_id}_{uuid}.jpg)
            if course_thumbnail_url.startswith('/thumbnails/'):
                thumbnail_filename = course_thumbnail_url.replace('/thumbnails/', '')
                thumbnails_dir = os.path.abspath("../shared_storage/thumbnails")
                thumbnail_path = os.path.join(thumbnails_dir, thumbnail_filename)

                if os.path.exists(thumbnail_path):
                    os.remove(thumbnail_path)
                    print(f"Deleted course thumbnail: {thumbnail_filename}")
        except Exception as e:
            print(f"Warning: Error deleting course thumbnail: {str(e)}")

    return {"message": "Course deleted successfully"}

@app.post("/api/courses/{course_id}/sections", response_model=dict)
async def add_section(course_id: int, section: SectionCreate, db: Session = Depends(get_db)):
    """Add section to course"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    db_section = Section(course_id=course_id, **section.dict())
    db.add(db_section)
    db.commit()
    db.refresh(db_section)
    return {"section_id": db_section.id, "message": "Section added successfully"}

@app.put("/api/courses/{course_id}/sections/{section_id}", response_model=dict)
async def update_section(course_id: int, section_id: int, section_update: SectionUpdate, db: Session = Depends(get_db)):
    """Update section"""
    section = db.query(Section).filter(Section.id == section_id, Section.course_id == course_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    for key, value in section_update.dict(exclude_unset=True).items():
        setattr(section, key, value)

    db.commit()
    return {"message": "Section updated successfully"}

@app.delete("/api/courses/{course_id}/sections/{section_id}", response_model=dict)
async def delete_section(course_id: int, section_id: int, db: Session = Depends(get_db)):
    """Delete section and all its lessons"""
    section = db.query(Section).filter(Section.id == section_id, Section.course_id == course_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Delete the section (cascade will delete lessons)
    db.delete(section)
    db.commit()
    return {"message": "Section deleted successfully"}

@app.post("/api/courses/{course_id}/lessons", response_model=dict)
async def add_lesson(course_id: int, lesson: LessonCreate, db: Session = Depends(get_db)):
    """Add lesson to course"""
    # Verify the section belongs to the course
    section = db.query(Section).filter(Section.id == lesson.section_id if hasattr(lesson, 'section_id') else None).first()
    if not section or section.course_id != course_id:
        raise HTTPException(status_code=400, detail="Invalid section")

    db_lesson = Lesson(**lesson.dict())
    db.add(db_lesson)
    db.commit()
    db.refresh(db_lesson)
    return {"lesson_id": db_lesson.id, "message": "Lesson added successfully"}

@app.put("/api/courses/{course_id}/lessons/{lesson_id}", response_model=dict)
async def update_lesson(course_id: int, lesson_id: int, lesson_update: LessonUpdate, db: Session = Depends(get_db)):
    """Update lesson"""
    lesson = db.query(Lesson).join(Section).filter(
        Lesson.id == lesson_id,
        Section.course_id == course_id
    ).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    for key, value in lesson_update.dict(exclude_unset=True).items():
        setattr(lesson, key, value)

    db.commit()
    return {"message": "Lesson updated successfully"}

@app.post("/api/courses/{course_id}/publish", response_model=dict)
async def publish_course(course_id: int, db: Session = Depends(get_db)):
    """Publish course and trigger transcoding for all course videos"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    course.status = "published"
    course.updated_at = datetime.utcnow()
    db.commit()

    # Get all videos associated with this course
    course_videos = db.query(CourseVideo).filter(CourseVideo.course_id == course_id).all()

    # Trigger transcoding for each video
    transcoding_results = []
    for video in course_videos:
        try:
            # Check if video is already transcoded
            status_response = requests.get(
                f"{TRANSCODING_SERVICE_URL}/transcode/{video.hash}/status",
                timeout=5
            )

            # Only trigger transcoding if video hasn't been transcoded yet
            if status_response.status_code == 404 or (
                status_response.status_code == 200 and
                status_response.json().get('overall') not in ['ok', 'completed', 'finished']
            ):
                transcode_response = requests.post(
                    f"{TRANSCODING_SERVICE_URL}/transcode/{video.hash}",
                    json={"networkSpeed": 10.0},
                    timeout=5
                )

                if transcode_response.status_code == 200:
                    transcoding_results.append({
                        "video_hash": video.hash,
                        "status": "started"
                    })
                    print(f"[PUBLISH] Transcoding started for video {video.hash}")
                else:
                    error_detail = transcode_response.text
                    try:
                        error_json = transcode_response.json()
                        error_detail = error_json.get('detail', transcode_response.text)
                    except:
                        pass
                    transcoding_results.append({
                        "video_hash": video.hash,
                        "status": "failed",
                        "error": error_detail,
                        "status_code": transcode_response.status_code
                    })
                    print(f"[PUBLISH] Failed to start transcoding for video {video.hash}: {error_detail} (status: {transcode_response.status_code})")
            else:
                transcoding_results.append({
                    "video_hash": video.hash,
                    "status": "already_transcoded"
                })
        except requests.RequestException as e:
            transcoding_results.append({
                "video_hash": video.hash,
                "status": "error",
                "error": str(e)
            })
            logging.error(f"Error triggering transcoding for video {video.hash}: {e}")

    return {
        "message": "Course published successfully",
        "transcoding_results": transcoding_results
    }

@app.post("/api/courses/{course_id}/unpublish", response_model=dict)
async def unpublish_course(course_id: int, db: Session = Depends(get_db)):
    """Unpublish course"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    course.status = "draft"
    course.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Course unpublished successfully"}

@app.post("/api/courses/{course_id}/thumbnail")
async def upload_course_thumbnail(course_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload thumbnail for course"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Create thumbnails directory if it doesn't exist
    thumbnails_dir = os.path.abspath("../shared_storage/thumbnails")
    os.makedirs(thumbnails_dir, exist_ok=True)

    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    thumbnail_filename = f"course_{course_id}_{uuid.uuid4().hex}{file_extension}"
    thumbnail_path = os.path.join(thumbnails_dir, thumbnail_filename)

    # Save the file
    with open(thumbnail_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update course with thumbnail URL
    course.thumbnail_url = f"/thumbnails/{thumbnail_filename}"
    course.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Thumbnail uploaded successfully", "thumbnail_url": course.thumbnail_url}

@app.get("/api/courses/{course_id}/thumbnail")
async def get_course_thumbnail(course_id: int, db: Session = Depends(get_db)):
    """Get thumbnail for course"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course or not course.thumbnail_url:
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    # Extract filename from URL
    filename = course.thumbnail_url.split('/')[-1]
    thumbnail_path = os.path.join(thumbnails_dir, filename)

    if not os.path.exists(thumbnail_path):
        raise HTTPException(status_code=404, detail="Thumbnail file not found")

    return FileResponse(thumbnail_path, media_type="image/jpeg")

# Course Video Metadata Endpoints

@app.post("/course-videos")
async def create_course_video(video: CourseVideoCreate, db: Session = Depends(get_db)):
    """Create a new video entry in the courses database."""

    # Check if video already exists
    existing = db.query(CourseVideo).filter(CourseVideo.hash == video.hash).first()
    if existing:
        # Update existing video
        updated = False

        if video.title is not None and video.title != existing.title:
            existing.title = video.title or existing.filename
            updated = True

        if video.description is not None and video.description != existing.description:
            existing.description = video.description or None
            updated = True

        if video.thumbnail_filename is not None and video.thumbnail_filename != existing.thumbnail_filename:
            existing.thumbnail_filename = video.thumbnail_filename
            updated = True

        if video.status is not None and video.status != existing.status:
            existing.status = video.status or existing.status
            updated = True

        if video.scheduled_at is not None and video.scheduled_at != existing.scheduled_at:
            existing.scheduled_at = video.scheduled_at or None
            if video.status is None:
                existing.status = "Scheduled" if video.scheduled_at else (existing.status or "draft")
            updated = True

        if video.category is not None and video.category != existing.category:
            existing.category = video.category
            updated = True

        if video.course_id is not None and video.course_id != existing.course_id:
            existing.course_id = video.course_id
            updated = True

        if updated:
            db.add(existing)
            db.commit()
            db.refresh(existing)

        return {"id": existing.id, "hash": existing.hash}

    # Create new video
    db_video = CourseVideo(
        hash=video.hash,
        filename=video.filename,
        title=video.title or video.filename,
        description=video.description or None,
        status=video.status or ("Scheduled" if video.scheduled_at else "draft"),
        scheduled_at=video.scheduled_at or None,
        category=video.category or "uncategorized",
        thumbnail_filename=video.thumbnail_filename,
        course_id=video.course_id
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)

    return {"id": db_video.id, "hash": db_video.hash}

@app.get("/course-videos/course/{course_id}")
async def get_course_videos(course_id: int, db: Session = Depends(get_db)):
    """Get all videos for a specific course from the courses database."""
    videos = db.query(CourseVideo).filter(CourseVideo.course_id == course_id).all()
    return {
        "videos": [
            {
                "id": v.id,
                "hash": v.hash,
                "filename": v.filename,
                "title": v.title,
                "description": v.description,
                "category": v.category,
                "status": v.status,
                "thumbnail_filename": v.thumbnail_filename,
                "original_resolution": v.original_resolution,
                "original_quality_label": v.original_quality_label,
                "stopped": v.stopped,
                "transcoding_status": v.transcoding_status,
                "created_at": v.created_at.isoformat() if v.created_at else None,
                "scheduled_at": v.scheduled_at,
                "course_id": v.course_id
            }
            for v in videos
        ]
    }

@app.get("/course-videos/{hash}")
async def get_course_video(hash: str, db: Session = Depends(get_db)):
    """Get a specific video by hash from the courses database."""
    video = db.query(CourseVideo).filter(CourseVideo.hash == hash).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    return {
        "id": video.id,
        "hash": video.hash,
        "filename": video.filename,
        "title": video.title,
        "description": video.description,
        "category": video.category,
        "status": video.status,
        "thumbnail_filename": video.thumbnail_filename,
        "original_resolution": video.original_resolution,
        "original_quality_label": video.original_quality_label,
        "stopped": video.stopped,
        "transcoding_status": video.transcoding_status,
        "created_at": video.created_at.isoformat() if video.created_at else None,
        "scheduled_at": video.scheduled_at,
        "course_id": video.course_id
    }

@app.patch("/course-videos/{hash}")
async def update_course_video(hash: str, video_update: CourseVideoUpdate, db: Session = Depends(get_db)):
    """Update a video's metadata in the courses database."""
    video = db.query(CourseVideo).filter(CourseVideo.hash == hash).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    update_data = video_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(video, key, value)

    db.commit()
    db.refresh(video)

    return {"message": "Video updated successfully", "hash": video.hash}

@app.delete("/course-videos/{hash}")
async def delete_course_video(hash: str, db: Session = Depends(get_db)):
    """Delete a video from the courses database."""
    video = db.query(CourseVideo).filter(CourseVideo.hash == hash).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    db.delete(video)
    db.commit()

    return {"message": "Video deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8006)