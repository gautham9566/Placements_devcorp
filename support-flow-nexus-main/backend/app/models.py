from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, ARRAY, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
from .schemas import UserRole, TicketStatus, TicketPriority

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    created_tickets = relationship("Ticket", back_populates="created_by", foreign_keys="[Ticket.created_by_id]")
    assigned_tickets = relationship("Ticket", back_populates="assigned_to", foreign_keys="[Ticket.assigned_to_id]")
    comments = relationship("Comment", back_populates="user")
    knowledge_articles = relationship("Knowledge", back_populates="created_by")
    feedback = relationship("Feedback", back_populates="created_by")

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    priority = Column(SQLEnum(TicketPriority), nullable=False)
    status = Column(SQLEnum(TicketStatus), nullable=False, default=TicketStatus.open)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolution_stage = Column(String)
    resolution_notes = Column(Text)
    solution_id = Column(Integer, ForeignKey("knowledge.id"))

    # Relationships
    created_by = relationship("User", back_populates="created_tickets", foreign_keys=[created_by_id])
    assigned_to = relationship("User", back_populates="assigned_tickets", foreign_keys=[assigned_to_id])
    comments = relationship("Comment", back_populates="ticket")
    solution = relationship("Knowledge")
    feedback = relationship("Feedback", back_populates="ticket", uselist=False)  # one-to-one relationship

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    ticket = relationship("Ticket", back_populates="comments")
    user = relationship("User", back_populates="comments")

class Knowledge(Base):
    __tablename__ = "knowledge"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    tags = Column(ARRAY(String))
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_by = relationship("User", back_populates="knowledge_articles")

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 rating
    comment = Column(Text)
    sentiment = Column(String)  # 'positive', 'neutral', 'negative'
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    ticket = relationship("Ticket", back_populates="feedback")
    created_by = relationship("User", back_populates="feedback")
