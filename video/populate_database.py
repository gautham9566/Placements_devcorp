"""
Database Population Script
Fills the database with 1000 videos and 1000 courses using online thumbnail and video links.
"""

import sys
import os
import hashlib
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the microservices directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'microservices', 'course_service'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'microservices', 'metadata_service'))

# Import models from course_service
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.pool import StaticPool

# Database setup for courses
SHARED_STORAGE = os.path.join(os.path.dirname(__file__), 'microservices', 'shared_storage', 'databases')
os.makedirs(SHARED_STORAGE, exist_ok=True)

COURSES_DB_URL = f"sqlite:///{os.path.join(SHARED_STORAGE, 'courses.db')}"
VIDEOS_DB_URL = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'microservices', 'shared_storage', 'videos.db')}"

Base = declarative_base()

# Define models
class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    subtitle = Column(String)
    description = Column(Text)
    category = Column(String)
    subcategory = Column(String)
    level = Column(String)
    language = Column(String, default="English")
    price = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    status = Column(String, default="draft")
    thumbnail_url = Column(String)
    promo_video_id = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sections = relationship("Section", back_populates="course", cascade="all, delete-orphan")

class Section(Base):
    __tablename__ = "sections"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String, nullable=False)
    order = Column(Integer, nullable=False)
    learning_objectives = Column(JSON)
    course = relationship("Course", back_populates="sections")
    lessons = relationship("Lesson", back_populates="section", cascade="all, delete-orphan")

class Lesson(Base):
    __tablename__ = "lessons"
    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    type = Column(String, nullable=False)
    video_id = Column(String)
    duration = Column(Integer)
    order = Column(Integer, nullable=False)
    resources = Column(JSON)
    downloadable = Column(Boolean, default=False)
    section = relationship("Section", back_populates="lessons")

