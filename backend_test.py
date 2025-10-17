import requests
import sys
import json
from datetime import datetime
import uuid

class CodeClassAPITester:
    def __init__(self, base_url="https://devmentor-14.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}, Expected: {expected_status}"
            
            if not success:
                try:
                    error_detail = response.json()
                    details += f", Response: {error_detail}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {"success": True}
            else:
                return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def setup_test_user(self):
        """Create test user and session directly in MongoDB"""
        print("\n🔧 Setting up test user...")
        
        # Generate unique IDs
        timestamp = str(int(datetime.now().timestamp()))
        self.user_id = f"test-user-{timestamp}"
        self.session_token = f"test_session_{timestamp}"
        
        # MongoDB commands to create test user and session
        mongo_commands = f"""
        use test_database;
        db.users.insertOne({{
            id: "{self.user_id}",
            email: "test.user.{timestamp}@example.com",
            name: "Test User {timestamp}",
            picture: "https://via.placeholder.com/150",
            role: "teacher",
            created_at: new Date().toISOString()
        }});
        db.user_sessions.insertOne({{
            user_id: "{self.user_id}",
            session_token: "{self.session_token}",
            expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
            created_at: new Date().toISOString()
        }});
        """
        
        # Try to execute MongoDB commands
        try:
            import subprocess
            result = subprocess.run(
                ['mongosh', '--eval', mongo_commands],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                print(f"✅ Test user created: {self.user_id}")
                print(f"✅ Session token: {self.session_token}")
                return True
            else:
                print(f"❌ MongoDB setup failed: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ MongoDB setup error: {str(e)}")
            return False

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication Endpoints...")
        
        # Test /auth/me endpoint
        response = self.run_test(
            "Get current user info",
            "GET",
            "auth/me",
            200
        )
        
        if response:
            print(f"   User: {response.get('name')} ({response.get('role')})")
        
        # Test role switching
        self.run_test(
            "Switch user role",
            "POST",
            "auth/switch-role",
            200
        )
        
        # Switch back to teacher
        self.run_test(
            "Switch back to teacher",
            "POST",
            "auth/switch-role",
            200
        )

    def test_classroom_endpoints(self):
        """Test classroom management endpoints"""
        print("\n🏫 Testing Classroom Endpoints...")
        
        # Create classroom
        classroom_data = {
            "name": f"Test Classroom {datetime.now().strftime('%H%M%S')}"
        }
        
        classroom = self.run_test(
            "Create classroom",
            "POST",
            "classrooms",
            200,
            classroom_data
        )
        
        if not classroom:
            print("❌ Cannot continue classroom tests without created classroom")
            return None
        
        classroom_id = classroom.get('id')
        class_code = classroom.get('class_code')
        print(f"   Created classroom: {classroom_id} with code: {class_code}")
        
        # Get classrooms
        self.run_test(
            "Get user classrooms",
            "GET",
            "classrooms",
            200
        )
        
        # Get specific classroom
        self.run_test(
            "Get classroom details",
            "GET",
            f"classrooms/{classroom_id}",
            200
        )
        
        return {"id": classroom_id, "class_code": class_code}

    def test_assignment_endpoints(self, classroom_id):
        """Test assignment management endpoints"""
        print("\n📝 Testing Assignment Endpoints...")
        
        # Create assignment
        assignment_data = {
            "classroom_id": classroom_id,
            "title": f"Test Assignment {datetime.now().strftime('%H%M%S')}",
            "description": "Write a function that adds two numbers",
            "starter_code": "def add_numbers(a, b):\n    # Your code here\n    pass",
            "solution_code": "def add_numbers(a, b):\n    return a + b\n\nprint(add_numbers(2, 3))",
            "test_cases": [
                {
                    "input_data": "",
                    "expected_output": "5",
                    "description": "Test adding 2 + 3"
                },
                {
                    "input_data": "",
                    "expected_output": "5",
                    "description": "Test basic addition"
                }
            ]
        }
        
        assignment = self.run_test(
            "Create assignment",
            "POST",
            "assignments",
            200,
            assignment_data
        )
        
        if not assignment:
            print("❌ Cannot continue assignment tests without created assignment")
            return None
        
        assignment_id = assignment.get('id')
        print(f"   Created assignment: {assignment_id}")
        
        # Get assignments for classroom
        self.run_test(
            "Get classroom assignments",
            "GET",
            f"assignments/classroom/{classroom_id}",
            200
        )
        
        # Get specific assignment
        self.run_test(
            "Get assignment details",
            "GET",
            f"assignments/{assignment_id}",
            200
        )
        
        return assignment_id

    def test_code_execution(self):
        """Test code execution endpoint"""
        print("\n🐍 Testing Code Execution...")
        
        # Test simple code execution
        code_data = {
            "code": "print('Hello, World!')",
            "test_input": ""
        }
        
        self.run_test(
            "Execute simple Python code",
            "POST",
            "code/execute",
            200,
            code_data
        )
        
        # Test code with input
        code_with_input = {
            "code": "name = input('Enter name: ')\nprint(f'Hello, {name}!')",
            "test_input": "Alice"
        }
        
        self.run_test(
            "Execute code with input",
            "POST",
            "code/execute",
            200,
            code_with_input
        )

    def test_submission_endpoints(self, assignment_id):
        """Test submission endpoints"""
        print("\n📤 Testing Submission Endpoints...")
        
        # Create student user for submission
        print("   Creating student user for submission test...")
        student_timestamp = str(int(datetime.now().timestamp()) + 1)
        student_id = f"test-student-{student_timestamp}"
        student_token = f"test_student_session_{student_timestamp}"
        
        mongo_commands = f"""
        use test_database;
        db.users.insertOne({{
            id: "{student_id}",
            email: "test.student.{student_timestamp}@example.com",
            name: "Test Student {student_timestamp}",
            role: "student",
            created_at: new Date()
        }});
        db.user_sessions.insertOne({{
            user_id: "{student_id}",
            session_token: "{student_token}",
            expires_at: new Date(Date.now() + 7*24*60*60*1000),
            created_at: new Date()
        }});
        """
        
        try:
            import subprocess
            subprocess.run(['mongosh', '--eval', mongo_commands], capture_output=True, timeout=10)
            
            # Temporarily switch to student token
            original_token = self.session_token
            self.session_token = student_token
            
            # Submit assignment
            submission_data = {
                "assignment_id": assignment_id,
                "code": "def add_numbers(a, b):\n    return a + b\n\nprint(add_numbers(2, 3))"
            }
            
            submission = self.run_test(
                "Submit assignment (as student)",
                "POST",
                "submissions",
                200,
                submission_data
            )
            
            if submission:
                print(f"   Submission score: {submission.get('score', 0)}%")
            
            # Get submissions for assignment (as student)
            self.run_test(
                "Get student submissions",
                "GET",
                f"submissions/assignment/{assignment_id}",
                200
            )
            
            # Switch back to teacher token
            self.session_token = original_token
            
            # Get submissions as teacher
            self.run_test(
                "Get all submissions (as teacher)",
                "GET",
                f"submissions/assignment/{assignment_id}",
                200
            )
            
        except Exception as e:
            print(f"   ⚠️  Student submission test failed: {str(e)}")
            self.session_token = original_token

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting CodeClass API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Setup test user
        if not self.setup_test_user():
            print("❌ Cannot proceed without test user setup")
            return False
        
        # Test authentication
        self.test_auth_endpoints()
        
        # Test classrooms
        classroom = self.test_classroom_endpoints()
        if not classroom:
            print("❌ Cannot proceed without classroom")
            return False
        
        # Test assignments
        assignment_id = self.test_assignment_endpoints(classroom['id'])
        if not assignment_id:
            print("❌ Cannot proceed without assignment")
            return False
        
        # Test code execution
        self.test_code_execution()
        
        # Test submissions
        self.test_submission_endpoints(assignment_id)
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Total tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = CodeClassAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())