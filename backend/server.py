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
import pytz

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
    ],
    "backgrounds": [
        {"id": "sunset_gradient", "name": "Sunset Gradient 🌅", "price": 100, "preview": "linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #ff9ff3 100%)"},
        {"id": "ocean_wave", "name": "Ocean Wave 🌊", "price": 150, "preview": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"},
        {"id": "galaxy_space", "name": "Galaxy Space 🌌", "price": 200, "preview": "linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e22ce 100%)"},
        {"id": "forest_green", "name": "Forest Green 🌲", "price": 150, "preview": "linear-gradient(135deg, #134e5e 0%, #71b280 100%)"},
        {"id": "purple_dreams", "name": "Purple Dreams 💜", "price": 200, "preview": "linear-gradient(135deg, #c471ed 0%, #f64f59 100%)"},
    ],
    "pets": [
        {"id": "floating_cat", "name": "Floating Cat 🐱", "price": 300, "icon": "🐱", "animation": "float"},
        {"id": "flying_bird", "name": "Flying Bird 🐦", "price": 250, "icon": "🐦", "animation": "fly"},
        {"id": "swimming_fish", "name": "Swimming Fish 🐟", "price": 250, "icon": "🐟", "animation": "swim"},
        {"id": "snappy_alligator", "name": "Snappy Alligator 🐊", "price": 400, "icon": "🐊", "animation": "swim"},
        {"id": "speedy_shark", "name": "Speedy Shark 🦈", "price": 450, "icon": "🦈", "animation": "swim"},
        {"id": "peaceful_panda", "name": "Peaceful Panda 🐼", "price": 350, "icon": "🐼", "animation": "float"},
    ],
    "profile_frames": [
        {"id": "gold_border", "name": "Gold Border ✨", "price": 150, "style": "3px solid #FFD700"},
        {"id": "rainbow_glow", "name": "Rainbow Glow 🌈", "price": 200, "style": "3px solid transparent", "gradient": "linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)"},
        {"id": "star_frame", "name": "Star Frame ⭐", "price": 250, "style": "4px dashed #FFD700"},
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

async def update_school_record(user_id: str, school: str, district: str, role: str):
    """Update or create school record when user signs up"""
    if not school or not district:
        return
    
    # Find or create school
    school_record = await db.schools.find_one({"name": school, "district": district}, {"_id": 0})
    
    if not school_record:
        # Create new school
        new_school = School(
            name=school,
            district=district,
            teacher_ids=[user_id] if role == "teacher" else [],
            school_admin_ids=[user_id] if role == "school_admin" else [],
            teacher_count=1 if role == "teacher" else 0
        )
        school_dict = new_school.model_dump()
        school_dict["created_at"] = school_dict["created_at"].isoformat()
        await db.schools.insert_one(school_dict)
    else:
        # Update existing school
        update_data = {}
        if role == "teacher" and user_id not in school_record.get("teacher_ids", []):
            update_data["$addToSet"] = {"teacher_ids": user_id}
            update_data["$inc"] = {"teacher_count": 1}
        elif role == "school_admin" and user_id not in school_record.get("school_admin_ids", []):
            update_data["$addToSet"] = {"school_admin_ids": user_id}
        
        if update_data:
            await db.schools.update_one(
                {"name": school, "district": district},
                update_data
            )

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
    role: str  # "teacher", "student", or "school_admin"
    password: Optional[str] = None  # Hashed password for teacher accounts (optional, for non-OAuth teachers)
    is_admin: bool = False  # Admin flag for platform management
    district: Optional[str] = None  # School district name
    school: Optional[str] = None  # School name
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
    owned_backgrounds: List[str] = Field(default_factory=list)
    owned_pets: List[str] = Field(default_factory=list)
    owned_profile_frames: List[str] = Field(default_factory=list)
    active_theme: str = "default"
    active_badges: List[str] = Field(default_factory=list)
    active_background: str = ""
    active_pet: str = ""
    active_profile_frame: str = ""
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
    district: Optional[str] = None
    school: Optional[str] = None

class SchoolAdminSignupRequest(BaseModel):
    name: str
    email: str
    password: str
    school: str
    district: str
    job_title: str  # Principal, Assistant Principal, Administrator, etc.

class School(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    district: str
    email_domain: Optional[str] = None  # e.g., "@lincolnelem.edu"
    teacher_ids: List[str] = Field(default_factory=list)
    school_admin_ids: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    teacher_count: int = 0
    student_count: int = 0

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
    order: int = 0  # Position within lesson for drag-and-drop ordering
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
    # For library-based assignments
    problem_ids: List[str] = []  # References to Problem documents (empty for standalone)
    classroom_ids: List[str]  # Can be assigned to multiple classrooms
    # For standalone assignments
    starter_code: str = ""
    solution_code: str = ""
    expected_output: str = ""
    test_cases: List[dict] = []  # For custom test cases
    # Scheduling and rewards
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
    # For library-based assignments
    problem_ids: List[str] = []  # Multiple problems from library (optional for standalone)
    classroom_ids: List[str] = []  # Multiple classrooms (optional, can use classroom_id)
    classroom_id: Optional[str] = None  # Single classroom (for standalone assignments)
    # For standalone assignments
    starter_code: str = ""
    solution_code: str = ""
    expected_output: str = ""
    test_cases: List[dict] = []  # For standalone assignments with test cases
    # Scheduling and rewards
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
    order: int = 0  # Position within lesson for drag-and-drop ordering
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


# Competition Models
class Competition(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str  # "Week 1 Challenge"
    description: str = ""
    type: str = "class_vs_class"  # Future: "tournament", "team_battle"
    teacher_id: str  # Creator
    classroom_ids: List[str]  # Participating classes
    start_date: datetime
    end_date: datetime
    status: str = "upcoming"  # "upcoming", "active", "completed"
    min_problems_required: int = 10  # Minimum problems per student
    # Metrics
    primary_metric: str = "problems_solved"
    tiebreaker_metric: str = "xp_gained"
    # Results (populated after completion)
    winning_classroom_id: Optional[str] = None
    class_captains: dict = {}  # {classroom_id: {student_id, student_name, problems_solved}}
    mvcs: dict = {}  # {classroom_id: {student_id, student_name, xp_gained}}
    final_standings: List[dict] = []  # [{classroom_id, classroom_name, score, rank}]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompetitionCreate(BaseModel):
    title: str
    description: str = ""
    classroom_ids: List[str]
    start_date: str  # ISO format
    end_date: str  # ISO format
    min_problems_required: int = 10

# ==================== CHALLENGES ====================
class Challenge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    challenger_id: str
    challenger_name: str
    challenged_id: str
    challenged_name: str
    classroom_id: str
    problem_id: str
    status: str = "pending"  # "pending", "accepted", "declined", "in_progress", "completed"
    challenger_score: Optional[int] = None
    challenged_score: Optional[int] = None
    challenger_time: Optional[float] = None  # Seconds to complete
    challenged_time: Optional[float] = None
    winner_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class ChallengeCreate(BaseModel):
    challenged_id: str
    classroom_id: str

class ChallengeProblem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    starter_code: str
    solution_code: str
    test_cases: List[dict]
    difficulty: str = "medium"
    chapter: str = ""
    lesson: str = ""
    created_by: str
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
        oauth_session_url = os.environ.get('OAUTH_SESSION_URL', 'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data')
        response = requests.get(
            oauth_session_url,
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
        "active_badges": user.get("active_badges", []),
        "owned_backgrounds": user.get("owned_backgrounds", []),
        "owned_pets": user.get("owned_pets", []),
        "owned_profile_frames": user.get("owned_profile_frames", []),
        "active_background": user.get("active_background"),
        "active_pet": user.get("active_pet"),
        "active_profile_frame": user.get("active_profile_frame")
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

@api_router.post("/auth/school-admin-signup")
async def school_admin_signup(signup_data: SchoolAdminSignupRequest):
    """School admin signup - requires platform admin approval"""
    try:
        # Check if email already exists
        existing_user = await db.users.find_one({"email": signup_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Extract email domain
        email_domain = "@" + signup_data.email.split("@")[1] if "@" in signup_data.email else None
        
        # Hash password
        hashed_password = bcrypt.hashpw(
            signup_data.password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
        
        # Create pending school admin user
        user_id = str(uuid.uuid4())
        pending_admin = {
            "id": user_id,
            "email": signup_data.email,
            "name": signup_data.name,
            "password": hashed_password,
            "role": "school_admin",
            "school": signup_data.school,
            "district": signup_data.district,
            "job_title": signup_data.job_title,
            "email_domain": email_domain,
            "status": "pending_approval",  # pending_approval, approved, rejected
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_admin": False
        }
        
        await db.pending_school_admins.insert_one(pending_admin)
        
        return {
            "success": True,
            "message": "School admin request submitted! A platform administrator will review your request shortly."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"School admin signup error: {str(e)}")
        raise HTTPException(status_code=500, detail="Signup failed")

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
            "district": signup_data.district,
            "school": signup_data.school,
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
        
        # Update school record
        await update_school_record(user_id, signup_data.school, signup_data.district, "teacher")
        
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
        
        # Populate student details for teachers too (for challenges)
        for classroom in classrooms:
            student_ids = classroom.get("students", [])
            print(f"🔍 TEACHER: Classroom {classroom.get('name')}: Found {len(student_ids)} student IDs")
            students_details = []
            for student_id in student_ids:
                student = await db.users.find_one({"id": student_id}, {"_id": 0, "id": 1, "name": 1, "email": 1})
                if student:
                    print(f"✅ TEACHER: Found student: {student.get('name')}")
                    students_details.append(student)
                else:
                    print(f"❌ TEACHER: Student ID {student_id} not found")
            print(f"📝 TEACHER: Total students with details: {len(students_details)}")
            classroom["students"] = students_details
    else:
        # Students see active classrooms they're enrolled in
        classrooms = await db.classrooms.find(
            {"students": user["id"], "is_archived": {"$ne": True}},
            {"_id": 0}
        ).to_list(1000)
        
        # For students, fetch and include assignments AND student details
        for classroom in classrooms:
            assignments = await db.assignments.find(
                {"classroom_ids": classroom["id"]},
                {"_id": 0}
            ).to_list(1000)
            classroom["assignments"] = assignments
            
            # Populate student details for challenges
            student_ids = classroom.get("students", [])
            print(f"🔍 DEBUG: Classroom {classroom.get('name')}: Found {len(student_ids)} student IDs")
            print(f"🔍 DEBUG: Student IDs: {student_ids}")
            students_details = []
            for student_id in student_ids:
                print(f"🔍 DEBUG: Looking for student with ID: {student_id}")
                student = await db.users.find_one({"id": student_id}, {"_id": 0, "id": 1, "name": 1, "email": 1})
                if student:
                    print(f"✅ DEBUG: Found student: {student.get('name')} ({student.get('id')})")
                    students_details.append(student)
                else:
                    print(f"❌ DEBUG: Student ID {student_id} not found in users collection")
            print(f"📝 DEBUG: Total students with details: {len(students_details)}")
            print(f"📝 DEBUG: Students details: {students_details}")
            classroom["students"] = students_details
    
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


@api_router.delete("/problems/{problem_id}")
async def delete_problem(problem_id: str, request: Request):
    """Delete a problem from the library"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete library problems")
    
    # Check if problem exists
    existing = await db.problems.find_one({"id": problem_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check if problem is used in any assignments
    assignments_using_problem = await db.assignments.find_one({"problem_ids": problem_id})
    if assignments_using_problem:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete problem: it is used in one or more assignments. Please remove it from assignments first."
        )
    
    # Delete the problem
    await db.problems.delete_one({"id": problem_id})
    
    return {"message": "Problem deleted successfully"}


@api_router.put("/problems/{problem_id}/move")
async def move_problem(problem_id: str, data: dict, request: Request):
    """Move a problem to a different chapter/lesson and update order"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can move problems")
    
    # Get the problem
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Extract new location and order
    new_chapter = data.get("chapter", problem.get("chapter", ""))
    new_lesson = data.get("lesson", problem.get("lesson", ""))
    new_order = data.get("order", 0)
    
    # Update the problem
    await db.problems.update_one(
        {"id": problem_id},
        {"$set": {
            "chapter": new_chapter,
            "lesson": new_lesson,
            "order": new_order
        }}
    )
    
    return {"success": True, "message": "Problem moved successfully"}



@api_router.post("/assignments")
async def create_assignment(assignment: AssignmentCreate, request: Request):
    """Create a new assignment (library-based with multiple problems OR standalone with test cases)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create assignments")
    
    # Handle classroom_id or classroom_ids
    classroom_ids = assignment.classroom_ids if assignment.classroom_ids else []
    if assignment.classroom_id:
        classroom_ids.append(assignment.classroom_id)
    
    if not classroom_ids:
        raise HTTPException(status_code=400, detail="At least one classroom is required")
    
    # Verify teacher owns all classrooms
    for classroom_id in classroom_ids:
        classroom = await db.classrooms.find_one({"id": classroom_id})
        if not classroom or classroom["teacher_id"] != user["id"]:
            raise HTTPException(status_code=403, detail=f"You don't have access to classroom {classroom_id}")
    
    # Verify all problems exist (for library-based assignments)
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
        classroom_ids=classroom_ids,
        starter_code=assignment.starter_code,
        solution_code=assignment.solution_code,
        expected_output=assignment.expected_output,
        test_cases=assignment.test_cases,
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
    
    # Increment times_imported counter for each problem (library-based only)
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

def normalize_output(output: str) -> str:
    """Normalize output for consistent comparison"""
    if not output:
        return ""
    
    # Normalize line endings
    output = output.replace('\r\n', '\n').replace('\r', '\n')
    
    # Strip leading/trailing whitespace from each line
    lines = [line.rstrip() for line in output.split('\n')]
    
    # Remove trailing empty lines
    while lines and not lines[-1]:
        lines.pop()
    
    # Remove leading empty lines
    while lines and not lines[0]:
        lines.pop(0)
    
    # Join back and ensure consistent spacing
    return '\n'.join(lines)


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
    try:
        available_date = datetime.fromisoformat(assignment["available_date"]) if assignment.get("available_date") else None
    except (ValueError, TypeError) as e:
        logging.warning(f"Invalid available_date format: {assignment.get('available_date')}")
        available_date = None
    
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
    
    try:
        if total_tests > 0:
            # Traditional test case evaluation
            for test_case in assignment["test_cases"]:
                result = run_python_code(submission.code, test_case.get("input_data", ""))
                expected = normalize_output(test_case.get("expected_output", ""))
                actual = normalize_output(result["output"]) if result["success"] else ""
                
                passed = result["success"] and actual == expected
                if passed:
                    passed_tests += 1
            
                test_results.append({
                    "test_id": test_case.get("id", "test"),
                    "description": test_case.get("description", "Test case"),
                    "passed": passed,
                    "expected": expected,
                    "actual": actual,
                    "error": result.get("error")
                })
        
            base_score = (passed_tests / total_tests) * 100
        else:
            # No test cases - compare outputs directly
            solution_result = run_python_code(problem.get("solution_code", ""), "")
            student_result = run_python_code(submission.code, "")
            
            solution_output = normalize_output(solution_result["output"]) if solution_result["success"] else ""
            student_output = normalize_output(student_result["output"]) if student_result["success"] else ""
            
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
    except Exception as e:
        logging.error(f"Error during test evaluation: {str(e)}")
        # Fallback: give partial credit and basic feedback
        base_score = 50
        passed_tests = 0
        total_tests = 1
        test_results = [{
            "test_id": "evaluation_error",
            "description": "Error during evaluation",
            "passed": False,
            "expected": "N/A",
            "actual": "Evaluation error occurred",
            "error": str(e)
        }]
    
    # AI Evaluation for partial credit and feedback
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    chat = LlmChat(
        api_key=llm_key,
        session_id=f"submission_{submission.assignment_id}_{user['id']}",
        system_message="You are a coding instructor evaluating student Python code submissions. Provide constructive feedback and award partial credit. Be consistent in your evaluations - the same code should receive the same score."
    ).with_model("openai", "gpt-4o")
    
    if total_tests > 0 and len(assignment.get("test_cases", [])) > 0:
        # Traditional test case prompt
        prompt = f"""
Evaluate this Python code submission consistently and objectively:

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

EVALUATION CRITERIA:
1. Start with the base score ({base_score}%) from test results
2. Award partial credit for:
   - Correct logic even if output format is slightly off
   - Proper use of Python syntax and best practices
   - Close attempts that show understanding
3. Deduct points for:
   - Incorrect logic or approach
   - Syntax errors or poor code quality
   - Missing key functionality

IMPORTANT: 
- Be consistent: Same code = same score
- Focus on correctness and logic, not style preferences
- If output matches but formatting differs slightly, give full credit
- Don't penalize for extra/missing whitespace, quotes, or escape characters if the content is correct
- Provide specific, actionable feedback

Format your response as JSON:
{{
  "score": <number 0-100>,
  "feedback": "<2-3 sentences with specific guidance>"
}}
"""
    else:
        # Simple comparison prompt
        prompt = f"""
Evaluate this Python code submission consistently and objectively:

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

EVALUATION CRITERIA:
1. Start with base score: {base_score}%
2. Award full credit if:
   - Output content matches (ignore minor formatting differences)
   - Logic is correct and produces the right result
3. Award partial credit for:
   - Correct approach but minor output differences
   - Proper Python syntax and logic
   - Close attempts showing understanding
4. Deduct points for:
   - Incorrect logic or completely wrong output
   - Syntax errors or broken code

IMPORTANT:
- Be consistent: Same code = same score
- Don't penalize for whitespace, quotes, or escape characters if content is correct
- Focus on whether the student solved the problem correctly
- Provide specific, actionable feedback

Format your response as JSON:
{{
  "score": <number 0-100>,
  "feedback": "<2-3 sentences with specific guidance>"
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

@api_router.post("/admin/fix-student-account")
async def fix_student_account(data: dict, request: Request):
    """Fix student account - refund coins and add purchased items (admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    student_email = data.get("student_email")
    coins_to_add = data.get("coins_to_add", 0)
    items_to_add = data.get("items", {})  # {"backgrounds": ["id1"], "pets": ["id2"]}
    
    student = await db.users.find_one({"email": student_email})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    updates = {}
    if coins_to_add > 0:
        updates["$inc"] = {"coins": coins_to_add}
    
    if items_to_add:
        push_updates = {}
        if "backgrounds" in items_to_add:
            push_updates["owned_backgrounds"] = {"$each": items_to_add["backgrounds"]}
        if "pets" in items_to_add:
            push_updates["owned_pets"] = {"$each": items_to_add["pets"]}
        if "profile_frames" in items_to_add:
            push_updates["owned_profile_frames"] = {"$each": items_to_add["profile_frames"]}
        
        if push_updates:
            updates["$push"] = push_updates
    
    if updates:
        await db.users.update_one({"email": student_email}, updates)
    
    return {"success": True, "message": "Account fixed"}


@api_router.get("/admin/invite-codes")
async def get_invite_codes(request: Request):
    """Get all invite codes (admin only)"""
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR in get_invite_codes: {str(e)}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@api_router.get("/admin/stats")
async def get_admin_stats(request: Request):
    """Get platform statistics (admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Count users
        total_teachers = await db.users.count_documents({"role": "teacher"})
        total_students = await db.users.count_documents({"role": "student"})
        
        # Count classrooms
        total_classrooms = await db.classrooms.count_documents({})
        
        # Count assignments
        total_assignments = await db.assignments.count_documents({})
        
        # Count submissions
        total_submissions = await db.submissions.count_documents({})
        
        # Active users (last 7 days) - use a safe approach
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        try:
            active_users = await db.sessions.count_documents({
                "created_at": {"$gte": seven_days_ago}
            })
        except Exception:
            # Fallback if sessions collection doesn't exist
            active_users = 0
        
        return {
            "total_teachers": total_teachers,
            "total_students": total_students,
            "total_classrooms": total_classrooms,
            "total_assignments": total_assignments,
            "total_submissions": total_submissions,
            "active_users_7d": active_users
        }
    except Exception as e:
        logging.error(f"Error fetching admin stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")

@api_router.get("/admin/teachers")
async def get_all_teachers(request: Request):
    """Get all teachers with stats (admin only)"""
    try:
        user = await get_current_user(request)
        
        if not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        teachers = await db.users.find({"role": "teacher"}, {"_id": 0, "password": 0}).to_list(1000)
        
        # Enrich with stats
        for teacher in teachers:
            try:
                # Count classrooms
                teacher["classroom_count"] = await db.classrooms.count_documents({"teacher_id": teacher["id"]})
                
                # Count assignments created
                teacher["assignment_count"] = await db.assignments.count_documents({"teacher_id": teacher["id"]})
            except Exception as e:
                logging.error(f"Error enriching teacher {teacher.get('id')}: {e}")
                teacher["classroom_count"] = 0
                teacher["assignment_count"] = 0
        
        # Sort by email to avoid datetime issues
        teachers.sort(key=lambda t: t.get("email", ""), reverse=False)
        
        return teachers
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ERROR in get_all_teachers: {str(e)}")
        logging.error(f"ERROR type: {type(e).__name__}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

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

# ==================== SCHOOL ADMIN MANAGEMENT ====================

@api_router.get("/admin/pending-school-admins")
async def get_pending_school_admins(request: Request):
    """Get all pending school admin requests (Platform admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    pending = await db.pending_school_admins.find(
        {"status": "pending_approval"},
        {"_id": 0}
    ).to_list(length=None)
    
    return pending

@api_router.post("/admin/approve-school-admin/{user_id}")
async def approve_school_admin(user_id: str, request: Request):
    """Approve a pending school admin (Platform admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get pending admin
    pending = await db.pending_school_admins.find_one({"id": user_id}, {"_id": 0})
    if not pending:
        raise HTTPException(status_code=404, detail="Pending request not found")
    
    # Create actual user account
    new_user = {
        "id": pending["id"],
        "email": pending["email"],
        "name": pending["name"],
        "password": pending["password"],
        "role": "school_admin",
        "school": pending["school"],
        "district": pending["district"],
        "job_title": pending["job_title"],
        "is_admin": False,
        "created_at": pending["created_at"],
        "approved_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    # Update school record
    await update_school_record(user_id, pending["school"], pending["district"], "school_admin")
    
    # Update pending status
    await db.pending_school_admins.update_one(
        {"id": user_id},
        {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "School admin approved"}

@api_router.post("/admin/reject-school-admin/{user_id}")
async def reject_school_admin(user_id: str, request: Request):
    """Reject a pending school admin (Platform admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Update pending status
    result = await db.pending_school_admins.update_one(
        {"id": user_id},
        {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Pending request not found")
    
    return {"success": True, "message": "School admin request rejected"}

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
    try:
        user = await get_current_user(request)
        
        item_type = item_data.get("type")
        item_id = item_data.get("item_id")
        
        logging.info(f"Purchase attempt: user={user['id']}, type={item_type}, item={item_id}")
        
        if item_type not in SHOP_ITEMS:
            raise HTTPException(status_code=400, detail=f"Invalid item type: {item_type}")
        
        # Find item
        item = next((i for i in SHOP_ITEMS[item_type] if i["id"] == item_id), None)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Check if user has enough coins
        user_coins = user.get("coins", 0)
        if user_coins < item["price"]:
            raise HTTPException(status_code=400, detail="Not enough coins")
        
        # Check if already owned
        owned_field_map = {
            "themes": "owned_themes",
            "badges": "owned_badges",
            "backgrounds": "owned_backgrounds",
            "pets": "owned_pets",
            "profile_frames": "owned_profile_frames"
        }
        owned_field = owned_field_map.get(item_type)
        if not owned_field:
            raise HTTPException(status_code=400, detail=f"Unknown item type mapping: {item_type}")
            
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
        
        logging.info(f"Purchase successful: user={user['id']}, item={item_id}, remaining_coins={user_coins - item['price']}")
        
        return {"success": True, "item": item, "remaining_coins": user_coins - item["price"]}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Purchase error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/profile/customize")
async def customize_profile(customization: dict, request: Request):
    """Customize user profile (active theme/badges/background/pet/frame)"""
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
    
    if "active_background" in customization:
        background_id = customization["active_background"]
        if background_id in user.get("owned_backgrounds", []) or background_id == "":
            updates["active_background"] = background_id
    
    if "active_pet" in customization:
        pet_id = customization["active_pet"]
        if pet_id in user.get("owned_pets", []) or pet_id == "":
            updates["active_pet"] = pet_id
    
    if "active_profile_frame" in customization:
        frame_id = customization["active_profile_frame"]
        if frame_id in user.get("owned_profile_frames", []) or frame_id == "":
            updates["active_profile_frame"] = frame_id
    
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


# ----- Multiple Choice Testing Routes -----

@api_router.post("/mc-questions")
async def create_mc_question(question: MCQuestionCreate, request: Request):
    """Create a multiple choice question"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create questions")
    
    mc_question = MCQuestion(
        question_text=question.question_text,
        choice_a=question.choice_a,
        choice_b=question.choice_b,
        choice_c=question.choice_c,
        choice_d=question.choice_d,
        correct_answer=question.correct_answer.upper(),
        chapter=question.chapter,
        lesson=question.lesson,
        difficulty=question.difficulty,
        creator_id=user["id"],
        creator_name=user["name"]
    )
    
    question_dict = mc_question.model_dump()
    question_dict["created_at"] = question_dict["created_at"].isoformat()
    
    await db.mc_questions.insert_one(question_dict)
    
    return {"id": mc_question.id, "message": "Question created successfully"}


@api_router.post("/mc-questions/bulk-upload")
async def bulk_upload_questions(data: dict, request: Request):
    """Bulk upload questions from CSV"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can upload questions")
    
    questions_data = data.get("questions", [])
    if not questions_data:
        raise HTTPException(status_code=400, detail="No questions provided")
    
    created_count = 0
    errors = []
    
    for idx, row in enumerate(questions_data):
        try:
            # Validate required fields
            if not all([row.get("question_text"), row.get("choice_a"), row.get("choice_b"), 
                       row.get("choice_c"), row.get("choice_d"), row.get("correct_answer")]):
                errors.append(f"Row {idx + 1}: Missing required fields")
                continue
            
            # Create question
            mc_question = MCQuestion(
                question_text=row.get("question_text", ""),
                choice_a=row.get("choice_a", ""),
                choice_b=row.get("choice_b", ""),
                choice_c=row.get("choice_c", ""),
                choice_d=row.get("choice_d", ""),
                correct_answer=row.get("correct_answer", "A").upper(),
                chapter=row.get("chapter", ""),
                lesson=row.get("lesson", ""),
                difficulty=row.get("difficulty", "Easy"),
                creator_id=user["id"],
                creator_name=user["name"]
            )
            
            question_dict = mc_question.model_dump()
            question_dict["created_at"] = question_dict["created_at"].isoformat()
            
            await db.mc_questions.insert_one(question_dict)
            created_count += 1
            
        except Exception as e:
            errors.append(f"Row {idx + 1}: {str(e)}")
    
    return {
        "created": created_count,
        "errors": errors,
        "message": f"Created {created_count} questions" + (f" with {len(errors)} errors" if errors else "")
    }


@api_router.get("/mc-questions")
async def get_mc_questions(
    request: Request,
    chapter: Optional[str] = None,
    lesson: Optional[str] = None,
    difficulty: Optional[str] = None
):
    """Get all MC questions for current teacher"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access questions")
    
    query = {"creator_id": user["id"]}
    
    if chapter:
        query["chapter"] = chapter
    if lesson:
        query["lesson"] = lesson
    if difficulty:
        query["difficulty"] = difficulty
    
    questions = await db.mc_questions.find(query, {"_id": 0}).to_list(length=None)
    
    return questions


@api_router.put("/mc-questions/{question_id}")
async def update_mc_question(question_id: str, question: MCQuestionCreate, request: Request):
    """Update an MC question"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update questions")
    
    existing = await db.mc_questions.find_one({"id": question_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if existing["creator_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.mc_questions.update_one(
        {"id": question_id},
        {"$set": question.model_dump()}
    )
    
    return {"message": "Question updated successfully"}


@api_router.delete("/mc-questions/{question_id}")
async def delete_mc_question(question_id: str, request: Request):
    """Delete an MC question"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete questions")
    
    existing = await db.mc_questions.find_one({"id": question_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if existing["creator_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.mc_questions.delete_one({"id": question_id})
    
    return {"message": "Question deleted successfully"}


@api_router.put("/mc-questions/{question_id}/move")
async def move_mc_question(question_id: str, data: dict, request: Request):
    """Move an MC question to a different chapter/lesson and update order"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can move questions")
    
    # Get the question
    question = await db.mc_questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if question["creator_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Extract new location and order
    new_chapter = data.get("chapter", question.get("chapter", ""))
    new_lesson = data.get("lesson", question.get("lesson", ""))
    new_order = data.get("order", 0)
    
    # Update the question
    await db.mc_questions.update_one(
        {"id": question_id},
        {"$set": {
            "chapter": new_chapter,
            "lesson": new_lesson,
            "order": new_order
        }}
    )
    
    return {"success": True, "message": "Question moved successfully"}



@api_router.post("/mc-tests")
async def create_mc_test(test: MCTestCreate, request: Request):
    """Create and assign a multiple choice test"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create tests")
    
    # Validate that teacher owns all questions
    for q_id in test.question_pool_ids:
        question = await db.mc_questions.find_one({"id": q_id})
        if not question or question["creator_id"] != user["id"]:
            raise HTTPException(status_code=400, detail=f"Invalid question ID: {q_id}")
    
    # Validate num_questions <= pool size
    if test.num_questions > len(test.question_pool_ids):
        raise HTTPException(status_code=400, detail="Number of questions exceeds pool size")
    
    # Parse dates (assume input is Central Time, store as UTC)
    central = pytz.timezone('America/Chicago')
    available_date = None
    due_date = None
    if test.available_date:
        # Parse as naive datetime, localize to Central, convert to UTC
        naive_dt = datetime.fromisoformat(test.available_date.replace('Z', ''))
        central_dt = central.localize(naive_dt)
        available_date = central_dt.astimezone(timezone.utc)
    if test.due_date:
        naive_dt = datetime.fromisoformat(test.due_date.replace('Z', ''))
        central_dt = central.localize(naive_dt)
        due_date = central_dt.astimezone(timezone.utc)
    
    mc_test = MCTest(
        title=test.title,
        description=test.description,
        chapter=test.chapter,
        lesson=test.lesson,
        teacher_id=user["id"],
        question_pool_ids=test.question_pool_ids,
        num_questions=test.num_questions,
        time_limit_minutes=test.time_limit_minutes,
        classroom_ids=test.classroom_ids,
        available_date=available_date,
        due_date=due_date
    )
    
    test_dict = mc_test.model_dump()
    test_dict["created_at"] = test_dict["created_at"].isoformat()
    if test_dict.get("available_date"):
        test_dict["available_date"] = test_dict["available_date"].isoformat()
    if test_dict.get("due_date"):
        test_dict["due_date"] = test_dict["due_date"].isoformat()
    
    await db.mc_tests.insert_one(test_dict)
    
    return {"id": mc_test.id, "message": "Test created successfully"}


@api_router.get("/mc-tests")
async def get_all_mc_tests(request: Request):
    """Get all tests created by the teacher"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view tests")
    
    tests = await db.mc_tests.find(
        {"teacher_id": user["id"]},
        {"_id": 0}
    ).to_list(length=None)
    
    return tests


@api_router.get("/mc-tests/classroom/{classroom_id}")
async def get_classroom_tests(classroom_id: str, request: Request):
    """Get all tests for a classroom"""
    user = await get_current_user(request)
    
    # Verify classroom access
    classroom = await db.classrooms.find_one({"id": classroom_id})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    if user["role"] == "teacher":
        if classroom["teacher_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        # Teachers see all tests
        tests = await db.mc_tests.find(
            {"classroom_ids": classroom_id},
            {"_id": 0}
        ).to_list(length=None)
    else:
        if user["id"] not in classroom.get("students", []):
            raise HTTPException(status_code=403, detail="Access denied")
        # Students only see available tests (based on available_date)
        now_utc = datetime.now(timezone.utc)
        all_tests = await db.mc_tests.find(
            {"classroom_ids": classroom_id},
            {"_id": 0}
        ).to_list(length=None)
        
        tests = []
        for test in all_tests:
            # Include test if no available_date or if it's past the available_date
            if not test.get("available_date"):
                tests.append(test)
            else:
                available_dt = datetime.fromisoformat(test["available_date"])
                if now_utc >= available_dt:
                    tests.append(test)
    
    return tests


@api_router.get("/mc-tests/{test_id}/start")
async def start_mc_test(test_id: str, request: Request):
    """Start a test - get randomized questions"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can take tests")
    
    # Get test
    test = await db.mc_tests.find_one({"id": test_id})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Check if already completed
    existing_attempt = await db.mc_test_attempts.find_one({
        "test_id": test_id,
        "student_id": user["id"],
        "is_complete": True
    })
    if existing_attempt:
        raise HTTPException(status_code=400, detail="Test already completed")
    
    # Randomly select questions
    import random
    selected_question_ids = random.sample(test["question_pool_ids"], test["num_questions"])
    
    # Get full question data and randomize choices
    questions_data = []
    randomized_choices = {}
    
    for q_id in selected_question_ids:
        question = await db.mc_questions.find_one({"id": q_id}, {"_id": 0})
        if question:
            # Create list of choices with their original letters
            all_choices = [
                {"letter": "A", "text": question["choice_a"]},
                {"letter": "B", "text": question["choice_b"]},
                {"letter": "C", "text": question["choice_c"]},
                {"letter": "D", "text": question["choice_d"]}
            ]
            
            # Shuffle the choices
            random.shuffle(all_choices)
            
            # Store which original letter is at each position for grading
            randomized_choices[q_id] = [choice["letter"] for choice in all_choices]
            
            # Send just the text in randomized order
            questions_data.append({
                "id": q_id,
                "question_text": question["question_text"],
                "choices": [choice["text"] for choice in all_choices]  # Just array of text
            })
    
    # Create attempt record
    attempt = MCTestAttempt(
        test_id=test_id,
        student_id=user["id"],
        randomized_question_ids=selected_question_ids,
        randomized_choices=randomized_choices,
        student_answers={},
        score=0.0,
        is_complete=False
    )
    
    attempt_dict = attempt.model_dump()
    attempt_dict["submitted_at"] = attempt_dict["submitted_at"].isoformat()
    
    await db.mc_test_attempts.insert_one(attempt_dict)
    
    return {
        "attempt_id": attempt.id,
        "test_title": test["title"],
        "test_description": test["description"],
        "time_limit_minutes": test["time_limit_minutes"],
        "num_questions": len(questions_data),
        "questions": questions_data
    }


@api_router.post("/mc-tests/{test_id}/submit")
async def submit_mc_test(test_id: str, submission: MCTestSubmission, request: Request):
    """Submit test answers and get score"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can submit tests")
    
    # Get the attempt
    attempt = await db.mc_test_attempts.find_one({
        "test_id": test_id,
        "student_id": user["id"],
        "is_complete": False
    })
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Test attempt not found or already completed")
    
    # Grade the test
    correct_count = 0
    total_questions = len(attempt["randomized_question_ids"])
    
    logging.info(f"🔍 DEBUG: Grading test for student {user['id']}")
    logging.info(f"📊 Total questions: {total_questions}")
    logging.info(f"📝 Submission answers: {submission.answers}")
    
    for q_id in attempt["randomized_question_ids"]:
        question = await db.mc_questions.find_one({"id": q_id})
        if question:
            student_answer = submission.answers.get(q_id, "")
            logging.info(f"\n📝 Question ID: {q_id}")
            logging.info(f"   Student answer (raw): '{student_answer}' (type: {type(student_answer).__name__})")
            
            # Student answer is now a position index (0, 1, 2, 3) as a string
            # Get the randomized choice order for this question
            randomized_order = attempt["randomized_choices"].get(q_id, ["A", "B", "C", "D"])
            logging.info(f"   Randomized order: {randomized_order}")
            logging.info(f"   Original correct answer: {question['correct_answer']}")
            
            # Convert student's position to the actual original letter
            try:
                position = int(student_answer)
                logging.info(f"   Position (converted): {position}")
                if 0 <= position < len(randomized_order):
                    actual_original_letter = randomized_order[position]
                    logging.info(f"   Actual original letter at position {position}: {actual_original_letter}")
                    
                    if actual_original_letter == question["correct_answer"]:
                        correct_count += 1
                        logging.info(f"   ✅ CORRECT! {actual_original_letter} == {question['correct_answer']}")
                    else:
                        logging.info(f"   ❌ WRONG! {actual_original_letter} != {question['correct_answer']}")
                else:
                    logging.info(f"   ⚠️ Position {position} out of range")
            except (ValueError, TypeError) as e:
                logging.info(f"   ⚠️ Error converting answer: {e}")
    
    score = (correct_count / total_questions * 100) if total_questions > 0 else 0
    logging.info(f"\n🎯 Final score: {correct_count}/{total_questions} = {score}%")
    
    score = (correct_count / total_questions * 100) if total_questions > 0 else 0
    
    # Update attempt
    await db.mc_test_attempts.update_one(
        {"id": attempt["id"]},
        {
            "$set": {
                "student_answers": submission.answers,
                "score": score,
                "is_complete": True,
                "submitted_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "score": round(score, 1),
        "message": "Test submitted successfully"
    }


@api_router.get("/mc-tests/{test_id}/results")
async def get_test_results(test_id: str, request: Request):
    """Get test results for teacher or student"""
    user = await get_current_user(request)
    
    test = await db.mc_tests.find_one({"id": test_id})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if user["role"] == "teacher":
        # Teacher gets all student results
        if test["teacher_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        attempts = await db.mc_test_attempts.find(
            {"test_id": test_id, "is_complete": True},
            {"_id": 0}
        ).to_list(length=None)
        
        return {"results": attempts}
    else:
        # Student gets only their result
        attempt = await db.mc_test_attempts.find_one({
            "test_id": test_id,
            "student_id": user["id"],
            "is_complete": True
        }, {"_id": 0})
        
        if not attempt:
            return {"score": None, "message": "Test not completed"}
        
        return {"score": attempt["score"]}


# ==================== STUDENT CHALLENGES ====================

@api_router.post("/challenges")
async def create_challenge(challenge_data: ChallengeCreate, request: Request):
    """Create a new student-to-student challenge"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can create challenges")
    
    # Get challenger and challenged user details
    challenger = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    challenged = await db.users.find_one({"id": challenge_data.challenged_id}, {"_id": 0})
    
    if not challenged:
        raise HTTPException(status_code=404, detail="Challenged student not found")
    
    if challenged["id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot challenge yourself")
    
    # Verify both students share at least one classroom (can be different classes)
    challenger_classrooms = await db.classrooms.find(
        {"students": user["id"]},
        {"_id": 0, "id": 1}
    ).to_list(length=None)
    
    challenged_classrooms = await db.classrooms.find(
        {"students": challenged["id"]},
        {"_id": 0, "id": 1}
    ).to_list(length=None)
    
    challenger_classroom_ids = [c["id"] for c in challenger_classrooms]
    challenged_classroom_ids = [c["id"] for c in challenged_classrooms]
    
    # Find common classrooms
    common_classrooms = list(set(challenger_classroom_ids) & set(challenged_classroom_ids))
    
    if not common_classrooms:
        raise HTTPException(status_code=403, detail="You must share at least one classroom with this student")
    
    # Use the first common classroom or the specified one
    if challenge_data.classroom_id in common_classrooms:
        classroom_id = challenge_data.classroom_id
    else:
        classroom_id = common_classrooms[0]
    
    # Get a random problem from challenge pool
    challenge_problems = await db.challenge_problems.find({}, {"_id": 0}).to_list(length=None)
    if not challenge_problems:
        raise HTTPException(status_code=400, detail="No challenge problems available. Please contact your teacher.")
    
    import random
    problem = random.choice(challenge_problems)
    
    # Create challenge
    new_challenge = Challenge(
        challenger_id=user["id"],
        challenger_name=challenger["name"],
        challenged_id=challenged["id"],
        challenged_name=challenged["name"],
        classroom_id=classroom_id,
        problem_id=problem["id"]
    )
    
    challenge_dict = new_challenge.model_dump()
    challenge_dict["created_at"] = challenge_dict["created_at"].isoformat()
    
    await db.challenges.insert_one(challenge_dict)
    
    return {"success": True, "challenge_id": new_challenge.id}


@api_router.get("/challenges")
async def get_challenges(request: Request):
    """Get all challenges for the current user"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can view challenges")
    
    # Get challenges where user is challenger or challenged
    challenges = await db.challenges.find({
        "$or": [
            {"challenger_id": user["id"]},
            {"challenged_id": user["id"]}
        ]
    }, {"_id": 0}).sort("created_at", -1).to_list(length=None)
    
    return challenges


@api_router.post("/challenges/{challenge_id}/accept")
async def accept_challenge(challenge_id: str, request: Request):
    """Accept a challenge"""
    user = await get_current_user(request)
    
    challenge = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if challenge["challenged_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the challenged student can accept")
    
    if challenge["status"] != "pending":
        raise HTTPException(status_code=400, detail="Challenge already responded to")
    
    await db.challenges.update_one(
        {"id": challenge_id},
        {"$set": {
            "status": "accepted",
            "accepted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True}


@api_router.post("/challenges/{challenge_id}/decline")
async def decline_challenge(challenge_id: str, request: Request):
    """Decline a challenge (🐔)"""
    user = await get_current_user(request)
    
    challenge = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if challenge["challenged_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the challenged student can decline")
    
    if challenge["status"] != "pending":
        raise HTTPException(status_code=400, detail="Challenge already responded to")
    
    await db.challenges.update_one(
        {"id": challenge_id},
        {"$set": {"status": "declined"}}
    )
    
    return {"success": True, "chicken": "🐔"}


@api_router.get("/challenges/{challenge_id}/start")
async def start_challenge(challenge_id: str, request: Request):
    """Start a challenge and get the problem"""
    user = await get_current_user(request)
    
    challenge = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if user["id"] not in [challenge["challenger_id"], challenge["challenged_id"]]:
        raise HTTPException(status_code=403, detail="Not a participant in this challenge")
    
    if challenge["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Challenge must be accepted first")
    
    # Get the problem
    problem = await db.challenge_problems.find_one({"id": challenge["problem_id"]}, {"_id": 0})
    if not problem:
        raise HTTPException(status_code=404, detail="Challenge problem not found")
    
    # Mark as in progress
    await db.challenges.update_one(
        {"id": challenge_id},
        {"$set": {"status": "in_progress"}}
    )
    
    return {
        "challenge": challenge,
        "problem": {
            "id": problem["id"],
            "title": problem["title"],
            "description": problem["description"],
            "starter_code": problem["starter_code"]
        }
    }


@api_router.post("/challenges/{challenge_id}/submit")
async def submit_challenge(challenge_id: str, submission_data: dict, request: Request):
    """Submit solution to a challenge"""
    user = await get_current_user(request)
    
    challenge = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if user["id"] not in [challenge["challenger_id"], challenge["challenged_id"]]:
        raise HTTPException(status_code=403, detail="Not a participant in this challenge")
    
    # Get the problem
    problem = await db.challenge_problems.find_one({"id": challenge["problem_id"]}, {"_id": 0})
    if not problem:
        raise HTTPException(status_code=404, detail="Challenge problem not found")
    
    # Run test cases
    code = submission_data.get("code", "")
    completion_time = submission_data.get("time", 0)  # Time in seconds
    
    test_results = []
    passed_tests = 0
    total_tests = len(problem.get("test_cases", []))
    
    for test_case in problem["test_cases"]:
        result = run_python_code(code, test_case.get("input_data", ""))
        expected = normalize_output(test_case.get("expected_output", ""))
        actual = normalize_output(result.get("output", ""))
        passed = expected == actual and result.get("error") is None
        
        if passed:
            passed_tests += 1
        
        test_results.append({
            "input": test_case.get("input_data", ""),
            "expected": expected,
            "actual": actual,
            "passed": passed
        })
    
    score = int((passed_tests / total_tests * 100)) if total_tests > 0 else 0
    
    # Update challenge with score
    is_challenger = user["id"] == challenge["challenger_id"]
    update_data = {
        "challenger_score" if is_challenger else "challenged_score": score,
        "challenger_time" if is_challenger else "challenged_time": completion_time
    }
    
    await db.challenges.update_one({"id": challenge_id}, {"$set": update_data})
    
    # Check if both have submitted to determine winner
    updated_challenge = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
    if updated_challenge["challenger_score"] is not None and updated_challenge["challenged_score"] is not None:
        # Both submitted, determine winner
        c_score = updated_challenge["challenger_score"]
        d_score = updated_challenge["challenged_score"]
        c_time = updated_challenge["challenger_time"] or 999999
        d_time = updated_challenge["challenged_time"] or 999999
        
        if c_score > d_score:
            winner_id = updated_challenge["challenger_id"]
        elif d_score > c_score:
            winner_id = updated_challenge["challenged_id"]
        else:
            # Tie on score, use time as tiebreaker
            winner_id = updated_challenge["challenger_id"] if c_time < d_time else updated_challenge["challenged_id"]
        
        await db.challenges.update_one(
            {"id": challenge_id},
            {"$set": {
                "status": "completed",
                "winner_id": winner_id,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {
        "score": score,
        "passed_tests": passed_tests,
        "total_tests": total_tests,
        "test_results": test_results,
        "completion_time": completion_time
    }


@api_router.get("/challenges/{challenge_id}/results")
async def get_challenge_results(challenge_id: str, request: Request):
    """Get challenge results"""
    user = await get_current_user(request)
    
    challenge = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if user["id"] not in [challenge["challenger_id"], challenge["challenged_id"]]:
        raise HTTPException(status_code=403, detail="Not a participant in this challenge")
    
    return challenge


# ==================== CHALLENGE POOL MANAGEMENT ====================

@api_router.post("/challenge-problems")
async def create_challenge_problem(problem_data: dict, request: Request):
    """Create a new challenge problem (teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create challenge problems")
    
    new_problem = ChallengeProblem(
        title=problem_data["title"],
        description=problem_data["description"],
        starter_code=problem_data.get("starter_code", ""),
        solution_code=problem_data["solution_code"],
        test_cases=problem_data["test_cases"],
        difficulty=problem_data.get("difficulty", "medium"),
        chapter=problem_data.get("chapter", ""),
        lesson=problem_data.get("lesson", ""),
        created_by=user["id"]
    )
    
    problem_dict = new_problem.model_dump()
    problem_dict["created_at"] = problem_dict["created_at"].isoformat()
    
    await db.challenge_problems.insert_one(problem_dict)
    
    return {"success": True, "problem_id": new_problem.id}


@api_router.get("/challenge-problems")
async def get_challenge_problems(request: Request):
    """Get all challenge problems (teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view challenge problems")
    
    problems = await db.challenge_problems.find({}, {"_id": 0}).to_list(length=None)
    return problems


@api_router.delete("/challenge-problems/{problem_id}")
async def delete_challenge_problem(problem_id: str, request: Request):
    """Delete a challenge problem (teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete challenge problems")
    
    result = await db.challenge_problems.delete_one({"id": problem_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Challenge problem not found")
    
    return {"success": True}


# ==================== COMPETITIONS ====================

@api_router.post("/competitions")
async def create_competition(comp: CompetitionCreate, request: Request):
    """Create a new class vs class competition"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create competitions")
    
    # Verify teacher owns all classrooms
    for classroom_id in comp.classroom_ids:
        classroom = await db.classrooms.find_one({"id": classroom_id}, {"_id": 0})
        if not classroom or classroom["teacher_id"] != user["id"]:
            raise HTTPException(status_code=403, detail=f"You don't have access to classroom {classroom_id}")
    
    # Parse dates
    start_date = datetime.fromisoformat(comp.start_date)
    end_date = datetime.fromisoformat(comp.end_date)
    
    # Determine initial status
    now = datetime.now(timezone.utc)
    if now >= start_date and now <= end_date:
        status = "active"
    elif now < start_date:
        status = "upcoming"
    else:
        status = "completed"
    
    # Create competition
    new_comp = Competition(
        title=comp.title,
        description=comp.description,
        teacher_id=user["id"],
        classroom_ids=comp.classroom_ids,
        start_date=start_date,
        end_date=end_date,
        status=status,
        min_problems_required=comp.min_problems_required
    )
    
    comp_dict = new_comp.model_dump()
    comp_dict["created_at"] = comp_dict["created_at"].isoformat()
    comp_dict["start_date"] = comp_dict["start_date"].isoformat()
    comp_dict["end_date"] = comp_dict["end_date"].isoformat()
    
    await db.competitions.insert_one(comp_dict)
    
    return {"success": True, "competition_id": new_comp.id}


@api_router.get("/competitions")
async def get_competitions(request: Request):
    """Get all competitions (filters by user's classrooms for students)"""
    user = await get_current_user(request)
    
    if user["role"] == "teacher":
        # Teachers see competitions they created
        competitions = await db.competitions.find({"teacher_id": user["id"]}, {"_id": 0}).to_list(length=None)
    else:
        # Students see competitions their classrooms are in
        user_classrooms = await db.classrooms.find({"students": user["id"]}).to_list(length=None)
        classroom_ids = [c["id"] for c in user_classrooms]
        competitions = await db.competitions.find({"classroom_ids": {"$in": classroom_ids}}, {"_id": 0}).to_list(length=None)
    
    # Add classroom names
    for comp in competitions:
        classrooms = await db.classrooms.find({"id": {"$in": comp["classroom_ids"]}}, {"_id": 0}).to_list(length=None)
        comp["classrooms"] = [{"id": c["id"], "name": c["name"]} for c in classrooms]
    
    return competitions


@api_router.get("/competitions/{competition_id}")
async def get_competition(competition_id: str, request: Request):
    """Get specific competition with live standings"""
    user = await get_current_user(request)
    
    competition = await db.competitions.find_one({"id": competition_id}, {"_id": 0})
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    # Calculate live standings
    standings = await calculate_competition_standings(competition_id, competition)
    competition["live_standings"] = standings
    
    # Add classroom names
    classrooms = await db.classrooms.find({"id": {"$in": competition["classroom_ids"]}}, {"_id": 0}).to_list(length=None)
    competition["classrooms"] = [{"id": c["id"], "name": c["name"]} for c in classrooms]
    
    return competition


async def calculate_competition_standings(competition_id: str, competition: dict):
    """Calculate live standings for a competition"""
    standings = []
    
    start_date = datetime.fromisoformat(competition["start_date"])
    end_date = datetime.fromisoformat(competition["end_date"])
    
    for classroom_id in competition["classroom_ids"]:
        classroom = await db.classrooms.find_one({"id": classroom_id}, {"_id": 0})
        if not classroom:
            continue
        
        # Get all students in classroom
        student_ids = classroom.get("students", [])
        
        # Count problems solved during competition period
        submissions = await db.submissions.find({
            "student_id": {"$in": student_ids},
            "submitted_at": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            },
            "is_final": True
        }).to_list(length=None)
        
        total_problems_solved = len(submissions)
        total_xp_gained = sum(s.get("score", 0) for s in submissions)
        
        # Find Class Captain (most problems) and MVC (most XP)
        student_stats = {}
        for sub in submissions:
            sid = sub["student_id"]
            if sid not in student_stats:
                student_stats[sid] = {"problems": 0, "xp": 0}
            student_stats[sid]["problems"] += 1
            student_stats[sid]["xp"] += sub.get("score", 0)
        
        captain = None
        mvc = None
        if student_stats:
            captain_id = max(student_stats, key=lambda x: student_stats[x]["problems"])
            mvc_id = max(student_stats, key=lambda x: student_stats[x]["xp"])
            
            captain_user = await db.users.find_one({"id": captain_id}, {"_id": 0})
            mvc_user = await db.users.find_one({"id": mvc_id}, {"_id": 0})
            
            if captain_user:
                captain = {
                    "student_id": captain_id,
                    "student_name": captain_user["name"],
                    "problems_solved": student_stats[captain_id]["problems"]
                }
            if mvc_user:
                mvc = {
                    "student_id": mvc_id,
                    "student_name": mvc_user["name"],
                    "xp_gained": student_stats[mvc_id]["xp"]
                }
        
        # Calculate averages per student to make it fair regardless of class size
        num_students = len(student_ids)
        avg_problems_per_student = round(total_problems_solved / num_students, 2) if num_students > 0 else 0
        avg_xp_per_student = round(total_xp_gained / num_students, 2) if num_students > 0 else 0
        
        # Build student progress list with eligibility info
        min_required = competition.get("min_problems_required", 10)
        student_progress = []
        for student_id in student_ids:
            student_user = await db.users.find_one({"id": student_id}, {"_id": 0, "id": 1, "name": 1})
            if student_user:
                problems = student_stats.get(student_id, {}).get("problems", 0)
                xp = student_stats.get(student_id, {}).get("xp", 0)
                is_eligible = problems >= min_required
                student_progress.append({
                    "student_id": student_id,
                    "student_name": student_user["name"],
                    "problems_solved": problems,
                    "xp_gained": xp,
                    "is_eligible": is_eligible,
                    "progress_percent": min(100, round((problems / min_required) * 100, 1)) if min_required > 0 else 100
                })
        
        # Sort student progress by problems solved descending
        student_progress.sort(key=lambda x: x["problems_solved"], reverse=True)
        
        standings.append({
            "classroom_id": classroom_id,
            "classroom_name": classroom["name"],
            "problems_solved": total_problems_solved,  # Keep for display
            "xp_gained": total_xp_gained,  # Keep for display
            "avg_problems_per_student": avg_problems_per_student,  # Use for ranking
            "avg_xp_per_student": avg_xp_per_student,  # Use for tiebreaker
            "num_students": num_students,
            "captain": captain,
            "mvc": mvc,
            "eligible_students": len([sid for sid, stats in student_stats.items() if stats["problems"] >= min_required]),
            "student_progress": student_progress  # NEW: Individual student progress
        })
    
    # Sort by average problems per student (primary), then average XP per student (tiebreaker)
    standings.sort(key=lambda x: (x["avg_problems_per_student"], x["avg_xp_per_student"]), reverse=True)
    
    # Add ranks
    for i, standing in enumerate(standings):
        standing["rank"] = i + 1
    
    return standings


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
                {"$set": {
                    "role": "teacher",
                    "is_admin": True,
                    "password": hashed_password
                }}
            )
            logger.info(f"✅ Admin account promoted: {admin_email}")
    except Exception as e:
        logger.error(f"Error initializing admin account: {str(e)}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()