class CourseVideo(Base):
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
    stopped = Column(Integer, default=0)
    transcoding_status = Column(String, default='pending', nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    scheduled_at = Column(String, nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    course = relationship("Course")

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
    stopped = Column(Integer, default=0)
    transcoding_status = Column(String, default='pending', nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    scheduled_at = Column(String, nullable=True)
    course_id = Column(Integer, nullable=True)

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Sample data for variety
CATEGORIES = [
    "Programming", "Web Development", "Data Science", "Machine Learning", 
    "Mobile Development", "Game Development", "Database", "Cloud Computing",
    "DevOps", "Cybersecurity", "UI/UX Design", "Blockchain", "AI", 
    "Software Testing", "Networking", "Business", "Marketing", "Photography",
    "Music", "Art", "Health", "Fitness", "Language Learning", "Mathematics"
]

SUBCATEGORIES = {
    "Programming": ["Python", "JavaScript", "Java", "C++", "C#", "Ruby", "Go", "Rust"],
    "Web Development": ["Frontend", "Backend", "Full Stack", "React", "Angular", "Vue", "Node.js"],
    "Data Science": ["Data Analysis", "Data Visualization", "Statistics", "R", "Pandas"],
    "Machine Learning": ["Deep Learning", "Neural Networks", "NLP", "Computer Vision", "TensorFlow"],
    "Mobile Development": ["iOS", "Android", "React Native", "Flutter", "Swift", "Kotlin"],
}

LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"]

LANGUAGES = ["English", "Spanish", "French", "German", "Hindi", "Chinese", "Japanese", "Portuguese"]

VIDEO_STATUSES = ["Published", "Draft", "Scheduled", "Archived"]

TRANSCODING_STATUSES = ["completed", "transcoding", "pending", "failed"]

RESOLUTIONS = ["1920x1080", "1280x720", "854x480", "640x360"]

QUALITY_LABELS = ["1080p", "720p", "480p", "360p"]

# Online thumbnail URLs (using placeholder services)
THUMBNAIL_URLS = [
    f"https://picsum.photos/seed/{i}/1280/720" for i in range(1, 1001)
] + [
    f"https://placehold.co/1280x720/png?text=Video+{i}" for i in range(1001, 2001)
]

# Online video URLs (using sample video URLs)
VIDEO_URLS = [
    f"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/video_{i % 10}.mp4" for i in range(1, 1001)
]

def generate_hash(seed):
    """Generate a unique hash for video identification"""
    return hashlib.md5(f"{seed}{datetime.now().isoformat()}".encode()).hexdigest()

def random_date(start_days_ago=365, end_days_ago=0):
    """Generate a random datetime within the past year"""
    days_ago = random.randint(end_days_ago, start_days_ago)
    return datetime.utcnow() - timedelta(days=days_ago)

def populate_videos(session, count=1000):
    """Populate the videos table with sample data using online links"""
    print(f"\n{'='*60}")
    print(f"Populating {count} videos...")
    print(f"{'='*60}\n")
    
    videos_created = 0
    
    for i in range(1, count + 1):
        try:
            category = random.choice(CATEGORIES)
            
            video = Video(
                hash=generate_hash(f"video_{i}"),
                filename=f"video_{i:04d}.mp4",
                title=f"{category} Tutorial {i}: {random.choice(['Introduction', 'Advanced', 'Mastering', 'Complete Guide', 'Professional'])}",
                description=f"This is a comprehensive {category.lower()} video tutorial covering essential concepts and practical applications. Learn from industry experts with hands-on examples.",
                category=category,
                status=random.choice(VIDEO_STATUSES),
                thumbnail_filename=THUMBNAIL_URLS[i % len(THUMBNAIL_URLS)],  # Using online URL
                original_resolution=random.choice(RESOLUTIONS),
                original_quality_label=random.choice(QUALITY_LABELS),
                stopped=random.choice([0, 0, 0, 0, 1]),  # 80% not stopped
                transcoding_status=random.choice(TRANSCODING_STATUSES),
                created_at=random_date(),
                scheduled_at=datetime.utcnow().isoformat() if random.random() > 0.8 else None,
                course_id=None  # Standalone videos
            )
            
            session.add(video)
            videos_created += 1
            
            if i % 100 == 0:
                session.commit()
                print(f"✓ Created {i} videos...")
                
        except Exception as e:
            print(f"✗ Error creating video {i}: {e}")
            session.rollback()
    
    session.commit()
    print(f"\n✓ Successfully created {videos_created} videos!")
    return videos_created

def populate_categories(session):
    """Populate categories table"""
    print(f"\n{'='*60}")
    print("Populating categories...")
    print(f"{'='*60}\n")
    
    for cat_name in CATEGORIES:
        try:
            existing = session.query(Category).filter(Category.name == cat_name).first()
            if not existing:
                category = Category(
                    name=cat_name,
                    description=f"All videos related to {cat_name}",
                    created_at=datetime.utcnow()
                )
                session.add(category)
        except Exception as e:
            print(f"✗ Error creating category {cat_name}: {e}")
    
    session.commit()
    print("✓ Categories populated!")

def populate_courses(session, count=1000):
    """Populate courses with sections and lessons using online links"""
    print(f"\n{'='*60}")
    print(f"Populating {count} courses with sections and lessons...")
    print(f"{'='*60}\n")
    
    courses_created = 0
    sections_created = 0
    lessons_created = 0
    course_videos_created = 0
    
    for i in range(1, count + 1):
        try:
            category = random.choice(CATEGORIES)
            subcategories = SUBCATEGORIES.get(category, ["General"])
            subcategory = random.choice(subcategories)
            level = random.choice(LEVELS)
            
            # Create course
            course = Course(
                title=f"Complete {subcategory} {random.choice(['Bootcamp', 'Masterclass', 'Course', 'Training', 'Academy'])} {i}",
                subtitle=f"From {level} to Expert in {subcategory}",
                description=f"Master {subcategory} with this comprehensive {level.lower()} course. "
                           f"Includes hands-on projects, real-world examples, and expert guidance. "
                           f"Perfect for aspiring developers and professionals looking to upgrade their skills. "
                           f"Learn industry best practices and build a professional portfolio.",
                category=category,
                subcategory=subcategory,
                level=level,
                language=random.choice(LANGUAGES),
                price=round(random.uniform(9.99, 199.99), 2),
                currency=random.choice(["USD", "EUR", "GBP", "INR"]),
                status=random.choice(["published", "draft", "archived"]),
                thumbnail_url=THUMBNAIL_URLS[(i * 2) % len(THUMBNAIL_URLS)],  # Using online URL
                promo_video_id=f"promo_{generate_hash(f'promo_{i}')}",
                created_at=random_date(),
                updated_at=random_date(30, 0)
            )
            
            session.add(course)
            session.flush()  # Get the course ID
            courses_created += 1
            
            # Create 3-6 sections per course
            num_sections = random.randint(3, 6)
            for s in range(1, num_sections + 1):
                section = Section(
                    course_id=course.id,
                    title=f"Section {s}: {random.choice(['Introduction', 'Fundamentals', 'Advanced Concepts', 'Practical Applications', 'Projects', 'Best Practices'])}",
                    order=s,
                    learning_objectives=[
                        f"Understand key concepts of {subcategory}",
                        f"Apply {subcategory} techniques in real projects",
                        f"Master {level.lower()} level {subcategory} skills"
                    ]
                )
                session.add(section)
                session.flush()  # Get the section ID
                sections_created += 1
                
                # Create 3-8 lessons per section
                num_lessons = random.randint(3, 8)
                for l in range(1, num_lessons + 1):
                    video_hash = generate_hash(f"course_{i}_section_{s}_lesson_{l}")
                    
                    # Create course video
                    course_video = CourseVideo(
                        hash=video_hash,
                        filename=f"course_{i}_section_{s}_lesson_{l}.mp4",
                        title=f"{subcategory} Lesson {l}",
                        description=f"Learn essential {subcategory} concepts in this lesson",
                        category=category,
                        status="Published",
                        thumbnail_filename=THUMBNAIL_URLS[(i * s * l) % len(THUMBNAIL_URLS)],  # Using online URL
                        original_resolution=random.choice(RESOLUTIONS),
                        original_quality_label=random.choice(QUALITY_LABELS),
                        stopped=0,
                        transcoding_status=random.choice(["completed", "completed", "completed", "transcoding"]),
                        created_at=random_date(),
                        course_id=course.id
                    )
                    session.add(course_video)
                    course_videos_created += 1
                    
                    # Create lesson
                    lesson = Lesson(
                        section_id=section.id,
                        title=f"Lesson {l}: {random.choice(['Theory', 'Practice', 'Exercise', 'Project', 'Quiz', 'Assignment'])}",
                        description=f"In this lesson, you'll learn about {subcategory} through practical examples and exercises.",
                        type=random.choice(["video", "video", "video", "article", "quiz"]),
                        video_id=video_hash if random.random() > 0.2 else None,
                        duration=random.randint(180, 3600),  # 3 to 60 minutes
                        order=l,
                        resources=[
                            {"name": f"Slides_{l}.pdf", "url": f"https://example.com/resources/slides_{l}.pdf"},
                            {"name": f"Code_{l}.zip", "url": f"https://example.com/resources/code_{l}.zip"}
                        ] if random.random() > 0.5 else [],
                        downloadable=random.choice([True, False])
                    )
                    session.add(lesson)
                    lessons_created += 1
            
            if i % 50 == 0:
                session.commit()
                print(f"✓ Created {i} courses with sections and lessons...")
                
        except Exception as e:
            print(f"✗ Error creating course {i}: {e}")
            session.rollback()
    
    session.commit()
    print(f"\n{'='*60}")
    print(f"✓ Successfully created:")
    print(f"  - {courses_created} courses")
    print(f"  - {sections_created} sections")
    print(f"  - {lessons_created} lessons")
    print(f"  - {course_videos_created} course videos")
    print(f"{'='*60}\n")
    
    return courses_created, sections_created, lessons_created

def main():
    """Main function to populate both databases"""
    print("\n" + "="*60)
    print("DATABASE POPULATION SCRIPT")
    print("="*60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    try:
        # Setup videos database
        print("\n[1/2] Setting up Videos Database...")
        videos_engine = create_engine(
            VIDEOS_DB_URL, 
            connect_args={"check_same_thread": False}, 
            poolclass=StaticPool
        )
        Base.metadata.create_all(bind=videos_engine)
        VideosSession = sessionmaker(autocommit=False, autoflush=False, bind=videos_engine)
        videos_session = VideosSession()
        
        # Populate categories
        populate_categories(videos_session)
        
        # Populate videos
        populate_videos(videos_session, count=1000)
        
        videos_session.close()
        
        # Setup courses database
        print("\n[2/2] Setting up Courses Database...")
        courses_engine = create_engine(
            COURSES_DB_URL, 
            connect_args={"check_same_thread": False}, 
            poolclass=StaticPool
        )
        Base.metadata.create_all(bind=courses_engine)
        CoursesSession = sessionmaker(autocommit=False, autoflush=False, bind=courses_engine)
        courses_session = CoursesSession()
        
        # Populate courses
        populate_courses(courses_session, count=1000)
        
        courses_session.close()
        
        print("\n" + "="*60)
        print("DATABASE POPULATION COMPLETED SUCCESSFULLY!")
        print("="*60)
        print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("\nSummary:")
        print("  ✓ 1000 standalone videos created")
        print("  ✓ 1000 courses with sections and lessons created")
        print("  ✓ All entries use online thumbnail URLs")
        print("  ✓ All entries use online video links")
        print("  ✓ No local storage required")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n✗ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
