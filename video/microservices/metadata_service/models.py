from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker
import os

# Database setup - shared storage
SHARED_STORAGE = os.path.abspath("../shared_storage")
os.makedirs(SHARED_STORAGE, exist_ok=True)

# Use in-memory database for ultra-fast performance (for testing)
DATABASE_URL = "sqlite:///:memory:"
# DATABASE_URL = f"sqlite:///{os.path.join(SHARED_STORAGE, 'videos.db')}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Video(Base):
    __tablename__ = "videos"
    id = Column(Integer, primary_key=True, index=True)
    hash = Column(String, unique=True, index=True)
    filename = Column(String)
    thumbnail_filename = Column(String, nullable=True)
    original_resolution = Column(String, nullable=True)
    original_quality_label = Column(String, nullable=True)
    stopped = Column(Integer, default=0)  # 0: not stopped, 1: stopped

Base.metadata.create_all(bind=engine)

# Create sample data for in-memory database
def create_sample_data():
    db = SessionLocal()
    try:
        # Check if data already exists
        if db.query(Video).count() == 0:
            sample_videos = [
                Video(hash="sample1", filename="sample1.mp4", thumbnail_filename="sample1.jpg"),
                Video(hash="sample2", filename="sample2.mp4", thumbnail_filename="sample2.jpg"),
                Video(hash="sample3", filename="sample3.mp4", thumbnail_filename="sample3.jpg"),
            ]
            for video in sample_videos:
                db.add(video)
            db.commit()
    finally:
        db.close()

create_sample_data()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
