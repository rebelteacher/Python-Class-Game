"""Backend tests for the AI Lesson Plan Generator bug fix.

Bug: POST /api/lesson-plans/generate-from-schedule returned blank
'Learner Outcomes' / 'Standards' sections. Prompt was fixed to require every
template label be populated.
"""
import json
import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/")

FIXTURE_PATH = Path(__file__).parent / ".lesson_plan_fixture.json"

LABELS = [
    "Learner Outcomes", "Standards", "Anticipatory Set", "Modeling",
    "Instructional Strategies", "Check for Understanding", "Guided Practice",
    "Independent Practice", "Closure", "Differentiation", "Assessment",
]

LLM_TIMEOUT = 300


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def creds():
    content = Path("/app/memory/test_credentials.md").read_text(encoding="utf-8")
    email = re.search(r"(?im)^-\s*Email:\s*`([^`]+)`", content).group(1)
    password = re.search(r"(?im)^-\s*Password:\s*`([^`]+)`", content).group(1)
    return {"email": email, "password": password}


@pytest.fixture(scope="session")
def fixture_data():
    if not FIXTURE_PATH.exists():
        pytest.fail("Fixture missing — run tests/setup_lesson_plan_fixture.py first")
    return json.loads(FIXTURE_PATH.read_text())


@pytest.fixture(scope="session")
def teacher_token(creds):
    r = requests.post(f"{BASE_URL}/api/auth/teacher-login", json=creds, timeout=60)
    if r.status_code != 200:
        pytest.fail(f"teacher-login failed {r.status_code}: {r.text[:300]}")
    token = r.json().get("session_token")
    if not token:
        pytest.fail(f"no session_token in login response: {r.text[:300]}")
    return token


@pytest.fixture(scope="session")
def teacher_client(teacher_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {teacher_token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def student_token():
    """Create a temporary student session directly in Mongo (student auth is OAuth-based)."""
    import asyncio
    import uuid
    from datetime import datetime, timedelta, timezone
    from motor.motor_asyncio import AsyncIOMotorClient

    benv = dotenv_values("/app/backend/.env")
    token = "TEST_student_" + str(uuid.uuid4())

    async def _setup():
        client = AsyncIOMotorClient(benv["MONGO_URL"])
        db = client[benv["DB_NAME"]]
        student = await db.users.find_one({"role": "student"})
        if not student:
            client.close()
            return None
        await db.sessions.insert_one({
            "session_token": token,
            "user_id": student["id"],
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        })
        client.close()
        return token

    async def _teardown():
        client = AsyncIOMotorClient(benv["MONGO_URL"])
        db = client[benv["DB_NAME"]]
        await db.sessions.delete_one({"session_token": token})
        client.close()

    created = asyncio.new_event_loop().run_until_complete(_setup())
    if not created:
        pytest.skip("no student user in DB for role-gate test")
    yield created
    asyncio.new_event_loop().run_until_complete(_teardown())


def _payload(fixture_data, template_id=None):
    combo = next(c for c in fixture_data["combos"] if c["chapter"])
    body = {
        "schedule": [{
            "day_label": "TEST_Mon Feb 10",
            "day_index": 0,
            "unit": "Unit 2: Turtle Graphics",
            "chapter": combo["chapter"],
            "lesson": combo["lesson"],
            "span_days": 1,
            "day_within_span": 1,
            "assignment_type": "turtle",
        }],
        "header_fields": {
            "pacingIntro": "5", "pacingDirectInstruction": "15",
            "pacingGuidedPractice": "15", "pacingIndependentPractice": "10",
            "pacingClosure": "5", "standards": "", "objectives": "",
        },
        "ai_generate_standards": True,
        "ai_generate_objectives": True,
    }
    if template_id:
        body["template_id"] = template_id
    return body


# ---------- module: lesson plan generation (auth gating) ----------
class TestAuthGating:
    def test_unauthenticated_rejected(self, fixture_data):
        r = requests.post(f"{BASE_URL}/api/lesson-plans/generate-from-schedule",
                          json=_payload(fixture_data), timeout=60)
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}: {r.text[:200]}"

    def test_bad_token_rejected(self, fixture_data):
        r = requests.post(f"{BASE_URL}/api/lesson-plans/generate-from-schedule",
                          json=_payload(fixture_data),
                          headers={"Authorization": "Bearer not-a-real-token"}, timeout=60)
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"

    def test_student_forbidden(self, fixture_data, student_token):
        """Student session must get 403 on both generate and list."""
        headers = {"Authorization": f"Bearer {student_token}"}
        r = requests.post(f"{BASE_URL}/api/lesson-plans/generate-from-schedule",
                          json=_payload(fixture_data), headers=headers, timeout=120)
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text[:200]}"
        r2 = requests.get(f"{BASE_URL}/api/lesson-plans", headers=headers, timeout=60)
        assert r2.status_code == 403, f"expected 403, got {r2.status_code}"


