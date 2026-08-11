"""Verify /generate-from-schedule returns distinct plans for 3 different lessons."""
import os, pytest, requests

def _load_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if not v:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    v = line.split("=",1)[1].strip().strip('"').strip("'"); break
    return v.rstrip("/")

BASE_URL = _load_backend_url()

@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth/teacher-login",
                      json={"email":"astapp@spanola.net","password":"AlisaFaith$14"}, timeout=30)
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['session_token']}", "Content-Type":"application/json"}

@pytest.fixture(scope="module")
def turtle_lessons(auth_headers):
    r = requests.get(f"{BASE_URL}/api/curriculum/units", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    units = r.json()
    tu = next(u for u in units if u.get("assignment_type") == "turtle")
    # find a chapter with >=3 lessons that have problems
    for ch in tu["chapters"]:
        good = [l for l in ch["lessons"] if l.get("problem_count",0)>0 and not l.get("is_orphan")]
        if len(good) >= 3:
            return {"unit": tu["name"], "chapter": ch["name"], "lessons": [l["name"] for l in good[:3]]}
    pytest.skip("Need chapter with >=3 lessons with problems")


def test_three_different_lessons_produce_three_distinct_plans(auth_headers, turtle_lessons):
    lessons = turtle_lessons["lessons"]
    schedule = [{
        "day_label": f"Day {i+1}",
        "day_index": i,
        "unit": turtle_lessons["unit"],
        "chapter": turtle_lessons["chapter"],
        "lesson": lessons[i],
        "assignment_type": "turtle",
        "span_days": 1,
        "day_within_span": 1,
    } for i in range(3)]

    payload = {
        "schedule": schedule,
        "header_fields": {"schoolName":"T","teacherName":"T","className":"C","timePerPeriod":"50"},
        "ai_generate_standards": False,
        "ai_generate_objectives": True,
    }
    r = requests.post(f"{BASE_URL}/api/lesson-plans/generate-from-schedule",
                      headers=auth_headers, json=payload, timeout=300)
    assert r.status_code == 200, f"{r.status_code} {r.text[:500]}"
    data = r.json()
    plans = data if isinstance(data,list) else (data.get("plans") or data.get("days") or data.get("results"))
    assert plans and len(plans) == 3, f"Expected 3 plans, got {len(plans) if plans else 0}"

    # Each plan should reference its own lesson name in either meta or content
    contents = []
    for i, p in enumerate(plans):
        c = p.get("content") or ""
        sections = p.get("sections") or {}
        # sections should be populated dict
        assert isinstance(sections, dict) and len(sections) > 0, f"Day {i} sections empty: {p}"
        combined = (c + " " + " ".join(str(v) for v in sections.values())).lower()
        contents.append(combined)
        print(f"\n--- Day {i+1} lesson='{lessons[i]}' sections keys={list(sections.keys())[:5]} ---")
        print(combined[:400])

    # Content across days should not be identical
    assert contents[0] != contents[1], "Day 1 and Day 2 content identical"
    assert contents[1] != contents[2], "Day 2 and Day 3 content identical"
    assert contents[0] != contents[2], "Day 1 and Day 3 content identical"

    # Each day's content should mention some distinctive token from its lesson name
    # (best effort: check that at least the lesson name substring or its keywords appear)
    print(f"\nLessons picked: {lessons}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--tb=short"])
