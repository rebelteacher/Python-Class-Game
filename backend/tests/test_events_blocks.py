"""
Test Events Blocks Implementation
Tests for the Events blocks in TurtleBlocklyEditor:
- event_start (when program starts)
- event_key_pressed (when key pressed)
- event_clicked (when turtle clicked)
- event_mouse_move (when mouse moves)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEACHER_EMAIL = "astapp@spanola.net"
TEACHER_PASSWORD = "AlisaFaith$14"

# Sample Blockly XML with Events blocks
SAMPLE_EVENT_START_XML = '''<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_start" x="50" y="50">
    <next>
      <block type="turtle_forward">
        <field name="STEPS">100</field>
      </block>
    </next>
  </block>
</xml>'''

SAMPLE_KEY_PRESSED_XML = '''<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_key_pressed" x="50" y="50">
    <field name="KEY">space</field>
    <next>
      <block type="turtle_forward">
        <field name="STEPS">50</field>
      </block>
    </next>
  </block>
</xml>'''

SAMPLE_ARROW_KEYS_XML = '''<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_key_pressed" x="50" y="50">
    <field name="KEY">up</field>
    <next>
      <block type="turtle_forward">
        <field name="STEPS">20</field>
      </block>
    </next>
  </block>
  <block type="event_key_pressed" x="50" y="150">
    <field name="KEY">down</field>
    <next>
      <block type="turtle_backward">
        <field name="STEPS">20</field>
      </block>
    </next>
  </block>
  <block type="event_key_pressed" x="50" y="250">
    <field name="KEY">left</field>
    <next>
      <block type="turtle_left">
        <field name="DEGREES">90</field>
      </block>
    </next>
  </block>
  <block type="event_key_pressed" x="50" y="350">
    <field name="KEY">right</field>
    <next>
      <block type="turtle_right">
        <field name="DEGREES">90</field>
      </block>
    </next>
  </block>
</xml>'''

SAMPLE_TURTLE_CLICKED_XML = '''<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_clicked" x="50" y="50">
    <next>
      <block type="turtle_color">
        <field name="COLOR">red</field>
      </block>
    </next>
  </block>
</xml>'''

SAMPLE_MOUSE_MOVE_XML = '''<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_mouse_move" x="50" y="50">
    <next>
      <block type="turtle_pendown"></block>
    </next>
  </block>
</xml>'''


class TestEventsBlocksAPI:
    """Test Events blocks via API - creating and retrieving problems with event blocks"""
    
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
    
    def test_create_problem_with_event_start_block(self, auth_headers):
        """Test creating a problem with 'when program starts' event block"""
        unique_id = str(uuid.uuid4())[:8]
        problem_data = {
            "title": f"TEST_Event_Start_{unique_id}",
            "description": "Test problem with event_start block",
            "starter_code": "",
            "solution_code": "",
            "expected_output": "",
            "category": "Events",
            "difficulty": "Easy",
            "unit": "Unit 1",
            "chapter": "Chapter 1",
            "lesson": "Lesson 3",
            "problem_type": "Independent Practice",
            "csta_standard": "1A-AP-08",
            "assignment_type": "block",
            "starter_blocks_xml": "",
            "solution_blocks_xml": SAMPLE_EVENT_START_XML,
            "lesson_materials": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            json=problem_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["assignment_type"] == "block"
        assert "event_start" in data["solution_blocks_xml"]
        assert "turtle_forward" in data["solution_blocks_xml"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/problems/{data['id']}", headers=auth_headers)
        print("✅ Problem with 'when program starts' block created successfully")
    
    def test_create_problem_with_key_pressed_block(self, auth_headers):
        """Test creating a problem with 'when key pressed' event block"""
        unique_id = str(uuid.uuid4())[:8]
        problem_data = {
            "title": f"TEST_Key_Pressed_{unique_id}",
            "description": "Test problem with event_key_pressed block",
            "starter_code": "",
            "solution_code": "",
            "expected_output": "",
            "category": "Events",
            "difficulty": "Easy",
            "unit": "Unit 1",
            "chapter": "Chapter 1",
            "lesson": "Lesson 3",
            "problem_type": "Independent Practice",
            "csta_standard": "1A-AP-08",
            "assignment_type": "block",
            "starter_blocks_xml": "",
            "solution_blocks_xml": SAMPLE_KEY_PRESSED_XML,
            "lesson_materials": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            json=problem_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "event_key_pressed" in data["solution_blocks_xml"]
        assert "space" in data["solution_blocks_xml"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/problems/{data['id']}", headers=auth_headers)
        print("✅ Problem with 'when key pressed' block created successfully")
    
    def test_create_problem_with_arrow_keys(self, auth_headers):
        """Test creating a problem with multiple arrow key event blocks"""
        unique_id = str(uuid.uuid4())[:8]
        problem_data = {
            "title": f"TEST_Arrow_Keys_{unique_id}",
            "description": "Test problem with arrow key events",
            "starter_code": "",
            "solution_code": "",
            "expected_output": "",
            "category": "Events",
            "difficulty": "Medium",
            "unit": "Unit 1",
            "chapter": "Chapter 1",
            "lesson": "Lesson 3",
            "problem_type": "Independent Practice",
            "csta_standard": "1A-AP-08",
            "assignment_type": "block",
            "starter_blocks_xml": "",
            "solution_blocks_xml": SAMPLE_ARROW_KEYS_XML,
            "lesson_materials": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            json=problem_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify all arrow keys are present
        assert "up" in data["solution_blocks_xml"]
        assert "down" in data["solution_blocks_xml"]
        assert "left" in data["solution_blocks_xml"]
        assert "right" in data["solution_blocks_xml"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/problems/{data['id']}", headers=auth_headers)
        print("✅ Problem with arrow key events created successfully")
    
    def test_create_problem_with_turtle_clicked_block(self, auth_headers):
        """Test creating a problem with 'when turtle clicked' event block"""
        unique_id = str(uuid.uuid4())[:8]
        problem_data = {
            "title": f"TEST_Turtle_Clicked_{unique_id}",
            "description": "Test problem with event_clicked block",
            "starter_code": "",
            "solution_code": "",
            "expected_output": "",
            "category": "Events",
            "difficulty": "Easy",
            "unit": "Unit 1",
            "chapter": "Chapter 1",
            "lesson": "Lesson 3",
            "problem_type": "Independent Practice",
            "csta_standard": "1A-AP-08",
            "assignment_type": "block",
            "starter_blocks_xml": "",
            "solution_blocks_xml": SAMPLE_TURTLE_CLICKED_XML,
            "lesson_materials": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            json=problem_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "event_clicked" in data["solution_blocks_xml"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/problems/{data['id']}", headers=auth_headers)
        print("✅ Problem with 'when turtle clicked' block created successfully")
    
    def test_create_problem_with_mouse_move_block(self, auth_headers):
        """Test creating a problem with 'when mouse moves' event block"""
        unique_id = str(uuid.uuid4())[:8]
        problem_data = {
            "title": f"TEST_Mouse_Move_{unique_id}",
            "description": "Test problem with event_mouse_move block",
            "starter_code": "",
            "solution_code": "",
            "expected_output": "",
            "category": "Events",
            "difficulty": "Easy",
            "unit": "Unit 1",
            "chapter": "Chapter 1",
            "lesson": "Lesson 3",
            "problem_type": "Independent Practice",
            "csta_standard": "1A-AP-08",
            "assignment_type": "block",
            "starter_blocks_xml": "",
            "solution_blocks_xml": SAMPLE_MOUSE_MOVE_XML,
            "lesson_materials": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            json=problem_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "event_mouse_move" in data["solution_blocks_xml"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/problems/{data['id']}", headers=auth_headers)
        print("✅ Problem with 'when mouse moves' block created successfully")
    
    def test_existing_keyboard_controls_problem(self, auth_headers):
        """Test that the existing 'Keyboard Controls' problem exists and has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            params={"assignment_type": "block"}
        )
        
        assert response.status_code == 200
        
        problems = response.json()
        keyboard_problem = next((p for p in problems if p["title"] == "Keyboard Controls"), None)
        
        assert keyboard_problem is not None, "Keyboard Controls problem not found"
        assert keyboard_problem["assignment_type"] == "block"
        assert keyboard_problem["lesson"] == "Lesson 3: Events & Triggers"
        
        print(f"✅ Found 'Keyboard Controls' problem in Lesson 3: Events & Triggers")
    
    def test_existing_click_to_move_problem(self, auth_headers):
        """Test that the existing 'Click to Move' problem exists"""
        response = requests.get(
            f"{BASE_URL}/api/problems",
            headers=auth_headers,
            params={"assignment_type": "block"}
        )
        
        assert response.status_code == 200
        
        problems = response.json()
        click_problem = next((p for p in problems if p["title"] == "Click to Move"), None)
        
        assert click_problem is not None, "Click to Move problem not found"
        assert click_problem["assignment_type"] == "block"
        assert click_problem["lesson"] == "Lesson 3: Events & Triggers"
        
        print(f"✅ Found 'Click to Move' problem in Lesson 3: Events & Triggers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
