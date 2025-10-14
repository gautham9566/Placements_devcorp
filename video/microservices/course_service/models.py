from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.pool import StaticPool
from datetime import datetime

# Database setup - use shared storage
import os
DATABASE_URL = f"sqlite:///{os.path.abspath('../shared_storage/databases/courses.db')}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

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

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()