from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Database setup
DATABASE_URL = "sqlite:///./videos.db"
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

def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        db.close()

def is_transcoding_stopped(upload_id: str) -> bool:
    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.hash == upload_id).first()
        return video.stopped == 1 if video else False
    finally:
        db.close()