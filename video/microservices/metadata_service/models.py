from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool
import os
from datetime import datetime

# Database setup - shared storage
SHARED_STORAGE = os.path.abspath("../shared_storage")
os.makedirs(SHARED_STORAGE, exist_ok=True)

# DATABASE_URL = "sqlite:///:memory:"
DATABASE_URL = f"sqlite:///{os.path.join(SHARED_STORAGE, 'videos.db')}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Video(Base):
    __tablename__ = "videos"
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
    course_id = Column(Integer, nullable=True)  # FK to course, nullable for backward compatibility

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# Create sample data for in-memory database
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
