"""Backend tests for /api/curriculum/rename-chapter and /api/curriculum/chapter-audit.

Endpoints under test were added to fix a data-sync issue where the curriculum
lesson page and the problem library used different chapter spellings.

Strategy:
- Seed a synthetic chapter ``TEST_CHAPTER_FOR_RENAME`` (and a sibling
  ``TEST_CHAPTER_MERGE_TARGET``) into ``db.problems``, ``db.lesson_instructions``,
  ``db.curriculum_test_placements``, and reference them in a fake classroom's
  ``unlocked_lessons`` array.
- Exercise the rename + merge endpoint and verify all four collections are
  updated.
- Validation tests cover 400 (missing fields, identical names) and 403
  (non-admin teacher and student).
- All seeded artefacts are removed in teardown.
"""

import os
import uuid
import pytest
import requests
import bcrypt
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://block-draw.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "astapp@spanola.net"
ADMIN_PASSWORD = "AlisaFaith$14"

# Sentinel strings — kept distinctive so they cannot collide with real curriculum
TEST_ASSIGNMENT_TYPE = "turtle"
TEST_OLD_CHAPTER = "TEST_CHAPTER_FOR_RENAME"
TEST_NEW_CHAPTER = "TEST_CHAPTER_RENAMED"
TEST_MERGE_TARGET = "TEST_CHAPTER_MERGE_TARGET"
TEST_LESSON = "TEST Lesson One"


# -------------------- Mongo helpers --------------------

@pytest.fixture(scope="session")
def mongo_db():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")
    client = MongoClient(mongo_url)
    yield client[db_name]
    client.close()


def _seed_problem(db, chapter, suffix=""):
    pid = f"TEST_prob_{uuid.uuid4().hex[:8]}{suffix}"
    db.problems.insert_one({
        "id": pid,
        "assignment_type": TEST_ASSIGNMENT_TYPE,
        "chapter": chapter,
        "lesson": TEST_LESSON,
        "title": f"TEST Problem {suffix}",
        "description": "seeded for rename-chapter test",
        "problem_type": "Class Practice",
        "starter_code": "",
        "solution_code": "",
        "test_cases": [],
    })
    return pid


@pytest.fixture(scope="module")
def seed_data(mongo_db):
    db = mongo_db
    # Clean any stragglers from prior runs
    db.problems.delete_many({"chapter": {"$in": [TEST_OLD_CHAPTER, TEST_NEW_CHAPTER, TEST_MERGE_TARGET]}})
    db.lesson_instructions.delete_many({"chapter": {"$in": [TEST_OLD_CHAPTER, TEST_NEW_CHAPTER, TEST_MERGE_TARGET]}})
    db.curriculum_test_placements.delete_many({"chapter": {"$in": [TEST_OLD_CHAPTER, TEST_NEW_CHAPTER, TEST_MERGE_TARGET]}})

    # Seed 3 problems in the old chapter, 2 in the merge target
    p1 = _seed_problem(db, TEST_OLD_CHAPTER, "_a")
    p2 = _seed_problem(db, TEST_OLD_CHAPTER, "_b")
    p3 = _seed_problem(db, TEST_OLD_CHAPTER, "_c")
    p4 = _seed_problem(db, TEST_MERGE_TARGET, "_d")
    p5 = _seed_problem(db, TEST_MERGE_TARGET, "_e")

    # Seed lesson_instructions and curriculum_test_placements docs
    db.lesson_instructions.insert_one({
        "id": f"TEST_li_{uuid.uuid4().hex[:8]}",
        "assignment_type": TEST_ASSIGNMENT_TYPE,
        "chapter": TEST_OLD_CHAPTER,
        "lesson": TEST_LESSON,
        "instructions": "seeded",
    })
    db.curriculum_test_placements.insert_one({
        "id": f"TEST_ctp_{uuid.uuid4().hex[:8]}",
        "assignment_type": TEST_ASSIGNMENT_TYPE,
        "chapter": TEST_OLD_CHAPTER,
        "lesson": TEST_LESSON,
        "position": 1,
    })

    # Seed a classroom with unlocked_lessons referencing the old chapter
    classroom_id = f"TEST_cls_{uuid.uuid4().hex[:8]}"
    db.classrooms.insert_one({
        "id": classroom_id,
        "name": "TEST classroom",
        "unlocked_lessons": [
            f"{TEST_ASSIGNMENT_TYPE}|{TEST_OLD_CHAPTER}|{TEST_LESSON}",
            f"{TEST_ASSIGNMENT_TYPE}|OtherChapter|OtherLesson",
        ],
    })

    yield {"classroom_id": classroom_id, "problem_ids": [p1, p2, p3, p4, p5]}

    # Teardown - remove everything we created and anything still bearing our sentinel
    db.problems.delete_many({"chapter": {"$in": [TEST_OLD_CHAPTER, TEST_NEW_CHAPTER, TEST_MERGE_TARGET]}})
    db.lesson_instructions.delete_many({"chapter": {"$in": [TEST_OLD_CHAPTER, TEST_NEW_CHAPTER, TEST_MERGE_TARGET]}})
    db.curriculum_test_placements.delete_many({"chapter": {"$in": [TEST_OLD_CHAPTER, TEST_NEW_CHAPTER, TEST_MERGE_TARGET]}})
    db.classrooms.delete_one({"id": classroom_id})


