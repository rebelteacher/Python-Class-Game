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
import bcrypt
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
        {"id": "champion_team", "name": "Champion Team 🏆", "price": 0, "description": "Battle winner (Cannot be purchased)"},
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
    
    session = await db.sessions.find_one({"session_token": session_token})
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
    password: Optional[str] = None  # Hashed password for teacher accounts (optional, for non-OAuth teachers)
    is_admin: bool = False  # Admin flag for platform management
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


# Teacher authentication models
class TeacherLoginRequest(BaseModel):
    email: str
    password: str

class TeacherSignupRequest(BaseModel):
    name: str
    email: str
    password: str
    invite_code: str

class InviteCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str  # The actual invite code string
    created_by_admin_id: str
    used_by_teacher_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    used_at: Optional[datetime] = None

class Classroom(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    teacher_id: str
    name: str
    class_code: str
    students: List[str] = Field(default_factory=list)
    is_archived: bool = False
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

# Problem model (formerly LibraryAssignment) - individual coding problems in library
class Problem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    starter_code: str
    solution_code: str
    expected_output: str = ""
    category: str  # "Lesson 2.2 - String Concatenation"
    difficulty: str  # "Easy", "Medium", "Hard"
    chapter: str = ""  # "Chapter 1", "Chapter 2", etc. for organization
    lesson: str = ""  # "Lesson 1", "Lesson 2", etc. for sub-organization
    csta_standard: str  # CSTA K-12 CS Standards
    problem_type: str = "Independent Practice"  # "Class Practice", "Paired Programming", "Independent Practice", "Debugging"
    resources_link: str = ""  # Link to Google Drive, lesson materials, etc.
    creator_id: str
    creator_name: str
    is_approved: bool = True
    times_imported: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProblemCreate(BaseModel):
    title: str
    description: str
    starter_code: str = ""
    solution_code: str
    expected_output: str = ""
    category: str
    difficulty: str
    chapter: str = ""
    lesson: str = ""
    problem_type: str = "Independent Practice"
    resources_link: str = ""
    csta_standard: str = ""

# Assignment model - bundle of multiple problems with unified scheduling
class Assignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str  # e.g., "Week 1 - Variables & Loops"
    description: str  # e.g., "Complete all 5 problems to master the basics"
    chapter: str = ""  # e.g., "Chapter 1"
    lesson: str = ""  # e.g., "Lesson 1"
    teacher_id: str
    problem_ids: List[str]  # References to Problem documents
    classroom_ids: List[str]  # Can be assigned to multiple classrooms
    available_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    allow_late_submission: bool = True
    late_penalty_percent: int = 0
    completion_bonus_xp: int = 100  # Bonus for completing all problems
    completion_bonus_coins: int = 50  # Bonus coins for completing all
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AssignmentCreate(BaseModel):
    title: str
    description: str
    chapter: str = ""
    lesson: str = ""
    problem_ids: List[str]  # Multiple problems from library
    classroom_ids: List[str]  # Multiple classrooms
    available_date: Optional[str] = None  # ISO format datetime
    due_date: Optional[str] = None
    allow_late_submission: bool = True
    late_penalty_percent: int = 0
    completion_bonus_xp: int = 100
    completion_bonus_coins: int = 50

class Submission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assignment_id: str  # Which assignment bundle
    problem_id: str  # Which specific problem within the assignment
    student_id: str
    code: str
    score: float
    feedback: str
    test_results: List[dict]
    attempt_number: int = 1
    lives_remaining: int = 3
    is_passing: bool = False
    is_late: bool = False
    is_final: bool = False  # Student marked this as their final submission
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubmissionCreate(BaseModel):
    assignment_id: str
    problem_id: Optional[str] = None  # Optional for backward compatibility
    code: str

class Battle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    challenger_classroom_id: str
    challenger_classroom_name: str
    opponent_classroom_id: str
    opponent_classroom_name: str
    start_date: datetime
    end_date: datetime
    status: str  # "pending", "active", "completed"
    challenger_score: int = 0
    opponent_score: int = 0
    winner_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BattleCreate(BaseModel):
    opponent_classroom_id: str

class CodeExecuteRequest(BaseModel):
    code: str
    test_input: str = ""

class CodeExecuteResponse(BaseModel):
    output: str
    error: Optional[str] = None
    success: bool

# Multiple Choice Testing Models
class MCQuestion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question_text: str
    choice_a: str
    choice_b: str
    choice_c: str
    choice_d: str
    correct_answer: str  # "A", "B", "C", or "D"
    chapter: str = ""
    lesson: str = ""
    difficulty: str = "Easy"  # "Easy", "Medium", "Hard"
    creator_id: str
    creator_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MCQuestionCreate(BaseModel):
    question_text: str
    choice_a: str
    choice_b: str
    choice_c: str
    choice_d: str
    correct_answer: str
    chapter: str = ""
    lesson: str = ""
    difficulty: str = "Easy"

class MCTest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str = ""
    chapter: str = ""
    lesson: str = ""
    teacher_id: str
    question_pool_ids: List[str]  # All available questions for this test
    num_questions: int  # How many questions each student gets (random selection)
    time_limit_minutes: int = 0  # 0 = no time limit
    classroom_ids: List[str]
    available_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MCTestCreate(BaseModel):
    title: str
    description: str = ""
    chapter: str = ""
    lesson: str = ""
    question_pool_ids: List[str]
    num_questions: int
    time_limit_minutes: int = 0
    classroom_ids: List[str]
    available_date: Optional[str] = None
    due_date: Optional[str] = None

class MCTestAttempt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    test_id: str
    student_id: str
    randomized_question_ids: List[str]  # Specific questions this student got
    randomized_choices: dict  # {question_id: shuffled order like ["C", "A", "D", "B"]}
    student_answers: dict  # {question_id: selected_answer}
    score: float  # Percentage
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_complete: bool = False

class MCTestSubmission(BaseModel):
    test_id: str
    answers: dict  # {question_id: selected_answer}

# PDF Note model for library resources
class PDFNote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str = ""
    chapter: str = ""  # Link to problem chapters
    category: str = ""  # e.g., "Lesson Notes", "Study Guide", "Reference"
    resource_type: str = "student_resource"  # "teacher_resource" or "student_resource"
    file_data: str  # Base64 encoded PDF data
    file_size: int  # Size in bytes
    creator_id: str
    creator_name: str
    is_shared: bool = False  # Share with community (teacher-to-teacher)
    tags: List[str] = Field(default_factory=list)  # For searchability
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PDFNoteCreate(BaseModel):
    title: str
    description: str = ""
    chapter: str = ""
    category: str = ""
    resource_type: str = "student_resource"  # "teacher_resource" or "student_resource"
    file_data: str  # Base64 encoded PDF
    file_size: int
    is_shared: bool = False
    tags: List[str] = Field(default_factory=list)

class PDFNoteUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    chapter: Optional[str] = None
    category: Optional[str] = None
    resource_type: Optional[str] = None
    is_shared: Optional[bool] = None
    tags: Optional[List[str]] = None

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
        await db.sessions.insert_one(session_dict)
        
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
    """Get current user info with fresh stats from database"""
    user = await get_current_user(request)
    
    # Return full user profile including stats (always fresh from database)
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture"),
        "role": user["role"],
        "is_admin": user.get("is_admin", False),
        "xp": user.get("xp", 0),
        "coins": user.get("coins", 0),
        "rank": user.get("rank", "Rookie"),
        "rank_level": user.get("rank_level", 1),
        "problems_solved": user.get("problems_solved", 0),
        "perfect_scores": user.get("perfect_scores", 0),
        "current_streak": user.get("current_streak", 0),
        "best_streak": user.get("best_streak", 0),
        "owned_themes": user.get("owned_themes", ["default"]),
        "owned_badges": user.get("owned_badges", []),
        "active_theme": user.get("active_theme", "default"),
        "active_badges": user.get("active_badges", [])
    }

