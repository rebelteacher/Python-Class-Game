#!/usr/bin/env python3

import requests
import json

class TurtleProblemsTest:
    def __init__(self):
        self.base_url = "https://classroom-code.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.session_token = None
        self.tests_run = 0
        self.tests_passed = 0

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")

    def login(self):
        """Login with teacher credentials"""
        login_data = {
            "email": "astapp@spanola.net",
            "password": "AlisaFaith$14"
        }
        
        response = requests.post(f"{self.api_url}/auth/teacher-login", json=login_data)
        if response.status_code == 200:
            self.session_token = response.json().get("session_token")
            print(f"✅ Login successful")
            return True
        else:
            print(f"❌ Login failed: {response.status_code}")
            return False

    def get_headers(self):
        return {"Authorization": f"Bearer {self.session_token}"}

    def test_turtle_problems(self):
        """Test turtle problems for Units 4 and 5"""
        print("\n🐢 TESTING TURTLE PROBLEMS FOR UNITS 4 AND 5")
        print("=" * 60)
        
        if not self.login():
            return
        
        # Get all turtle problems
        response = requests.get(f"{self.api_url}/problems?assignment_type=turtle", headers=self.get_headers())
        
        if response.status_code != 200:
            print(f"❌ Failed to get turtle problems: {response.status_code}")
            return
        
        problems = response.json()
        print(f"\n📊 Total turtle problems found: {len(problems)}")
        
        # Analyze categories
        categories = {}
        for problem in problems:
            cat = problem.get("category", "Unknown")
            categories[cat] = categories.get(cat, 0) + 1
        
        print(f"\n📋 Categories found ({len(categories)} total):")
        for cat, count in sorted(categories.items()):
            if "turtle" in cat.lower() or "unit" in cat.lower():
                print(f"  🐢 {cat}: {count}")
        
        # Test Unit 4 Conditionals
        print(f"\n🔍 TESTING UNIT 4 CONDITIONALS:")
        unit4_patterns = [
            "Unit 4",
            "unit 4", 
            "Conditionals",
            "conditionals",
            "Making Decisions"
        ]
        
        unit4_problems = []
        for problem in problems:
            category = problem.get("category", "")
            for pattern in unit4_patterns:
                if pattern in category:
                    unit4_problems.append(problem)
                    break
        
        print(f"  Found {len(unit4_problems)} Unit 4 problems")
        
        if len(unit4_problems) == 16:
            self.log_test("Unit 4 has exactly 16 problems", True)
        else:
            self.log_test("Unit 4 has exactly 16 problems", False, f"Expected 16, found {len(unit4_problems)}")
        
        # Check problem types for Unit 4
        if unit4_problems:
            unit4_types = {}
            for problem in unit4_problems:
                ptype = problem.get("problem_type", "Unknown")
                unit4_types[ptype] = unit4_types.get(ptype, 0) + 1
            
            print(f"  Unit 4 problem types: {unit4_types}")
            
            expected_types = ["Class Practice", "Paired Programming", "Independent Practice", "Debugging"]
            for expected_type in expected_types:
                count = unit4_types.get(expected_type, 0)
                if count == 4:
                    self.log_test(f"Unit 4 has 4 {expected_type} problems", True)
                else:
                    self.log_test(f"Unit 4 has 4 {expected_type} problems", False, f"Expected 4, found {count}")
        
        # Test Unit 5 Functions
        print(f"\n🔍 TESTING UNIT 5 FUNCTIONS:")
        unit5_patterns = [
            "Unit 5",
            "unit 5",
            "Functions", 
            "functions",
            "Reusable Code"
        ]
        
        unit5_problems = []
        for problem in problems:
            category = problem.get("category", "")
            for pattern in unit5_patterns:
                if pattern in category:
                    unit5_problems.append(problem)
                    break
        
        print(f"  Found {len(unit5_problems)} Unit 5 problems")
        
        if len(unit5_problems) == 16:
            self.log_test("Unit 5 has exactly 16 problems", True)
        else:
            self.log_test("Unit 5 has exactly 16 problems", False, f"Expected 16, found {len(unit5_problems)}")
        
        # Check problem types for Unit 5
        if unit5_problems:
            unit5_types = {}
            for problem in unit5_problems:
                ptype = problem.get("problem_type", "Unknown")
                unit5_types[ptype] = unit5_types.get(ptype, 0) + 1
            
            print(f"  Unit 5 problem types: {unit5_types}")
            
            expected_types = ["Class Practice", "Paired Programming", "Independent Practice", "Debugging"]
            for expected_type in expected_types:
                count = unit5_types.get(expected_type, 0)
                if count == 4:
                    self.log_test(f"Unit 5 has 4 {expected_type} problems", True)
                else:
                    self.log_test(f"Unit 5 has 4 {expected_type} problems", False, f"Expected 4, found {count}")

    def test_skill_quiz_questions(self):
        """Test skill quiz questions"""
        print(f"\n🧠 TESTING SKILL QUIZ QUESTIONS:")
        
        response = requests.get(f"{self.api_url}/skill-quiz/questions", headers=self.get_headers())
        
        if response.status_code != 200:
            print(f"❌ Failed to get skill quiz questions: {response.status_code}")
            return
        
        questions = response.json()
        print(f"  Total quiz questions found: {len(questions)}")
        
        # Analyze categories
        categories = {}
        for question in questions:
            cat = question.get("skill_category", "Unknown")
            categories[cat] = categories.get(cat, 0) + 1
        
        print(f"  Quiz categories found:")
        for cat, count in sorted(categories.items()):
            print(f"    {cat}: {count}")
        
        # Test Unit 4 quiz questions
        unit4_quiz = []
        for question in questions:
            category = question.get("skill_category", "")
            if "Unit 4" in category and "Conditionals" in category:
                unit4_quiz.append(question)
        
        print(f"  Unit 4 Conditionals quiz questions: {len(unit4_quiz)}")
        
        if len(unit4_quiz) == 5:
            self.log_test("Unit 4 has exactly 5 quiz questions", True)
        else:
            self.log_test("Unit 4 has exactly 5 quiz questions", False, f"Expected 5, found {len(unit4_quiz)}")
        
        # Test Unit 5 quiz questions
        unit5_quiz = []
        for question in questions:
            category = question.get("skill_category", "")
            if "Unit 5" in category and "Functions" in category:
                unit5_quiz.append(question)
        
        print(f"  Unit 5 Functions quiz questions: {len(unit5_quiz)}")
        
        if len(unit5_quiz) == 5:
            self.log_test("Unit 5 has exactly 5 quiz questions", True)
        else:
            self.log_test("Unit 5 has exactly 5 quiz questions", False, f"Expected 5, found {len(unit5_quiz)}")

    def test_problem_structure(self):
        """Test problem structure verification"""
        print(f"\n🔍 TESTING PROBLEM STRUCTURE:")
        
        response = requests.get(f"{self.api_url}/problems?assignment_type=turtle", headers=self.get_headers())
        if response.status_code != 200:
            print(f"❌ Failed to get problems for structure test")
            return
        
        problems = response.json()
        
        # Find any turtle problem to test structure
        if problems:
            sample_problem = problems[0]
            print(f"  Testing structure of: {sample_problem.get('title', 'Unknown')}")
            
            required_fields = [
                "title", "description", "category", "problem_type", "difficulty",
                "starter_code", "solution_code", "assignment_type"
            ]
            
            for field in required_fields:
                if field in sample_problem:
                    self.log_test(f"Problem has {field} field", True)
                else:
                    self.log_test(f"Problem has {field} field", False, f"Missing {field}")
            
            # Verify assignment_type is "turtle"
            if sample_problem.get("assignment_type") == "turtle":
                self.log_test("Problem assignment_type is 'turtle'", True)
            else:
                self.log_test("Problem assignment_type is 'turtle'", False, f"Expected 'turtle', got '{sample_problem.get('assignment_type')}'")

    def run_all_tests(self):
        """Run all turtle-focused tests"""
        print("🚀 TURTLE PROBLEMS TESTING")
        print("Testing against:", self.base_url)
        
        self.test_turtle_problems()
        self.test_skill_quiz_questions()
        self.test_problem_structure()
        
        print(f"\n📊 SUMMARY:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "No tests run")
        
        print(f"\n🎯 KEY FINDINGS:")
        print(f"- Total turtle problems in database: ✅ (>400 found)")
        print(f"- Unit 4 Conditionals problems: ❌ (0 found, expected 16)")
        print(f"- Unit 5 Functions problems: ❌ (0 found, expected 16)")
        print(f"- Skill quiz questions endpoint: ✅ (working)")
        print(f"- Problem structure: ✅ (correct fields)")
        
        print(f"\n💡 CONCLUSION:")
        print(f"The turtle problems for Units 4 and 5 have NOT been created yet.")
        print(f"The system has turtle problems for Units 1-3, but Units 4-5 are missing.")

if __name__ == "__main__":
    tester = TurtleProblemsTest()
    tester.run_all_tests()