# -------------------- Auth fixtures --------------------

@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/teacher-login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("is_admin") is True, "Account is not admin"
    return data["session_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def non_admin_teacher_session(mongo_db):
    """Create a temp non-admin teacher directly in DB, login via API to mint a session."""
    db = mongo_db
    email = f"TEST_nonadmin_{uuid.uuid4().hex[:6]}@example.com"
    password = "TempPassw0rd!"
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user_id = str(uuid.uuid4())
    db.users.insert_one({
        "id": user_id,
        "email": email,
        "name": "TEST Non Admin Teacher",
        "role": "teacher",
        "password": hashed,
        "is_admin": False,
    })
    r = requests.post(f"{API}/auth/teacher-login", json={"email": email, "password": password})
    token = None
    if r.status_code == 200:
        token = r.json().get("session_token")
    yield {"token": token, "user_id": user_id}
    db.users.delete_one({"id": user_id})
    db.sessions.delete_many({"user_id": user_id})


@pytest.fixture(scope="session")
def student_session(mongo_db):
    """Inject a student user + session directly into Mongo."""
    db = mongo_db
    user_id = str(uuid.uuid4())
    db.users.insert_one({
        "id": user_id,
        "email": f"TEST_student_{uuid.uuid4().hex[:6]}@example.com",
        "name": "TEST Student",
        "role": "student",
        "is_admin": False,
    })
    from datetime import datetime, timedelta, timezone
    token = str(uuid.uuid4())
    db.sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
        "created_at": datetime.now(timezone.utc),
    })
    yield {"token": token, "user_id": user_id}
    db.users.delete_one({"id": user_id})
    db.sessions.delete_many({"user_id": user_id})


# -------------------- chapter-audit tests --------------------

class TestChapterAudit:
    def test_audit_admin_basic(self, admin_headers, seed_data):
        r = requests.get(f"{API}/curriculum/chapter-audit", headers=admin_headers)
        assert r.status_code == 200, r.text
        rows = r.json()
        assert isinstance(rows, list)
        # Every row has the documented shape
        for row in rows[:5]:
            assert set(["assignment_type", "chapter", "problem_count", "lesson_count"]).issubset(row.keys())
        chapters = [r["chapter"] for r in rows if r["assignment_type"] == TEST_ASSIGNMENT_TYPE]
        assert TEST_OLD_CHAPTER in chapters
        assert TEST_MERGE_TARGET in chapters

    def test_audit_assignment_type_filter(self, admin_headers, seed_data):
        r = requests.get(f"{API}/curriculum/chapter-audit?assignment_type={TEST_ASSIGNMENT_TYPE}", headers=admin_headers)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) > 0
        assert all(row["assignment_type"] == TEST_ASSIGNMENT_TYPE for row in rows)

    def test_audit_non_admin_teacher_forbidden(self, non_admin_teacher_session):
        if not non_admin_teacher_session["token"]:
            pytest.skip("Could not obtain non-admin teacher session")
        h = {"Authorization": f"Bearer {non_admin_teacher_session['token']}"}
        r = requests.get(f"{API}/curriculum/chapter-audit", headers=h)
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    def test_audit_student_forbidden(self, student_session):
        h = {"Authorization": f"Bearer {student_session['token']}"}
        r = requests.get(f"{API}/curriculum/chapter-audit", headers=h)
        assert r.status_code == 403


# -------------------- rename-chapter validation tests --------------------

class TestRenameChapterValidation:
    def test_missing_fields(self, admin_headers):
        r = requests.post(f"{API}/curriculum/rename-chapter", headers=admin_headers,
                          json={"assignment_type": "turtle", "old_name": "X"})
        assert r.status_code == 400, r.text

    def test_identical_names(self, admin_headers):
        r = requests.post(f"{API}/curriculum/rename-chapter", headers=admin_headers,
                          json={"assignment_type": "turtle", "old_name": "Same", "new_name": "Same"})
        assert r.status_code == 400

    def test_non_admin_teacher_forbidden(self, non_admin_teacher_session):
        if not non_admin_teacher_session["token"]:
            pytest.skip("No non-admin teacher session")
        h = {"Authorization": f"Bearer {non_admin_teacher_session['token']}", "Content-Type": "application/json"}
        r = requests.post(f"{API}/curriculum/rename-chapter", headers=h,
                          json={"assignment_type": "turtle", "old_name": "A", "new_name": "B"})
        assert r.status_code == 403

    def test_student_forbidden(self, student_session):
        h = {"Authorization": f"Bearer {student_session['token']}", "Content-Type": "application/json"}
        r = requests.post(f"{API}/curriculum/rename-chapter", headers=h,
                          json={"assignment_type": "turtle", "old_name": "A", "new_name": "B"})
        assert r.status_code == 403


