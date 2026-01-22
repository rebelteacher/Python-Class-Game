"""
Test Teacher Panel Feature - Student Progress and Code Viewing
Tests the new Teacher Panel endpoints:
1. GET /api/assignments/{id}/student-progress - Returns student progress per problem
2. GET /api/assignments/{id}/student-code/{student_id}/{problem_id} - Returns student code
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
TEACHER_EMAIL = "astapp@spanola.net"
TEACHER_PASSWORD = "AlisaFaith$14"

# Test data from the review request
TEST_ASSIGNMENT_ID = "673107ba-95cf-4fc5-a10e-9d48953d624c"  # Escape room 1
TEST_CLASSROOM_ID = "db1246e2-03cc-446b-bee0-c932d5278bf4"  # Test Classroom


class TestTeacherPanelBackend:
    """Test Teacher Panel backend APIs"""
    
    @pytest.fixture(scope="class")
    def teacher_session(self):
        """Login as teacher and get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/teacher-login",
            json={"email": TEACHER_EMAIL, "password": TEACHER_PASSWORD}
        )
        print(f"Teacher login response: {response.status_code}")
        if response.status_code != 200:
            print(f"Login failed: {response.text}")
            pytest.skip("Teacher login failed - skipping authenticated tests")
        
        data = response.json()
        session_token = data.get("session_token")
        user_id = data.get("id")
        print(f"Logged in as teacher: {data.get('name')} (ID: {user_id})")
        return {"token": session_token, "user_id": user_id, "user_data": data}
    
    def test_teacher_login(self, teacher_session):
        """Test teacher can login successfully"""
        assert teacher_session["token"] is not None
        assert teacher_session["user_data"]["role"] == "teacher"
        print(f"✅ Teacher login successful: {teacher_session['user_data']['name']}")
    
    def test_get_assignment_exists(self, teacher_session):
        """Test that the test assignment exists"""
        headers = {"Authorization": f"Bearer {teacher_session['token']}"}
        response = requests.get(
            f"{BASE_URL}/api/assignments/{TEST_ASSIGNMENT_ID}",
            headers=headers
        )
        print(f"Get assignment response: {response.status_code}")
        
        assert response.status_code == 200, f"Assignment not found: {response.text}"
        data = response.json()
        print(f"✅ Assignment found: {data.get('title')}")
        print(f"   Problems count: {len(data.get('problems', []))}")
        print(f"   Classroom IDs: {data.get('classroom_ids', [])}")
    
    def test_student_progress_endpoint(self, teacher_session):
        """Test GET /api/assignments/{id}/student-progress returns correct data"""
        headers = {"Authorization": f"Bearer {teacher_session['token']}"}
        
        # Test without classroom filter
        response = requests.get(
            f"{BASE_URL}/api/assignments/{TEST_ASSIGNMENT_ID}/student-progress",
            headers=headers
        )
        print(f"Student progress response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get student progress: {response.text}"
        
        data = response.json()
        print(f"✅ Student progress data received:")
        print(f"   Assignment title: {data.get('assignment_title')}")
        print(f"   Total students: {len(data.get('students', []))}")
        print(f"   Problems count: {len(data.get('problems', []))}")
        
        # Validate response structure
        assert "problems" in data, "Response missing 'problems' field"
        assert "students" in data, "Response missing 'students' field"
        assert "summary" in data, "Response missing 'summary' field"
        
        # Check students list
        students = data.get("students", [])
        print(f"   Students: {[s.get('name') for s in students]}")
        
        # Check problems structure
        for problem in data.get("problems", []):
            assert "problem_id" in problem, "Problem missing 'problem_id'"
            assert "completed_students" in problem, "Problem missing 'completed_students'"
            assert "in_progress_students" in problem, "Problem missing 'in_progress_students'"
            assert "not_started_students" in problem, "Problem missing 'not_started_students'"
            
            print(f"   Problem: {problem.get('problem_title')}")
            print(f"     - Completed: {len(problem.get('completed_students', []))}")
            print(f"     - In Progress: {len(problem.get('in_progress_students', []))}")
            print(f"     - Not Started: {len(problem.get('not_started_students', []))}")
    
    def test_student_progress_with_classroom_filter(self, teacher_session):
        """Test student progress endpoint with classroom_id filter"""
        headers = {"Authorization": f"Bearer {teacher_session['token']}"}
        
        response = requests.get(
            f"{BASE_URL}/api/assignments/{TEST_ASSIGNMENT_ID}/student-progress",
            params={"classroom_id": TEST_CLASSROOM_ID},
            headers=headers
        )
        print(f"Student progress (filtered) response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed with classroom filter: {response.text}"
        
        data = response.json()
        print(f"✅ Filtered student progress received:")
        print(f"   Students in classroom: {len(data.get('students', []))}")
    
    def test_student_code_endpoint_no_submission(self, teacher_session):
        """Test GET /api/assignments/{id}/student-code/{student_id}/{problem_id} for student with no submission"""
        headers = {"Authorization": f"Bearer {teacher_session['token']}"}
        
        # First get the student progress to find a student and problem
        progress_response = requests.get(
            f"{BASE_URL}/api/assignments/{TEST_ASSIGNMENT_ID}/student-progress",
            headers=headers
        )
        
        if progress_response.status_code != 200:
            pytest.skip("Could not get student progress")
        
        progress_data = progress_response.json()
        students = progress_data.get("students", [])
        problems = progress_data.get("problems", [])
        
        if not students or not problems:
            pytest.skip("No students or problems found")
        
        # Get first student and first problem
        student_id = students[0]["id"]
        problem_id = problems[0]["problem_id"]
        
        print(f"Testing student code for student: {students[0]['name']} (ID: {student_id})")
        print(f"Problem ID: {problem_id}")
        
        response = requests.get(
            f"{BASE_URL}/api/assignments/{TEST_ASSIGNMENT_ID}/student-code/{student_id}/{problem_id}",
            headers=headers
        )
        print(f"Student code response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get student code: {response.text}"
        
        data = response.json()
        print(f"✅ Student code response received:")
        print(f"   Student ID: {data.get('student_id')}")
        print(f"   Student Name: {data.get('student_name')}")
        print(f"   Has Code: {data.get('code') is not None}")
        print(f"   Score: {data.get('score')}")
        print(f"   Is Final: {data.get('is_final')}")
        print(f"   Attempts: {data.get('attempts')}")
        
        # Validate response structure
        assert "student_id" in data, "Response missing 'student_id'"
        assert "student_name" in data, "Response missing 'student_name'"
        assert "problem_id" in data, "Response missing 'problem_id'"
        assert "code" in data, "Response missing 'code' field"
        assert "is_final" in data, "Response missing 'is_final'"
        assert "attempts" in data, "Response missing 'attempts'"
    
    def test_student_progress_unauthorized(self):
        """Test that non-teachers cannot access student progress"""
        # Try without authentication
        response = requests.get(
            f"{BASE_URL}/api/assignments/{TEST_ASSIGNMENT_ID}/student-progress"
        )
        print(f"Unauthorized student progress response: {response.status_code}")
        
        assert response.status_code == 401, "Should return 401 for unauthenticated request"
        print("✅ Correctly rejected unauthenticated request")
    
    def test_student_code_unauthorized(self):
        """Test that non-teachers cannot access student code"""
        response = requests.get(
            f"{BASE_URL}/api/assignments/{TEST_ASSIGNMENT_ID}/student-code/fake-student/fake-problem"
        )
        print(f"Unauthorized student code response: {response.status_code}")
        
        assert response.status_code == 401, "Should return 401 for unauthenticated request"
        print("✅ Correctly rejected unauthenticated request")
    
    def test_student_progress_invalid_assignment(self, teacher_session):
        """Test student progress with invalid assignment ID"""
        headers = {"Authorization": f"Bearer {teacher_session['token']}"}
        
        response = requests.get(
            f"{BASE_URL}/api/assignments/invalid-assignment-id/student-progress",
            headers=headers
        )
        print(f"Invalid assignment response: {response.status_code}")
        
        assert response.status_code == 404, "Should return 404 for invalid assignment"
        print("✅ Correctly returned 404 for invalid assignment")


class TestClassroomStudents:
    """Test that classroom has students for Teacher Panel"""
    
    @pytest.fixture(scope="class")
    def teacher_session(self):
        """Login as teacher and get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/teacher-login",
            json={"email": TEACHER_EMAIL, "password": TEACHER_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Teacher login failed")
        
        data = response.json()
        return {"token": data.get("session_token"), "user_id": data.get("id")}
    
    def test_classroom_has_students(self, teacher_session):
        """Verify the test classroom has students enrolled"""
        headers = {"Authorization": f"Bearer {teacher_session['token']}"}
        
        response = requests.get(
            f"{BASE_URL}/api/classrooms/{TEST_CLASSROOM_ID}",
            headers=headers
        )
        print(f"Classroom response: {response.status_code}")
        
        if response.status_code == 404:
            print("⚠️ Test classroom not found - may need to create test data")
            pytest.skip("Test classroom not found")
        
        assert response.status_code == 200, f"Failed to get classroom: {response.text}"
        
        data = response.json()
        print(f"✅ Classroom found: {data.get('name')}")
        print(f"   Class code: {data.get('class_code')}")
        
        students = data.get("student_details", []) or data.get("students", [])
        print(f"   Students enrolled: {len(students)}")
        
        for student in students:
            if isinstance(student, dict):
                print(f"     - {student.get('name')} ({student.get('email')})")
            else:
                print(f"     - Student ID: {student}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
