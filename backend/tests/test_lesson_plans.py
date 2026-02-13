"""
Test suite for Lesson Plan Creator API endpoints
Tests: GET/POST/PUT/DELETE /api/lesson-plans
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://planmaster-32.preview.emergentagent.com')

# Test credentials
TEACHER_EMAIL = "astapp@spanola.net"
TEACHER_PASSWORD = "AlisaFaith$14"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for teacher"""
    response = requests.post(
        f"{BASE_URL}/api/auth/teacher-login",
        json={"email": TEACHER_EMAIL, "password": TEACHER_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("session_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Shared requests session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestLessonPlansAPI:
    """Test Lesson Plans CRUD operations"""
    
    created_plan_id = None
    created_lesson_id = None
    
    def test_01_get_lesson_plans_empty_or_existing(self, api_client):
        """Test GET /api/lesson-plans - should return list (empty or with existing plans)"""
        response = api_client.get(f"{BASE_URL}/api/lesson-plans")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/lesson-plans returned {len(data)} lesson plans")
    
    def test_02_create_lesson_plan(self, api_client):
        """Test POST /api/lesson-plans - create a new lesson plan"""
        unique_id = f"test-lesson-{uuid.uuid4().hex[:8]}"
        TestLessonPlansAPI.created_lesson_id = unique_id
        
        payload = {
            "lesson_id": unique_id,
            "module_id": "batesville-jh",
            "title": "TEST: Introduction to HTML",
            "description": "Learn the basics of HTML structure",
            "order": 1,
            "content": "# Introduction to HTML\n\nHTML stands for HyperText Markup Language.\n\n## Basic Structure\n\n```html\n<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello World!</h1>\n</body>\n</html>\n```",
            "exercise_type": "code",
            "starter_code": "<!DOCTYPE html>\n<html>\n<head>\n  <title></title>\n</head>\n<body>\n  <!-- Add your code here -->\n</body>\n</html>",
            "solution_code": "<!DOCTYPE html>\n<html>\n<head>\n  <title>My First Page</title>\n</head>\n<body>\n  <h1>Hello World!</h1>\n</body>\n</html>",
            "validation_rules": {
                "required_tags": ["html", "head", "body", "h1"],
                "required_attributes": ["title"],
                "required_text": ["Hello World"],
                "css_properties": []
            },
            "xp_reward": 100,
            "practice": [
                {
                    "exercise_id": f"{unique_id}-p1",
                    "title": "Practice: Add a Paragraph",
                    "instructions": "Add a paragraph tag with some text",
                    "starter_code": "<body>\n  <!-- Add a paragraph here -->\n</body>",
                    "solution_code": "<body>\n  <p>This is my paragraph.</p>\n</body>",
                    "validation_rules": {
                        "required_tags": ["p"],
                        "required_text": []
                    },
                    "hints": ["Use the <p> tag", "Don't forget to close the tag"],
                    "xp_reward": 25
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/lesson-plans", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["lesson_id"] == unique_id, f"lesson_id mismatch"
        assert data["title"] == "TEST: Introduction to HTML", "title mismatch"
        assert data["module_id"] == "batesville-jh", "module_id mismatch"
        assert data["xp_reward"] == 100, "xp_reward mismatch"
        assert len(data.get("practice", [])) == 1, "Should have 1 practice exercise"
        
        TestLessonPlansAPI.created_plan_id = data["id"]
        print(f"✅ Created lesson plan with ID: {data['id']}")
    
    def test_03_get_lesson_plans_contains_created(self, api_client):
        """Test GET /api/lesson-plans - verify created plan is in list"""
        response = api_client.get(f"{BASE_URL}/api/lesson-plans")
        
        assert response.status_code == 200
        
        data = response.json()
        plan_ids = [p.get("id") for p in data]
        
        assert TestLessonPlansAPI.created_plan_id in plan_ids, "Created plan should be in list"
        print(f"✅ Created plan found in list")
    
    def test_04_get_single_lesson_plan(self, api_client):
        """Test GET /api/lesson-plans/{plan_id} - get specific plan"""
        plan_id = TestLessonPlansAPI.created_plan_id
        
        response = api_client.get(f"{BASE_URL}/api/lesson-plans/{plan_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == plan_id, "ID mismatch"
        assert data["title"] == "TEST: Introduction to HTML", "title mismatch"
        print(f"✅ Retrieved single lesson plan: {data['title']}")
    
    def test_05_update_lesson_plan(self, api_client):
        """Test PUT /api/lesson-plans/{plan_id} - update plan"""
        plan_id = TestLessonPlansAPI.created_plan_id
        
        update_payload = {
            "title": "TEST: Introduction to HTML (Updated)",
            "description": "Updated description - Learn HTML basics",
            "xp_reward": 150,
            "order": 2
        }
        
        response = api_client.put(f"{BASE_URL}/api/lesson-plans/{plan_id}", json=update_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["title"] == "TEST: Introduction to HTML (Updated)", "title not updated"
        assert data["description"] == "Updated description - Learn HTML basics", "description not updated"
        assert data["xp_reward"] == 150, "xp_reward not updated"
        assert data["order"] == 2, "order not updated"
        print(f"✅ Updated lesson plan successfully")
    
    def test_06_verify_update_persisted(self, api_client):
        """Test GET after PUT - verify update was persisted"""
        plan_id = TestLessonPlansAPI.created_plan_id
        
        response = api_client.get(f"{BASE_URL}/api/lesson-plans/{plan_id}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == "TEST: Introduction to HTML (Updated)", "Update not persisted"
        assert data["xp_reward"] == 150, "xp_reward update not persisted"
        print(f"✅ Update persisted correctly")
    
    def test_07_duplicate_lesson_id_rejected(self, api_client):
        """Test POST with duplicate lesson_id - should fail"""
        payload = {
            "lesson_id": TestLessonPlansAPI.created_lesson_id,  # Same as created
            "module_id": "batesville-jh",
            "title": "Duplicate Test",
            "description": "This should fail",
            "order": 1,
            "content": "",
            "exercise_type": "code",
            "starter_code": "",
            "solution_code": "",
            "xp_reward": 100
        }
        
        response = api_client.post(f"{BASE_URL}/api/lesson-plans", json=payload)
        
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
        print(f"✅ Duplicate lesson_id correctly rejected")
    
    def test_08_delete_lesson_plan(self, api_client):
        """Test DELETE /api/lesson-plans/{plan_id} - delete plan"""
        plan_id = TestLessonPlansAPI.created_plan_id
        
        response = api_client.delete(f"{BASE_URL}/api/lesson-plans/{plan_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data or "success" in data, "Should return success message"
        print(f"✅ Deleted lesson plan successfully")
    
    def test_09_verify_delete_persisted(self, api_client):
        """Test GET after DELETE - verify plan is gone"""
        plan_id = TestLessonPlansAPI.created_plan_id
        
        response = api_client.get(f"{BASE_URL}/api/lesson-plans/{plan_id}")
        
        assert response.status_code == 404, f"Expected 404 after delete, got {response.status_code}"
        print(f"✅ Delete persisted - plan no longer exists")
    
    def test_10_get_nonexistent_plan(self, api_client):
        """Test GET /api/lesson-plans/{invalid_id} - should return 404"""
        response = api_client.get(f"{BASE_URL}/api/lesson-plans/nonexistent-id-12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Nonexistent plan returns 404")


class TestLessonPlansValidation:
    """Test validation rules for lesson plans"""
    
    def test_create_without_title_fails(self, api_client):
        """Test POST without required title field"""
        payload = {
            "lesson_id": f"test-no-title-{uuid.uuid4().hex[:8]}",
            "module_id": "batesville-jh",
            # Missing title
            "description": "Test",
            "order": 1,
            "content": "",
            "exercise_type": "code",
            "starter_code": "",
            "solution_code": "",
            "xp_reward": 100
        }
        
        response = api_client.post(f"{BASE_URL}/api/lesson-plans", json=payload)
        
        assert response.status_code == 422, f"Expected 422 for missing title, got {response.status_code}"
        print(f"✅ Missing title correctly rejected with 422")
    
    def test_create_without_lesson_id_fails(self, api_client):
        """Test POST without required lesson_id field"""
        payload = {
            # Missing lesson_id
            "module_id": "batesville-jh",
            "title": "Test Title",
            "description": "Test",
            "order": 1,
            "content": "",
            "exercise_type": "code",
            "starter_code": "",
            "solution_code": "",
            "xp_reward": 100
        }
        
        response = api_client.post(f"{BASE_URL}/api/lesson-plans", json=payload)
        
        assert response.status_code == 422, f"Expected 422 for missing lesson_id, got {response.status_code}"
        print(f"✅ Missing lesson_id correctly rejected with 422")


class TestLessonPlansAuth:
    """Test authentication requirements for lesson plans"""
    
    def test_get_without_auth_fails(self):
        """Test GET without authentication"""
        response = requests.get(f"{BASE_URL}/api/lesson-plans")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print(f"✅ Unauthenticated request correctly rejected")
    
    def test_post_without_auth_fails(self):
        """Test POST without authentication"""
        payload = {
            "lesson_id": "test-unauth",
            "module_id": "batesville-jh",
            "title": "Test",
            "description": "Test",
            "order": 1,
            "content": "",
            "exercise_type": "code",
            "starter_code": "",
            "solution_code": "",
            "xp_reward": 100
        }
        
        response = requests.post(f"{BASE_URL}/api/lesson-plans", json=payload)
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print(f"✅ Unauthenticated POST correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