# -------------------- rename-chapter happy-path + merge --------------------

class TestRenameChapterFlow:
    def test_simple_rename(self, admin_headers, seed_data, mongo_db):
        # Sanity precondition: old chapter has 3 problems
        before = mongo_db.problems.count_documents({"assignment_type": TEST_ASSIGNMENT_TYPE, "chapter": TEST_OLD_CHAPTER})
        assert before == 3

        r = requests.post(f"{API}/curriculum/rename-chapter", headers=admin_headers, json={
            "assignment_type": TEST_ASSIGNMENT_TYPE,
            "old_name": TEST_OLD_CHAPTER,
            "new_name": TEST_NEW_CHAPTER,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["merged"] is False
        assert body["problems_updated"] >= 3
        assert body["instructions_updated"] >= 1
        assert body["placements_updated"] >= 1
        assert body["classrooms_updated"] >= 1

        # Problems collection updated
        old_ct = mongo_db.problems.count_documents({"assignment_type": TEST_ASSIGNMENT_TYPE, "chapter": TEST_OLD_CHAPTER})
        new_ct = mongo_db.problems.count_documents({"assignment_type": TEST_ASSIGNMENT_TYPE, "chapter": TEST_NEW_CHAPTER})
        assert old_ct == 0
        assert new_ct == 3

        # Audit reflects the rename
        rr = requests.get(f"{API}/curriculum/chapter-audit?assignment_type={TEST_ASSIGNMENT_TYPE}", headers=admin_headers)
        chapters = [row["chapter"] for row in rr.json()]
        assert TEST_OLD_CHAPTER not in chapters
        assert TEST_NEW_CHAPTER in chapters

        # lesson_instructions + placements
        assert mongo_db.lesson_instructions.count_documents({"chapter": TEST_NEW_CHAPTER}) >= 1
        assert mongo_db.curriculum_test_placements.count_documents({"chapter": TEST_NEW_CHAPTER}) >= 1
        assert mongo_db.lesson_instructions.count_documents({"chapter": TEST_OLD_CHAPTER}) == 0

        # Classroom unlocked_lessons key updated
        cls = mongo_db.classrooms.find_one({"id": seed_data["classroom_id"]})
        keys = cls["unlocked_lessons"]
        new_key = f"{TEST_ASSIGNMENT_TYPE}|{TEST_NEW_CHAPTER}|{TEST_LESSON}"
        old_key = f"{TEST_ASSIGNMENT_TYPE}|{TEST_OLD_CHAPTER}|{TEST_LESSON}"
        assert new_key in keys
        assert old_key not in keys

        # lesson-problems should now resolve under the new chapter
        lp = requests.get(
            f"{API}/curriculum/lesson-problems",
            headers=admin_headers,
            params={"assignment_type": TEST_ASSIGNMENT_TYPE, "chapter": TEST_NEW_CHAPTER, "lesson": TEST_LESSON},
        )
        assert lp.status_code == 200, lp.text

        # ... and 404 under the old name
        lp_old = requests.get(
            f"{API}/curriculum/lesson-problems",
            headers=admin_headers,
            params={"assignment_type": TEST_ASSIGNMENT_TYPE, "chapter": TEST_OLD_CHAPTER, "lesson": TEST_LESSON},
        )
        assert lp_old.status_code == 404

    def test_merge_into_existing(self, admin_headers, mongo_db):
        # Now rename TEST_NEW_CHAPTER -> TEST_MERGE_TARGET; target already has 2 problems
        target_before = mongo_db.problems.count_documents({"chapter": TEST_MERGE_TARGET})
        source_before = mongo_db.problems.count_documents({"chapter": TEST_NEW_CHAPTER})
        assert target_before == 2
        assert source_before == 3

        r = requests.post(f"{API}/curriculum/rename-chapter", headers=admin_headers, json={
            "assignment_type": TEST_ASSIGNMENT_TYPE,
            "old_name": TEST_NEW_CHAPTER,
            "new_name": TEST_MERGE_TARGET,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["merged"] is True
        assert body["problems_updated"] == 3

        # Counts merged
        assert mongo_db.problems.count_documents({"chapter": TEST_NEW_CHAPTER}) == 0
        assert mongo_db.problems.count_documents({"chapter": TEST_MERGE_TARGET}) == 5

        # Audit no longer shows the source chapter
        rr = requests.get(f"{API}/curriculum/chapter-audit?assignment_type={TEST_ASSIGNMENT_TYPE}", headers=admin_headers)
        chapters = [row["chapter"] for row in rr.json()]
        assert TEST_NEW_CHAPTER not in chapters
        assert TEST_MERGE_TARGET in chapters
