from typing import List, Literal
import re
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models import User, Ticket, Comment, Feedback
from ..schemas import TicketCreate, Ticket as TicketSchema, TicketUpdate, CommentCreate, Comment as CommentSchema, FeedbackCreate, Feedback as FeedbackSchema
from ..auth import get_current_user, get_current_agent_user

def simple_analyze_sentiment(text: str) -> Literal["positive", "neutral", "negative"]:
    """
    A very simple sentiment analysis function.
    This can be replaced with a more sophisticated ML-based approach later.
    """
    if not text:
        return "neutral"
        
    # Convert to lowercase for case-insensitive matching
    text = text.lower()
    
    # Define simple word lists for sentiment analysis
    positive_words = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 
                     'helpful', 'satisfied', 'thank', 'thanks', 'happy', 'pleased',
                     'outstanding', 'perfect', 'resolved', 'quick', 'efficient']
    
    negative_words = ['bad', 'poor', 'terrible', 'awful', 'horrible', 'disappointed',
                     'frustrated', 'unhappy', 'slow', 'dissatisfied', 'not helpful',
                     'useless', 'waste', 'problem', 'issue', 'complaint']
    
    # Count occurrences of positive and negative words
    positive_count = sum(1 for word in positive_words if re.search(r'\b' + word + r'\b', text))
    negative_count = sum(1 for word in negative_words if re.search(r'\b' + word + r'\b', text))
    
    # Determine sentiment based on counts
    if positive_count > negative_count:
        return "positive"
    elif negative_count > positive_count:
        return "negative"
    else:
        return "neutral"

router = APIRouter(prefix="/tickets", tags=["tickets"])

@router.post("", response_model=TicketSchema)
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_ticket = Ticket(**ticket.dict(), created_by_id=current_user.id)
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@router.get("", response_model=List[TicketSchema])
def get_tickets(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "customer":
        tickets = db.query(Ticket).filter(Ticket.created_by_id == current_user.id).offset(skip).limit(limit).all()
    else:
        tickets = db.query(Ticket).offset(skip).limit(limit).all()
    return tickets

@router.get("/{ticket_id}", response_model=TicketSchema)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket)\
        .options(
            joinedload(Ticket.created_by),
            joinedload(Ticket.assigned_to),
            joinedload(Ticket.comments).joinedload(Comment.user)
        )\
        .filter(Ticket.id == ticket_id)\
        .first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return ticket

@router.put("/{ticket_id}", response_model=TicketSchema)
def update_ticket(
    ticket_id: int,
    ticket_update: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent_user)
):
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    for field, value in ticket_update.dict(exclude_unset=True).items():
        setattr(db_ticket, field, value)
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@router.post("/{ticket_id}/comments", response_model=CommentSchema)
def create_comment(
    ticket_id: int,
    comment: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if current_user.role == "customer" and ticket.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db_comment = Comment(**comment.dict(), ticket_id=ticket_id, user_id=current_user.id)
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    # Explicitly load the user relationship
    db.refresh(db_comment, ['user'])
    return db_comment

@router.get("/{ticket_id}/comments", response_model=List[CommentSchema])
def get_comments(ticket_id: int, db: Session = Depends(get_db)):
    comments = db.query(Comment)\
        .options(joinedload(Comment.user))\
        .filter(Comment.ticket_id == ticket_id)\
        .order_by(Comment.created_at.desc())\
        .all()
    return comments

@router.get("/{ticket_id}/feedback", response_model=FeedbackSchema)
def get_feedback(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if feedback exists for the ticket
    feedback = db.query(Feedback).filter(
        Feedback.ticket_id == ticket_id
    ).first()
    
    if not feedback:
        raise HTTPException(
            status_code=404,
            detail="No feedback found for this ticket"
        )
    
    return feedback

@router.post("/{ticket_id}/feedback", response_model=FeedbackSchema)
def submit_feedback(
    ticket_id: int,
    feedback: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user is a customer
    if current_user.role != 'customer':
        raise HTTPException(
            status_code=403,
            detail="Only customers can submit feedback"
        )
    
    # Check if ticket exists and belongs to the customer
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.created_by_id == current_user.id
    ).first()
    
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found or you don't have permission to submit feedback"
        )
    
    # Check if feedback already exists
    existing_feedback = db.query(Feedback).filter(
        Feedback.ticket_id == ticket_id
    ).first()
    
    if existing_feedback:
        raise HTTPException(
            status_code=400,
            detail="Feedback has already been submitted for this ticket"
        )
    
    # Create new feedback
    new_feedback = Feedback(
        ticket_id=ticket_id,
        rating=feedback.rating,
        comment=feedback.comment,
        created_by_id=current_user.id,
        # Simple sentiment analysis - can be improved later
        sentiment=simple_analyze_sentiment(feedback.comment)
    )
    
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    
    return new_feedback
