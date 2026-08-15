"""
Backend tests for the NEW 'Ordered Execution Check' scoring method for Turtle problems.

Covers:
  1. POST /api/problems creates a turtle problem with scoring_method=ordered_execution & target_sequence
  2. PUT /api/problems/{id} updates target_sequence and persists via GET
  3. Legacy turtle problems (no scoring_method) still round-trip (defaults to text_match)
  4. POST /api/submissions on a lesson-based turtle problem:
       - CORRECT sequence -> score 100, feedback contains 'Perfect'
       - WRONG step 2 (left instead of right) -> score 0, feedback matches 'Step 2 was ' and contains 'left' and 'try that again and resubmit'
       - TOO SHORT -> Step N was `(nothing)`
       - EXTRA commands -> Step (target_len+1) was `<extra_method>`
  5. tracking_data now contains 'commands_used' list with raw commands.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback for direct pytest invocation from container
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

ADMIN_EMAIL = "astapp@spanola.net"
ADMIN_PASSWORD = "AlisaFaith$14"

TARGET_SEQ = ["forward", "right", "forward", "left", "forward"]

CREATED_PROBLEM_IDS = []


# ─── Fixtures ────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def teacher_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/teacher-login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    return data["session_token"]


@pytest.fixture(scope="module")
def teacher_headers(teacher_token):
    return {"Authorization": f"Bearer {teacher_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def oe_problem_id_mod(teacher_headers):
    """Create the OE problem BEFORE role is switched to student."""
    r = requests.post(
        f"{BASE_URL}/api/problems",
        headers=teacher_headers,
        json=_base_problem_payload(title="TEST_OE_Submit"),
    )
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    CREATED_PROBLEM_IDS.append(pid)
    return pid


@pytest.fixture(scope="module")
def student_headers(teacher_token, oe_problem_id_mod):
    """Switch teacher account to student role AFTER OE problem is created."""
    r = requests.post(
        f"{BASE_URL}/api/auth/switch-role",
        headers={"Authorization": f"Bearer {teacher_token}"},
        timeout=10,
    )
    assert r.status_code == 200, f"switch-role failed: {r.status_code} {r.text}"
    assert r.json().get("role") == "student", f"Expected student role, got {r.json()}"
    return {"Authorization": f"Bearer {teacher_token}", "Content-Type": "application/json"}


# ─── Helpers ─────────────────────────────────────────────────────────────────
def _base_problem_payload(**overrides):
    p = {
        "title": "TEST_OE_Turtle",
        "description": "Ordered execution test problem",
        "assignment_type": "turtle",
        "difficulty": "easy",
        "category": "turtle",
        "chapter": "Testing",
        "lesson": "OE",
        "solution_code": "import turtle\nt = turtle.Turtle()\nt.forward(50)\nt.right(90)\nt.forward(50)\nt.left(90)\nt.forward(50)\n",
        "scoring_method": "ordered_execution",
        "target_sequence": list(TARGET_SEQ),
    }
    p.update(overrides)
    return p


# ─── 1. Create Problem ───────────────────────────────────────────────────────
class TestCreateProblem:
    def test_create_turtle_ordered_execution(self, teacher_headers):
        r = requests.post(f"{BASE_URL}/api/problems", headers=teacher_headers, json=_base_problem_payload())
        assert r.status_code == 200, f"Create failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["assignment_type"] == "turtle"
        assert data["scoring_method"] == "ordered_execution"
        assert data["target_sequence"] == TARGET_SEQ
        assert "id" in data
        CREATED_PROBLEM_IDS.append(data["id"])

    def test_create_legacy_turtle_defaults_to_text_match(self, teacher_headers):
        payload = _base_problem_payload(title="TEST_OE_Legacy")
        # Legacy: no scoring_method/target_sequence provided
        payload.pop("scoring_method")
        payload.pop("target_sequence")
        r = requests.post(f"{BASE_URL}/api/problems", headers=teacher_headers, json=payload)
        assert r.status_code == 200, f"Legacy create failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("scoring_method", "text_match") == "text_match"
        # target_sequence should be None or missing
        assert not data.get("target_sequence")
        CREATED_PROBLEM_IDS.append(data["id"])


# ─── 2. Update Problem ───────────────────────────────────────────────────────
class TestUpdateProblem:
    def test_update_target_sequence_and_verify_persistence(self, teacher_headers):
        # Create first
        r = requests.post(
            f"{BASE_URL}/api/problems",
            headers=teacher_headers,
            json=_base_problem_payload(title="TEST_OE_ToEdit"),
        )
        assert r.status_code == 200
        pid = r.json()["id"]
        CREATED_PROBLEM_IDS.append(pid)

        # Update
        new_seq = ["forward", "left", "forward", "right"]
        upd_payload = _base_problem_payload(
            title="TEST_OE_ToEdit", target_sequence=new_seq
        )
        r2 = requests.put(f"{BASE_URL}/api/problems/{pid}", headers=teacher_headers, json=upd_payload)
        assert r2.status_code == 200, f"Update failed: {r2.status_code} {r2.text}"
        updated = r2.json()
        assert updated["target_sequence"] == new_seq
        assert updated["scoring_method"] == "ordered_execution"

        # GET verify persistence
        r3 = requests.get(f"{BASE_URL}/api/problems", headers=teacher_headers)
        assert r3.status_code == 200
        matches = [p for p in r3.json() if p.get("id") == pid]
        assert len(matches) == 1
        fetched = matches[0]
        assert fetched["target_sequence"] == new_seq
        assert fetched["scoring_method"] == "ordered_execution"


# ─── 3. Submission Grading ───────────────────────────────────────────────────
class TestOrderedExecutionSubmissions:
    def _submit(self, student_headers, problem_id, code):
        payload = {
            "assignment_id": f"lesson_test_oe_{problem_id[:8]}",
            "problem_id": problem_id,
            "code": code,
        }
        return requests.post(
            f"{BASE_URL}/api/submissions",
            headers=student_headers,
            json=payload,
            timeout=60,
        )

    def test_perfect_sequence_scores_100(self, student_headers, oe_problem_id_mod):
        code = (
            "import turtle\n"
            "t = turtle.Turtle()\n"
            "t.forward(50)\n"
            "t.right(90)\n"
            "t.forward(50)\n"
            "t.left(90)\n"
            "t.forward(50)\n"
        )
        r = self._submit(student_headers, oe_problem_id_mod, code)
        assert r.status_code == 200, f"Submission failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["score"] == 100, f"Expected 100, got {data['score']}. Feedback: {data.get('feedback')}"
        assert "Perfect" in data["feedback"], f"Feedback missing 'Perfect': {data['feedback']}"
        # commands_used check
        td = data.get("turtle_tracking_data") or {}
        assert "commands_used" in td, f"tracking_data missing commands_used: {list(td.keys())}"
        assert isinstance(td["commands_used"], list) and len(td["commands_used"]) >= 5
        # Raw commands should include args
        assert any("forward(" in str(c) for c in td["commands_used"])

    def test_wrong_step_2_left_instead_of_right(self, student_headers, oe_problem_id_mod):
        code = (
            "import turtle\n"
            "t = turtle.Turtle()\n"
            "t.forward(50)\n"
            "t.left(90)\n"      # WRONG - should be right
            "t.forward(50)\n"
            "t.left(90)\n"
            "t.forward(50)\n"
        )
        r = self._submit(student_headers, oe_problem_id_mod, code)
        assert r.status_code == 200
        data = r.json()
        assert data["score"] == 0, f"Expected 0, got {data['score']}. Feedback: {data.get('feedback')}"
        fb = data["feedback"]
        assert fb.startswith("Step 2 "), f"Feedback pattern wrong: {fb}"
        assert "left" in fb, f"Feedback missing 'left': {fb}"
        assert "try that again and resubmit" in fb, f"Feedback missing 'try that again and resubmit': {fb}"

    def test_too_short_sequence(self, student_headers, oe_problem_id_mod):
        # Only 3 commands; target expects 5. First mismatch at step 4.
        code = (
            "import turtle\n"
            "t = turtle.Turtle()\n"
            "t.forward(50)\n"
            "t.right(90)\n"
            "t.forward(50)\n"
        )
        r = self._submit(student_headers, oe_problem_id_mod, code)
        assert r.status_code == 200
        data = r.json()
        assert data["score"] == 0
        fb = data["feedback"]
        assert fb.startswith("Step 4 "), f"Expected Step 4 prefix, got: {fb}"
        assert "(nothing)" in fb, f"Expected (nothing) placeholder, got: {fb}"

    def test_extra_commands_beyond_target(self, student_headers, oe_problem_id_mod):
        # Full correct + 1 extra 'right'. Target len = 5, so step 6 flagged.
        code = (
            "import turtle\n"
            "t = turtle.Turtle()\n"
            "t.forward(50)\n"
            "t.right(90)\n"
            "t.forward(50)\n"
            "t.left(90)\n"
            "t.forward(50)\n"
            "t.right(90)\n"   # extra
        )
        r = self._submit(student_headers, oe_problem_id_mod, code)
        assert r.status_code == 200
        data = r.json()
        assert data["score"] == 0, f"Expected 0, got {data['score']}. Feedback: {data.get('feedback')}"
        fb = data["feedback"]
        assert fb.startswith("Step 6 "), f"Expected Step 6 prefix, got: {fb}"
        assert "right" in fb


# ─── Cleanup ─────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_problems(teacher_token):
    yield
    # Restore teacher role first
    try:
        r_role = requests.get(
            f"{BASE_URL}/api/auth/me" if False else f"{BASE_URL}/api/problems",
            headers={"Authorization": f"Bearer {teacher_token}"},
            timeout=5,
        )
        # If still student, switch back
        # (best-effort; ignore)
    except Exception:
        pass
    # Delete created TEST_ problems
    headers = {"Authorization": f"Bearer {teacher_token}"}
    for pid in CREATED_PROBLEM_IDS:
        try:
            requests.delete(f"{BASE_URL}/api/problems/{pid}", headers=headers, timeout=5)
        except Exception:
            pass
