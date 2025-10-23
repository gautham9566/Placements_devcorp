"""
Migration script to add video_id column to comments table
"""
import sqlite3
import os

# Get the database path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
database_path = os.path.join(parent_dir, 'shared_storage', 'databases', 'engagement.db')

def migrate():
    """Add video_id column to comments table if it doesn't exist"""
    conn = sqlite3.connect(database_path)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(comments)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'video_id' not in columns:
            print("Adding video_id column to comments table...")
            cursor.execute("ALTER TABLE comments ADD COLUMN video_id TEXT")
            
            # Create index on video_id
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id)")
            
            conn.commit()
            print("Migration completed successfully!")
        else:
            print("video_id column already exists. No migration needed.")
            
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
