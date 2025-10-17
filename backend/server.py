from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import string
import random
import subprocess
import tempfile
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ----- Helper Functions -----

RANK_THRESHOLDS = [
    {"name": "Rookie", "level": 1, "min_xp": 0, "icon": "🟤", "color": "#6B7280"},
    {"name": "Bronze Coder", "level": 2, "min_xp": 500, "icon": "🥉", "color": "#CD7F32"},
    {"name": "Silver Coder", "level": 3, "min_xp": 1000, "icon": "🥈", "color": "#C0C0C0"},
    {"name": "Gold Coder", "level": 4, "min_xp": 2000, "icon": "🥇", "color": "#FFD700"},
    {"name": "Platinum Coder", "level": 5, "min_xp": 3500, "icon": "💎", "color": "#E5E4E2"},
    {"name": "Diamond Coder", "level": 6, "min_xp": 5500, "icon": "💠", "color": "#00CED1"},
    {"name": "Elite Coder", "level": 7, "min_xp": 8000, "icon": "⭐", "color": "#9333EA"},
    {"name": "Master Coder", "level": 8, "min_xp": 12000, "icon": "🔥", "color": "#DC2626"},
    {"name": "Legend", "level": 9, "min_xp": 18000, "icon": "👑", "color": "#FBBF24"},
]

SHOP_ITEMS = {
    "themes": [
        {"id": "dark_pro", "name": "Dark Mode Pro", "price": 500, "color": "#1F2937"},
        {"id": "ocean_breeze", "name": "Ocean Breeze", "price": 700, "color": "#0EA5E9"},
        {"id": "sunset_vibes", "name": "Sunset Vibes", "price": 700, "color": "#F97316"},
        {"id": "matrix", "name": "Matrix", "price": 800, "color": "#10B981"},
        {"id": "championship_gold", "name": "Championship Gold", "price": 1000, "color": "#FFD700"},
    ],
    "badges": [
        {"id": "speed_demon", "name": "Speed Demon ⚡", "price": 300, "description": "Fast solver"},
        {"id": "perfect_streak", "name": "Perfect Streak 🌟", "price": 500, "description": "5 perfect scores"},
        {"id": "bug_hunter", "name": "Bug Hunter 🐛", "price": 200, "description": "Fixed your code"},
        {"id": "soccer_star", "name": "Soccer Star ⚽", "price": 400, "description": "Sport pride"},
        {"id": "basketball_pro", "name": "Basketball Pro 🏀", "price": 400, "description": "Sport pride"},
        {"id": "football_legend", "name": "Football Legend 🏈", "price": 400, "description": "Sport pride"},
        {"id": "baseball_champ", "name": "Baseball Champ ⚾", "price": 400, "description": "Sport pride"},
    ]
}

def calculate_rank(xp: int) -> dict:
    """Calculate rank based on XP"""
    for i in range(len(RANK_THRESHOLDS) - 1, -1, -1):
        if xp >= RANK_THRESHOLDS[i]["min_xp"]:
            return RANK_THRESHOLDS[i]
    return RANK_THRESHOLDS[0]

def calculate_xp_and_coins(score: float, is_first_try: bool, current_streak: int) -> dict:
    """Calculate XP and coins earned"""
    xp = 0
    coins = 0
    
    if score >= 70:  # Passing
        xp = 100
        coins = 50
        
        if score == 100:  # Perfect score
            xp = 200
            coins = 100
        
        if is_first_try:  # First try bonus
            xp += 50
            coins += 25
        
        if current_streak >= 3:  # Streak bonus
            xp += 25
            coins += 10
    
    return {"xp": xp, "coins": coins}

