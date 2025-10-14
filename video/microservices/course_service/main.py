from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from models import get_db, Course, Section, Lesson
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
import shutil
import uuid

app = FastAPI(title="Course Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    return {"message": "Course updated successfully"}

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

    # Delete the course (cascade will delete sections and lessons)
    db.delete(course)
    db.commit()

    # Delete associated videos from metadata service
    import requests
    for video_id in video_ids:
        try:
            response = requests.delete(f"http://127.0.0.1:8003/videos/{video_id}")
            if response.status_code not in [200, 404]:  # 404 is ok if video already deleted
                print(f"Warning: Failed to delete video {video_id}: {response.status_code}")
        except Exception as e:
            print(f"Warning: Error deleting video {video_id}: {str(e)}")

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
async def update_section(course_id: int, section_id: int, section_update: SectionCreate, db: Session = Depends(get_db)):
    """Update section"""
    section = db.query(Section).filter(Section.id == section_id, Section.course_id == course_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    for key, value in section_update.dict(exclude_unset=True).items():
        setattr(section, key, value)

    db.commit()
    return {"message": "Section updated successfully"}

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
async def update_lesson(course_id: int, lesson_id: int, lesson_update: LessonCreate, db: Session = Depends(get_db)):
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
    """Publish course"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    course.status = "published"
    course.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Course published successfully"}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8006)