@api_router.post("/auth/teacher-login")
async def teacher_login(login_data: TeacherLoginRequest):
    """Teacher login with email and password"""
    try:
        # Find user by email
        user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        if user.get("role") != "teacher":
            raise HTTPException(status_code=403, detail="This login is for teachers only")
        
        if not user.get("password"):
            raise HTTPException(status_code=401, detail="This account uses Google login. Please use the student/Google login option.")
        
        # Verify password
        password_match = bcrypt.checkpw(
            login_data.password.encode('utf-8'),
            user["password"].encode('utf-8')
        )
        
        if not password_match:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Create session
        session_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        session = {
            "user_id": user["id"],
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.sessions.insert_one(session)
        
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
            "session_token": session_token,
            "role": user["role"],
            "is_admin": user.get("is_admin", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Teacher login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")

@api_router.post("/auth/teacher-signup")
async def teacher_signup(signup_data: TeacherSignupRequest):
    """Teacher signup with invite code"""
    try:
        # Validate invite code
        invite_code = await db.invite_codes.find_one(
            {"code": signup_data.invite_code, "is_active": True},
            {"_id": 0}
        )
        
        if not invite_code:
            raise HTTPException(status_code=400, detail="Invalid or expired invite code")
        
        if invite_code.get("used_by_teacher_id"):
            raise HTTPException(status_code=400, detail="This invite code has already been used")
        
        # Check if email already exists
        existing_user = await db.users.find_one({"email": signup_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password
        hashed_password = bcrypt.hashpw(
            signup_data.password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
        
        # Create teacher user
        user_id = str(uuid.uuid4())
        new_user = {
            "id": user_id,
            "email": signup_data.email,
            "name": signup_data.name,
            "picture": None,
            "role": "teacher",
            "password": hashed_password,
            "is_admin": False,
            "xp": 0,
            "coins": 0,
            "rank": "Rookie",
            "rank_level": 1,
            "problems_solved": 0,
            "perfect_scores": 0,
            "current_streak": 0,
            "best_streak": 0,
            "owned_themes": ["default"],
            "owned_badges": [],
            "active_theme": "default",
            "active_badges": [],
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.users.insert_one(new_user)
        
        # Mark invite code as used
        await db.invite_codes.update_one(
            {"id": invite_code["id"]},
            {
                "$set": {
                    "used_by_teacher_id": user_id,
                    "used_at": datetime.now(timezone.utc),
                    "is_active": False
                }
            }
        )
        
        # Create session
        session_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        session = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.sessions.insert_one(session)
        
        return {
            "id": user_id,
            "email": signup_data.email,
            "name": signup_data.name,
            "picture": None,
            "session_token": session_token,
            "role": "teacher",
            "is_admin": False
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Teacher signup error: {str(e)}")
        raise HTTPException(status_code=500, detail="Signup failed")


@api_router.post("/auth/switch-role")
async def switch_role(request: Request):
    """Switch between teacher and student roles"""
    user = await get_current_user(request)
    
    # Protect admin accounts from being switched
    if user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin accounts cannot be switched")
    
    # Protect specific email from being switched
    if user.get("email") == "astapp@spanola.net":
        raise HTTPException(status_code=403, detail="This account cannot be switched")
    
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
        await db.sessions.delete_one({"session_token": session_token})
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
async def get_classrooms(request: Request, include_archived: bool = False):
    """Get all classrooms for current user"""
    user = await get_current_user(request)
    
    if user["role"] == "teacher":
        # By default, exclude archived classrooms for teachers
        query = {"teacher_id": user["id"]}
        if not include_archived:
            query["is_archived"] = {"$ne": True}
        
        classrooms = await db.classrooms.find(query, {"_id": 0}).to_list(1000)
    else:
        # Students see active classrooms they're enrolled in
        classrooms = await db.classrooms.find(
            {"students": user["id"], "is_archived": {"$ne": True}},
            {"_id": 0}
        ).to_list(1000)
        
        # For students, fetch and include assignments
        for classroom in classrooms:
            assignments = await db.assignments.find(
                {"classroom_ids": classroom["id"]},
                {"_id": 0}
            ).to_list(1000)
            classroom["assignments"] = assignments
    
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

@api_router.get("/classrooms/available-for-battle")
async def get_available_classrooms(request: Request):
    """Get classrooms available to challenge"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view this")
    
    # Get all classrooms (including user's own for intra-school battles)
    classrooms = await db.classrooms.find(
        {},
        {"_id": 0, "id": 1, "name": 1, "class_code": 1, "teacher_id": 1}
    ).to_list(1000)
    
    # Add teacher names
    for classroom in classrooms:
        teacher = await db.users.find_one({"id": classroom["teacher_id"]}, {"_id": 0, "name": 1})
        if teacher:
            classroom["teacher_name"] = teacher["name"]
    
    return classrooms

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



@api_router.delete("/classrooms/{classroom_id}")
async def delete_classroom(classroom_id: str, request: Request):
    """Permanently delete a classroom and all associated data"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete classrooms")
    
    classroom = await db.classrooms.find_one({"id": classroom_id})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    if classroom["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own classrooms")
    
    # Delete all assignments associated with this classroom
    await db.assignments.delete_many({"classroom_ids": classroom_id})
    
    # Delete all submissions from students in this classroom
    student_ids = classroom.get("students", [])
    for student_id in student_ids:
        await db.submissions.delete_many({"student_id": student_id})
    
    # Delete the classroom
    await db.classrooms.delete_one({"id": classroom_id})
    
    return {"success": True, "message": "Classroom and all associated data deleted"}

@api_router.put("/classrooms/{classroom_id}/archive")
async def archive_classroom(classroom_id: str, request: Request):
    """Archive a classroom (hide but keep all data)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can archive classrooms")
    
    classroom = await db.classrooms.find_one({"id": classroom_id})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    if classroom["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only archive your own classrooms")
    
    # Mark as archived
    await db.classrooms.update_one(
        {"id": classroom_id},
        {"$set": {"is_archived": True}}
    )
    
    return {"success": True, "message": "Classroom archived"}

@api_router.put("/classrooms/{classroom_id}/unarchive")
async def unarchive_classroom(classroom_id: str, request: Request):
    """Unarchive a classroom"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can unarchive classrooms")
    
    classroom = await db.classrooms.find_one({"id": classroom_id})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    if classroom["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only unarchive your own classrooms")
    
    # Mark as not archived
    await db.classrooms.update_one(
        {"id": classroom_id},
        {"$set": {"is_archived": False}}
    )
    
    return {"success": True, "message": "Classroom unarchived"}

@api_router.delete("/classrooms/{classroom_id}/students/{student_id}")
async def remove_student_from_classroom(classroom_id: str, student_id: str, request: Request):
    """Remove a student from a classroom"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can remove students")
    
    classroom = await db.classrooms.find_one({"id": classroom_id})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    if classroom["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only remove students from your own classrooms")
    
    # Remove student from classroom
    await db.classrooms.update_one(
        {"id": classroom_id},
        {"$pull": {"students": student_id}}
    )
    
    return {"success": True, "message": "Student removed from classroom"}

# ----- Assignment Routes -----

@api_router.post("/problems/bulk-upload")
async def bulk_upload_problems(request: Request):
    """Bulk upload problems from CSV"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can upload to library")
    
    try:
        body = await request.json()
        csv_data = body.get("csv_data", [])
        
        if not csv_data or len(csv_data) == 0:
            raise HTTPException(status_code=400, detail="No data provided")
        
        created_count = 0
        errors = []
        
        for row_index, row in enumerate(csv_data):
            try:
                if not row.get("title") or not row.get("solution_code"):
                    errors.append(f"Row {row_index + 1}: Missing title or solution_code")
                    continue
                
                logging.info(f"Processing row {row_index + 1}: {row.get('title')}")
                
                new_problem = Problem(
                    title=row.get("title", ""),
                    description=row.get("description", ""),
                    starter_code=row.get("starter_code", ""),
                    solution_code=row.get("solution_code", ""),
                    expected_output=row.get("expected_output", ""),
                    category=row.get("category", "Uncategorized"),
                    difficulty=row.get("difficulty", "Easy"),
                    chapter=row.get("chapter", ""),
                    lesson=row.get("lesson", ""),
                    problem_type=row.get("problem_type", "Independent Practice"),
                    csta_standard=row.get("csta_standard", ""),
                    resources_link=row.get("resources_link", ""),
                    creator_id=user["id"],
                    creator_name=user["name"]
                )
                
                problem_dict = new_problem.model_dump()
                problem_dict["created_at"] = problem_dict["created_at"].isoformat()
                await db.problems.insert_one(problem_dict)
                created_count += 1
                
            except Exception as e:
                error_msg = f"Row {row_index + 1} ({row.get('title', 'Unknown')}): {str(e)}"
                logging.error(error_msg)
                errors.append(error_msg)
        
        return {
            "success": True,
            "created": created_count,
            "errors": errors if errors else []
        }
        
    except Exception as e:
        logging.error(f"Bulk upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/problems", response_model=Problem)
async def create_problem(problem: ProblemCreate, request: Request):
    """Add problem to library (Teachers only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can add to library")
    
    new_problem = Problem(
        **problem.model_dump(),
        creator_id=user["id"],
        creator_name=user["name"]
    )
    
    problem_dict = new_problem.model_dump()
    problem_dict["created_at"] = problem_dict["created_at"].isoformat()
    await db.problems.insert_one(problem_dict)
    
    return new_problem

@api_router.get("/problems")
async def get_problems(
    request: Request,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    chapter: Optional[str] = None,
    csta_standard: Optional[str] = None,
    search: Optional[str] = None
):
    """Get all problems with optional filters"""
    await get_current_user(request)
    
    query = {}
    if category:
        query["category"] = category
    if difficulty:
        query["difficulty"] = difficulty
    if chapter:
        query["chapter"] = chapter
    if csta_standard:
        query["csta_standard"] = {"$regex": csta_standard, "$options": "i"}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    problems = await db.problems.find(query, {"_id": 0}).to_list(1000)
    return problems

@api_router.put("/problems/{problem_id}")
async def update_problem(problem_id: str, problem: ProblemCreate, request: Request):
    """Update a problem in the library"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update library problems")
    
    # Check if problem exists
    existing = await db.problems.find_one({"id": problem_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Update problem
    problem_dict = problem.model_dump()
    await db.problems.update_one(
        {"id": problem_id},
        {"$set": problem_dict}
    )
    
    updated_problem = await db.problems.find_one({"id": problem_id}, {"_id": 0})
    return updated_problem


@api_router.post("/assignments")
async def create_assignment(assignment: AssignmentCreate, request: Request):
    """Create a new bundled assignment with multiple problems"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create assignments")
    
    # Verify teacher owns all classrooms
    for classroom_id in assignment.classroom_ids:
        classroom = await db.classrooms.find_one({"id": classroom_id})
        if not classroom or classroom["teacher_id"] != user["id"]:
            raise HTTPException(status_code=403, detail=f"You don't have access to classroom {classroom_id}")
    
    # Verify all problems exist
    for problem_id in assignment.problem_ids:
        problem = await db.problems.find_one({"id": problem_id})
        if not problem:
            raise HTTPException(status_code=404, detail=f"Problem {problem_id} not found")
    
    # Parse dates
    available_date = datetime.fromisoformat(assignment.available_date) if assignment.available_date else None
    due_date = datetime.fromisoformat(assignment.due_date) if assignment.due_date else None
    
    # Create assignment
    new_assignment = Assignment(
        title=assignment.title,
        description=assignment.description,
        teacher_id=user["id"],
        problem_ids=assignment.problem_ids,
        classroom_ids=assignment.classroom_ids,
        available_date=available_date,
        due_date=due_date,
        allow_late_submission=assignment.allow_late_submission,
        late_penalty_percent=assignment.late_penalty_percent,
        completion_bonus_xp=assignment.completion_bonus_xp,
        completion_bonus_coins=assignment.completion_bonus_coins
    )
    
    assignment_dict = new_assignment.model_dump()
    assignment_dict["created_at"] = assignment_dict["created_at"].isoformat()
    if assignment_dict["available_date"]:
        assignment_dict["available_date"] = assignment_dict["available_date"].isoformat()
    if assignment_dict["due_date"]:
        assignment_dict["due_date"] = assignment_dict["due_date"].isoformat()
    
    await db.assignments.insert_one(assignment_dict)
    
    # Increment times_imported counter for each problem
    for problem_id in assignment.problem_ids:
        await db.problems.update_one(
            {"id": problem_id},
            {"$inc": {"times_imported": len(assignment.classroom_ids)}}
        )
    
    return {"success": True, "assignment_id": new_assignment.id, "classrooms": len(assignment.classroom_ids)}

@api_router.put("/assignments/{assignment_id}/schedule")
async def update_assignment_schedule(assignment_id: str, request: Request):
    """Update assignment scheduling (available_date, due_date, late policy)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update assignments")
    
    assignment = await db.assignments.find_one({"id": assignment_id})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Verify teacher owns this assignment
    if assignment.get("teacher_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    body = await request.json()
    
    # Parse dates if provided
    update_data = {}
    if "available_date" in body:
        update_data["available_date"] = body["available_date"]
    if "due_date" in body:
        update_data["due_date"] = body["due_date"]
    if "allow_late_submission" in body:
        update_data["allow_late_submission"] = body["allow_late_submission"]
    if "late_penalty_percent" in body:
        update_data["late_penalty_percent"] = body["late_penalty_percent"]
    
    await db.assignments.update_one(
        {"id": assignment_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Assignment schedule updated"}

@api_router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, request: Request):
    """Delete an assignment"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete assignments")
    
    assignment = await db.assignments.find_one({"id": assignment_id})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Verify teacher owns this assignment
    if assignment.get("teacher_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete the assignment
    await db.assignments.delete_one({"id": assignment_id})
    
    # Also delete all submissions for this assignment
    await db.submissions.delete_many({"assignment_id": assignment_id})
    
    return {"success": True, "message": "Assignment deleted"}

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
    
    # Find assignments that include this classroom
    assignments = await db.assignments.find(
        {"classroom_ids": classroom_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Add problem count and progress for each assignment
    for assignment in assignments:
        assignment["problem_count"] = len(assignment.get("problem_ids", []))
        
        # For students, calculate completion progress
        if user["role"] == "student":
            completed_problems = 0
            for problem_id in assignment.get("problem_ids", []):
                # Check if student has passing submission for this problem
                passing_submission = await db.submissions.find_one({
                    "assignment_id": assignment["id"],
                    "problem_id": problem_id,
                    "student_id": user["id"],
                    "is_passing": True
                })
                if passing_submission:
                    completed_problems += 1
            
            assignment["completed_problems"] = completed_problems
            assignment["is_complete"] = completed_problems == assignment["problem_count"]
    
    return assignments

@api_router.get("/assignments/{assignment_id}")
async def get_assignment(assignment_id: str, request: Request):
    """Get assignment details with all problems"""
    user = await get_current_user(request)
    
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Check if user has access to any of the classrooms
    has_access = False
    if user["role"] == "teacher":
        if assignment.get("teacher_id") == user["id"]:
            has_access = True
    elif user["role"] == "student":
        for classroom_id in assignment.get("classroom_ids", []):
            classroom = await db.classrooms.find_one({"id": classroom_id})
            if classroom and user["id"] in classroom.get("students", []):
                has_access = True
                break
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check availability for students
    if user["role"] == "student":
        now = datetime.now(timezone.utc)
        available_date = datetime.fromisoformat(assignment["available_date"]) if assignment.get("available_date") else None
        
        if available_date and now < available_date:
            return {
                "id": assignment["id"],
                "title": assignment["title"],
                "is_locked": True,
                "available_date": assignment["available_date"],
                "message": "This assignment is not yet available"
            }
        
        # Check if past due
        due_date = datetime.fromisoformat(assignment["due_date"]) if assignment.get("due_date") else None
        assignment["is_late"] = due_date and now > due_date
        assignment["is_locked"] = False
    
    # Fetch all problems for this assignment
    problems = []
    for problem_id in assignment.get("problem_ids", []):
        problem = await db.problems.find_one({"id": problem_id}, {"_id": 0})
        if problem:
            # For students, hide solution code
            if user["role"] == "student":
                problem["solution_code"] = "[Hidden]"
            
            # Add completion status for students
            if user["role"] == "student":
                passing_submission = await db.submissions.find_one({
                    "assignment_id": assignment_id,
                    "problem_id": problem_id,
                    "student_id": user["id"],
                    "is_passing": True
                })
                problem["is_completed"] = passing_submission is not None
            
            problems.append(problem)
    
    assignment["problems"] = problems
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
    try:
        await get_current_user(request)  # Ensure authenticated
        
        result = run_python_code(execute_req.code, execute_req.test_input, timeout=10)
        return CodeExecuteResponse(**result)
    except Exception as e:
        logging.error(f"Code execution error: {str(e)}")
        return CodeExecuteResponse(
            output="",
            error=f"Execution failed: {str(e)}",
            success=False
        )

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
    
    # Handle both old (classroom_id) and new (classroom_ids) structure
    if "classroom_ids" in assignment:
        # New structure: check if student is in any of the classrooms
        has_access = False
        for classroom_id in assignment["classroom_ids"]:
            classroom = await db.classrooms.find_one({"id": classroom_id})
            if classroom and user["id"] in classroom.get("students", []):
                has_access = True
                break
        if not has_access:
            raise HTTPException(status_code=403, detail="You are not enrolled in any classroom for this assignment")
    else:
        # Old structure: single classroom_id
        classroom = await db.classrooms.find_one({"id": assignment.get("classroom_id")})
        if not classroom:
            raise HTTPException(status_code=404, detail="Classroom not found")
        if user["id"] not in classroom.get("students", []):
            raise HTTPException(status_code=403, detail="You are not enrolled in this classroom")
    
    # Get the problem (handle both old single-problem and new multi-problem structure)
    if "problem_ids" in assignment and submission.problem_id:
        # New structure: get specific problem
        problem = await db.problems.find_one({"id": submission.problem_id})
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        if submission.problem_id not in assignment["problem_ids"]:
            raise HTTPException(status_code=400, detail="Problem not part of this assignment")
    else:
        # Old structure: problem data is in assignment itself
        problem = {
            "id": assignment["id"],
            "solution_code": assignment.get("solution_code", ""),
            "title": assignment.get("title", "")
        }
        # For backward compatibility, use assignment_id as problem_id
        if not submission.problem_id:
            submission.problem_id = assignment["id"]
    
    # Check if assignment is available
    now = datetime.now(timezone.utc)
    available_date = datetime.fromisoformat(assignment["available_date"]) if assignment.get("available_date") else None
    
    if available_date and now < available_date:
        raise HTTPException(status_code=403, detail="This assignment is not yet available")
    
    # Check previous submissions and lives (for this specific problem)
    previous_submissions = await db.submissions.find(
        {
            "assignment_id": submission.assignment_id,
            "problem_id": submission.problem_id,
            "student_id": user["id"]
        },
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
        solution_result = run_python_code(problem["solution_code"], "")
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

Problem: {problem.get('title', assignment.get('title', 'Coding Problem'))}
Description: {problem.get('description', assignment.get('description', ''))}

Solution Code:
```python
{problem['solution_code']}
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

Problem: {problem.get('title', assignment.get('title', 'Coding Problem'))}
Description: {problem.get('description', assignment.get('description', ''))}

Expected Solution:
```python
{problem['solution_code']}
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
        feedback = f"Test Results: {passed_tests}/{total_tests} passed. {problem.get('title', 'Problem')} - Keep practicing!"
    
    # Determine if passing (70% threshold)
    is_passing = final_score >= 70
    
    # Check if submission is late and apply penalty
    is_late_submission = False
    if assignment.get("due_date"):
        due_date = datetime.fromisoformat(assignment["due_date"])
        now = datetime.now(timezone.utc)
        if now > due_date:
            is_late_submission = True
            if assignment.get("allow_late_submission", True):
                late_penalty = assignment.get("late_penalty_percent", 0)
                final_score = final_score * (1 - late_penalty / 100)
                feedback = f"[LATE SUBMISSION - {late_penalty}% penalty applied] " + feedback
            else:
                raise HTTPException(status_code=403, detail="Late submissions are not allowed for this assignment")
    
    # Calculate lives after this submission
    if not is_passing:
        lives_remaining -= 1
    
    # Award XP and coins if passing
    xp_earned = 0
    coins_earned = 0
    rank_up = False
    old_rank = user.get("rank", "Rookie")
    
    if is_passing:
        # Check if this is first successful submission for this assignment
        successful_submissions = [s for s in previous_submissions if s.get("is_passing", False)]
        is_first_success = len(successful_submissions) == 0
        
        # Calculate rewards
        rewards = calculate_xp_and_coins(final_score, is_first_success, user.get("current_streak", 0))
        xp_earned = rewards["xp"]
        coins_earned = rewards["coins"]
        
        # Update user stats
        new_xp = user.get("xp", 0) + xp_earned
        new_coins = user.get("coins", 0) + coins_earned
        new_problems_solved = user.get("problems_solved", 0) + (1 if is_first_success else 0)
        new_perfect_scores = user.get("perfect_scores", 0) + (1 if final_score == 100 else 0)
        
        # Update streak
        new_streak = user.get("current_streak", 0) + 1 if is_first_success else user.get("current_streak", 0)
        new_best_streak = max(new_streak, user.get("best_streak", 0))
        
        # Calculate new rank
        new_rank_data = calculate_rank(new_xp)
        new_rank = new_rank_data["name"]
        rank_up = new_rank != old_rank
        
        # Update user in database
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "xp": new_xp,
                "coins": new_coins,
                "rank": new_rank,
                "rank_level": new_rank_data["level"],
                "problems_solved": new_problems_solved,
                "perfect_scores": new_perfect_scores,
                "current_streak": new_streak,
                "best_streak": new_best_streak
            }}
        )
    else:
        # Reset streak on failure
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"current_streak": 0}}
        )
    
    # Save submission
    new_submission = Submission(
        assignment_id=submission.assignment_id,
        problem_id=submission.problem_id,
        student_id=user["id"],
        code=submission.code,
        score=final_score,
        feedback=feedback,
        test_results=test_results,
        attempt_number=attempt_number,
        lives_remaining=lives_remaining,
        is_passing=is_passing,
        is_late=is_late_submission
    )
    
    submission_dict = new_submission.model_dump()
    submission_dict["submitted_at"] = submission_dict["submitted_at"].isoformat()
    await db.submissions.insert_one(submission_dict)
    
    # Add reward info to response
    response_dict = new_submission.model_dump()
    response_dict["xp_earned"] = xp_earned
    response_dict["coins_earned"] = coins_earned
    response_dict["rank_up"] = rank_up
    response_dict["new_rank"] = calculate_rank(user.get("xp", 0) + xp_earned)["name"] if is_passing else old_rank
    
    return response_dict

@api_router.get("/submissions/assignment/{assignment_id}")
async def get_submissions(assignment_id: str, request: Request, classroom_id: str = None):
    """Get all submissions for an assignment, optionally filtered by classroom"""
    user = await get_current_user(request)
    
    if user["role"] == "teacher":
        # Teachers can see all submissions
        assignment = await db.assignments.find_one({"id": assignment_id})
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Handle both old (classroom_id) and new (classroom_ids) structure
        teacher_id = assignment.get("teacher_id")
        if teacher_id:
            # New structure: assignment has teacher_id directly
            if teacher_id != user["id"]:
                raise HTTPException(status_code=403, detail="Access denied")
        else:
            # Old structure: check classroom
            classroom_id_from_assignment = assignment.get("classroom_id")
            if classroom_id_from_assignment:
                classroom = await db.classrooms.find_one({"id": classroom_id_from_assignment})
                if classroom and classroom["teacher_id"] != user["id"]:
                    raise HTTPException(status_code=403, detail="Access denied")
        
        # Get submissions
        submissions = await db.submissions.find(
            {"assignment_id": assignment_id},
            {"_id": 0}
        ).to_list(1000)
        
        # Filter by classroom if specified
        if classroom_id:
            classroom = await db.classrooms.find_one({"id": classroom_id}, {"_id": 0})
            if classroom:
                classroom_students = set(classroom.get("students", []))
                submissions = [sub for sub in submissions if sub["student_id"] in classroom_students]
        
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



@api_router.post("/submissions/{submission_id}/mark-final")
async def mark_submission_final(submission_id: str, request: Request):
    """Mark a submission as the student's final submission for this problem"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can mark submissions as final")
    
    submission = await db.submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission["student_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only mark your own submissions")
    
    # Update this submission and mark all others for this problem as not final
    await db.submissions.update_many(
        {
            "assignment_id": submission["assignment_id"],
            "problem_id": submission["problem_id"],
            "student_id": user["id"]
        },
        {"$set": {"is_final": False}}
    )
    
    # Mark this one as final
    await db.submissions.update_one(
        {"id": submission_id},
        {"$set": {"is_final": True}}
    )
    
    return {"success": True, "message": "Submission marked as final"}

@api_router.get("/student/{student_id}/lesson-scores")
async def get_student_lesson_scores(student_id: str, classroom_id: str, request: Request):
    """Calculate assignment scores for a student in a classroom"""
    user = await get_current_user(request)
    
    # Teachers can see any student, students can only see themselves
    if user["role"] == "student" and user["id"] != student_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all assignments for this classroom
    assignments = await db.assignments.find(
        {"classroom_ids": classroom_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate score for each assignment
    assignment_scores = []
    
    for assignment in assignments:
        assignment_id = assignment["id"]
        assignment_title = assignment["title"]
        
        # Get problem IDs for this assignment
        problem_ids = assignment.get("problem_ids", [])
        
        # Handle old single-problem assignments
        if not problem_ids:
            problem_ids = [assignment_id]
        
        total_problems = len(problem_ids)
        problem_scores = []
        
        for problem_id in problem_ids:
            # Get all submissions for this problem by this student
            submissions = await db.submissions.find(
                {"assignment_id": assignment_id, "problem_id": problem_id, "student_id": student_id},
                {"_id": 0}
            ).to_list(1000)
            
            if not submissions:
                # Never attempted = 0
                problem_scores.append(0)
            else:
                # Get best score
                best_score = max(sub.get("score", 0) for sub in submissions)
                
                # Check if locked out (3 attempts, all failed, 0 lives remaining)
                lives = [s.get("lives_remaining", 3) for s in submissions]
                if len(submissions) >= 3 and min(lives) == 0 and best_score < 70:
                    # Locked out without passing = 0
                    problem_scores.append(0)
                else:
                    problem_scores.append(best_score)
        
        # Calculate assignment average (including 0s for unattempted)
        assignment_avg = sum(problem_scores) / total_problems if total_problems > 0 else 0
        
        # Count completed problems (passing score >= 70)
        completed = sum(1 for score in problem_scores if score >= 70)
        
        # Get last activity date
        last_activity = None
        if completed > 0:
            assignment_submissions = await db.submissions.find(
                {"assignment_id": assignment_id, "student_id": student_id},
                {"_id": 0}
            ).sort("submitted_at", -1).limit(1).to_list(1)
            
            if assignment_submissions:
                last_activity = assignment_submissions[0].get("submitted_at")
        
        assignment_scores.append({
            "assignment_id": assignment_id,
            "assignment_title": assignment_title,
            "total_problems": total_problems,
            "completed_problems": completed,
            "average_score": round(assignment_avg, 1),
            "last_activity": last_activity,
            "is_complete": completed == total_problems
        })
    
    # Sort by assignment title
    assignment_scores.sort(key=lambda x: x["assignment_title"])
    
    return assignment_scores

@api_router.post("/reports/gradebook")
async def generate_gradebook_report(report_data: dict, request: Request):
    """Generate gradebook-style report with assignments across top, students down side"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")
    
    classroom_ids = report_data.get("classroom_ids", [])
    assignment_ids = report_data.get("assignment_ids", [])
    
    if not classroom_ids:
        raise HTTPException(status_code=400, detail="At least one classroom required")
    
    if not assignment_ids:
        raise HTTPException(status_code=400, detail="At least one assignment required")
    
    # Verify teacher owns these classrooms
    for classroom_id in classroom_ids:
        classroom = await db.classrooms.find_one({"id": classroom_id}, {"_id": 0})
        if not classroom or classroom.get("teacher_id") != user["id"]:
            raise HTTPException(status_code=403, detail=f"Access denied to classroom {classroom_id}")
    
    # Get all students from selected classrooms
    all_students = set()
    for classroom_id in classroom_ids:
        classroom = await db.classrooms.find_one({"id": classroom_id}, {"_id": 0})
        if classroom:
            all_students.update(classroom.get("students", []))
    
    # Get student details with names
    students_data = []
    for student_id in all_students:
        student = await db.users.find_one({"id": student_id}, {"_id": 0})
        if student:
            # Parse name to sort by last name
            name = student.get("name", "Unknown")
            name_parts = name.split()
            if len(name_parts) >= 2:
                # Assume "First Last" format
                first_name = " ".join(name_parts[:-1])
                last_name = name_parts[-1]
                display_name = f"{last_name}, {first_name}"
            else:
                first_name = name
                last_name = ""
                display_name = name
            
            students_data.append({
                "id": student_id,
                "name": student.get("name", "Unknown"),
                "display_name": display_name,
                "last_name": last_name,
                "first_name": first_name,
                "email": student.get("email", "")
            })
    
    # Sort by last name, then first name
    students_data.sort(key=lambda x: (x["last_name"].lower(), x["first_name"].lower()))
    
    # Get assignment details
    assignments_data = []
    for assignment_id in assignment_ids:
        assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
        if assignment:
            assignments_data.append({
                "id": assignment["id"],
                "title": assignment["title"],
                "problem_ids": assignment.get("problem_ids", [])
            })
    
    # Build gradebook data
    gradebook = []
    for student in students_data:
        student_row = {
            "student_id": student["id"],
            "student_name": student["display_name"],
            "student_email": student["email"],
            "scores": {}
        }
        
        for assignment in assignments_data:
            assignment_id = assignment["id"]
            problem_ids = assignment["problem_ids"]
            
            if not problem_ids:
                problem_ids = [assignment_id]
            
            total_problems = len(problem_ids)
            problem_scores = []
            completion_date = None
            
            for problem_id in problem_ids:
                # Get all submissions for this problem by this student
                submissions = await db.submissions.find(
                    {"assignment_id": assignment_id, "problem_id": problem_id, "student_id": student["id"]},
                    {"_id": 0}
                ).to_list(1000)
                
                if not submissions:
                    problem_scores.append(0)
                else:
                    best_score = max(sub.get("score", 0) for sub in submissions)
                    lives = [s.get("lives_remaining", 3) for s in submissions]
                    
                    if len(submissions) >= 3 and min(lives) == 0 and best_score < 70:
                        problem_scores.append(0)
                    else:
                        problem_scores.append(best_score)
                    
                    # Track most recent completion date
                    for sub in submissions:
                        if sub.get("score", 0) >= 70:
                            sub_date = sub.get("submitted_at")
                            if sub_date and (not completion_date or sub_date > completion_date):
                                completion_date = sub_date
            
            # Calculate assignment average
            assignment_avg = sum(problem_scores) / total_problems if total_problems > 0 else 0
            
            student_row["scores"][assignment_id] = {
                "average_score": round(assignment_avg, 1),
                "completion_date": completion_date if completion_date else None,
                "completed_problems": sum(1 for s in problem_scores if s >= 70),
                "total_problems": total_problems
            }
        
        gradebook.append(student_row)
    
    return {
        "students": gradebook,
        "assignments": assignments_data
    }

@api_router.post("/reports/missing")
async def generate_missing_report(report_data: dict, request: Request):
    """Generate missing/incomplete assignments report per student"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")
    
    classroom_ids = report_data.get("classroom_ids", [])
    
    if not classroom_ids:
        raise HTTPException(status_code=400, detail="At least one classroom required")
    
    # Verify teacher owns these classrooms
    for classroom_id in classroom_ids:
        classroom = await db.classrooms.find_one({"id": classroom_id}, {"_id": 0})
        if not classroom or classroom.get("teacher_id") != user["id"]:
            raise HTTPException(status_code=403, detail=f"Access denied to classroom {classroom_id}")
    
    # Get all students from selected classrooms
    all_students = set()
    all_assignments = []
    
    for classroom_id in classroom_ids:
        classroom = await db.classrooms.find_one({"id": classroom_id}, {"_id": 0})
        if classroom:
            all_students.update(classroom.get("students", []))
        
        # Get all assignments for this classroom
        assignments = await db.assignments.find(
            {"classroom_ids": classroom_id},
            {"_id": 0}
        ).to_list(1000)
        
        for assignment in assignments:
            if assignment["id"] not in [a["id"] for a in all_assignments]:
                all_assignments.append(assignment)
    
    # Get student details
    students_data = []
    for student_id in all_students:
        student = await db.users.find_one({"id": student_id}, {"_id": 0})
        if student:
            name = student.get("name", "Unknown")
            name_parts = name.split()
            if len(name_parts) >= 2:
                first_name = " ".join(name_parts[:-1])
                last_name = name_parts[-1]
                display_name = f"{last_name}, {first_name}"
            else:
                first_name = name
                last_name = ""
                display_name = name
            
            students_data.append({
                "id": student_id,
                "name": student.get("name", "Unknown"),
                "display_name": display_name,
                "last_name": last_name,
                "first_name": first_name,
                "email": student.get("email", "")
            })
    
    # Sort by last name, then first name
    students_data.sort(key=lambda x: (x["last_name"].lower(), x["first_name"].lower()))
    
    # Build missing report for each student
    report = []
    for student in students_data:
        missing_assignments = []
        incomplete_assignments = []
        
        for assignment in all_assignments:
            assignment_id = assignment["id"]
            problem_ids = assignment.get("problem_ids", [])
            
            if not problem_ids:
                problem_ids = [assignment_id]
            
            total_problems = len(problem_ids)
            completed_problems = 0
            attempted = False
            
            for problem_id in problem_ids:
                submissions = await db.submissions.find(
                    {"assignment_id": assignment_id, "problem_id": problem_id, "student_id": student["id"]},
                    {"_id": 0}
                ).to_list(1000)
                
                if submissions:
                    attempted = True
                    best_score = max(sub.get("score", 0) for sub in submissions)
                    if best_score >= 70:
                        completed_problems += 1
            
            if not attempted:
                missing_assignments.append({
                    "assignment_id": assignment_id,
                    "assignment_title": assignment["title"],
                    "total_problems": total_problems
                })
            elif completed_problems < total_problems:
                incomplete_assignments.append({
                    "assignment_id": assignment_id,
                    "assignment_title": assignment["title"],
                    "completed_problems": completed_problems,
                    "total_problems": total_problems
                })
        
        if missing_assignments or incomplete_assignments:
            report.append({
                "student_id": student["id"],
                "student_name": student["display_name"],
                "student_email": student["email"],
                "missing_assignments": missing_assignments,
                "incomplete_assignments": incomplete_assignments
            })
    
    return {
        "students": report
    }


# ----- Admin Routes -----

@api_router.post("/admin/invite-codes/generate")
async def generate_invite_code(request: Request):
    """Generate a new single-use invite code (admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Generate random 8-character code
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    # Ensure uniqueness
    while await db.invite_codes.find_one({"code": code}):
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    invite_code = {
        "id": str(uuid.uuid4()),
        "code": code,
        "created_by_admin_id": user["id"],
        "used_by_teacher_id": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "used_at": None
    }
    
    await db.invite_codes.insert_one(invite_code)
    
    return {
        "id": invite_code["id"],
        "code": code,
        "created_at": invite_code["created_at"],
        "is_active": True
    }

@api_router.get("/admin/invite-codes")
async def get_invite_codes(request: Request):
    """Get all invite codes (admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    codes = await db.invite_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with teacher names
    for code in codes:
        if code.get("used_by_teacher_id"):
            teacher = await db.users.find_one(
                {"id": code["used_by_teacher_id"]},
                {"_id": 0, "name": 1, "email": 1}
            )
            if teacher:
                code["used_by_name"] = teacher.get("name")
                code["used_by_email"] = teacher.get("email")
    
    return codes

@api_router.get("/admin/stats")
async def get_admin_stats(request: Request):
    """Get platform statistics (admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Count users
    total_teachers = await db.users.count_documents({"role": "teacher"})
    total_students = await db.users.count_documents({"role": "student"})
    
    # Count classrooms
    total_classrooms = await db.classrooms.count_documents({})
    
    # Count assignments
    total_assignments = await db.assignments.count_documents({})
    
    # Count submissions
    total_submissions = await db.submissions.count_documents({})
    
    # Active users (last 7 days)
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active_users = await db.sessions.count_documents({
        "created_at": {"$gte": seven_days_ago}
    })
    
    return {
        "total_teachers": total_teachers,
        "total_students": total_students,
        "total_classrooms": total_classrooms,
        "total_assignments": total_assignments,
        "total_submissions": total_submissions,
        "active_users_7d": active_users
    }

@api_router.get("/admin/teachers")
async def get_all_teachers(request: Request):
    """Get all teachers with stats (admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    teachers = await db.users.find({"role": "teacher"}, {"_id": 0, "password": 0}).to_list(1000)
    
    # Enrich with stats
    for teacher in teachers:
        # Count classrooms
        teacher["classroom_count"] = await db.classrooms.count_documents({"teacher_id": teacher["id"]})
        
        # Count assignments created
        teacher["assignment_count"] = await db.assignments.count_documents({"teacher_id": teacher["id"]})
    
    # Sort by join date (newest first)
    teachers.sort(key=lambda t: t.get("created_at", datetime.min), reverse=True)
    
    return teachers

@api_router.put("/admin/teachers/{teacher_id}/toggle-active")
async def toggle_teacher_active(teacher_id: str, request: Request):
    """Activate/deactivate a teacher account (admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    teacher = await db.users.find_one({"id": teacher_id, "role": "teacher"})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    # Toggle is_active field (add if doesn't exist)
    new_status = not teacher.get("is_active", True)
    
    await db.users.update_one(
        {"id": teacher_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"success": True, "is_active": new_status}



@api_router.post("/admin/emergency-fix-account")
async def emergency_fix_account(fix_data: dict):
    """Emergency endpoint to fix admin account without authentication"""
    email = fix_data.get("email")
    
    logging.info(f"Emergency fix attempt - Email: {email}")
    
    # Only allow fixing the main admin account (no secret key needed - email itself is the key)
    if email != "astapp@spanola.net":
        raise HTTPException(status_code=403, detail="This emergency fix is only for astapp@spanola.net")
    
    # Find and update the account
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Hash password
    hashed_password = bcrypt.hashpw(
        "AlisaFaith$14".encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')
    
    # Update to teacher/admin
    await db.users.update_one(
        {"email": email},
        {
            "$set": {
                "role": "teacher",
                "is_admin": True,
                "password": hashed_password
            }
        }
    )
    
    return {"success": True, "message": "Account restored to teacher/admin status"}


# ----- Gamification Routes -----

@api_router.get("/leaderboard/classroom/{classroom_id}")
async def get_classroom_leaderboard(classroom_id: str, request: Request):
    """Get leaderboard for a classroom"""
    user = await get_current_user(request)
    
    classroom = await db.classrooms.find_one({"id": classroom_id})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    # Get all students in classroom
    student_ids = classroom.get("students", [])
    students = await db.users.find(
        {"id": {"$in": student_ids}},
        {"_id": 0}
    ).to_list(1000)
    
    # Sort by XP
    leaderboard = sorted(students, key=lambda x: x.get("xp", 0), reverse=True)
    
    # Add rank position
    for i, student in enumerate(leaderboard):
        student["position"] = i + 1
        rank_data = calculate_rank(student.get("xp", 0))
        student["rank_icon"] = rank_data["icon"]
        student["rank_color"] = rank_data["color"]
    
    return leaderboard[:10]  # Top 10

@api_router.get("/shop")
async def get_shop_items(request: Request):
    """Get all shop items"""
    await get_current_user(request)
    return SHOP_ITEMS

@api_router.post("/shop/purchase")
async def purchase_item(item_data: dict, request: Request):
    """Purchase an item from shop"""
    user = await get_current_user(request)
    
    item_type = item_data.get("type")  # "themes" or "badges"
    item_id = item_data.get("item_id")
    
    if item_type not in SHOP_ITEMS:
        raise HTTPException(status_code=400, detail="Invalid item type")
    
    # Find item
    item = next((i for i in SHOP_ITEMS[item_type] if i["id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if user has enough coins
    user_coins = user.get("coins", 0)
    if user_coins < item["price"]:
        raise HTTPException(status_code=400, detail="Not enough coins")
    
    # Check if already owned
    owned_field = "owned_themes" if item_type == "themes" else "owned_badges"
    if item_id in user.get(owned_field, []):
        raise HTTPException(status_code=400, detail="Already owned")
    
    # Purchase item
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$inc": {"coins": -item["price"]},
            "$push": {owned_field: item_id}
        }
    )
    
    return {"success": True, "item": item, "remaining_coins": user_coins - item["price"]}

@api_router.post("/profile/customize")
async def customize_profile(customization: dict, request: Request):
    """Customize user profile (active theme/badges)"""
    user = await get_current_user(request)
    
    updates = {}
    
    if "active_theme" in customization:
        theme_id = customization["active_theme"]
        if theme_id in user.get("owned_themes", []):
            updates["active_theme"] = theme_id
    
    if "active_badges" in customization:
        badges = customization["active_badges"]
        # Verify all badges are owned (max 3)
        if len(badges) <= 3 and all(b in user.get("owned_badges", []) for b in badges):
            updates["active_badges"] = badges
    
    if updates:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": updates}
        )
    
    return {"success": True}

# ----- Battle Routes -----

@api_router.post("/battles/challenge")
async def create_battle(battle_data: BattleCreate, request: Request):
    """Create a battle challenge between classrooms"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create battles")
    
    # Get challenger's classrooms
    challenger_classrooms = await db.classrooms.find(
        {"teacher_id": user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    if not challenger_classrooms:
        raise HTTPException(status_code=400, detail="You need a classroom to challenge")
    
    challenger_classroom = challenger_classrooms[0]  # Use first classroom for now
    
    # Get opponent classroom
    opponent_classroom = await db.classrooms.find_one({"id": battle_data.opponent_classroom_id})
    if not opponent_classroom:
        raise HTTPException(status_code=404, detail="Opponent classroom not found")
    
    # Prevent a classroom from challenging itself
    if challenger_classroom["id"] == opponent_classroom["id"]:
        raise HTTPException(status_code=400, detail="Cannot challenge the same classroom")
    
    # Create battle
    new_battle = Battle(
        challenger_classroom_id=challenger_classroom["id"],
        challenger_classroom_name=challenger_classroom["name"],
        opponent_classroom_id=opponent_classroom["id"],
        opponent_classroom_name=opponent_classroom["name"],
        start_date=datetime.now(timezone.utc),
        end_date=datetime.now(timezone.utc) + timedelta(days=7),
        status="active"
    )
    
    battle_dict = new_battle.model_dump()
    battle_dict["start_date"] = battle_dict["start_date"].isoformat()
    battle_dict["end_date"] = battle_dict["end_date"].isoformat()
    battle_dict["created_at"] = battle_dict["created_at"].isoformat()
    await db.battles.insert_one(battle_dict)
    
    return new_battle

@api_router.get("/battles/classroom/{classroom_id}")
async def get_classroom_battles(classroom_id: str, request: Request):
    """Get all battles for a classroom"""
    user = await get_current_user(request)
    
    # Check access
    classroom = await db.classrooms.find_one({"id": classroom_id})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    # Get battles where this classroom is involved
    battles = await db.battles.find(
        {
            "$or": [
                {"challenger_classroom_id": classroom_id},
                {"opponent_classroom_id": classroom_id}
            ]
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Update scores for active battles
    for battle in battles:
        if battle["status"] == "active":
            # Calculate current scores using AVERAGE XP per student
            start_date = datetime.fromisoformat(battle["start_date"])
            
            # Get challenger team
            challenger_classroom = await db.classrooms.find_one({"id": battle["challenger_classroom_id"]})
            challenger_student_ids = challenger_classroom.get("students", [])
            
            # Calculate average XP for challenger team
            challenger_total_xp = 0
            challenger_count = len(challenger_student_ids)
            for student_id in challenger_student_ids:
                student = await db.users.find_one({"id": student_id})
                if student:
                    challenger_total_xp += student.get("xp", 0)
            
            challenger_avg_xp = challenger_total_xp // challenger_count if challenger_count > 0 else 0
            
            # Get opponent team
            opponent_classroom = await db.classrooms.find_one({"id": battle["opponent_classroom_id"]})
            opponent_student_ids = opponent_classroom.get("students", [])
            
            # Calculate average XP for opponent team
            opponent_total_xp = 0
            opponent_count = len(opponent_student_ids)
            for student_id in opponent_student_ids:
                student = await db.users.find_one({"id": student_id})
                if student:
                    opponent_total_xp += student.get("xp", 0)
            
            opponent_avg_xp = opponent_total_xp // opponent_count if opponent_count > 0 else 0
            
            battle["challenger_score"] = challenger_avg_xp
            battle["opponent_score"] = opponent_avg_xp
            battle["challenger_student_count"] = challenger_count
            battle["opponent_student_count"] = opponent_count
            
            # Check if battle ended
            if datetime.now(timezone.utc) > datetime.fromisoformat(battle["end_date"]):
                winner_id = battle["challenger_classroom_id"] if challenger_avg_xp > opponent_avg_xp else battle["opponent_classroom_id"]
                
                # Award prizes to winning team
                winner_students = challenger_student_ids if winner_id == battle["challenger_classroom_id"] else opponent_student_ids
                for student_id in winner_students:
                    await db.users.update_one(
                        {"id": student_id},
                        {
                            "$inc": {"coins": 200},
                            "$addToSet": {"owned_badges": "champion_team"}
                        }
                    )
                
                # Update battle status
                await db.battles.update_one(
                    {"id": battle["id"]},
                    {
                        "$set": {
                            "status": "completed",
                            "winner_id": winner_id,
                            "challenger_score": challenger_avg_xp,
                            "opponent_score": opponent_avg_xp
                        }
                    }
                )
                battle["status"] = "completed"
                battle["winner_id"] = winner_id
    
    return battles


# ----- PDF Notes Routes -----

@api_router.post("/notes")
async def create_note(note: PDFNoteCreate, request: Request):
    """Upload a new PDF note"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can upload notes")
    
    # Validate file size (25MB limit)
    if note.file_size > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 25MB limit")
    
    # Create note document
    pdf_note = PDFNote(
        title=note.title,
        description=note.description,
        chapter=note.chapter,
        category=note.category,
        resource_type=note.resource_type,
        file_data=note.file_data,
        file_size=note.file_size,
        creator_id=user["id"],
        creator_name=user["name"],
        is_shared=note.is_shared,
        tags=note.tags
    )
    
    note_dict = pdf_note.model_dump()
    note_dict["created_at"] = note_dict["created_at"].isoformat()
    
    await db.pdf_notes.insert_one(note_dict)
    
    return {"id": pdf_note.id, "message": "Note uploaded successfully"}


@api_router.get("/notes")
async def get_notes(
    request: Request,
    filter: Optional[str] = "all",  # "mine", "shared", "all"
    chapter: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """Get PDF notes with filters"""
    user = await get_current_user(request)
    
    query = {}
    
    # Role-based filtering
    if user["role"] == "student":
        # Students only see student resources
        query["resource_type"] = "student_resource"
    elif user["role"] == "teacher":
        # Filter by ownership/sharing for teachers
        if filter == "mine":
            query["creator_id"] = user["id"]
        elif filter == "shared":
            query["is_shared"] = True
        elif filter == "all":
            # Show user's own notes + shared notes
            query["$or"] = [
                {"creator_id": user["id"]},
                {"is_shared": True}
            ]
    
    # Additional filters
    if chapter:
        query["chapter"] = chapter
    if category:
        query["category"] = category
    if search:
        # Preserve existing $or if it exists, otherwise create new one
        if "$or" in query:
            # For complex queries, use $and to combine conditions
            existing_or = query.pop("$or")
            query["$and"] = [
                {"$or": existing_or},
                {
                    "$or": [
                        {"title": {"$regex": search, "$options": "i"}},
                        {"description": {"$regex": search, "$options": "i"}},
                        {"tags": {"$in": [search]}}
                    ]
                }
            ]
        else:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"tags": {"$in": [search]}}
            ]
    
    notes = await db.pdf_notes.find(query, {"_id": 0, "file_data": 0}).to_list(length=None)
    
    # Sort by created_at descending
    notes.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return notes


@api_router.get("/notes/{note_id}")
async def get_note_detail(note_id: str, request: Request):
    """Get specific note details including file data"""
    user = await get_current_user(request)
    
    note = await db.pdf_notes.find_one({"id": note_id}, {"_id": 0})
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Access control based on role and resource type
    if user["role"] == "student":
        # Students can only access student resources
        if note["resource_type"] != "student_resource":
            raise HTTPException(status_code=403, detail="You don't have access to this resource")
    elif user["role"] == "teacher":
        # Teachers can access: own notes OR shared notes OR student resources
        if note["creator_id"] != user["id"] and not note["is_shared"] and note["resource_type"] == "teacher_resource":
            raise HTTPException(status_code=403, detail="You don't have access to this note")
    
    return note


@api_router.put("/notes/{note_id}")
async def update_note(note_id: str, update: PDFNoteUpdate, request: Request):
    """Update note metadata"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update notes")
    
    # Check ownership
    note = await db.pdf_notes.find_one({"id": note_id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note["creator_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only update your own notes")
    
    # Build update dict
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if update_dict:
        await db.pdf_notes.update_one({"id": note_id}, {"$set": update_dict})
    
    updated_note = await db.pdf_notes.find_one({"id": note_id}, {"_id": 0, "file_data": 0})
    return updated_note


@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, request: Request):
    """Delete a note"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete notes")
    
    # Check ownership
    note = await db.pdf_notes.find_one({"id": note_id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note["creator_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own notes")
    
    await db.pdf_notes.delete_one({"id": note_id})
    
    return {"message": "Note deleted successfully"}


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


@app.on_event("startup")
async def initialize_admin_account():
    """Initialize or update admin account on startup"""
    try:
        admin_email = "astapp@spanola.net"
        user = await db.users.find_one({"email": admin_email})
        
        if user:
            # Update existing user to teacher/admin with password
            hashed_password = bcrypt.hashpw(
                "AlisaFaith$14".encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')
            
            await db.users.update_one(
                {"email": admin_email},
                {
                    "$set": {
                        "role": "teacher",
                        "is_admin": True,
                        "password": hashed_password
                    }
                }
            )
            logging.info(f"✅ Admin account promoted: {admin_email}")
        else:
            logging.info(f"ℹ️  Admin account not found yet: {admin_email}")
    except Exception as e:
        logging.error(f"Error initializing admin account: {str(e)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()