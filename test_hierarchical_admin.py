import requests
import sys
import json
from datetime import datetime, timezone, timedelta
import uuid
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

class HierarchicalAdminTester:
    def __init__(self, base_url="https://studentmap.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test users
        self.school_admin_token = None
        self.school_admin_id = None
        self.district_admin_token = None
        self.district_admin_id = None
        self.teacher_token = None
        self.teacher_id = None
        self.student_token = None
        self.student_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, token=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if token:
            test_headers['Authorization'] = f'Bearer {token}'
        
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

    async def setup_test_users(self):
        """Create test users for hierarchical admin testing"""
        print("\n🔧 Setting up test users for hierarchical admin testing...")
        
        try:
            client = AsyncIOMotorClient("mongodb://localhost:27017")
            db = client["test_database"]
            
            timestamp = str(int(datetime.now().timestamp()))
            
            # Create School Admin
            self.school_admin_id = f"school-admin-{timestamp}"
            self.school_admin_token = f"school_admin_session_{timestamp}"
            
            school_admin_doc = {
                "id": self.school_admin_id,
                "email": f"school.admin.{timestamp}@lincolnelem.edu",
                "name": f"School Admin {timestamp}",
                "role": "school_admin",
                "school": "Lincoln Elementary",
                "district": "Springfield District",
                "is_admin": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(school_admin_doc)
            
            school_admin_session = {
                "user_id": self.school_admin_id,
                "session_token": self.school_admin_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.sessions.insert_one(school_admin_session)
            
            print(f"✅ School Admin created: {self.school_admin_id}")
            
            # Create District Admin
            self.district_admin_id = f"district-admin-{timestamp}"
            self.district_admin_token = f"district_admin_session_{timestamp}"
            
            district_admin_doc = {
                "id": self.district_admin_id,
                "email": f"district.admin.{timestamp}@springfield.edu",
                "name": f"District Admin {timestamp}",
                "role": "district_admin",
                "district": "Springfield District",
                "is_admin": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(district_admin_doc)
            
            district_admin_session = {
                "user_id": self.district_admin_id,
                "session_token": self.district_admin_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.sessions.insert_one(district_admin_session)
            
            print(f"✅ District Admin created: {self.district_admin_id}")
            
            # Create Teacher in same school
            self.teacher_id = f"teacher-{timestamp}"
            self.teacher_token = f"teacher_session_{timestamp}"
            
            teacher_doc = {
                "id": self.teacher_id,
                "email": f"teacher.{timestamp}@lincolnelem.edu",
                "name": f"Teacher {timestamp}",
                "role": "teacher",
                "school": "Lincoln Elementary",
                "district": "Springfield District",
                "is_admin": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(teacher_doc)
            
            teacher_session = {
                "user_id": self.teacher_id,
                "session_token": self.teacher_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.sessions.insert_one(teacher_session)
            
            print(f"✅ Teacher created: {self.teacher_id}")
            
            # Create Student
            self.student_id = f"student-{timestamp}"
            self.student_token = f"student_session_{timestamp}"
            
            student_doc = {
                "id": self.student_id,
                "email": f"student.{timestamp}@example.com",
                "name": f"Student {timestamp}",
                "role": "student",
                "is_admin": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(student_doc)
            
            student_session = {
                "user_id": self.student_id,
                "session_token": self.student_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.sessions.insert_one(student_session)
            
            print(f"✅ Student created: {self.student_id}")
            
            # Create a classroom for the teacher with students
            classroom_id = f"classroom-{timestamp}"
            classroom_doc = {
                "id": classroom_id,
                "teacher_id": self.teacher_id,
                "name": f"Test Classroom {timestamp}",
                "class_code": f"TEST{timestamp[-4:]}",
                "students": [self.student_id],
                "is_archived": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.classrooms.insert_one(classroom_doc)
            
            print(f"✅ Classroom created: {classroom_id}")
            
            client.close()
            return True
            
        except Exception as e:
            print(f"❌ Setup error: {str(e)}")
            return False

    def test_school_admin_dashboard(self):
        """Test GET /api/school-admin/dashboard"""
        print("\n📊 Testing School Admin Dashboard...")
        
        # Test with school admin (should work)
        response = self.run_test(
            "School Admin Dashboard - School Admin Access",
            "GET",
            "school-admin/dashboard",
            200,
            token=self.school_admin_token
        )
        
        if response:
            # Verify response structure
            if "stats" in response and "teachers" in response and "classrooms" in response:
                stats = response["stats"]
                if all(key in stats for key in ["school_name", "total_teachers", "total_classrooms", "total_students"]):
                    print(f"   ✓ Stats: {stats['total_teachers']} teachers, {stats['total_classrooms']} classrooms, {stats['total_students']} students")
                    print(f"   ✓ School: {stats['school_name']}")
                    print(f"   ✓ Teachers list: {len(response['teachers'])} teachers")
                    print(f"   ✓ Classrooms list: {len(response['classrooms'])} classrooms")
                else:
                    print(f"   ⚠ Missing stats fields")
            else:
                print(f"   ⚠ Missing response fields")
        
        # Test access control - District Admin (should fail)
        self.run_test(
            "School Admin Dashboard - District Admin Access (403)",
            "GET",
            "school-admin/dashboard",
            403,
            token=self.district_admin_token
        )
        
        # Test access control - Teacher (should fail)
        self.run_test(
            "School Admin Dashboard - Teacher Access (403)",
            "GET",
            "school-admin/dashboard",
            403,
            token=self.teacher_token
        )
        
        # Test access control - Student (should fail)
        self.run_test(
            "School Admin Dashboard - Student Access (403)",
            "GET",
            "school-admin/dashboard",
            403,
            token=self.student_token
        )

    def test_district_admin_dashboard(self):
        """Test GET /api/district-admin/dashboard"""
        print("\n📊 Testing District Admin Dashboard...")
        
        # Test with district admin (should work)
        response = self.run_test(
            "District Admin Dashboard - District Admin Access",
            "GET",
            "district-admin/dashboard",
            200,
            token=self.district_admin_token
        )
        
        if response:
            # Verify response structure
            if "stats" in response and "schools" in response and "teachers" in response:
                stats = response["stats"]
                if all(key in stats for key in ["district", "total_schools", "total_teachers", "total_classrooms", "total_students"]):
                    print(f"   ✓ Stats: {stats['total_schools']} schools, {stats['total_teachers']} teachers")
                    print(f"   ✓ District: {stats['district']}")
                    print(f"   ✓ Schools list: {len(response['schools'])} schools")
                    print(f"   ✓ Teachers list: {len(response['teachers'])} teachers")
                else:
                    print(f"   ⚠ Missing stats fields")
            else:
                print(f"   ⚠ Missing response fields")
        
        # Test access control - School Admin (should fail)
        self.run_test(
            "District Admin Dashboard - School Admin Access (403)",
            "GET",
            "district-admin/dashboard",
            403,
            token=self.school_admin_token
        )
        
        # Test access control - Teacher (should fail)
        self.run_test(
            "District Admin Dashboard - Teacher Access (403)",
            "GET",
            "district-admin/dashboard",
            403,
            token=self.teacher_token
        )
        
        # Test access control - Student (should fail)
        self.run_test(
            "District Admin Dashboard - Student Access (403)",
            "GET",
            "district-admin/dashboard",
            403,
            token=self.student_token
        )

    def test_school_admin_teachers(self):
        """Test GET /api/school-admin/teachers"""
        print("\n👨‍🏫 Testing School Admin Teachers List...")
        
        # Test with school admin (should work)
        response = self.run_test(
            "School Admin Teachers - School Admin Access",
            "GET",
            "school-admin/teachers",
            200,
            token=self.school_admin_token
        )
        
        if response:
            print(f"   ✓ Teachers in school: {len(response)} teachers")
            if len(response) > 0:
                print(f"   ✓ Sample teacher: {response[0].get('name', 'N/A')}")
        
        # Test access control - District Admin (should fail)
        self.run_test(
            "School Admin Teachers - District Admin Access (403)",
            "GET",
            "school-admin/teachers",
            403,
            token=self.district_admin_token
        )
        
        # Test access control - Teacher (should fail)
        self.run_test(
            "School Admin Teachers - Teacher Access (403)",
            "GET",
            "school-admin/teachers",
            403,
            token=self.teacher_token
        )

    def test_school_admin_teacher_classrooms(self):
        """Test GET /api/school-admin/teacher/{teacher_id}/classrooms"""
        print("\n🏫 Testing School Admin Teacher Classrooms...")
        
        # Test with school admin and valid teacher (should work)
        response = self.run_test(
            "School Admin Teacher Classrooms - Valid Teacher",
            "GET",
            f"school-admin/teacher/{self.teacher_id}/classrooms",
            200,
            token=self.school_admin_token
        )
        
        if response:
            print(f"   ✓ Classrooms for teacher: {len(response)} classrooms")
            if len(response) > 0:
                classroom = response[0]
                print(f"   ✓ Classroom: {classroom.get('name', 'N/A')}")
                if "students" in classroom:
                    print(f"   ✓ Students populated: {len(classroom['students'])} students")
                    if len(classroom['students']) > 0:
                        print(f"   ✓ Sample student: {classroom['students'][0].get('name', 'N/A')}")
        
        # Test with invalid teacher ID (should fail)
        self.run_test(
            "School Admin Teacher Classrooms - Invalid Teacher (403)",
            "GET",
            "school-admin/teacher/invalid-teacher-id/classrooms",
            403,
            token=self.school_admin_token
        )
        
        # Test access control - District Admin (should fail)
        self.run_test(
            "School Admin Teacher Classrooms - District Admin Access (403)",
            "GET",
            f"school-admin/teacher/{self.teacher_id}/classrooms",
            403,
            token=self.district_admin_token
        )
        
        # Test access control - Teacher (should fail)
        self.run_test(
            "School Admin Teacher Classrooms - Teacher Access (403)",
            "GET",
            f"school-admin/teacher/{self.teacher_id}/classrooms",
            403,
            token=self.teacher_token
        )

    def test_district_admin_schools(self):
        """Test GET /api/district-admin/schools"""
        print("\n🏢 Testing District Admin Schools List...")
        
        # Test with district admin (should work)
        response = self.run_test(
            "District Admin Schools - District Admin Access",
            "GET",
            "district-admin/schools",
            200,
            token=self.district_admin_token
        )
        
        if response:
            print(f"   ✓ Schools in district: {len(response)} schools")
            if len(response) > 0:
                school = response[0]
                print(f"   ✓ Sample school: {school.get('name', 'N/A')}")
                print(f"   ✓ Teacher count: {school.get('teacher_count', 0)}")
        
        # Test access control - School Admin (should fail)
        self.run_test(
            "District Admin Schools - School Admin Access (403)",
            "GET",
            "district-admin/schools",
            403,
            token=self.school_admin_token
        )
        
        # Test access control - Teacher (should fail)
        self.run_test(
            "District Admin Schools - Teacher Access (403)",
            "GET",
            "district-admin/schools",
            403,
            token=self.teacher_token
        )

    def test_district_admin_teachers_in_school(self):
        """Test GET /api/district-admin/teachers-in-school/{school_name}"""
        print("\n👨‍🏫 Testing District Admin Teachers in School...")
        
        # Test with district admin and valid school (should work)
        response = self.run_test(
            "District Admin Teachers in School - Valid School",
            "GET",
            "district-admin/teachers-in-school/Lincoln Elementary",
            200,
            token=self.district_admin_token
        )
        
        if response:
            print(f"   ✓ Teachers in school: {len(response)} teachers")
            if len(response) > 0:
                print(f"   ✓ Sample teacher: {response[0].get('name', 'N/A')}")
        
        # Test access control - School Admin (should fail)
        self.run_test(
            "District Admin Teachers in School - School Admin Access (403)",
            "GET",
            "district-admin/teachers-in-school/Lincoln Elementary",
            403,
            token=self.school_admin_token
        )
        
        # Test access control - Teacher (should fail)
        self.run_test(
            "District Admin Teachers in School - Teacher Access (403)",
            "GET",
            "district-admin/teachers-in-school/Lincoln Elementary",
            403,
            token=self.teacher_token
        )

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("📊 HIERARCHICAL ADMIN SYSTEM TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        print("="*60)
        
        if self.tests_passed == self.tests_run:
            print("✅ ALL TESTS PASSED!")
        else:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")

def main():
    print("="*60)
    print("🧪 HIERARCHICAL ADMIN SYSTEM BACKEND TESTING")
    print("="*60)
    
    tester = HierarchicalAdminTester()
    
    # Setup test users
    setup_success = asyncio.run(tester.setup_test_users())
    
    if not setup_success:
        print("❌ Failed to setup test users. Exiting.")
        sys.exit(1)
    
    # Run all tests
    tester.test_school_admin_dashboard()
    tester.test_district_admin_dashboard()
    tester.test_school_admin_teachers()
    tester.test_school_admin_teacher_classrooms()
    tester.test_district_admin_schools()
    tester.test_district_admin_teachers_in_school()
    
    # Print summary
    tester.print_summary()
    
    # Exit with appropriate code
    if tester.tests_passed == tester.tests_run:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
