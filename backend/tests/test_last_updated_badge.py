"""Backend tests for the admin-only 'last updated' badge feature.

Covers:
1. GET /api/curriculum/units returns last_updated (ISO8601) on each turtle chapter.
2. PUT /api/problems/{id} stamps updated_at.
3. PUT /api/problems/{id}/move stamps updated_at.
4. POST /api/curriculum/rename-chapter stamps updated_at on affected problems.
5. POST /api/curriculum/rename-lesson stamps updated_at on affected problems.

Uses a synthetic problem (TEST_LAST_UPDATED_PROBE_*) so production/seed turtle/block
data is NOT mutated. Test cleans up after itself.
"""
import os
import time
import uuid
import asyncio
import datetime as dt
import pytest
import requests
from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient

_FE = dotenv_values("/app/frontend/.env")
_BE = dotenv_values("/app/backend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _FE.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL") or _BE.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME") or _BE.get("DB_NAME")
assert BASE_URL, "REACT_APP_BACKEND_URL not configured"

ADMIN_EMAIL = "astapp@spanola.net"
ADMIN_PASSWORD = "AlisaFaith$14"

PROBE_PREFIX = "TEST_LAST_UPDATED_PROBE"
PROBE_AT = "block"  # use block so we never collide with turtle production data
PROBE_OLD_CHAPTER = f"{PROBE_PREFIX}_CH_OLD_{uuid.uuid4().hex[:6]}"
PROBE_NEW_CHAPTER = f"{PROBE_PREFIX}_CH_NEW_{uuid.uuid4().hex[:6]}"
PROBE_OLD_LESSON = f"{PROBE_PREFIX}_LS_OLD_{uuid.uuid4().hex[:6]}"
PROBE_NEW_LESSON = f"{PROBE_PREFIX}_LS_NEW_{uuid.uuid4().hex[:6]}"


def _parse_iso(s):
    """Parse an ISO 8601 string into a tz-aware datetime."""
    if s is None:
        return None
    if isinstance(s, dt.datetime):
        return s if s.tzinfo else s.replace(tzinfo=dt.timezone.utc)
    try:
        # Python's fromisoformat handles +00:00 but not 'Z' on <3.11
        s2 = s.replace("Z", "+00:00")
        d = dt.datetime.fromisoformat(s2)
        if d.tzinfo is None:
            d = d.replace(tzinfo=dt.timezone.utc)
        return d
    except Exception:
        return None


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/teacher-login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    token = r.json().get("session_token")
    assert token, "no session_token in admin login response"
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def mongo_db():
    client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@pytest.fixture(scope="module")
def probe_problem(mongo_db):
    """Insert a synthetic problem directly into Mongo for mutation tests
    (avoids tight coupling to the public POST /problems schema)."""
    pid = f"probe-{uuid.uuid4().hex[:12]}"
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    doc = {
        "id": pid,
        "title": f"{PROBE_PREFIX}_TITLE",
        "description": "synthetic probe problem",
        "category": "test",
        "assignment_type": PROBE_AT,
        "chapter": PROBE_OLD_CHAPTER,
        "lesson": PROBE_OLD_LESSON,
        "problem_type": "code",
        "difficulty": "easy",
        "starter_code": "",
        "solution_code": "",
        "test_cases": [],
        "hints": [],
        "order": 9999,
        "is_template": False,
        "created_at": now,
        "updated_at": now,
    }
    _run(mongo_db.problems.insert_one(doc))
    yield pid
    # Teardown: remove all probes regardless of state
    try:
        _run(mongo_db.problems.delete_many({"title": {"$regex": f"^{PROBE_PREFIX}"}}))
    except Exception:
        pass


# ---------- Tests ----------

