"""Tests for GET /api/reports/gradebook (curriculum gradebook grid) + regressions
for POST /api/reports/gradebook and POST /api/reports/missing."""
import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"


def _creds():
    content = Path("/app/memory/test_credentials.md").read_text(encoding="utf-8")
    emails = re.findall(r"Email:\s*`([^`]+)`", content)
    pwds = re.findall(r"Password:\s*`([^`]+)`", content)
    return emails, pwds


@pytest.fixture(scope="module")
def admin_token():
    emails, pwds = _creds()
    r = requests.post(f"{API}/auth/teacher-login", json={"email": emails[0], "password": pwds[0]}, timeout=60)
    if r.status_code != 200:
        pytest.fail(f"admin login failed {r.status_code}: {r.text[:300]}")
    return r.json()["session_token"]


@pytest.fixture(scope="module")
def other_teacher_token():
    emails, pwds = _creds()
    r = requests.post(f"{API}/auth/teacher-login", json={"email": emails[1], "password": pwds[1]}, timeout=60)
    if r.status_code != 200:
        pytest.skip(f"secondary teacher login failed {r.status_code}")
    return r.json()["session_token"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def classrooms(admin_token):
    r = requests.get(f"{API}/classrooms", headers=H(admin_token), timeout=60)
    assert r.status_code == 200, r.text[:300]
    return r.json()


@pytest.fixture(scope="module")
def populated_classroom(classrooms):
    for c in classrooms:
        if len(c.get("students") or []) > 0:
            return c
    pytest.skip("no classroom with students")


# ---------- GET /reports/gradebook happy path ----------
class TestGradebookGrid:
    def test_returns_200_with_columns_and_rows(self, admin_token, populated_classroom):
        r = requests.get(f"{API}/reports/gradebook", params={"classroom_id": populated_classroom["id"]},
                         headers=H(admin_token), timeout=120)
        assert r.status_code == 200, r.text[:500]
        data = r.json()
        assert set(["columns", "rows"]).issubset(data.keys())
        assert isinstance(data["columns"], list) and len(data["columns"]) > 0
        types = {c["type"] for c in data["columns"]}
        assert "lesson_avg" in types
        assert len(data["rows"]) == len(populated_classroom["students"])
        keys = [c["key"] for c in data["columns"]]
        assert len(keys) == len(set(keys)), "duplicate column keys"
        for row in data["rows"]:
            assert row["student_id"] and row["student_name"]
            assert set(row["cells"].keys()) == set(keys), "cells missing column keys"

    def test_column_ordering(self, admin_token, populated_classroom):
        data = requests.get(f"{API}/reports/gradebook", params={"classroom_id": populated_classroom["id"]},
                            headers=H(admin_token), timeout=120).json()
        cols = data["columns"]
        # lesson_quiz must directly follow the lesson_avg of the same chapter+lesson
        for i, c in enumerate(cols):
            if c["type"] == "lesson_quiz":
                prev = cols[i - 1]
                assert prev["type"] == "lesson_avg" and prev["chapter"] == c["chapter"] and prev["lesson"] == c["lesson"], \
                    f"lesson_quiz {c['key']} not preceded by its lesson_avg (prev={prev})"
        # chapter_test must be the last column of its chapter block
        for i, c in enumerate(cols):
            if c["type"] == "chapter_test":
                after = [x for x in cols[i + 1:] if x["chapter"] == c["chapter"]]
                assert after == [], f"columns for chapter {c['chapter']} appear after its chapter_test"
        # chapters appear as contiguous blocks
        seen_order = []
        for c in cols:
            if not seen_order or seen_order[-1] != c["chapter"]:
                seen_order.append(c["chapter"])
        assert len(seen_order) == len(set(seen_order)), "chapter blocks are not contiguous"

    def test_no_mongo_id_leak(self, admin_token, populated_classroom):
        txt = requests.get(f"{API}/reports/gradebook", params={"classroom_id": populated_classroom["id"]},
                           headers=H(admin_token), timeout=120).text
        assert '"_id"' not in txt

    def test_empty_classroom_returns_empty_rows(self, admin_token, classrooms):
        empty = next((c for c in classrooms if not (c.get("students") or [])), None)
        if not empty:
            pytest.skip("no empty classroom")
        r = requests.get(f"{API}/reports/gradebook", params={"classroom_id": empty["id"]},
                         headers=H(admin_token), timeout=120)
        assert r.status_code == 200, r.text[:300]
        assert r.json()["rows"] == []

    def test_unknown_classroom_404(self, admin_token):
        r = requests.get(f"{API}/reports/gradebook", params={"classroom_id": "does-not-exist-xyz"},
                         headers=H(admin_token), timeout=60)
        assert r.status_code == 404

    def test_missing_param_422(self, admin_token):
        r = requests.get(f"{API}/reports/gradebook", headers=H(admin_token), timeout=60)
        assert r.status_code == 422

    def test_unauthenticated_rejected(self, populated_classroom):
        r = requests.get(f"{API}/reports/gradebook", params={"classroom_id": populated_classroom["id"]}, timeout=60)
        assert r.status_code in (401, 403), r.status_code

    def test_other_teacher_gets_404(self, other_teacher_token, populated_classroom):
        r = requests.get(f"{API}/reports/gradebook", params={"classroom_id": populated_classroom["id"]},
                         headers=H(other_teacher_token), timeout=60)
        assert r.status_code == 404, f"expected 404, got {r.status_code}: {r.text[:200]}"


# ---------- Lesson Avg maths verification ----------
class TestLessonAvgMath:
    def test_lesson_avg_matches_manual_computation(self, admin_token, populated_classroom):
        data = requests.get(f"{API}/reports/gradebook", params={"classroom_id": populated_classroom["id"]},
                            headers=H(admin_token), timeout=120).json()
        # pick the first lesson_avg column that has a non-zero value for some student
        target = None
        for col in data["columns"]:
            if col["type"] != "lesson_avg":
                continue
            for row in data["rows"]:
                v = row["cells"].get(col["key"])
                if v:
                    target = (col, row)
                    break
            if target:
                break
        if not target:
            pytest.skip("no non-zero lesson_avg cell found to verify")
        col, row = target
        import asyncio
        import sys
        sys.path.insert(0, "/app/backend")
        from motor.motor_asyncio import AsyncIOMotorClient
        from dotenv import dotenv_values as dv
        env = dv("/app/backend/.env")

        async def compute():
            client = AsyncIOMotorClient(env["MONGO_URL"])
            db = client[env["DB_NAME"]]
            problems = await db.problems.find(
                {"chapter": col["chapter"], "lesson": col["lesson"]}, {"_id": 0, "id": 1}
            ).to_list(5000)
            pids = [p["id"] for p in problems]
            subs = await db.submissions.find(
                {"student_id": row["student_id"], "problem_id": {"$in": pids}},
                {"_id": 0, "problem_id": 1, "score": 1},
            ).to_list(50000)
            best = {}
            for s in subs:
                sc = s.get("score") or 0
                if s["problem_id"] not in best or sc > best[s["problem_id"]]:
                    best[s["problem_id"]] = sc
            client.close()
            if not pids:
                return None
            return round(sum(best.get(p, 0) for p in pids) / len(pids), 1)

        expected = asyncio.get_event_loop().run_until_complete(compute()) if False else asyncio.run(compute())
        actual = row["cells"][col["key"]]
        assert expected is not None
        assert abs(expected - actual) < 0.15, (
            f"lesson_avg mismatch for {col['key']} student {row['student_id']}: api={actual} manual={expected}")


# ---------- Regression: legacy POST endpoints ----------
class TestLegacyReports:
    def test_post_gradebook_requires_assignments(self, admin_token, populated_classroom):
        r = requests.post(f"{API}/reports/gradebook",
                          json={"classroom_ids": [populated_classroom["id"]]},
                          headers=H(admin_token), timeout=120)
        assert r.status_code == 400
        assert "assignment" in r.json()["detail"].lower()

    def test_post_gradebook_still_works(self, admin_token, populated_classroom):
        ar = requests.get(f"{API}/assignments/classroom/{populated_classroom['id']}",
                          headers=H(admin_token), timeout=60)
        assert ar.status_code == 200, ar.text[:300]
        assignments = ar.json()
        if not assignments:
            pytest.skip("no assignments in classroom")
        r = requests.post(f"{API}/reports/gradebook",
                          json={"classroom_ids": [populated_classroom["id"]],
                                "assignment_ids": [a["id"] for a in assignments[:3]]},
                          headers=H(admin_token), timeout=120)
        assert r.status_code == 200, r.text[:500]
        data = r.json()
        assert isinstance(data, dict)
        assert '"_id"' not in r.text

    def test_post_missing_still_works(self, admin_token, populated_classroom):
        r = requests.post(f"{API}/reports/missing",
                          json={"classroom_ids": [populated_classroom["id"]]},
                          headers=H(admin_token), timeout=120)
        assert r.status_code == 200, r.text[:500]
        assert '"_id"' not in r.text
