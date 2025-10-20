from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from models import get_db, Comment, View, Like, Dislike
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

app = FastAPI(title="Engagement Service", version="1.0.0")

logging.basicConfig(level=logging.INFO)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class CommentCreate(BaseModel):
    lms_username: str
    content_type: str  # 'video' or 'course'
    content_id: str
    video_id: Optional[str] = None  # Specific video ID for course comments
    comment_text: str
    parent_id: Optional[int] = None
    is_admin_reply: Optional[bool] = False

class CommentUpdate(BaseModel):
    comment_text: str

class CommentResponse(BaseModel):
    id: int
    lms_username: str
    content_type: str
    content_id: str
    video_id: Optional[str] = None
    comment_text: str
    parent_id: Optional[int]
    is_admin_reply: bool
    created_at: datetime
    updated_at: datetime
    replies: List['CommentResponse'] = []

    class Config:
        from_attributes = True

class ViewCreate(BaseModel):
    lms_username: str
    content_type: str
    content_id: str
    duration_watched: Optional[int] = 0

class LikeCreate(BaseModel):
    lms_username: str
    content_type: str
    content_id: str

class DislikeCreate(BaseModel):
    lms_username: str
    content_type: str
    content_id: str

class EngagementStats(BaseModel):
    views: int
    likes: int
    dislikes: int
    comments: int
    user_liked: bool
    user_disliked: bool

