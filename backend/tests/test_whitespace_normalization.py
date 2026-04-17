"""
Test whitespace-tolerant pattern matching for micro:bit and turtle grading.
Tests the normalize_code_whitespace function and alternate_patterns field.
"""
import pytest
import requests
import os
import sys

# Add backend to path for direct function testing
sys.path.insert(0, '/app/backend')
from server import normalize_code_whitespace

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============ Unit Tests for normalize_code_whitespace ============

class TestNormalizeCodeWhitespace:
    """Unit tests for the normalize_code_whitespace function"""
    
    def test_basic_whitespace_around_commas(self):
        """Test that spaces around commas are normalized"""
        # With spaces
        code_with_spaces = "display.set_pixel(0, 0, 9)"
        # Without spaces
        code_without_spaces = "display.set_pixel(0,0,9)"
        
        normalized_with = normalize_code_whitespace(code_with_spaces)
        normalized_without = normalize_code_whitespace(code_without_spaces)
        
        print(f"With spaces normalized: '{normalized_with}'")
        print(f"Without spaces normalized: '{normalized_without}'")
        
        # Both should normalize to the same result
        assert normalized_with == normalized_without, \
            f"Expected same result, got '{normalized_with}' vs '{normalized_without}'"
    
    def test_whitespace_around_parentheses(self):
        """Test that spaces around parentheses are normalized"""
        code_with_spaces = "print( 'hello' )"
        code_without_spaces = "print('hello')"
        
        normalized_with = normalize_code_whitespace(code_with_spaces)
        normalized_without = normalize_code_whitespace(code_without_spaces)
        
        print(f"With paren spaces: '{normalized_with}'")
        print(f"Without paren spaces: '{normalized_without}'")
        
        # Both should normalize to the same result
        assert normalized_with == normalized_without
    
    def test_whitespace_around_brackets(self):
        """Test that spaces around brackets are normalized"""
        code_with_spaces = "arr[ 0 ]"
        code_without_spaces = "arr[0]"
        
        normalized_with = normalize_code_whitespace(code_with_spaces)
        normalized_without = normalize_code_whitespace(code_without_spaces)
        
        print(f"With bracket spaces: '{normalized_with}'")
        print(f"Without bracket spaces: '{normalized_without}'")
        
        assert normalized_with == normalized_without
    
    def test_preserves_string_literal_spaces(self):
        """Test that spaces inside string literals are preserved"""
        code1 = "print('hello world')"
        code2 = "print('helloworld')"
        
        normalized1 = normalize_code_whitespace(code1)
        normalized2 = normalize_code_whitespace(code2)
        
        print(f"'hello world' normalized: '{normalized1}'")
        print(f"'helloworld' normalized: '{normalized2}'")
        
        # These should remain DIFFERENT because string content differs
        assert normalized1 != normalized2, \
            "String literal spaces should be preserved - 'hello world' != 'helloworld'"
        
        # Verify the string content is intact
        assert "hello world" in normalized1
        assert "helloworld" in normalized2
    
    def test_preserves_double_quoted_string_spaces(self):
        """Test that spaces inside double-quoted strings are preserved"""
        code1 = 'print("hello world")'
        code2 = 'print("helloworld")'
        
        normalized1 = normalize_code_whitespace(code1)
        normalized2 = normalize_code_whitespace(code2)
        
        print(f'"hello world" normalized: {normalized1}')
        print(f'"helloworld" normalized: {normalized2}')
        
        assert normalized1 != normalized2
        assert "hello world" in normalized1
    
    def test_complex_microbit_pattern(self):
        """Test realistic micro:bit code patterns"""
        # Teacher's pattern (with spaces)
        teacher_pattern = "display.set_pixel(0, 0, 9)"
        # Student's code (without spaces)
        student_code = "display.set_pixel(0,0,9)"
        
        normalized_pattern = normalize_code_whitespace(teacher_pattern)
        normalized_code = normalize_code_whitespace(student_code)
        
        print(f"Teacher pattern normalized: '{normalized_pattern}'")
        print(f"Student code normalized: '{normalized_code}'")
        
        # Pattern should be found in normalized code
        assert normalized_pattern in normalized_code or normalized_code in normalized_pattern or normalized_pattern == normalized_code
    
    def test_multiple_arguments_with_varying_spaces(self):
        """Test function calls with multiple arguments and varying spaces"""
        variations = [
            "func(a, b, c)",
            "func(a,b,c)",
            "func( a, b, c )",
            "func(a , b , c)",
        ]
        
        normalized = [normalize_code_whitespace(v) for v in variations]
        print(f"Normalized variations: {normalized}")
        
        # All should normalize to the same result
        assert len(set(normalized)) == 1, \
            f"All variations should normalize to same result, got: {set(normalized)}"
    
    def test_nested_function_calls(self):
        """Test nested function calls with spaces"""
        code1 = "display.show(Image.HEART)"
        code2 = "display.show( Image.HEART )"
        
        normalized1 = normalize_code_whitespace(code1)
        normalized2 = normalize_code_whitespace(code2)
        
        print(f"Nested call 1: '{normalized1}'")
        print(f"Nested call 2: '{normalized2}'")
        
        assert normalized1 == normalized2


