"""Cleanup TEST_ lesson plan fixtures."""
import asyncio
import json
from pathlib import Path

from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient

benv = dotenv_values("/app/backend/.env")
fx = json.loads(Path("/app/backend/tests/.lesson_plan_fixture.json").read_text())


async def main():
    client = AsyncIOMotorClient(benv["MONGO_URL"])
    db = client[benv["DB_NAME"]]
    r1 = await db.lesson_plans.delete_many({"$or": [
        {"template_id": fx["template_id"]},
        {"title": {"$regex": "^Week of TEST_"}},
    ]})
    r2 = await db.lesson_plan_templates.delete_many({"id": fx["template_id"]})
    r3 = await db.sessions.delete_many({"session_token": {"$regex": "^TEST_student_"}})
    print("deleted lesson_plans:", r1.deleted_count, "templates:", r2.deleted_count,
          "sessions:", r3.deleted_count)
    client.close()


asyncio.run(main())
