#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timezone, timedelta
import uuid
import base64

class PDFNotesAPITester:
    def __init__(self, base_url="https://fill-feature-stage.preview.emergentagent.com"):
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
            return False

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

    def run_tests(self):
        """Run PDF Notes Library tests"""
        print("🚀 Starting PDF Notes Library API Tests...")
        print(f"🌐 Base URL: {self.base_url}")
        
        # Setup test user
        if not self.setup_test_user():
            print("❌ Failed to setup test user. Exiting.")
            return False
        
        # Test PDF Notes Library
        self.test_pdf_notes_endpoints()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Total tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = PDFNotesAPITester()
    success = tester.run_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())