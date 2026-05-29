"""
Test Assignment System API Tests
Endpoints under test:
  - GET    /api/admin-tests/library
  - POST   /api/test-assignments/bulk
  - GET    /api/classrooms/{classroom_id}/test-assignments
  - DELETE /api/test-assignments/{assignment_id}

Auth strategy: directly inject session_token rows into MongoDB 'sessions'
collection (Emergent Auth normally sets these via OAuth). This matches
backend/server.py:get_current_user.
"""
import os
import uuid
import asyncio
import pytest
import requests
from datetime import datetime, timezone, timedelta

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')
load_dotenv('/app/frontend/.env')

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

ADMIN_EMAIL = "astapp@spanola.net"


# -----------------------------
# Helpers - run async setup synchronously
# -----------------------------
def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


async def _seed():
    """Seed sessions for admin teacher, a non-admin teacher, a student
    (and a 2nd teacher who owns a classroom the admin does NOT own).
    Returns a dict with ids/tokens for tests."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # --- Admin teacher (already exists in DB) ---
    admin = await db.users.find_one({"email": ADMIN_EMAIL})
    assert admin is not None, "Admin user astapp@spanola.net must exist in DB"
    assert admin.get("is_admin") is True

    # --- Non-admin teacher (TEST_) ---
    non_admin_id = f"TEST_nonadm_{uuid.uuid4().hex[:8]}"
    non_admin = {
        "id": non_admin_id,
        "email": f"TEST_nonadmin_{non_admin_id}@example.com",
        "name": "TEST Non-Admin Teacher",
        "role": "teacher",
        "is_admin": False,
        "xp": 0, "coins": 0,
    }
    await db.users.insert_one(non_admin)

    # --- A classroom owned by non-admin (admin doesn't own) ---
    other_classroom_id = f"TEST_clsroom_{uuid.uuid4().hex[:8]}"
    await db.classrooms.insert_one({
        "id": other_classroom_id,
        "name": "TEST Other Teacher Classroom",
        "teacher_id": non_admin_id,
        "student_ids": [],
        "created_at": datetime.now(timezone.utc),
    })

    # --- Student belonging to admin's classroom ---
    # find admin classroom with at least 0 students; we'll add a fresh test student
    admin_classrooms = await db.classrooms.find(
        {"teacher_id": admin["id"]}
    ).to_list(50)
    # pick one classroom (first with any students-or-not); we'll add a test student
    target_classroom = admin_classrooms[0]

    student_id = f"TEST_student_{uuid.uuid4().hex[:8]}"
    student = {
        "id": student_id,
        "email": f"TEST_student_{student_id}@example.com",
        "name": "TEST Student",
        "role": "student",
        "is_admin": False,
        "xp": 0, "coins": 0,
    }
    await db.users.insert_one(student)
    # add student to that classroom
    await db.classrooms.update_one(
        {"id": target_classroom["id"]},
        {"$addToSet": {"student_ids": student_id}}
    )

    # --- MC test owned by non-admin (for negative library + 403 bulk) ---
    non_admin_test_id = f"TEST_nonadm_mc_{uuid.uuid4().hex[:8]}"
    await db.mc_tests.insert_one({
        "id": non_admin_test_id,
        "title": "TEST Non-Admin MC Test",
        "description": "should not appear in admin library",
        "teacher_id": non_admin_id,
        "chapter": "TEST", "lesson": "X",
        "question_pool_ids": [],
        "num_questions": 0,
        "time_limit_minutes": 30,
    })

    # --- Admin-owned MC test (small) for assignment tests ---
    admin_mc_test_id = f"TEST_adm_mc_{uuid.uuid4().hex[:8]}"
    await db.mc_tests.insert_one({
        "id": admin_mc_test_id,
        "title": "TEST Admin MC Test",
        "description": "admin library entry",
        "teacher_id": admin["id"],
        "chapter": "TEST_CH", "lesson": "TEST_L",
        "question_pool_ids": [],
        "num_questions": 0,
        "time_limit_minutes": 20,
    })

    # --- Sessions ---
    expires = datetime.now(timezone.utc) + timedelta(days=1)

    admin_session = f"TEST_admin_sess_{uuid.uuid4().hex}"
    await db.sessions.insert_one({
        "session_token": admin_session,
        "user_id": admin["id"],
        "email": admin["email"],
        "expires_at": expires,
        "created_at": datetime.now(timezone.utc),
    })

    nonadmin_session = f"TEST_nonadm_sess_{uuid.uuid4().hex}"
    await db.sessions.insert_one({
        "session_token": nonadmin_session,
        "user_id": non_admin_id,
        "email": non_admin["email"],
        "expires_at": expires,
        "created_at": datetime.now(timezone.utc),
    })

    student_session = f"TEST_stu_sess_{uuid.uuid4().hex}"
    await db.sessions.insert_one({
        "session_token": student_session,
        "user_id": student_id,
        "email": student["email"],
        "expires_at": expires,
        "created_at": datetime.now(timezone.utc),
    })

    return {
        "admin_id": admin["id"],
        "admin_token": admin_session,
        "nonadmin_id": non_admin_id,
        "nonadmin_token": nonadmin_session,
        "student_id": student_id,
        "student_token": student_session,
        "target_classroom_id": target_classroom["id"],
        "other_classroom_id": other_classroom_id,
        "admin_mc_test_id": admin_mc_test_id,
        "non_admin_test_id": non_admin_test_id,
    }


async def _cleanup(ctx):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    # delete sessions/users/classrooms/tests/assignments we created (TEST_ prefix)
    await db.sessions.delete_many({"session_token": {"$regex": "^TEST_"}})
    await db.users.delete_many({"id": {"$regex": "^TEST_"}})
    await db.classrooms.delete_many({"id": {"$regex": "^TEST_"}})
    await db.mc_tests.delete_many({"id": {"$regex": "^TEST_"}})
    await db.test_assignments.delete_many({"test_id": {"$regex": "^TEST_"}})
    # remove TEST_student from any classrooms
    if ctx and ctx.get("student_id"):
        await db.classrooms.update_many(
            {"student_ids": ctx["student_id"]},
            {"$pull": {"student_ids": ctx["student_id"]}}
        )


# Shared context across tests in the module
@pytest.fixture(scope="module")
def ctx():
    data = _run(_seed())
    yield data
    _run(_cleanup(data))


def _h(token):
    return {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}


# -----------------------------
# Tests - GET /api/admin-tests/library
# -----------------------------
class TestAdminLibrary:
    def test_library_returns_only_admin_tests(self, ctx):
        r = requests.get(f"{BASE_URL}/api/admin-tests/library", headers=_h(ctx["admin_token"]))
        assert r.status_code == 200, r.text
        data = r.json()
        assert "tests" in data and isinstance(data["tests"], list)
        ids = [t["id"] for t in data["tests"]]
        assert ctx["admin_mc_test_id"] in ids, "Admin's MC test must appear in library"
        assert ctx["non_admin_test_id"] not in ids, "Non-admin's test MUST NOT appear in library"

        # Validate required keys on at least one entry
        adm_entry = next(t for t in data["tests"] if t["id"] == ctx["admin_mc_test_id"])
        for k in ("id", "title", "test_type", "chapter", "lesson",
                  "num_questions", "pool_size", "time_limit_minutes"):
            assert k in adm_entry, f"Missing key {k} in library entry"
        assert adm_entry["test_type"] in ("mc", "coding")

    def test_library_has_both_types(self, ctx):
        r = requests.get(f"{BASE_URL}/api/admin-tests/library", headers=_h(ctx["admin_token"]))
        assert r.status_code == 200
        types = {t["test_type"] for t in r.json()["tests"]}
        # admin user already has both mc + coding tests per DB inspection
        assert "mc" in types
        assert "coding" in types

    def test_library_rejects_student(self, ctx):
        r = requests.get(f"{BASE_URL}/api/admin-tests/library", headers=_h(ctx["student_token"]))
        assert r.status_code == 403

    def test_library_rejects_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/admin-tests/library")
        assert r.status_code == 401


# -----------------------------
# Tests - POST /api/test-assignments/bulk
# -----------------------------
class TestBulkAssign:
    def test_bulk_assign_happy_path_creates_one_per_classroom(self, ctx):
        body = {
            "test_id": ctx["admin_mc_test_id"],
            "test_type": "mc",
            "schedules": [
                {"classroom_id": ctx["target_classroom_id"],
                 "available_from": None, "due_at": None},
            ],
            "allow_late": False,
            "late_penalty_percent": 0,
            "auto_release_results": True,
        }
        r = requests.post(f"{BASE_URL}/api/test-assignments/bulk",
                          headers=_h(ctx["admin_token"]), json=body)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["assigned"] == 1
        assert isinstance(data["assignment_ids"], list) and len(data["assignment_ids"]) == 1
        ctx["assignment_id"] = data["assignment_ids"][0]

    def test_bulk_assign_upsert_no_duplicate(self, ctx):
        """Reassigning same (test_id, classroom_id) should UPDATE, not create."""
        body = {
            "test_id": ctx["admin_mc_test_id"],
            "test_type": "mc",
            "schedules": [
                {"classroom_id": ctx["target_classroom_id"],
                 "available_from": None, "due_at": None}
            ],
            "allow_late": True,
            "late_penalty_percent": 25,
            "auto_release_results": False,
        }
        r = requests.post(f"{BASE_URL}/api/test-assignments/bulk",
                          headers=_h(ctx["admin_token"]), json=body)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["assigned"] == 1
        # ID should match prior assignment id (upsert)
        assert data["assignment_ids"][0] == ctx.get("assignment_id"), \
            "Upsert should return same assignment id"

        # Verify changes were persisted via GET
        r2 = requests.get(
            f"{BASE_URL}/api/classrooms/{ctx['target_classroom_id']}/test-assignments",
            headers=_h(ctx["admin_token"]))
        assert r2.status_code == 200
        match = [a for a in r2.json()["assignments"]
                 if a["assignment_id"] == ctx["assignment_id"]]
        assert len(match) == 1
        assert match[0]["allow_late"] is True
        assert match[0]["late_penalty_percent"] == 25
        assert match[0]["auto_release_results"] is False

    def test_bulk_assign_rejects_non_admin_test(self, ctx):
        body = {
            "test_id": ctx["non_admin_test_id"],
            "test_type": "mc",
            "schedules": [
                {"classroom_id": ctx["target_classroom_id"]}
            ],
        }
        r = requests.post(f"{BASE_URL}/api/test-assignments/bulk",
                          headers=_h(ctx["admin_token"]), json=body)
        assert r.status_code == 403, r.text

    def test_bulk_assign_missing_schedules_400(self, ctx):
        body = {
            "test_id": ctx["admin_mc_test_id"],
            "test_type": "mc",
            "schedules": [],
        }
        r = requests.post(f"{BASE_URL}/api/test-assignments/bulk",
                          headers=_h(ctx["admin_token"]), json=body)
        assert r.status_code == 400, r.text

    def test_bulk_assign_invalid_test_type_400(self, ctx):
        body = {
            "test_id": ctx["admin_mc_test_id"],
            "test_type": "essay",
            "schedules": [{"classroom_id": ctx["target_classroom_id"]}],
        }
        r = requests.post(f"{BASE_URL}/api/test-assignments/bulk",
                          headers=_h(ctx["admin_token"]), json=body)
        assert r.status_code == 400

    def test_bulk_assign_test_not_found_404(self, ctx):
        body = {
            "test_id": "does-not-exist-xyz",
            "test_type": "mc",
            "schedules": [{"classroom_id": ctx["target_classroom_id"]}],
        }
        r = requests.post(f"{BASE_URL}/api/test-assignments/bulk",
                          headers=_h(ctx["admin_token"]), json=body)
        assert r.status_code == 404

    def test_bulk_assign_not_owned_classroom_403(self, ctx):
        """Admin tries to assign to a classroom owned by non-admin -> 403."""
        body = {
            "test_id": ctx["admin_mc_test_id"],
            "test_type": "mc",
            "schedules": [{"classroom_id": ctx["other_classroom_id"]}],
        }
        r = requests.post(f"{BASE_URL}/api/test-assignments/bulk",
                          headers=_h(ctx["admin_token"]), json=body)
        assert r.status_code == 403

    def test_bulk_assign_rejects_student(self, ctx):
        body = {
            "test_id": ctx["admin_mc_test_id"],
            "test_type": "mc",
            "schedules": [{"classroom_id": ctx["target_classroom_id"]}],
        }
        r = requests.post(f"{BASE_URL}/api/test-assignments/bulk",
                          headers=_h(ctx["student_token"]), json=body)
        assert r.status_code == 403


# -----------------------------
# Tests - GET /api/classrooms/{id}/test-assignments visibility
# -----------------------------
class TestListAssignments:
    def test_teacher_sees_all(self, ctx):
        r = requests.get(
            f"{BASE_URL}/api/classrooms/{ctx['target_classroom_id']}/test-assignments",
            headers=_h(ctx["admin_token"]))
        assert r.status_code == 200, r.text
        data = r.json()
        ids = [a["assignment_id"] for a in data["assignments"]]
        assert ctx.get("assignment_id") in ids

    def test_student_sees_only_currently_available(self, ctx):
        """Set available_from to FUTURE -> student should NOT see it; teacher still does."""
        future_iso = (datetime.now(timezone.utc) + timedelta(days=7)).replace(tzinfo=None).isoformat()
        body = {
            "test_id": ctx["admin_mc_test_id"],
            "test_type": "mc",
            "schedules": [{
                "classroom_id": ctx["target_classroom_id"],
                "available_from": future_iso,
                "due_at": None,
            }],
            "allow_late": False,
            "late_penalty_percent": 0,
            "auto_release_results": True,
        }
        r = requests.post(f"{BASE_URL}/api/test-assignments/bulk",
                          headers=_h(ctx["admin_token"]), json=body)
        assert r.status_code == 200

        # Teacher view still shows it
        rt = requests.get(
            f"{BASE_URL}/api/classrooms/{ctx['target_classroom_id']}/test-assignments",
            headers=_h(ctx["admin_token"]))
        assert rt.status_code == 200
        t_ids = [a["assignment_id"] for a in rt.json()["assignments"]]
        assert ctx["assignment_id"] in t_ids

        # Student view should NOT include this scheduled-future assignment
        rs = requests.get(
            f"{BASE_URL}/api/classrooms/{ctx['target_classroom_id']}/test-assignments",
            headers=_h(ctx["student_token"]))
        assert rs.status_code == 200, rs.text
        s_ids = [a["assignment_id"] for a in rs.json()["assignments"]]
        assert ctx["assignment_id"] not in s_ids, \
            "Future-scheduled assignment must be hidden from student"

    def test_student_sees_when_available_from_is_past(self, ctx):
        """Set available_from to PAST -> student should now see it."""
        past_iso = (datetime.now(timezone.utc) - timedelta(days=1)).replace(tzinfo=None).isoformat()
        body = {
            "test_id": ctx["admin_mc_test_id"],
            "test_type": "mc",
            "schedules": [{
                "classroom_id": ctx["target_classroom_id"],
                "available_from": past_iso,
                "due_at": None,
            }],
        }
        r = requests.post(f"{BASE_URL}/api/test-assignments/bulk",
                          headers=_h(ctx["admin_token"]), json=body)
        assert r.status_code == 200

        rs = requests.get(
            f"{BASE_URL}/api/classrooms/{ctx['target_classroom_id']}/test-assignments",
            headers=_h(ctx["student_token"]))
        assert rs.status_code == 200
        s_ids = [a["assignment_id"] for a in rs.json()["assignments"]]
        assert ctx["assignment_id"] in s_ids

    def test_non_enrolled_student_forbidden(self, ctx):
        """Student NOT in classroom should get 403."""
        # use the 'other_classroom_id' which is non-admin teacher's classroom (no students added)
        r = requests.get(
            f"{BASE_URL}/api/classrooms/{ctx['other_classroom_id']}/test-assignments",
            headers=_h(ctx["student_token"]))
        assert r.status_code == 403

    def test_classroom_not_found(self, ctx):
        r = requests.get(
            f"{BASE_URL}/api/classrooms/does-not-exist/test-assignments",
            headers=_h(ctx["admin_token"]))
        assert r.status_code == 404


# -----------------------------
# Tests - DELETE /api/test-assignments/{id}
# -----------------------------
class TestDeleteAssignment:
    def test_delete_forbidden_for_other_teacher(self, ctx):
        # non-admin teacher tries to delete admin's assignment
        r = requests.delete(
            f"{BASE_URL}/api/test-assignments/{ctx['assignment_id']}",
            headers=_h(ctx["nonadmin_token"]))
        assert r.status_code == 403

    def test_delete_forbidden_for_student(self, ctx):
        r = requests.delete(
            f"{BASE_URL}/api/test-assignments/{ctx['assignment_id']}",
            headers=_h(ctx["student_token"]))
        assert r.status_code == 403

    def test_delete_not_found(self, ctx):
        r = requests.delete(
            f"{BASE_URL}/api/test-assignments/nonexistent-id-zzz",
            headers=_h(ctx["admin_token"]))
        assert r.status_code == 404

    def test_delete_success_by_owner(self, ctx):
        r = requests.delete(
            f"{BASE_URL}/api/test-assignments/{ctx['assignment_id']}",
            headers=_h(ctx["admin_token"]))
        assert r.status_code == 200, r.text
        assert r.json().get("deleted") is True

        # Verify removed
        rg = requests.get(
            f"{BASE_URL}/api/classrooms/{ctx['target_classroom_id']}/test-assignments",
            headers=_h(ctx["admin_token"]))
        assert rg.status_code == 200
        ids = [a["assignment_id"] for a in rg.json()["assignments"]]
        assert ctx["assignment_id"] not in ids
