from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import uvicorn
import logging
import os

from app.database import engine, Base
from app.routes import auth, tickets, knowledge, feedback
from app.config import Config

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create the FastAPI app
app = FastAPI(
    title="Support Flow Nexus API",
    description="API for the Support Flow Nexus ticketing system",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload directory
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

# Create database tables
Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(tickets.router, prefix="/api", tags=["Tickets"])
app.include_router(knowledge.router, prefix="/api", tags=["Knowledge Base"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["feedback"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    logger.debug("Health check endpoint called")
    return {"status": "healthy"}

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware to log requests and responses"""
    logger.debug(f"Request: {request.method} {request.url}")
    logger.debug(f"Request Headers: {dict(request.headers)}")
    
    response = await call_next(request)
    
    logger.debug(f"Response Status: {response.status_code}")
    return response

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True) 
