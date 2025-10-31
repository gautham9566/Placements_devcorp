from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, Ticket, Comment, Knowledge
from app.auth import get_password_hash

def seed_database():
    db = SessionLocal()
    try:
        # Create admin user
        admin = User(
            email="admin@example.com",
            name="Admin User",
            hashed_password=get_password_hash("admin123"),
            role="admin",
            created_at=datetime.utcnow()
        )
        db.add(admin)

        # Create agent user
        agent = User(
            email="agent@example.com",
            name="Support Agent",
            hashed_password=get_password_hash("agent123"),
            role="agent",
            created_at=datetime.utcnow()
        )
        db.add(agent)

        # Create customer user
        customer = User(
            email="customer@example.com",
            name="Test Customer",
            hashed_password=get_password_hash("customer123"),
            role="customer",
            created_at=datetime.utcnow()
        )
        db.add(customer)
        db.commit()

        # Create knowledge base articles
        article1 = Knowledge(
            title="Common Issues and Solutions",
            content="This article covers the most common issues users face and their solutions...",
            category="Troubleshooting",
            tags=["common-issues", "solutions", "help"],
            created_by_id=admin.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(article1)

        article2 = Knowledge(
            title="Getting Started Guide",
            content="Welcome to our platform! Here's how to get started...",
            category="Guides",
            tags=["getting-started", "tutorial", "guide"],
            created_by_id=agent.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(article2)
        db.commit()

        # Create tickets
        ticket1 = Ticket(
            title="Need help with login",
            description="I can't log in to my account. It keeps showing an error message.",
            category="Account Issues",
            priority="high",
            status="open",
            created_by_id=customer.id,
            assigned_to_id=agent.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(ticket1)

        ticket2 = Ticket(
            title="Feature request",
            description="Would it be possible to add dark mode to the application?",
            category="Feature Request",
            priority="low",
            status="in-progress",
            created_by_id=customer.id,
            assigned_to_id=agent.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(ticket2)
        db.commit()

        # Create comments
        comment1 = Comment(
            content="I've tried clearing my cache but it didn't help.",
            ticket_id=ticket1.id,
            user_id=customer.id,
            created_at=datetime.utcnow()
        )
        db.add(comment1)

        comment2 = Comment(
            content="Have you tried resetting your password?",
            ticket_id=ticket1.id,
            user_id=agent.id,
            created_at=datetime.utcnow()
        )
        db.add(comment2)

        comment3 = Comment(
            content="Thanks for the suggestion! We'll consider it for future updates.",
            ticket_id=ticket2.id,
            user_id=agent.id,
            created_at=datetime.utcnow()
        )
        db.add(comment3)
        db.commit()

        print("Database seeded successfully!")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database() 