class TestCurriculumUnitsLastUpdated:
    def test_turtle_chapters_have_iso_last_updated(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/curriculum/units", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        units = r.json()
        turtle = next((u for u in units if u.get("assignment_type") == "turtle"), None)
        assert turtle is not None, "no turtle unit in response"
        chapters = turtle.get("chapters") or []
        assert len(chapters) >= 5, f"expected >=5 turtle chapters, got {len(chapters)}"
        for ch in chapters[:5]:
            assert "last_updated" in ch, f"chapter {ch.get('name')} missing last_updated key"
            lu = ch["last_updated"]
            assert lu is not None, f"chapter {ch.get('name')} has null last_updated"
            assert isinstance(lu, str), f"chapter {ch.get('name')} last_updated not a string"
            parsed = _parse_iso(lu)
            assert parsed is not None, f"chapter {ch.get('name')} last_updated '{lu}' not ISO parseable"


class TestProblemPutStampsUpdatedAt:
    def test_put_problem_bumps_updated_at(self, admin_headers, probe_problem, mongo_db):
        pid = probe_problem
        # Sleep a moment so timestamp delta is observable
        time.sleep(1.1)
        before_doc = _run(mongo_db.problems.find_one({"id": pid}))
        before = _parse_iso(before_doc.get("updated_at"))

        update = {
            "title": f"{PROBE_PREFIX}_TITLE_EDITED",
            "description": "edited",
            "category": "test",
            "assignment_type": PROBE_AT,
            "chapter": PROBE_OLD_CHAPTER,
            "lesson": PROBE_OLD_LESSON,
            "problem_type": "code",
            "difficulty": "easy",
            "starter_code": "",
            "solution_code": "",
            "test_cases": [],
            "hints": [],
            "order": 9999,
            "is_template": False,
        }
        r = requests.put(f"{BASE_URL}/api/problems/{pid}", headers=admin_headers, json=update, timeout=20)
        assert r.status_code == 200, r.text

        after_doc = _run(mongo_db.problems.find_one({"id": pid}))
        after = _parse_iso(after_doc.get("updated_at"))
        assert after is not None, "updated_at missing after PUT"
        if before is not None:
            assert after > before, f"updated_at did not bump (before={before}, after={after})"
        delta = (dt.datetime.now(dt.timezone.utc) - after).total_seconds()
        assert delta < 60, f"updated_at is stale (delta={delta}s)"

    def test_move_problem_bumps_updated_at(self, admin_headers, probe_problem, mongo_db):
        pid = probe_problem
        time.sleep(1.1)
        before_doc = _run(mongo_db.problems.find_one({"id": pid}))
        before = _parse_iso(before_doc.get("updated_at"))

        # Move to a new lesson (keep same chapter so other tests still find it)
        move_body = {"chapter": PROBE_OLD_CHAPTER, "lesson": PROBE_OLD_LESSON, "order": 9999}
        r = requests.put(
            f"{BASE_URL}/api/problems/{pid}/move",
            headers=admin_headers,
            json=move_body,
            timeout=20,
        )
        assert r.status_code == 200, r.text

        after_doc = _run(mongo_db.problems.find_one({"id": pid}))
        after = _parse_iso(after_doc.get("updated_at"))
        assert after is not None, "updated_at missing after /move"
        if before is not None:
            assert after >= before, f"updated_at regressed (before={before}, after={after})"
        delta = (dt.datetime.now(dt.timezone.utc) - after).total_seconds()
        assert delta < 60, f"updated_at is stale (delta={delta}s)"


class TestRenameStampsUpdatedAt:
    def test_rename_lesson_stamps_updated_at(self, admin_headers, probe_problem, mongo_db):
        pid = probe_problem
        time.sleep(1.1)
        body = {
            "assignment_type": PROBE_AT,
            "chapter": PROBE_OLD_CHAPTER,
            "old_name": PROBE_OLD_LESSON,
            "new_name": PROBE_NEW_LESSON,
        }
        r = requests.post(f"{BASE_URL}/api/curriculum/rename-lesson", headers=admin_headers, json=body, timeout=20)
        assert r.status_code == 200, r.text

        doc = _run(mongo_db.problems.find_one({"id": pid}))
        assert doc["lesson"] == PROBE_NEW_LESSON, f"lesson not renamed: {doc.get('lesson')}"
        after = _parse_iso(doc.get("updated_at"))
        assert after is not None, "updated_at missing after rename-lesson"
        delta = (dt.datetime.now(dt.timezone.utc) - after).total_seconds()
        assert delta < 60, f"updated_at not bumped to now (delta={delta}s)"

    def test_rename_chapter_stamps_updated_at(self, admin_headers, probe_problem, mongo_db):
        pid = probe_problem
        time.sleep(1.1)
        body = {
            "assignment_type": PROBE_AT,
            "old_name": PROBE_OLD_CHAPTER,
            "new_name": PROBE_NEW_CHAPTER,
        }
        r = requests.post(f"{BASE_URL}/api/curriculum/rename-chapter", headers=admin_headers, json=body, timeout=20)
        assert r.status_code == 200, r.text

        doc = _run(mongo_db.problems.find_one({"id": pid}))
        assert doc["chapter"] == PROBE_NEW_CHAPTER, f"chapter not renamed: {doc.get('chapter')}"
        after = _parse_iso(doc.get("updated_at"))
        assert after is not None, "updated_at missing after rename-chapter"
        delta = (dt.datetime.now(dt.timezone.utc) - after).total_seconds()
        assert delta < 60, f"updated_at not bumped to now (delta={delta}s)"
