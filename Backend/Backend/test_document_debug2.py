#!/usr/bin/env python3
import requests
import json
from io import BytesIO

def test_document_upload_debug2():
    base_url = "http://localhost:5000/api"
    
    # Login to get token
    login_data = {
        "email": "jinal@goma.com", 
        "password": "Jinal@123"
    }
    
    try:
        response = requests.post(f"{base_url}/auth/login", json=login_data)
        print(f"Login Status: {response.status_code}")
        
        if response.status_code == 200:
            token = response.json().get("data", {}).get("token")
            print(f"Got token: {token[:20] if token else 'None'}...")
            
            if token:
                headers = {"Authorization": f"Bearer {token}"}
                
                # Create a test file
                test_file_content = b"This is a test document for project upload"
                test_file = BytesIO(test_file_content)
                
                # Test PUT with FormData and file - EXACTLY like frontend
                files = {
                    'documents[0].file': ('test_document.txt', test_file, 'text/plain')
                }
                
                data = {
                    "client_id": "1",
                    "project_code": "TEST-001", 
                    "project_name": "Test Project with Document",
                    "project_description": "Test with document upload",
                    "status": "draft",
                    "documents[0].document_type": "project_document",
                    "documents[0].file_name": "test_document.txt",
                    "scope_tests": "[]"
                }
                
                print("Sending PUT request with document...")
                print(f"Files being sent: {list(files.keys())}")
                print(f"Data being sent: {data}")
                
                response = requests.put(f"{base_url}/projects/1", data=data, files=files, headers=headers)
                print(f"PUT Status: {response.status_code}")
                print(f"PUT Response: {response.json()}")
                
        else:
            print(f"Login failed: {response.json()}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_document_upload_debug2()
