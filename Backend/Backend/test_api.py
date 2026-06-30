#!/usr/bin/env python3
import requests
import json

# Test the projects API
base_url = "http://localhost:5000/api"

# Test 1: Check if API is working
try:
    response = requests.get(f"{base_url}/projects/test")
    print(f"Test API Status: {response.status_code}")
    print(f"Test API Response: {response.json()}")
except Exception as e:
    print(f"Test API Error: {e}")

# Test 2: Try to get projects (this will fail without auth, but shows if server is running)
try:
    response = requests.get(f"{base_url}/projects")
    print(f"Get Projects Status: {response.status_code}")
    print(f"Get Projects Response: {response.json()}")
except Exception as e:
    print(f"Get Projects Error: {e}")

# Test 3: Try PUT request without auth (should fail with 401)
try:
    test_data = {
        "project_code": "TEST-001",
        "project_name": "Test Project",
        "status": "draft"
    }
    response = requests.put(f"{base_url}/projects/1", json=test_data)
    print(f"PUT Project Status: {response.status_code}")
    print(f"PUT Project Response: {response.json()}")
except Exception as e:
    print(f"PUT Project Error: {e}")
