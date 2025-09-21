import requests
import json
import logging
import time
from datetime import datetime
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api_test_logs/api_test.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:5001/api"
HEADERS = {"Content-Type": "application/json"}
TOKEN = None

def log_response(response: requests.Response, endpoint: str) -> None:
    """Log the response details."""
    logger.info(f"\nEndpoint: {endpoint}")
    logger.info(f"Status Code: {response.status_code}")
    logger.info(f"Headers: {dict(response.headers)}")
    try:
        logger.info(f"Response Body: {json.dumps(response.json(), indent=2)}")
    except:
        logger.info(f"Response Body: {response.text}")

def wait_for_server(max_retries: int = 5, delay: int = 2) -> bool:
    """Wait for the server to become available."""
    for i in range(max_retries):
        try:
            response = requests.get(f"{BASE_URL}/docs")
            if response.status_code == 200:
                logger.info("Server is up and running!")
                return True
        except requests.exceptions.ConnectionError:
            logger.warning(f"Server not ready, attempt {i + 1}/{max_retries}")
            time.sleep(delay)
    return False

def make_request(
    method: str,
    endpoint: str,
    data: Optional[Dict[str, Any]] = None,
    files: Optional[Dict[str, Any]] = None,
    params: Optional[Dict[str, Any]] = None
) -> requests.Response:
    """Make an HTTP request and handle errors."""
    url = f"{BASE_URL}{endpoint}"
    headers = HEADERS.copy()
    
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    
    try:
        if files:
            # Remove Content-Type for multipart/form-data
            headers.pop("Content-Type", None)
        
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=data if not files else None,
            files=files,
            params=params,
            data=data if files else None
        )
        log_response(response, endpoint)
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed: {str(e)}")
        raise

def test_auth_endpoints():
    global TOKEN
    logger.info("\n=== Testing Authentication Endpoints ===")

    # Test registration
    register_data = {
        "email": "test@example.com",
        "password": "test123456",
        "name": "Test User",
        "role": "customer"
    }
    response = make_request("POST", "/auth/register", register_data)
    assert response.status_code in [200, 201], "Registration failed"

    # Test login
    login_data = {
        "username": "test@example.com",
        "password": "test123456"
    }
    response = make_request("POST", "/auth/login", login_data)
    assert response.status_code == 200, "Login failed"
    TOKEN = response.json()["access_token"]

    # Test get profile
    response = make_request("GET", "/auth/me")
    assert response.status_code == 200, "Get profile failed"

def test_ticket_endpoints():
    logger.info("\n=== Testing Ticket Endpoints ===")

    # Create ticket
    ticket_data = {
        "title": "Test Ticket",
        "description": "This is a test ticket",
        "category": "Test",
        "priority": "medium"
    }
    response = make_request("POST", "/tickets", ticket_data)
    assert response.status_code in [200, 201], "Create ticket failed"
    ticket_id = response.json()["id"]

    # Get tickets
    response = make_request("GET", "/tickets")
    assert response.status_code == 200, "Get tickets failed"

    # Get specific ticket
    response = make_request("GET", f"/tickets/{ticket_id}")
    assert response.status_code == 200, "Get specific ticket failed"

    # Update ticket
    update_data = {
        "status": "in_progress",
        "resolution_stage": "investigating"
    }
    response = make_request("PUT", f"/tickets/{ticket_id}", update_data)
    assert response.status_code == 200, "Update ticket failed"

    # Add comment
    comment_data = {
        "content": "This is a test comment"
    }
    response = make_request("POST", f"/tickets/{ticket_id}/comments", comment_data)
    assert response.status_code in [200, 201], "Add comment failed"

    # Get comments
    response = make_request("GET", f"/tickets/{ticket_id}/comments")
    assert response.status_code == 200, "Get comments failed"

def test_knowledge_endpoints():
    logger.info("\n=== Testing Knowledge Base Endpoints ===")

    # Create article
    article_data = {
        "title": "Test Article",
        "content": "This is a test article",
        "category": "Test",
        "tags": ["test", "example"]
    }
    response = make_request("POST", "/knowledge", article_data)
    assert response.status_code in [200, 201], "Create article failed"
    article_id = response.json()["id"]

    # Get articles
    response = make_request("GET", "/knowledge")
    assert response.status_code == 200, "Get articles failed"

    # Get specific article
    response = make_request("GET", f"/knowledge/{article_id}")
    assert response.status_code == 200, "Get specific article failed"

    # Update article
    update_data = {
        "title": "Updated Test Article",
        "content": "This is an updated test article"
    }
    response = make_request("PUT", f"/knowledge/{article_id}", update_data)
    assert response.status_code == 200, "Update article failed"

    # Delete article
    response = make_request("DELETE", f"/knowledge/{article_id}")
    assert response.status_code == 204, "Delete article failed"

def main():
    logger.info("Starting API tests...")
    
    if not wait_for_server():
        logger.error("Server not available. Exiting...")
        return

    try:
        test_auth_endpoints()
        test_ticket_endpoints()
        test_knowledge_endpoints()
        logger.info("\nAll tests completed successfully!")
    except AssertionError as e:
        logger.error(f"\nTest failed: {str(e)}")
    except Exception as e:
        logger.error(f"\nUnexpected error: {str(e)}")

if __name__ == "__main__":
    main() 