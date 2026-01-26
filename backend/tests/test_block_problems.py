"""
Test Block Problem Creation Workflow
Tests for creating, updating, and retrieving block-type problems with:
- starter_blocks_xml
- solution_blocks_xml
- lesson_materials
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEACHER_EMAIL = "astapp@spanola.net"
TEACHER_PASSWORD = "AlisaFaith$14"

# Sample Blockly XML for testing
SAMPLE_STARTER_XML = '''<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="turtle_forward" x="50" y="50">
    <value name="STEPS">
      <shadow type="math_number">
        <field name="NUM">50</field>
      </shadow>
    </value>
  </block>
</xml>'''

SAMPLE_SOLUTION_XML = '''<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="turtle_repeat" x="50" y="50">
    <value name="TIMES">
      <shadow type="math_number">
        <field name="NUM">4</field>
      </shadow>
    </value>
    <statement name="DO">
      <block type="turtle_forward">
        <value name="STEPS">
          <shadow type="math_number">
            <field name="NUM">100</field>
          </shadow>
        </value>
        <next>
          <block type="turtle_right">
            <value name="DEGREES">
              <shadow type="math_number">
                <field name="NUM">90</field>
              </shadow>
            </value>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>'''

SAMPLE_LESSON_MATERIALS = [
    {"type": "text", "content": "Welcome to block-based programming!", "title": "Introduction"},
    {"type": "video", "content": "https://example.com/video.mp4", "title": "Tutorial Video"},
    {"type": "image", "content": "https://example.com/diagram.png", "title": "Block Diagram"}
]


class TestBlockProblemWorkflow:
    """Test block problem creation, update, and retrieval"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for teacher"""
        response = requests.post(
            f"{BASE_URL}/api/auth/teacher-login",
            json={"email": TEACHER_EMAIL, "password": TEACHER_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
        return response.json().get("session_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def created_problem_id(self, auth_headers):
        """Create a test block problem and return its ID"""
        unique_id = str(uuid.uuid4())[:8]
        problem_data = {
            "title": f"TEST_Block_Problem_{unique_id}",
            "description": "Test block problem for automated testing",
            "starter_code": "",
            "solution_code": "",
            "expected_output": "",
            "category": "Test Category",
            "difficulty": "Easy",
            "unit": "Unit 1",
            "chapter": "Chapter 1",
            "lesson": "Lesson 1",
            "problem_type": "Independent Practice",
            "resources_link": "",
            "csta_standard": "1A-AP-08",
            "assignment_type": "block",
            "starter_blocks_xml": SAMPLE_STARTER_XML,
            "solution_blocks_xml": SAMPLE_SOLUTION_XML,
            "lesson_materials": SAMPLE_LESSON_MATERIALS
        }
        
        response = requests.post(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            json=problem_data
        )
        
        if response.status_code != 200:
            pytest.skip(f"Failed to create test problem: {response.status_code} - {response.text}")
        
        problem = response.json()
        yield problem["id"]
        
        # Cleanup: Delete the test problem
        requests.delete(f"{BASE_URL}/api/problems/{problem['id']}", headers=auth_headers)
    
    # ==================== POST /api/problems Tests ====================
    
    def test_create_block_problem_success(self, auth_headers):
        """Test creating a block problem with all new fields"""
        unique_id = str(uuid.uuid4())[:8]
        problem_data = {
            "title": f"TEST_Create_Block_{unique_id}",
            "description": "Test creating block problem",
            "starter_code": "",
            "solution_code": "",
            "expected_output": "",
            "category": "Block Programming",
            "difficulty": "Easy",
            "unit": "Unit 1",
            "chapter": "Chapter 1",
            "lesson": "Lesson 1",
            "problem_type": "Independent Practice",
            "resources_link": "",
            "csta_standard": "1A-AP-08",
            "assignment_type": "block",
            "starter_blocks_xml": SAMPLE_STARTER_XML,
            "solution_blocks_xml": SAMPLE_SOLUTION_XML,
            "lesson_materials": SAMPLE_LESSON_MATERIALS
        }
        
        response = requests.post(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            json=problem_data
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data["assignment_type"] == "block"
        assert data["starter_blocks_xml"] == SAMPLE_STARTER_XML
        assert data["solution_blocks_xml"] == SAMPLE_SOLUTION_XML
        assert data["lesson_materials"] == SAMPLE_LESSON_MATERIALS
        assert "id" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/problems/{data['id']}", headers=auth_headers)
        print(f"✅ Block problem created successfully with ID: {data['id']}")
    
    def test_create_block_problem_with_empty_starter_blocks(self, auth_headers):
        """Test creating block problem with empty starter blocks (valid)"""
        unique_id = str(uuid.uuid4())[:8]
        problem_data = {
            "title": f"TEST_Empty_Starter_{unique_id}",
            "description": "Test with empty starter blocks",
            "starter_code": "",
            "solution_code": "",
            "expected_output": "",
            "category": "Block Programming",
            "difficulty": "Easy",
            "csta_standard": "1A-AP-08",
            "assignment_type": "block",
            "starter_blocks_xml": "",  # Empty is valid
            "solution_blocks_xml": SAMPLE_SOLUTION_XML,
            "lesson_materials": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            json=problem_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["starter_blocks_xml"] == ""
        assert data["solution_blocks_xml"] == SAMPLE_SOLUTION_XML
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/problems/{data['id']}", headers=auth_headers)
        print("✅ Block problem with empty starter blocks created successfully")
    
    def test_create_block_problem_with_lesson_materials(self, auth_headers):
        """Test creating block problem with various lesson material types"""
        unique_id = str(uuid.uuid4())[:8]
        lesson_materials = [
            {"type": "text", "content": "Learn about loops!", "title": "Intro"},
            {"type": "video", "content": "https://youtube.com/watch?v=abc123", "title": "Video Tutorial"},
            {"type": "image", "content": "https://example.com/loop-diagram.png", "title": "Loop Diagram"},
            {"type": "link", "content": "https://docs.python.org/3/tutorial/", "title": "Python Docs"}
        ]
        
        problem_data = {
            "title": f"TEST_Lesson_Materials_{unique_id}",
            "description": "Test with lesson materials",
            "starter_code": "",
            "solution_code": "",
            "expected_output": "",
            "category": "Block Programming",
            "difficulty": "Medium",
            "csta_standard": "1A-AP-08",
            "assignment_type": "block",
            "starter_blocks_xml": SAMPLE_STARTER_XML,
            "solution_blocks_xml": SAMPLE_SOLUTION_XML,
            "lesson_materials": lesson_materials
        }
        
        response = requests.post(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            json=problem_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert len(data["lesson_materials"]) == 4
        assert data["lesson_materials"][0]["type"] == "text"
        assert data["lesson_materials"][1]["type"] == "video"
        assert data["lesson_materials"][2]["type"] == "image"
        assert data["lesson_materials"][3]["type"] == "link"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/problems/{data['id']}", headers=auth_headers)
        print("✅ Block problem with lesson materials created successfully")
    
    # ==================== GET /api/problems Tests ====================
    
    def test_get_block_problem_by_id(self, auth_headers, created_problem_id):
        """Test retrieving a block problem and verifying all fields"""
        response = requests.get(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            params={"assignment_type": "block"}
        )
        
        assert response.status_code == 200
        
        problems = response.json()
        # Find our test problem
        test_problem = next((p for p in problems if p["id"] == created_problem_id), None)
        
        assert test_problem is not None, f"Test problem {created_problem_id} not found"
        assert test_problem["assignment_type"] == "block"
        assert "starter_blocks_xml" in test_problem
        assert "solution_blocks_xml" in test_problem
        assert "lesson_materials" in test_problem
        
        print(f"✅ Block problem retrieved successfully with all fields")
    
    def test_filter_problems_by_block_type(self, auth_headers):
        """Test filtering problems by assignment_type=block"""
        response = requests.get(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            params={"assignment_type": "block"}
        )
        
        assert response.status_code == 200
        
        problems = response.json()
        # All returned problems should be block type
        for problem in problems:
            assert problem.get("assignment_type") == "block", f"Found non-block problem: {problem.get('title')}"
        
        print(f"✅ Filter by assignment_type=block works correctly. Found {len(problems)} block problems")
    
    # ==================== PUT /api/problems/{id} Tests ====================
    
    def test_update_block_problem_xml_fields(self, auth_headers, created_problem_id):
        """Test updating starter_blocks_xml and solution_blocks_xml"""
        updated_starter_xml = '''<xml xmlns="https://developers.google.com/blockly/xml">
          <block type="turtle_pendown" x="50" y="50"></block>
        </xml>'''
        
        updated_solution_xml = '''<xml xmlns="https://developers.google.com/blockly/xml">
          <block type="turtle_pendown" x="50" y="50">
            <next>
              <block type="turtle_forward">
                <value name="STEPS">
                  <shadow type="math_number">
                    <field name="NUM">200</field>
                  </shadow>
                </value>
              </block>
            </next>
          </block>
        </xml>'''
        
        update_data = {
            "title": f"TEST_Updated_Block_Problem",
            "description": "Updated block problem",
            "starter_code": "",
            "solution_code": "",
            "expected_output": "",
            "category": "Block Programming",
            "difficulty": "Medium",
            "csta_standard": "1A-AP-08",
            "assignment_type": "block",
            "starter_blocks_xml": updated_starter_xml,
            "solution_blocks_xml": updated_solution_xml,
            "lesson_materials": [{"type": "text", "content": "Updated content", "title": "Updated"}]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/problems/{created_problem_id}",
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["starter_blocks_xml"] == updated_starter_xml
        assert data["solution_blocks_xml"] == updated_solution_xml
        assert len(data["lesson_materials"]) == 1
        assert data["lesson_materials"][0]["content"] == "Updated content"
        
        print("✅ Block problem XML fields updated successfully")
    
    def test_update_block_problem_lesson_materials(self, auth_headers, created_problem_id):
        """Test updating lesson_materials array"""
        new_lesson_materials = [
            {"type": "text", "content": "New intro text", "title": "New Intro"},
            {"type": "video", "content": "https://newvideo.com/v1", "title": "New Video"}
        ]
        
        update_data = {
            "title": f"TEST_Updated_Lesson_Materials",
            "description": "Updated lesson materials",
            "starter_code": "",
            "solution_code": "",
            "expected_output": "",
            "category": "Block Programming",
            "difficulty": "Easy",
            "csta_standard": "1A-AP-08",
            "assignment_type": "block",
            "starter_blocks_xml": SAMPLE_STARTER_XML,
            "solution_blocks_xml": SAMPLE_SOLUTION_XML,
            "lesson_materials": new_lesson_materials
        }
        
        response = requests.put(
            f"{BASE_URL}/api/problems/{created_problem_id}",
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert len(data["lesson_materials"]) == 2
        assert data["lesson_materials"][0]["title"] == "New Intro"
        assert data["lesson_materials"][1]["type"] == "video"
        
        # Verify persistence with GET
        get_response = requests.get(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            params={"assignment_type": "block"}
        )
        
        problems = get_response.json()
        updated_problem = next((p for p in problems if p["id"] == created_problem_id), None)
        assert updated_problem is not None
        assert len(updated_problem["lesson_materials"]) == 2
        
        print("✅ Lesson materials updated and persisted successfully")
    
    # ==================== Validation Tests ====================
    
    def test_unauthorized_create_problem(self):
        """Test that unauthenticated requests are rejected"""
        problem_data = {
            "title": "Unauthorized Test",
            "description": "Should fail",
            "starter_code": "",
            "solution_code": "",
            "expected_output": "",
            "category": "Test",
            "difficulty": "Easy",
            "csta_standard": "1A-AP-08",
            "assignment_type": "block",
            "starter_blocks_xml": "",
            "solution_blocks_xml": SAMPLE_SOLUTION_XML,
            "lesson_materials": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/problems",
            json=problem_data
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Unauthorized request correctly rejected")
    
    def test_get_problems_requires_auth(self):
        """Test that GET /api/problems requires authentication"""
        response = requests.get(f"{BASE_URL}/api/problems")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ GET /api/problems correctly requires authentication")


class TestBlockProblemDataIntegrity:
    """Test data integrity for block problems"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/teacher-login",
            json={"email": TEACHER_EMAIL, "password": TEACHER_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        token = response.json().get("session_token")
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_xml_special_characters_preserved(self, auth_headers):
        """Test that XML with special characters is preserved correctly"""
        unique_id = str(uuid.uuid4())[:8]
        xml_with_special = '''<xml xmlns="https://developers.google.com/blockly/xml">
          <block type="turtle_say">
            <field name="TEXT">Hello &amp; Welcome!</field>
          </block>
        </xml>'''
        
        problem_data = {
            "title": f"TEST_Special_Chars_{unique_id}",
            "description": "Test with special characters in XML",
            "starter_code": "",
            "solution_code": "",
            "expected_output": "",
            "category": "Test",
            "difficulty": "Easy",
            "csta_standard": "1A-AP-08",
            "assignment_type": "block",
            "starter_blocks_xml": xml_with_special,
            "solution_blocks_xml": xml_with_special,
            "lesson_materials": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            json=problem_data
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "&amp;" in data["starter_blocks_xml"] or "&" in data["starter_blocks_xml"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/problems/{data['id']}", headers=auth_headers)
        print("✅ XML special characters preserved correctly")
    
    def test_large_xml_handling(self, auth_headers):
        """Test handling of larger XML blocks"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create a larger XML with multiple nested blocks
        large_xml = '''<xml xmlns="https://developers.google.com/blockly/xml">
          <block type="turtle_repeat" x="50" y="50">
            <value name="TIMES"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
            <statement name="DO">
              <block type="turtle_forward">
                <value name="STEPS"><shadow type="math_number"><field name="NUM">50</field></shadow></value>
                <next>
                  <block type="turtle_right">
                    <value name="DEGREES"><shadow type="math_number"><field name="NUM">36</field></shadow></value>
                    <next>
                      <block type="turtle_color">
                        <field name="COLOR">red</field>
                        <next>
                          <block type="turtle_pensize">
                            <value name="SIZE"><shadow type="math_number"><field name="NUM">3</field></shadow></value>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </statement>
          </block>
        </xml>'''
        
        problem_data = {
            "title": f"TEST_Large_XML_{unique_id}",
            "description": "Test with large XML",
            "starter_code": "",
            "solution_code": "",
            "expected_output": "",
            "category": "Test",
            "difficulty": "Hard",
            "csta_standard": "1A-AP-08",
            "assignment_type": "block",
            "starter_blocks_xml": "",
            "solution_blocks_xml": large_xml,
            "lesson_materials": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            json=problem_data
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "turtle_repeat" in data["solution_blocks_xml"]
        assert "turtle_forward" in data["solution_blocks_xml"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/problems/{data['id']}", headers=auth_headers)
        print("✅ Large XML handled correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