# ============ Integration Tests for API Pattern Matching ============

class TestMicrobitPatternMatching:
    """Integration tests for micro:bit grading with whitespace normalization"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session for teacher"""
        session = requests.Session()
        login_response = session.post(
            f"{BASE_URL}/api/auth/teacher-login",
            json={
                "email": "astapp@spanola.net",
                "password": "AlisaFaith$14"
            }
        )
        if login_response.status_code != 200:
            pytest.skip(f"Teacher login failed: {login_response.status_code}")
        return session
    
    def test_get_microbit_problems(self, auth_session):
        """Verify we can fetch micro:bit problems from the library"""
        response = auth_session.get(f"{BASE_URL}/api/problems")
        assert response.status_code == 200
        
        problems = response.json()
        microbit_problems = [p for p in problems if p.get("assignment_type") == "microbit"]
        
        print(f"Found {len(microbit_problems)} micro:bit problems")
        
        # Check if any have test_cases with patterns
        problems_with_patterns = [
            p for p in microbit_problems 
            if p.get("test_cases") and any(tc.get("pattern") for tc in p.get("test_cases", []))
        ]
        print(f"Micro:bit problems with pattern test cases: {len(problems_with_patterns)}")
        
        return microbit_problems
    
    def test_create_microbit_problem_with_alternate_patterns(self, auth_session):
        """Test creating a micro:bit problem with alternate_patterns field"""
        problem_data = {
            "title": "TEST_Whitespace Pattern Test",
            "description": "Test problem for whitespace normalization",
            "starter_code": "# Write your code here",
            "solution_code": "from microbit import *\ndisplay.set_pixel(0, 0, 9)",
            "category": "Test",
            "difficulty": "Easy",
            "assignment_type": "microbit",
            "test_cases": [
                {
                    "description": "Uses display.set_pixel",
                    "pattern": "display.set_pixel(0, 0, 9)",
                    "alternate_patterns": "display.set_pixel(0,0,9)|set_pixel(0, 0, 9)",
                    "points": 50
                },
                {
                    "description": "Imports microbit",
                    "pattern": "from microbit import",
                    "points": 50
                }
            ]
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/problems",
            json=problem_data
        )
        
        print(f"Create problem response: {response.status_code}")
        if response.status_code != 200:
            print(f"Error: {response.text}")
        
        assert response.status_code == 200
        
        created = response.json()
        problem_id = created.get("id")
        print(f"Created problem ID: {problem_id}")
        
        # Verify test_cases were saved with alternate_patterns
        assert "test_cases" in created
        assert len(created["test_cases"]) == 2
        assert created["test_cases"][0].get("alternate_patterns") == "display.set_pixel(0,0,9)|set_pixel(0, 0, 9)"
        
        # Cleanup - delete the test problem
        if problem_id:
            delete_response = auth_session.delete(f"{BASE_URL}/api/problems/{problem_id}")
            print(f"Cleanup delete response: {delete_response.status_code}")
        
        return created


