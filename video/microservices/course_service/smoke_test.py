import subprocess
import time
import requests

# Start the server
server = subprocess.Popen(['python', '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8006'])

# Wait for server to start
time.sleep(2)

# Make multiple requests
for i in range(5):
    try:
        response = requests.get('http://localhost:8006/api/courses')
        print(f"Request {i+1}: Status {response.status_code}")
        if response.status_code == 200:
            print("Success: No pool overflow")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Request {i+1} failed: {e}")

# Stop the server
server.terminate()
server.wait()