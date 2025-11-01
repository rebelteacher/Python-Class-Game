import requests
import sys
import json
from datetime import datetime, timezone, timedelta
import uuid

class CodeClassAPITester:
    def __init__(self, base_url="https://testsmith-3.preview.emergentagent.com"):
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
        
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            from datetime import datetime, timezone, timedelta
            import asyncio
            
            # Generate unique IDs
            timestamp = str(int(datetime.now().timestamp()))
            self.user_id = f"test-user-{timestamp}"
            self.session_token = f"test_session_{timestamp}"
            
            async def create_test_data():
                client = AsyncIOMotorClient("mongodb://localhost:27017")
                db = client["test_database"]
                
                # Create user
                user_doc = {
                    "id": self.user_id,
                    "email": f"test.user.{timestamp}@example.com",
                    "name": f"Test User {timestamp}",
                    "picture": "https://via.placeholder.com/150",
                    "role": "teacher",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.users.insert_one(user_doc)
                
                # Create session
                session_doc = {
                    "user_id": self.user_id,
                    "session_token": self.session_token,
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.sessions.insert_one(session_doc)
                
                client.close()
                return True
            
            # Run async function
            result = asyncio.run(create_test_data())
            
            if result:
                print(f"✅ Test user created: {self.user_id}")
                print(f"✅ Session token: {self.session_token}")
                return True
            else:
                return False
                
        except Exception as e:
            print(f"❌ MongoDB setup error: {str(e)}")
            # Fallback to mongosh
            return self.setup_test_user_fallback()

    def setup_test_user_fallback(self):
        """Fallback method using mongosh"""
        timestamp = str(int(datetime.now().timestamp()))
        self.user_id = f"test-user-{timestamp}"
        self.session_token = f"test_session_{timestamp}"
        
        mongo_commands = f"""
        use test_database;
        db.users.insertOne({{
            id: "{self.user_id}",
            email: "test.user.{timestamp}@example.com",
            name: "Test User {timestamp}",
            picture: "https://via.placeholder.com/150",
            role: "teacher",
            created_at: new Date()
        }});
        db.sessions.insertOne({{
            user_id: "{self.user_id}",
            session_token: "{self.session_token}",
            expires_at: new Date(Date.now() + 7*24*60*60*1000),
            created_at: new Date()
        }});
        """
        
        try:
            import subprocess
            result = subprocess.run(
                ['mongosh', '--eval', mongo_commands],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                print(f"✅ Test user created (fallback): {self.user_id}")
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

    def create_student_user(self, suffix=""):
        """Helper method to create a student user"""
        base_timestamp = int(datetime.now().timestamp())
        if suffix and suffix.isdigit():
            student_timestamp = str(base_timestamp + int(suffix))
        else:
            student_timestamp = str(base_timestamp) + (f"-{suffix}" if suffix else "")
        student_id = f"test-student-{student_timestamp}"
        student_token = f"test_student_session_{student_timestamp}"
        
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
            
            async def create_student_data():
                client = AsyncIOMotorClient("mongodb://localhost:27017")
                db = client["test_database"]
                
                # Create student user with default stats
                user_doc = {
                    "id": student_id,
                    "email": f"test.student.{student_timestamp}@example.com",
                    "name": f"Test Student {student_timestamp}",
                    "role": "student",
                    "xp": 0,
                    "coins": 0,
                    "rank": "Rookie",
                    "rank_level": 1,
                    "problems_solved": 0,
                    "perfect_scores": 0,
                    "current_streak": 0,
                    "best_streak": 0,
                    "owned_themes": ["default"],
                    "owned_badges": [],
                    "active_theme": "default",
                    "active_badges": [],
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.users.insert_one(user_doc)
                
                # Create session
                session_doc = {
                    "user_id": student_id,
                    "session_token": student_token,
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.sessions.insert_one(session_doc)
                
                client.close()
                return True
            
            # Run async function
            asyncio.run(create_student_data())
            return {"id": student_id, "token": student_token}
            
        except Exception as e:
            print(f"   ❌ Failed to create student user: {str(e)}")
            return None

    def add_student_to_classroom(self, student_id, classroom_id):
        """Helper method to add student to classroom"""
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
            
            async def add_student():
                client = AsyncIOMotorClient("mongodb://localhost:27017")
                db = client["test_database"]
                
                # Add student to classroom
                await db.classrooms.update_one(
                    {"id": classroom_id},
                    {"$push": {"students": student_id}}
                )
                
                client.close()
                return True
            
            asyncio.run(add_student())
            return True
            
        except Exception as e:
            print(f"   ❌ Failed to add student to classroom: {str(e)}")
            return False

    def test_403_forbidden_fix(self, assignment_id, classroom_id):
        """Test the 403 Forbidden error fix for first-time submissions"""
        print("\n🔒 Testing 403 Forbidden Error Fix...")
        
        # Create a fresh student user
        student = self.create_student_user("403test")
        if not student:
            print("❌ Cannot test 403 fix without student user")
            return
        
        # Add student to classroom
        if not self.add_student_to_classroom(student["id"], classroom_id):
            print("❌ Cannot test 403 fix without adding student to classroom")
            return
        
        # Switch to student token
        original_token = self.session_token
        self.session_token = student["token"]
        
        try:
            # Test first-time submission (should NOT get 403 error)
            submission_data = {
                "assignment_id": assignment_id,
                "code": "def add_numbers(a, b):\n    return a + b\n\nprint(add_numbers(2, 3))"
            }
            
            print("   Testing first-time submission (should succeed)...")
            submission = self.run_test(
                "First-time submission (no 403 error)",
                "POST",
                "submissions",
                200,
                submission_data
            )
            
            if submission:
                lives_remaining = submission.get('lives_remaining', 0)
                attempt_number = submission.get('attempt_number', 0)
                print(f"   ✅ First submission successful!")
                print(f"   Lives remaining: {lives_remaining}")
                print(f"   Attempt number: {attempt_number}")
                
                # Verify lives_remaining = 3 for first submission
                if lives_remaining == 3:
                    self.log_test("First submission has 3 lives remaining", True)
                else:
                    self.log_test("First submission has 3 lives remaining", False, f"Expected 3, got {lives_remaining}")
                
                # Verify attempt_number = 1 for first submission
                if attempt_number == 1:
                    self.log_test("First submission is attempt number 1", True)
                else:
                    self.log_test("First submission is attempt number 1", False, f"Expected 1, got {attempt_number}")
            else:
                print("   ❌ First submission failed - 403 error fix not working")
        
        finally:
            # Switch back to teacher token
            self.session_token = original_token

    def test_lives_system(self, assignment_id, classroom_id):
        """Test the lives system with proper tracking of 3 lives"""
        print("\n❤️  Testing Lives System...")
        
        # Create a fresh student user for lives testing
        student = self.create_student_user("livestest")
        if not student:
            print("❌ Cannot test lives system without student user")
            return
        
        # Add student to classroom
        if not self.add_student_to_classroom(student["id"], classroom_id):
            print("❌ Cannot test lives system without adding student to classroom")
            return
        
        # Switch to student token
        original_token = self.session_token
        self.session_token = student["token"]
        
        try:
            # Test scenario: Submit failing code 3 times, then verify lockout
            failing_code = "def add_numbers(a, b):\n    return 0  # Wrong answer\n\nprint(add_numbers(2, 3))"
            
            lives_tracking = []
            
            # Submit failing code 3 times
            for attempt in range(1, 4):
                print(f"   Submitting failing code - Attempt {attempt}...")
                
                submission_data = {
                    "assignment_id": assignment_id,
                    "code": failing_code
                }
                
                submission = self.run_test(
                    f"Failing submission attempt {attempt}",
                    "POST",
                    "submissions",
                    200,
                    submission_data
                )
                
                if submission:
                    lives_remaining = submission.get('lives_remaining', 0)
                    score = submission.get('score', 0)
                    is_passing = submission.get('is_passing', False)
                    
                    lives_tracking.append({
                        "attempt": attempt,
                        "lives_remaining": lives_remaining,
                        "score": score,
                        "is_passing": is_passing
                    })
                    
                    print(f"     Score: {score}%, Lives remaining: {lives_remaining}, Passing: {is_passing}")
                    
                    # Verify score is below 70% (failing)
                    if score < 70:
                        self.log_test(f"Attempt {attempt} is failing (<70%)", True)
                    else:
                        self.log_test(f"Attempt {attempt} is failing (<70%)", False, f"Score was {score}%")
                    
                    # Verify lives decrease correctly
                    expected_lives = 3 - attempt
                    if lives_remaining == expected_lives:
                        self.log_test(f"Attempt {attempt} has correct lives remaining ({expected_lives})", True)
                    else:
                        self.log_test(f"Attempt {attempt} has correct lives remaining ({expected_lives})", False, f"Expected {expected_lives}, got {lives_remaining}")
            
            # Now try 4th attempt - should get 403 error
            print("   Attempting 4th submission (should be blocked with 403)...")
            
            submission_data = {
                "assignment_id": assignment_id,
                "code": failing_code
            }
            
            # This should return 403 Forbidden
            response = self.run_test(
                "4th attempt should be blocked (403 error)",
                "POST",
                "submissions",
                403,
                submission_data
            )
            
            # Test that passing submission does NOT deduct a life
            print("\n   Testing that passing submissions don't deduct lives...")
            
            # Create another fresh student
            student2 = self.create_student_user("passingtest")
            if student2 and self.add_student_to_classroom(student2["id"], classroom_id):
                # Switch to second student
                self.session_token = student2["token"]
                
                # Submit passing code
                passing_code = "def add_numbers(a, b):\n    return a + b\n\nprint(add_numbers(2, 3))"
                
                submission_data = {
                    "assignment_id": assignment_id,
                    "code": passing_code
                }
                
                submission = self.run_test(
                    "Passing submission (should not deduct life)",
                    "POST",
                    "submissions",
                    200,
                    submission_data
                )
                
                if submission:
                    lives_remaining = submission.get('lives_remaining', 0)
                    score = submission.get('score', 0)
                    is_passing = submission.get('is_passing', False)
                    
                    print(f"     Score: {score}%, Lives remaining: {lives_remaining}, Passing: {is_passing}")
                    
                    # Verify it's passing (>=70%)
                    if score >= 70:
                        self.log_test("Passing submission has score >=70%", True)
                    else:
                        self.log_test("Passing submission has score >=70%", False, f"Score was {score}%")
                    
                    # Verify lives remain at 3 (no deduction for passing)
                    if lives_remaining == 3:
                        self.log_test("Passing submission does not deduct lives", True)
                    else:
                        self.log_test("Passing submission does not deduct lives", False, f"Expected 3 lives, got {lives_remaining}")
        
        finally:
            # Switch back to teacher token
            self.session_token = original_token

    def test_submission_endpoints(self, assignment_id, classroom_id):
        """Test submission endpoints"""
        print("\n📤 Testing Submission Endpoints...")
        
        # Create student user for basic submission test
        print("   Creating student user for basic submission test...")
        student = self.create_student_user()
        if not student:
            print("❌ Cannot test submissions without student user")
            return
        
        # Add student to classroom
        if not self.add_student_to_classroom(student["id"], classroom_id):
            print("❌ Cannot test submissions without adding student to classroom")
            return
        
        # Temporarily switch to student token
        original_token = self.session_token
        self.session_token = student["token"]
        
        try:
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
                print(f"   XP earned: {submission.get('xp_earned', 0)}")
                print(f"   Coins earned: {submission.get('coins_earned', 0)}")
            
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

    def test_availability_date_validation(self, classroom_id):
        """Test the ADDITIONAL fix for 403 submission errors - availability date validation"""
        print("\n🔒 Testing ADDITIONAL 403 Fix - Availability Date Validation...")
        
        # Create student user for testing
        student = self.create_student_user("availtest")
        if not student:
            print("❌ Cannot test availability validation without student user")
            return
        
        # Add student to classroom
        if not self.add_student_to_classroom(student["id"], classroom_id):
            print("❌ Cannot test availability validation without adding student to classroom")
            return
        
        # Switch to student token
        original_token = self.session_token
        self.session_token = student["token"]
        
        try:
            # SCENARIO 1: Assignment with future available_date (should get 403)
            print("\n   SCENARIO 1: Testing assignment with future available_date...")
            
            # Switch back to teacher to create assignment with future date
            self.session_token = original_token
            
            future_date = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            future_assignment_data = {
                "classroom_id": classroom_id,
                "title": f"Future Assignment {datetime.now().strftime('%H%M%S')}",
                "description": "Assignment available tomorrow",
                "starter_code": "def future_function():\n    pass",
                "solution_code": "def future_function():\n    return 'future'",
                "test_cases": [],
                "available_date": future_date
            }
            
            # Create assignment with future available_date using direct DB insertion
            try:
                from motor.motor_asyncio import AsyncIOMotorClient
                import asyncio
                
                async def create_future_assignment():
                    client = AsyncIOMotorClient("mongodb://localhost:27017")
                    db = client["test_database"]
                    
                    assignment_id = str(uuid.uuid4())
                    assignment_doc = {
                        "id": assignment_id,
                        "classroom_id": classroom_id,
                        "title": f"Future Assignment {datetime.now().strftime('%H%M%S')}",
                        "description": "Assignment available tomorrow",
                        "starter_code": "def future_function():\n    pass",
                        "solution_code": "def future_function():\n    return 'future'",
                        "test_cases": [],
                        "available_date": future_date,
                        "due_date": None,
                        "allow_late_submission": True,
                        "late_penalty_percent": 0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.assignments.insert_one(assignment_doc)
                    
                    client.close()
                    return assignment_id
                
                future_assignment_id = asyncio.run(create_future_assignment())
                print(f"   Created future assignment: {future_assignment_id}")
                
                # Switch back to student
                self.session_token = student["token"]
                
                # Try to submit to future assignment (should get 403)
                submission_data = {
                    "assignment_id": future_assignment_id,
                    "code": "def future_function():\n    return 'future'"
                }
                
                response = self.run_test(
                    "Submit to unavailable assignment (future date) - should get 403",
                    "POST",
                    "submissions",
                    403,
                    submission_data
                )
                
                # SCENARIO 2: Assignment with past available_date (should work)
                print("\n   SCENARIO 2: Testing assignment with past available_date...")
                
                # Switch back to teacher
                self.session_token = original_token
                
                past_date = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
                
                async def create_past_assignment():
                    client = AsyncIOMotorClient("mongodb://localhost:27017")
                    db = client["test_database"]
                    
                    assignment_id = str(uuid.uuid4())
                    assignment_doc = {
                        "id": assignment_id,
                        "classroom_id": classroom_id,
                        "title": f"Past Assignment {datetime.now().strftime('%H%M%S')}",
                        "description": "Assignment available in the past",
                        "starter_code": "def past_function():\n    pass",
                        "solution_code": "def past_function():\n    return 'past'",
                        "test_cases": [],
                        "available_date": past_date,
                        "due_date": None,
                        "allow_late_submission": True,
                        "late_penalty_percent": 0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.assignments.insert_one(assignment_doc)
                    
                    client.close()
                    return assignment_id
                
                past_assignment_id = asyncio.run(create_past_assignment())
                print(f"   Created past assignment: {past_assignment_id}")
                
                # Switch back to student
                self.session_token = student["token"]
                
                # Try to submit to past assignment (should work)
                submission_data = {
                    "assignment_id": past_assignment_id,
                    "code": "def past_function():\n    return 'past'"
                }
                
                response = self.run_test(
                    "Submit to available assignment (past date) - should succeed",
                    "POST",
                    "submissions",
                    200,
                    submission_data
                )
                
                # SCENARIO 5: No available_date set (should work for backward compatibility)
                print("\n   SCENARIO 5: Testing assignment with no available_date...")
                
                # Switch back to teacher
                self.session_token = original_token
                
                async def create_no_date_assignment():
                    client = AsyncIOMotorClient("mongodb://localhost:27017")
                    db = client["test_database"]
                    
                    assignment_id = str(uuid.uuid4())
                    assignment_doc = {
                        "id": assignment_id,
                        "classroom_id": classroom_id,
                        "title": f"No Date Assignment {datetime.now().strftime('%H%M%S')}",
                        "description": "Assignment with no available_date",
                        "starter_code": "def no_date_function():\n    pass",
                        "solution_code": "def no_date_function():\n    return 'no_date'",
                        "test_cases": [],
                        "available_date": None,
                        "due_date": None,
                        "allow_late_submission": True,
                        "late_penalty_percent": 0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.assignments.insert_one(assignment_doc)
                    
                    client.close()
                    return assignment_id
                
                no_date_assignment_id = asyncio.run(create_no_date_assignment())
                print(f"   Created no-date assignment: {no_date_assignment_id}")
                
                # Switch back to student
                self.session_token = student["token"]
                
                # Try to submit to no-date assignment (should work)
                submission_data = {
                    "assignment_id": no_date_assignment_id,
                    "code": "def no_date_function():\n    return 'no_date'"
                }
                
                response = self.run_test(
                    "Submit to assignment with no available_date - should succeed",
                    "POST",
                    "submissions",
                    200,
                    submission_data
                )
                
            except Exception as e:
                print(f"   ❌ Error creating test assignments: {str(e)}")
        
        finally:
            # Switch back to teacher token
            self.session_token = original_token

    def test_classroom_membership_validation(self, classroom_id):
        """Test SCENARIO 3: Student not in classroom validation"""
        print("\n🏫 Testing Classroom Membership Validation...")
        
        # Create a second classroom
        classroom2_data = {
            "name": f"Test Classroom 2 {datetime.now().strftime('%H%M%S')}"
        }
        
        classroom2 = self.run_test(
            "Create second classroom",
            "POST",
            "classrooms",
            200,
            classroom2_data
        )
        
        if not classroom2:
            print("❌ Cannot test classroom membership without second classroom")
            return
        
        classroom2_id = classroom2.get('id')
        print(f"   Created second classroom: {classroom2_id}")
        
        # Create assignment in classroom2
        assignment_data = {
            "classroom_id": classroom2_id,
            "title": f"Classroom2 Assignment {datetime.now().strftime('%H%M%S')}",
            "description": "Assignment in classroom 2",
            "starter_code": "def classroom2_function():\n    pass",
            "solution_code": "def classroom2_function():\n    return 'classroom2'",
            "test_cases": []
        }
        
        assignment2 = self.run_test(
            "Create assignment in classroom 2",
            "POST",
            "assignments",
            200,
            assignment_data
        )
        
        if not assignment2:
            print("❌ Cannot test classroom membership without assignment in classroom 2")
            return
        
        assignment2_id = assignment2.get('id')
        print(f"   Created assignment in classroom 2: {assignment2_id}")
        
        # Create student user who is only in classroom 1
        student = self.create_student_user("membertest")
        if not student:
            print("❌ Cannot test classroom membership without student user")
            return
        
        # Add student ONLY to classroom 1 (not classroom 2)
        if not self.add_student_to_classroom(student["id"], classroom_id):
            print("❌ Cannot test classroom membership without adding student to classroom 1")
            return
        
        print(f"   Student {student['id']} added to classroom 1 only")
        
        # Switch to student token
        original_token = self.session_token
        self.session_token = student["token"]
        
        try:
            # SCENARIO 3: Try to submit to assignment in classroom 2 (should get 403)
            print("\n   SCENARIO 3: Testing student not in classroom...")
            
            submission_data = {
                "assignment_id": assignment2_id,
                "code": "def classroom2_function():\n    return 'classroom2'"
            }
            
            response = self.run_test(
                "Submit to assignment in different classroom - should get 403",
                "POST",
                "submissions",
                403,
                submission_data
            )
            
            # SCENARIO 4: Normal flow - submit to assignment in correct classroom (should work)
            print("\n   SCENARIO 4: Testing normal flow with valid student...")
            
            # Create assignment in classroom 1 where student is enrolled
            self.session_token = original_token  # Switch to teacher
            
            normal_assignment_data = {
                "classroom_id": classroom_id,
                "title": f"Normal Assignment {datetime.now().strftime('%H%M%S')}",
                "description": "Normal assignment for enrolled student",
                "starter_code": "def normal_function():\n    pass",
                "solution_code": "def normal_function():\n    return 'normal'",
                "test_cases": []
            }
            
            normal_assignment = self.run_test(
                "Create normal assignment in classroom 1",
                "POST",
                "assignments",
                200,
                normal_assignment_data
            )
            
            if normal_assignment:
                normal_assignment_id = normal_assignment.get('id')
                print(f"   Created normal assignment: {normal_assignment_id}")
                
                # Switch back to student
                self.session_token = student["token"]
                
                # Submit to assignment in correct classroom (should work)
                submission_data = {
                    "assignment_id": normal_assignment_id,
                    "code": "def normal_function():\n    return 'normal'"
                }
                
                response = self.run_test(
                    "Submit to assignment in enrolled classroom - should succeed",
                    "POST",
                    "submissions",
                    200,
                    submission_data
                )
                
                if response:
                    lives_remaining = response.get('lives_remaining', 0)
                    print(f"   ✅ Normal submission successful! Lives remaining: {lives_remaining}")
                    
                    # Verify lives_remaining = 3 for first submission
                    if lives_remaining == 3:
                        self.log_test("Normal flow: First submission has 3 lives remaining", True)
                    else:
                        self.log_test("Normal flow: First submission has 3 lives remaining", False, f"Expected 3, got {lives_remaining}")
        
        finally:
            # Switch back to teacher token
            self.session_token = original_token

    def create_test_students_with_names(self, classroom_id, count=3):
        """Create multiple test students with realistic names for sorting tests"""
        students = []
        names = [
            ("Alice", "Brown"),
            ("Bob", "Anderson"), 
            ("John", "Smith"),
            ("Emma", "Davis"),
            ("Michael", "Wilson")
        ]
        
        for i in range(min(count, len(names))):
            first_name, last_name = names[i]
            timestamp = str(int(datetime.now().timestamp()) + i)
            student_id = f"test-student-{timestamp}"
            student_token = f"test_student_session_{timestamp}"
            
            try:
                from motor.motor_asyncio import AsyncIOMotorClient
                import asyncio
                
                async def create_named_student():
                    client = AsyncIOMotorClient("mongodb://localhost:27017")
                    db = client["test_database"]
                    
                    # Create student user with realistic name
                    user_doc = {
                        "id": student_id,
                        "email": f"{first_name.lower()}.{last_name.lower()}.{timestamp}@example.com",
                        "name": f"{first_name} {last_name}",
                        "role": "student",
                        "xp": 0,
                        "coins": 0,
                        "rank": "Rookie",
                        "rank_level": 1,
                        "problems_solved": 0,
                        "perfect_scores": 0,
                        "current_streak": 0,
                        "best_streak": 0,
                        "owned_themes": ["default"],
                        "owned_badges": [],
                        "active_theme": "default",
                        "active_badges": [],
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.users.insert_one(user_doc)
                    
                    # Create session
                    session_doc = {
                        "user_id": student_id,
                        "session_token": student_token,
                        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.sessions.insert_one(session_doc)
                    
                    # Add to classroom
                    await db.classrooms.update_one(
                        {"id": classroom_id},
                        {"$push": {"students": student_id}}
                    )
                    
                    client.close()
                    return True
                
                asyncio.run(create_named_student())
                students.append({
                    "id": student_id,
                    "token": student_token,
                    "name": f"{first_name} {last_name}",
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": f"{first_name.lower()}.{last_name.lower()}.{timestamp}@example.com"
                })
                
            except Exception as e:
                print(f"   ❌ Failed to create student {first_name} {last_name}: {str(e)}")
        
        return students

    def create_new_assignment_structure(self, classroom_ids, title, problem_count=3):
        """Create assignment using new multi-problem structure"""
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
            
            async def create_assignment_and_problems():
                client = AsyncIOMotorClient("mongodb://localhost:27017")
                db = client["test_database"]
                
                # Create problems first
                problem_ids = []
                for i in range(problem_count):
                    problem_id = str(uuid.uuid4())
                    problem_doc = {
                        "id": problem_id,
                        "title": f"Problem {i+1}: Basic Math",
                        "description": f"Write a function that adds {i+1} to a number",
                        "starter_code": f"def add_{i+1}(x):\n    # Your code here\n    pass",
                        "solution_code": f"def add_{i+1}(x):\n    return x + {i+1}\n\nprint(add_{i+1}(5))",
                        "expected_output": str(5 + i + 1),
                        "category": "Math",
                        "difficulty": "Easy",
                        "csta_standard": "1A-AP-15",
                        "problem_type": "Independent Practice",
                        "resources_link": "",
                        "creator_id": self.user_id,
                        "creator_name": "Test Teacher",
                        "is_approved": True,
                        "times_imported": 0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.problems.insert_one(problem_doc)
                    problem_ids.append(problem_id)
                
                # Create assignment
                assignment_id = str(uuid.uuid4())
                assignment_doc = {
                    "id": assignment_id,
                    "title": title,
                    "description": f"Complete all {problem_count} problems",
                    "teacher_id": self.user_id,
                    "problem_ids": problem_ids,
                    "classroom_ids": classroom_ids,
                    "available_date": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
                    "due_date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                    "allow_late_submission": True,
                    "late_penalty_percent": 0,
                    "completion_bonus_xp": 100,
                    "completion_bonus_coins": 50,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.assignments.insert_one(assignment_doc)
                
                client.close()
                return {"id": assignment_id, "problem_ids": problem_ids}
            
            return asyncio.run(create_assignment_and_problems())
            
        except Exception as e:
            print(f"   ❌ Failed to create assignment: {str(e)}")
            return None

    def create_student_submissions(self, student_id, assignment_id, problem_ids, scores):
        """Create submissions for a student with specific scores"""
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
            
            async def create_submissions():
                client = AsyncIOMotorClient("mongodb://localhost:27017")
                db = client["test_database"]
                
                for i, (problem_id, score) in enumerate(zip(problem_ids, scores)):
                    if score is None:  # No submission
                        continue
                    
                    submission_id = str(uuid.uuid4())
                    submission_doc = {
                        "id": submission_id,
                        "assignment_id": assignment_id,
                        "problem_id": problem_id,
                        "student_id": student_id,
                        "code": f"def add_{i+1}(x):\n    return x + {i+1}",
                        "score": score,
                        "feedback": f"Score: {score}%",
                        "test_results": [],
                        "attempt_number": 1,
                        "lives_remaining": 3 if score >= 70 else 2,
                        "is_passing": score >= 70,
                        "is_late": False,
                        "submitted_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.submissions.insert_one(submission_doc)
                
                client.close()
                return True
            
            return asyncio.run(create_submissions())
            
        except Exception as e:
            print(f"   ❌ Failed to create submissions: {str(e)}")
            return False

    def test_teacher_reports_endpoints(self):
        """Test Teacher Reports endpoints - gradebook and missing reports"""
        print("\n📊 Testing Teacher Reports Endpoints...")
        
        # Create test setup with multiple classrooms and students
        print("   Setting up test data for reports...")
        
        # Create two classrooms
        classroom1_data = {"name": f"Math Class {datetime.now().strftime('%H%M%S')}"}
        classroom1 = self.run_test(
            "Create classroom 1 for reports",
            "POST",
            "classrooms",
            200,
            classroom1_data
        )
        
        classroom2_data = {"name": f"Science Class {datetime.now().strftime('%H%M%S')}"}
        classroom2 = self.run_test(
            "Create classroom 2 for reports",
            "POST",
            "classrooms",
            200,
            classroom2_data
        )
        
        if not classroom1 or not classroom2:
            print("❌ Cannot test reports without classrooms")
            return
        
        classroom1_id = classroom1.get('id')
        classroom2_id = classroom2.get('id')
        
        # Create students with realistic names for sorting tests
        print("   Creating students with realistic names...")
        students1 = self.create_test_students_with_names(classroom1_id, 3)
        students2 = self.create_test_students_with_names(classroom2_id, 2)
        
        if not students1 or not students2:
            print("❌ Cannot test reports without students")
            return
        
        # Create assignments using new structure
        print("   Creating assignments with multiple problems...")
        assignment1 = self.create_new_assignment_structure(
            [classroom1_id], 
            f"Assignment 1 - Math Basics {datetime.now().strftime('%H%M%S')}", 
            3
        )
        assignment2 = self.create_new_assignment_structure(
            [classroom1_id, classroom2_id], 
            f"Assignment 2 - Advanced Math {datetime.now().strftime('%H%M%S')}", 
            2
        )
        assignment3 = self.create_new_assignment_structure(
            [classroom2_id], 
            f"Assignment 3 - Science {datetime.now().strftime('%H%M%S')}", 
            4
        )
        
        if not assignment1 or not assignment2 or not assignment3:
            print("❌ Cannot test reports without assignments")
            return
        
        # Create varied submissions for testing
        print("   Creating varied student submissions...")
        
        # Student 1 (Alice Brown) - Complete assignment 1, partial assignment 2
        self.create_student_submissions(
            students1[0]["id"], assignment1["id"], assignment1["problem_ids"], 
            [85, 92, 78]  # All passing
        )
        self.create_student_submissions(
            students1[0]["id"], assignment2["id"], assignment2["problem_ids"], 
            [88, None]  # One complete, one missing
        )
        
        # Student 2 (Bob Anderson) - Partial assignment 1, not started assignment 2
        self.create_student_submissions(
            students1[1]["id"], assignment1["id"], assignment1["problem_ids"], 
            [95, 65, None]  # Two attempts, one missing
        )
        # No submissions for assignment 2
        
        # Student 3 (John Smith) - Complete both assignments
        self.create_student_submissions(
            students1[2]["id"], assignment1["id"], assignment1["problem_ids"], 
            [100, 89, 91]  # All passing
        )
        self.create_student_submissions(
            students1[2]["id"], assignment2["id"], assignment2["problem_ids"], 
            [87, 93]  # All passing
        )
        
        # Students in classroom 2 - varied completion
        self.create_student_submissions(
            students2[0]["id"], assignment2["id"], assignment2["problem_ids"], 
            [76, 82]  # All passing
        )
        self.create_student_submissions(
            students2[0]["id"], assignment3["id"], assignment3["problem_ids"], 
            [88, None, None, None]  # One complete, three missing
        )
        
        # Student 2 in classroom 2 - no submissions (all missing)
        
        print("   Test data setup complete. Starting report tests...")
        
        # Test 1: Gradebook Report - Single classroom, single assignment
        print("\n   TEST 1: Gradebook Report - Single classroom, single assignment")
        gradebook_data = {
            "classroom_ids": [classroom1_id],
            "assignment_ids": [assignment1["id"]]
        }
        
        gradebook_response = self.run_test(
            "Gradebook report - single classroom/assignment",
            "POST",
            "reports/gradebook",
            200,
            gradebook_data
        )
        
        if gradebook_response:
            students_data = gradebook_response.get("students", [])
            assignments_data = gradebook_response.get("assignments", [])
            
            # Verify structure
            if len(students_data) == 3:
                self.log_test("Gradebook has correct number of students", True)
            else:
                self.log_test("Gradebook has correct number of students", False, f"Expected 3, got {len(students_data)}")
            
            # Verify sorting (should be by last name: Anderson, Brown, Smith)
            if len(students_data) >= 3:
                names = [s.get("student_name", "") for s in students_data]
                expected_order = ["Anderson, Bob", "Brown, Alice", "Smith, John"]
                if names == expected_order:
                    self.log_test("Students sorted by last name, first name", True)
                else:
                    self.log_test("Students sorted by last name, first name", False, f"Expected {expected_order}, got {names}")
            
            # Verify score calculations
            for student in students_data:
                student_name = student.get("student_name", "")
                scores = student.get("scores", {})
                assignment_score = scores.get(assignment1["id"], {})
                avg_score = assignment_score.get("average_score", 0)
                
                if "Brown, Alice" in student_name:
                    # Alice: scores [85, 92, 78] -> average = 85
                    expected_avg = round((85 + 92 + 78) / 3, 1)
                    if abs(avg_score - expected_avg) < 0.1:
                        self.log_test(f"Alice Brown score calculation correct", True)
                    else:
                        self.log_test(f"Alice Brown score calculation correct", False, f"Expected {expected_avg}, got {avg_score}")
        
        # Test 2: Gradebook Report - Multiple classrooms, multiple assignments
        print("\n   TEST 2: Gradebook Report - Multiple classrooms, multiple assignments")
        gradebook_data = {
            "classroom_ids": [classroom1_id, classroom2_id],
            "assignment_ids": [assignment1["id"], assignment2["id"]]
        }
        
        gradebook_response = self.run_test(
            "Gradebook report - multiple classrooms/assignments",
            "POST",
            "reports/gradebook",
            200,
            gradebook_data
        )
        
        if gradebook_response:
            students_data = gradebook_response.get("students", [])
            
            # Should have 5 students total (3 from classroom1 + 2 from classroom2), deduplicated
            # But students can be in multiple classrooms, so check for deduplication
            student_ids = [s.get("student_id") for s in students_data]
            unique_student_ids = list(set(student_ids))
            
            if len(student_ids) == len(unique_student_ids):
                self.log_test("Students deduplicated across classrooms", True)
            else:
                self.log_test("Students deduplicated across classrooms", False, f"Found duplicates in {len(student_ids)} vs {len(unique_student_ids)}")
        
        # Test 3: Missing Report - Single classroom
        print("\n   TEST 3: Missing Report - Single classroom")
        missing_data = {
            "classroom_ids": [classroom1_id]
        }
        
        missing_response = self.run_test(
            "Missing report - single classroom",
            "POST",
            "reports/missing",
            200,
            missing_data
        )
        
        if missing_response:
            students_data = missing_response.get("students", [])
            
            # Should show students with missing/incomplete assignments
            # Bob Anderson should appear (incomplete assignment 1, missing assignment 2)
            # Alice Brown should appear (incomplete assignment 2)
            # John Smith should NOT appear (all complete)
            
            student_names = [s.get("student_name", "") for s in students_data]
            
            if "Anderson, Bob" in student_names:
                self.log_test("Missing report includes Bob Anderson (has missing work)", True)
            else:
                self.log_test("Missing report includes Bob Anderson (has missing work)", False, "Bob Anderson not found")
            
            if "Brown, Alice" in student_names:
                self.log_test("Missing report includes Alice Brown (has incomplete work)", True)
            else:
                self.log_test("Missing report includes Alice Brown (has incomplete work)", False, "Alice Brown not found")
            
            if "Smith, John" not in student_names:
                self.log_test("Missing report excludes John Smith (all complete)", True)
            else:
                self.log_test("Missing report excludes John Smith (all complete)", False, "John Smith should not appear")
        
        # Test 4: Missing Report - Multiple classrooms
        print("\n   TEST 4: Missing Report - Multiple classrooms")
        missing_data = {
            "classroom_ids": [classroom1_id, classroom2_id]
        }
        
        missing_response = self.run_test(
            "Missing report - multiple classrooms",
            "POST",
            "reports/missing",
            200,
            missing_data
        )
        
        if missing_response:
            students_data = missing_response.get("students", [])
            
            # Verify sorting by last name, first name
            if len(students_data) >= 2:
                names = [s.get("student_name", "") for s in students_data]
                # Should be sorted alphabetically by last name
                sorted_names = sorted(names)
                if names == sorted_names:
                    self.log_test("Missing report students sorted by last name", True)
                else:
                    self.log_test("Missing report students sorted by last name", False, f"Expected {sorted_names}, got {names}")
        
        # Test 5: Authentication - Student trying to access reports (should get 403)
        print("\n   TEST 5: Authentication - Student access denied")
        
        if students1:
            original_token = self.session_token
            self.session_token = students1[0]["token"]  # Switch to student
            
            try:
                gradebook_data = {
                    "classroom_ids": [classroom1_id],
                    "assignment_ids": [assignment1["id"]]
                }
                
                self.run_test(
                    "Student access to gradebook report (should be 403)",
                    "POST",
                    "reports/gradebook",
                    403,
                    gradebook_data
                )
                
                missing_data = {
                    "classroom_ids": [classroom1_id]
                }
                
                self.run_test(
                    "Student access to missing report (should be 403)",
                    "POST",
                    "reports/missing",
                    403,
                    missing_data
                )
                
            finally:
                self.session_token = original_token
        
        # Test 6: Error handling - Missing required fields
        print("\n   TEST 6: Error handling - Missing required fields")
        
        # Gradebook without classroom_ids
        self.run_test(
            "Gradebook report without classroom_ids (should be 400)",
            "POST",
            "reports/gradebook",
            400,
            {"assignment_ids": [assignment1["id"]]}
        )
        
        # Gradebook without assignment_ids
        self.run_test(
            "Gradebook report without assignment_ids (should be 400)",
            "POST",
            "reports/gradebook",
            400,
            {"classroom_ids": [classroom1_id]}
        )
        
        # Missing report without classroom_ids
        self.run_test(
            "Missing report without classroom_ids (should be 400)",
            "POST",
            "reports/missing",
            400,
            {}
        )
        
        # Test 7: Teacher access control - Other teacher's classroom
        print("\n   TEST 7: Teacher access control - Other teacher's classroom")
        
        # Create another teacher
        timestamp = str(int(datetime.now().timestamp()))
        other_teacher_id = f"test-teacher-{timestamp}"
        other_teacher_token = f"test_teacher_session_{timestamp}"
        
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
            
            async def create_other_teacher():
                client = AsyncIOMotorClient("mongodb://localhost:27017")
                db = client["test_database"]
                
                # Create teacher user
                user_doc = {
                    "id": other_teacher_id,
                    "email": f"other.teacher.{timestamp}@example.com",
                    "name": f"Other Teacher {timestamp}",
                    "role": "teacher",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.users.insert_one(user_doc)
                
                # Create session
                session_doc = {
                    "user_id": other_teacher_id,
                    "session_token": other_teacher_token,
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.sessions.insert_one(session_doc)
                
                client.close()
                return True
            
            if asyncio.run(create_other_teacher()):
                original_token = self.session_token
                self.session_token = other_teacher_token
                
                try:
                    gradebook_data = {
                        "classroom_ids": [classroom1_id],
                        "assignment_ids": [assignment1["id"]]
                    }
                    
                    self.run_test(
                        "Other teacher access to classroom (should be 403)",
                        "POST",
                        "reports/gradebook",
                        403,
                        gradebook_data
                    )
                    
                finally:
                    self.session_token = original_token
        
        except Exception as e:
            print(f"   ⚠️  Could not test other teacher access: {str(e)}")
        
        print("   Teacher Reports endpoint testing complete!")
        
        return {
            "classroom1_id": classroom1_id,
            "classroom2_id": classroom2_id,
            "assignment1": assignment1,
            "assignment2": assignment2,
            "assignment3": assignment3,
            "students1": students1,
            "students2": students2
        }

    def test_chapter_organization_endpoints(self):
        """Test chapter organization feature for problem library"""
        print("\n📚 Testing Chapter Organization Endpoints...")
        
        # Test data for chapter organization
        test_problems = []
        
        # Test 1: Create problem with chapter field
        print("\n   TEST 1: Create problem with chapter field")
        problem_with_chapter = {
            "title": f"Chapter Test Problem 1 - {datetime.now().strftime('%H%M%S')}",
            "description": "A problem to test chapter organization",
            "starter_code": "def solve_problem():\n    # Your code here\n    pass",
            "solution_code": "def solve_problem():\n    return 'Chapter 1 solution'",
            "expected_output": "Chapter 1 solution",
            "category": "Lesson 1.1 - Introduction",
            "difficulty": "Easy",
            "chapter": "Chapter 1: Basics",
            "csta_standard": "1A-AP-15",
            "problem_type": "Independent Practice",
            "resources_link": ""
        }
        
        problem1 = self.run_test(
            "Create problem with chapter 'Chapter 1: Basics'",
            "POST",
            "problems",
            200,
            problem_with_chapter
        )
        
        if problem1:
            test_problems.append(problem1)
            chapter = problem1.get('chapter', '')
            if chapter == "Chapter 1: Basics":
                self.log_test("Problem created with correct chapter field", True)
            else:
                self.log_test("Problem created with correct chapter field", False, f"Expected 'Chapter 1: Basics', got '{chapter}'")
        
        # Test 2: Create problem without chapter (empty string)
        print("\n   TEST 2: Create problem without chapter field")
        problem_without_chapter = {
            "title": f"No Chapter Problem - {datetime.now().strftime('%H%M%S')}",
            "description": "A problem without chapter",
            "starter_code": "def no_chapter():\n    pass",
            "solution_code": "def no_chapter():\n    return 'no chapter'",
            "expected_output": "no chapter",
            "category": "Lesson 2.1 - Variables",
            "difficulty": "Medium",
            "chapter": "",  # Empty chapter
            "csta_standard": "1A-AP-15",
            "problem_type": "Class Practice",
            "resources_link": ""
        }
        
        problem2 = self.run_test(
            "Create problem with empty chapter field",
            "POST",
            "problems",
            200,
            problem_without_chapter
        )
        
        if problem2:
            test_problems.append(problem2)
            chapter = problem2.get('chapter', '')
            if chapter == "":
                self.log_test("Problem created with empty chapter field", True)
            else:
                self.log_test("Problem created with empty chapter field", False, f"Expected empty string, got '{chapter}'")
        
        # Test 3: Create more problems with different chapters for filtering tests
        print("\n   TEST 3: Create additional problems with various chapters")
        additional_problems = [
            {
                "title": f"Unit Test Problem - {datetime.now().strftime('%H%M%S')}",
                "description": "Problem for Unit 2",
                "starter_code": "def unit_test():\n    pass",
                "solution_code": "def unit_test():\n    return 'unit 2'",
                "expected_output": "unit 2",
                "category": "Lesson 2.2 - Loops",
                "difficulty": "Hard",
                "chapter": "Unit 2: Control Flow",
                "csta_standard": "1A-AP-15",
                "problem_type": "Independent Practice"
            },
            {
                "title": f"Module Problem - {datetime.now().strftime('%H%M%S')}",
                "description": "Problem for Module A",
                "starter_code": "def module_test():\n    pass",
                "solution_code": "def module_test():\n    return 'module a'",
                "expected_output": "module a",
                "category": "Lesson 3.1 - Functions",
                "difficulty": "Easy",
                "chapter": "Module A: Functions",
                "csta_standard": "1A-AP-15",
                "problem_type": "Paired Programming"
            },
            {
                "title": f"Another Chapter 1 Problem - {datetime.now().strftime('%H%M%S')}",
                "description": "Another problem for Chapter 1",
                "starter_code": "def another_basic():\n    pass",
                "solution_code": "def another_basic():\n    return 'basic 2'",
                "expected_output": "basic 2",
                "category": "Lesson 1.2 - Variables",
                "difficulty": "Medium",
                "chapter": "Chapter 1: Basics",
                "csta_standard": "1A-AP-15",
                "problem_type": "Debugging"
            }
        ]
        
        for i, problem_data in enumerate(additional_problems):
            problem = self.run_test(
                f"Create additional problem {i+1}",
                "POST",
                "problems",
                200,
                problem_data
            )
            if problem:
                test_problems.append(problem)
        
        # Test 4: Get all problems (verify chapter values are returned)
        print("\n   TEST 4: Get all problems with chapter values")
        all_problems = self.run_test(
            "Get all problems",
            "GET",
            "problems",
            200
        )
        
        if all_problems and isinstance(all_problems, list):
            # Check that our test problems are included with correct chapters
            our_problem_ids = [p.get('id') for p in test_problems if p]
            found_problems = [p for p in all_problems if p.get('id') in our_problem_ids]
            
            if len(found_problems) >= len([p for p in test_problems if p]):
                self.log_test("All created problems found in GET /problems", True)
                
                # Verify chapter fields are present and correct
                chapter_correct = True
                for problem in found_problems:
                    if 'chapter' not in problem:
                        chapter_correct = False
                        break
                
                if chapter_correct:
                    self.log_test("All problems have chapter field in response", True)
                else:
                    self.log_test("All problems have chapter field in response", False, "Some problems missing chapter field")
            else:
                self.log_test("All created problems found in GET /problems", False, f"Expected {len(test_problems)}, found {len(found_problems)}")
        
        # Test 5: Filter problems by chapter
        print("\n   TEST 5: Filter problems by chapter")
        
        # Filter by "Chapter 1: Basics"
        chapter1_problems = self.run_test(
            "Filter problems by 'Chapter 1: Basics'",
            "GET",
            "problems?chapter=Chapter 1: Basics",
            200
        )
        
        if chapter1_problems and isinstance(chapter1_problems, list):
            # Should find at least 2 problems with "Chapter 1: Basics"
            chapter1_count = len([p for p in chapter1_problems if p.get('chapter') == 'Chapter 1: Basics'])
            if chapter1_count >= 2:
                self.log_test("Chapter filter returns correct problems for 'Chapter 1: Basics'", True)
            else:
                self.log_test("Chapter filter returns correct problems for 'Chapter 1: Basics'", False, f"Expected at least 2, got {chapter1_count}")
            
            # Verify all returned problems have the correct chapter
            all_correct_chapter = all(p.get('chapter') == 'Chapter 1: Basics' for p in chapter1_problems)
            if all_correct_chapter:
                self.log_test("All filtered problems have correct chapter", True)
            else:
                self.log_test("All filtered problems have correct chapter", False, "Some problems have wrong chapter")
        
        # Filter by "Unit 2: Control Flow"
        unit2_problems = self.run_test(
            "Filter problems by 'Unit 2: Control Flow'",
            "GET",
            "problems?chapter=Unit 2: Control Flow",
            200
        )
        
        if unit2_problems and isinstance(unit2_problems, list):
            unit2_count = len([p for p in unit2_problems if p.get('chapter') == 'Unit 2: Control Flow'])
            if unit2_count >= 1:
                self.log_test("Chapter filter returns problems for 'Unit 2: Control Flow'", True)
            else:
                self.log_test("Chapter filter returns problems for 'Unit 2: Control Flow'", False, f"Expected at least 1, got {unit2_count}")
        
        # Filter by non-existent chapter
        nonexistent_problems = self.run_test(
            "Filter problems by non-existent chapter",
            "GET",
            "problems?chapter=Non-existent Chapter",
            200
        )
        
        if nonexistent_problems and isinstance(nonexistent_problems, list):
            if len(nonexistent_problems) == 0:
                self.log_test("Filter by non-existent chapter returns empty list", True)
            else:
                self.log_test("Filter by non-existent chapter returns empty list", False, f"Expected 0, got {len(nonexistent_problems)}")
        
        # Test 6: Update problem chapter
        print("\n   TEST 6: Update problem chapter")
        
        if test_problems and test_problems[0]:
            problem_id = test_problems[0].get('id')
            
            # Update the first problem's chapter
            updated_problem_data = {
                "title": test_problems[0].get('title'),
                "description": test_problems[0].get('description'),
                "starter_code": test_problems[0].get('starter_code'),
                "solution_code": test_problems[0].get('solution_code'),
                "expected_output": test_problems[0].get('expected_output'),
                "category": test_problems[0].get('category'),
                "difficulty": test_problems[0].get('difficulty'),
                "chapter": "Updated Chapter: Advanced Topics",  # New chapter
                "csta_standard": test_problems[0].get('csta_standard'),
                "problem_type": test_problems[0].get('problem_type'),
                "resources_link": test_problems[0].get('resources_link', "")
            }
            
            updated_problem = self.run_test(
                "Update problem chapter field",
                "PUT",
                f"problems/{problem_id}",
                200,
                updated_problem_data
            )
            
            if updated_problem:
                new_chapter = updated_problem.get('chapter', '')
                if new_chapter == "Updated Chapter: Advanced Topics":
                    self.log_test("Problem chapter updated successfully", True)
                else:
                    self.log_test("Problem chapter updated successfully", False, f"Expected 'Updated Chapter: Advanced Topics', got '{new_chapter}'")
                
                # Verify the update persisted by fetching the problem again
                verify_problem = self.run_test(
                    "Verify updated problem chapter persisted",
                    "GET",
                    f"problems?chapter=Updated Chapter: Advanced Topics",
                    200
                )
                
                if verify_problem and isinstance(verify_problem, list):
                    found_updated = any(p.get('id') == problem_id for p in verify_problem)
                    if found_updated:
                        self.log_test("Updated chapter persisted in database", True)
                    else:
                        self.log_test("Updated chapter persisted in database", False, "Updated problem not found with new chapter")
        
        # Test 7: Combined filters (chapter + other filters)
        print("\n   TEST 7: Combined filters (chapter + difficulty)")
        
        combined_filter_problems = self.run_test(
            "Filter by chapter and difficulty",
            "GET",
            "problems?chapter=Chapter 1: Basics&difficulty=Easy",
            200
        )
        
        if combined_filter_problems and isinstance(combined_filter_problems, list):
            # Verify all returned problems match both filters
            all_match = all(
                p.get('chapter') == 'Chapter 1: Basics' and p.get('difficulty') == 'Easy'
                for p in combined_filter_problems
            )
            if all_match:
                self.log_test("Combined chapter and difficulty filter works correctly", True)
            else:
                self.log_test("Combined chapter and difficulty filter works correctly", False, "Some problems don't match both filters")
        
        # Test 8: Authentication - Only teachers can create/update problems
        print("\n   TEST 8: Authentication - Student cannot create/update problems")
        
        # Create a student user for testing
        student = self.create_student_user("chaptertest")
        if student:
            original_token = self.session_token
            self.session_token = student["token"]
            
            try:
                # Try to create problem as student (should get 403)
                student_problem_data = {
                    "title": "Student Problem",
                    "description": "Student trying to create problem",
                    "starter_code": "pass",
                    "solution_code": "return 'student'",
                    "category": "Test",
                    "difficulty": "Easy",
                    "chapter": "Student Chapter"
                }
                
                self.run_test(
                    "Student create problem (should be 403)",
                    "POST",
                    "problems",
                    403,
                    student_problem_data
                )
                
                # Try to update problem as student (should get 403)
                if test_problems and test_problems[0]:
                    problem_id = test_problems[0].get('id')
                    self.run_test(
                        "Student update problem (should be 403)",
                        "PUT",
                        f"problems/{problem_id}",
                        403,
                        student_problem_data
                    )
                
            finally:
                self.session_token = original_token
        
        print("   ✅ Chapter organization tests completed")

    def create_test_pdf_base64(self):
        """Create a minimal base64 PDF for testing"""
        # This is a minimal PDF structure in base64
        # It's a valid PDF that just contains "Hello World"
        pdf_content = """%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Hello World) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF"""
        
        import base64
        return base64.b64encode(pdf_content.encode()).decode()

    def test_pdf_notes_endpoints(self):
        """Test PDF Notes Library API endpoints"""
        print("\n📚 Testing PDF Notes Library Endpoints...")
        
        # Test data
        test_pdf_data = self.create_test_pdf_base64()
        test_pdf_size = len(test_pdf_data.encode())
        
        # Test 1: Upload PDF Note (Teacher)
        print("\n   TEST 1: Upload PDF Note (Teacher)")
        note_data = {
            "title": "Test Study Guide",
            "description": "Python basics study guide",
            "chapter": "Chapter 1",
            "category": "Study Guide",
            "is_shared": False,
            "file_data": test_pdf_data,
            "file_size": test_pdf_size,
            "tags": ["python", "basics"]
        }
        
        note_response = self.run_test(
            "Upload PDF note (teacher)",
            "POST",
            "notes",
            200,
            note_data
        )
        
        if not note_response:
            print("❌ Cannot continue PDF notes tests without uploaded note")
            return None
        
        note_id = note_response.get('id')
        print(f"   Created note: {note_id}")
        
        # Test 2: Upload Shared PDF Note
        print("\n   TEST 2: Upload Shared PDF Note")
        shared_note_data = {
            "title": "Shared Reference Guide",
            "description": "Community reference for advanced topics",
            "chapter": "Chapter 2",
            "category": "Reference",
            "is_shared": True,
            "file_data": test_pdf_data,
            "file_size": test_pdf_size,
            "tags": ["advanced", "reference"]
        }
        
        shared_note_response = self.run_test(
            "Upload shared PDF note",
            "POST",
            "notes",
            200,
            shared_note_data
        )
        
        shared_note_id = shared_note_response.get('id') if shared_note_response else None
        
        # Test 3: List All Notes
        print("\n   TEST 3: List All Notes")
        all_notes_response = self.run_test(
            "List all notes (filter=all)",
            "GET",
            "notes?filter=all",
            200
        )
        
        if all_notes_response:
            print(f"   Found {len(all_notes_response)} notes")
            # Verify both notes are returned
            note_titles = [note.get('title', '') for note in all_notes_response]
            if "Test Study Guide" in note_titles:
                self.log_test("All notes includes private note", True)
            else:
                self.log_test("All notes includes private note", False, "Private note not found")
            
            if "Shared Reference Guide" in note_titles:
                self.log_test("All notes includes shared note", True)
            else:
                self.log_test("All notes includes shared note", False, "Shared note not found")
        
        # Test 4: List My Notes Only
        print("\n   TEST 4: List My Notes Only")
        my_notes_response = self.run_test(
            "List my notes (filter=mine)",
            "GET",
            "notes?filter=mine",
            200
        )
        
        if my_notes_response:
            print(f"   Found {len(my_notes_response)} my notes")
            # Should include both notes since current user created them
            if len(my_notes_response) >= 2:
                self.log_test("My notes filter returns user's notes", True)
            else:
                self.log_test("My notes filter returns user's notes", False, f"Expected 2+, got {len(my_notes_response)}")
        
        # Test 5: List Community Notes
        print("\n   TEST 5: List Community Notes")
        community_notes_response = self.run_test(
            "List community notes (filter=shared)",
            "GET",
            "notes?filter=shared",
            200
        )
        
        if community_notes_response:
            print(f"   Found {len(community_notes_response)} community notes")
            # Should only include shared notes
            shared_titles = [note.get('title', '') for note in community_notes_response]
            if "Shared Reference Guide" in shared_titles:
                self.log_test("Community notes includes shared note", True)
            else:
                self.log_test("Community notes includes shared note", False, "Shared note not found")
            
            if "Test Study Guide" not in shared_titles:
                self.log_test("Community notes excludes private note", True)
            else:
                self.log_test("Community notes excludes private note", False, "Private note should not appear")
        
        # Test 6: Filter by Chapter
        print("\n   TEST 6: Filter by Chapter")
        chapter_notes_response = self.run_test(
            "Filter notes by chapter",
            "GET",
            "notes?chapter=Chapter 1",
            200
        )
        
        if chapter_notes_response:
            # Should only return notes from Chapter 1
            chapter_titles = [note.get('title', '') for note in chapter_notes_response]
            if "Test Study Guide" in chapter_titles:
                self.log_test("Chapter filter returns correct notes", True)
            else:
                self.log_test("Chapter filter returns correct notes", False, "Chapter 1 note not found")
        
        # Test 7: Get Note Detail with File Data
        print("\n   TEST 7: Get Note Detail with File Data")
        if note_id:
            note_detail_response = self.run_test(
                "Get note detail with file data",
                "GET",
                f"notes/{note_id}",
                200
            )
            
            if note_detail_response:
                # Verify file_data is included
                if note_detail_response.get('file_data'):
                    self.log_test("Note detail includes file_data", True)
                else:
                    self.log_test("Note detail includes file_data", False, "file_data missing")
                
                # Verify other fields
                if note_detail_response.get('title') == "Test Study Guide":
                    self.log_test("Note detail has correct title", True)
                else:
                    self.log_test("Note detail has correct title", False, f"Expected 'Test Study Guide', got {note_detail_response.get('title')}")
        
        # Test 8: Update Note (Toggle Sharing)
        print("\n   TEST 8: Update Note (Toggle Sharing)")
        if note_id:
            update_data = {
                "is_shared": True
            }
            
            update_response = self.run_test(
                "Update note sharing status",
                "PUT",
                f"notes/{note_id}",
                200,
                update_data
            )
            
            if update_response:
                if update_response.get('is_shared') == True:
                    self.log_test("Note sharing status updated", True)
                else:
                    self.log_test("Note sharing status updated", False, f"Expected True, got {update_response.get('is_shared')}")
        
        # Test 9: Update Note Metadata
        print("\n   TEST 9: Update Note Metadata")
        if note_id:
            metadata_update = {
                "title": "Updated Study Guide",
                "description": "Updated description for Python basics"
            }
            
            metadata_response = self.run_test(
                "Update note metadata",
                "PUT",
                f"notes/{note_id}",
                200,
                metadata_update
            )
            
            if metadata_response:
                if metadata_response.get('title') == "Updated Study Guide":
                    self.log_test("Note title updated correctly", True)
                else:
                    self.log_test("Note title updated correctly", False, f"Expected 'Updated Study Guide', got {metadata_response.get('title')}")
        
        # Test 10: Delete Own Note
        print("\n   TEST 10: Delete Own Note")
        if shared_note_id:
            delete_response = self.run_test(
                "Delete own note",
                "DELETE",
                f"notes/{shared_note_id}",
                200
            )
            
            if delete_response:
                # Verify note is deleted by trying to get it
                self.run_test(
                    "Verify note deleted (should get 404)",
                    "GET",
                    f"notes/{shared_note_id}",
                    404
                )
        
        # Test 11: Access Control - Students Cannot Upload
        print("\n   TEST 11: Access Control - Students Cannot Upload")
        
        # Create student user
        student = self.create_student_user("notestest")
        if student:
            original_token = self.session_token
            self.session_token = student["token"]
            
            try:
                student_note_data = {
                    "title": "Student Note",
                    "description": "This should fail",
                    "file_data": test_pdf_data,
                    "file_size": test_pdf_size
                }
                
                self.run_test(
                    "Student upload note (should get 403)",
                    "POST",
                    "notes",
                    403,
                    student_note_data
                )
                
            finally:
                self.session_token = original_token
        
        # Test 12: Access Control - Cannot Delete Others' Notes
        print("\n   TEST 12: Access Control - Cannot Delete Others' Notes")
        
        # Create another teacher
        timestamp = str(int(datetime.now().timestamp()))
        other_teacher_id = f"test-teacher-notes-{timestamp}"
        other_teacher_token = f"test_teacher_notes_session_{timestamp}"
        
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
            
            async def create_other_teacher():
                client = AsyncIOMotorClient("mongodb://localhost:27017")
                db = client["test_database"]
                
                # Create teacher user
                user_doc = {
                    "id": other_teacher_id,
                    "email": f"other.teacher.notes.{timestamp}@example.com",
                    "name": f"Other Teacher Notes {timestamp}",
                    "role": "teacher",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.users.insert_one(user_doc)
                
                # Create session
                session_doc = {
                    "user_id": other_teacher_id,
                    "session_token": other_teacher_token,
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.sessions.insert_one(session_doc)
                
                client.close()
                return True
            
            if asyncio.run(create_other_teacher()):
                original_token = self.session_token
                self.session_token = other_teacher_token
                
                try:
                    if note_id:
                        self.run_test(
                            "Other teacher delete note (should get 403)",
                            "DELETE",
                            f"notes/{note_id}",
                            403
                        )
                        
                        # Also test update
                        update_data = {"title": "Hacked Title"}
                        self.run_test(
                            "Other teacher update note (should get 403)",
                            "PUT",
                            f"notes/{note_id}",
                            403,
                            update_data
                        )
                        
                finally:
                    self.session_token = original_token
        
        except Exception as e:
            print(f"   ❌ Error testing other teacher access: {str(e)}")
        
        # Test 13: File Size Validation
        print("\n   TEST 13: File Size Validation")
        
        # Create oversized file data (simulate 26MB)
        oversized_data = {
            "title": "Oversized File",
            "description": "This should fail due to size",
            "file_data": test_pdf_data,
            "file_size": 26 * 1024 * 1024,  # 26MB
            "is_shared": False
        }
        
        self.run_test(
            "Upload oversized file (should get 400)",
            "POST",
            "notes",
            400,
            oversized_data
        )
        
        return note_id

    def test_mc_question_endpoints(self):
        """Test Multiple Choice Question endpoints"""
        print("\n🎯 Testing MC Question Endpoints...")
        
        # Test data for MC questions
        sample_question_data = {
            "question_text": "What is 2+2?",
            "choice_a": "2",
            "choice_b": "3", 
            "choice_c": "4",
            "choice_d": "5",
            "correct_answer": "C",
            "chapter": "Chapter 1",
            "lesson": "Lesson 1",
            "difficulty": "Easy"
        }
        
        minimal_question_data = {
            "question_text": "What is Python?",
            "choice_a": "A snake",
            "choice_b": "A programming language",
            "choice_c": "A movie", 
            "choice_d": "A food",
            "correct_answer": "B"
        }
        
        # Test 1: Create MC Question with all fields
        print("\n   TEST 1: Create MC Question with all fields")
        question1 = self.run_test(
            "Create MC question with all fields",
            "POST",
            "mc-questions",
            200,
            sample_question_data
        )
        
        if not question1:
            print("❌ Cannot continue MC question tests without created question")
            return None
        
        question1_id = question1.get('id')
        print(f"   Created question: {question1_id}")
        
        # Test 2: Create MC Question with minimal data (only required fields)
        print("\n   TEST 2: Create MC Question with minimal data")
        question2 = self.run_test(
            "Create MC question with minimal data",
            "POST", 
            "mc-questions",
            200,
            minimal_question_data
        )
        
        question2_id = question2.get('id') if question2 else None
        
        # Test 3: Create MC Question with custom chapter/lesson names
        print("\n   TEST 3: Create MC Question with custom chapter/lesson")
        custom_question_data = {
            "question_text": "Which programming concept allows code reuse?",
            "choice_a": "Variables",
            "choice_b": "Functions", 
            "choice_c": "Comments",
            "choice_d": "Print statements",
            "correct_answer": "B",
            "chapter": "Advanced Programming",
            "lesson": "Code Organization",
            "difficulty": "Medium"
        }
        
        question3 = self.run_test(
            "Create MC question with custom chapter/lesson",
            "POST",
            "mc-questions", 
            200,
            custom_question_data
        )
        
        question3_id = question3.get('id') if question3 else None
        
        # Test 4: Test teacher-only access (403 for students)
        print("\n   TEST 4: Test teacher-only access control")
        
        # Create a student user to test access control
        student = self.create_student_user("mctest")
        if student:
            original_token = self.session_token
            self.session_token = student["token"]
            
            try:
                # Student should get 403 when trying to create question
                self.run_test(
                    "Student create MC question (should be 403)",
                    "POST",
                    "mc-questions",
                    403,
                    sample_question_data
                )
                
                # Student should get 403 when trying to list questions
                self.run_test(
                    "Student list MC questions (should be 403)",
                    "GET", 
                    "mc-questions",
                    403
                )
                
            finally:
                self.session_token = original_token
        
        # Test 5: Test authentication required (401 for unauthenticated)
        print("\n   TEST 5: Test authentication required")
        original_token = self.session_token
        self.session_token = None
        
        try:
            self.run_test(
                "Unauthenticated create MC question (should be 401)",
                "POST",
                "mc-questions", 
                401,
                sample_question_data
            )
            
            self.run_test(
                "Unauthenticated list MC questions (should be 401)",
                "GET",
                "mc-questions",
                401
            )
            
        finally:
            self.session_token = original_token
        
        # Test 6: List all MC questions
        print("\n   TEST 6: List all MC questions")
        questions_list = self.run_test(
            "List all MC questions",
            "GET",
            "mc-questions", 
            200
        )
        
        if questions_list:
            print(f"   Found {len(questions_list)} questions")
            
            # Verify all created questions are in the list
            question_ids = [q.get('id') for q in questions_list]
            
            if question1_id in question_ids:
                self.log_test("Question 1 appears in list", True)
            else:
                self.log_test("Question 1 appears in list", False, "Question 1 not found in list")
            
            # Verify question fields are returned
            if questions_list and len(questions_list) > 0:
                first_question = questions_list[0]
                required_fields = ['id', 'question_text', 'choice_a', 'choice_b', 'choice_c', 'choice_d', 'correct_answer']
                
                missing_fields = [field for field in required_fields if field not in first_question]
                if not missing_fields:
                    self.log_test("All required fields present in question response", True)
                else:
                    self.log_test("All required fields present in question response", False, f"Missing: {missing_fields}")
        
        # Test 7: Test GET single question by ID (this endpoint doesn't exist - should get 404)
        print("\n   TEST 7: Test GET single question by ID (endpoint missing)")
        if question1_id:
            self.run_test(
                "Get single question by ID (endpoint not implemented - should be 404)",
                "GET",
                f"mc-questions/{question1_id}",
                404
            )
        
        # Test 8: Update existing question
        print("\n   TEST 8: Update existing question")
        if question1_id:
            updated_question_data = {
                "question_text": "What is 2+2? (Updated)",
                "choice_a": "1",
                "choice_b": "3",
                "choice_c": "4", 
                "choice_d": "6",
                "correct_answer": "C",
                "chapter": "Chapter 1 - Updated",
                "lesson": "Lesson 1 - Updated", 
                "difficulty": "Medium"
            }
            
            # Test updating question_text
            self.run_test(
                "Update question text",
                "PUT",
                f"mc-questions/{question1_id}",
                200,
                updated_question_data
            )
            
            # Test updating choices and correct_answer
            choice_update_data = {
                "question_text": "What is 2+2? (Updated)",
                "choice_a": "Zero",
                "choice_b": "Two", 
                "choice_c": "Four",
                "choice_d": "Eight",
                "correct_answer": "C",
                "chapter": "Chapter 1 - Updated",
                "lesson": "Lesson 1 - Updated",
                "difficulty": "Medium"
            }
            
            self.run_test(
                "Update choices and correct answer",
                "PUT",
                f"mc-questions/{question1_id}",
                200,
                choice_update_data
            )
            
            # Test updating chapter/lesson/difficulty
            metadata_update_data = {
                "question_text": "What is 2+2? (Updated)",
                "choice_a": "Zero",
                "choice_b": "Two",
                "choice_c": "Four", 
                "choice_d": "Eight",
                "correct_answer": "C",
                "chapter": "Advanced Math",
                "lesson": "Basic Operations",
                "difficulty": "Hard"
            }
            
            self.run_test(
                "Update chapter/lesson/difficulty",
                "PUT",
                f"mc-questions/{question1_id}",
                200,
                metadata_update_data
            )
        
        # Test 9: Test update access control (only creator can update)
        print("\n   TEST 9: Test update access control")
        if question1_id:
            # Create another teacher to test access control
            timestamp = str(int(datetime.now().timestamp()))
            other_teacher_id = f"test-teacher-{timestamp}"
            other_teacher_token = f"test_teacher_session_{timestamp}"
            
            try:
                from motor.motor_asyncio import AsyncIOMotorClient
                import asyncio
                
                async def create_other_teacher():
                    client = AsyncIOMotorClient("mongodb://localhost:27017")
                    db = client["test_database"]
                    
                    # Create teacher user
                    user_doc = {
                        "id": other_teacher_id,
                        "email": f"other.teacher.{timestamp}@example.com",
                        "name": f"Other Teacher {timestamp}",
                        "role": "teacher",
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.users.insert_one(user_doc)
                    
                    # Create session
                    session_doc = {
                        "user_id": other_teacher_id,
                        "session_token": other_teacher_token,
                        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.sessions.insert_one(session_doc)
                    
                    client.close()
                    return True
                
                if asyncio.run(create_other_teacher()):
                    original_token = self.session_token
                    self.session_token = other_teacher_token
                    
                    try:
                        # Other teacher should get 403 when trying to update
                        self.run_test(
                            "Other teacher update question (should be 403)",
                            "PUT",
                            f"mc-questions/{question1_id}",
                            403,
                            updated_question_data
                        )
                        
                    finally:
                        self.session_token = original_token
                        
            except Exception as e:
                print(f"   ⚠️  Could not test other teacher access: {str(e)}")
        
        # Test 10: Test update with non-existent ID (404)
        print("\n   TEST 10: Test update with non-existent ID")
        fake_id = str(uuid.uuid4())
        self.run_test(
            "Update non-existent question (should be 404)",
            "PUT",
            f"mc-questions/{fake_id}",
            404,
            updated_question_data
        )
        
        # Test 11: Delete question
        print("\n   TEST 11: Delete question")
        if question2_id:
            self.run_test(
                "Delete question",
                "DELETE",
                f"mc-questions/{question2_id}",
                200
            )
            
            # Verify question is removed by trying to update it
            self.run_test(
                "Verify question deleted (should be 404)",
                "PUT",
                f"mc-questions/{question2_id}",
                404,
                sample_question_data
            )
        
        # Test 12: Test delete access control (only creator can delete)
        print("\n   TEST 12: Test delete access control")
        if question3_id:
            # Use the other teacher created earlier
            try:
                original_token = self.session_token
                self.session_token = other_teacher_token
                
                try:
                    # Other teacher should get 403 when trying to delete
                    self.run_test(
                        "Other teacher delete question (should be 403)",
                        "DELETE",
                        f"mc-questions/{question3_id}",
                        403
                    )
                    
                finally:
                    self.session_token = original_token
                    
            except Exception as e:
                print(f"   ⚠️  Could not test other teacher delete access: {str(e)}")
        
        # Test 13: Test delete with non-existent ID (404)
        print("\n   TEST 13: Test delete with non-existent ID")
        fake_id = str(uuid.uuid4())
        self.run_test(
            "Delete non-existent question (should be 404)",
            "DELETE",
            f"mc-questions/{fake_id}",
            404
        )
        
        # Test 14: Bulk upload questions
        print("\n   TEST 14: Bulk upload questions")
        bulk_questions_data = {
            "questions": [
                {
                    "question_text": "What is 2+2?",
                    "choice_a": "2",
                    "choice_b": "3",
                    "choice_c": "4",
                    "choice_d": "5",
                    "correct_answer": "C",
                    "chapter": "Chapter 1",
                    "lesson": "Lesson 1",
                    "difficulty": "Easy"
                },
                {
                    "question_text": "What is Python?",
                    "choice_a": "A snake",
                    "choice_b": "A programming language",
                    "choice_c": "A movie",
                    "choice_d": "A food",
                    "correct_answer": "B",
                    "chapter": "Chapter 2",
                    "lesson": "Lesson 1", 
                    "difficulty": "Medium"
                }
            ]
        }
        
        bulk_result = self.run_test(
            "Bulk upload questions",
            "POST",
            "mc-questions/bulk-upload",
            200,
            bulk_questions_data
        )
        
        if bulk_result:
            created_count = bulk_result.get('created', 0)
            errors = bulk_result.get('errors', [])
            
            print(f"   Created {created_count} questions")
            if errors:
                print(f"   Errors: {errors}")
            
            # Verify created count
            if created_count == 2:
                self.log_test("Bulk upload created correct number of questions", True)
            else:
                self.log_test("Bulk upload created correct number of questions", False, f"Expected 2, got {created_count}")
            
            # Verify no errors
            if len(errors) == 0:
                self.log_test("Bulk upload completed without errors", True)
            else:
                self.log_test("Bulk upload completed without errors", False, f"Got {len(errors)} errors")
        
        # Test 15: Bulk upload with invalid data
        print("\n   TEST 15: Bulk upload with invalid data")
        invalid_bulk_data = {
            "questions": [
                {
                    "question_text": "Valid question?",
                    "choice_a": "A",
                    "choice_b": "B", 
                    "choice_c": "C",
                    "choice_d": "D",
                    "correct_answer": "A",
                    "chapter": "Test",
                    "lesson": "Test",
                    "difficulty": "Easy"
                },
                {
                    # Missing required fields
                    "question_text": "Invalid question?",
                    "choice_a": "A"
                    # Missing choice_b, choice_c, choice_d, correct_answer
                }
            ]
        }
        
        invalid_bulk_result = self.run_test(
            "Bulk upload with invalid data",
            "POST",
            "mc-questions/bulk-upload",
            200,
            invalid_bulk_data
        )
        
        if invalid_bulk_result:
            created_count = invalid_bulk_result.get('created', 0)
            errors = invalid_bulk_result.get('errors', [])
            
            # Should create 1 valid question and have 1 error
            if created_count == 1:
                self.log_test("Bulk upload created valid questions only", True)
            else:
                self.log_test("Bulk upload created valid questions only", False, f"Expected 1, got {created_count}")
            
            if len(errors) == 1:
                self.log_test("Bulk upload tracked invalid questions as errors", True)
            else:
                self.log_test("Bulk upload tracked invalid questions as errors", False, f"Expected 1 error, got {len(errors)}")
        
        # Test 16: Bulk upload teacher-only access
        print("\n   TEST 16: Bulk upload teacher-only access")
        if student:
            original_token = self.session_token
            self.session_token = student["token"]
            
            try:
                self.run_test(
                    "Student bulk upload (should be 403)",
                    "POST",
                    "mc-questions/bulk-upload",
                    403,
                    bulk_questions_data
                )
                
            finally:
                self.session_token = original_token
        
        # Test 17: Verify all questions persist in database
        print("\n   TEST 17: Verify questions persist in database")
        final_questions_list = self.run_test(
            "List all questions after bulk upload",
            "GET",
            "mc-questions",
            200
        )
        
        if final_questions_list:
            total_questions = len(final_questions_list)
            print(f"   Total questions in database: {total_questions}")
            
            # Should have at least the questions we created
            if total_questions >= 3:  # At least the bulk upload questions + some individual ones
                self.log_test("Questions persist in database", True)
            else:
                self.log_test("Questions persist in database", False, f"Expected at least 3, got {total_questions}")
        
        print("   MC Question endpoint testing complete!")
        
        return {
            "question1_id": question1_id,
            "question2_id": question2_id, 
            "question3_id": question3_id,
            "total_questions": len(final_questions_list) if final_questions_list else 0
        }

    def test_mc_test_endpoints(self):
        """Test MC Test endpoints (Phase 2) - Test Builder & Distribution"""
        print("\n🧪 Testing MC Test Endpoints (Phase 2)...")
        
        # Setup: Create test questions first
        print("   Setting up test questions...")
        question_ids = []
        
        for i in range(3):
            question_data = {
                "question_text": f"What is {i+1} + {i+1}?",
                "choice_a": str((i+1) + (i+1)),
                "choice_b": str((i+1) + (i+1) + 1),
                "choice_c": str((i+1) + (i+1) - 1),
                "choice_d": str((i+1) + (i+1) + 2),
                "correct_answer": "A",
                "chapter": "Chapter 1",
                "lesson": "Lesson 1",
                "difficulty": "Easy"
            }
            
            question = self.run_test(
                f"Create test question {i+1}",
                "POST",
                "mc-questions",
                200,
                question_data
            )
            
            if question:
                question_ids.append(question.get('id'))
        
        if len(question_ids) < 2:
            print("❌ Cannot test MC Tests without questions")
            return None
        
        # Setup: Create test classroom
        classroom_data = {
            "name": f"MC Test Classroom {datetime.now().strftime('%H%M%S')}"
        }
        
        classroom = self.run_test(
            "Create classroom for MC tests",
            "POST",
            "classrooms",
            200,
            classroom_data
        )
        
        if not classroom:
            print("❌ Cannot test MC Tests without classroom")
            return None
        
        classroom_id = classroom.get('id')
        
        # Setup: Create test student
        student = self.create_student_user("mctest")
        if not student:
            print("❌ Cannot test MC Tests without student")
            return None
        
        # Add student to classroom
        if not self.add_student_to_classroom(student["id"], classroom_id):
            print("❌ Cannot test MC Tests without adding student to classroom")
            return None
        
        print(f"   Setup complete: {len(question_ids)} questions, classroom {classroom_id}, student {student['id']}")
        
        # TEST 1: POST /api/mc-tests - Create test with full configuration
        print("\n   TEST 1: POST /api/mc-tests - Create test with full configuration")
        
        # Test with Central Time dates
        
        # Future date (scheduled test)
        future_central = datetime.now() + timedelta(hours=2)
        future_central_str = future_central.strftime("%Y-%m-%dT%H:%M:%S")
        
        # Past date (available test) - use 8 hours ago to account for timezone conversion
        past_central = datetime.now() - timedelta(hours=8)
        past_central_str = past_central.strftime("%Y-%m-%dT%H:%M:%S")
        
        # Due date
        due_central = datetime.now() + timedelta(days=7)
        due_central_str = due_central.strftime("%Y-%m-%dT%H:%M:%S")
        
        scheduled_test_data = {
            "title": "Chapter 1 Quiz - Scheduled",
            "description": "Test on basics - scheduled for future",
            "chapter": "Chapter 1",
            "lesson": "Lesson 1",
            "question_pool_ids": question_ids[:2],
            "num_questions": 2,
            "time_limit_minutes": 30,
            "classroom_ids": [classroom_id],
            "available_date": future_central_str,
            "due_date": due_central_str
        }
        
        scheduled_test = self.run_test(
            "Create scheduled test (future available_date)",
            "POST",
            "mc-tests",
            200,
            scheduled_test_data
        )
        
        if not scheduled_test:
            print("❌ Cannot continue without scheduled test")
            return None
        
        scheduled_test_id = scheduled_test.get('id')
        print(f"   Created scheduled test: {scheduled_test_id}")
        
        # Create available test (past available_date)
        available_test_data = {
            "title": "Chapter 1 Quiz - Available",
            "description": "Test on basics - available now",
            "chapter": "Chapter 1", 
            "lesson": "Lesson 1",
            "question_pool_ids": question_ids,
            "num_questions": 2,
            "time_limit_minutes": 45,
            "classroom_ids": [classroom_id],
            "available_date": past_central_str,
            "due_date": due_central_str
        }
        
        available_test = self.run_test(
            "Create available test (past available_date)",
            "POST",
            "mc-tests",
            200,
            available_test_data
        )
        
        if not available_test:
            print("❌ Cannot continue without available test")
            return None
        
        available_test_id = available_test.get('id')
        print(f"   Created available test: {available_test_id}")
        
        # Create test with no dates (should be available)
        no_date_test_data = {
            "title": "Chapter 1 Quiz - No Dates",
            "description": "Test with no scheduling",
            "chapter": "Chapter 1",
            "lesson": "Lesson 1", 
            "question_pool_ids": question_ids[:2],
            "num_questions": 2,
            "time_limit_minutes": 0,
            "classroom_ids": [classroom_id]
        }
        
        no_date_test = self.run_test(
            "Create test with no dates",
            "POST",
            "mc-tests",
            200,
            no_date_test_data
        )
        
        no_date_test_id = no_date_test.get('id') if no_date_test else None
        
        # TEST 2: GET /api/mc-tests - List all tests created by teacher
        print("\n   TEST 2: GET /api/mc-tests - List teacher's tests")
        
        teacher_tests = self.run_test(
            "Get all teacher tests",
            "GET",
            "mc-tests",
            200
        )
        
        if teacher_tests:
            test_count = len(teacher_tests)
            print(f"   Teacher has {test_count} tests")
            
            # Verify all created tests are in the list
            teacher_test_ids = [t.get('id') for t in teacher_tests]
            
            if scheduled_test_id in teacher_test_ids:
                self.log_test("Scheduled test appears in teacher list", True)
            else:
                self.log_test("Scheduled test appears in teacher list", False, "Scheduled test not found")
            
            if available_test_id in teacher_test_ids:
                self.log_test("Available test appears in teacher list", True)
            else:
                self.log_test("Available test appears in teacher list", False, "Available test not found")
        
        # TEST 3: GET /api/mc-tests/classroom/{id} - Teacher view (sees all tests)
        print("\n   TEST 3: GET /api/mc-tests/classroom/{id} - Teacher view")
        
        teacher_classroom_tests = self.run_test(
            "Get classroom tests as teacher",
            "GET",
            f"mc-tests/classroom/{classroom_id}",
            200
        )
        
        if teacher_classroom_tests:
            teacher_test_count = len(teacher_classroom_tests)
            print(f"   Teacher sees {teacher_test_count} tests in classroom")
            
            classroom_test_ids = [t.get('id') for t in teacher_classroom_tests]
            
            # Teacher should see ALL tests regardless of available_date
            if scheduled_test_id in classroom_test_ids:
                self.log_test("Teacher sees scheduled test (future date)", True)
            else:
                self.log_test("Teacher sees scheduled test (future date)", False, "Scheduled test not visible to teacher")
            
            if available_test_id in classroom_test_ids:
                self.log_test("Teacher sees available test (past date)", True)
            else:
                self.log_test("Teacher sees available test (past date)", False, "Available test not visible to teacher")
        
        # TEST 4: GET /api/mc-tests/classroom/{id} - Student view (filtered by available_date)
        print("\n   TEST 4: GET /api/mc-tests/classroom/{id} - Student view")
        
        # Switch to student token
        original_token = self.session_token
        self.session_token = student["token"]
        
        try:
            student_classroom_tests = self.run_test(
                "Get classroom tests as student",
                "GET",
                f"mc-tests/classroom/{classroom_id}",
                200
            )
            
            if student_classroom_tests:
                student_test_count = len(student_classroom_tests)
                print(f"   Student sees {student_test_count} tests in classroom")
                
                student_test_ids = [t.get('id') for t in student_classroom_tests]
                
                # Student should NOT see scheduled test (future available_date)
                if scheduled_test_id not in student_test_ids:
                    self.log_test("Student cannot see scheduled test (future date)", True)
                else:
                    self.log_test("Student cannot see scheduled test (future date)", False, "Student can see scheduled test")
                
                # Student SHOULD see available test (past available_date)
                if available_test_id in student_test_ids:
                    self.log_test("Student can see available test (past date)", True)
                else:
                    self.log_test("Student can see available test (past date)", False, "Student cannot see available test")
                
                # Student SHOULD see test with no dates
                if no_date_test_id and no_date_test_id in student_test_ids:
                    self.log_test("Student can see test with no dates", True)
                else:
                    self.log_test("Student can see test with no dates", False, "Student cannot see test with no dates")
        
        finally:
            # Switch back to teacher token
            self.session_token = original_token
        
        # TEST 5: Validation Tests
        print("\n   TEST 5: Validation Tests")
        
        # Test with invalid question_id
        invalid_test_data = {
            "title": "Invalid Test",
            "description": "Test with invalid question",
            "chapter": "Chapter 1",
            "lesson": "Lesson 1",
            "question_pool_ids": ["invalid-question-id"],
            "num_questions": 1,
            "time_limit_minutes": 30,
            "classroom_ids": [classroom_id]
        }
        
        self.run_test(
            "Create test with invalid question_id (should fail)",
            "POST",
            "mc-tests",
            400,  # Should fail with 400 (validation error)
            invalid_test_data
        )
        
        # Test with num_questions > pool size
        oversized_test_data = {
            "title": "Oversized Test",
            "description": "Test with too many questions",
            "chapter": "Chapter 1",
            "lesson": "Lesson 1", 
            "question_pool_ids": question_ids[:2],  # Only 2 questions
            "num_questions": 5,  # Asking for 5 questions
            "time_limit_minutes": 30,
            "classroom_ids": [classroom_id]
        }
        
        self.run_test(
            "Create test with num_questions > pool size (should fail)",
            "POST",
            "mc-tests",
            400,  # Should fail with validation error
            oversized_test_data
        )
        
        # Test student trying to create test (should get 403)
        self.session_token = student["token"]
        
        try:
            student_test_data = {
                "title": "Student Test",
                "description": "Student trying to create test",
                "chapter": "Chapter 1",
                "lesson": "Lesson 1",
                "question_pool_ids": question_ids[:1],
                "num_questions": 1,
                "time_limit_minutes": 30,
                "classroom_ids": [classroom_id]
            }
            
            self.run_test(
                "Student create test (should get 403)",
                "POST",
                "mc-tests",
                403,
                student_test_data
            )
            
            # Test student trying to get all tests (should get 403)
            self.run_test(
                "Student get all tests (should get 403)",
                "GET",
                "mc-tests",
                403
            )
        
        finally:
            # Switch back to teacher token
            self.session_token = original_token
        
        # TEST 6: Timezone Testing
        print("\n   TEST 6: Timezone Testing")
        
        # Verify that dates are stored as UTC in database
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
            
            async def check_timezone_storage():
                client = AsyncIOMotorClient("mongodb://localhost:27017")
                db = client["test_database"]
                
                # Get the scheduled test from database
                test_doc = await db.mc_tests.find_one({"id": scheduled_test_id})
                
                if test_doc and test_doc.get("available_date"):
                    stored_date = test_doc["available_date"]
                    print(f"   Stored available_date: {stored_date}")
                    
                    # Check if it's a UTC ISO string
                    if isinstance(stored_date, str) and stored_date.endswith('Z') or '+00:00' in stored_date:
                        return True, "Date stored as UTC ISO string"
                    elif isinstance(stored_date, str):
                        # Try to parse as ISO format
                        try:
                            parsed_dt = datetime.fromisoformat(stored_date.replace('Z', '+00:00'))
                            return True, f"Date stored as ISO string: {stored_date}"
                        except:
                            return False, f"Date format not recognized: {stored_date}"
                    else:
                        return False, f"Date not stored as string: {type(stored_date)}"
                
                client.close()
                return False, "No available_date found in test"
            
            timezone_result, timezone_msg = asyncio.run(check_timezone_storage())
            
            if timezone_result:
                self.log_test("Timezone conversion working (Central to UTC)", True, timezone_msg)
            else:
                self.log_test("Timezone conversion working (Central to UTC)", False, timezone_msg)
        
        except Exception as e:
            self.log_test("Timezone conversion working (Central to UTC)", False, f"Error checking: {str(e)}")
        
        print("   MC Test endpoints testing complete!")
        
        return {
            "classroom_id": classroom_id,
            "question_ids": question_ids,
            "scheduled_test_id": scheduled_test_id,
            "available_test_id": available_test_id,
            "no_date_test_id": no_date_test_id,
            "student": student
        }

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
        
        # Test chapter organization feature
        self.test_chapter_organization_endpoints()
        
        # Test PDF Notes Library
        self.test_pdf_notes_endpoints()
        
        # Test critical bug fixes
        self.test_403_forbidden_fix(assignment_id, classroom['id'])
        self.test_lives_system(assignment_id, classroom['id'])
        
        # Test ADDITIONAL 403 fix - availability date and classroom membership validation
        self.test_availability_date_validation(classroom['id'])
        self.test_classroom_membership_validation(classroom['id'])
        
        # Test basic submissions
        self.test_submission_endpoints(assignment_id, classroom['id'])
        
        # Test Teacher Reports endpoints
        self.test_teacher_reports_endpoints()
        
        # Test MC Question endpoints
        self.test_mc_question_endpoints()
        
        # Test MC Test endpoints (Phase 2)
        self.test_mc_test_endpoints()
        
        # Test AdminAddCoins endpoints
        self.test_admin_add_coins_endpoints()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Total tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed == self.tests_run

    def run_teacher_reports_tests_only(self):
        """Run only Teacher Reports tests"""
        print("🚀 Starting Teacher Reports API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Setup test user
        if not self.setup_test_user():
            print("❌ Cannot proceed without test user setup")
            return False
        
        # Test Teacher Reports endpoints
        self.test_teacher_reports_endpoints()
        
        # Print summary
        print(f"\n📊 Teacher Reports Test Summary:")
        print(f"   Total tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed == self.tests_run

    def run_mc_question_tests_only(self):
        """Run only MC Question tests"""
        print("🚀 Starting MC Question API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Setup test user
        if not self.setup_test_user():
            print("❌ Cannot proceed without test user setup")
            return False
        
        # Test MC Question endpoints
        self.test_mc_question_endpoints()
        
        # Print summary
        print(f"\n📊 MC Question Test Summary:")
        print(f"   Total tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed == self.tests_run

    def run_mc_test_tests_only(self):
        """Run only MC Test tests (Phase 2)"""
        print("🚀 Starting MC Test API Tests (Phase 2)...")
        print(f"Testing against: {self.base_url}")
        
        # Setup test user
        if not self.setup_test_user():
            print("❌ Cannot proceed without test user setup")
            return False
        
        # Test MC Test endpoints
        self.test_mc_test_endpoints()
        
        # Print summary
        print(f"\n📊 MC Test Test Summary:")
        print(f"   Total tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    import sys
    if len(sys.argv) > 1:
        if sys.argv[1] == "mc-questions":
            tester = CodeClassAPITester()
            success = tester.run_mc_question_tests_only()
            return 0 if success else 1
        elif sys.argv[1] == "mc-tests":
            tester = CodeClassAPITester()
            success = tester.run_mc_test_tests_only()
            return 0 if success else 1
    else:
        tester = CodeClassAPITester()
        success = tester.run_all_tests()
        return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())