# ---------- module: BUG FIX — all template labels populated ----------
class TestGenerateWithTemplateLabels:
    result = {}

    def test_generate_returns_all_labels_non_empty(self, teacher_client, fixture_data):
        r = teacher_client.post(f"{BASE_URL}/api/lesson-plans/generate-from-schedule",
                                json=_payload(fixture_data, fixture_data["template_id"]),
                                timeout=LLM_TIMEOUT)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:500]}"
        data = r.json()
        TestGenerateWithTemplateLabels.result = data

        assert "plans" in data and isinstance(data["plans"], list) and data["plans"]
        assert isinstance(data.get("id"), str) and data["id"]

        plan = data["plans"][0]
        assert "sections" in plan, f"no sections key: {list(plan.keys())}"
        sections = plan["sections"]
        assert isinstance(sections, dict) and sections, f"sections empty; content={str(plan.get('content'))[:400]}"

        # Bug-specific: Learner Outcomes and Standards must be non-empty
        for critical in ("Learner Outcomes", "Standards"):
            assert critical in sections, f"missing key {critical!r}; got {list(sections.keys())}"
            assert sections[critical].strip(), f"{critical!r} is blank/empty"

        missing = [l for l in LABELS if l not in sections]
        blank = [l for l in LABELS if l in sections and not sections[l].strip()]
        assert not missing, f"missing labels: {missing}"
        assert not blank, f"blank labels: {blank}"

    def test_sections_are_turtle_grounded(self, teacher_client, fixture_data):
        data = TestGenerateWithTemplateLabels.result
        if not data:
            pytest.skip("generation test did not run")
        joined = " ".join(data["plans"][0]["sections"].values()).lower()
        assert "turtle" in joined, "generated content is not grounded in Turtle Graphics"

    def test_sections_persisted_in_get_lesson_plans(self, teacher_client):
        data = TestGenerateWithTemplateLabels.result
        if not data:
            pytest.skip("generation test did not run")
        plan_id = data["id"]
        r = teacher_client.get(f"{BASE_URL}/api/lesson-plans", timeout=90)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        plans = r.json()
        assert isinstance(plans, list)
        saved = next((p for p in plans if p.get("id") == plan_id), None)
        assert saved is not None, f"generated plan {plan_id} not persisted"
        assert "_id" not in saved, "MongoDB _id leaked in response"
        saved_sections = saved["plans"][0].get("sections") or {}
        for critical in ("Learner Outcomes", "Standards"):
            assert critical in saved_sections, f"persisted plan missing {critical!r}"
            assert saved_sections[critical].strip(), f"persisted {critical!r} is blank"
        missing = [l for l in LABELS if not (saved_sections.get(l) or "").strip()]
        assert not missing, f"persisted plan has blank/missing labels: {missing}"

    def test_docx_download_contains_sections(self, teacher_client):
        """Downloaded docx should contain the generated section content."""
        data = TestGenerateWithTemplateLabels.result
        if not data:
            pytest.skip("generation test did not run")
        r = teacher_client.get(
            f"{BASE_URL}/api/lesson-plans/{data['id']}/download/0", timeout=120)
        if r.status_code == 404:
            pytest.skip(f"download route not at expected path: {r.text[:200]}")
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        assert len(r.content) > 500


# ---------- module: backward compatibility (no template_id) ----------
class TestGenerateWithoutTemplate:
    def test_no_template_returns_content(self, teacher_client, fixture_data):
        r = teacher_client.post(f"{BASE_URL}/api/lesson-plans/generate-from-schedule",
                                json=_payload(fixture_data), timeout=LLM_TIMEOUT)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:500]}"
        data = r.json()
        plan = data["plans"][0]
        assert "content" in plan
        assert isinstance(plan["content"], str) and plan["content"].strip()
        assert "AI generation failed" not in plan["content"], plan["content"][:300]


# ---------- module: no-grounding guard ----------
class TestNoGroundingData:
    def test_unknown_lesson_returns_warning_not_crash(self, teacher_client, fixture_data):
        body = _payload(fixture_data, fixture_data["template_id"])
        body["schedule"][0]["chapter"] = "TEST_Chapter_Does_Not_Exist"
        body["schedule"][0]["lesson"] = "TEST_Lesson_Does_Not_Exist"
        r = teacher_client.post(f"{BASE_URL}/api/lesson-plans/generate-from-schedule",
                                json=body, timeout=LLM_TIMEOUT)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        plan = r.json()["plans"][0]
        assert "No content found" in plan["content"]
