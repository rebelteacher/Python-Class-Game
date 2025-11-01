#!/usr/bin/env python3
"""
Test script specifically for Move functionality backend endpoints
"""

import requests
import sys
import json
from datetime import datetime, timezone, timedelta
import uuid
import asyncio

class MoveFunctionalityTester:
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
            
            # Generate unique IDs
            timestamp = str(int(datetime.now().timestamp()))
            self.user_id = f"test-user-move-{timestamp}"
            self.session_token = f"test_session_move_{timestamp}"
            
            async def create_test_data():
                client = AsyncIOMotorClient("mongodb://localhost:27017")
                db = client["test_database"]
                
                # Create user
                user_doc = {
                    "id": self.user_id,
                    "email": f"test.user.move.{timestamp}@example.com",
                    "name": f"Test User Move {timestamp}",
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
            return False

    def create_student_user(self, suffix=""):
        """Helper method to create a student user"""
        base_timestamp = int(datetime.now().timestamp())
        if suffix and suffix.isdigit():
            student_timestamp = str(base_timestamp + int(suffix))
        else:
            student_timestamp = str(base_timestamp) + (f"-{suffix}" if suffix else "")
        student_id = f"test-student-move-{student_timestamp}"
        student_token = f"test_student_move_session_{student_timestamp}"
        
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            
            async def create_student_data():
                client = AsyncIOMotorClient("mongodb://localhost:27017")
                db = client["test_database"]
                
                # Create student user with default stats
                user_doc = {
                    "id": student_id,
                    "email": f"test.student.move.{student_timestamp}@example.com",
                    "name": f"Test Student Move {student_timestamp}",
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
            return {"id": student_id, "token": student_token, "email": f"test.student.move.{student_timestamp}@example.com"}
            
        except Exception as e:
            print(f"   ❌ Failed to create student user: {str(e)}")
            return None

    def test_move_functionality_endpoints(self):
        """Test Move functionality backend endpoints for problems and MC questions"""
        print("\n📁 Testing Move Functionality Endpoints...")
        
        # Create test problems and MC questions first
        print("   Setting up test data for move functionality...")
        
        # Create test problem
        problem_data = {
            "title": f"Test Problem for Move {datetime.now().strftime('%H%M%S')}",
            "description": "A problem to test move functionality",
            "starter_code": "def test_function():\n    pass",
            "solution_code": "def test_function():\n    return 'test'",
            "expected_output": "test",
            "category": "Test Category",
            "difficulty": "Easy",
            "chapter": "Chapter 1",
            "lesson": "Lesson 1",
            "csta_standard": "1A-AP-15",
            "problem_type": "Independent Practice"
        }
        
        problem = self.run_test(
            "Create test problem for move testing",
            "POST",
            "problems",
            200,
            problem_data
        )
        
        if not problem:
            print("❌ Cannot test move functionality without test problem")
            return
        
        problem_id = problem.get('id')
        print(f"   Created test problem: {problem_id}")
        
        # Create test MC question
        mc_question_data = {
            "question_text": f"Test MC Question for Move {datetime.now().strftime('%H%M%S')}",
            "choice_a": "Option A",
            "choice_b": "Option B", 
            "choice_c": "Option C",
            "choice_d": "Option D",
            "correct_answer": "A",
            "chapter": "Chapter 1",
            "lesson": "Lesson 1",
            "difficulty": "Easy"
        }
        
        mc_question = self.run_test(
            "Create test MC question for move testing",
            "POST",
            "mc-questions",
            200,
            mc_question_data
        )
        
        if not mc_question:
            print("❌ Cannot test move functionality without test MC question")
            return
        
        mc_question_id = mc_question.get('id')
        print(f"   Created test MC question: {mc_question_id}")
        
        # TEST 1: Move problem to different chapter/lesson
        print("\n   TEST 1: Move problem to different chapter/lesson")
        
        move_problem_data = {
            "chapter": "Chapter 2",
            "lesson": "Lesson 2",
            "order": 5
        }
        
        move_response = self.run_test(
            "Move problem to Chapter 2, Lesson 2",
            "PUT",
            f"problems/{problem_id}/move",
            200,
            move_problem_data
        )
        
        if move_response:
            # Verify the problem was actually moved in database
            try:
                from motor.motor_asyncio import AsyncIOMotorClient
                
                async def verify_problem_move():
                    client = AsyncIOMotorClient("mongodb://localhost:27017")
                    db = client["test_database"]
                    
                    updated_problem = await db.problems.find_one({"id": problem_id})
                    client.close()
                    
                    if updated_problem:
                        return {
                            "chapter": updated_problem.get("chapter"),
                            "lesson": updated_problem.get("lesson"),
                            "order": updated_problem.get("order", 0)
                        }
                    return None
                
                updated_data = asyncio.run(verify_problem_move())
                
                if updated_data:
                    if updated_data["chapter"] == "Chapter 2":
                        self.log_test("Problem chapter updated in database", True)
                    else:
                        self.log_test("Problem chapter updated in database", False, f"Expected 'Chapter 2', got '{updated_data['chapter']}'")
                    
                    if updated_data["lesson"] == "Lesson 2":
                        self.log_test("Problem lesson updated in database", True)
                    else:
                        self.log_test("Problem lesson updated in database", False, f"Expected 'Lesson 2', got '{updated_data['lesson']}'")
                    
                    if updated_data["order"] == 5:
                        self.log_test("Problem order updated in database", True)
                    else:
                        self.log_test("Problem order updated in database", False, f"Expected 5, got {updated_data['order']}")
                else:
                    self.log_test("Problem found in database after move", False, "Problem not found")
                    
            except Exception as e:
                print(f"   ⚠️  Could not verify problem move in database: {str(e)}")
        
        # TEST 2: Move MC question to different chapter/lesson
        print("\n   TEST 2: Move MC question to different chapter/lesson")
        
        move_mc_data = {
            "chapter": "Chapter 3",
            "lesson": "Lesson 3", 
            "order": 10
        }
        
        move_mc_response = self.run_test(
            "Move MC question to Chapter 3, Lesson 3",
            "PUT",
            f"mc-questions/{mc_question_id}/move",
            200,
            move_mc_data
        )
        
        if move_mc_response:
            # Verify the MC question was actually moved in database
            try:
                async def verify_mc_move():
                    client = AsyncIOMotorClient("mongodb://localhost:27017")
                    db = client["test_database"]
                    
                    updated_question = await db.mc_questions.find_one({"id": mc_question_id})
                    client.close()
                    
                    if updated_question:
                        return {
                            "chapter": updated_question.get("chapter"),
                            "lesson": updated_question.get("lesson"),
                            "order": updated_question.get("order", 0)
                        }
                    return None
                
                updated_mc_data = asyncio.run(verify_mc_move())
                
                if updated_mc_data:
                    if updated_mc_data["chapter"] == "Chapter 3":
                        self.log_test("MC question chapter updated in database", True)
                    else:
                        self.log_test("MC question chapter updated in database", False, f"Expected 'Chapter 3', got '{updated_mc_data['chapter']}'")
                    
                    if updated_mc_data["lesson"] == "Lesson 3":
                        self.log_test("MC question lesson updated in database", True)
                    else:
                        self.log_test("MC question lesson updated in database", False, f"Expected 'Lesson 3', got '{updated_mc_data['lesson']}'")
                    
                    if updated_mc_data["order"] == 10:
                        self.log_test("MC question order updated in database", True)
                    else:
                        self.log_test("MC question order updated in database", False, f"Expected 10, got {updated_mc_data['order']}")
                else:
                    self.log_test("MC question found in database after move", False, "MC question not found")
                    
            except Exception as e:
                print(f"   ⚠️  Could not verify MC question move in database: {str(e)}")
        
        # TEST 3: Test access control - Student trying to move problem (should get 403)
        print("\n   TEST 3: Test access control - Student trying to move problem")
        
        # Create student user
        student = self.create_student_user("movetest")
        if student:
            original_token = self.session_token
            self.session_token = student["token"]
            
            try:
                move_data = {
                    "chapter": "Chapter 4",
                    "lesson": "Lesson 4"
                }
                
                self.run_test(
                    "Student move problem (should be 403)",
                    "PUT",
                    f"problems/{problem_id}/move",
                    403,
                    move_data
                )
                
                self.run_test(
                    "Student move MC question (should be 403)",
                    "PUT",
                    f"mc-questions/{mc_question_id}/move",
                    403,
                    move_data
                )
                
            finally:
                self.session_token = original_token
        
        # TEST 4: Test creator-only access for MC questions
        print("\n   TEST 4: Test creator-only access for MC questions")
        
        # Create another teacher
        timestamp = str(int(datetime.now().timestamp()))
        other_teacher_id = f"test-teacher-move-{timestamp}"
        other_teacher_token = f"test_teacher_move_session_{timestamp}"
        
        try:
            async def create_other_teacher():
                client = AsyncIOMotorClient("mongodb://localhost:27017")
                db = client["test_database"]
                
                # Create teacher user
                user_doc = {
                    "id": other_teacher_id,
                    "email": f"other.teacher.move.{timestamp}@example.com",
                    "name": f"Other Teacher Move {timestamp}",
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
                    move_data = {
                        "chapter": "Chapter 5",
                        "lesson": "Lesson 5"
                    }
                    
                    # Other teacher should be able to move problems (teacher-only access)
                    self.run_test(
                        "Other teacher move problem (should succeed)",
                        "PUT",
                        f"problems/{problem_id}/move",
                        200,
                        move_data
                    )
                    
                    # Other teacher should NOT be able to move MC questions (creator-only access)
                    self.run_test(
                        "Other teacher move MC question (should be 403 - creator only)",
                        "PUT",
                        f"mc-questions/{mc_question_id}/move",
                        403,
                        move_data
                    )
                    
                finally:
                    self.session_token = original_token
                    
        except Exception as e:
            print(f"   ⚠️  Could not test other teacher access: {str(e)}")
        
        # TEST 5: Test with invalid IDs (should get 404)
        print("\n   TEST 5: Test with invalid IDs")
        
        invalid_id = "invalid-id-12345"
        move_data = {
            "chapter": "Chapter 6",
            "lesson": "Lesson 6"
        }
        
        self.run_test(
            "Move invalid problem ID (should be 404)",
            "PUT",
            f"problems/{invalid_id}/move",
            404,
            move_data
        )
        
        self.run_test(
            "Move invalid MC question ID (should be 404)",
            "PUT",
            f"mc-questions/{invalid_id}/move",
            404,
            move_data
        )
        
        # TEST 6: Test with missing fields (should use defaults)
        print("\n   TEST 6: Test with missing fields")
        
        # Test with empty data (should use existing values as defaults)
        empty_data = {}
        
        self.run_test(
            "Move problem with empty data (should succeed with defaults)",
            "PUT",
            f"problems/{problem_id}/move",
            200,
            empty_data
        )
        
        self.run_test(
            "Move MC question with empty data (should succeed with defaults)",
            "PUT",
            f"mc-questions/{mc_question_id}/move",
            200,
            empty_data
        )
        
        # TEST 7: Test with partial data
        print("\n   TEST 7: Test with partial data")
        
        partial_data = {
            "chapter": "Final Chapter"
            # Missing lesson and order - should use defaults
        }
        
        move_partial_response = self.run_test(
            "Move problem with partial data (chapter only)",
            "PUT",
            f"problems/{problem_id}/move",
            200,
            partial_data
        )
        
        if move_partial_response:
            # Verify partial update worked
            try:
                async def verify_partial_move():
                    client = AsyncIOMotorClient("mongodb://localhost:27017")
                    db = client["test_database"]
                    
                    updated_problem = await db.problems.find_one({"id": problem_id})
                    client.close()
                    
                    if updated_problem:
                        return {
                            "chapter": updated_problem.get("chapter"),
                            "lesson": updated_problem.get("lesson"),
                            "order": updated_problem.get("order", 0)
                        }
                    return None
                
                partial_data_result = asyncio.run(verify_partial_move())
                
                if partial_data_result:
                    if partial_data_result["chapter"] == "Final Chapter":
                        self.log_test("Partial move updated chapter correctly", True)
                    else:
                        self.log_test("Partial move updated chapter correctly", False, f"Expected 'Final Chapter', got '{partial_data_result['chapter']}'")
                        
            except Exception as e:
                print(f"   ⚠️  Could not verify partial move: {str(e)}")
        
        # TEST 8: Test unauthenticated access (should get 401)
        print("\n   TEST 8: Test unauthenticated access")
        
        original_token = self.session_token
        self.session_token = None
        
        try:
            move_data = {
                "chapter": "Unauthorized Chapter",
                "lesson": "Unauthorized Lesson"
            }
            
            self.run_test(
                "Unauthenticated move problem (should be 401)",
                "PUT",
                f"problems/{problem_id}/move",
                401,
                move_data
            )
            
            self.run_test(
                "Unauthenticated move MC question (should be 401)",
                "PUT",
                f"mc-questions/{mc_question_id}/move",
                401,
                move_data
            )
            
        finally:
            self.session_token = original_token
        
        print("   Move functionality endpoint testing complete!")
        
        return {
            "problem_id": problem_id,
            "mc_question_id": mc_question_id
        }

    def run_tests(self):
        """Run move functionality tests"""
        print("🚀 Starting Move Functionality API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Setup test user
        if not self.setup_test_user():
            print("❌ Cannot proceed without test user setup")
            return False
        
        # Test move functionality endpoints
        self.test_move_functionality_endpoints()
        
        # Print summary
        print(f"\n📊 Move Functionality Test Summary:")
        print(f"   Total tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = MoveFunctionalityTester()
    success = tester.run_tests()
    sys.exit(0 if success else 1)