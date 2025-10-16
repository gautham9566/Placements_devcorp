from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.pool import StaticPool
from sqlalchemy import event
from datetime import datetime

# Database setup - use shared storage
import os
DATABASE_URL = f"sqlite:///{os.path.abspath('../shared_storage/databases/courses.db')}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Enable foreign keys for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    subtitle = Column(String)
    description = Column(Text)
    category = Column(String)
    subcategory = Column(String)
    level = Column(String)  # Beginner, Intermediate, Advanced, All Levels
    language = Column(String, default="English")
    price = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    status = Column(String, default="draft")  # draft, published, archived
    thumbnail_url = Column(String)
    promo_video_id = Column(String)  # FK to upload_id
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sections = relationship("Section", back_populates="course", cascade="all, delete-orphan")

class Section(Base):
    __tablename__ = "sections"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String, nullable=False)
    order = Column(Integer, nullable=False)
    learning_objectives = Column(JSON)  # List of strings

    # Relationships
    course = relationship("Course", back_populates="sections")
    lessons = relationship("Lesson", back_populates="section", cascade="all, delete-orphan")

class Lesson(Base):
    __tablename__ = "lessons"
    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    type = Column(String, nullable=False)  # video, article, quiz, assignment, resource
    video_id = Column(String)  # FK to upload_id
    duration = Column(Integer)  # in seconds
    order = Column(Integer, nullable=False)
    resources = Column(JSON)  # List of resource objects
    downloadable = Column(Boolean, default=False)

    # Relationships
    section = relationship("Section", back_populates="lessons")

class CourseVideo(Base):
    """Video metadata for videos uploaded in courses context"""
    __tablename__ = "course_videos"
    id = Column(Integer, primary_key=True, index=True)
    hash = Column(String, unique=True, index=True)
    filename = Column(String)
    title = Column(String, nullable=True)
    description = Column(String, nullable=True)
    category = Column(String, nullable=True)
    status = Column(String, nullable=True)
    thumbnail_filename = Column(String, nullable=True)
    original_resolution = Column(String, nullable=True)
    original_quality_label = Column(String, nullable=True)
    stopped = Column(Integer, default=0)  # 0: not stopped, 1: stopped
    transcoding_status = Column(String, default='pending', nullable=True)  # pending, transcoding, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    scheduled_at = Column(String, nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)  # Required for course videos

    # Relationships
    course = relationship("Course")

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()