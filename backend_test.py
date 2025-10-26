import requests
import sys
import json
from datetime import datetime, timezone, timedelta
import uuid

class CodeClassAPITester:
    def __init__(self, base_url="https://codeedu-hub.preview.emergentagent.com"):
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
                await db.user_sessions.insert_one(session_doc)
                
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
        db.user_sessions.insertOne({{
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
                await db.user_sessions.insert_one(session_doc)
                
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
                    await db.user_sessions.insert_one(session_doc)
                    
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
                await db.user_sessions.insert_one(session_doc)
                
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

def main():
    tester = CodeClassAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())