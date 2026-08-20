"""Repeat the generation 3x to check LLM non-determinism on the blank-field bug."""
import json
import os
from pathlib import Path

import requests
from dotenv import dotenv_values

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
fx = json.loads(Path("/app/backend/tests/.lesson_plan_fixture.json").read_text())

LABELS = ["Learner Outcomes", "Standards", "Anticipatory Set", "Modeling",
          "Instructional Strategies", "Check for Understanding", "Guided Practice",
          "Independent Practice", "Closure", "Differentiation", "Assessment"]

tok = requests.post(f"{BASE_URL}/api/auth/teacher-login",
                    json={"email": "astapp@spanola.net", "password": "AlisaFaith$14"},
                    timeout=60).json()["session_token"]
h = {"Authorization": f"Bearer {tok}"}

combos = [c for c in fx["combos"] if c["chapter"]][:3]
for i, combo in enumerate(combos):
    body = {
        "template_id": fx["template_id"],
        "schedule": [{
            "day_label": f"TEST_Run{i}", "day_index": i,
            "unit": "Unit 2: Turtle Graphics",
            "chapter": combo["chapter"], "lesson": combo["lesson"],
            "span_days": 2, "day_within_span": 1 if i % 2 == 0 else 2,
            "assignment_type": "turtle",
        }],
        "header_fields": {"pacingIntro": "5", "pacingDirectInstruction": "15",
                          "pacingGuidedPractice": "15", "pacingIndependentPractice": "10",
                          "pacingClosure": "5", "standards": "", "objectives": ""},
        "ai_generate_standards": True, "ai_generate_objectives": True,
    }
    r = requests.post(f"{BASE_URL}/api/lesson-plans/generate-from-schedule", json=body,
                      headers=h, timeout=300)
    print(f"\n=== RUN {i} {combo['chapter']} / {combo['lesson']} -> HTTP {r.status_code}")
    if r.status_code != 200:
        print(r.text[:400]); continue
    s = r.json()["plans"][0].get("sections") or {}
    missing = [l for l in LABELS if not (s.get(l) or "").strip()]
    extra = [k for k in s if k not in LABELS]
    print("keys:", len(s), "| missing/blank:", missing, "| extra keys:", extra)
    for lbl in ("Learner Outcomes", "Standards"):
        print(f"  {lbl}: {repr((s.get(lbl) or '')[:180])}")
