from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Knowledge
from ..schemas import KnowledgeCreate, Knowledge as KnowledgeSchema, KnowledgeUpdate
from ..auth import get_current_user, get_current_agent_user

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

@router.post("", response_model=KnowledgeSchema)
def create_article(
    article: KnowledgeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent_user)
):
    db_article = Knowledge(**article.dict(), created_by_id=current_user.id)
    db.add(db_article)
    db.commit()
    db.refresh(db_article)
    return db_article

@router.get("", response_model=List[KnowledgeSchema])
def get_articles(
    skip: int = 0,
    limit: int = 100,
    category: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Knowledge)
    if category:
        query = query.filter(Knowledge.category == category)
    articles = query.offset(skip).limit(limit).all()
    return articles

@router.get("/{article_id}", response_model=KnowledgeSchema)
def get_article(article_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    article = db.query(Knowledge).filter(Knowledge.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@router.put("/{article_id}", response_model=KnowledgeSchema)
def update_article(
    article_id: int,
    article_update: KnowledgeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent_user)
):
    db_article = db.query(Knowledge).filter(Knowledge.id == article_id).first()
    if not db_article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    for field, value in article_update.dict(exclude_unset=True).items():
        setattr(db_article, field, value)
    
    db.commit()
    db.refresh(db_article)
    return db_article

@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent_user)
):
    db_article = db.query(Knowledge).filter(Knowledge.id == article_id).first()
    if not db_article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    db.delete(db_article)
    db.commit()
    return None 