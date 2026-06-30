"""Backend tests for the turtle curriculum bug fix.

Verifies:
- /api/curriculum/units returns the Turtle unit with the expected LIVE chapter names
- /api/curriculum/lesson-problems resolves for those exact chapter/lesson strings
"""
import os
import urllib.parse
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://block-draw.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "astapp@spanola.net"
ADMIN_PASSWORD = "AlisaFaith$14"

EXPECTED_CHAPTER_NAMES = {
    "Chapter 1: First Steps",
    "Chapter 2: Loops",
    "Chapter 3: Colors",
    "Chapter 4: Conditionals",
    "Chapter 5: Functions",
}

# Strings that must NOT appear (old hardcoded titles)
FORBIDDEN_SUBSTRINGS = [
    "Colors & Style",
    "First Steps with Turtle",
    "Loops - The Power of Repetition",
    "Conditionals - Making Decisions",
    "Functions - Reusable Code",
]


@pytest.fixture(scope="session")
def auth_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/teacher-login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    tok = r.json().get("session_token")
    assert tok, "No session_token in login response"
    return tok


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="session")
def units(auth_headers):
    r = requests.get(f"{BASE_URL}/api/curriculum/units", headers=auth_headers, timeout=20)
    assert r.status_code == 200, f"units endpoint failed: {r.status_code} {r.text[:200]}"
    return r.json()


@pytest.fixture(scope="session")
def turtle_unit(units):
    matches = [u for u in units if u.get("assignment_type") == "turtle"]
    assert matches, "No unit with assignment_type='turtle' found"
    return matches[0]


def test_turtle_unit_has_expected_chapters(turtle_unit):
    chapter_names = {c.get("name") for c in turtle_unit.get("chapters", [])}
    missing = EXPECTED_CHAPTER_NAMES - chapter_names
    assert not missing, f"Missing expected chapter names: {missing}. Got: {chapter_names}"


def test_turtle_unit_does_not_contain_old_hardcoded_titles(turtle_unit):
    chapter_names = {c.get("name") for c in turtle_unit.get("chapters", [])}
    for bad in FORBIDDEN_SUBSTRINGS:
        for cn in chapter_names:
            assert bad not in cn, f"DB chapter '{cn}' contains forbidden hardcoded fragment '{bad}'"


def test_turtle_chapters_have_lessons(turtle_unit):
    for ch in turtle_unit["chapters"]:
        if ch["name"] in EXPECTED_CHAPTER_NAMES:
            assert ch.get("lessons"), f"Chapter '{ch['name']}' has no lessons"
            for l in ch["lessons"]:
                assert l.get("name"), f"Lesson without name in {ch['name']}"


def test_lesson_problems_chapter3_colors_lesson1(auth_headers):
    chapter = "Chapter 3: Colors"
    lesson = "Lesson 1: Pen Color"
    r = requests.get(
        f"{BASE_URL}/api/curriculum/lesson-problems",
        params={"assignment_type": "turtle", "chapter": chapter, "lesson": lesson},
        headers=auth_headers,
        timeout=20,
    )
    assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
    data = r.json()
    # Endpoint returns an object with a 'problems' list
    assert isinstance(data, dict), f"Expected dict, got {type(data)}"
    problems = data.get("problems", [])
    assert len(problems) > 0, f"No problems returned for {chapter}/{lesson}: {data}"
    # Each problem should belong to that chapter/lesson
    for p in problems:
        assert p.get("chapter") == chapter
        assert p.get("lesson") == lesson


def test_lesson_problems_resolves_for_all_expected_chapter_lessons(auth_headers, turtle_unit):
    """For every expected chapter, the first lesson (excluding the trailing Quiz) must resolve to a non-empty problem set."""
    failures = []
    for ch in turtle_unit["chapters"]:
        if ch["name"] not in EXPECTED_CHAPTER_NAMES:
            continue
        # pick first non-quiz lesson
        lesson_names = [l["name"] for l in ch["lessons"]]
        non_quiz = [n for n in lesson_names if "Quiz" not in n]
        if not non_quiz:
            continue
        lesson = non_quiz[0]
        r = requests.get(
            f"{BASE_URL}/api/curriculum/lesson-problems",
            params={"assignment_type": "turtle", "chapter": ch["name"], "lesson": lesson},
            headers=auth_headers,
            timeout=20,
        )
        if r.status_code != 200:
            failures.append(f"{ch['name']}/{lesson}: HTTP {r.status_code}")
            continue
        data = r.json()
        problems = data.get("problems", []) if isinstance(data, dict) else []
        if not problems:
            failures.append(f"{ch['name']}/{lesson}: empty problems")
    assert not failures, f"Lesson resolution failures: {failures}"
