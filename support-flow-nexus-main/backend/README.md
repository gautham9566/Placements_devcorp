# Support Flow Nexus - Backend Setup

This document provides instructions for setting up and running the Support Flow Nexus backend service.

## Prerequisites

- Python 3.8 or higher
- PostgreSQL database server
- Virtual environment (recommended)

## Installation

1. Create and activate a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

2. Install the required dependencies:
```bash
pip install -r requirements.txt
```

## Database Setup

1. Install and start PostgreSQL if you haven't already.

2. Create a new PostgreSQL database for the project:
```bash
psql -U postgres
CREATE DATABASE support_flow_nexus;
```

3. Create a `.env` file in the backend directory with the following content:
```
DATABASE_URL=postgresql://username:password@localhost/support_flow_nexus
JWT_SECRET_KEY=your_secure_secret_key
UPLOAD_FOLDER=uploads
```

Replace `username`, `password`, and `your_secure_secret_key` with your actual PostgreSQL credentials and a secure secret key.

## Database Initialization

1. Initialize the database tables:
```bash
python main.py
```

2. (Optional) Seed the database with initial data:
```bash
python seed.py
```

## Running the Application

1. Start the FastAPI server:
```bash
python run.py
```

The server will start on `http://localhost:5001` by default.

## API Documentation

Once the server is running, you can access:
- Interactive API documentation (Swagger UI): `http://localhost:5001/docs`
- Alternative API documentation (ReDoc): `http://localhost:5001/redoc`

## Testing

To run the test suite:
```bash
pytest test_api.py
```

## Project Structure

- `main.py`: Main application file with FastAPI configuration
- `run.py`: Server startup script
- `seed.py`: Database seeding script
- `app/`: Core application code
  - `routes/`: API route handlers
  - `models/`: Database models
  - `schemas/`: Pydantic schemas
  - `database.py`: Database configuration
  - `config.py`: Application configuration

## Available Endpoints

The API is organized into the following main sections:
- Authentication (`/api/auth/*`)
- Tickets (`/api/tickets/*`)
- Knowledge Base (`/api/knowledge/*`)

A health check endpoint is available at `/health`

## Environment Variables

- `DATABASE_URL`: PostgreSQL database connection string
- `JWT_SECRET_KEY`: Secret key for JWT token generation
- `UPLOAD_FOLDER`: Directory for file uploads (default: 'uploads')

## Notes

- The server includes CORS middleware configured for localhost development
- File uploads are stored in the `uploads` directory
- Debug logging is enabled by default 