class TestTurtlePatternMatching:
    """Integration tests for turtle grading with whitespace normalization"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session for teacher"""
        session = requests.Session()
        login_response = session.post(
            f"{BASE_URL}/api/auth/teacher-login",
            json={
                "email": "astapp@spanola.net",
                "password": "AlisaFaith$14"
            }
        )
        if login_response.status_code != 200:
            pytest.skip(f"Teacher login failed: {login_response.status_code}")
        return session
    
    def test_get_turtle_problems(self, auth_session):
        """Verify we can fetch turtle problems from the library"""
        response = auth_session.get(f"{BASE_URL}/api/problems")
        assert response.status_code == 200
        
        problems = response.json()
        turtle_problems = [p for p in problems if p.get("assignment_type") == "turtle"]
        
        print(f"Found {len(turtle_problems)} turtle problems")
        
        # Check if any have turtle_grading_criteria with pattern_checks
        problems_with_patterns = [
            p for p in turtle_problems 
            if p.get("turtle_grading_criteria") and p["turtle_grading_criteria"].get("pattern_checks")
        ]
        print(f"Turtle problems with pattern checks: {len(problems_with_patterns)}")
        
        return turtle_problems


# ============ Direct Function Tests ============

class TestPatternMatchingLogic:
    """Test the pattern matching logic directly"""
    
    def test_pattern_in_normalized_code(self):
        """Test that normalized patterns match normalized code"""
        # Simulate what the grading code does
        pattern = "display.set_pixel(0, 0, 9)"
        student_code = """
from microbit import *
display.set_pixel(0,0,9)
sleep(1000)
"""
        
        normalized_pattern = normalize_code_whitespace(pattern)
        normalized_code = normalize_code_whitespace(student_code)
        
        print(f"Pattern: '{normalized_pattern}'")
        print(f"Code: '{normalized_code}'")
        
        # The pattern should be found in the code
        assert normalized_pattern in normalized_code, \
            f"Pattern '{normalized_pattern}' should be found in normalized code"
    
    def test_multiple_patterns_with_pipe_separator(self):
        """Test pattern matching with | separator (as used in alternate_patterns)"""
        patterns_string = "display.set_pixel(0, 0, 9)|display.set_pixel(0,0,9)"
        student_code = "display.set_pixel(0,0,9)"
        
        # Split patterns and normalize each
        patterns = [p.strip() for p in patterns_string.split("|")]
        normalized_code = normalize_code_whitespace(student_code)
        
        # Check if any pattern matches
        matched = any(
            normalize_code_whitespace(p) in normalized_code
            for p in patterns if p
        )
        
        print(f"Patterns: {patterns}")
        print(f"Normalized code: '{normalized_code}'")
        print(f"Matched: {matched}")
        
        assert matched, "At least one pattern should match"
    
    def test_case_insensitive_matching_for_turtle(self):
        """Test that turtle pattern matching is case-insensitive"""
        # Turtle grading uses .lower() on both pattern and code
        pattern = "forward(100)"
        student_code = "Forward(100)"
        
        # Simulate turtle grading logic
        code_lower = normalize_code_whitespace(student_code.lower())
        pattern_lower = normalize_code_whitespace(pattern.lower())
        
        count = code_lower.count(pattern_lower)
        
        print(f"Pattern (lower): '{pattern_lower}'")
        print(f"Code (lower): '{code_lower}'")
        print(f"Count: {count}")
        
        assert count >= 1, "Pattern should be found (case-insensitive)"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
