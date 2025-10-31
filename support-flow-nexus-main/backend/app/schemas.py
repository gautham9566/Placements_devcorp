from pydantic import BaseModel, EmailStr, constr
from typing import List, Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    agent = "agent"
    customer = "customer"

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole

class UserCreate(UserBase):
    password: constr(min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class TicketStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"

class TicketPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"

class TicketBase(BaseModel):
    title: str
    description: str
    category: str
    priority: TicketPriority

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    assigned_to_id: Optional[int] = None
    resolution_stage: Optional[str] = None
    resolution_notes: Optional[str] = None
    solution_id: Optional[int] = None

class Ticket(TicketBase):
    id: int
    status: TicketStatus
    created_by: User  # Change this from created_by_id
    assigned_to: Optional[User]  # Change this from assigned_to_id
    created_at: datetime
    updated_at: datetime
    resolution_stage: Optional[str]
    resolution_notes: Optional[str]
    solution_id: Optional[int]

    class Config:
        from_attributes = True

class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    id: int
    ticket_id: int
    user_id: int
    user: User  # Add this to include the full user object
    created_at: datetime

    class Config:
        from_attributes = True

class KnowledgeBase(BaseModel):
    title: str
    content: str
    category: str
    tags: List[str]

class KnowledgeCreate(KnowledgeBase):
    pass

class KnowledgeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None

class Knowledge(KnowledgeBase):
    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FeedbackCreate(BaseModel):
    rating: int
    comment: str

class Feedback(FeedbackCreate):
    id: int
    ticket_id: int
    sentiment: str
    created_by_id: int
    created_at: datetime

    class Config:
        from_attributes = True