# Comments Endpoints
@app.post("/comments", response_model=CommentResponse)
async def create_comment(comment: CommentCreate, db: Session = Depends(get_db)):
    """Create a new comment or reply"""
    # Validate parent comment exists if parent_id provided
    if comment.parent_id:
        parent = db.query(Comment).filter(Comment.id == comment.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    
    db_comment = Comment(**comment.dict())
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    return CommentResponse(
        id=db_comment.id,
        lms_username=db_comment.lms_username,
        content_type=db_comment.content_type,
        content_id=db_comment.content_id,
        video_id=db_comment.video_id,
        comment_text=db_comment.comment_text,
        parent_id=db_comment.parent_id,
        is_admin_reply=db_comment.is_admin_reply,
        created_at=db_comment.created_at,
        updated_at=db_comment.updated_at,
        replies=[]
    )

@app.get("/comments", response_model=List[CommentResponse])
async def get_comments(
    content_type: str,
    content_id: str,
    video_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get comments for a specific video or course (only top-level comments with replies)
    For courses, can filter by specific video_id"""
    offset = (page - 1) * limit
    
    # Build query for top-level comments (no parent)
    query = db.query(Comment).filter(
        Comment.content_type == content_type,
        Comment.content_id == content_id,
        Comment.parent_id.is_(None)
    )
    
    # Add video_id filter if provided (for course comments)
    if video_id:
        query = query.filter(Comment.video_id == video_id)
    
    top_comments = query.order_by(Comment.created_at.desc()).offset(offset).limit(limit).all()
    
    # Build response with replies
    result = []
    for comment in top_comments:
        replies = db.query(Comment).filter(Comment.parent_id == comment.id).order_by(Comment.created_at.asc()).all()
        
        result.append(CommentResponse(
            id=comment.id,
            lms_username=comment.lms_username,
            content_type=comment.content_type,
            content_id=comment.content_id,
            video_id=comment.video_id,
            comment_text=comment.comment_text,
            parent_id=comment.parent_id,
            is_admin_reply=comment.is_admin_reply,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            replies=[
                CommentResponse(
                    id=reply.id,
                    lms_username=reply.lms_username,
                    content_type=reply.content_type,
                    content_id=reply.content_id,
                    video_id=reply.video_id,
                    comment_text=reply.comment_text,
                    parent_id=reply.parent_id,
                    is_admin_reply=reply.is_admin_reply,
                    created_at=reply.created_at,
                    updated_at=reply.updated_at,
                    replies=[]
                )
                for reply in replies
            ]
        ))
    
    return result

@app.get("/comments/{comment_id}", response_model=CommentResponse)
async def get_comment(comment_id: int, db: Session = Depends(get_db)):
    """Get a specific comment by ID"""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    replies = db.query(Comment).filter(Comment.parent_id == comment.id).order_by(Comment.created_at.asc()).all()
    
    return CommentResponse(
        id=comment.id,
        lms_username=comment.lms_username,
        content_type=comment.content_type,
        content_id=comment.content_id,
        video_id=comment.video_id,
        comment_text=comment.comment_text,
        parent_id=comment.parent_id,
        is_admin_reply=comment.is_admin_reply,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        replies=[
            CommentResponse(
                id=reply.id,
                lms_username=reply.lms_username,
                content_type=reply.content_type,
                content_id=reply.content_id,
                video_id=reply.video_id,
                comment_text=reply.comment_text,
                parent_id=reply.parent_id,
                is_admin_reply=reply.is_admin_reply,
                created_at=reply.created_at,
                updated_at=reply.updated_at,
                replies=[]
            )
            for reply in replies
        ]
    )

@app.put("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(comment_id: int, comment_update: CommentUpdate, db: Session = Depends(get_db)):
    """Update a comment"""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    comment.comment_text = comment_update.comment_text
    comment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(comment)
    
    replies = db.query(Comment).filter(Comment.parent_id == comment.id).order_by(Comment.created_at.asc()).all()
    
    return CommentResponse(
        id=comment.id,
        lms_username=comment.lms_username,
        content_type=comment.content_type,
        content_id=comment.content_id,
        video_id=comment.video_id,
        comment_text=comment.comment_text,
        parent_id=comment.parent_id,
        is_admin_reply=comment.is_admin_reply,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        replies=[
            CommentResponse(
                id=reply.id,
                lms_username=reply.lms_username,
                content_type=reply.content_type,
                content_id=reply.content_id,
                video_id=reply.video_id,
                comment_text=reply.comment_text,
                parent_id=reply.parent_id,
                is_admin_reply=reply.is_admin_reply,
                created_at=reply.created_at,
                updated_at=reply.updated_at,
                replies=[]
            )
            for reply in replies
        ]
    )

@app.delete("/comments/{comment_id}")
async def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    """Delete a comment and all its replies"""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted successfully"}

@app.get("/comments/count/{content_type}/{content_id}")
async def get_comment_count(content_type: str, content_id: str, db: Session = Depends(get_db)):
    """Get total comment count for a video or course"""
    count = db.query(Comment).filter(
        Comment.content_type == content_type,
        Comment.content_id == content_id
    ).count()
    return {"count": count}

# Views Endpoints
@app.post("/views")
async def create_view(view: ViewCreate, db: Session = Depends(get_db)):
    """Record a view"""
    db_view = View(**view.dict())
    db.add(db_view)
    db.commit()
    return {"message": "View recorded successfully"}

@app.get("/views/count/{content_type}/{content_id}")
async def get_view_count(content_type: str, content_id: str, db: Session = Depends(get_db)):
    """Get unique view count for a video or course"""
    # Count unique users who viewed
    count = db.query(func.count(func.distinct(View.lms_username))).filter(
        View.content_type == content_type,
        View.content_id == content_id
    ).scalar()
    return {"count": count}

@app.get("/views/check")
async def check_view(
    lms_username: str,
    content_type: str,
    content_id: str,
    db: Session = Depends(get_db)
):
    """Check if user has viewed content"""
    view = db.query(View).filter(
        View.lms_username == lms_username,
        View.content_type == content_type,
        View.content_id == content_id
    ).first()
    return {"has_viewed": view is not None}

# Likes Endpoints
@app.post("/likes")
async def create_like(like: LikeCreate, db: Session = Depends(get_db)):
    """Add a like (removes dislike if exists)"""
    # Remove dislike if exists
    db.query(Dislike).filter(
        Dislike.lms_username == like.lms_username,
        Dislike.content_type == like.content_type,
        Dislike.content_id == like.content_id
    ).delete()
    
    # Check if already liked
    existing = db.query(Like).filter(
        Like.lms_username == like.lms_username,
        Like.content_type == like.content_type,
        Like.content_id == like.content_id
    ).first()
    
    if existing:
        return {"message": "Already liked"}
    
    db_like = Like(**like.dict())
    db.add(db_like)
    db.commit()
    return {"message": "Like added successfully"}

@app.delete("/likes")
async def remove_like(
    lms_username: str,
    content_type: str,
    content_id: str,
    db: Session = Depends(get_db)
):
    """Remove a like"""
    result = db.query(Like).filter(
        Like.lms_username == lms_username,
        Like.content_type == content_type,
        Like.content_id == content_id
    ).delete()
    db.commit()
    
    if result == 0:
        raise HTTPException(status_code=404, detail="Like not found")
    return {"message": "Like removed successfully"}

@app.get("/likes/count/{content_type}/{content_id}")
async def get_like_count(content_type: str, content_id: str, db: Session = Depends(get_db)):
    """Get like count for a video or course"""
    count = db.query(Like).filter(
        Like.content_type == content_type,
        Like.content_id == content_id
    ).count()
    return {"count": count}

@app.get("/likes/check")
async def check_like(
    lms_username: str,
    content_type: str,
    content_id: str,
    db: Session = Depends(get_db)
):
    """Check if user has liked content"""
    like = db.query(Like).filter(
        Like.lms_username == lms_username,
        Like.content_type == content_type,
        Like.content_id == content_id
    ).first()
    return {"has_liked": like is not None}

# Dislikes Endpoints
@app.post("/dislikes")
async def create_dislike(dislike: DislikeCreate, db: Session = Depends(get_db)):
    """Add a dislike (removes like if exists)"""
    # Remove like if exists
    db.query(Like).filter(
        Like.lms_username == dislike.lms_username,
        Like.content_type == dislike.content_type,
        Like.content_id == dislike.content_id
    ).delete()
    
    # Check if already disliked
    existing = db.query(Dislike).filter(
        Dislike.lms_username == dislike.lms_username,
        Dislike.content_type == dislike.content_type,
        Dislike.content_id == dislike.content_id
    ).first()
    
    if existing:
        return {"message": "Already disliked"}
    
    db_dislike = Dislike(**dislike.dict())
    db.add(db_dislike)
    db.commit()
    return {"message": "Dislike added successfully"}

@app.delete("/dislikes")
async def remove_dislike(
    lms_username: str,
    content_type: str,
    content_id: str,
    db: Session = Depends(get_db)
):
    """Remove a dislike"""
    result = db.query(Dislike).filter(
        Dislike.lms_username == lms_username,
        Dislike.content_type == content_type,
        Dislike.content_id == content_id
    ).delete()
    db.commit()
    
    if result == 0:
        raise HTTPException(status_code=404, detail="Dislike not found")
    return {"message": "Dislike removed successfully"}

@app.get("/dislikes/count/{content_type}/{content_id}")
async def get_dislike_count(content_type: str, content_id: str, db: Session = Depends(get_db)):
    """Get dislike count for a video or course"""
    count = db.query(Dislike).filter(
        Dislike.content_type == content_type,
        Dislike.content_id == content_id
    ).count()
    return {"count": count}

@app.get("/dislikes/check")
async def check_dislike(
    lms_username: str,
    content_type: str,
    content_id: str,
    db: Session = Depends(get_db)
):
    """Check if user has disliked content"""
    dislike = db.query(Dislike).filter(
        Dislike.lms_username == lms_username,
        Dislike.content_type == content_type,
        Dislike.content_id == content_id
    ).first()
    return {"has_disliked": dislike is not None}

# Combined Stats Endpoint
@app.get("/stats/{content_type}/{content_id}", response_model=EngagementStats)
async def get_engagement_stats(
    content_type: str,
    content_id: str,
    lms_username: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all engagement statistics for content"""
    # Views count (unique users)
    views = db.query(func.count(func.distinct(View.lms_username))).filter(
        View.content_type == content_type,
        View.content_id == content_id
    ).scalar() or 0
    
    # Likes count
    likes = db.query(Like).filter(
        Like.content_type == content_type,
        Like.content_id == content_id
    ).count()
    
    # Dislikes count
    dislikes = db.query(Dislike).filter(
        Dislike.content_type == content_type,
        Dislike.content_id == content_id
    ).count()
    
    # Comments count
    comments = db.query(Comment).filter(
        Comment.content_type == content_type,
        Comment.content_id == content_id
    ).count()
    
    # User-specific checks
    user_liked = False
    user_disliked = False
    if lms_username:
        user_liked = db.query(Like).filter(
            Like.lms_username == lms_username,
            Like.content_type == content_type,
            Like.content_id == content_id
        ).first() is not None
        
        user_disliked = db.query(Dislike).filter(
            Dislike.lms_username == lms_username,
            Dislike.content_type == content_type,
            Dislike.content_id == content_id
        ).first() is not None
    
    return EngagementStats(
        views=views,
        likes=likes,
        dislikes=dislikes,
        comments=comments,
        user_liked=user_liked,
        user_disliked=user_disliked
    )

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "engagement_service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8007)