def generate_class_code():
    """Generate a unique 6-character class code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

async def get_current_user(request: Request):
    """Get current user from session token in cookies or Authorization header"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")
    
    # Handle timezone-aware/naive datetime comparison
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
    elif expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"id": session["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# ----- Pydantic Models -----

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
    role: str  # "teacher" or "student"
    xp: int = 0
    coins: int = 0
    rank: str = "Rookie"
    rank_level: int = 1
    problems_solved: int = 0
    perfect_scores: int = 0
    current_streak: int = 0
    best_streak: int = 0
    owned_themes: List[str] = Field(default_factory=lambda: ["default"])
    owned_badges: List[str] = Field(default_factory=list)
    active_theme: str = "default"
    active_badges: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionDataRequest(BaseModel):
    session_id: str

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str]
    session_token: str
    role: str

class Classroom(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    teacher_id: str
    name: str
    class_code: str
    students: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClassroomCreate(BaseModel):
    name: str

class ClassroomJoin(BaseModel):
    class_code: str

class TestCase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    input_data: str
    expected_output: str
    description: str

class Assignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    classroom_id: str
    title: str
    description: str
    starter_code: str
    solution_code: str
    test_cases: List[TestCase]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AssignmentCreate(BaseModel):
    classroom_id: str
    title: str
    description: str
    starter_code: str
    solution_code: str
    test_cases: List[TestCase] = Field(default_factory=list)  # Optional - empty list if not provided

class Submission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assignment_id: str
    student_id: str
    code: str
    score: float
    feedback: str
    test_results: List[dict]
    attempt_number: int = 1
    lives_remaining: int = 3
    is_passing: bool = False
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubmissionCreate(BaseModel):
    assignment_id: str
    code: str

class CodeExecuteRequest(BaseModel):
    code: str
    test_input: str = ""

class CodeExecuteResponse(BaseModel):
    output: str
    error: Optional[str] = None
    success: bool

# ----- Auth Routes -----

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "CodeClass API"}

@api_router.post("/auth/session")
async def create_session(request: SessionDataRequest):
    """Exchange session_id for user data and session_token"""
    try:
        import requests
        response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": request.session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid session ID")
        
        data = response.json()
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": data["email"]})
        
        if existing_user:
            user_dict = existing_user
        else:
            # Create new user with default role as student
            user = User(
                id=str(uuid.uuid4()),
                email=data["email"],
                name=data["name"],
                picture=data.get("picture"),
                role="student"
            )
            user_dict = user.model_dump()
            user_dict["created_at"] = user_dict["created_at"].isoformat()
            await db.users.insert_one(user_dict)
        
        # Create session
        session_token = str(uuid.uuid4())
        session = UserSession(
            user_id=user_dict["id"],
            session_token=session_token,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        session_dict = session.model_dump()
        session_dict["expires_at"] = session_dict["expires_at"].isoformat()
        session_dict["created_at"] = session_dict["created_at"].isoformat()
        await db.user_sessions.insert_one(session_dict)
        
        return SessionDataResponse(
            id=user_dict["id"],
            email=user_dict["email"],
            name=user_dict["name"],
            picture=user_dict.get("picture"),
            session_token=session_token,
            role=user_dict["role"]
        )
    except Exception as e:
        logging.error(f"Session creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current user info"""
    user = await get_current_user(request)
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture"),
        "role": user["role"]
    }

@api_router.post("/auth/switch-role")
async def switch_role(request: Request):
    """Switch between teacher and student roles"""
    user = await get_current_user(request)
    new_role = "teacher" if user["role"] == "student" else "student"
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"role": new_role}}
    )
    
    return {"role": new_role}

@api_router.post("/auth/logout")
async def logout(request: Request):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    return {"success": True}

# ----- Classroom Routes -----

