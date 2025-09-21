from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Feedback, User
from ..auth import get_current_agent_user

router = APIRouter()

@router.get("/stats")
def get_feedback_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_agent_user)  # Only agents and admins can access
):
    # Calculate average rating
    avg_rating = db.query(func.avg(Feedback.rating)).scalar() or 0
    
    # Get total feedback count
    total_feedback = db.query(func.count(Feedback.id)).scalar()
    
    # Get rating distribution
    rating_dist = db.query(
        Feedback.rating,
        func.count(Feedback.id).label('count')
    ).group_by(Feedback.rating).all()
    
    # Get sentiment distribution
    sentiment_dist = db.query(
        Feedback.sentiment,
        func.count(Feedback.id).label('count')
    ).group_by(Feedback.sentiment).all()
    
    return {
        "averageRating": float(avg_rating),
        "totalFeedback": total_feedback,
        "ratingDistribution": [
            {"rating": r.rating, "count": r.count}
            for r in rating_dist
        ],
        "sentimentDistribution": [
            {"sentiment": s.sentiment, "count": s.count}
            for s in sentiment_dist
        ]
    }

