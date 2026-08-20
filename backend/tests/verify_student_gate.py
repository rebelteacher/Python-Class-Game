"""Insert a temp student session token to verify the teacher-only 403 gate, then clean up."""
import asyncio
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient

benv = dotenv_values("/app/backend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
fx = json.loads(Path("/app/backend/tests/.lesson_plan_fixture.json").read_text())


async def main():
    client = AsyncIOMotorClient(benv["MONGO_URL"])
    db = client[benv["DB_NAME"]]
    student = await db.users.find_one({"role": "student"})
    if not student:
        print("no student user in DB; skipping")
        return
    token = "TEST_student_" + str(uuid.uuid4())
    await db.sessions.insert_one({
        "session_token": token,
        "user_id": student["id"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
    })
    body = {
        "template_id": fx["template_id"],
        "schedule": [{"day_label": "TEST", "day_index": 0, "unit": "Unit 2: Turtle Graphics",
                      "chapter": "Chapter 3: Colors", "lesson": "Lesson 3: Rainbow Colors",
                      "span_days": 1, "day_within_span": 1, "assignment_type": "turtle"}],
        "header_fields": {}, "ai_generate_standards": True, "ai_generate_objectives": True,
    }
    r = requests.post(f"{BASE_URL}/api/lesson-plans/generate-from-schedule", json=body,
                      headers={"Authorization": f"Bearer {token}"}, timeout=120)
    print("student POST generate-from-schedule ->", r.status_code, r.text[:150])
    r2 = requests.get(f"{BASE_URL}/api/lesson-plans",
                      headers={"Authorization": f"Bearer {token}"}, timeout=60)
    print("student GET /api/lesson-plans ->", r2.status_code, r2.text[:150])
    await db.sessions.delete_one({"session_token": token})
    client.close()


asyncio.run(main())