@api_router.post("/classrooms", response_model=Classroom)
async def create_classroom(classroom: ClassroomCreate, request: Request):
    """Create a new classroom (Teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create classrooms")
    
    # Generate unique class code
    class_code = generate_class_code()
    while await db.classrooms.find_one({"class_code": class_code}):
        class_code = generate_class_code()
    
    new_classroom = Classroom(
        teacher_id=user["id"],
        name=classroom.name,
        class_code=class_code
    )
    
    classroom_dict = new_classroom.model_dump()
    classroom_dict["created_at"] = classroom_dict["created_at"].isoformat()
    await db.classrooms.insert_one(classroom_dict)
    
    return new_classroom

@api_router.get("/classrooms")
async def get_classrooms(request: Request):
    """Get all classrooms for current user"""
    user = await get_current_user(request)
    
    if user["role"] == "teacher":
        classrooms = await db.classrooms.find(
            {"teacher_id": user["id"]},
            {"_id": 0}
        ).to_list(1000)
    else:
        classrooms = await db.classrooms.find(
            {"students": user["id"]},
            {"_id": 0}
        ).to_list(1000)
    
    return classrooms

@api_router.post("/classrooms/join")
async def join_classroom(join_data: ClassroomJoin, request: Request):
    """Join a classroom using class code (Student only)"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can join classrooms")
    
    classroom = await db.classrooms.find_one({"class_code": join_data.class_code})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    if user["id"] in classroom.get("students", []):
        raise HTTPException(status_code=400, detail="Already joined this classroom")
    
    await db.classrooms.update_one(
        {"id": classroom["id"]},
        {"$push": {"students": user["id"]}}
    )
    
    # Remove MongoDB ObjectId before returning
    classroom_clean = {k: v for k, v in classroom.items() if k != "_id"}
    return {"success": True, "classroom": classroom_clean}

