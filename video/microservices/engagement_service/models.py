from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.pool import StaticPool
from datetime import datetime
import os

# Database setup - use shared storage
# Get the absolute path to the shared_storage directory
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
database_path = os.path.join(parent_dir, 'shared_storage', 'databases', 'engagement.db')

# Ensure the directory exists
os.makedirs(os.path.dirname(database_path), exist_ok=True)

DATABASE_URL = f"sqlite:///{database_path}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Comment(Base):
    """Comments on videos and courses"""
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    lms_username = Column(String, nullable=False, index=True)  # User who posted the comment
    content_type = Column(String, nullable=False, index=True)  # 'video' or 'course'
    content_id = Column(String, nullable=False, index=True)  # video hash or course id
    video_id = Column(String, nullable=True, index=True)  # Specific video ID for course comments
    comment_text = Column(Text, nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)  # For replies
    is_admin_reply = Column(Boolean, default=False)  # Flag for admin replies
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - use cascade="all, delete" instead of "delete-orphan" for self-referential
    replies = relationship("Comment", backref="parent", remote_side=[id], cascade="all, delete")

class View(Base):
    """Track views on videos and courses"""
    __tablename__ = "views"
    
    id = Column(Integer, primary_key=True, index=True)
    lms_username = Column(String, nullable=False, index=True)
    content_type = Column(String, nullable=False, index=True)  # 'video' or 'course'
    content_id = Column(String, nullable=False, index=True)  # video hash or course id
    viewed_at = Column(DateTime, default=datetime.utcnow, index=True)
    duration_watched = Column(Integer, default=0)  # In seconds, for video views

class Like(Base):
    """Likes on videos and courses"""
    __tablename__ = "likes"
    
    id = Column(Integer, primary_key=True, index=True)
    lms_username = Column(String, nullable=False, index=True)
    content_type = Column(String, nullable=False, index=True)  # 'video' or 'course'
    content_id = Column(String, nullable=False, index=True)  # video hash or course id
    created_at = Column(DateTime, default=datetime.utcnow)

class Dislike(Base):
    """Dislikes on videos and courses"""
    __tablename__ = "dislikes"
    
    id = Column(Integer, primary_key=True, index=True)
    lms_username = Column(String, nullable=False, index=True)
    content_type = Column(String, nullable=False, index=True)  # 'video' or 'course'
    content_id = Column(String, nullable=False, index=True)  # video hash or course id
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
