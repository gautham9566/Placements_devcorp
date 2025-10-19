import requests

try:
    response = requests.get(
        "http://localhost:8007/comments",
        params={"content_type": "video", "content_id": "test"}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