@api_router.get("/classrooms/{classroom_id}")
async def get_classroom(classroom_id: str, request: Request):
    """Get classroom details"""
    user = await get_current_user(request)
    
    classroom = await db.classrooms.find_one({"id": classroom_id}, {"_id": 0})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    # Check access
    if user["role"] == "teacher" and classroom["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if user["role"] == "student" and user["id"] not in classroom.get("students", []):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get student details
    students = []
    for student_id in classroom.get("students", []):
        student = await db.users.find_one({"id": student_id}, {"_id": 0})
        if student:
            students.append({
                "id": student["id"],
                "name": student["name"],
                "email": student["email"]
            })
    
    classroom["student_details"] = students
    return classroom

# ----- Assignment Routes -----

@api_router.post("/assignments", response_model=Assignment)
async def create_assignment(assignment: AssignmentCreate, request: Request):
    """Create a new assignment (Teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create assignments")
    
    classroom = await db.classrooms.find_one({"id": assignment.classroom_id})
    if not classroom or classroom["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    new_assignment = Assignment(**assignment.model_dump())
    assignment_dict = new_assignment.model_dump()
    assignment_dict["created_at"] = assignment_dict["created_at"].isoformat()
    await db.assignments.insert_one(assignment_dict)
    
    return new_assignment

@api_router.get("/assignments/classroom/{classroom_id}")
async def get_assignments(classroom_id: str, request: Request):
    """Get all assignments for a classroom"""
    user = await get_current_user(request)
    
    classroom = await db.classrooms.find_one({"id": classroom_id})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    # Check access
    if user["role"] == "teacher" and classroom["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if user["role"] == "student" and user["id"] not in classroom.get("students", []):
        raise HTTPException(status_code=403, detail="Access denied")
    
    assignments = await db.assignments.find(
        {"classroom_id": classroom_id},
        {"_id": 0}
    ).to_list(1000)
    
    return assignments

@api_router.get("/assignments/{assignment_id}")
async def get_assignment(assignment_id: str, request: Request):
    """Get assignment details"""
    user = await get_current_user(request)
    
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    classroom = await db.classrooms.find_one({"id": assignment["classroom_id"]})
    
    # Check access
    if user["role"] == "teacher" and classroom["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if user["role"] == "student":
        if user["id"] not in classroom.get("students", []):
            raise HTTPException(status_code=403, detail="Access denied")
        # Hide solution code from students
        assignment["solution_code"] = "[Hidden]"
    
    return assignment

# ----- Code Execution -----

def run_python_code(code: str, test_input: str = "", timeout: int = 5) -> dict:
    """Execute Python code safely with test input"""
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        # Run code with input
        result = subprocess.run(
            ['python3', temp_file],
            input=test_input,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        # Clean up
        os.unlink(temp_file)
        
        if result.returncode != 0:
            return {
                "output": result.stdout,
                "error": result.stderr,
                "success": False
            }
        
        return {
            "output": result.stdout.strip(),
            "error": None,
            "success": True
        }
    except subprocess.TimeoutExpired:
        return {
            "output": "",
            "error": "Code execution timed out",
            "success": False
        }
    except Exception as e:
        return {
            "output": "",
            "error": str(e),
            "success": False
        }

@api_router.post("/code/execute", response_model=CodeExecuteResponse)
async def execute_code(execute_req: CodeExecuteRequest, request: Request):
    """Execute Python code"""
    await get_current_user(request)  # Ensure authenticated
    
    result = run_python_code(execute_req.code, execute_req.test_input)
    return CodeExecuteResponse(**result)

# ----- Submission Routes -----

@api_router.post("/submissions")
async def submit_assignment(submission: SubmissionCreate, request: Request):
    """Submit assignment and get AI evaluation"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can submit assignments")
    
    assignment = await db.assignments.find_one({"id": submission.assignment_id})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Check previous submissions and lives
    previous_submissions = await db.submissions.find(
        {"assignment_id": submission.assignment_id, "student_id": user["id"]},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(100)
    
    # Calculate current state
    if previous_submissions:
        last_submission = previous_submissions[0]
        lives_used = sum(1 for sub in previous_submissions if not sub.get("is_passing", False))
        lives_remaining = 3 - lives_used
        attempt_number = len(previous_submissions) + 1
        
        # Check if locked out
        if lives_remaining <= 0:
            raise HTTPException(
                status_code=403, 
                detail="You have used all 3 lives on this assignment. No more submissions allowed."
            )
    else:
        lives_remaining = 3
        attempt_number = 1
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Run test cases (if provided)
    test_results = []
    total_tests = len(assignment.get("test_cases", []))
    passed_tests = 0
    
    if total_tests > 0:
        # Traditional test case evaluation
        for test_case in assignment["test_cases"]:
            result = run_python_code(submission.code, test_case["input_data"])
            expected = test_case["expected_output"].strip()
            actual = result["output"].strip() if result["success"] else ""
            
            passed = result["success"] and actual == expected
            if passed:
                passed_tests += 1
            
            test_results.append({
                "test_id": test_case["id"],
                "description": test_case["description"],
                "passed": passed,
                "expected": expected,
                "actual": actual,
                "error": result.get("error")
            })
        
        base_score = (passed_tests / total_tests) * 100
    else:
        # No test cases - compare outputs directly
        solution_result = run_python_code(assignment["solution_code"], "")
        student_result = run_python_code(submission.code, "")
        
        solution_output = solution_result["output"].strip() if solution_result["success"] else ""
        student_output = student_result["output"].strip() if student_result["success"] else ""
        
        # Basic comparison
        if student_result["success"] and student_output == solution_output:
            base_score = 100
            passed_tests = 1
            total_tests = 1
        else:
            base_score = 50 if student_result["success"] else 0
            passed_tests = 0
            total_tests = 1
        
        test_results.append({
            "test_id": "output_comparison",
            "description": "Compare output to solution",
            "passed": student_output == solution_output,
            "expected": solution_output,
            "actual": student_output,
            "error": student_result.get("error")
        })
    
    # AI Evaluation for partial credit and feedback
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    chat = LlmChat(
        api_key=llm_key,
        session_id=f"submission_{submission.assignment_id}_{user['id']}",
        system_message="You are a coding instructor evaluating student Python code submissions. Provide constructive feedback and award partial credit."
    ).with_model("openai", "gpt-4o")
    
    if total_tests > 0 and len(assignment.get("test_cases", [])) > 0:
        # Traditional test case prompt
        prompt = f"""
Evaluate this Python code submission:

Assignment: {assignment['title']}
Description: {assignment['description']}

Solution Code:
```python
{assignment['solution_code']}
```

Student Code:
```python
{submission.code}
```

Test Results:
- Passed: {passed_tests}/{total_tests}
- Base Score: {base_score}%

Test Details:
{json.dumps(test_results, indent=2)}

Provide:
1. A final score (0-100) considering:
   - Test results ({base_score}% baseline)
   - Code quality and style
   - Partial credit for attempts that failed tests
   - Logic and approach

2. Constructive feedback (2-3 sentences) on:
   - What worked well
   - Areas for improvement
   - Hints for failed test cases

Format your response as JSON:
{{
  "score": <number 0-100>,
  "feedback": "<your feedback here>"
}}
"""
    else:
        # Simple comparison prompt
        prompt = f"""
Evaluate this Python code submission:

Assignment: {assignment['title']}
Description: {assignment['description']}

Expected Solution:
```python
{assignment['solution_code']}
```

Student Code:
```python
{submission.code}
```

Expected Output: {test_results[0]['expected']}
Student Output: {test_results[0]['actual']}

Provide:
1. A final score (0-100) considering:
   - Does the output match? (baseline: {base_score}%)
   - Code quality and correctness
   - Partial credit if output is close or logic is correct
   - Syntax and Python best practices

2. Constructive feedback (2-3 sentences) on:
   - What worked well or what's correct
   - What needs improvement
   - Specific guidance to fix the code

Format your response as JSON:
{{
  "score": <number 0-100>,
  "feedback": "<your feedback here>"
}}
"""
    
    try:
        user_message = UserMessage(text=prompt)
        ai_response = await chat.send_message(user_message)
        
        # Parse AI response
        import re
        json_match = re.search(r'\{[^{}]*"score"[^{}]*\}', ai_response, re.DOTALL)
        if json_match:
            ai_eval = json.loads(json_match.group())
            final_score = float(ai_eval.get("score", base_score))
            feedback = ai_eval.get("feedback", "Good effort!")
        else:
            final_score = base_score
            feedback = ai_response[:500] if ai_response else "Good effort!"
    except Exception as e:
        logging.error(f"AI evaluation error: {str(e)}")
        final_score = base_score
        feedback = f"Test Results: {passed_tests}/{total_tests} passed. {assignment['title']} - Keep practicing!"
    
    # Determine if passing (70% threshold)
    is_passing = final_score >= 70
    
    # Calculate lives after this submission
    if not is_passing:
        lives_remaining -= 1
    
    # Save submission
    new_submission = Submission(
        assignment_id=submission.assignment_id,
        student_id=user["id"],
        code=submission.code,
        score=final_score,
        feedback=feedback,
        test_results=test_results,
        attempt_number=attempt_number,
        lives_remaining=lives_remaining,
        is_passing=is_passing
    )
    
    submission_dict = new_submission.model_dump()
    submission_dict["submitted_at"] = submission_dict["submitted_at"].isoformat()
    await db.submissions.insert_one(submission_dict)
    
    return new_submission

@api_router.get("/submissions/assignment/{assignment_id}")
async def get_submissions(assignment_id: str, request: Request):
    """Get all submissions for an assignment"""
    user = await get_current_user(request)
    
    if user["role"] == "teacher":
        # Teachers can see all submissions
        assignment = await db.assignments.find_one({"id": assignment_id})
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        classroom = await db.classrooms.find_one({"id": assignment["classroom_id"]})
        if classroom["teacher_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        submissions = await db.submissions.find(
            {"assignment_id": assignment_id},
            {"_id": 0}
        ).to_list(1000)
        
        # Add student names
        for sub in submissions:
            student = await db.users.find_one({"id": sub["student_id"]}, {"_id": 0})
            if student:
                sub["student_name"] = student["name"]
    else:
        # Students can only see their own submissions
        submissions = await db.submissions.find(
            {"assignment_id": assignment_id, "student_id": user["id"]},
            {"_id": 0}
        ).to_list(1000)
    
    return submissions

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()