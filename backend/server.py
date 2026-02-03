from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
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
        {"id": "cheeky_monkey", "name": "Cheeky Monkey 🐵", "price": 350, "icon": "🐵", "animation": "float"},
        {"id": "happy_hippo", "name": "Happy Hippo 🦛", "price": 400, "icon": "🦛", "animation": "swim"},
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
    role: str  # "teacher", "student", "school_admin", or "district_admin"
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

class DistrictAdminSignupRequest(BaseModel):
    name: str
    email: str
    password: str
    district: str
    job_title: str  # Superintendent, Assistant Superintendent, Director, etc.

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
    unit: str = ""  # "Unit 1", "Unit 2", etc. for high-level organization
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
    # Turtle graphics fields
    assignment_type: str = "code"  # "code" or "turtle"
    turtle_grading_criteria: Optional[dict] = None  # {"min_lines": 6, "min_circles": 1, etc}
    expected_turtle_image: str = ""  # Base64 encoded image for turtle assignments
    # Partial credit rules (deterministic grading)
    partial_credit_rules: Optional[dict] = None  # {"syntax_error_penalty": 30, "logic_error_penalty": 20, etc}
    test_cases: List[dict] = []  # Test cases for auto-grading
    # Micro:bit fields
    materials_needed: List[str] = []  # e.g., ["Micro:bit", "USB cable", "2 LEDs", "220Ω resistors"]
    wiring_instructions: str = ""  # Step-by-step wiring guide
    learning_objectives: List[str] = []  # e.g., ["Understand digital output", "Control LEDs with code"]
    microbit_unit: str = ""  # e.g., "Unit 1: Getting Started"
    microbit_lesson: int = 0  # Lesson number within unit
    # Turtle Maze/Background fields
    background_type: str = "none"  # "none", "maze", "raceway", "grid", "custom"
    background_image: str = ""  # URL for custom background
    background_color: str = "#ffffff"  # Background color
    maze_data: Optional[dict] = None  # {walls: [[x1,y1,x2,y2], ...], paths: [...]}
    goals: List[dict] = []  # [{x, y, radius, label, order}]
    checkpoints: List[dict] = []  # [{x, y, radius, required: bool}]
    collision_enabled: bool = False
    challenge_mode: bool = False  # If true, track completion and leaderboard
    time_limit: int = 0  # Seconds, 0 = no limit
    optimal_path_length: float = 0  # For accuracy scoring
    # Block-based assignment fields
    starter_blocks_xml: str = ""  # XML representation of starter blocks
    solution_blocks_xml: str = ""  # XML representation of solution blocks
    # Lesson materials for pre-problem instruction
    lesson_materials: List[dict] = []  # Array of {type: 'video'|'image'|'text'|'link', content: string, title?: string}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProblemCreate(BaseModel):
    title: str
    description: str
    starter_code: str = ""
    solution_code: str
    expected_output: str = ""
    category: str
    difficulty: str
    unit: str = ""
    chapter: str = ""
    lesson: str = ""
    problem_type: str = "Independent Practice"
    resources_link: str = ""
    csta_standard: str = ""
    # Turtle graphics fields
    assignment_type: str = "code"  # "code", "turtle", or "microbit"
    turtle_grading_criteria: Optional[dict] = None
    expected_turtle_image: str = ""
    # Partial credit rules
    partial_credit_rules: Optional[dict] = None
    test_cases: List[dict] = []
    # Micro:bit fields
    materials_needed: List[str] = []
    wiring_instructions: str = ""
    learning_objectives: List[str] = []
    microbit_unit: str = ""
    microbit_lesson: int = 0
    # Turtle Maze/Background fields
    background_type: str = "none"  # "none", "maze", "raceway", "grid", "custom"
    background_image: str = ""  # URL for custom background
    background_color: str = "#ffffff"  # Background color
    maze_data: Optional[dict] = None  # {walls: [[x1,y1,x2,y2], ...], paths: [...]}
    goals: List[dict] = []  # [{x, y, radius, label, order}]
    checkpoints: List[dict] = []  # [{x, y, radius, required: bool}]
    collision_enabled: bool = False
    challenge_mode: bool = False  # If true, track completion and leaderboard
    time_limit: int = 0  # Seconds, 0 = no limit
    optimal_path_length: float = 0  # For accuracy scoring
    # Block-based assignment fields
    starter_blocks_xml: str = ""  # XML representation of starter blocks
    solution_blocks_xml: str = ""  # XML representation of solution blocks
    # Lesson materials for pre-problem instruction
    lesson_materials: List[dict] = []  # Array of {type: 'video'|'image'|'text'|'link', content: string, title?: string}

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
    proctor_code: str = ""  # 6-digit code to unlock accidentally "done" problems
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
    # Turtle graphics fields
    turtle_image: str = ""  # Base64 encoded turtle output image
    turtle_tracking_data: Optional[dict] = None  # Tracking data for auto-grading
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubmissionCreate(BaseModel):
    assignment_id: str
    problem_id: Optional[str] = None  # Optional for backward compatibility
    code: str
    screenshot: Optional[str] = None  # Base64 encoded screenshot for Scratch grading


class HintUsage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    assignment_id: str
    problem_id: str
    hint_level: int  # 1 or 2
    coins_spent: int  # 50 or 100
    hint_text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HintRequest(BaseModel):
    assignment_id: str
    problem_id: str
    code: str
    hint_level: int  # 1 or 2

class Lesson(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assignment_id: str
    problem_id: Optional[str] = None  # Optional: lesson can be for whole assignment or specific problem
    title: str
    content: str  # Markdown content with images, code examples, etc.
    video_filename: Optional[str] = None  # Video tutorial file
    teacher_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LessonCreate(BaseModel):
    assignment_id: str
    problem_id: Optional[str] = None
    title: str
    content: str
    video_filename: Optional[str] = None

class LibraryVideo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    chapter: str  # e.g., "Chapter 1: Variables", "Chapter 2: Loops"
    description: Optional[str] = None
    filename: str  # Video file name
    duration: Optional[int] = None  # Duration in seconds
    uploaded_by: str  # Admin user ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LibraryVideoCreate(BaseModel):
    title: str
    chapter: str
    description: Optional[str] = None

class FeedbackMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    user_type: Optional[str] = None  # "teacher", "student", "prospective", None
    category: str  # "question", "bug", "feature", "other"
    message: str
    admin_reply: Optional[str] = None
    status: str = "unread"  # "unread", "read", "resolved"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    replied_at: Optional[datetime] = None

class FeedbackCreate(BaseModel):
    name: str
    email: str
    user_type: Optional[str] = None
    category: str
    message: str

class FeedbackReply(BaseModel):
    reply: str

class Announcement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # Admin user ID
    is_active: bool = True

class AnnouncementCreate(BaseModel):
    title: str
    content: str

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
    unit_type: str = ""  # "block", "turtle", "code", "microbit"
    unit: str = ""  # "Unit 1: Block-Based Coding", etc.
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
    unit_type: str = ""
    unit: str = ""
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
    allow_retake: bool = False  # Allow students to retake the test
    show_answers_after: bool = True  # Show correct answers after submission (if results_released)
    results_released: bool = False  # Teacher must release results before students can see answers
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
    allow_retake: bool = False
    show_answers_after: bool = True
    results_released: bool = False

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

# Coding Test Models
class CodingTest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str = ""
    chapter: str = ""
    lesson: str = ""
    teacher_id: str
    problem_ids: List[str]  # References to Problems from library
    time_limit_minutes: int = 0  # 0 = no time limit
    classroom_ids: List[str]
    proctor_code: str = ""  # 6-digit code for re-entering test
    available_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CodingTestCreate(BaseModel):
    title: str
    description: str = ""
    chapter: str = ""
    lesson: str = ""
    problem_ids: List[str]
    time_limit_minutes: int = 0
    classroom_ids: List[str]
    available_date: Optional[str] = None
    due_date: Optional[str] = None

class CodingTestSubmission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    test_id: str
    student_id: str
    student_name: str
    problem_id: str  # Which problem this submission is for
    code: str
    score: float
    feedback: str
    test_results: List[dict] = []
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    time_taken_seconds: int = 0
    is_complete: bool = True

class CodingTestSubmit(BaseModel):
    test_id: str
    problem_id: str  # Which problem being submitted
    code: str
    time_taken_seconds: int = 0

# Maze Challenge Attempt - for tracking maze completions and leaderboards
class MazeAttempt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    problem_id: str
    student_id: str
    student_name: str
    classroom_id: str = ""
    # Performance metrics
    completed: bool = False
    completion_time: float = 0  # Seconds
    code_lines: int = 0
    path_length: float = 0  # Total distance traveled
    path_accuracy: float = 0  # Percentage compared to optimal
    goals_reached: int = 0
    total_goals: int = 0
    collisions: int = 0
    # The code used
    code: str = ""
    # Timestamps
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class MazeAttemptCreate(BaseModel):
    problem_id: str
    completed: bool = False
    completion_time: float = 0
    code_lines: int = 0
    path_length: float = 0
    goals_reached: int = 0
    total_goals: int = 0
    collisions: int = 0
    code: str = ""

# Skill Quiz Models - Quiz questions tied to skills/categories
class SkillQuizQuestion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    skill_category: str  # e.g., "Turtle - Loops", "Micro:bit - LED Display"
    question_text: str
    choice_a: str
    choice_b: str
    choice_c: str
    choice_d: str
    correct_answer: str  # "A", "B", "C", or "D"
    explanation: str = ""  # Why this answer is correct
    concept_tags: List[str] = []  # e.g., ["for loop", "range()"]
    creator_id: str = ""
    creator_name: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SkillQuizQuestionCreate(BaseModel):
    skill_category: str
    question_text: str
    choice_a: str
    choice_b: str
    choice_c: str
    choice_d: str
    correct_answer: str
    explanation: str = ""
    concept_tags: List[str] = []

class SkillQuizAttempt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    student_name: str
    skill_category: str
    assignment_id: str  # The assignment this quiz was triggered from
    classroom_id: str = ""
    questions: List[dict]  # [{question_id, question_text, choices, correct_answer}]
    student_answers: dict  # {question_id: selected_answer}
    score: float  # Percentage
    total_questions: int
    correct_count: int
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SkillQuizSubmit(BaseModel):
    skill_category: str
    assignment_id: str
    classroom_id: str = ""
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
    file_size: int = 0
    creator_id: str = ""
    creator_name: str = ""
    is_shared: bool = False
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


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
async def teacher_login(login_data: TeacherLoginRequest, response: Response):
    """Teacher login with email and password"""
    try:
        # Find user by email
        user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Check if user has a password (teachers sign up with passwords, students use Google)
        # This allows teachers who switched to student role to still log in
        if not user.get("password"):
            raise HTTPException(status_code=401, detail="This account uses Google login. Please use the student/Google login option.")
        
        # Note: We no longer check role here because teachers may have switched to student role
        # Having a password indicates they are a teacher account
        
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
        
        # Track login for analytics
        await db.login_history.insert_one({
            "user_id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Update user's last_login timestamp and reset role to teacher if needed
        # (in case they were in student mode)
        update_fields = {"last_login": datetime.now(timezone.utc).isoformat()}
        if user["role"] != "teacher":
            update_fields["role"] = "teacher"
        
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": update_fields}
        )
        
        # Use updated role for response
        current_role = update_fields.get("role", user["role"])
        
        # Set cookie in response
        # Auto-detect if we're in production (HTTPS) or development (HTTP)
        is_production = os.environ.get("ENVIRONMENT", "development") == "production"
        response.set_cookie(
            key="session_token",
            value=session_token,
            max_age=7 * 24 * 60 * 60,  # 7 days
            path="/",
            httponly=False,  # Allow JavaScript access
            samesite="lax",
            secure=is_production,  # True in production (HTTPS), False in development
            domain=None  # Let browser handle domain
        )
        
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
            "session_token": session_token,  # Also return in body for localStorage fallback
            "role": current_role,
            "is_admin": user.get("is_admin", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Teacher login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")

@api_router.post("/auth/district-admin-signup")
async def district_admin_signup(signup_data: DistrictAdminSignupRequest):
    """District admin signup - requires platform admin approval"""
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
        
        # Create pending district admin user
        user_id = str(uuid.uuid4())
        pending_admin = {
            "id": user_id,
            "email": signup_data.email,
            "name": signup_data.name,
            "password": hashed_password,
            "role": "district_admin",
            "district": signup_data.district,
            "job_title": signup_data.job_title,
            "email_domain": email_domain,
            "status": "pending_approval",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_admin": False
        }
        
        await db.pending_district_admins.insert_one(pending_admin)
        
        return {
            "success": True,
            "message": "District admin request submitted! A platform administrator will review your request shortly."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"District admin signup error: {str(e)}")
        raise HTTPException(status_code=500, detail="Signup failed")

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
    
    # Allow role switching for all users
    # Admin status is preserved independently of role
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

@api_router.get("/classrooms/student")
async def get_student_classrooms(request: Request):
    """Get classrooms for student (specific endpoint for MyTests page)"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    # Find classrooms where student is enrolled
    classrooms = await db.classrooms.find(
        {"students": user["id"], "is_archived": {"$ne": True}},
        {"_id": 0}
    ).to_list(1000)
    
    if not classrooms:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
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
    lesson: Optional[str] = None,
    csta_standard: Optional[str] = None,
    search: Optional[str] = None,
    assignment_type: Optional[str] = None
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
    if lesson:
        query["lesson"] = lesson
    if csta_standard:
        query["csta_standard"] = {"$regex": csta_standard, "$options": "i"}
    if assignment_type:
        query["assignment_type"] = assignment_type
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    problems = await db.problems.find(query, {"_id": 0}).to_list(10000)
    return problems


class BulkUpdateRequest(BaseModel):
    problem_ids: List[str]
    updates: dict

@api_router.put("/problems/bulk-update")
async def bulk_update_problems(data: BulkUpdateRequest, request: Request):
    """Bulk update multiple problems with the same values"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update problems")
    
    if not data.problem_ids:
        raise HTTPException(status_code=400, detail="No problems selected")
    
    if not data.updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    # Filter allowed fields
    allowed_fields = {"chapter", "lesson", "assignment_type", "category", "difficulty", "unit"}
    filtered_updates = {k: v for k, v in data.updates.items() if k in allowed_fields and v}
    
    if not filtered_updates:
        raise HTTPException(status_code=400, detail="No valid updates provided")
    
    # Update all selected problems
    result = await db.problems.update_many(
        {"id": {"$in": data.problem_ids}},
        {"$set": filtered_updates}
    )
    
    return {
        "success": True,
        "modified_count": result.modified_count,
        "message": f"Updated {result.modified_count} problems"
    }


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
    
    # Debug logging
    logging.info(f"📝 Creating assignment: {assignment.title}")
    logging.info(f"📋 Received classroom_ids: {assignment.classroom_ids}")
    logging.info(f"📋 Received classroom_id: {assignment.classroom_id}")
    
    # Handle classroom_id or classroom_ids
    classroom_ids = assignment.classroom_ids if assignment.classroom_ids else []
    if assignment.classroom_id:
        classroom_ids.append(assignment.classroom_id)
    
    logging.info(f"📋 Final classroom_ids after processing: {classroom_ids}")
    
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
    
    # Generate proctor code (6-digit)
    import random
    proctor_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Create assignment
    new_assignment = Assignment(
        title=assignment.title,
        description=assignment.description,
        chapter=assignment.chapter,
        lesson=assignment.lesson,
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
        completion_bonus_coins=assignment.completion_bonus_coins,
        proctor_code=proctor_code
    )
    
    assignment_dict = new_assignment.model_dump()
    assignment_dict["created_at"] = assignment_dict["created_at"].isoformat()
    if assignment_dict["available_date"]:
        assignment_dict["available_date"] = assignment_dict["available_date"].isoformat()
    if assignment_dict["due_date"]:
        assignment_dict["due_date"] = assignment_dict["due_date"].isoformat()
    
    logging.info(f"💾 Saving assignment with classroom_ids: {assignment_dict.get('classroom_ids')}")
    
    await db.assignments.insert_one(assignment_dict)
    
    logging.info(f"✅ Assignment created successfully with ID: {new_assignment.id}")
    
    # Increment times_imported counter for each problem (library-based only)
    for problem_id in assignment.problem_ids:
        await db.problems.update_one(
            {"id": problem_id},
            {"$inc": {"times_imported": len(assignment.classroom_ids)}}
        )
    
    return {
        "success": True, 
        "assignment_id": new_assignment.id, 
        "classrooms": len(assignment.classroom_ids),
        "proctor_code": proctor_code
    }


@api_router.put("/assignments/{assignment_id}")
async def update_assignment(assignment_id: str, update_data: dict, request: Request):
    """Update assignment metadata (title, chapter, lesson, due_date)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update assignments")
    
    # Get the assignment
    assignment = await db.assignments.find_one({"id": assignment_id})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Verify ownership
    if assignment["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You don't own this assignment")
    
    # Build update dict (only allow certain fields)
    allowed_fields = ["title", "chapter", "lesson", "due_date", "description"]
    update_dict = {}
    
    for field in allowed_fields:
        if field in update_data:
            if field == "due_date" and update_data[field]:
                # Parse date if provided
                try:
                    update_dict[field] = datetime.fromisoformat(update_data[field]).isoformat()
                except:
                    update_dict[field] = update_data[field]
            else:
                update_dict[field] = update_data[field]
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Update the assignment
    await db.assignments.update_one(
        {"id": assignment_id},
        {"$set": update_dict}
    )
    
    return {"success": True, "updated_fields": list(update_dict.keys())}


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
    
    # For list-like outputs, normalize to single line format
    # This handles cases where expected output has newlines like "[10,\n20,\n30]"
    # but actual output is "[10, 20, 30]"
    if output.strip().startswith('[') and output.strip().endswith(']'):
        # Remove all newlines and extra spaces within the list
        normalized = output.replace('\n', ' ').replace('\r', ' ')
        # Normalize multiple spaces to single space
        while '  ' in normalized:
            normalized = normalized.replace('  ', ' ')
        # Normalize spacing around commas: "[10 , 20]" -> "[10, 20]"
        normalized = normalized.replace(' ,', ',').replace(',  ', ', ').replace(', ', ', ')
        # Ensure consistent format: "[10,20]" -> "[10, 20]"
        normalized = re.sub(r',(\S)', r', \1', normalized)
        return normalized.strip()
    
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
    """Execute Python code safely with test input, separating prompts from output"""
    try:
        # Split test input into lines for input() calls
        input_lines = test_input.split('\n') if test_input else []
        
        # Wrap code to capture only print() output, not input() prompts
        wrapped_code = """
import sys
import io

# Redirect stdout to capture only print statements
original_stdout = sys.stdout
captured_output = io.StringIO()

# Override input to use test data and not print prompts
test_inputs = """ + repr(input_lines) + """
input_index = [0]

def mock_input(prompt=''):
    # Don't print the prompt to stdout
    if input_index[0] < len(test_inputs):
        value = test_inputs[input_index[0]]
        input_index[0] += 1
        return value
    else:
        raise EOFError("No more input available")

# Replace built-in input with mock
__builtins__.input = mock_input

# Redirect stdout to our capture
sys.stdout = captured_output

try:
    # Execute user code
""" + '\n'.join('    ' + line for line in code.split('\n')) + """
finally:
    # Restore stdout
    sys.stdout = original_stdout
    # Print captured output
    print(captured_output.getvalue(), end='')
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(wrapped_code)
            temp_file = f.name
        
        # Run code without providing input (it's handled by mock_input)
        result = subprocess.run(
            ['python3', temp_file],
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


async def grade_turtle_submission(code: str, grading_criteria: dict, expected_image: str = "", maze_config: dict = None) -> dict:
    """Grade a turtle graphics submission based on criteria
    
    Args:
        code: Student's turtle code
        grading_criteria: Dict with min_lines, min_circles, required_colors, min_distance
        expected_image: Optional expected output image for comparison
        maze_config: Dict with goals, collision_enabled, challenge_mode for maze grading
    
    Returns: {
        "score": float,
        "feedback": str,
        "tracking_data": dict,
        "image_data": str
    }
    """
    # Execute turtle code
    temp_file = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            wrapper_code = f'''
import sys
import io
import json
sys.path.insert(0, '/app/backend')

from turtle_sim import TurtleSim, Turtle, Screen

captured_stdout = io.StringIO()
original_stdout = sys.stdout

try:
    sys.stdout = captured_stdout
    
    turtle_sim = TurtleSim(width=600, height=600, bg_color="white")
    
    class MockTurtleModule:
        def __init__(self, sim):
            self._sim = sim
            self.Turtle = lambda: Turtle(sim)
            self.Screen = lambda: Screen(sim)
        def forward(self, d): self._sim.forward(d)
        def backward(self, d): self._sim.backward(d)
        def right(self, a): self._sim.right(a)
        def left(self, a): self._sim.left(a)
        def goto(self, x, y=None):
            if y is None: x, y = x
            self._sim.goto(x, y)
        def setx(self, x): self._sim.setx(x)
        def sety(self, y): self._sim.sety(y)
        def circle(self, r, e=None, s=None): self._sim.circle(r, e, s)
        def dot(self, size=None, color=None): self._sim.dot(size, color)
        def penup(self): self._sim.penup()
        def pendown(self): self._sim.pendown()
        def pensize(self, w): self._sim.pensize(w)
        def pencolor(self, c): self._sim.pencolor(c)
        def color(self, *args): self._sim.color(*args)
        def speed(self, s): self._sim.speed(s)
        def hideturtle(self): self._sim.hideturtle()
        def showturtle(self): self._sim.showturtle()
        def begin_fill(self): self._sim.begin_fill()
        def end_fill(self): self._sim.end_fill()
        def setheading(self, a): self._sim.setheading(a)
        def home(self): self._sim.home()
        def clear(self): self._sim.clear()
        def clearscreen(self): self._sim.clearscreen()
        def reset(self): self._sim.reset()
        def position(self): return self._sim.position()
        def pos(self): return self._sim.pos()
        def xcor(self): return self._sim.xcor()
        def ycor(self): return self._sim.ycor()
        def heading(self): return self._sim.get_heading()
        def stamp(self): return self._sim.stamp()
        def clearstamp(self, stamp_id=None): self._sim.clearstamp(stamp_id)
        def clearstamps(self, n=None): self._sim.clearstamps(n)
        def bye(self): pass
        fd = forward
        bk = backward
        back = backward
        rt = right
        lt = left
        pu = penup
        pd = pendown
        up = penup
        down = pendown
        ht = hideturtle
        st = showturtle
        seth = setheading
        setpos = goto
        setposition = goto
    
    turtle = MockTurtleModule(turtle_sim)
    sys.modules['turtle'] = turtle
    
{chr(10).join("    " + line for line in code.split(chr(10)))}
    
    sys.stdout = original_stdout
    
    image_data = turtle_sim.get_image_base64()
    tracking_data = turtle_sim.get_tracking_data()
    
    print("IMAGE_DATA:" + image_data)
    print("TRACKING_DATA:" + json.dumps(tracking_data))
    
except Exception as e:
    sys.stdout = original_stdout
    import traceback
    print("ERROR:" + str(e) + "\\n" + traceback.format_exc(), file=sys.stderr)
'''
            f.write(wrapper_code)
            temp_file = f.name
        
        import sys as system
        python_executable = system.executable
        result = subprocess.run(
            [python_executable, temp_file],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        # Parse output
        image_data = None
        tracking_data = None
        error_msg = None
        
        for line in result.stdout.split('\n'):
            if line.startswith('IMAGE_DATA:'):
                image_data = line.replace('IMAGE_DATA:', '').strip()
            elif line.startswith('TRACKING_DATA:'):
                try:
                    tracking_data = json.loads(line.replace('TRACKING_DATA:', '').strip())
                except:
                    pass
        
        if result.stderr and 'ERROR:' in result.stderr:
            error_msg = result.stderr.split('ERROR:')[-1].strip()
        
        if error_msg or not tracking_data:
            return {
                "score": 0,
                "feedback": f"Code execution failed: {error_msg or 'Unknown error'}",
                "tracking_data": {},
                "image_data": ""
            }
        
        # Grade based on criteria
        score = 0  # Start at 0 instead of 100 - must earn the score
        feedback_parts = []
        goals_reached = 0
        total_goals = 0
        
        # Check if this is a maze challenge with goals
        if maze_config and maze_config.get("goals"):
            total_goals = len(maze_config["goals"])
            goal_radius = 15  # Default goal radius
            
            # Get the final turtle position from tracking data
            final_pos = tracking_data.get("final_position", {"x": 0, "y": 0})
            turtle_x = final_pos.get("x", 0)
            turtle_y = final_pos.get("y", 0)
            
            logging.info(f"Maze grading: {total_goals} goals, final_pos=({turtle_x}, {turtle_y})")
            logging.info(f"Goals: {maze_config['goals']}")
            
            # Also check path history for goals passed through
            path_history = tracking_data.get("path_history", [])
            logging.info(f"Path history has {len(path_history)} points")
            
            # Check each goal
            for i, goal in enumerate(maze_config["goals"]):
                goal_x = goal.get("x", 0)
                goal_y = goal.get("y", 0)
                goal_r = goal.get("radius", goal_radius)
                
                # Check if turtle's final position is within the goal
                distance_to_goal = ((turtle_x - goal_x) ** 2 + (turtle_y - goal_y) ** 2) ** 0.5
                logging.info(f"Goal {i+1} at ({goal_x}, {goal_y}) radius={goal_r}: distance={distance_to_goal:.2f}")
                if distance_to_goal <= goal_r:
                    goals_reached += 1
                    logging.info(f"  -> Goal {i+1} reached via final position!")
                else:
                    # Also check if turtle passed through the goal during its path
                    for pos in path_history:
                        px, py = pos.get("x", 0), pos.get("y", 0)
                        dist = ((px - goal_x) ** 2 + (py - goal_y) ** 2) ** 0.5
                        if dist <= goal_r:
                            goals_reached += 1
                            logging.info(f"  -> Goal {i+1} reached via path at ({px}, {py})!")
                            break
            
            # Score based on goals reached
            if total_goals > 0:
                score = (goals_reached / total_goals) * 100
                
                if goals_reached == total_goals:
                    feedback_parts.append(f"🎉 All {total_goals} goal(s) reached!")
                elif goals_reached > 0:
                    feedback_parts.append(f"Reached {goals_reached}/{total_goals} goals")
                else:
                    feedback_parts.append(f"No goals reached yet. Keep trying!")
            
            # Bonus/penalty for collision (if enabled)
            if maze_config.get("collision_enabled"):
                collisions = tracking_data.get("collisions", 0)
                if collisions > 0:
                    score = max(0, score - (collisions * 5))  # -5 points per collision
                    feedback_parts.append(f"⚠️ {collisions} wall collision(s)")
                else:
                    feedback_parts.append("✅ No collisions!")
        
        elif grading_criteria:
            # Traditional turtle grading (non-maze problems)
            score = 100  # Start at 100 for non-maze problems
            # Check minimum lines
            if "min_lines" in grading_criteria:
                min_lines = grading_criteria["min_lines"]
                actual_lines = tracking_data.get("lines_drawn", 0)
                if actual_lines < min_lines:
                    score -= 20
                    feedback_parts.append(f"Need at least {min_lines} lines (drew {actual_lines})")
            
            # Check minimum circles
            if "min_circles" in grading_criteria:
                min_circles = grading_criteria["min_circles"]
                actual_circles = tracking_data.get("circles_drawn", 0)
                if actual_circles < min_circles:
                    score -= 20
                    feedback_parts.append(f"Need at least {min_circles} circles (drew {actual_circles})")
            
            # Check required colors
            if "required_colors" in grading_criteria and grading_criteria["required_colors"]:
                required_colors = set(grading_criteria["required_colors"])
                actual_colors = set(tracking_data.get("colors_used", []))
                missing_colors = required_colors - actual_colors
                if missing_colors:
                    score -= 15
                    feedback_parts.append(f"Missing colors: {', '.join(missing_colors)}")
            
            # Check minimum distance
            if "min_distance" in grading_criteria:
                min_distance = grading_criteria["min_distance"]
                actual_distance = tracking_data.get("total_distance", 0)
                if actual_distance < min_distance:
                    score -= 15
                    feedback_parts.append(f"Need to travel at least {min_distance} pixels (traveled {actual_distance:.0f})")
        
        else:
            # No maze config and no grading criteria - check if any code was executed
            lines_drawn = tracking_data.get("lines_drawn", 0)
            total_distance = tracking_data.get("total_distance", 0)
            
            if lines_drawn > 0 or total_distance > 0:
                # Student drew something - give partial credit
                score = 50
                feedback_parts.append("Code executed - submit when complete for full credit")
            else:
                # No drawing detected
                score = 0
                feedback_parts.append("No turtle movement detected. Try adding some turtle commands!")
        
        score = max(0, score)
        
        if feedback_parts:
            feedback = "Good attempt! " + " • ".join(feedback_parts)
        else:
            feedback = "Excellent work! All requirements met."
        
        return {
            "score": score,
            "feedback": feedback,
            "tracking_data": tracking_data,
            "image_data": image_data
        }
        
    except subprocess.TimeoutExpired:
        return {
            "score": 0,
            "feedback": "Code execution timed out (15 seconds limit)",
            "tracking_data": {},
            "image_data": ""
        }
    except Exception as e:
        logging.error(f"Turtle grading error: {str(e)}")
        return {
            "score": 0,
            "feedback": f"Grading failed: {str(e)}",
            "tracking_data": {},
            "image_data": ""
        }
    finally:
        if temp_file:
            try:
                os.unlink(temp_file)
            except:
                pass


@api_router.post("/code/execute-turtle")
async def execute_turtle_code(execute_req: CodeExecuteRequest, request: Request):
    """Execute Python turtle graphics code using Pillow-based simulator"""
    try:
        await get_current_user(request)  # Ensure authenticated
        
        # Create a temporary Python file with turtle code
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            # Wrapper code using our Pillow-based turtle simulator
            wrapper_code = f'''
import sys
import io
import json
sys.path.insert(0, '/app/backend')

from turtle_sim import TurtleSim, Turtle, Screen

# Redirect stdout/stderr to capture print statements
captured_stdout = io.StringIO()
captured_stderr = io.StringIO()

original_stdout = sys.stdout
original_stderr = sys.stderr

output_text = ""
error_text = ""
image_data = ""
tracking_data = {{}}

try:
    sys.stdout = captured_stdout
    sys.stderr = captured_stderr
    
    # Create turtle simulator
    turtle_sim = TurtleSim(width=600, height=600, bg_color="white")
    
    # Create mock turtle module
    class MockTurtleModule:
        def __init__(self, sim):
            self._sim = sim
            self.Turtle = lambda: Turtle(sim)
            self.Screen = lambda: Screen(sim)
        
        def forward(self, d):
            self._sim.forward(d)
        def backward(self, d):
            self._sim.backward(d)
        def right(self, a):
            self._sim.right(a)
        def left(self, a):
            self._sim.left(a)
        def goto(self, x, y=None):
            if y is None:
                x, y = x
            self._sim.goto(x, y)
        def setx(self, x):
            self._sim.setx(x)
        def sety(self, y):
            self._sim.sety(y)
        def circle(self, r, e=None, s=None):
            self._sim.circle(r, e, s)
        def dot(self, size=None, color=None):
            self._sim.dot(size, color)
        def penup(self):
            self._sim.penup()
        def pendown(self):
            self._sim.pendown()
        def pensize(self, w):
            self._sim.pensize(w)
        def pencolor(self, c):
            self._sim.pencolor(c)
        def color(self, *args):
            self._sim.color(*args)
        def speed(self, s):
            self._sim.speed(s)
        def hideturtle(self):
            self._sim.hideturtle()
        def showturtle(self):
            self._sim.showturtle()
        def begin_fill(self):
            self._sim.begin_fill()
        def end_fill(self):
            self._sim.end_fill()
        def setheading(self, a):
            self._sim.setheading(a)
        def home(self):
            self._sim.home()
        def clear(self):
            self._sim.clear()
        def clearscreen(self):
            self._sim.clearscreen()
        def reset(self):
            self._sim.reset()
        def position(self):
            return self._sim.position()
        def pos(self):
            return self._sim.pos()
        def xcor(self):
            return self._sim.xcor()
        def ycor(self):
            return self._sim.ycor()
        def heading(self):
            return self._sim.get_heading()
        def stamp(self):
            return self._sim.stamp()
        def clearstamp(self, stamp_id=None):
            self._sim.clearstamp(stamp_id)
        def clearstamps(self, n=None):
            self._sim.clearstamps(n)
        def bye(self):
            pass
        
        # Aliases
        fd = forward
        bk = backward
        back = backward
        rt = right
        lt = left
        pu = penup
        pd = pendown
        up = penup
        down = pendown
        ht = hideturtle
        st = showturtle
        seth = setheading
        setpos = goto
        setposition = goto
    
    turtle = MockTurtleModule(turtle_sim)
    
    # CRITICAL: Inject mock turtle module before user code imports it
    sys.modules['turtle'] = turtle
    
    # Execute student code
{chr(10).join("    " + line for line in execute_req.code.split(chr(10)))}
    
    # Restore stdout/stderr
    sys.stdout = original_stdout
    sys.stderr = original_stderr
    
    # Get any print output from user code
    output_text = captured_stdout.getvalue()
    if output_text:
        print("OUTPUT:" + output_text.strip())
    
    # Get image and tracking data
    image_data = turtle_sim.get_image_base64()
    tracking_data = turtle_sim.get_tracking_data()
    
    print("IMAGE_DATA:" + image_data)
    print("TRACKING_DATA:" + json.dumps(tracking_data))
    
except Exception as e:
    sys.stdout = original_stdout
    sys.stderr = original_stderr
    import traceback
    error_text = str(e) + "\\n" + traceback.format_exc()
    print("ERROR:" + error_text, file=sys.stderr)
'''
            f.write(wrapper_code)
            temp_file = f.name
        
        try:
            # Execute the turtle code with timeout
            import sys as system
            python_executable = system.executable
            result = subprocess.run(
                [python_executable, temp_file],
                capture_output=True,
                text=True,
                timeout=15
            )
            
            stdout = result.stdout
            stderr = result.stderr
            
            # Parse output
            image_data = None
            output_text = ""
            tracking_data = None
            error_msg = None
            
            for line in stdout.split('\n'):
                if line.startswith('IMAGE_DATA:'):
                    image_data = line.replace('IMAGE_DATA:', '').strip()
                elif line.startswith('OUTPUT:'):
                    output_text = line.replace('OUTPUT:', '').strip()
                elif line.startswith('TRACKING_DATA:'):
                    try:
                        tracking_data = json.loads(line.replace('TRACKING_DATA:', '').strip())
                    except:
                        pass
            
            if stderr and 'ERROR:' in stderr:
                error_msg = stderr.split('ERROR:')[-1].strip()
            elif result.returncode != 0 and not image_data:
                error_msg = stderr if stderr else "Execution failed"
            
            if error_msg:
                return {
                    "output": output_text,
                    "error": error_msg,
                    "success": False,
                    "image_data": None,
                    "tracking_data": None
                }
            
            return {
                "output": output_text,
                "error": "",
                "success": True,
                "image_data": image_data,
                "tracking_data": tracking_data
            }
            
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_file)
            except:
                pass
                    
    except subprocess.TimeoutExpired:
        return {
            "output": "",
            "error": "Turtle code execution timed out (15 seconds limit)",
            "success": False,
            "image_data": None,
            "tracking_data": None
        }
    except Exception as e:
        logging.error(f"Turtle execution error: {str(e)}")
        return {
            "output": "",
            "error": f"Execution failed: {str(e)}",
            "success": False,
            "image_data": None,
            "tracking_data": None
        }


# ----- Submission Routes -----

@api_router.post("/submissions")
async def submit_assignment(submission: SubmissionCreate, request: Request):
    """Submit assignment and get AI evaluation"""
    logging.info(f"📝 SUBMISSION: Starting submission for assignment_id={submission.assignment_id}, problem_id={submission.problem_id}")
    
    try:
        user = await get_current_user(request)
    except Exception as e:
        logging.error(f"📝 SUBMISSION: Auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    logging.info(f"📝 SUBMISSION: User={user.get('id')}, role={user.get('role')}")
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can submit assignments")
    
    assignment = await db.assignments.find_one({"id": submission.assignment_id})
    if not assignment:
        logging.error(f"📝 SUBMISSION: Assignment not found: {submission.assignment_id}")
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    logging.info(f"📝 SUBMISSION: Assignment found, type={assignment.get('assignment_type')}, problem_ids={assignment.get('problem_ids', [])[:3]}")
    
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
        # Log all keys and test_cases details
        logging.info(f"GRADING: Found problem from db.problems - id={submission.problem_id}")
        logging.info(f"GRADING: Problem keys: {list(problem.keys())}")
        logging.info(f"GRADING: test_cases type={type(problem.get('test_cases'))}, value={problem.get('test_cases')}")
    else:
        # Old structure: problem data is in assignment itself
        problem = {
            "id": assignment["id"],
            "solution_code": assignment.get("solution_code", ""),
            "title": assignment.get("title", ""),
            "assignment_type": assignment.get("assignment_type", "code"),
            "test_cases": assignment.get("test_cases", [])
        }
        logging.info(f"GRADING: Using embedded problem from assignment - id={assignment['id']}, has test_cases={bool(problem.get('test_cases'))}, test_cases_count={len(problem.get('test_cases') or [])}")
        # For backward compatibility, use assignment_id as problem_id
        if not submission.problem_id:
            submission.problem_id = assignment["id"]
    
    # Check if this is a turtle graphics assignment
    is_turtle = problem.get("assignment_type") == "turtle"
    is_microbit = problem.get("assignment_type") == "microbit"
    
    # Check if assignment is available
    now = datetime.now(timezone.utc)
    try:
        available_date = datetime.fromisoformat(assignment["available_date"]) if assignment.get("available_date") else None
    except (ValueError, TypeError) as e:
        logging.warning(f"Invalid available_date format: {assignment.get('available_date')}")
        available_date = None
    
    if available_date and now < available_date:
        raise HTTPException(status_code=403, detail="This assignment is not yet available")
    
    # Check previous submissions for this specific problem
    previous_submissions = await db.submissions.find(
        {
            "assignment_id": submission.assignment_id,
            "problem_id": submission.problem_id,
            "student_id": user["id"]
        },
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(100)
    
    # Calculate attempt number (no lives limit - unlimited attempts until they click Done)
    if previous_submissions:
        attempt_number = len(previous_submissions) + 1
    else:
        attempt_number = 1
    
    # No lives limit - students can keep trying until they get 100% or click Done
    lives_remaining = 999  # Effectively unlimited
    
    # Handle turtle graphics assignments differently
    if is_turtle:
        grading_criteria = problem.get("turtle_grading_criteria", {})
        expected_image = problem.get("expected_turtle_image", "")
        
        # Build maze config for maze challenges
        maze_config = None
        if problem.get("goals") or problem.get("challenge_mode") or problem.get("background_type") == "maze":
            maze_config = {
                "goals": problem.get("goals", []),
                "collision_enabled": problem.get("collision_enabled", False),
                "challenge_mode": problem.get("challenge_mode", False),
                "maze_data": problem.get("maze_data", {})
            }
            logging.info(f"Maze config for problem {problem.get('id')}: goals={len(maze_config['goals'])} items, collision_enabled={maze_config['collision_enabled']}")
        
        # Grade turtle submission (for visual/tracking validation)
        turtle_result = await grade_turtle_submission(
            submission.code,
            grading_criteria,
            expected_image,
            maze_config
        )
        logging.info(f"Turtle grading result: score={turtle_result['score']}, feedback={turtle_result['feedback']}")
        
        # Also evaluate pattern-based test cases from the problem
        # Check multiple sources for test_cases:
        # 1. From the problem document itself
        # 2. From the assignment's problems array (embedded problem data)
        # 3. From the assignment directly (for per-problem test cases stored at assignment level)
        test_cases = problem.get("test_cases") or []
        logging.info(f"GRADING Step 1: problem.test_cases = {len(test_cases)} tests")
        
        # If no test_cases on problem, check assignment's problems array
        if not test_cases and assignment.get("problems"):
            for ap in assignment.get("problems") or []:
                if ap.get("id") == submission.problem_id:
                    test_cases = ap.get("test_cases") or []
                    logging.info(f"GRADING Step 2: Found test_cases in assignment.problems: {len(test_cases)} tests")
                    break
        
        # If still no test_cases, check assignment directly (legacy single-problem)
        if not test_cases:
            test_cases = assignment.get("test_cases") or []
            if test_cases:
                logging.info(f"GRADING Step 3: Found test_cases in assignment: {len(test_cases)} tests")
        
        # FINAL FALLBACK: For multi-problem assignments, test_cases might be stored
        # in a per-problem structure at assignment level with problem_id as key
        if not test_cases and assignment.get("problem_test_cases"):
            test_cases = assignment["problem_test_cases"].get(submission.problem_id) or []
            if test_cases:
                logging.info(f"GRADING Step 4: Found test_cases in assignment.problem_test_cases: {len(test_cases)} tests")
        
        logging.info(f"Turtle grading - FINAL test_cases found: {len(test_cases)}, problem_id: {submission.problem_id}")
        if test_cases:
            logging.info(f"Turtle grading - first test_case: {test_cases[0] if test_cases else 'none'}")
        
        test_results = []
        pattern_score = 0
        total_pattern_points = 0
        
        # Calculate default points per test case if not specified
        default_points_per_test = 100 // len(test_cases) if test_cases else 0
        
        if test_cases:
            for i, tc in enumerate(test_cases):
                try:
                    # Get explicit pattern or auto-extract from description
                    pattern = tc.get("pattern", "") or ""
                    description = tc.get("description", f"Test case {i+1}") or f"Test case {i+1}"
                    desc_lower = description.lower()  # Always define desc_lower for later use
                    # Use test case points, or default to even distribution
                    points = tc.get("points") or default_points_per_test
                    total_pattern_points += points
                    
                    # Auto-extract patterns from description if no explicit pattern
                    patterns_to_check = []
                    if pattern:
                        patterns_to_check = [pattern]
                    else:
                        # Extract keywords from description for pattern matching
                        
                        # Method 1: Look for "Uses X()" format
                        func_match = re.search(r'uses?\s+(\w+)\s*\(?', desc_lower)
                        if func_match:
                            patterns_to_check.append(func_match.group(1) + "(")
                        
                        # Method 2: Look for standalone function names like "goto()", "color()", "forward()"
                        if not patterns_to_check:
                            standalone_func = re.search(r'^(\w+)\s*\(\s*\)$', desc_lower.strip())
                            if standalone_func:
                                patterns_to_check.append(standalone_func.group(1) + "(")
                        
                        # Method 3: Look for common turtle commands in description
                        if not patterns_to_check:
                            turtle_commands = ['forward', 'backward', 'left', 'right', 'goto', 'setx', 'sety', 
                                             'circle', 'dot', 'penup', 'pendown', 'pensize', 'pencolor', 
                                             'color', 'speed', 'home', 'clear', 'hideturtle', 'showturtle',
                                             'begin_fill', 'end_fill', 'setheading', 'stamp']
                            for cmd in turtle_commands:
                                if cmd in desc_lower:
                                    patterns_to_check.append(cmd + "(")
                                    break
                        
                        # Look for numbers (degrees, pixels, etc.) - add to patterns
                        numbers = re.findall(r'\b(\d+)\b', description)
                        patterns_to_check.extend(numbers)
                        
                        # Look for specific keywords
                        if 'forward' in desc_lower and 'forward' not in patterns_to_check:
                            patterns_to_check.append('forward')
                        if 'backward' in desc_lower and 'backward' not in patterns_to_check:
                            patterns_to_check.append('backward')
                        if 'left' in desc_lower and 'left' not in patterns_to_check:
                            patterns_to_check.append('left')
                        if 'right' in desc_lower and 'right' not in patterns_to_check:
                            patterns_to_check.append('right')
                        if 'penup' in desc_lower or 'pen up' in desc_lower:
                            patterns_to_check.append('penup')
                        if 'pendown' in desc_lower or 'pen down' in desc_lower:
                            patterns_to_check.append('pendown')
                        if 'pencolor' in desc_lower or 'pen color' in desc_lower:
                            patterns_to_check.append('pencolor')
                        if 'circle' in desc_lower:
                            patterns_to_check.append('circle')
                        if 'goto' in desc_lower or 'go to' in desc_lower:
                            patterns_to_check.append('goto')
                        if 'fillcolor' in desc_lower or 'fill color' in desc_lower:
                            patterns_to_check.append('fillcolor')
                        if 'begin_fill' in desc_lower or 'beginfill' in desc_lower:
                            patterns_to_check.append('begin_fill')
                        if 'end_fill' in desc_lower or 'endfill' in desc_lower:
                            patterns_to_check.append('end_fill')
                        if 'pensize' in desc_lower or 'pen size' in desc_lower:
                            patterns_to_check.append('pensize')
                        if 'speed' in desc_lower:
                            patterns_to_check.append('speed')
                        if 'shape' in desc_lower:
                            patterns_to_check.append('shape')
                        # New turtle commands
                        if 'home' in desc_lower:
                            patterns_to_check.append('home')
                        if 'clearscreen' in desc_lower or 'clear screen' in desc_lower:
                            patterns_to_check.append('clearscreen')
                        if 'pos()' in desc_lower or 'position()' in desc_lower:
                            patterns_to_check.append('pos')
                        if 'setx' in desc_lower or 'set x' in desc_lower:
                            patterns_to_check.append('setx')
                        if 'sety' in desc_lower or 'set y' in desc_lower:
                            patterns_to_check.append('sety')
                        if 'dot' in desc_lower:
                            patterns_to_check.append('dot')
                        if 'heading()' in desc_lower and 'setheading' not in desc_lower:
                            patterns_to_check.append('heading()')
                        if 'setheading' in desc_lower or 'set heading' in desc_lower:
                            patterns_to_check.append('setheading')
                        if 'stamp' in desc_lower and 'clearstamp' not in desc_lower:
                            patterns_to_check.append('stamp')
                        if 'clearstamp' in desc_lower:
                            patterns_to_check.append('clearstamp')
                        if 'xcor' in desc_lower:
                            patterns_to_check.append('xcor')
                        if 'ycor' in desc_lower:
                            patterns_to_check.append('ycor')
                        if 'hideturtle' in desc_lower or 'hide turtle' in desc_lower:
                            patterns_to_check.append('hideturtle')
                        if 'showturtle' in desc_lower or 'show turtle' in desc_lower:
                            patterns_to_check.append('showturtle')
                    
                    # Special case: "names the turtle" - check for variable assignment pattern
                    if 'name' in desc_lower and 'turtle' in desc_lower:
                        # Look for pattern: anything = turtle.Turtle()
                        if '= turtle.Turtle()' in submission.code or '=turtle.Turtle()' in submission.code:
                            patterns_to_check = ['_TURTLE_NAMED_']  # Special marker
                    
                    logging.info(f"Test case '{description}': patterns to check = {patterns_to_check}")
                    
                    # Get min_count requirement (default 1 = just check existence)
                    min_count = tc.get("min_count", 1) or 1
                    
                    # Auto-extract count requirement from description like "5 times" or "x5"
                    if min_count == 1:
                        count_match = re.search(r'(\d+)\s*times?', desc_lower)
                        if count_match:
                            min_count = int(count_match.group(1))
                        else:
                            # Check for "x5" or "×5" pattern
                            x_match = re.search(r'[x×]\s*(\d+)', desc_lower)
                            if x_match:
                                min_count = int(x_match.group(1))
                    
                    # Check if ALL patterns exist in the code (with count requirement)
                    passed = False
                    actual_count = 0
                    if patterns_to_check:
                        if '_TURTLE_NAMED_' in patterns_to_check:
                            # Special case already validated above
                            passed = True
                            pattern_score += points
                            actual_count = 1
                        else:
                            code_lower = submission.code.lower()
                            # Count occurrences of each pattern
                            pattern_counts = []
                            for p in patterns_to_check:
                                count = code_lower.count(p.lower())
                                pattern_counts.append(count)
                            
                            # All patterns must appear at least min_count times
                            actual_count = min(pattern_counts) if pattern_counts else 0
                            passed = actual_count >= min_count
                            if passed:
                                pattern_score += points
                    
                    test_result = {
                        "test_id": f"pattern_{i}",
                        "description": description,
                        "passed": passed,
                        "points": points,
                        "patterns_checked": patterns_to_check
                    }
                    
                    # Add count info if min_count > 1
                    if min_count > 1:
                        test_result["min_count"] = min_count
                        test_result["actual_count"] = actual_count
                        if not passed:
                            test_result["feedback"] = f"Found {actual_count} time(s), need {min_count}"
                    
                    test_results.append(test_result)
                except Exception as tc_error:
                    logging.error(f"Error processing test case {i}: {str(tc_error)}")
                    test_results.append({
                        "test_id": f"pattern_{i}",
                        "description": tc.get("description", f"Test case {i+1}"),
                        "passed": False,
                        "points": tc.get("points", 0),
                        "error": str(tc_error)
                    })
            
            # Calculate final score based on pattern tests
            if total_pattern_points > 0:
                base_score = (pattern_score / total_pattern_points) * 100
            else:
                base_score = turtle_result["score"]
            
            feedback = f"Pattern tests: {pattern_score}/{total_pattern_points} points"
            if turtle_result.get("feedback"):
                feedback += f". {turtle_result['feedback']}"
        else:
            # No pattern test cases - use turtle visual grading
            base_score = turtle_result["score"]
            feedback = turtle_result["feedback"]
            test_results = [{
                "test_id": "turtle_grading",
                "description": "Turtle graphics requirements",
                "passed": base_score >= 70,
                "tracking_data": turtle_result["tracking_data"]
            }]
        
        logging.info(f"Final turtle score: {base_score}, test_results: {len(test_results)}")
        
        is_passing = base_score >= 70
        
        # No lives deduction - unlimited attempts
        
        # Check if late
        is_late = False
        try:
            due_date = datetime.fromisoformat(assignment["due_date"]) if assignment.get("due_date") else None
            if due_date and datetime.now(timezone.utc) > due_date:
                is_late = True
                if assignment.get("late_penalty_percent", 0) > 0:
                    base_score *= (1 - assignment["late_penalty_percent"] / 100)
        except (ValueError, TypeError):
            pass
        
        # Create turtle submission
        new_submission = {
            "id": str(uuid.uuid4()),
            "assignment_id": submission.assignment_id,
            "problem_id": submission.problem_id,
            "student_id": user["id"],
            "code": submission.code,
            "score": base_score,
            "feedback": feedback,
            "test_results": test_results,
            "attempt_number": attempt_number,
            "lives_remaining": lives_remaining,
            "is_passing": is_passing,
            "is_late": is_late,
            "is_final": False,
            "turtle_image": turtle_result["image_data"],
            "turtle_tracking_data": turtle_result["tracking_data"],
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            # DEBUG: Include test_cases info to diagnose grading issues
            "_debug_test_cases_count": len(test_cases),
            "_debug_test_cases_source": "problem" if problem.get("test_cases") else ("assignment.problems" if assignment.get("problems") else "assignment"),
            "_debug_pattern_score": pattern_score,
            "_debug_total_pattern_points": total_pattern_points,
            "_debug_test_cases_raw": test_cases[:5] if test_cases else [],  # First 5 test cases for debugging
            "_debug_code_snippet": submission.code[:200] if submission.code else ""  # First 200 chars of code
        }
        
        await db.submissions.insert_one(new_submission)
        
        # Update user stats if passing
        if is_passing:
            xp_earned = calculate_xp_and_coins(base_score, attempt_number == 1, user.get("current_streak", 0))
            await db.users.update_one(
                {"id": user["id"]},
                {"$inc": {
                    "xp": xp_earned["xp"],
                    "coins": xp_earned["coins"],
                    "problems_solved": 1
                }}
            )
        
        # Remove MongoDB _id before returning
        new_submission.pop("_id", None)
        return new_submission
    
    # Handle Micro:bit assignments with pattern-based grading (no code execution)
    if is_microbit:
        test_cases = problem.get("test_cases", [])
        test_results = []
        total_points = 0
        earned_points = 0
        
        # Pattern-based grading - check if code contains required patterns
        for test_case in test_cases:
            pattern = test_case.get("pattern", "")
            description = test_case.get("description", "Code check")
            points = test_case.get("points", 20)
            total_points += points
            
            # Check if pattern exists in code (supports | for OR patterns)
            patterns = pattern.split("|") if "|" in pattern else [pattern]
            passed = any(p.strip() in submission.code for p in patterns)
            
            if passed:
                earned_points += points
            
            test_results.append({
                "test_id": test_case.get("id", f"pattern_{len(test_results)}"),
                "description": description,
                "passed": passed,
                "pattern": pattern,
                "points": points
            })
        
        # Calculate score
        base_score = (earned_points / total_points * 100) if total_points > 0 else 0
        is_passing = base_score >= 70
        
        # Generate feedback
        if base_score == 100:
            feedback = "🎉 Perfect! Your code includes all the required elements. Now test it on a real Micro:bit!"
        elif base_score >= 70:
            feedback = f"✅ Good job! Score: {base_score:.0f}%. Some patterns are missing - check the test cases for hints."
        else:
            missing = [t["description"] for t in test_results if not t["passed"]]
            feedback = f"Keep trying! Missing: {', '.join(missing[:3])}{'...' if len(missing) > 3 else ''}"
        
        # Check if late
        is_late = False
        try:
            due_date = datetime.fromisoformat(assignment["due_date"]) if assignment.get("due_date") else None
            if due_date and datetime.now(timezone.utc) > due_date:
                is_late = True
                if assignment.get("late_penalty_percent", 0) > 0:
                    base_score *= (1 - assignment["late_penalty_percent"] / 100)
        except (ValueError, TypeError):
            pass
        
        # Create Micro:bit submission
        new_submission = {
            "id": str(uuid.uuid4()),
            "assignment_id": submission.assignment_id,
            "problem_id": submission.problem_id,
            "student_id": user["id"],
            "code": submission.code,
            "score": base_score,
            "feedback": feedback,
            "test_results": test_results,
            "attempt_number": attempt_number,
            "lives_remaining": lives_remaining,
            "is_passing": is_passing,
            "is_late": is_late,
            "is_final": False,
            "submitted_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.submissions.insert_one(new_submission)
        
        # Update user stats if passing
        if is_passing:
            xp_earned = calculate_xp_and_coins(base_score, attempt_number == 1, user.get("current_streak", 0))
            await db.users.update_one(
                {"id": user["id"]},
                {"$inc": {
                    "xp": xp_earned["xp"],
                    "coins": xp_earned["coins"],
                    "problems_solved": 1
                }}
            )
            new_submission["xp_earned"] = xp_earned["xp"]
            new_submission["coins_earned"] = xp_earned["coins"]
        
        # Remove MongoDB _id before returning
        new_submission.pop("_id", None)
        return new_submission
    
    # Handle Block-Based assignments
    is_block = problem.get("assignment_type") == "block"
    logger.info(f"Submission check - assignment_type: {problem.get('assignment_type')}, is_block: {is_block}")
    if is_block:
        screenshot_data = submission.screenshot if hasattr(submission, 'screenshot') else None
        code = submission.code.strip() if submission.code else ""
        
        logger.info(f"Block submission - code length: {len(code)}, code preview: {code[:100] if code else 'NONE'}")
        
        # NEW: Check if this is a Blockly-based block assignment (has Python turtle code)
        # These assignments generate Python code from blocks and should be graded like turtle assignments
        is_blockly_turtle = code and (
            "t.forward" in code or 
            "t.backward" in code or 
            "t.right" in code or 
            "t.left" in code or
            "t.goto" in code or
            "t.penup" in code or
            "t.pendown" in code or
            "import turtle" in code or
            "t = turtle.Turtle()" in code
        )
        
        logger.info(f"is_blockly_turtle: {is_blockly_turtle}")
        
        if is_blockly_turtle:
            # Grade by comparing student code to solution code
            logger.info(f"Block assignment detected with turtle code, using code comparison grading")
            
            # Get test_cases from problem - these have pattern and min_count for block grading
            test_cases = problem.get("test_cases", [])
            solution_code = problem.get("solution_code", "").strip()
            
            logger.info(f"Test cases from problem: {test_cases}")
            logger.info(f"Solution code from problem: {solution_code[:100] if solution_code else 'NONE'}")
            
            # Extract commands from student code
            def extract_turtle_commands(code_text):
                """Extract turtle commands from code for comparison"""
                commands = []
                for line in code_text.split('\n'):
                    line = line.strip()
                    if line.startswith('#') or line.startswith('import') or 't = turtle' in line:
                        continue
                    if line.startswith('t.') or line.startswith('for ') or line.startswith('while '):
                        commands.append(line)
                return commands
            
            student_commands = extract_turtle_commands(code)
            logger.info(f"Student commands: {student_commands}")
            
            # Count command types in student code
            def count_command_types(commands):
                counts = {
                    'forward': 0, 'backward': 0, 'right': 0, 'left': 0,
                    'goto': 0, 'penup': 0, 'pendown': 0, 'color': 0,
                    'repeat': 0, 'for': 0, 'while': 0, 'if': 0,
                    'say': 0, 'hide': 0, 'show': 0, 'home': 0, 'pensize': 0
                }
                for cmd in commands:
                    if 't.forward' in cmd or 't.fd(' in cmd:
                        counts['forward'] += 1
                    elif 't.backward' in cmd or 't.bk(' in cmd:
                        counts['backward'] += 1
                    elif 't.right' in cmd or 't.rt(' in cmd:
                        counts['right'] += 1
                    elif 't.left' in cmd or 't.lt(' in cmd:
                        counts['left'] += 1
                    elif 't.goto' in cmd:
                        counts['goto'] += 1
                    elif 't.home' in cmd:
                        counts['home'] += 1
                    elif 't.penup' in cmd or 't.pu()' in cmd:
                        counts['penup'] += 1
                    elif 't.pendown' in cmd or 't.pd()' in cmd:
                        counts['pendown'] += 1
                    elif 't.color' in cmd or 't.pencolor' in cmd:
                        counts['color'] += 1
                    elif 't.pensize' in cmd:
                        counts['pensize'] += 1
                    elif 't.write' in cmd:
                        counts['say'] += 1
                    elif 't.hideturtle' in cmd or 't.ht()' in cmd:
                        counts['hide'] += 1
                    elif 't.showturtle' in cmd or 't.st()' in cmd:
                        counts['show'] += 1
                    elif cmd.startswith('for '):
                        counts['for'] += 1
                        counts['repeat'] += 1  # Also count as repeat for backwards compatibility
                    elif cmd.startswith('while '):
                        counts['while'] += 1
                    elif cmd.startswith('if '):
                        counts['if'] += 1
                return counts
            
            student_counts = count_command_types(student_commands)
            logger.info(f"Student command counts: {student_counts}")
            
            # Map test case patterns to command types
            pattern_to_command = {
                # Motion blocks
                'move_forward': 'forward', 'forward': 'forward',
                'move_backward': 'backward', 'backward': 'backward',
                'turn_right': 'right', 'right': 'right',
                'turn_left': 'left', 'left': 'left',
                'go_to': 'goto', 'goto': 'goto',
                'home': 'home', 'go_home': 'home',
                # Pen blocks
                'pen_up': 'penup', 'penup': 'penup',
                'pen_down': 'pendown', 'pendown': 'pendown',
                'set_color': 'color', 'color': 'color',
                'set_pen_color': 'color',
                'pensize': 'pensize', 'change_pen_size': 'pensize',
                # Looks blocks
                'say': 'say', 'write': 'say',
                'hide': 'hide', 'show': 'show',
                # Loop blocks
                'repeat': 'repeat', 'loop': 'repeat',
                'for': 'for', 'count': 'for',
                'while': 'while',
                # Logic blocks
                'if': 'if', 'if_else': 'if'
            }
            
            test_results = []
            total_points = 0
            earned_points = 0
            
            # Grade based on test_cases if they exist
            if test_cases and any(tc.get('pattern') for tc in test_cases):
                logger.info(f"Grading using {len(test_cases)} test cases with patterns")
                
                for tc in test_cases:
                    pattern = tc.get('pattern', '').lower()
                    min_count = int(tc.get('min_count', 1))
                    points = int(tc.get('points', 20))
                    description = tc.get('description', f'Uses {pattern}')
                    
                    total_points += points
                    
                    # Map pattern to command type
                    cmd_type = pattern_to_command.get(pattern, pattern)
                    actual_count = student_counts.get(cmd_type, 0)
                    
                    passed = actual_count >= min_count
                    if passed:
                        earned_points += points
                    
                    test_results.append({
                        "test_id": f"test_{len(test_results)}",
                        "description": description,
                        "passed": passed,
                        "expected": f"At least {min_count} {cmd_type} block(s)",
                        "actual": f"Found {actual_count}"
                    })
                    
                    logger.info(f"Test '{description}': pattern={pattern}, cmd_type={cmd_type}, min_count={min_count}, actual={actual_count}, passed={passed}")
                
                base_score = (earned_points / total_points * 100) if total_points > 0 else 0
                
                if base_score >= 90:
                    feedback = f"🎉 Excellent! You passed {sum(1 for t in test_results if t['passed'])}/{len(test_results)} tests ({base_score:.0f}%)"
                elif base_score >= 70:
                    feedback = f"👍 Good job! You passed {sum(1 for t in test_results if t['passed'])}/{len(test_results)} tests ({base_score:.0f}%)"
                elif base_score >= 50:
                    feedback = f"📝 Getting there! {sum(1 for t in test_results if t['passed'])}/{len(test_results)} tests passed ({base_score:.0f}%)"
                else:
                    feedback = f"💪 Keep trying! {sum(1 for t in test_results if t['passed'])}/{len(test_results)} tests passed ({base_score:.0f}%)"
            
            # Fall back to solution code comparison if no pattern-based test cases
            elif solution_code:
                # Compare student code to solution code
                solution_commands = extract_turtle_commands(solution_code)
                solution_counts = count_command_types(solution_commands)
                
                logger.info(f"Solution commands: {solution_commands}")
                logger.info(f"Solution counts: {solution_counts}")
                
                # Compare each command type
                total_possible = 0
                earned = 0
                test_results = []
                
                for cmd_type, expected_count in solution_counts.items():
                    if expected_count > 0:
                        total_possible += expected_count
                        actual_count = student_counts.get(cmd_type, 0)
                        # Give partial credit - student gets points for each matching command up to expected
                        matches = min(actual_count, expected_count)
                        earned += matches
                        
                        passed = actual_count >= expected_count
                        test_results.append({
                            "test_id": f"cmd_{cmd_type}",
                            "description": f"Uses {cmd_type} blocks",
                            "passed": passed,
                            "expected": f"{expected_count} {cmd_type} command(s)",
                            "actual": f"Found {actual_count}"
                        })
                
                base_score = (earned / total_possible * 100) if total_possible > 0 else 0
                
                if base_score >= 90:
                    feedback = f"🎉 Excellent! Score: {base_score:.0f}%"
                elif base_score >= 70:
                    feedback = f"👍 Good job! Score: {base_score:.0f}%"
                elif base_score >= 50:
                    feedback = f"📝 Getting there! Score: {base_score:.0f}%"
                else:
                    feedback = f"💪 Keep trying! Score: {base_score:.0f}%"
            
            else:
                # No test cases and no solution code - grade based on code complexity
                command_types = set()
                loop_count = 0
                for cmd in student_commands:
                    if cmd.startswith('t.forward') or cmd.startswith('t.fd'):
                        command_types.add('forward')
                    elif cmd.startswith('t.backward') or cmd.startswith('t.bk'):
                        command_types.add('backward')
                    elif cmd.startswith('t.right') or cmd.startswith('t.rt'):
                        command_types.add('right')
                    elif cmd.startswith('t.left') or cmd.startswith('t.lt'):
                        command_types.add('left')
                    elif cmd.startswith('t.goto'):
                        command_types.add('goto')
                    elif cmd.startswith('t.penup') or cmd.startswith('t.pu'):
                        command_types.add('penup')
                    elif cmd.startswith('t.pendown') or cmd.startswith('t.pd'):
                        command_types.add('pendown')
                    elif cmd.startswith('t.color') or cmd.startswith('t.pencolor'):
                        command_types.add('color')
                    elif cmd.startswith('for ') or cmd.startswith('while '):
                        loop_count += 1
                        command_types.add('loop')
                
                if len(command_types) == 0:
                    base_score = 0
                    feedback = "❌ No turtle commands detected. Please add some blocks and try again."
                    test_results = [{"test_id": "commands", "description": "Turtle commands", "passed": False, "expected": "At least one command", "actual": "None found"}]
                else:
                    variety_score = min(len(command_types) * 10, 50)
                    complexity_score = min(len(student_commands) * 5, 30)
                    loop_bonus = min(loop_count * 10, 20)
                    
                    base_score = min(variety_score + complexity_score + loop_bonus, 80)
                    
                    feedback = f"📝 Code executed! Commands used: {', '.join(sorted(command_types))}. Score: {base_score:.0f}%. Add solution code to problem for accurate grading."
                    test_results = [
                        {"test_id": "commands", "description": "Commands detected", "passed": True, "expected": "Turtle commands", "actual": f"{len(student_commands)} commands, {len(command_types)} types"},
                        {"test_id": "loops", "description": "Loop usage", "passed": loop_count > 0, "expected": "Use loops for patterns", "actual": f"{loop_count} loop(s)"}
                    ]
            
            # Also run the code to get the turtle image
            grading_result = await grade_turtle_submission(code, {}, "")
            turtle_image = grading_result.get("image_data", "")
            tracking_data = grading_result.get("tracking_data", {})
            
            is_passing = base_score >= 70
            
            # Check if late
            is_late = False
            try:
                due_date = datetime.fromisoformat(assignment["due_date"]) if assignment.get("due_date") else None
                if due_date and datetime.now(timezone.utc) > due_date:
                    is_late = True
                    if assignment.get("late_penalty_percent", 0) > 0:
                        base_score *= (1 - assignment["late_penalty_percent"] / 100)
            except (ValueError, TypeError):
                pass
            
            # Create submission with turtle data
            new_submission = {
                "id": str(uuid.uuid4()),
                "assignment_id": submission.assignment_id,
                "problem_id": submission.problem_id,
                "student_id": user["id"],
                "code": code,
                "score": base_score,
                "feedback": feedback,
                "test_results": test_results,
                "submitted_at": datetime.now(timezone.utc).isoformat(),
                "is_passing": is_passing,
                "is_late": is_late,
                "is_final": False,
                "xp_earned": 0,
                "coins_earned": 0,
                "turtle_image": turtle_image,
                "turtle_tracking_data": tracking_data,
                "submission_type": "blockly_turtle"
            }
            
            await db.submissions.insert_one(new_submission)
            new_submission.pop("_id", None)
            return new_submission
        
        # LEGACY: Handle old Scratch screenshot-based block assignments
        scratch_url = code
        
        # If no screenshot provided, check for URL fallback
        if not screenshot_data:
            if scratch_url and ("scratch.mit.edu/projects/" in scratch_url or "turbowarp.org" in scratch_url):
                # URL provided but no screenshot - give partial credit
                base_score = 50.0
                feedback = "⚠️ Partial credit: You submitted a Scratch project URL, but no screenshot for AI grading. Please upload a screenshot of your code blocks for full credit."
                test_results = [{"test_id": "screenshot", "description": "Screenshot uploaded", "passed": False, "expected": "Screenshot of code blocks", "actual": "Only URL provided"}]
            else:
                base_score = 0.0
                feedback = "❌ No screenshot uploaded. Please:\n1. Create your project in Scratch\n2. Take a screenshot of your code blocks\n3. Upload the screenshot and submit again."
                test_results = [{"test_id": "screenshot", "description": "Screenshot uploaded", "passed": False, "expected": "Screenshot of code blocks", "actual": "No screenshot"}]
        else:
            # Use AI Vision to analyze the screenshot
            try:
                api_key = os.environ.get("EMERGENT_LLM_KEY")
                if not api_key:
                    raise Exception("AI key not configured")
                
                # Get problem requirements
                problem_title = problem.get("title", "Scratch Challenge")
                problem_desc = problem.get("description", "Complete the challenge")
                block_requirements = problem.get("block_requirements", [])
                
                # Build grading prompt
                grading_prompt = f"""You are grading a student's Scratch code blocks screenshot. 

PROBLEM: {problem_title}
DESCRIPTION: {problem_desc}

{"REQUIRED BLOCKS/CONCEPTS: " + ", ".join(block_requirements) if block_requirements else ""}

Analyze the screenshot and grade based on:
1. Does the code attempt to solve the problem? (40 points)
2. Are the correct block types used (loops, conditionals, variables, events, etc.)? (30 points)
3. Is the code organized and logical? (20 points)
4. Is the solution complete? (10 points)

Respond in this exact JSON format:
{{
  "score": <number 0-100>,
  "blocks_found": ["list", "of", "block", "types", "seen"],
  "strengths": ["what the student did well"],
  "improvements": ["suggestions for improvement"],
  "feedback": "A brief, encouraging 2-3 sentence feedback for the student"
}}

Be encouraging but fair. Give partial credit for good attempts."""

                # Initialize LLM with vision capability using emergentintegrations
                from emergentintegrations.llm.chat import ImageContent
                
                # Extract base64 data from data URL if needed
                image_base64 = screenshot_data
                if screenshot_data.startswith('data:'):
                    # Extract the base64 part after the comma
                    image_base64 = screenshot_data.split(',')[1] if ',' in screenshot_data else screenshot_data
                
                # Create image content
                image_content = ImageContent(image_base64=image_base64)
                
                # Initialize chat with proper parameters
                vision_chat = LlmChat(
                    api_key=api_key,
                    session_id=f"scratch_grading_{submission.assignment_id}_{user['id']}_{uuid.uuid4().hex[:8]}",
                    system_message="You are an expert Scratch programming instructor who grades student code screenshots. Analyze the visual blocks and provide fair, encouraging feedback."
                ).with_model("openai", "gpt-4o")
                
                # Send message with image
                grading_message = UserMessage(
                    text=grading_prompt,
                    file_contents=[image_content]
                )
                
                response = await vision_chat.send_message(grading_message)
                
                # Parse AI response - handle markdown code blocks
                import json

                
                # Clean up the response - remove markdown code blocks if present
                clean_response = response.strip()
                
                # Remove ```json ... ``` wrapper if present
                json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', clean_response)
                if json_match:
                    clean_response = json_match.group(1).strip()
                
                # Also try to find JSON object directly
                if not clean_response.startswith('{'):
                    json_start = clean_response.find('{')
                    json_end = clean_response.rfind('}') + 1
                    if json_start != -1 and json_end > json_start:
                        clean_response = clean_response[json_start:json_end]
                
                try:
                    grading_result = json.loads(clean_response)
                    base_score = float(grading_result.get("score", 70))
                    blocks_found = grading_result.get("blocks_found", [])
                    strengths = grading_result.get("strengths", [])
                    improvements = grading_result.get("improvements", [])
                    ai_feedback = grading_result.get("feedback", "Good effort!")
                    
                    # Build detailed feedback
                    feedback_parts = [f"🎯 Score: {base_score:.0f}%\n"]
                    feedback_parts.append(f"💬 {ai_feedback}\n")
                    
                    if blocks_found:
                        feedback_parts.append(f"\n📦 Blocks detected: {', '.join(blocks_found)}")
                    
                    if strengths:
                        feedback_parts.append(f"\n\n✅ Strengths:\n• " + "\n• ".join(strengths))
                    
                    if improvements and base_score < 90:
                        feedback_parts.append(f"\n\n💡 To improve:\n• " + "\n• ".join(improvements))
                    
                    feedback = "".join(feedback_parts)
                    
                    test_results = [
                        {"test_id": "ai_grading", "description": "AI Vision Analysis", "passed": base_score >= 70, "expected": "70% or higher", "actual": f"{base_score:.0f}%"},
                        {"test_id": "blocks_used", "description": "Block types detected", "passed": len(blocks_found) > 0, "expected": "Relevant blocks", "actual": ", ".join(blocks_found) if blocks_found else "None detected"}
                    ]
                    
                except json.JSONDecodeError as je:
                    # AI response wasn't valid JSON, try to extract score from text
                    logger.warning(f"JSON parse error: {je}. Response: {clean_response[:200]}")
                    base_score = 75.0
                    feedback = f"✅ Screenshot received and analyzed.\n\nAI Analysis: {response[:500]}"
                    test_results = [{"test_id": "ai_grading", "description": "AI Vision Analysis", "passed": True, "expected": "Screenshot analysis", "actual": "Completed"}]
                    
            except Exception as e:
                logger.error(f"AI Vision grading error: {str(e)}")
                # Fallback: give credit for submitting screenshot
                base_score = 70.0
                feedback = f"✅ Screenshot received! AI grading temporarily unavailable, but your submission has been recorded. Your teacher will review it."
                test_results = [{"test_id": "screenshot", "description": "Screenshot uploaded", "passed": True, "expected": "Screenshot", "actual": "Received"}]
        
        is_passing = base_score >= 70
        
        # Check if late
        is_late = False
        try:
            due_date = datetime.fromisoformat(assignment["due_date"]) if assignment.get("due_date") else None
            if due_date and datetime.now(timezone.utc) > due_date:
                is_late = True
                if assignment.get("late_penalty_percent", 0) > 0:
                    base_score *= (1 - assignment["late_penalty_percent"] / 100)
        except (ValueError, TypeError):
            pass
        
        # Create block submission
        new_submission = {
            "id": str(uuid.uuid4()),
            "assignment_id": submission.assignment_id,
            "problem_id": submission.problem_id,
            "student_id": user["id"],
            "code": scratch_url,
            "screenshot": screenshot_data[:100] + "..." if screenshot_data and len(screenshot_data) > 100 else None,  # Store truncated reference
            "score": base_score,
            "feedback": feedback,
            "test_results": test_results,
            "attempt_number": attempt_number,
            "lives_remaining": lives_remaining,
            "is_passing": is_passing,
            "is_late": is_late,
            "is_final": False,
            "submission_type": "scratch_screenshot",
            "submitted_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.submissions.insert_one(new_submission)
        
        # Update user stats if passing
        if is_passing:
            xp_earned = calculate_xp_and_coins(base_score, attempt_number == 1, user.get("current_streak", 0))
            await db.users.update_one(
                {"id": user["id"]},
                {"$inc": {
                    "xp": xp_earned["xp"],
                    "coins": xp_earned["coins"],
                    "problems_solved": 1
                }}
            )
            new_submission["xp_earned"] = xp_earned["xp"]
            new_submission["coins_earned"] = xp_earned["coins"]
        
        # Remove MongoDB _id before returning
        new_submission.pop("_id", None)
        return new_submission
    
    # Run test cases (if provided) - for traditional code assignments
    # Check both assignment and problem for test cases
    test_cases = assignment.get("test_cases", []) or problem.get("test_cases", [])
    test_results = []
    total_tests = len(test_cases)
    passed_tests = 0
    
    # Log test case configuration for debugging
    logging.info(f"📊 GRADING: Assignment '{assignment.get('title')}', Problem '{problem.get('title')}'")
    logging.info(f"📊 GRADING: Found {total_tests} test cases")
    for i, tc in enumerate(test_cases):
        logging.info(f"📊 TEST CASE {i+1}: input='{tc.get('input_data') or tc.get('input', '')}', expected='{tc.get('expected_output', '')}'")
    
    try:
        if total_tests > 0:
            # Traditional test case evaluation
            for test_case in test_cases:
                # Support both 'input_data' (old) and 'input' (new) field names
                test_input = test_case.get("input_data") or test_case.get("input", "")
                
                # Normalize input: handle comma-separated values on multiple lines
                # Convert "10,\n20,\n30" or "10, 20, 30" to "10\n20\n30"
                if test_input:
                    # First, replace any newlines with a placeholder
                    # Then split by comma and/or newline

                    # Split by comma or newline, strip whitespace from each value
                    values = re.split(r'[,\n]+', test_input)
                    values = [v.strip() for v in values if v.strip()]
                    test_input = '\n'.join(values)
                
                logging.info(f"📊 TEST INPUT (normalized): '{test_input}'")
                
                result = run_python_code(submission.code, test_input)
                expected = normalize_output(test_case.get("expected_output", ""))
                actual = normalize_output(result["output"]) if result["success"] else ""
                
                # Debug logging for test case comparison
                logging.info(f"📊 TEST CASE: input='{test_input}', expected='{expected}', actual='{actual}', success={result['success']}")
                if result.get("error"):
                    logging.info(f"📊 TEST CASE ERROR: {result.get('error')}")
                
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
    
    # Apply deterministic partial credit rules (use defaults if not configured)
    partial_credit_rules = problem.get("partial_credit_rules", {})
    
    # Set defaults if not configured (for backwards compatibility with old assignments)
    if not partial_credit_rules:
        partial_credit_rules = {
            "syntax_error_penalty": 30,
            "runtime_error_penalty": 20,
            "partial_pass_bonus": 10,
            "close_attempt_bonus": 15
        }
    
    # Calculate deterministic adjustments
    score_adjustment = 0
    adjustment_reasons = []
    
    if True:  # Always apply deterministic rules
        # Check for syntax/runtime errors from test results (not by running code separately)
        # Look at the test results to see if there were actual errors
        has_syntax_error = False
        has_runtime_error = False
        
        for test_result in test_results:
            error_msg = test_result.get("error", "")
            if error_msg:
                if "SyntaxError" in error_msg or "IndentationError" in error_msg:
                    has_syntax_error = True
                elif "NameError" in error_msg or "TypeError" in error_msg or "AttributeError" in error_msg:
                    has_runtime_error = True
        
        if has_syntax_error:
            penalty = partial_credit_rules.get("syntax_error_penalty", 30)
            score_adjustment -= penalty
            adjustment_reasons.append(f"Syntax/Indentation error: -{penalty}%")
        elif has_runtime_error:
            penalty = partial_credit_rules.get("runtime_error_penalty", 20)
            score_adjustment -= penalty
            adjustment_reasons.append(f"Runtime error: -{penalty}%")
        
        # Check for partial test passes (logic mostly correct)
        if total_tests > 0 and passed_tests > 0 and passed_tests < total_tests:
            pass_rate = passed_tests / total_tests
            if pass_rate >= 0.5:  # More than half tests passing
                bonus = partial_credit_rules.get("partial_pass_bonus", 10)
                score_adjustment += bonus
                adjustment_reasons.append(f"Partial solution bonus: +{bonus}%")
        
        # Check for output formatting issues (close but not exact)
        if total_tests > 0 and passed_tests == 0:
            has_close_attempt = False
            minor_difference = False
            
            for test_result in test_results:
                expected = str(test_result.get("expected", "")).strip()
                actual = str(test_result.get("actual", "")).strip()
                
                # Check for minor differences (only end punctuation)
                # Remove only trailing punctuation (., !, ?) but keep internal content like quotes

                expected_trimmed = re.sub(r'[.!?]+$', '', expected).strip()
                actual_trimmed = re.sub(r'[.!?]+$', '', actual).strip()
                
                # Minor difference: exact match except for trailing punctuation
                if expected_trimmed.lower() == actual_trimmed.lower():
                    # Check if they only differ by 1-2 characters at the end
                    if abs(len(expected) - len(actual)) <= 2:
                        minor_difference = True
                        break
                
                # Close attempt: similar content (50%+ words match)
                expected_lower = expected.lower()
                actual_lower = actual.lower()
                if expected and actual:
                    expected_words = set(expected_lower.split())
                    actual_words = set(actual_lower.split())
                    if len(expected_words & actual_words) >= len(expected_words) * 0.5:
                        has_close_attempt = True
            
            if minor_difference:
                # Very close - just missing/wrong end punctuation
                bonus = min(30, partial_credit_rules.get("close_attempt_bonus", 15) * 2)
                score_adjustment += bonus
                adjustment_reasons.append(f"Minor punctuation issue: +{bonus}%")
            elif has_close_attempt:
                bonus = partial_credit_rules.get("close_attempt_bonus", 15)
                score_adjustment += bonus
                adjustment_reasons.append(f"Close attempt (partial match): +{bonus}%")
    
    # Apply adjustment to base score
    final_score = max(0, min(100, base_score + score_adjustment))
    
    # Generate AI feedback (for guidance only, not scoring)
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    chat = LlmChat(
        api_key=llm_key,
        session_id=f"submission_{submission.assignment_id}_{user['id']}",
        system_message="You are a helpful coding instructor. Provide constructive feedback to help students improve. Do NOT assign scores - only give guidance."
    ).with_model("openai", "gpt-4o")
    
    if total_tests > 0 and len(assignment.get("test_cases", [])) > 0:
        # Traditional test case prompt - FEEDBACK ONLY
        # Include specific details about what failed
        failed_details = ""
        for tr in test_results:
            if not tr.get('passed'):
                failed_details += f"\n- Test '{tr.get('description', 'Unknown')}': Expected '{tr.get('expected')}' but got '{tr.get('actual')}'"
        
        prompt = f"""
Provide helpful feedback for this Python code submission:

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
- Score: {final_score}% (already calculated)

Failed Test Details:{failed_details if failed_details else " None - all tests passed!"}

CRITICAL INSTRUCTIONS:
- If score is 0% or tests failed, you MUST explain what went wrong - do NOT say the code is correct
- Compare the expected output vs actual output carefully
- If output shows '[1, 2, 3]' but expected '[1, 2, 3, 4]', the student is missing elements
- If output shows "['1', '2']" (strings) but expected "[1, 2]" (integers), explain int() conversion needed
- Be specific about the exact difference between expected and actual output
- Provide 2-3 sentences of actionable feedback to help fix the issue
- DO NOT say code is "perfect" or "correct" if tests failed
- DO NOT assign a score - that's already been calculated

Just provide the feedback text (no JSON, no score):
"""
    else:
        # Simple comparison prompt - FEEDBACK ONLY
        prompt = f"""
Provide helpful feedback for this Python code submission:

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
Score: {final_score}% (already calculated)

INSTRUCTIONS:
- Provide 2-3 sentences of constructive feedback
- Explain what they did well and what needs improvement
- Give specific suggestions to help them succeed
- Be encouraging and supportive
- DO NOT assign a score - that's already been calculated

Just provide the feedback text (no JSON, no score):
"""
    
    try:
        user_message = UserMessage(text=prompt)
        ai_feedback_response = await chat.send_message(user_message)
        
        # AI provides feedback only, score is already calculated
        feedback = ai_feedback_response[:500] if ai_feedback_response else "Good effort! Keep practicing."
        
        # Add adjustment reasons to feedback if any
        if adjustment_reasons:
            feedback = " | ".join(adjustment_reasons) + " | " + feedback
            
    except Exception as e:
        logging.error(f"AI feedback error: {str(e)}")
        feedback = f"Test Results: {passed_tests}/{total_tests} passed."
        if adjustment_reasons:
            feedback += " | " + " | ".join(adjustment_reasons)
    
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
    
    # No lives deduction - unlimited attempts until student clicks Done
    # lives_remaining stays at 999
    
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
    
    logging.info(f"📝 SUBMISSION: Success! Score={final_score}, is_passing={is_passing}")
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


@api_router.get("/assignments/{assignment_id}/student-progress")
async def get_student_progress(assignment_id: str, request: Request, classroom_id: str = None):
    """Get student progress summary for each problem in an assignment"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view student progress")
    
    # Get assignment
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Verify teacher owns this assignment
    teacher_id = assignment.get("teacher_id")
    if teacher_id and teacher_id != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get problem IDs from the assignment
    # Handle both cases: problems array with full objects OR problem_ids array with just IDs
    problems_data = assignment.get("problems", [])
    problem_ids_raw = assignment.get("problem_ids", [])
    
    # If problems is an array of objects, extract the IDs
    if problems_data and isinstance(problems_data[0], dict):
        problem_ids = [p.get("id") for p in problems_data if p.get("id")]
        # Use the embedded problems data directly
        problems_dict = {p.get("id"): p for p in problems_data}
    elif problem_ids_raw:
        problem_ids = problem_ids_raw
        # Need to fetch from DB
        problems = await db.problems.find(
            {"id": {"$in": problem_ids}},
            {"_id": 0, "id": 1, "title": 1}
        ).to_list(100)
        problems_dict = {p["id"]: p for p in problems}
    else:
        return {"problems": [], "students": [], "summary": {}}
    
    if not problem_ids:
        return {"problems": [], "students": [], "summary": {}}
    
    # Get students from classroom(s)
    classroom_ids = assignment.get("classroom_ids", [])
    if not classroom_ids and assignment.get("classroom_id"):
        classroom_ids = [assignment["classroom_id"]]
    if classroom_id:
        classroom_ids = [classroom_id]  # Filter to specific classroom
    
    all_students = []
    for cid in classroom_ids:
        classroom = await db.classrooms.find_one({"id": cid}, {"_id": 0})
        if classroom:
            student_ids = classroom.get("students", [])
            for sid in student_ids:
                student = await db.users.find_one({"id": sid}, {"_id": 0, "id": 1, "name": 1})
                if student and student not in all_students:
                    all_students.append(student)
    
    # Get all submissions for this assignment
    submissions = await db.submissions.find(
        {"assignment_id": assignment_id},
        {"_id": 0}
    ).to_list(5000)
    
    # Build progress data: for each problem, track which students passed
    progress = {}
    for pid in problem_ids:
        progress[pid] = {
            "problem_id": pid,
            "problem_title": problems_dict.get(pid, {}).get("title", f"Problem {problem_ids.index(pid) + 1}"),
            "completed_students": [],
            "in_progress_students": [],
            "not_started_students": []
        }
    
    # Track student progress
    student_submissions = {}  # student_id -> {problem_id -> best_submission}
    for sub in submissions:
        sid = sub.get("student_id")
        pid = sub.get("problem_id")
        if sid and pid:
            if sid not in student_submissions:
                student_submissions[sid] = {}
            # Keep track of best submission (passing > non-passing)
            existing = student_submissions[sid].get(pid)
            if not existing or (sub.get("is_passing") and not existing.get("is_passing")):
                student_submissions[sid][pid] = sub
    
    # Categorize students for each problem
    # Also check for is_final status (student clicked "Done")
    for student in all_students:
        sid = student["id"]
        student_name = student["name"]
        for pid in problem_ids:
            sub = student_submissions.get(sid, {}).get(pid)
            # Check if any submission is marked as final
            student_subs_for_problem = [s for s in submissions if s.get("student_id") == sid and s.get("problem_id") == pid]
            is_final = any(s.get("is_final") for s in student_subs_for_problem)
            
            student_info = {"id": sid, "name": student_name}
            if sub:
                # Consider "done" if is_final OR is_passing
                if sub.get("is_passing") or is_final:
                    progress[pid]["completed_students"].append({
                        **student_info,
                        "score": sub.get("score", 0),
                        "submitted_at": sub.get("submitted_at"),
                        "is_final": is_final
                    })
                else:
                    progress[pid]["in_progress_students"].append({
                        **student_info,
                        "score": sub.get("score", 0),
                        "attempts": len(student_subs_for_problem)
                    })
            else:
                progress[pid]["not_started_students"].append(student_info)
    
    # Build summary
    summary = {
        "total_students": len(all_students),
        "problems_count": len(problem_ids),
        "overall_completion": {}
    }
    
    for pid in problem_ids:
        completed = len(progress[pid]["completed_students"])
        in_progress = len(progress[pid]["in_progress_students"])
        summary["overall_completion"][pid] = {
            "completed": completed,
            "in_progress": in_progress,
            "not_started": len(progress[pid]["not_started_students"]),
            "completion_rate": round(completed / len(all_students) * 100, 1) if all_students else 0
        }
    
    return {
        "assignment_title": assignment.get("title", ""),
        "problems": [progress[pid] for pid in problem_ids],
        "students": all_students,
        "summary": summary
    }


@api_router.get("/assignments/{assignment_id}/student-code/{student_id}/{problem_id}")
async def get_student_code(assignment_id: str, student_id: str, problem_id: str, request: Request):
    """Get a specific student's latest code submission for a problem (Teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view student code")
    
    # Verify teacher owns this assignment
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    teacher_id = assignment.get("teacher_id")
    if teacher_id and teacher_id != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get the student info
    student = await db.users.find_one({"id": student_id}, {"_id": 0, "id": 1, "name": 1})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get the latest submission for this student/problem
    submissions = await db.submissions.find(
        {"assignment_id": assignment_id, "student_id": student_id, "problem_id": problem_id},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(100)
    
    if not submissions:
        return {
            "student_id": student_id,
            "student_name": student["name"],
            "problem_id": problem_id,
            "code": None,
            "score": None,
            "is_final": False,
            "is_passing": False,
            "submitted_at": None,
            "attempts": 0
        }
    
    # Get the latest submission
    latest = submissions[0]
    
    # Check for any final submission
    final_submission = next((s for s in submissions if s.get("is_final")), None)
    
    # Use final submission if exists, otherwise latest
    best_submission = final_submission if final_submission else latest
    
    return {
        "student_id": student_id,
        "student_name": student["name"],
        "problem_id": problem_id,
        "code": best_submission.get("code", ""),
        "score": best_submission.get("score", 0),
        "is_final": best_submission.get("is_final", False),
        "is_passing": best_submission.get("is_passing", False),
        "submitted_at": best_submission.get("submitted_at"),
        "attempts": len(submissions),
        "feedback": best_submission.get("feedback", ""),
        "test_results": best_submission.get("test_results", []),
        "turtle_image": best_submission.get("turtle_image", "")
    }


@api_router.post("/assignments/{assignment_id}/unlock-problem")
async def unlock_problem(assignment_id: str, data: dict, request: Request):
    """Unlock a 'done' problem with proctor code"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can unlock problems")
    
    assignment = await db.assignments.find_one({"id": assignment_id})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Verify proctor code
    provided_code = data.get("proctor_code", "").strip()
    stored_code = assignment.get("proctor_code", "").strip()
    
    if not provided_code or provided_code != stored_code:
        raise HTTPException(status_code=403, detail="Invalid proctor code")
    
    # Find the submission marked as final
    problem_id = data.get("problem_id")
    submission = await db.submissions.find_one({
        "assignment_id": assignment_id,
        "problem_id": problem_id,
        "student_id": user["id"],
        "is_final": True
    })
    
    if not submission:
        raise HTTPException(status_code=404, detail="No final submission found")
    
    # Unlock by setting is_final to False
    await db.submissions.update_one(
        {"id": submission["id"]},
        {"$set": {"is_final": False}}
    )
    
    return {"message": "Problem unlocked successfully"}


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


@api_router.get("/student/completed-assignments")
async def get_completed_assignments(request: Request):
    """Get all assignment IDs that the student has completed (has at least one final submission)"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    # Find all unique assignment_ids where the student has at least one final submission
    pipeline = [
        {
            "$match": {
                "student_id": user["id"],
                "is_final": True
            }
        },
        {
            "$group": {
                "_id": "$assignment_id"
            }
        }
    ]
    
    result = await db.submissions.aggregate(pipeline).to_list(1000)
    completed_assignment_ids = [doc["_id"] for doc in result]
    
    return {"completed_assignment_ids": completed_assignment_ids}


@api_router.post("/get-hint")
async def get_hint(hint_request: HintRequest, request: Request):
    """Get an AI-generated hint for a coding problem (costs coins)"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    from dotenv import load_dotenv
    load_dotenv()
    
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can request hints")
    
    # Validate hint level
    if hint_request.hint_level not in [1, 2]:
        raise HTTPException(status_code=400, detail="Hint level must be 1 or 2")
    
    # Check how many hints student has used for this assignment
    hints_used = await db.hint_usage.count_documents({
        "student_id": user["id"],
        "assignment_id": hint_request.assignment_id
    })
    
    if hints_used >= 2:
        raise HTTPException(
            status_code=400, 
            detail="You've used all 2 hints for this assignment. Try reading the feedback carefully!"
        )
    
    # Check if they're requesting the right hint level (must be sequential)
    if hint_request.hint_level == 2 and hints_used < 1:
        raise HTTPException(
            status_code=400,
            detail="You must use Hint 1 before requesting Hint 2"
        )
    
    if hint_request.hint_level == 1 and hints_used >= 1:
        raise HTTPException(
            status_code=400,
            detail="You've already used Hint 1. Try Hint 2 or read the feedback!"
        )
    
    # Determine coin cost
    coin_cost = 50 if hint_request.hint_level == 1 else 100
    
    # Check if student has enough coins
    if user.get("coins", 0) < coin_cost:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough coins! You need {coin_cost} coins but only have {user.get('coins', 0)}."
        )
    
    # Get the assignment and problem details
    assignment = await db.assignments.find_one(
        {"id": hint_request.assignment_id},
        {"_id": 0}
    )
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Find the specific problem - handle both single problem and multi-problem assignments
    problem = None
    problems_list = assignment.get("problems", [])
    
    # If problems is a list and not empty
    if problems_list:
        for p in problems_list:
            if p.get("id") == hint_request.problem_id:
                problem = p
                break
    
    # If still not found, treat this as a single-problem assignment (old structure)
    # For single-problem assignments, use the assignment data itself
    if not problem:
        problem = {
            "id": assignment.get("id"),
            "title": assignment.get("title", "Coding Problem"),
            "description": assignment.get("description", assignment.get("problem_description", ""))
        }
    
    # Get student's previous submissions/feedback for this problem
    # Try with the provided problem_id first, then fall back to assignment_id
    previous_submissions = await db.submissions.find(
        {
            "student_id": user["id"],
            "assignment_id": hint_request.assignment_id,
            "$or": [
                {"problem_id": hint_request.problem_id},
                {"problem_id": hint_request.assignment_id}
            ]
        },
        {"_id": 0}
    ).sort("submitted_at", -1).limit(3).to_list(length=3)
    
    # Build context for AI
    previous_feedback = ""
    if previous_submissions:
        feedback_list = [sub.get("feedback", "") for sub in previous_submissions if sub.get("feedback")]
        if feedback_list:
            previous_feedback = "\n\nPrevious feedback they received:\n" + "\n---\n".join(feedback_list[:2])
    
    # Generate hint using AI
    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        
        if hint_request.hint_level == 1:
            system_message = """You are a helpful coding tutor. Provide a brief, encouraging hint that guides the student toward the solution WITHOUT giving away the answer. Focus on:
1. Pointing out what they should think about
2. Asking guiding questions
3. Reminding them to check their feedback
Keep it under 100 words."""
        else:
            system_message = """You are a helpful coding tutor. Provide a more detailed hint that helps the student understand their mistake. You can:
1. Point out specific issues in their code
2. Explain concepts they might be missing
3. Give a partial example (but not the full solution)
Keep it under 150 words."""
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"hint_{user['id']}_{hint_request.assignment_id}",
            system_message=system_message
        ).with_model("openai", "gpt-4o-mini")
        
        prompt = f"""Problem: {problem.get('title', 'Coding Problem')}
Description: {problem.get('description', '')}

Student's current code:
```python
{hint_request.code}
```
{previous_feedback}

Provide a helpful hint at level {hint_request.hint_level}."""

        user_message = UserMessage(text=prompt)
        hint_text = await chat.send_message(user_message)
        
        logger.info(f"Generated hint for student {user['id']}, level {hint_request.hint_level}, length: {len(hint_text) if hint_text else 0}")
        
        if not hint_text or hint_text.strip() == "":
            raise ValueError("AI returned empty hint")
        
    except Exception as e:
        logger.error(f"Error generating hint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate hint: {str(e)}")
    
    # Deduct coins from student
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"coins": -coin_cost}}
    )
    
    # Record hint usage
    hint_usage_data = {
        "id": str(uuid.uuid4()),
        "student_id": user["id"],
        "assignment_id": hint_request.assignment_id,
        "problem_id": hint_request.problem_id,
        "hint_level": hint_request.hint_level,
        "coins_spent": coin_cost,
        "hint_text": hint_text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.hint_usage.insert_one(hint_usage_data)
    
    # Get updated coin balance
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    
    return {
        "hint": hint_text,
        "coins_spent": coin_cost,
        "remaining_coins": updated_user.get("coins", 0),
        "hints_used": hints_used + 1,
        "hints_remaining": 2 - (hints_used + 1)
    }


@api_router.get("/hint-status/{assignment_id}")
async def get_hint_status(assignment_id: str, request: Request):
    """Get how many hints the student has used for this assignment"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can check hint status")
    
    hints_used = await db.hint_usage.count_documents({
        "student_id": user["id"],
        "assignment_id": assignment_id
    })
    
    # Check which hint levels have been used
    hint_records = await db.hint_usage.find(
        {
            "student_id": user["id"],
            "assignment_id": assignment_id
        },
        {"_id": 0, "hint_level": 1}
    ).to_list(length=None)
    
    used_levels = [h["hint_level"] for h in hint_records]
    
    return {
        "hints_used": hints_used,
        "hints_remaining": 2 - hints_used,
        "hint1_used": 1 in used_levels,
        "hint2_used": 2 in used_levels
    }


# ==================== LESSON ROUTES ====================

@api_router.post("/lessons")
async def create_lesson(lesson: LessonCreate, request: Request):
    """Create a learning lesson for an assignment/problem"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create lessons")
    
    # Verify the assignment exists and teacher has access
    assignment = await db.assignments.find_one({"id": lesson.assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    if assignment.get("teacher_id") != user["id"]:
        raise HTTPException(status_code=403, detail="You can only create lessons for your own assignments")
    
    new_lesson = Lesson(
        assignment_id=lesson.assignment_id,
        problem_id=lesson.problem_id,
        title=lesson.title,
        content=lesson.content,
        teacher_id=user["id"]
    )
    
    lesson_dict = new_lesson.model_dump()
    lesson_dict["created_at"] = lesson_dict["created_at"].isoformat()
    lesson_dict["updated_at"] = lesson_dict["updated_at"].isoformat()
    
    await db.lessons.insert_one(lesson_dict)
    
    return {"success": True, "lesson_id": new_lesson.id}


@api_router.get("/lessons/{assignment_id}")
async def get_lesson(assignment_id: str, problem_id: Optional[str] = None, request: Request = None):
    """Get lesson for an assignment or specific problem"""
    # Allow both authenticated and unauthenticated access for flexibility
    query = {"assignment_id": assignment_id}
    
    if problem_id:
        # First try to find problem-specific lesson
        query["problem_id"] = problem_id
        lesson = await db.lessons.find_one(query, {"_id": 0})
        if lesson:
            return lesson
        
        # Fall back to assignment-level lesson
        query = {"assignment_id": assignment_id, "problem_id": None}
    
    lesson = await db.lessons.find_one(query, {"_id": 0})
    
    if not lesson:
        return {"exists": False}
    
    return lesson


@api_router.put("/lessons/{lesson_id}")
async def update_lesson(lesson_id: str, lesson_update: LessonCreate, request: Request):
    """Update an existing lesson"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update lessons")
    
    existing_lesson = await db.lessons.find_one({"id": lesson_id}, {"_id": 0})
    if not existing_lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    if existing_lesson["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only update your own lessons")
    
    await db.lessons.update_one(
        {"id": lesson_id},
        {"$set": {
            "title": lesson_update.title,
            "content": lesson_update.content,
            "problem_id": lesson_update.problem_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True}


@api_router.delete("/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str, request: Request):
    """Delete a lesson"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete lessons")
    
    existing_lesson = await db.lessons.find_one({"id": lesson_id}, {"_id": 0})
    if not existing_lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    if existing_lesson["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own lessons")
    
    # Delete video file if exists
    if existing_lesson.get("video_filename"):
        video_path = f"/app/backend/uploads/videos/{existing_lesson['video_filename']}"
        if os.path.exists(video_path):
            os.remove(video_path)
    
    await db.lessons.delete_one({"id": lesson_id})
    
    return {"success": True}


@api_router.post("/lessons/{lesson_id}/upload-video")
async def upload_lesson_video(lesson_id: str, request: Request, video: UploadFile = File(...)):
    """Upload a video for a lesson"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can upload videos")
    
    # Check lesson exists and belongs to teacher
    lesson = await db.lessons.find_one({"id": lesson_id}, {"_id": 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    if lesson["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only upload videos to your own lessons")
    
    # Validate file type
    allowed_types = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]
    if video.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid video format. Supported: MP4, WEBM, MOV, AVI")
    
    # Create uploads directory if it doesn't exist
    upload_dir = "/app/backend/uploads/videos"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = video.filename.split(".")[-1]
    unique_filename = f"{lesson_id}_{uuid.uuid4()}.{file_extension}"
    file_path = f"{upload_dir}/{unique_filename}"
    
    # Delete old video if exists
    if lesson.get("video_filename"):
        old_video_path = f"{upload_dir}/{lesson['video_filename']}"
        if os.path.exists(old_video_path):
            os.remove(old_video_path)
    
    # Save video file in chunks (handles large files)
    try:
        with open(file_path, "wb") as f:
            while chunk := await video.read(1024 * 1024):  # Read 1MB at a time
                f.write(chunk)
    except Exception as e:
        logger.error(f"Error saving video: {str(e)}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Failed to save video")
    
    # Update lesson with video filename
    await db.lessons.update_one(
        {"id": lesson_id},
        {"$set": {"video_filename": unique_filename, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"success": True, "video_filename": unique_filename}


@api_router.get("/lessons/{lesson_id}/video")
async def stream_lesson_video(lesson_id: str, request: Request):
    """Stream lesson video with range support for seeking"""
    from fastapi.responses import FileResponse, StreamingResponse
    
    # Check lesson exists
    lesson = await db.lessons.find_one({"id": lesson_id}, {"_id": 0})
    if not lesson or not lesson.get("video_filename"):
        raise HTTPException(status_code=404, detail="Video not found")
    
    video_path = f"/app/backend/uploads/videos/{lesson['video_filename']}"
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    # Get file size
    file_size = os.path.getsize(video_path)
    
    # Handle range requests for video seeking
    range_header = request.headers.get("range")
    if range_header:
        range_match = range_header.replace("bytes=", "").split("-")
        start = int(range_match[0])
        end = int(range_match[1]) if range_match[1] else file_size - 1
        
        def iter_file():
            with open(video_path, "rb") as f:
                f.seek(start)
                bytes_to_read = end - start + 1
                while bytes_to_read > 0:
                    chunk_size = min(1024 * 1024, bytes_to_read)  # 1MB chunks
                    data = f.read(chunk_size)
                    if not data:
                        break
                    bytes_to_read -= len(data)
                    yield data
        
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(end - start + 1),
            "Content-Type": "video/mp4",
        }
        return StreamingResponse(iter_file(), status_code=206, headers=headers)
    
    # Return full file if no range header
    return FileResponse(video_path, media_type="video/mp4")


# ==================== VIDEO LIBRARY ROUTES ====================

@api_router.get("/video-library")
async def get_video_library(request: Request):
    """Get all videos in the library organized by chapter"""
    user = await get_current_user(request)
    
    # All authenticated users can view the library
    videos = await db.library_videos.find({}, {"_id": 0}).to_list(length=None)
    
    # Organize by chapter
    chapters = {}
    for video in videos:
        chapter = video.get("chapter", "Uncategorized")
        if chapter not in chapters:
            chapters[chapter] = []
        chapters[chapter].append(video)
    
    return {"chapters": chapters}


@api_router.post("/video-library")
async def create_library_video(
    request: Request,
    video: UploadFile = File(...),
    title: str = Form(...),
    chapter: str = Form(...),
    description: Optional[str] = Form(None)
):
    """Upload a new video to the library (Admin only)"""
    from fastapi import Form
    
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Only admins can upload videos to the library")
    
    # Validate file type
    allowed_types = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]
    if video.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid video format. Supported: MP4, WEBM, MOV, AVI")
    
    # Create uploads directory if it doesn't exist
    upload_dir = "/app/backend/uploads/library_videos"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = video.filename.split(".")[-1]
    video_id = str(uuid.uuid4())
    unique_filename = f"{video_id}.{file_extension}"
    file_path = f"{upload_dir}/{unique_filename}"
    
    # Save video file in chunks (handles large files)
    bytes_written = 0
    try:
        with open(file_path, "wb") as f:
            while chunk := await video.read(1024 * 1024):  # Read 1MB at a time
                f.write(chunk)
                bytes_written += len(chunk)
    except Exception as e:
        logger.error(f"Error saving library video: {str(e)}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Failed to save video")
    
    # Validate uploaded file size
    if bytes_written < 1000:  # Less than 1KB indicates corruption
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail="Video file appears to be corrupted or empty. Please try uploading again.")
    
    # Verify file was written correctly
    if not os.path.exists(file_path):
        raise HTTPException(status_code=500, detail="Video file was not saved properly")
    
    actual_size = os.path.getsize(file_path)
    if actual_size < 1000:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Video file too small ({actual_size} bytes). Upload may have been interrupted.")
    
    logger.info(f"Successfully uploaded video: {unique_filename} ({actual_size} bytes)")
    
    # Create video record
    new_video = LibraryVideo(
        id=video_id,
        title=title,
        chapter=chapter,
        description=description,
        filename=unique_filename,
        uploaded_by=user["id"]
    )
    
    video_dict = new_video.model_dump()
    video_dict["created_at"] = video_dict["created_at"].isoformat()
    video_dict["updated_at"] = video_dict["updated_at"].isoformat()
    
    await db.library_videos.insert_one(video_dict)
    
    return {"success": True, "video_id": video_id, "filename": unique_filename}


@api_router.put("/video-library/{video_id}")
async def update_library_video(video_id: str, video_data: LibraryVideoCreate, request: Request):
    """Update video metadata (Admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Only admins can update library videos")
    
    existing_video = await db.library_videos.find_one({"id": video_id}, {"_id": 0})
    if not existing_video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    await db.library_videos.update_one(
        {"id": video_id},
        {"$set": {
            "title": video_data.title,
            "chapter": video_data.chapter,
            "description": video_data.description,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True}


@api_router.delete("/video-library/{video_id}")
async def delete_library_video(video_id: str, request: Request):
    """Delete a video from the library (Admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Only admins can delete library videos")
    
    existing_video = await db.library_videos.find_one({"id": video_id}, {"_id": 0})
    if not existing_video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Delete video file
    video_path = f"/app/backend/uploads/library_videos/{existing_video['filename']}"
    if os.path.exists(video_path):
        os.remove(video_path)
    
    await db.library_videos.delete_one({"id": video_id})
    
    return {"success": True}


@api_router.get("/video-library/{video_id}/info")
async def get_video_info(video_id: str):
    """Get video file information for debugging"""
    video = await db.library_videos.find_one({"id": video_id}, {"_id": 0})
    if not video:
        return {"error": "Video not found in database", "video_id": video_id}
    
    video_path = f"/app/backend/uploads/library_videos/{video['filename']}"
    file_exists = os.path.exists(video_path)
    file_size = os.path.getsize(video_path) if file_exists else 0
    
    return {
        "video_id": video_id,
        "filename": video.get("filename"),
        "title": video.get("title"),
        "file_exists": file_exists,
        "file_size": file_size,
        "file_path": video_path
    }

@api_router.get("/video-library/{video_id}/stream")
@api_router.head("/video-library/{video_id}/stream")
@api_router.options("/video-library/{video_id}/stream")
async def stream_library_video(video_id: str, request: Request):
    """Stream a library video with CORS support"""
    from fastapi.responses import FileResponse, StreamingResponse, Response
    
    # Handle OPTIONS request for CORS preflight
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": "Range, Content-Type",
                "Access-Control-Max-Age": "86400",
            }
        )
    
    # Handle HEAD request
    if request.method == "HEAD":
        video = await db.library_videos.find_one({"id": video_id}, {"_id": 0})
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_path = f"/app/backend/uploads/library_videos/{video['filename']}"
        if not os.path.exists(video_path):
            raise HTTPException(status_code=404, detail="Video file not found")
        
        file_size = os.path.getsize(video_path)
        return Response(
            status_code=200,
            headers={
                "Content-Type": "video/mp4",
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Access-Control-Allow-Origin": "*",
            }
        )
    
    # Check video exists
    video = await db.library_videos.find_one({"id": video_id}, {"_id": 0})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    video_path = f"/app/backend/uploads/library_videos/{video['filename']}"
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    # Use FileResponse with headers - simpler and more reliable
    # FileResponse automatically handles range requests
    return FileResponse(
        video_path,
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "Range, Content-Type",
        }
    )


# ==================== FEEDBACK & MESSAGES ROUTES ====================

@api_router.post("/feedback")
async def submit_feedback(feedback: FeedbackCreate):
    """Submit feedback/question (public - no auth required)"""
    new_message = FeedbackMessage(
        name=feedback.name,
        email=feedback.email,
        user_type=feedback.user_type,
        category=feedback.category,
        message=feedback.message,
        status="unread"
    )
    
    message_dict = new_message.model_dump()
    message_dict["created_at"] = message_dict["created_at"].isoformat()
    
    await db.feedback_messages.insert_one(message_dict)
    
    return {"success": True, "message": "Thank you! Your message has been received."}


@api_router.get("/admin/feedback")
async def get_all_feedback(request: Request):
    """Get all feedback messages (Admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    messages = await db.feedback_messages.find({}, {"_id": 0}).to_list(length=None)
    
    # Sort by created_at descending (newest first)
    messages.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {"messages": messages}


@api_router.get("/admin/feedback/unread-count")
async def get_unread_count(request: Request):
    """Get count of unread messages (Admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    count = await db.feedback_messages.count_documents({"status": "unread"})
    
    return {"unread_count": count}


@api_router.put("/admin/feedback/{message_id}/status")
async def update_message_status(message_id: str, status: str, request: Request):
    """Update message status (Admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if status not in ["unread", "read", "resolved"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.feedback_messages.update_one(
        {"id": message_id},
        {"$set": {"status": status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"success": True}


@api_router.post("/admin/feedback/{message_id}/reply")
async def reply_to_message(message_id: str, reply_data: FeedbackReply, request: Request):
    """Reply to a feedback message (Admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    message = await db.feedback_messages.find_one({"id": message_id}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    result = await db.feedback_messages.update_one(
        {"id": message_id},
        {
            "$set": {
                "admin_reply": reply_data.reply,
                "replied_at": datetime.now(timezone.utc).isoformat(),
                "status": "resolved"
            }
        }
    )
    
    # TODO: Send email notification to user when email service is configured
    # For now, admin can copy the user's email and send manually
    
    return {
        "success": True,
        "message": "Reply saved! Copy user email to send notification manually.",
        "user_email": message.get("email")
    }


@api_router.delete("/admin/feedback/{message_id}")
async def delete_message(message_id: str, request: Request):
    """Delete a feedback message (Admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.feedback_messages.delete_one({"id": message_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"success": True}


# ==================== ANNOUNCEMENTS ROUTES ====================

@api_router.get("/announcements")
async def get_announcements(request: Request):
    """Get all active announcements (for teachers)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")
    
    announcements = await db.announcements.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(length=None)
    
    # Sort by created_at descending (newest first)
    announcements.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {"announcements": announcements}


@api_router.post("/admin/announcements")
async def create_announcement(announcement_data: AnnouncementCreate, request: Request):
    """Create a new announcement (Admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    new_announcement = Announcement(
        title=announcement_data.title,
        content=announcement_data.content,
        created_by=user["id"]
    )
    
    announcement_dict = new_announcement.model_dump()
    announcement_dict["created_at"] = announcement_dict["created_at"].isoformat()
    
    await db.announcements.insert_one(announcement_dict)
    
    return {"success": True, "announcement_id": new_announcement.id}


@api_router.get("/admin/announcements")
async def get_all_announcements_admin(request: Request):
    """Get all announcements including inactive (Admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    announcements = await db.announcements.find({}, {"_id": 0}).to_list(length=None)
    announcements.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {"announcements": announcements}


@api_router.put("/admin/announcements/{announcement_id}/toggle")
async def toggle_announcement(announcement_id: str, request: Request):
    """Toggle announcement active status (Admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    announcement = await db.announcements.find_one({"id": announcement_id}, {"_id": 0})
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    new_status = not announcement.get("is_active", True)
    
    await db.announcements.update_one(
        {"id": announcement_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"success": True, "is_active": new_status}


@api_router.delete("/admin/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, request: Request):
    """Delete an announcement (Admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.announcements.delete_one({"id": announcement_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    return {"success": True}


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
                
                # Login analytics
                teacher["total_logins"] = await db.login_history.count_documents({"user_id": teacher["id"]})
                teacher["last_login"] = teacher.get("last_login", "Never")
                
                # Calculate frequency (logins in last 30 days)
                thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
                recent_logins = await db.login_history.count_documents({
                    "user_id": teacher["id"],
                    "timestamp": {"$gte": thirty_days_ago.isoformat()}
                })
                teacher["recent_login_count"] = recent_logins
                
                # Determine frequency label
                if recent_logins == 0:
                    teacher["frequency"] = "Inactive"
                elif recent_logins >= 20:
                    teacher["frequency"] = "Very Active"
                elif recent_logins >= 10:
                    teacher["frequency"] = "Active"
                else:
                    teacher["frequency"] = "Low Activity"
                    
            except Exception as e:
                logging.error(f"Error enriching teacher {teacher.get('id')}: {e}")
                teacher["classroom_count"] = 0
                teacher["assignment_count"] = 0
                teacher["total_logins"] = 0
                teacher["last_login"] = "Never"
                teacher["recent_login_count"] = 0
                teacher["frequency"] = "Unknown"
        
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

# ==================== DISTRICT ADMIN DASHBOARD ====================

@api_router.get("/district-admin/dashboard")
async def get_district_admin_dashboard(request: Request):
    """Get district-wide statistics (District admin only)"""
    user = await get_current_user(request)
    
    if user.get("role") != "district_admin":
        raise HTTPException(status_code=403, detail="District admin access required")
    
    district = user.get("district")
    
    # Get all schools in district
    schools = await db.schools.find({"district": district}, {"_id": 0}).to_list(length=None)
    
    # Get all teachers in district
    teachers = await db.users.find({"district": district, "role": "teacher"}, {"_id": 0}).to_list(length=None)
    
    # Calculate stats
    total_schools = len(schools)
    total_teachers = len(teachers)
    total_students = sum(school.get("student_count", 0) for school in schools)
    total_classrooms = 0
    
    for teacher in teachers:
        classrooms = await db.classrooms.find({"teacher_id": teacher["id"]}, {"_id": 0}).to_list(length=None)
        total_classrooms += len(classrooms)
    
    return {
        "district": district,
        "schools": schools,
        "teachers": teachers,
        "stats": {
            "total_schools": total_schools,
            "total_teachers": total_teachers,
            "total_students": total_students,
            "total_classrooms": total_classrooms
        }
    }

# ==================== SCHOOL ADMIN DASHBOARD ====================

@api_router.get("/school-admin/dashboard")
async def get_school_admin_dashboard(request: Request):
    """Get school statistics (School admin only)"""
    user = await get_current_user(request)
    
    if user.get("role") != "school_admin":
        raise HTTPException(status_code=403, detail="School admin access required")
    
    school = user.get("school")
    district = user.get("district")
    
    # Get school record
    school_record = await db.schools.find_one({"name": school, "district": district}, {"_id": 0})
    
    # Get all teachers at this school
    teachers = await db.users.find({"school": school, "district": district, "role": "teacher"}, {"_id": 0}).to_list(length=None)
    
    # Calculate stats for each teacher
    teacher_stats = []
    total_students = 0
    total_classrooms = 0
    
    for teacher in teachers:
        classrooms = await db.classrooms.find({"teacher_id": teacher["id"]}, {"_id": 0}).to_list(length=None)
        num_classrooms = len(classrooms)
        num_students = sum(len(c.get("students", [])) for c in classrooms)
        
        total_classrooms += num_classrooms
        total_students += num_students
        
        teacher_stats.append({
            "id": teacher["id"],
            "name": teacher["name"],
            "email": teacher["email"],
            "num_classrooms": num_classrooms,
            "num_students": num_students
        })
    
    return {
        "school": school,
        "district": district,
        "teachers": teacher_stats,
        "stats": {
            "total_teachers": len(teachers),
            "total_classrooms": total_classrooms,
            "total_students": total_students
        }
    }

# ==================== ADMIN ENDPOINTS ====================
# ==================== DISTRICT & SCHOOL ADMIN MANAGEMENT ====================

@api_router.get("/admin/pending-district-admins")
async def get_pending_district_admins(request: Request):
    """Get all pending district admin requests (Platform admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    pending = await db.pending_district_admins.find(
        {"status": "pending_approval"},
        {"_id": 0}
    ).to_list(length=None)
    
    return pending

@api_router.post("/admin/approve-district-admin/{user_id}")
async def approve_district_admin(user_id: str, request: Request):
    """Approve a pending district admin (Platform admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get pending admin
    pending = await db.pending_district_admins.find_one({"id": user_id}, {"_id": 0})
    if not pending:
        raise HTTPException(status_code=404, detail="Pending request not found")
    
    # Create actual user account
    new_user = {
        "id": pending["id"],
        "email": pending["email"],
        "name": pending["name"],
        "password": pending["password"],
        "role": "district_admin",
        "district": pending["district"],
        "job_title": pending["job_title"],
        "is_admin": False,
        "created_at": pending["created_at"],
        "approved_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    # Update pending status
    await db.pending_district_admins.update_one(
        {"id": user_id},
        {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "District admin approved"}

@api_router.post("/admin/reject-district-admin/{user_id}")
async def reject_district_admin(user_id: str, request: Request):
    """Reject a pending district admin (Platform admin only)"""
    user = await get_current_user(request)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Update pending status
    result = await db.pending_district_admins.update_one(
        {"id": user_id},
        {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Pending request not found")
    
    return {"success": True, "message": "District admin request rejected"}

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


# ----- School Admin & District Admin Routes -----

@api_router.get("/school-admin/dashboard")
async def get_school_admin_dashboard(request: Request):
    """Get dashboard data for school admin (view teachers in their school)"""
    user = await get_current_user(request)
    
    if user.get("role") != "school_admin":
        raise HTTPException(status_code=403, detail="School admin access required")
    
    school_name = user.get("school")
    if not school_name:
        raise HTTPException(status_code=400, detail="School not assigned")
    
    # Get all teachers in this school
    teachers = await db.users.find(
        {"role": "teacher", "school": school_name},
        {"_id": 0, "password": 0}
    ).to_list(length=None)
    
    # Get all classrooms from these teachers
    teacher_ids = [t["id"] for t in teachers]
    classrooms = await db.classrooms.find(
        {"teacher_id": {"$in": teacher_ids}},
        {"_id": 0}
    ).to_list(length=None)
    
    # Count total students
    all_student_ids = set()
    for classroom in classrooms:
        all_student_ids.update(classroom.get("students", []))
    
    # Get stats
    stats = {
        "school_name": school_name,
        "total_teachers": len(teachers),
        "total_classrooms": len(classrooms),
        "total_students": len(all_student_ids)
    }
    
    return {
        "stats": stats,
        "teachers": teachers,
        "classrooms": classrooms
    }

@api_router.get("/district-admin/dashboard")
async def get_district_admin_dashboard(request: Request):
    """Get dashboard data for district admin (view schools and teachers in district)"""
    user = await get_current_user(request)
    
    if user.get("role") != "district_admin":
        raise HTTPException(status_code=403, detail="District admin access required")
    
    district_name = user.get("district")
    if not district_name:
        raise HTTPException(status_code=400, detail="District not assigned")
    
    # Get all teachers in this district
    teachers = await db.users.find(
        {"role": "teacher", "district": district_name},
        {"_id": 0, "password": 0}
    ).to_list(length=None)
    
    # Get all schools in district (unique school names from teachers)
    schools_set = set(t.get("school") for t in teachers if t.get("school"))
    
    # Get all classrooms from these teachers
    teacher_ids = [t["id"] for t in teachers]
    classrooms = await db.classrooms.find(
        {"teacher_id": {"$in": teacher_ids}},
        {"_id": 0}
    ).to_list(length=None)
    
    # Count total students across all classrooms
    all_student_ids = set()
    for classroom in classrooms:
        all_student_ids.update(classroom.get("students", []))
    
    # Build schools data with counts
    schools_data = []
    for school_name in schools_set:
        school_teachers = [t for t in teachers if t.get("school") == school_name]
        school_teacher_ids = [t["id"] for t in school_teachers]
        school_classrooms = [c for c in classrooms if c.get("teacher_id") in school_teacher_ids]
        
        school_student_ids = set()
        for classroom in school_classrooms:
            school_student_ids.update(classroom.get("students", []))
        
        schools_data.append({
            "name": school_name,
            "id": school_name.lower().replace(" ", "_"),
            "teacher_count": len(school_teachers),
            "student_count": len(school_student_ids),
            "classroom_count": len(school_classrooms)
        })
    
    # Get stats
    stats = {
        "district": district_name,
        "total_schools": len(schools_set),
        "total_teachers": len(teachers),
        "total_classrooms": len(classrooms),
        "total_students": len(all_student_ids)
    }
    
    return {
        "district": district_name,
        "stats": stats,
        "schools": schools_data,
        "teachers": teachers
    }

@api_router.get("/school-admin/teachers")
async def get_school_admin_teachers(request: Request):
    """Get all teachers in the school admin's school"""
    user = await get_current_user(request)
    
    if user.get("role") != "school_admin":
        raise HTTPException(status_code=403, detail="School admin access required")
    
    school_name = user.get("school")
    if not school_name:
        raise HTTPException(status_code=400, detail="School not assigned")
    
    teachers = await db.users.find(
        {"role": "teacher", "school": school_name},
        {"_id": 0, "password": 0}
    ).to_list(length=None)
    
    return teachers

@api_router.get("/school-admin/teacher/{teacher_id}/classrooms")
async def get_teacher_classrooms_for_admin(teacher_id: str, request: Request):
    """Get classrooms for a specific teacher (school admin view)"""
    user = await get_current_user(request)
    
    if user.get("role") != "school_admin":
        raise HTTPException(status_code=403, detail="School admin access required")
    
    # Verify teacher is in the same school
    teacher = await db.users.find_one({"id": teacher_id, "role": "teacher"}, {"_id": 0})
    if not teacher or teacher.get("school") != user.get("school"):
        raise HTTPException(status_code=403, detail="Teacher not in your school")
    
    classrooms = await db.classrooms.find(
        {"teacher_id": teacher_id},
        {"_id": 0}
    ).to_list(length=None)
    
    # Populate student details for each classroom
    for classroom in classrooms:
        student_ids = classroom.get("students", [])
        students = await db.users.find(
            {"id": {"$in": student_ids}},
            {"_id": 0, "password": 0}
        ).to_list(length=None)
        classroom["students"] = students
    
    return classrooms

@api_router.get("/district-admin/schools")
async def get_district_admin_schools(request: Request):
    """Get all schools in the district admin's district"""
    user = await get_current_user(request)
    
    if user.get("role") != "district_admin":
        raise HTTPException(status_code=403, detail="District admin access required")
    
    district_name = user.get("district")
    if not district_name:
        raise HTTPException(status_code=400, detail="District not assigned")
    
    # Get all teachers in district to determine schools
    teachers = await db.users.find(
        {"role": "teacher", "district": district_name},
        {"_id": 0, "password": 0}
    ).to_list(length=None)
    
    # Group by school
    schools_set = set(t.get("school") for t in teachers if t.get("school"))
    
    schools_data = []
    for school_name in schools_set:
        school_teachers = [t for t in teachers if t.get("school") == school_name]
        schools_data.append({
            "name": school_name,
            "id": school_name.lower().replace(" ", "_"),
            "teacher_count": len(school_teachers)
        })
    
    return schools_data

@api_router.get("/district-admin/teachers-in-school/{school_name}")
async def get_teachers_in_school(school_name: str, request: Request):
    """Get all teachers in a specific school (district admin view)"""
    user = await get_current_user(request)
    
    if user.get("role") != "district_admin":
        raise HTTPException(status_code=403, detail="District admin access required")
    
    # Verify school is in the district
    if user.get("district"):
        teachers = await db.users.find(
            {"role": "teacher", "school": school_name, "district": user.get("district")},
            {"_id": 0, "password": 0}
        ).to_list(length=None)
    else:
        raise HTTPException(status_code=400, detail="District not assigned")
    
    return teachers

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
        unit_type=question.unit_type,
        unit=question.unit,
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
                unit_type=row.get("unit_type", ""),
                unit=row.get("unit", ""),
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


@api_router.put("/mc-questions/bulk-update")
async def bulk_update_mc_questions(data: dict, request: Request):
    """Bulk update multiple MC questions' unit_type, unit, chapter, and/or lesson"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update questions")
    
    question_ids = data.get("question_ids", [])
    if not question_ids:
        raise HTTPException(status_code=400, detail="No questions selected")
    
    update_fields = {}
    
    # Only update fields that are provided and not empty
    if data.get("unit_type") and data["unit_type"] != "keep":
        update_fields["unit_type"] = data["unit_type"]
    if data.get("unit"):
        update_fields["unit"] = data["unit"]
    if data.get("chapter"):
        update_fields["chapter"] = data["chapter"]
    if data.get("lesson"):
        update_fields["lesson"] = data["lesson"]
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Update only questions owned by this teacher
    result = await db.mc_questions.update_many(
        {"id": {"$in": question_ids}, "creator_id": user["id"]},
        {"$set": update_fields}
    )
    
    return {
        "updated": result.modified_count,
        "message": f"Updated {result.modified_count} questions"
    }


@api_router.delete("/mc-questions/bulk-delete")
async def bulk_delete_mc_questions(data: dict, request: Request):
    """Bulk delete multiple MC questions"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete questions")
    
    question_ids = data.get("question_ids", [])
    if not question_ids:
        raise HTTPException(status_code=400, detail="No questions selected")
    
    # Delete only questions owned by this teacher
    result = await db.mc_questions.delete_many(
        {"id": {"$in": question_ids}, "creator_id": user["id"]}
    )
    
    return {
        "deleted": result.deleted_count,
        "message": f"Deleted {result.deleted_count} questions"
    }


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
        due_date=due_date,
        allow_retake=test.allow_retake,
        show_answers_after=test.show_answers_after,
        results_released=test.results_released
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
        # Check if retakes are allowed
        if test.get("allow_retake", False):
            # Delete old attempt to allow retake
            await db.mc_test_attempts.delete_one({"id": existing_attempt["id"]})
        else:
            raise HTTPException(status_code=400, detail="Test already completed. Retakes are not allowed.")
    
    # Check for incomplete attempt
    incomplete_attempt = await db.mc_test_attempts.find_one({
        "test_id": test_id,
        "student_id": user["id"],
        "is_complete": False
    })
    
    if incomplete_attempt:
        # Resume existing attempt
        questions_data = []
        for q_id in incomplete_attempt["randomized_question_ids"]:
            question = await db.mc_questions.find_one({"id": q_id}, {"_id": 0})
            if question:
                randomized_order = incomplete_attempt["randomized_choices"].get(q_id, ["A", "B", "C", "D"])
                shuffled_choices = [question[f"choice_{letter.lower()}"] for letter in randomized_order]
                questions_data.append({
                    "id": q_id,
                    "question_text": question["question_text"],
                    "choices": shuffled_choices
                })
        
        return {
            "attempt_id": incomplete_attempt["id"],
            "test_title": test["title"],
            "test_description": test["description"],
            "time_limit_minutes": test["time_limit_minutes"],
            "num_questions": len(questions_data),
            "questions": questions_data,
            "previous_answers": incomplete_attempt.get("student_answers", {})
        }
    
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
    
    # Get test settings
    test = await db.mc_tests.find_one({"id": test_id})
    # Only show answers if: show_answers_after is True AND results have been released
    results_released = test.get("results_released", False) if test else False
    show_answers_setting = test.get("show_answers_after", True) if test else True
    show_answers = show_answers_setting and results_released
    
    # Grade the test and build question results
    correct_count = 0
    total_questions = len(attempt["randomized_question_ids"])
    question_results = []  # Store results for each question
    
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
            
            is_correct = False
            student_letter = None
            
            # Convert student's position to the actual original letter
            try:
                position = int(student_answer)
                logging.info(f"   Position (converted): {position}")
                if 0 <= position < len(randomized_order):
                    actual_original_letter = randomized_order[position]
                    student_letter = actual_original_letter
                    logging.info(f"   Actual original letter at position {position}: {actual_original_letter}")
                    
                    if actual_original_letter == question["correct_answer"]:
                        correct_count += 1
                        is_correct = True
                        logging.info(f"   ✅ CORRECT! {actual_original_letter} == {question['correct_answer']}")
                    else:
                        logging.info(f"   ❌ WRONG! {actual_original_letter} != {question['correct_answer']}")
                else:
                    logging.info(f"   ⚠️ Position {position} out of range")
            except (ValueError, TypeError) as e:
                logging.info(f"   ⚠️ Error converting answer: {e}")
            
            # Build question result
            q_result = {
                "question_id": q_id,
                "question_text": question.get("question_text", ""),
                "is_correct": is_correct,
                "student_answer": student_letter,
                "randomized_order": randomized_order
            }
            
            # Only include correct answer if show_answers is enabled
            if show_answers:
                q_result["correct_answer"] = question["correct_answer"]
                q_result["choices"] = {
                    "A": question.get("choice_a", ""),
                    "B": question.get("choice_b", ""),
                    "C": question.get("choice_c", ""),
                    "D": question.get("choice_d", "")
                }
            
            question_results.append(q_result)
    
    score = (correct_count / total_questions * 100) if total_questions > 0 else 0
    logging.info(f"\n🎯 Final score: {correct_count}/{total_questions} = {score}%")
    
    # Update attempt with question results
    await db.mc_test_attempts.update_one(
        {"id": attempt["id"]},
        {
            "$set": {
                "student_answers": submission.answers,
                "score": score,
                "is_complete": True,
                "submitted_at": datetime.now(timezone.utc).isoformat(),
                "question_results": question_results
            }
        }
    )
    
    return {
        "score": round(score, 1),
        "correct_count": correct_count,
        "total_questions": total_questions,
        "question_results": question_results if show_answers else [],
        "show_answers": show_answers,
        "results_released": results_released,
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
        
        logger.info(f"🔍 Found {len(attempts)} completed attempts for test {test_id}")
        
        # Populate student names
        for attempt in attempts:
            student_id = attempt.get("student_id")
            logger.info(f"🔍 Looking up student_id: {student_id}")
            
            student = await db.users.find_one(
                {"id": student_id},
                {"_id": 0, "name": 1, "email": 1}
            )
            
            if student:
                logger.info(f"✅ Found student: {student.get('name')}")
                attempt["student_name"] = student.get("name", "Unknown")
                attempt["student_email"] = student.get("email", "")
            else:
                logger.info(f"❌ Student not found for id: {student_id}")
                # Try to get count of users to debug
                user_count = await db.users.count_documents({})
                logger.info(f"📊 Total users in database: {user_count}")
                attempt["student_name"] = "Unknown Student"
                attempt["student_email"] = ""
        
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


@api_router.put("/mc-tests/{test_id}/release-results")
async def release_test_results(test_id: str, request: Request):
    """Release test results so students can see their answers"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can release results")
    
    test = await db.mc_tests.find_one({"id": test_id})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only release results for your own tests")
    
    # Toggle or set results_released to True
    new_status = not test.get("results_released", False)
    
    await db.mc_tests.update_one(
        {"id": test_id},
        {"$set": {"results_released": new_status}}
    )
    
    return {
        "results_released": new_status,
        "message": f"Results {'released' if new_status else 'hidden'} successfully"
    }


@api_router.put("/mc-tests/{test_id}/schedule")
async def update_test_schedule(
    test_id: str,
    schedule_update: dict,
    request: Request
):
    """Update test availability and due dates"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update test schedules")
    
    # Verify test exists and belongs to teacher
    test = await db.mc_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only update your own tests")
    
    # Update the schedule
    update_data = {}
    if "available_date" in schedule_update and schedule_update["available_date"]:
        update_data["available_date"] = schedule_update["available_date"]
    if "due_date" in schedule_update and schedule_update["due_date"]:
        update_data["due_date"] = schedule_update["due_date"]
    
    if update_data:
        await db.mc_tests.update_one(
            {"id": test_id},
            {"$set": update_data}
        )
    
    return {"success": True, "message": "Test schedule updated"}


@api_router.delete("/mc-tests/{test_id}")
async def delete_mc_test(test_id: str, request: Request):
    """Delete an MC test (teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete tests")
    
    # Verify test belongs to teacher
    test = await db.mc_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete the test
    await db.mc_tests.delete_one({"id": test_id})
    
    # Delete associated submissions
    await db.mc_test_submissions.delete_many({"test_id": test_id})
    
    return {"success": True, "message": "Test deleted successfully"}


# ==================== MAZE CHALLENGES ====================

@api_router.post("/maze/attempt")
async def submit_maze_attempt(attempt: MazeAttemptCreate, request: Request):
    """Submit a maze challenge attempt"""
    user = await get_current_user(request)
    
    # Get the problem to check if it's a challenge mode problem
    problem = await db.problems.find_one({"id": attempt.problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Calculate path accuracy if optimal path is defined
    path_accuracy = 0
    if problem.get("optimal_path_length") and problem["optimal_path_length"] > 0:
        if attempt.path_length > 0:
            path_accuracy = min(100, (problem["optimal_path_length"] / attempt.path_length) * 100)
    
    # Create the attempt record
    attempt_doc = {
        "id": str(uuid.uuid4()),
        "problem_id": attempt.problem_id,
        "student_id": user["id"],
        "student_name": user.get("name", user.get("email", "Unknown")),
        "classroom_id": user.get("classroom_id", ""),
        "completed": attempt.completed,
        "completion_time": attempt.completion_time,
        "code_lines": attempt.code_lines,
        "path_length": attempt.path_length,
        "path_accuracy": path_accuracy,
        "goals_reached": attempt.goals_reached,
        "total_goals": attempt.total_goals,
        "collisions": attempt.collisions,
        "code": attempt.code,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": datetime.now(timezone.utc).isoformat() if attempt.completed else None
    }
    
    await db.maze_attempts.insert_one(attempt_doc)
    
    return {
        "success": True,
        "attempt_id": attempt_doc["id"],
        "path_accuracy": path_accuracy
    }

@api_router.get("/maze/leaderboard/{problem_id}")
async def get_maze_leaderboard(problem_id: str, request: Request, classroom_id: str = None):
    """Get leaderboard for a maze challenge"""
    await get_current_user(request)
    
    query = {"problem_id": problem_id, "completed": True}
    if classroom_id:
        query["classroom_id"] = classroom_id
    
    # Get all completed attempts
    attempts = await db.maze_attempts.find(query, {"_id": 0}).to_list(1000)
    
    # Group by student and get best attempt for each
    best_attempts = {}
    for attempt in attempts:
        student_id = attempt["student_id"]
        if student_id not in best_attempts:
            best_attempts[student_id] = attempt
        else:
            # Compare by completion time (lower is better)
            if attempt["completion_time"] < best_attempts[student_id]["completion_time"]:
                best_attempts[student_id] = attempt
    
    # Sort by different criteria
    leaderboard = list(best_attempts.values())
    
    # Sort by time (fastest first)
    by_time = sorted(leaderboard, key=lambda x: x["completion_time"])[:10]
    
    # Sort by code efficiency (fewer lines first)
    by_efficiency = sorted(leaderboard, key=lambda x: x["code_lines"])[:10]
    
    # Sort by accuracy (highest first)
    by_accuracy = sorted(leaderboard, key=lambda x: -x["path_accuracy"])[:10]
    
    return {
        "by_time": by_time,
        "by_efficiency": by_efficiency,
        "by_accuracy": by_accuracy,
        "total_completions": len(leaderboard)
    }

@api_router.get("/maze/my-attempts/{problem_id}")
async def get_my_maze_attempts(problem_id: str, request: Request):
    """Get current user's attempts for a maze challenge"""
    user = await get_current_user(request)
    
    attempts = await db.maze_attempts.find(
        {"problem_id": problem_id, "student_id": user["id"]},
        {"_id": 0}
    ).sort("started_at", -1).to_list(20)
    
    return attempts

@api_router.get("/maze/classroom-stats/{problem_id}/{classroom_id}")
async def get_classroom_maze_stats(problem_id: str, classroom_id: str, request: Request):
    """Get maze statistics for a classroom (teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view classroom stats")
    
    # Get all attempts for this problem and classroom
    attempts = await db.maze_attempts.find(
        {"problem_id": problem_id, "classroom_id": classroom_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate stats
    total_attempts = len(attempts)
    completed_attempts = [a for a in attempts if a["completed"]]
    unique_completers = len(set(a["student_id"] for a in completed_attempts))
    
    avg_time = 0
    avg_lines = 0
    avg_accuracy = 0
    if completed_attempts:
        avg_time = sum(a["completion_time"] for a in completed_attempts) / len(completed_attempts)
        avg_lines = sum(a["code_lines"] for a in completed_attempts) / len(completed_attempts)
        avg_accuracy = sum(a["path_accuracy"] for a in completed_attempts) / len(completed_attempts)
    
    return {
        "total_attempts": total_attempts,
        "total_completions": len(completed_attempts),
        "unique_completers": unique_completers,
        "average_time": round(avg_time, 2),
        "average_code_lines": round(avg_lines, 1),
        "average_accuracy": round(avg_accuracy, 1)
    }


# ==================== SKILL QUIZ ====================

@api_router.post("/skill-quiz/questions")
async def create_skill_quiz_question(question: SkillQuizQuestionCreate, request: Request):
    """Create a skill quiz question (teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create quiz questions")
    
    question_doc = {
        "id": str(uuid.uuid4()),
        "skill_category": question.skill_category,
        "question_text": question.question_text,
        "choice_a": question.choice_a,
        "choice_b": question.choice_b,
        "choice_c": question.choice_c,
        "choice_d": question.choice_d,
        "correct_answer": question.correct_answer.upper(),
        "explanation": question.explanation,
        "concept_tags": question.concept_tags,
        "creator_id": user["id"],
        "creator_name": user.get("name", "Unknown"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.skill_quiz_questions.insert_one(question_doc)
    return {"success": True, "question_id": question_doc["id"]}

@api_router.post("/skill-quiz/questions/bulk")
async def bulk_create_skill_quiz_questions(questions: List[SkillQuizQuestionCreate], request: Request):
    """Bulk create skill quiz questions (teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create quiz questions")
    
    created_ids = []
    for q in questions:
        question_doc = {
            "id": str(uuid.uuid4()),
            "skill_category": q.skill_category,
            "question_text": q.question_text,
            "choice_a": q.choice_a,
            "choice_b": q.choice_b,
            "choice_c": q.choice_c,
            "choice_d": q.choice_d,
            "correct_answer": q.correct_answer.upper(),
            "explanation": q.explanation,
            "concept_tags": q.concept_tags,
            "creator_id": user["id"],
            "creator_name": user.get("name", "Unknown"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.skill_quiz_questions.insert_one(question_doc)
        created_ids.append(question_doc["id"])
    
    return {"success": True, "created_count": len(created_ids), "question_ids": created_ids}

@api_router.get("/skill-quiz/questions")
async def get_skill_quiz_questions(request: Request, skill_category: str = None):
    """Get all skill quiz questions (teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view quiz questions")
    
    query = {}
    if skill_category:
        query["skill_category"] = skill_category
    
    questions = await db.skill_quiz_questions.find(query, {"_id": 0}).to_list(1000)
    
    # Group by skill category
    by_category = {}
    for q in questions:
        cat = q.get("skill_category", "Uncategorized")
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(q)
    
    return {"questions": questions, "by_category": by_category}

@api_router.get("/skill-quiz/{skill_category}")
async def get_skill_quiz(skill_category: str, assignment_id: str, request: Request):
    """Get quiz questions for a specific skill (for students taking quiz)"""
    user = await get_current_user(request)
    
    # Check if student already completed this quiz for this assignment
    existing_attempt = await db.skill_quiz_attempts.find_one({
        "student_id": user["id"],
        "skill_category": skill_category,
        "assignment_id": assignment_id
    }, {"_id": 0})
    
    if existing_attempt:
        return {
            "already_completed": True,
            "score": existing_attempt["score"],
            "correct_count": existing_attempt["correct_count"],
            "total_questions": existing_attempt["total_questions"]
        }
    
    # Get questions for this skill category
    questions = await db.skill_quiz_questions.find(
        {"skill_category": skill_category},
        {"_id": 0}
    ).to_list(100)
    
    if len(questions) < 3:
        return {"questions": [], "message": "Not enough quiz questions for this skill"}
    
    # Randomly select up to 5 questions
    import random
    selected = random.sample(questions, min(5, len(questions)))
    
    # Prepare questions for student (without correct answer)
    quiz_questions = []
    for q in selected:
        quiz_questions.append({
            "id": q["id"],
            "question_text": q["question_text"],
            "choice_a": q["choice_a"],
            "choice_b": q["choice_b"],
            "choice_c": q["choice_c"],
            "choice_d": q["choice_d"],
            "concept_tags": q.get("concept_tags", [])
        })
    
    return {"questions": quiz_questions, "skill_category": skill_category}

@api_router.post("/skill-quiz/submit")
async def submit_skill_quiz(submission: SkillQuizSubmit, request: Request):
    """Submit skill quiz answers"""
    user = await get_current_user(request)
    
    # Check for existing attempt
    existing = await db.skill_quiz_attempts.find_one({
        "student_id": user["id"],
        "skill_category": submission.skill_category,
        "assignment_id": submission.assignment_id
    })
    
    if existing:
        return {
            "already_completed": True,
            "score": existing["score"],
            "message": "You have already completed this quiz"
        }
    
    # Get questions and grade
    question_ids = list(submission.answers.keys())
    questions = await db.skill_quiz_questions.find(
        {"id": {"$in": question_ids}},
        {"_id": 0}
    ).to_list(100)
    
    correct_count = 0
    results = []
    
    for q in questions:
        student_answer = submission.answers.get(q["id"], "")
        is_correct = student_answer.upper() == q["correct_answer"].upper()
        if is_correct:
            correct_count += 1
        results.append({
            "question_id": q["id"],
            "question_text": q["question_text"],
            "student_answer": student_answer,
            "correct_answer": q["correct_answer"],
            "is_correct": is_correct,
            "explanation": q.get("explanation", "")
        })
    
    total_questions = len(questions)
    score = (correct_count / total_questions * 100) if total_questions > 0 else 0
    
    # Store attempt
    attempt_doc = {
        "id": str(uuid.uuid4()),
        "student_id": user["id"],
        "student_name": user.get("name", "Unknown"),
        "skill_category": submission.skill_category,
        "assignment_id": submission.assignment_id,
        "classroom_id": submission.classroom_id,
        "questions": results,
        "student_answers": submission.answers,
        "score": score,
        "total_questions": total_questions,
        "correct_count": correct_count,
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.skill_quiz_attempts.insert_one(attempt_doc)
    
    return {
        "success": True,
        "score": score,
        "correct_count": correct_count,
        "total_questions": total_questions,
        "results": results
    }

@api_router.get("/skill-quiz/results/{skill_category}")
async def get_skill_quiz_results(skill_category: str, classroom_id: str = None, request: Request = None):
    """Get quiz results for a skill category (teacher view)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view quiz results")
    
    query = {"skill_category": skill_category}
    if classroom_id:
        query["classroom_id"] = classroom_id
    
    attempts = await db.skill_quiz_attempts.find(query, {"_id": 0}).to_list(1000)
    
    # Calculate stats
    if attempts:
        scores = [a["score"] for a in attempts]
        stats = {
            "average_score": sum(scores) / len(scores),
            "highest_score": max(scores),
            "lowest_score": min(scores),
            "total_attempts": len(attempts)
        }
    else:
        stats = {
            "average_score": 0,
            "highest_score": 0,
            "lowest_score": 0,
            "total_attempts": 0
        }
    
    return {"attempts": attempts, "stats": stats}

@api_router.get("/skill-quiz/student-history")
async def get_student_quiz_history(request: Request):
    """Get quiz history for current student"""
    user = await get_current_user(request)
    
    attempts = await db.skill_quiz_attempts.find(
        {"student_id": user["id"]},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(100)
    
    return {"attempts": attempts}

@api_router.delete("/skill-quiz/questions/{question_id}")
async def delete_skill_quiz_question(question_id: str, request: Request):
    """Delete a skill quiz question (teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete quiz questions")
    
    result = await db.skill_quiz_questions.delete_one({"id": question_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return {"success": True, "message": "Question deleted"}


# ==================== CODING TESTS ====================

@api_router.post("/coding-tests")
async def create_coding_test(test: CodingTestCreate, request: Request):
    """Create and assign a coding test"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create coding tests")
    
    # Validate that all problems exist
    for problem_id in test.problem_ids:
        problem = await db.problems.find_one({"id": problem_id})
        if not problem:
            raise HTTPException(status_code=404, detail=f"Problem {problem_id} not found")
    
    # Parse dates
    central = pytz.timezone('America/Chicago')
    available_date = None
    due_date = None
    if test.available_date:
        naive_dt = datetime.fromisoformat(test.available_date.replace('Z', ''))
        central_dt = central.localize(naive_dt)
        available_date = central_dt.astimezone(timezone.utc)
    if test.due_date:
        naive_dt = datetime.fromisoformat(test.due_date.replace('Z', ''))
        central_dt = central.localize(naive_dt)
        due_date = central_dt.astimezone(timezone.utc)
    
    # Generate 6-digit proctor code
    proctor_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    coding_test = CodingTest(
        title=test.title,
        description=test.description,
        chapter=test.chapter,
        lesson=test.lesson,
        teacher_id=user["id"],
        problem_ids=test.problem_ids,
        time_limit_minutes=test.time_limit_minutes,
        classroom_ids=test.classroom_ids,
        proctor_code=proctor_code,
        available_date=available_date,
        due_date=due_date
    )
    
    test_dict = coding_test.model_dump()
    test_dict["created_at"] = test_dict["created_at"].isoformat()
    if test_dict.get("available_date"):
        test_dict["available_date"] = test_dict["available_date"].isoformat()
    if test_dict.get("due_date"):
        test_dict["due_date"] = test_dict["due_date"].isoformat()
    
    await db.coding_tests.insert_one(test_dict)
    
    return {
        "id": coding_test.id, 
        "proctor_code": proctor_code,
        "message": "Coding test created successfully"
    }


@api_router.get("/coding-tests")
async def get_all_coding_tests(request: Request):
    """Get all coding tests created by the teacher"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view tests")
    
    tests = await db.coding_tests.find(
        {"teacher_id": user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    return tests


@api_router.get("/coding-tests/classroom/{classroom_id}")
async def get_coding_tests_for_classroom(classroom_id: str, request: Request):
    """Get all coding tests for a specific classroom"""
    user = await get_current_user(request)
    
    # Verify student is enrolled in this classroom
    if user["role"] == "student":
        classroom = await db.classrooms.find_one({"id": classroom_id})
        if not classroom or user["id"] not in classroom.get("students", []):
            raise HTTPException(status_code=403, detail="You are not enrolled in this classroom")
    
    # Get all tests for this classroom
    tests = await db.coding_tests.find(
        {"classroom_ids": classroom_id},
        {"_id": 0}
    ).to_list(1000)
    
    # For students, check if they have already submitted
    if user["role"] == "student":
        for test in tests:
            submission = await db.coding_test_submissions.find_one({
                "test_id": test["id"],
                "student_id": user["id"]
            })
            test["is_submitted"] = submission is not None
            test["submission_id"] = submission["id"] if submission else None
    
    return tests


@api_router.get("/coding-tests/{test_id}/start")
async def start_coding_test(test_id: str, request: Request):
    """Start a coding test and get the problem"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can take tests")
    
    # Get the test
    test = await db.coding_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Check if student has already submitted ALL problems
    submission_count = await db.coding_test_submissions.count_documents({
        "test_id": test_id,
        "student_id": user["id"]
    })
    total_problems = len(test.get("problem_ids", []))
    if submission_count >= total_problems:
        raise HTTPException(status_code=403, detail="You have already submitted this test")
    
    # Check availability
    now = datetime.now(timezone.utc)
    if test.get("available_date"):
        available_date = datetime.fromisoformat(test["available_date"])
        if now < available_date:
            raise HTTPException(status_code=403, detail="This test is not yet available")
    
    # Get all problems for the test
    problems = []
    for problem_id in test.get("problem_ids", []):
        problem = await db.problems.find_one({"id": problem_id}, {"_id": 0})
        if problem:
            problems.append({
                "id": problem["id"],
                "title": problem["title"],
                "description": problem["description"],
                "starter_code": problem["starter_code"],
                "expected_output": problem.get("expected_output", ""),
                "difficulty": problem.get("difficulty", "Medium"),
                "test_cases": problem.get("test_cases", [])
            })
    
    # Get already submitted problem IDs
    submitted_problem_ids = []
    submissions = await db.coding_test_submissions.find({
        "test_id": test_id,
        "student_id": user["id"]
    }, {"_id": 0, "problem_id": 1}).to_list(100)
    submitted_problem_ids = [sub["problem_id"] for sub in submissions]
    
    # Return test and all problems info (without solutions)
    return {
        "test": test,
        "problems": problems,
        "submitted_problem_ids": submitted_problem_ids
    }


@api_router.post("/coding-tests/{test_id}/submit")
async def submit_coding_test(test_id: str, submission: CodingTestSubmit, request: Request):
    """Submit coding test and get AI evaluation (one-time only)"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can submit tests")
    
    # Check how many submissions exist for this problem (allow up to 2)
    existing_submissions = await db.coding_test_submissions.find({
        "test_id": test_id,
        "student_id": user["id"],
        "problem_id": submission.problem_id
    }).to_list(10)
    
    attempt_number = len(existing_submissions) + 1
    
    if attempt_number > 2:
        raise HTTPException(status_code=403, detail="You have already submitted this problem twice. Maximum 2 submissions allowed.")
    
    # Get the test
    test = await db.coding_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Verify problem is part of this test
    if submission.problem_id not in test.get("problem_ids", []):
        raise HTTPException(status_code=400, detail="Problem not part of this test")
    
    # Get the problem
    problem = await db.problems.find_one({"id": submission.problem_id}, {"_id": 0})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Run test cases - use problem's test_cases if available, otherwise simple comparison
    test_results = []
    passed_tests = 0
    total_tests = 0
    
    # Check if problem has test cases
    test_cases = problem.get("test_cases", [])
    
    if test_cases and len(test_cases) > 0:
        # Use structured test cases
        total_tests = len(test_cases)
        for i, test_case in enumerate(test_cases):
            test_input = test_case.get("input", "")
            expected_output = normalize_output(test_case.get("expected_output", ""))
            
            try:
                result = run_python_code(submission.code, test_input)
                actual_output = normalize_output(result.get("output", ""))
                passed = result.get("success") and actual_output == expected_output
                
                if passed:
                    passed_tests += 1
                
                test_results.append({
                    "test_id": f"test_{i+1}",
                    "description": f"Test case {i+1}",
                    "passed": passed,
                    "expected": expected_output,
                    "actual": actual_output,
                    "error": result.get("error")
                })
            except Exception as e:
                test_results.append({
                    "test_id": f"test_{i+1}",
                    "description": f"Test case {i+1}",
                    "passed": False,
                    "expected": expected_output,
                    "actual": "",
                    "error": str(e)
                })
    else:
        # Fallback to simple comparison with solution
        try:
            solution_result = run_python_code(problem.get("solution_code", ""), "")
            student_result = run_python_code(submission.code, "")
            
            solution_output = normalize_output(solution_result["output"]) if solution_result["success"] else ""
            student_output = normalize_output(student_result["output"]) if student_result["success"] else ""
            
            passed = student_result["success"] and student_output == solution_output
            if passed:
                passed_tests = 1
            
            total_tests = 1
            test_results.append({
                "test_id": "output_comparison",
                "description": "Compare output to solution",
                "passed": passed,
                "expected": solution_output,
                "actual": student_output,
                "error": student_result.get("error")
            })
        except Exception as e:
            logging.error(f"Error during test evaluation: {str(e)}")
            test_results = [{
                "test_id": "evaluation_error",
                "description": "Error during evaluation",
                "passed": False,
                "error": str(e)
            }]
    
    # Calculate base score from test results (deterministic)
    base_score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    
    # AI Feedback (feedback only, score is already calculated deterministically)
    final_score = base_score
    
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    chat = LlmChat(
        api_key=llm_key,
        session_id=f"coding_test_{test_id}_{user['id']}_{submission.problem_id}",
        system_message="You are a helpful coding instructor. Provide brief, encouraging feedback based on test results. Do NOT assign scores."
    ).with_model("openai", "gpt-4o")
    
    prompt = f"""
Provide helpful feedback for this coding test submission:

Problem: {problem['title']}
Description: {problem['description']}

Test Results: {passed_tests}/{total_tests} passed
Score: {final_score}% (already calculated)

Student Code:
```python
{submission.code}
```

Provide 1-2 sentences of encouraging feedback based on the test results. Focus on what they did well or what to improve. Do NOT mention or change the score.
"""
    
    try:
        user_message = UserMessage(text=prompt)
        ai_response = await chat.send_message(user_message)
        feedback = ai_response[:300] if ai_response else "Good effort! Review the test results to see which cases passed."
    except Exception as e:
        logging.error(f"AI feedback error: {str(e)}")
        feedback = f"Test completed: {passed_tests}/{total_tests} test cases passed. Keep practicing!"
    
    # Create submission record
    test_submission = CodingTestSubmission(
        test_id=test_id,
        student_id=user["id"],
        student_name=user.get("name", "Unknown"),
        problem_id=submission.problem_id,
        code=submission.code,
        score=final_score,
        feedback=feedback,
        test_results=test_results,
        time_taken_seconds=submission.time_taken_seconds
    )
    
    submission_dict = test_submission.model_dump()
    submission_dict["started_at"] = submission_dict["started_at"].isoformat()
    submission_dict["submitted_at"] = submission_dict["submitted_at"].isoformat()
    submission_dict["attempt_number"] = attempt_number
    
    await db.coding_test_submissions.insert_one(submission_dict)
    
    # Calculate which score will count (best of all attempts)
    all_attempts = existing_submissions + [submission_dict]
    best_score = max(attempt["score"] for attempt in all_attempts)
    is_best = final_score >= best_score
    
    submits_remaining = 2 - attempt_number
    
    return {
        "submission_id": test_submission.id,
        "score": final_score,
        "feedback": feedback,
        "attempt_number": attempt_number,
        "submits_remaining": submits_remaining,
        "best_score": best_score,
        "is_best_attempt": is_best,
        "message": f"Attempt {attempt_number}/2 submitted. {'This is your best score!' if is_best else f'Your best score is {best_score:.1f}%'}"
    }


@api_router.get("/coding-tests/{test_id}/result")
async def get_coding_test_result(test_id: str, request: Request):
    """Get student's test results for all problems (score and feedback only, no code)"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can view results")
    
    # Get all submissions for this test
    submissions = await db.coding_test_submissions.find({
        "test_id": test_id,
        "student_id": user["id"]
    }, {"_id": 0}).to_list(100)
    
    if not submissions:
        raise HTTPException(status_code=404, detail="No submissions found")
    
    # Group by problem_id and keep only the best score for each problem
    problem_best_scores = {}
    for sub in submissions:
        problem_id = sub["problem_id"]
        if problem_id not in problem_best_scores or sub["score"] > problem_best_scores[problem_id]["score"]:
            problem_best_scores[problem_id] = sub
    
    # Calculate overall score (average of best scores per problem)
    best_submissions = list(problem_best_scores.values())
    total_score = sum(sub["score"] for sub in best_submissions)
    average_score = total_score / len(best_submissions) if best_submissions else 0
    
    # Return aggregated results with best submission per problem
    return {
        "overall_score": average_score,
        "total_problems": len(best_submissions),
        "submissions": [
            {
                "problem_id": sub["problem_id"],
                "score": sub["score"],
                "feedback": sub["feedback"],
                "submitted_at": sub["submitted_at"],
                "time_taken_seconds": sub.get("time_taken_seconds", 0),
                "attempt_number": sub.get("attempt_number", 1)
            }
            for sub in best_submissions
        ]
    }


@api_router.get("/coding-tests/{test_id}/submissions/{problem_id}/count")
async def get_submission_count(test_id: str, problem_id: str, request: Request):
    """Get the number of submissions for a specific problem in a test"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can check submission counts")
    
    count = await db.coding_test_submissions.count_documents({
        "test_id": test_id,
        "student_id": user["id"],
        "problem_id": problem_id
    })
    
    return {"count": count}


@api_router.get("/coding-tests/{test_id}/problem/{problem_id}/submissions")
async def get_problem_submissions(test_id: str, problem_id: str, request: Request):
    """Get all submissions for a specific problem in a test"""
    user = await get_current_user(request)
    
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can view their submissions")
    
    submissions = await db.coding_test_submissions.find({
        "test_id": test_id,
        "student_id": user["id"],
        "problem_id": problem_id
    }, {"_id": 0}).sort("submitted_at", 1).to_list(10)
    
    return {"submissions": submissions}


@api_router.post("/coding-tests/{test_id}/verify-proctor-code")
async def verify_proctor_code(test_id: str, data: dict, request: Request):
    """Verify proctor code to unlock test"""
    try:
        user = await get_current_user(request)
        logging.info(f"Proctor code verification attempt by user: {user.get('email')} with role: {user.get('role')}")
    except Exception as e:
        logging.error(f"Authentication failed in proctor code verification: {str(e)}")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    test = await db.coding_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    provided_code = data.get("proctor_code", "").strip()
    stored_code = test.get("proctor_code", "").strip()
    
    logging.info(f"Proctor code verification - Provided: '{provided_code}', Stored: '{stored_code}', Match: {provided_code == stored_code}")
    
    if provided_code == stored_code:
        return {"success": True, "message": "Proctor code verified"}
    else:
        return {"success": False, "message": "Invalid proctor code"}


@api_router.get("/coding-tests/{test_id}/submissions")
async def get_coding_test_submissions(test_id: str, request: Request):
    """Get all submissions for a coding test (teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view submissions")
    
    # Verify test belongs to teacher
    test = await db.coding_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    submissions = await db.coding_test_submissions.find(
        {"test_id": test_id},
        {"_id": 0}
    ).to_list(1000)
    
    return submissions


@api_router.delete("/coding-tests/{test_id}")
async def delete_coding_test(test_id: str, request: Request):
    """Delete a coding test (teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete tests")
    
    # Verify test belongs to teacher
    test = await db.coding_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete the test
    await db.coding_tests.delete_one({"id": test_id})
    
    # Optionally delete associated submissions
    await db.coding_test_submissions.delete_many({"test_id": test_id})
    
    return {"success": True, "message": "Coding test deleted successfully"}


@api_router.put("/coding-tests/{test_id}/schedule")
async def update_coding_test_schedule(test_id: str, data: dict, request: Request):
    """Update coding test schedule (teacher only)"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update tests")
    
    # Verify test belongs to teacher
    test = await db.coding_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Parse dates
    central = pytz.timezone('America/Chicago')
    update_data = {}
    
    if data.get("available_date"):
        naive_dt = datetime.fromisoformat(data["available_date"].replace('Z', ''))
        central_dt = central.localize(naive_dt)
        update_data["available_date"] = central_dt.astimezone(timezone.utc).isoformat()
    
    if data.get("due_date"):
        naive_dt = datetime.fromisoformat(data["due_date"].replace('Z', ''))
        central_dt = central.localize(naive_dt)
        update_data["due_date"] = central_dt.astimezone(timezone.utc).isoformat()
    
    # Update test
    await db.coding_tests.update_one(
        {"id": test_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Test schedule updated"}


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
    
    if challenge["status"] not in ["accepted", "in_progress"]:
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
        # Support both 'input_data' (old) and 'input' (new) field names
        test_input = test_case.get("input_data") or test_case.get("input", "")
        result = run_python_code(code, test_input)
        expected = normalize_output(test_case.get("expected_output", ""))
        actual = normalize_output(result.get("output", ""))
        passed = expected == actual and result.get("error") is None
        
        if passed:
            passed_tests += 1
        
        test_results.append({
            "input": test_input,
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
    
    # Add classroom names and calculate current status
    now = datetime.now(timezone.utc)
    for comp in competitions:
        classrooms = await db.classrooms.find({"id": {"$in": comp["classroom_ids"]}}, {"_id": 0}).to_list(length=None)
        comp["classrooms"] = [{"id": c["id"], "name": c["name"]} for c in classrooms]
        
        # Calculate current status based on dates
        start_date = datetime.fromisoformat(comp["start_date"])
        end_date = datetime.fromisoformat(comp["end_date"])
        
        if now < start_date:
            comp["status"] = "upcoming"
        elif now > end_date:
            comp["status"] = "completed"
        else:
            comp["status"] = "active"
    
    return competitions


@api_router.get("/competitions/{competition_id}")
async def get_competition(competition_id: str, request: Request):
    """Get specific competition with live standings"""
    user = await get_current_user(request)
    
    competition = await db.competitions.find_one({"id": competition_id}, {"_id": 0})
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    # Calculate current status based on dates
    now = datetime.now(timezone.utc)
    start_date = datetime.fromisoformat(competition["start_date"])
    end_date = datetime.fromisoformat(competition["end_date"])
    
    if now < start_date:
        competition["status"] = "upcoming"
    elif now > end_date:
        competition["status"] = "completed"
    else:
        competition["status"] = "active"
    
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
        
        # Count problems solved during competition period (score = 100 counts as solved)
        submissions = await db.submissions.find({
            "student_id": {"$in": student_ids},
            "submitted_at": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            },
            "score": 100  # Only count perfect scores as "solved"
        }).to_list(length=None)
        
        # Count unique problems per student (a student might solve the same problem multiple times)
        student_stats = {}
        for sub in submissions:
            sid = sub["student_id"]
            problem_id = sub.get("problem_id")
            
            if sid not in student_stats:
                student_stats[sid] = {"problems": set(), "xp": 0}
            
            # Add problem to set (automatically handles duplicates)
            student_stats[sid]["problems"].add(problem_id)
            student_stats[sid]["xp"] += 100  # Each perfect score = 100 XP
        
        # Convert sets to counts
        for sid in student_stats:
            student_stats[sid]["problems"] = len(student_stats[sid]["problems"])
        
        total_problems_solved = sum(stats["problems"] for stats in student_stats.values())
        total_xp_gained = sum(stats["xp"] for stats in student_stats.values())
        
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



# ==================== MICRO:BIT CURRICULUM ====================

MICROBIT_CURRICULUM = {
    "units": [
        {
            "id": "unit1",
            "title": "Unit 1: Getting Started",
            "description": "Introduction to Micro:bit and basic programming concepts",
            "weeks": "Weeks 1-2",
            "lessons": [
                {
                    "id": "lesson1",
                    "title": "What is Micro:bit?",
                    "type": "quiz",
                    "duration": "45 min",
                    "objectives": [
                        "Identify the parts of a Micro:bit",
                        "Understand what a microcontroller does",
                        "Learn safety rules for handling electronics"
                    ],
                    "materials": ["Micro:bit (for show)", "USB cable"],
                    "description": "Introduction to the Micro:bit microcontroller and its components."
                },
                {
                    "id": "lesson2",
                    "title": "Your First Program - Display Heart",
                    "type": "code",
                    "duration": "45 min",
                    "objectives": [
                        "Connect Micro:bit to computer",
                        "Write your first MicroPython program",
                        "Display an image on the LED matrix"
                    ],
                    "materials": ["Micro:bit", "USB cable", "Computer with Mu Editor"],
                    "starter_code": "from microbit import *\n\n# Display a heart on the LED screen\n# Your code here:\n",
                    "solution_code": "from microbit import *\n\n# Display a heart on the LED screen\ndisplay.show(Image.HEART)",
                    "test_cases": [
                        {"description": "Imports microbit module", "pattern": "from microbit import", "points": 25},
                        {"description": "Uses display.show()", "pattern": "display.show", "points": 25},
                        {"description": "Shows HEART image", "pattern": "Image.HEART", "points": 50}
                    ],
                    "wiring_instructions": "1. Connect the Micro:bit to your computer using the USB cable\n2. The Micro:bit should appear as a USB drive\n3. Open Mu Editor and select 'BBC micro:bit' mode",
                    "description": "Learn to display images on the Micro:bit's 5x5 LED matrix."
                },
                {
                    "id": "lesson3",
                    "title": "LED Patterns & Animations",
                    "type": "code",
                    "duration": "90 min",
                    "objectives": [
                        "Create custom LED patterns",
                        "Use loops to create animations",
                        "Understand the sleep() function"
                    ],
                    "materials": ["Micro:bit", "USB cable"],
                    "starter_code": "from microbit import *\n\n# Create an animation that shows different faces\n# Use a while True loop and sleep()\n# Your code here:\n",
                    "solution_code": "from microbit import *\n\nwhile True:\n    display.show(Image.HAPPY)\n    sleep(500)\n    display.show(Image.SAD)\n    sleep(500)",
                    "test_cases": [
                        {"description": "Uses while True loop", "pattern": "while True:", "points": 25},
                        {"description": "Uses display.show()", "pattern": "display.show", "points": 25},
                        {"description": "Uses sleep() for timing", "pattern": "sleep(", "points": 25},
                        {"description": "Shows multiple images", "pattern": "Image.", "points": 25}
                    ],
                    "wiring_instructions": "No additional wiring needed - using built-in LED display",
                    "description": "Create animated displays using loops and timing."
                }
            ]
        },
        {
            "id": "unit2",
            "title": "Unit 2: Buttons & Input",
            "description": "Learn to respond to button presses and create interactive programs",
            "weeks": "Weeks 3-4",
            "lessons": [
                {
                    "id": "lesson4",
                    "title": "Button A & B Basics",
                    "type": "code",
                    "duration": "45 min",
                    "objectives": [
                        "Detect button presses",
                        "Use if statements with buttons",
                        "Create responsive programs"
                    ],
                    "materials": ["Micro:bit", "USB cable"],
                    "starter_code": "from microbit import *\n\n# When button A is pressed, show 'A'\n# When button B is pressed, show 'B'\n# Your code here:\n",
                    "solution_code": "from microbit import *\n\nwhile True:\n    if button_a.is_pressed():\n        display.show('A')\n    elif button_b.is_pressed():\n        display.show('B')\n    else:\n        display.clear()",
                    "test_cases": [
                        {"description": "Checks button_a", "pattern": "button_a", "points": 25},
                        {"description": "Checks button_b", "pattern": "button_b", "points": 25},
                        {"description": "Uses is_pressed() or was_pressed()", "pattern": "_pressed()", "points": 25},
                        {"description": "Uses if/elif statements", "pattern": "if ", "points": 25}
                    ],
                    "wiring_instructions": "No additional wiring needed - using built-in buttons",
                    "description": "Learn to detect and respond to the built-in buttons A and B."
                },
                {
                    "id": "lesson5",
                    "title": "Button Counter",
                    "type": "code",
                    "duration": "45 min",
                    "objectives": [
                        "Use variables to store data",
                        "Increment and decrement counters",
                        "Display numbers on LED"
                    ],
                    "materials": ["Micro:bit", "USB cable"],
                    "starter_code": "from microbit import *\n\n# Create a counter:\n# Button A = add 1\n# Button B = subtract 1\n# Your code here:\n\ncount = 0\n",
                    "solution_code": "from microbit import *\n\ncount = 0\n\nwhile True:\n    if button_a.was_pressed():\n        count = count + 1\n    if button_b.was_pressed():\n        count = count - 1\n    display.show(count)",
                    "test_cases": [
                        {"description": "Creates count variable", "pattern": "count", "points": 20},
                        {"description": "Increments count", "pattern": "count + 1", "points": 20},
                        {"description": "Decrements count", "pattern": "count - 1", "points": 20},
                        {"description": "Uses was_pressed()", "pattern": "was_pressed()", "points": 20},
                        {"description": "Displays the count", "pattern": "display.show", "points": 20}
                    ],
                    "wiring_instructions": "No additional wiring needed",
                    "description": "Build a counter that responds to button presses."
                },
                {
                    "id": "lesson6",
                    "title": "Rock Paper Scissors Game",
                    "type": "code",
                    "duration": "90 min",
                    "objectives": [
                        "Use random numbers",
                        "Create a simple game",
                        "Combine buttons with display"
                    ],
                    "materials": ["Micro:bit", "USB cable"],
                    "starter_code": "from microbit import *\nimport random\n\n# Shake to play Rock Paper Scissors!\n# Rock = R, Paper = P, Scissors = S\n# Your code here:\n",
                    "solution_code": "from microbit import *\nimport random\n\nwhile True:\n    if accelerometer.was_gesture('shake'):\n        choice = random.randint(0, 2)\n        if choice == 0:\n            display.show('R')\n        elif choice == 1:\n            display.show('P')\n        else:\n            display.show('S')",
                    "test_cases": [
                        {"description": "Imports random module", "pattern": "import random", "points": 20},
                        {"description": "Uses accelerometer shake", "pattern": "shake", "points": 20},
                        {"description": "Uses random.randint()", "pattern": "random.randint", "points": 20},
                        {"description": "Has Rock option", "pattern": "'R'", "points": 20},
                        {"description": "Has Paper or Scissors", "pattern": "'P'|'S'", "points": 20}
                    ],
                    "wiring_instructions": "No additional wiring needed - using built-in accelerometer",
                    "description": "Create a Rock Paper Scissors game using the shake gesture!"
                }
            ]
        },
        {
            "id": "unit3",
            "title": "Unit 3: Sensors",
            "description": "Explore the built-in sensors: accelerometer, compass, and more",
            "weeks": "Weeks 5-6",
            "lessons": [
                {
                    "id": "lesson7",
                    "title": "Accelerometer Basics",
                    "type": "code",
                    "duration": "45 min",
                    "objectives": [
                        "Understand X, Y, Z axes",
                        "Read accelerometer values",
                        "Detect tilt direction"
                    ],
                    "materials": ["Micro:bit", "USB cable"],
                    "starter_code": "from microbit import *\n\n# Tilt detector:\n# Tilt left = show '<'\n# Tilt right = show '>'\n# Your code here:\n",
                    "solution_code": "from microbit import *\n\nwhile True:\n    x = accelerometer.get_x()\n    if x < -200:\n        display.show('<')\n    elif x > 200:\n        display.show('>')\n    else:\n        display.show('-')",
                    "test_cases": [
                        {"description": "Gets accelerometer X value", "pattern": "accelerometer.get_x()", "points": 30},
                        {"description": "Compares X value", "pattern": "x <|x >", "points": 30},
                        {"description": "Shows different displays", "pattern": "display.show", "points": 40}
                    ],
                    "wiring_instructions": "No additional wiring needed - using built-in accelerometer",
                    "description": "Learn to detect tilt using the accelerometer."
                },
                {
                    "id": "lesson8",
                    "title": "Step Counter Project",
                    "type": "code",
                    "duration": "90 min",
                    "objectives": [
                        "Detect shake gestures",
                        "Count steps with variables",
                        "Create a wearable device"
                    ],
                    "materials": ["Micro:bit", "USB cable", "Battery pack (optional)", "Rubber band or strap"],
                    "starter_code": "from microbit import *\n\n# Step counter - counts shakes\n# Display the step count\n# Your code here:\n\nsteps = 0\n",
                    "solution_code": "from microbit import *\n\nsteps = 0\n\nwhile True:\n    if accelerometer.was_gesture('shake'):\n        steps = steps + 1\n        display.scroll(steps)",
                    "test_cases": [
                        {"description": "Creates steps variable", "pattern": "steps", "points": 25},
                        {"description": "Detects shake gesture", "pattern": "was_gesture", "points": 25},
                        {"description": "Increments steps", "pattern": "steps + 1|steps +=", "points": 25},
                        {"description": "Displays step count", "pattern": "display.scroll|display.show", "points": 25}
                    ],
                    "wiring_instructions": "1. Connect battery pack for portable use\n2. Attach Micro:bit to wrist or ankle with rubber band\n3. Walk around to test!",
                    "description": "Build a step counter you can wear!"
                },
                {
                    "id": "lesson9",
                    "title": "Digital Compass",
                    "type": "code",
                    "duration": "45 min",
                    "objectives": [
                        "Use the compass sensor",
                        "Display cardinal directions",
                        "Calibrate the compass"
                    ],
                    "materials": ["Micro:bit", "USB cable"],
                    "starter_code": "from microbit import *\n\n# Digital compass:\n# N = North, E = East, S = South, W = West\n# Your code here:\n\ncompass.calibrate()\n",
                    "solution_code": "from microbit import *\n\ncompass.calibrate()\n\nwhile True:\n    heading = compass.heading()\n    if heading < 45 or heading > 315:\n        display.show('N')\n    elif heading < 135:\n        display.show('E')\n    elif heading < 225:\n        display.show('S')\n    else:\n        display.show('W')",
                    "test_cases": [
                        {"description": "Calibrates compass", "pattern": "compass.calibrate()", "points": 20},
                        {"description": "Gets compass heading", "pattern": "compass.heading()", "points": 20},
                        {"description": "Shows North", "pattern": "'N'", "points": 20},
                        {"description": "Shows East or West", "pattern": "'E'|'W'", "points": 20},
                        {"description": "Shows South", "pattern": "'S'", "points": 20}
                    ],
                    "wiring_instructions": "No additional wiring needed - using built-in compass\nNote: You'll need to calibrate by tilting the Micro:bit to fill the screen with dots",
                    "description": "Build a digital compass that shows direction!"
                }
            ]
        },
        {
            "id": "unit4",
            "title": "Unit 4: External Components",
            "description": "Connect external LEDs, sensors, and build circuits",
            "weeks": "Weeks 7-8",
            "lessons": [
                {
                    "id": "lesson10",
                    "title": "External LED Circuit",
                    "type": "code",
                    "duration": "90 min",
                    "objectives": [
                        "Build a basic circuit on breadboard",
                        "Connect LED to Micro:bit pins",
                        "Control external LED with code"
                    ],
                    "materials": ["Micro:bit", "USB cable", "Breadboard", "LED (any color)", "220Ω resistor", "2 jumper wires", "Alligator clips"],
                    "starter_code": "from microbit import *\n\n# Blink external LED on pin0\n# Your code here:\n",
                    "solution_code": "from microbit import *\n\nwhile True:\n    pin0.write_digital(1)\n    sleep(500)\n    pin0.write_digital(0)\n    sleep(500)",
                    "test_cases": [
                        {"description": "Uses pin0", "pattern": "pin0", "points": 25},
                        {"description": "Writes digital HIGH", "pattern": "write_digital(1)", "points": 25},
                        {"description": "Writes digital LOW", "pattern": "write_digital(0)", "points": 25},
                        {"description": "Uses sleep for timing", "pattern": "sleep(", "points": 25}
                    ],
                    "wiring_instructions": "1. Place LED on breadboard (long leg = positive)\n2. Connect 220Ω resistor to short leg of LED\n3. Connect resistor other end to GND on Micro:bit\n4. Connect long leg of LED to Pin 0 on Micro:bit\n5. Use alligator clips to connect to Micro:bit edge connector",
                    "description": "Build your first external circuit with an LED!"
                },
                {
                    "id": "lesson11",
                    "title": "Traffic Light Project",
                    "type": "code",
                    "duration": "90 min",
                    "objectives": [
                        "Control multiple LEDs",
                        "Create a sequence/state machine",
                        "Apply timing concepts"
                    ],
                    "materials": ["Micro:bit", "USB cable", "Breadboard", "Red LED", "Yellow LED", "Green LED", "3x 220Ω resistors", "Jumper wires", "Alligator clips"],
                    "starter_code": "from microbit import *\n\n# Traffic light: Red, Yellow, Green\n# Pin 0 = Red, Pin 1 = Yellow, Pin 2 = Green\n# Your code here:\n",
                    "solution_code": "from microbit import *\n\nwhile True:\n    # Red light\n    pin0.write_digital(1)\n    pin1.write_digital(0)\n    pin2.write_digital(0)\n    sleep(3000)\n    \n    # Yellow light\n    pin0.write_digital(0)\n    pin1.write_digital(1)\n    pin2.write_digital(0)\n    sleep(1000)\n    \n    # Green light\n    pin0.write_digital(0)\n    pin1.write_digital(0)\n    pin2.write_digital(1)\n    sleep(3000)",
                    "test_cases": [
                        {"description": "Uses pin0 for red", "pattern": "pin0.write_digital", "points": 20},
                        {"description": "Uses pin1 for yellow", "pattern": "pin1.write_digital", "points": 20},
                        {"description": "Uses pin2 for green", "pattern": "pin2.write_digital", "points": 20},
                        {"description": "Has timing with sleep", "pattern": "sleep(", "points": 20},
                        {"description": "Uses a loop", "pattern": "while True:", "points": 20}
                    ],
                    "wiring_instructions": "1. Place all 3 LEDs on breadboard\n2. Connect each LED's short leg through a 220Ω resistor to GND\n3. Connect Red LED long leg to Pin 0\n4. Connect Yellow LED long leg to Pin 1\n5. Connect Green LED long leg to Pin 2\n6. Share a common GND connection",
                    "description": "Build a working traffic light with 3 LEDs!"
                },
                {
                    "id": "lesson12",
                    "title": "Final Project: Night Light",
                    "type": "code",
                    "duration": "90 min",
                    "objectives": [
                        "Read analog sensor values",
                        "Use conditional logic with sensors",
                        "Build a practical device"
                    ],
                    "materials": ["Micro:bit", "USB cable", "Breadboard", "LED", "220Ω resistor", "Light sensor (LDR)", "10kΩ resistor", "Jumper wires"],
                    "starter_code": "from microbit import *\n\n# Night light:\n# When it's dark, turn on LED\n# When it's bright, turn off LED\n# Read light level from pin1\n# Control LED on pin0\n# Your code here:\n",
                    "solution_code": "from microbit import *\n\nwhile True:\n    light_level = pin1.read_analog()\n    if light_level < 500:\n        pin0.write_digital(1)\n        display.show(Image.HAPPY)\n    else:\n        pin0.write_digital(0)\n        display.clear()\n    sleep(100)",
                    "test_cases": [
                        {"description": "Reads analog value", "pattern": "read_analog()", "points": 25},
                        {"description": "Compares light level", "pattern": "light_level <|light_level >", "points": 25},
                        {"description": "Controls LED output", "pattern": "write_digital", "points": 25},
                        {"description": "Uses conditional logic", "pattern": "if ", "points": 25}
                    ],
                    "wiring_instructions": "1. LED circuit: LED + 220Ω to Pin 0 and GND\n2. LDR circuit: Connect LDR between 3V and Pin 1\n3. Connect 10kΩ resistor between Pin 1 and GND\n4. This creates a voltage divider that changes with light",
                    "description": "Build an automatic night light that turns on in the dark!"
                }
            ]
        }
    ]
}

@api_router.get("/microbit/curriculum")
async def get_microbit_curriculum(request: Request):
    """Get the complete Micro:bit curriculum structure"""
    user = await get_current_user(request)
    return MICROBIT_CURRICULUM

@api_router.get("/microbit/units")
async def get_microbit_units(request: Request):
    """Get list of Micro:bit units"""
    user = await get_current_user(request)
    return [{"id": u["id"], "title": u["title"], "description": u["description"], "weeks": u["weeks"], "lesson_count": len(u["lessons"])} for u in MICROBIT_CURRICULUM["units"]]

@api_router.get("/microbit/units/{unit_id}/lessons")
async def get_microbit_lessons(unit_id: str, request: Request):
    """Get lessons for a specific unit"""
    user = await get_current_user(request)
    for unit in MICROBIT_CURRICULUM["units"]:
        if unit["id"] == unit_id:
            return unit["lessons"]
    raise HTTPException(status_code=404, detail="Unit not found")

@api_router.post("/microbit/create-from-lesson")
async def create_assignment_from_microbit_lesson(data: dict, request: Request):
    """Create an assignment from a Micro:bit curriculum lesson"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create assignments")
    
    unit_id = data.get("unit_id")
    lesson_id = data.get("lesson_id")
    classroom_ids = data.get("classroom_ids", [])
    
    # Find the lesson
    lesson = None
    unit_data = None
    for unit in MICROBIT_CURRICULUM["units"]:
        if unit["id"] == unit_id:
            unit_data = unit
            for l in unit["lessons"]:
                if l["id"] == lesson_id:
                    lesson = l
                    break
            break
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Create problem in library
    problem_id = str(uuid.uuid4())
    proctor_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    problem = {
        "id": problem_id,
        "title": lesson["title"],
        "description": lesson["description"],
        "category": "Micro:bit",
        "difficulty": "beginner",
        "chapter": unit_data["title"],
        "lesson": lesson["title"],
        "problem_type": "Micro:bit Project",
        "assignment_type": "microbit",
        "starter_code": lesson.get("starter_code", "from microbit import *\n\n# Your code here:\n"),
        "solution_code": lesson.get("solution_code", ""),
        "expected_output": "",
        "test_cases": lesson.get("test_cases", []),
        "materials_needed": lesson.get("materials", []),
        "wiring_instructions": lesson.get("wiring_instructions", ""),
        "learning_objectives": lesson.get("objectives", []),
        "microbit_unit": unit_id,
        "microbit_lesson": int(lesson_id.replace("lesson", "")),
        "teacher_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.problems.insert_one(problem)
    
    # Create assignment if classroom_ids provided
    if classroom_ids:
        assignment_id = str(uuid.uuid4())
        assignment = {
            "id": assignment_id,
            "title": lesson["title"],
            "description": lesson["description"],
            "chapter": unit_data["title"],
            "lesson": lesson["title"],
            "teacher_id": user["id"],
            "problem_ids": [problem_id],
            "classroom_ids": classroom_ids,
            "proctor_code": proctor_code,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.assignments.insert_one(assignment)
        
        return {"message": "Assignment created from Micro:bit lesson", "assignment_id": assignment_id, "problem_id": problem_id, "proctor_code": proctor_code}
    
    return {"message": "Problem added to library", "problem_id": problem_id}


# Turtle Graphics Curriculum Structure
TURTLE_CURRICULUM = {
    "units": [
        {
            "id": "unit1",
            "title": "Unit 1: First Steps with Turtle",
            "lessons": [
                {
                    "id": "lesson1",
                    "title": "Meet the Turtle",
                    "description": "Introduction to turtle graphics and basic movement commands",
                    "objectives": ["Understand what turtle graphics is", "Create your first turtle program", "Use forward() and backward() commands"],
                    "starter_code": "import turtle\n\n# Create a turtle\nt = turtle.Turtle()\n\n# Move forward 100 pixels\nt.forward(100)\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.forward(100)\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "forward", "description": "Uses forward() command", "points": 50},
                        {"pattern": "turtle.Turtle", "description": "Creates a turtle", "points": 50}
                    ]
                },
                {
                    "id": "lesson2",
                    "title": "Turning & Direction",
                    "description": "Learn to turn the turtle using right() and left() commands",
                    "objectives": ["Use right() and left() to turn", "Understand angles and degrees", "Draw simple angled lines"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Draw an L shape\nt.forward(100)\n# Add a turn here\n# Then go forward again\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.forward(100)\nt.right(90)\nt.forward(100)\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "right", "description": "Uses right() to turn", "points": 50},
                        {"pattern": "forward", "description": "Uses forward() command", "points": 50}
                    ]
                },
                {
                    "id": "lesson3",
                    "title": "Your First Shape - Square",
                    "description": "Combine movement and turning to draw a complete square",
                    "objectives": ["Combine movement and turning", "Draw a complete square", "Understand the concept of a closed shape"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Draw a square:\n# 1. Go forward\n# 2. Turn right 90 degrees\n# 3. Repeat 4 times\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\nfor i in range(4):\n    t.forward(100)\n    t.right(90)\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "forward", "description": "Uses forward() command", "points": 25},
                        {"pattern": "right", "description": "Uses right() to turn", "points": 25},
                        {"pattern": "range(4)", "description": "Repeats 4 times for square", "points": 50}
                    ]
                }
            ]
        },
        {
            "id": "unit2",
            "title": "Unit 2: Loops - The Power of Repetition",
            "lessons": [
                {
                    "id": "lesson1",
                    "title": "For Loops Introduction",
                    "description": "Learn to use for loops to repeat commands efficiently",
                    "objectives": ["Understand the for loop syntax", "Use range() function", "Draw shapes using loops"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Use a for loop to draw a triangle\n# for i in range(3):\n#     forward, turn\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\nfor i in range(3):\n    t.forward(100)\n    t.left(120)\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "for", "description": "Uses for loop", "points": 40},
                        {"pattern": "range", "description": "Uses range()", "points": 30},
                        {"pattern": "120", "description": "Correct angle for triangle", "points": 30}
                    ]
                },
                {
                    "id": "lesson2",
                    "title": "Polygons with Loops",
                    "description": "Create any regular polygon using the angle formula",
                    "objectives": ["Calculate angles for regular polygons", "Draw triangles, pentagons, hexagons", "Understand the relationship between sides and angles"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Draw a hexagon (6 sides)\n# Angle = 360 / number_of_sides\nsides = 6\nangle = 360 / sides\n\n# Use a for loop\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\nsides = 6\nangle = 360 / sides\nfor i in range(sides):\n    t.forward(60)\n    t.right(angle)\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "360", "description": "Uses 360 for full rotation", "points": 25},
                        {"pattern": "for", "description": "Uses for loop", "points": 25},
                        {"pattern": "range(sides)", "description": "Loop based on sides", "points": 25},
                        {"pattern": "angle", "description": "Uses calculated angle", "points": 25}
                    ]
                },
                {
                    "id": "lesson3",
                    "title": "Nested Loops - Grids and Patterns",
                    "description": "Use loops inside loops to create grids and complex patterns",
                    "objectives": ["Understand nested loop structure", "Create grids and patterns", "Draw multiple shapes systematically"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\n# Draw a row of 5 squares\n# Then move to next row\n# Repeat for 3 rows\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\nfor row in range(3):\n    for col in range(5):\n        for i in range(4):\n            t.forward(20)\n            t.right(90)\n        t.penup()\n        t.forward(30)\n        t.pendown()\n    t.penup()\n    t.goto(-100, t.ycor() - 30)\n    t.pendown()\n\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "for row", "description": "Outer loop for rows", "points": 25},
                        {"pattern": "for col", "description": "Inner loop for columns", "points": 25},
                        {"pattern": "range(4)", "description": "Loop for square", "points": 25},
                        {"pattern": "penup", "description": "Lifts pen to move", "points": 25}
                    ]
                },
                {
                    "id": "lesson4",
                    "title": "Spirals with While Loops",
                    "description": "Use while loops to create expanding spiral patterns",
                    "objectives": ["Use while loops for unknown iterations", "Create spiral patterns", "Understand loop control variables"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\n# Create a spiral:\n# Start with distance = 5\n# Each time: forward(distance), turn, increase distance\n# Stop when distance > 200\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\ndistance = 5\nwhile distance < 200:\n    t.forward(distance)\n    t.right(90)\n    distance = distance + 5\n\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "while", "description": "Uses while loop", "points": 40},
                        {"pattern": "distance", "description": "Uses distance variable", "points": 30},
                        {"pattern": "distance + 5", "description": "Increases distance", "points": 30}
                    ]
                }
            ]
        },
        {
            "id": "unit3",
            "title": "Unit 3: Colors & Style",
            "lessons": [
                {
                    "id": "lesson1",
                    "title": "Pen Colors",
                    "description": "Change the color of your turtle's pen",
                    "objectives": ["Use pencolor() to change line color", "Understand color names and RGB values", "Create colorful patterns"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Draw a red square\n# Use t.pencolor('red')\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.pencolor('red')\nfor i in range(4):\n    t.forward(100)\n    t.right(90)\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "pencolor", "description": "Uses pencolor()", "points": 50},
                        {"pattern": "red", "description": "Sets red color", "points": 50}
                    ]
                },
                {
                    "id": "lesson2",
                    "title": "Fill Colors",
                    "description": "Fill shapes with solid colors",
                    "objectives": ["Use begin_fill() and end_fill()", "Fill shapes with color", "Combine outline and fill colors"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Draw a filled blue circle\n# Use begin_fill() before drawing\n# Use end_fill() after drawing\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.fillcolor('blue')\nt.begin_fill()\nt.circle(50)\nt.end_fill()\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "fillcolor", "description": "Sets fill color", "points": 25},
                        {"pattern": "begin_fill", "description": "Starts fill", "points": 25},
                        {"pattern": "end_fill", "description": "Ends fill", "points": 25},
                        {"pattern": "circle", "description": "Draws circle", "points": 25}
                    ]
                },
                {
                    "id": "lesson3",
                    "title": "Rainbow Pattern",
                    "description": "Create a colorful rainbow using multiple colors in a loop",
                    "objectives": ["Use a list of colors", "Change colors inside a loop", "Create rainbow effects"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\ncolors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']\n\n# Draw a spiral with changing colors\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\ncolors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']\n\nfor i in range(36):\n    t.pencolor(colors[i % 6])\n    t.forward(i * 5)\n    t.right(60)\n\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "colors", "description": "Uses color list", "points": 25},
                        {"pattern": "pencolor", "description": "Changes pen color", "points": 25},
                        {"pattern": "% 6", "description": "Cycles through colors", "points": 25},
                        {"pattern": "for", "description": "Uses for loop", "points": 25}
                    ]
                }
            ]
        },
        {
            "id": "unit4",
            "title": "Unit 4: Conditionals - Making Decisions",
            "lessons": [
                {
                    "id": "lesson1",
                    "title": "If Statements",
                    "description": "Use if statements to make decisions in your code",
                    "objectives": ["Understand if statement syntax", "Make decisions based on conditions", "Change colors based on position"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\n# Draw a line, change color when x > 0\nfor i in range(200):\n    # Check if position is positive\n    # Change color accordingly\n    t.forward(1)\n    t.right(1)\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\nfor i in range(360):\n    if t.xcor() > 0:\n        t.pencolor('red')\n    t.forward(2)\n    t.right(1)\n\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "if", "description": "Uses if statement", "points": 40},
                        {"pattern": "xcor", "description": "Checks x position", "points": 30},
                        {"pattern": "pencolor", "description": "Changes color", "points": 30}
                    ]
                },
                {
                    "id": "lesson2",
                    "title": "If-Else for Alternating",
                    "description": "Use if-else to alternate between two options",
                    "objectives": ["Use else for alternative actions", "Create alternating patterns", "Draw checkerboard patterns"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\n# Draw squares that alternate between filled and empty\n# Use if i % 2 == 0 to check even/odd\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\nfor i in range(8):\n    if i % 2 == 0:\n        t.fillcolor('black')\n        t.begin_fill()\n    for j in range(4):\n        t.forward(30)\n        t.right(90)\n    if i % 2 == 0:\n        t.end_fill()\n    t.penup()\n    t.forward(40)\n    t.pendown()\n\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "if", "description": "Uses if statement", "points": 25},
                        {"pattern": "% 2", "description": "Checks even/odd", "points": 25},
                        {"pattern": "begin_fill", "description": "Fills shapes", "points": 25},
                        {"pattern": "for", "description": "Uses loops", "points": 25}
                    ]
                },
                {
                    "id": "lesson3",
                    "title": "Multiple Conditions with Elif",
                    "description": "Handle multiple conditions with elif",
                    "objectives": ["Use elif for multiple conditions", "Create rainbow patterns", "Complex decision making in loops"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\n# Change color based on angle:\n# 0-60: red, 61-120: orange, 121-180: yellow, etc.\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\nt.pensize(3)\n\nfor angle in range(360):\n    if angle < 60:\n        t.pencolor('red')\n    elif angle < 120:\n        t.pencolor('orange')\n    elif angle < 180:\n        t.pencolor('yellow')\n    elif angle < 240:\n        t.pencolor('green')\n    elif angle < 300:\n        t.pencolor('blue')\n    else:\n        t.pencolor('purple')\n    t.forward(1)\n    t.right(1)\n\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "if", "description": "Uses if statement", "points": 20},
                        {"pattern": "elif", "description": "Uses elif", "points": 30},
                        {"pattern": "else", "description": "Uses else", "points": 20},
                        {"pattern": "angle", "description": "Checks angle", "points": 30}
                    ]
                }
            ]
        },
        {
            "id": "unit5",
            "title": "Unit 5: Functions - Reusable Code",
            "lessons": [
                {
                    "id": "lesson1",
                    "title": "Defining Functions",
                    "description": "Create your own reusable commands with def",
                    "objectives": ["Understand function syntax", "Create reusable shape functions", "Call functions multiple times"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Define a function to draw a square\ndef draw_square():\n    # Add code here\n    pass\n\n# Call the function 3 times\ndraw_square()\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\n\ndef draw_square():\n    for i in range(4):\n        t.forward(50)\n        t.right(90)\n\ndraw_square()\nt.right(120)\ndraw_square()\nt.right(120)\ndraw_square()\n\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "def draw_square", "description": "Defines function", "points": 40},
                        {"pattern": "draw_square()", "description": "Calls function", "points": 30},
                        {"pattern": "for", "description": "Uses loop in function", "points": 30}
                    ]
                },
                {
                    "id": "lesson2",
                    "title": "Parameters - Customizable Functions",
                    "description": "Add parameters to make functions flexible",
                    "objectives": ["Add parameters to functions", "Create scalable shapes", "Pass different values to functions"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Define a function that takes size as parameter\ndef draw_square(size):\n    # Use size instead of a fixed number\n    pass\n\n# Draw squares of different sizes\ndraw_square(50)\ndraw_square(100)\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\n\ndef draw_square(size):\n    for i in range(4):\n        t.forward(size)\n        t.right(90)\n\ndraw_square(30)\nt.penup()\nt.forward(50)\nt.pendown()\ndraw_square(60)\nt.penup()\nt.forward(80)\nt.pendown()\ndraw_square(90)\n\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "def draw_square(size)", "description": "Function with parameter", "points": 40},
                        {"pattern": "t.forward(size)", "description": "Uses parameter", "points": 30},
                        {"pattern": "draw_square(", "description": "Calls with different values", "points": 30}
                    ]
                },
                {
                    "id": "lesson3",
                    "title": "Multiple Parameters",
                    "description": "Use multiple parameters for full control",
                    "objectives": ["Use multiple parameters", "Create customizable drawings", "Control size, color, and position"],
                    "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Define a function with size and color\ndef draw_square(size, color):\n    # Set color and draw square\n    pass\n\n# Draw different colored squares\ndraw_square(50, 'red')\ndraw_square(70, 'blue')\n\nt.hideturtle()",
                    "solution_code": "import turtle\n\nt = turtle.Turtle()\n\ndef draw_square(size, color):\n    t.pencolor(color)\n    t.fillcolor(color)\n    t.begin_fill()\n    for i in range(4):\n        t.forward(size)\n        t.right(90)\n    t.end_fill()\n\ndraw_square(50, 'red')\nt.penup()\nt.forward(70)\nt.pendown()\ndraw_square(70, 'blue')\nt.penup()\nt.forward(90)\nt.pendown()\ndraw_square(40, 'green')\n\nt.hideturtle()",
                    "test_cases": [
                        {"pattern": "def draw_square(size, color)", "description": "Multiple parameters", "points": 30},
                        {"pattern": "pencolor(color)", "description": "Uses color parameter", "points": 25},
                        {"pattern": "forward(size)", "description": "Uses size parameter", "points": 25},
                        {"pattern": "begin_fill", "description": "Fills with color", "points": 20}
                    ]
                }
            ]
        }
    ]
}

@api_router.post("/turtle/create-from-lesson")
async def create_assignment_from_turtle_lesson(data: dict, request: Request):
    """Create an assignment from a Turtle curriculum lesson"""
    user = await get_current_user(request)
    
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create assignments")
    
    unit_id = data.get("unit_id")
    lesson_id = data.get("lesson_id")
    classroom_ids = data.get("classroom_ids", [])
    
    # Find the lesson
    lesson = None
    unit_data = None
    for unit in TURTLE_CURRICULUM["units"]:
        if unit["id"] == unit_id:
            unit_data = unit
            for l in unit["lessons"]:
                if l["id"] == lesson_id:
                    lesson = l
                    break
            break
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Create problem in library
    problem_id = str(uuid.uuid4())
    proctor_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    problem = {
        "id": problem_id,
        "title": lesson["title"],
        "description": lesson["description"],
        "category": "Turtle Graphics",
        "difficulty": "beginner",
        "chapter": unit_data["title"],
        "lesson": lesson["title"],
        "problem_type": "Turtle Graphics",
        "assignment_type": "turtle",
        "starter_code": lesson.get("starter_code", "import turtle\n\nt = turtle.Turtle()\n\n# Your code here:\n\nt.hideturtle()"),
        "solution_code": lesson.get("solution_code", ""),
        "expected_output": "",
        "test_cases": lesson.get("test_cases", []),
        "learning_objectives": lesson.get("objectives", []),
        "teacher_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.problems.insert_one(problem)
    
    # Create assignment if classroom_ids provided
    if classroom_ids:
        assignment_id = str(uuid.uuid4())
        assignment = {
            "id": assignment_id,
            "title": lesson["title"],
            "description": lesson["description"],
            "chapter": unit_data["title"],
            "lesson": lesson["title"],
            "teacher_id": user["id"],
            "problem_ids": [problem_id],
            "classroom_ids": classroom_ids,
            "proctor_code": proctor_code,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.assignments.insert_one(assignment)
        
        return {"message": "Assignment created from Turtle lesson", "assignment_id": assignment_id, "problem_id": problem_id, "proctor_code": proctor_code}
    
    return {"message": "Problem added to library", "problem_id": problem_id}

@api_router.get("/turtle/curriculum")
async def get_turtle_curriculum(request: Request):
    """Get the turtle graphics curriculum structure"""
    await get_current_user(request)
    return TURTLE_CURRICULUM


# ----- Sprite Generation Routes -----

class SpriteGenerateRequest(BaseModel):
    prompt: str
    style: str = "pixel-art"  # pixel-art, cartoon, simple

@api_router.post("/sprites/generate")
async def generate_sprite(req: SpriteGenerateRequest, request: Request):
    """Generate a custom sprite using AI"""
    import base64
    from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
    
    user = await get_current_user(request)
    
    # Build the prompt for kid-friendly sprites
    style_prompts = {
        "pixel-art": "pixel art style, 64x64 pixels, retro game aesthetic",
        "cartoon": "cartoon style, friendly and colorful, suitable for children",
        "simple": "simple flat design, clean lines, minimal details"
    }
    
    style_desc = style_prompts.get(req.style, style_prompts["cartoon"])
    full_prompt = f"{req.prompt}, {style_desc}, transparent background, game sprite, centered, no text"
    
    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        image_gen = OpenAIImageGeneration(api_key=api_key)
        
        images = await image_gen.generate_images(
            prompt=full_prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            
            # Save to database
            sprite_id = str(uuid.uuid4())
            sprite_data = {
                "id": sprite_id,
                "name": req.prompt[:50],
                "prompt": req.prompt,
                "style": req.style,
                "image_data": f"data:image/png;base64,{image_base64}",
                "created_by": user["id"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_public": False
            }
            await db.sprites.insert_one(sprite_data)
            
            return {
                "success": True,
                "sprite_id": sprite_id,
                "image_data": f"data:image/png;base64,{image_base64}"
            }
        else:
            raise HTTPException(status_code=500, detail="No image was generated")
    except Exception as e:
        logging.error(f"Sprite generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate sprite: {str(e)}")

@api_router.get("/sprites")
async def get_sprites(request: Request, include_public: bool = True):
    """Get all sprites (user's own + public library)"""
    user = await get_current_user(request)
    
    query = {"$or": [{"created_by": user["id"]}]}
    if include_public:
        query["$or"].append({"is_public": True})
    
    sprites = await db.sprites.find(query, {"_id": 0}).to_list(100)
    return sprites

@api_router.get("/sprites/library")
async def get_sprite_library(request: Request):
    """Get pre-made sprite library for block-based coding"""
    await get_current_user(request)
    
    # Return built-in sprite library
    return SPRITE_LIBRARY

# Pre-made sprite library for common use cases
SPRITE_LIBRARY = {
    "space": [
        {"id": "rocket-1", "name": "Rocket", "category": "space", "emoji": "🚀"},
        {"id": "alien-1", "name": "Alien", "category": "space", "emoji": "👽"},
        {"id": "planet-1", "name": "Planet", "category": "space", "emoji": "🪐"},
        {"id": "star-1", "name": "Star", "category": "space", "emoji": "⭐"},
        {"id": "asteroid-1", "name": "Asteroid", "category": "space", "emoji": "☄️"},
        {"id": "ufo-1", "name": "UFO", "category": "space", "emoji": "🛸"},
    ],
    "animals": [
        {"id": "cat-1", "name": "Cat", "category": "animals", "emoji": "🐱"},
        {"id": "dog-1", "name": "Dog", "category": "animals", "emoji": "🐕"},
        {"id": "bird-1", "name": "Bird", "category": "animals", "emoji": "🐦"},
        {"id": "fish-1", "name": "Fish", "category": "animals", "emoji": "🐠"},
    ],
    "characters": [
        {"id": "robot-1", "name": "Robot", "category": "characters", "emoji": "🤖"},
        {"id": "wizard-1", "name": "Wizard", "category": "characters", "emoji": "🧙"},
        {"id": "ninja-1", "name": "Ninja", "category": "characters", "emoji": "🥷"},
        {"id": "astronaut-1", "name": "Astronaut", "category": "characters", "emoji": "👨‍🚀"},
    ],
    "objects": [
        {"id": "ball-1", "name": "Ball", "category": "objects", "emoji": "⚽"},
        {"id": "coin-1", "name": "Coin", "category": "objects", "emoji": "🪙"},
        {"id": "gem-1", "name": "Gem", "category": "objects", "emoji": "💎"},
        {"id": "heart-1", "name": "Heart", "category": "objects", "emoji": "❤️"},
    ],
    "shapes": [
        {"id": "circle-red", "name": "Red Circle", "category": "shapes", "color": "#EF4444"},
        {"id": "circle-blue", "name": "Blue Circle", "category": "shapes", "color": "#3B82F6"},
        {"id": "square-green", "name": "Green Square", "category": "shapes", "color": "#22C55E"},
        {"id": "triangle-yellow", "name": "Yellow Triangle", "category": "shapes", "color": "#EAB308"},
    ]
}

# Block-Based Curriculum Structure
BLOCK_CURRICULUM = {
    "units": [
        {
            "id": "unit-1",
            "title": "Unit 1: Foundations of Programming",
            "description": "Understanding how programming solves problems",
            "chapters": [
                {
                    "id": "ch-1-1",
                    "title": "Chapter 1: What is Programming?",
                    "lessons": [
                        {"id": "l-1-1-1", "title": "Lesson 1: Computers and Code", "competency": "1a"},
                        {"id": "l-1-1-2", "title": "Lesson 2: Breaking Down Problems", "competency": "1b"},
                        {"id": "l-1-1-3", "title": "Lesson 3: Introduction to Pseudocode", "competency": "1c"}
                    ]
                },
                {
                    "id": "ch-1-2",
                    "title": "Chapter 2: Block-Based Environments",
                    "lessons": [
                        {"id": "l-1-2-1", "title": "Lesson 1: Navigating the Interface", "competency": "2a"},
                        {"id": "l-1-2-2", "title": "Lesson 2: Your First Blocks", "competency": "2a"},
                        {"id": "l-1-2-3", "title": "Lesson 3: Running Programs", "competency": "2d"}
                    ]
                }
            ]
        },
        {
            "id": "unit-2",
            "title": "Unit 2: Sprites and Motion",
            "description": "Creating and controlling visual objects",
            "chapters": [
                {
                    "id": "ch-2-1",
                    "title": "Chapter 1: Working with Sprites",
                    "lessons": [
                        {"id": "l-2-1-1", "title": "Lesson 1: Creating Sprites", "competency": "2b"},
                        {"id": "l-2-1-2", "title": "Lesson 2: Moving Sprites", "competency": "2c"},
                        {"id": "l-2-1-3", "title": "Lesson 3: Turning and Positioning", "competency": "2c"}
                    ]
                },
                {
                    "id": "ch-2-2",
                    "title": "Chapter 2: Sprite Appearance",
                    "lessons": [
                        {"id": "l-2-2-1", "title": "Lesson 1: Changing Looks", "competency": "2b"},
                        {"id": "l-2-2-2", "title": "Lesson 2: Size and Visibility", "competency": "2c"}
                    ]
                }
            ]
        },
        {
            "id": "unit-3",
            "title": "Unit 3: Loops and Patterns",
            "description": "Creating repetition and animations",
            "chapters": [
                {
                    "id": "ch-3-1",
                    "title": "Chapter 1: Repeat Loops",
                    "lessons": [
                        {"id": "l-3-1-1", "title": "Lesson 1: Basic Loops", "competency": "3d"},
                        {"id": "l-3-1-2", "title": "Lesson 2: Drawing Patterns", "competency": "3d"},
                        {"id": "l-3-1-3", "title": "Lesson 3: Nested Loops", "competency": "3d"}
                    ]
                },
                {
                    "id": "ch-3-2",
                    "title": "Chapter 2: Animations (Draw Loop)",
                    "lessons": [
                        {"id": "l-3-2-1", "title": "Lesson 1: The Draw Loop", "competency": "3d"},
                        {"id": "l-3-2-2", "title": "Lesson 2: Smooth Animations", "competency": "3a"}
                    ]
                }
            ]
        },
        {
            "id": "unit-4",
            "title": "Unit 4: Variables and Data",
            "description": "Storing and manipulating information",
            "chapters": [
                {
                    "id": "ch-4-1",
                    "title": "Chapter 1: Understanding Variables",
                    "lessons": [
                        {"id": "l-4-1-1", "title": "Lesson 1: What are Variables?", "competency": "3c"},
                        {"id": "l-4-1-2", "title": "Lesson 2: Creating Variables", "competency": "3c"},
                        {"id": "l-4-1-3", "title": "Lesson 3: Using Variables", "competency": "3c"}
                    ]
                },
                {
                    "id": "ch-4-2",
                    "title": "Chapter 2: Counter Patterns",
                    "lessons": [
                        {"id": "l-4-2-1", "title": "Lesson 1: Counting Up and Down", "competency": "3e"},
                        {"id": "l-4-2-2", "title": "Lesson 2: Velocity and Speed", "competency": "3e"}
                    ]
                }
            ]
        },
        {
            "id": "unit-5",
            "title": "Unit 5: Logic and Decisions",
            "description": "Making programs respond intelligently",
            "chapters": [
                {
                    "id": "ch-5-1",
                    "title": "Chapter 1: Booleans and Conditionals",
                    "lessons": [
                        {"id": "l-5-1-1", "title": "Lesson 1: True and False", "competency": "3f"},
                        {"id": "l-5-1-2", "title": "Lesson 2: If Statements", "competency": "3f"},
                        {"id": "l-5-1-3", "title": "Lesson 3: If-Else Logic", "competency": "3f"}
                    ]
                },
                {
                    "id": "ch-5-2",
                    "title": "Chapter 2: User Interactions",
                    "lessons": [
                        {"id": "l-5-2-1", "title": "Lesson 1: Keyboard Events", "competency": "3b"},
                        {"id": "l-5-2-2", "title": "Lesson 2: Mouse Events", "competency": "3b"}
                    ]
                }
            ]
        },
        {
            "id": "unit-6",
            "title": "Unit 6: Projects and Debugging",
            "description": "Building complete projects",
            "chapters": [
                {
                    "id": "ch-6-1",
                    "title": "Chapter 1: Space Game Project",
                    "lessons": [
                        {"id": "l-6-1-1", "title": "Lesson 1: Game Setup", "competency": "3a"},
                        {"id": "l-6-1-2", "title": "Lesson 2: Player Controls", "competency": "3b"},
                        {"id": "l-6-1-3", "title": "Lesson 3: Enemies and Collisions", "competency": "3a"},
                        {"id": "l-6-1-4", "title": "Lesson 4: Scoring System", "competency": "3c"}
                    ]
                },
                {
                    "id": "ch-6-2",
                    "title": "Chapter 2: Debugging Skills",
                    "lessons": [
                        {"id": "l-6-2-1", "title": "Lesson 1: Finding Bugs", "competency": "3g"},
                        {"id": "l-6-2-2", "title": "Lesson 2: Testing Strategies", "competency": "3i"}
                    ]
                }
            ]
        }
    ]
}

@api_router.get("/block/curriculum")
async def get_block_curriculum(request: Request):
    """Get the block-based programming curriculum structure"""
    await get_current_user(request)
    return BLOCK_CURRICULUM


# ==================== CUSTOM CURRICULUM MANAGEMENT ====================

class AddChapterRequest(BaseModel):
    title: str
    description: str = ""
    icon: str = "📚"
    color: str = "from-gray-500 to-slate-500"
    weeks: str = ""

class AddLessonRequest(BaseModel):
    chapter: str  # Chapter title to add lesson to
    title: str
    type: str = "Code"
    duration: str = "30 min"
    objectives: list = []

@api_router.get("/curriculum/{unit_type}/custom")
async def get_custom_curriculum(unit_type: str, request: Request):
    """Get custom chapters and lessons for a unit type"""
    user = await get_current_user(request)
    
    # Get custom curriculum items created by any teacher
    custom_chapters = await db.custom_curriculum.find(
        {"unit_type": unit_type, "item_type": "chapter"},
        {"_id": 0}
    ).to_list(100)
    
    custom_lessons = await db.custom_curriculum.find(
        {"unit_type": unit_type, "item_type": "lesson"},
        {"_id": 0}
    ).to_list(500)
    
    return {
        "chapters": custom_chapters,
        "lessons": custom_lessons
    }

@api_router.post("/curriculum/{unit_type}/chapter")
async def add_custom_chapter(unit_type: str, chapter_data: AddChapterRequest, request: Request):
    """Add a custom chapter to a unit curriculum"""
    user = await get_current_user(request)
    
    chapter_doc = {
        "id": str(uuid.uuid4()),
        "unit_type": unit_type,
        "item_type": "chapter",
        "title": chapter_data.title,
        "description": chapter_data.description,
        "icon": chapter_data.icon,
        "color": chapter_data.color,
        "weeks": chapter_data.weeks,
        "creator_id": user["id"],
        "creator_name": user.get("name", user.get("email", "Unknown")),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_custom": True
    }
    
    await db.custom_curriculum.insert_one(chapter_doc)
    logger.info(f"Custom chapter added: {chapter_data.title} to {unit_type} by {user.get('email')}")
    
    return {"message": "Chapter added successfully", "chapter": {k: v for k, v in chapter_doc.items() if k != "_id"}}

@api_router.post("/curriculum/{unit_type}/lesson")
async def add_custom_lesson(unit_type: str, lesson_data: AddLessonRequest, request: Request):
    """Add a custom lesson to a chapter"""
    user = await get_current_user(request)
    
    lesson_doc = {
        "id": str(uuid.uuid4()),
        "unit_type": unit_type,
        "item_type": "lesson",
        "chapter": lesson_data.chapter,
        "title": lesson_data.title,
        "type": lesson_data.type,
        "duration": lesson_data.duration,
        "objectives": lesson_data.objectives,
        "creator_id": user["id"],
        "creator_name": user.get("name", user.get("email", "Unknown")),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_custom": True
    }
    
    await db.custom_curriculum.insert_one(lesson_doc)
    logger.info(f"Custom lesson added: {lesson_data.title} to {lesson_data.chapter} by {user.get('email')}")
    
    return {"message": "Lesson added successfully", "lesson": {k: v for k, v in lesson_doc.items() if k != "_id"}}

@api_router.delete("/curriculum/{unit_type}/chapter/{chapter_id}")
async def delete_custom_chapter(unit_type: str, chapter_id: str, request: Request):
    """Delete a custom chapter (only creator can delete)"""
    user = await get_current_user(request)
    
    # Find the chapter
    chapter = await db.custom_curriculum.find_one({"id": chapter_id, "item_type": "chapter"})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    # Check ownership
    if chapter.get("creator_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You can only delete chapters you created")
    
    # Delete the chapter
    await db.custom_curriculum.delete_one({"id": chapter_id})
    
    # Also delete associated custom lessons
    await db.custom_curriculum.delete_many({"unit_type": unit_type, "chapter": chapter["title"], "item_type": "lesson"})
    
    return {"message": "Chapter deleted successfully"}

@api_router.delete("/curriculum/{unit_type}/lesson/{lesson_id}")
async def delete_custom_lesson(unit_type: str, lesson_id: str, request: Request):
    """Delete a custom lesson (only creator can delete)"""
    user = await get_current_user(request)
    
    # Find the lesson
    lesson = await db.custom_curriculum.find_one({"id": lesson_id, "item_type": "lesson"})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Check ownership
    if lesson.get("creator_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You can only delete lessons you created")
    
    await db.custom_curriculum.delete_one({"id": lesson_id})
    
    return {"message": "Lesson deleted successfully"}


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

@app.on_event("startup")
async def seed_block_problems():
    """Seed block-based curriculum problems if they don't exist"""
    try:
        # Check if block problems already exist
        existing_count = await db.problems.count_documents({"assignment_type": "block"})
        if existing_count >= 30:
            logger.info(f"✅ Block problems already exist: {existing_count}")
            return
        
        logger.info("🔄 Seeding block problems...")
        
        block_problems = [
            # Chapter 1: Block Basics
            {"title": "Hello Blocks!", "description": "Create your first block program! Use the 'say' block to make the sprite say 'Hello, World!'", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 1: Block Basics", "lesson": "Lesson 1: What are Blocks?", "difficulty": "Easy", "problem_type": "Class Practice"},
            {"title": "Block Connections", "description": "Connect multiple blocks together to make the sprite say two different messages in sequence.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 1: Block Basics", "lesson": "Lesson 1: What are Blocks?", "difficulty": "Easy", "problem_type": "Independent Practice"},
            {"title": "Move Right", "description": "Use motion blocks to move the sprite 100 steps to the right.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 1: Block Basics", "lesson": "Lesson 2: Motion & Actions", "difficulty": "Easy", "problem_type": "Class Practice"},
            {"title": "Square Walk", "description": "Make the sprite walk in a square pattern using move and turn blocks.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 1: Block Basics", "lesson": "Lesson 2: Motion & Actions", "difficulty": "Medium", "problem_type": "Independent Practice"},
            {"title": "Click to Move", "description": "Use the 'when clicked' event block to make the sprite move when you click on it.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 1: Block Basics", "lesson": "Lesson 3: Events & Triggers", "difficulty": "Easy", "problem_type": "Class Practice"},
            {"title": "Keyboard Controls", "description": "Use 'when key pressed' events to move the sprite with arrow keys.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 1: Block Basics", "lesson": "Lesson 3: Events & Triggers", "difficulty": "Medium", "problem_type": "Independent Practice"},
            # Chapter 2: Loops & Repetition
            {"title": "Repeat 4 Times", "description": "Use a repeat block to draw a square by repeating 'move' and 'turn' 4 times.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 2: Loops & Repetition", "lesson": "Lesson 4: Repeat Blocks", "difficulty": "Easy", "problem_type": "Class Practice"},
            {"title": "Star Pattern", "description": "Use a repeat block to draw a 5-pointed star pattern.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 2: Loops & Repetition", "lesson": "Lesson 4: Repeat Blocks", "difficulty": "Medium", "problem_type": "Independent Practice"},
            {"title": "Spinning Forever", "description": "Use a forever loop to make the sprite spin continuously.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 2: Loops & Repetition", "lesson": "Lesson 5: Forever Loops", "difficulty": "Easy", "problem_type": "Class Practice"},
            {"title": "Bouncing Ball", "description": "Create an animation where the sprite bounces back and forth using a forever loop.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 2: Loops & Repetition", "lesson": "Lesson 5: Forever Loops", "difficulty": "Medium", "problem_type": "Independent Practice"},
            {"title": "Grid of Dots", "description": "Use nested loops to create a 3x3 grid pattern.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 2: Loops & Repetition", "lesson": "Lesson 6: Nested Loops", "difficulty": "Hard", "problem_type": "Challenge"},
            {"title": "Spiral Pattern", "description": "Create a spiral pattern using nested loops with increasing step sizes.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 2: Loops & Repetition", "lesson": "Lesson 6: Nested Loops", "difficulty": "Hard", "problem_type": "Independent Practice"},
            # Chapter 3: Decisions & Logic
            {"title": "Edge Detection", "description": "Use an if block to make the sprite turn around when it touches the edge.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 3: Decisions & Logic", "lesson": "Lesson 7: If Blocks", "difficulty": "Easy", "problem_type": "Class Practice"},
            {"title": "Color Sensor", "description": "Make the sprite react differently when touching different colors.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 3: Decisions & Logic", "lesson": "Lesson 7: If Blocks", "difficulty": "Medium", "problem_type": "Independent Practice"},
            {"title": "Day or Night", "description": "Use if-else to show different messages based on a time variable.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 3: Decisions & Logic", "lesson": "Lesson 8: If-Else Blocks", "difficulty": "Easy", "problem_type": "Class Practice"},
            {"title": "Guess the Number", "description": "Create a simple guessing game using if-else blocks.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 3: Decisions & Logic", "lesson": "Lesson 8: If-Else Blocks", "difficulty": "Medium", "problem_type": "Independent Practice"},
            {"title": "Number Comparisons", "description": "Use comparison operators to check if a number is greater than, less than, or equal to 10.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 3: Decisions & Logic", "lesson": "Lesson 9: Comparison & Logic", "difficulty": "Medium", "problem_type": "Class Practice"},
            {"title": "AND/OR Logic", "description": "Combine multiple conditions using AND and OR operators.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 3: Decisions & Logic", "lesson": "Lesson 9: Comparison & Logic", "difficulty": "Hard", "problem_type": "Independent Practice"},
            # Chapter 4: Variables & Data
            {"title": "Create a Counter", "description": "Create a variable called 'counter' and set it to 0.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 4: Variables & Data", "lesson": "Lesson 10: What are Variables?", "difficulty": "Easy", "problem_type": "Class Practice"},
            {"title": "Name Storage", "description": "Create a variable to store and display a name.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 4: Variables & Data", "lesson": "Lesson 10: What are Variables?", "difficulty": "Easy", "problem_type": "Independent Practice"},
            {"title": "Click Counter", "description": "Increase a counter variable by 1 each time the sprite is clicked.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 4: Variables & Data", "lesson": "Lesson 11: Using Variables", "difficulty": "Easy", "problem_type": "Class Practice"},
            {"title": "Simple Calculator", "description": "Use variables to add two numbers together and display the result.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 4: Variables & Data", "lesson": "Lesson 11: Using Variables", "difficulty": "Medium", "problem_type": "Independent Practice"},
            {"title": "Score Tracker", "description": "Create a score variable that increases when you collect items.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 4: Variables & Data", "lesson": "Lesson 12: Variables in Games", "difficulty": "Medium", "problem_type": "Class Practice"},
            {"title": "Lives System", "description": "Create a lives variable that decreases and shows 'Game Over' when it reaches 0.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 4: Variables & Data", "lesson": "Lesson 12: Variables in Games", "difficulty": "Medium", "problem_type": "Project"},
            # Chapter 5: Blocks to Text
            {"title": "Blocks vs Code", "description": "Compare a block program with its Python equivalent. Match the blocks to code.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 5: Blocks to Text", "lesson": "Lesson 13: Blocks → Python", "difficulty": "Easy", "problem_type": "Class Practice"},
            {"title": "Translate to Python", "description": "Convert a simple repeat block program into Python code.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 5: Blocks to Text", "lesson": "Lesson 13: Blocks → Python", "difficulty": "Medium", "problem_type": "Independent Practice"},
            {"title": "First Print Statement", "description": "Write your first Python print() statement to display 'Hello, Python!'", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 5: Blocks to Text", "lesson": "Lesson 14: Writing Your First Python", "difficulty": "Easy", "problem_type": "Class Practice"},
            {"title": "Fix the Syntax", "description": "Debug a Python program with a missing quotation mark.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 5: Blocks to Text", "lesson": "Lesson 14: Writing Your First Python", "difficulty": "Medium", "problem_type": "Debugging"},
            {"title": "Loop Conversion", "description": "Convert a repeat 5 times block into a Python for loop.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 5: Blocks to Text", "lesson": "Lesson 15: Transition Challenge", "difficulty": "Medium", "problem_type": "Assessment"},
            {"title": "Conditional Conversion", "description": "Convert an if-else block program into Python code.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 5: Blocks to Text", "lesson": "Lesson 15: Transition Challenge", "difficulty": "Medium", "problem_type": "Assessment"},
            {"title": "Variable Conversion", "description": "Convert a block program with variables into Python code.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 5: Blocks to Text", "lesson": "Lesson 15: Transition Challenge", "difficulty": "Hard", "problem_type": "Assessment"},
            {"title": "Full Program Conversion", "description": "Convert a complete block program using loops, conditions, and variables into Python.", "unit": "Unit 1: Block-Based Coding", "chapter": "Chapter 5: Blocks to Text", "lesson": "Lesson 15: Transition Challenge", "difficulty": "Hard", "problem_type": "Assessment"},
        ]
        
        for problem in block_problems:
            # Check if this specific problem already exists
            existing = await db.problems.find_one({"title": problem["title"], "assignment_type": "block"})
            if not existing:
                problem_doc = {
                    "id": str(uuid.uuid4()),
                    "title": problem["title"],
                    "description": problem["description"],
                    "starter_code": "<xml xmlns=\"https://developers.google.com/blockly/xml\"></xml>",
                    "solution_code": "",
                    "expected_output": "",
                    "category": "Block Programming",
                    "difficulty": problem["difficulty"],
                    "unit": problem["unit"],
                    "chapter": problem["chapter"],
                    "lesson": problem["lesson"],
                    "problem_type": problem["problem_type"],
                    "assignment_type": "block",
                    "resources_link": "",
                    "csta_standard": "",
                    "creator_id": "system",
                    "creator_name": "System",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.problems.insert_one(problem_doc)
        
        final_count = await db.problems.count_documents({"assignment_type": "block"})
        logger.info(f"✅ Block problems seeded: {final_count}")
    except Exception as e:
        logger.error(f"Error seeding block problems: {str(e)}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.on_event("startup")
async def seed_microbit_problems():
    """Seed Micro:bit curriculum problems - 5 per lesson, 12 lessons = 60 total"""
    try:
        # Check current count - we want exactly 60 problems
        existing_count = await db.problems.count_documents({"assignment_type": "microbit"})
        if existing_count >= 60:
            logger.info(f"✅ Micro:bit problems already exist: {existing_count}")
            return
        
        logger.info("🔄 Seeding Micro:bit problems...")
        
        # First, clear existing microbit problems to reorganize
        await db.problems.delete_many({"assignment_type": "microbit"})
        
        microbit_problems = [
            # ==================== UNIT 1: GETTING STARTED ====================
            
            # Lesson 1: What is Micro:bit? (Quiz - 5 multiple choice)
            {
                "title": "Micro:bit Components Quiz",
                "description": "Test your knowledge about the parts of a Micro:bit! Identify the LED matrix, buttons, and other components.",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 1: What is Micro:bit?",
                "difficulty": "Easy",
                "problem_type": "Quiz",
                "quiz_questions": [
                    {"question": "What is the grid of lights on the front of the Micro:bit called?", "options": ["LED Matrix", "Touch Screen", "Solar Panel", "Camera"], "correct": 0},
                    {"question": "How many LEDs are on the Micro:bit display?", "options": ["10", "25", "50", "100"], "correct": 1},
                    {"question": "What are buttons A and B used for?", "options": ["Charging the battery", "User input", "Turning it off", "Taking photos"], "correct": 1},
                    {"question": "What type of device is the Micro:bit?", "options": ["Smartphone", "Microcontroller", "Laptop", "Calculator"], "correct": 1},
                    {"question": "How do you connect the Micro:bit to a computer?", "options": ["WiFi", "Bluetooth only", "USB cable", "HDMI"], "correct": 2}
                ]
            },
            {
                "title": "Micro:bit Safety Quiz",
                "description": "Learn the safety rules for handling your Micro:bit and electronic components.",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 1: What is Micro:bit?",
                "difficulty": "Easy",
                "problem_type": "Quiz",
                "quiz_questions": [
                    {"question": "What should you NOT do with your Micro:bit?", "options": ["Connect via USB", "Submerge in water", "Write code for it", "Press its buttons"], "correct": 1},
                    {"question": "Where should you store your Micro:bit?", "options": ["In water", "In a safe, dry place", "In the freezer", "In direct sunlight"], "correct": 1},
                    {"question": "What should you hold when picking up a Micro:bit?", "options": ["The USB port", "The edges", "The LED screen", "The battery"], "correct": 1},
                    {"question": "Static electricity can damage electronics. What helps prevent this?", "options": ["Touching metal first", "Rubbing your feet on carpet", "Wearing wool", "Being in a dry room"], "correct": 0}
                ]
            },
            {
                "title": "Micro:bit Features Quiz",
                "description": "Discover all the built-in features of the Micro:bit including sensors and communication.",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 1: What is Micro:bit?",
                "difficulty": "Easy",
                "problem_type": "Quiz",
                "quiz_questions": [
                    {"question": "Which sensor detects motion and tilt?", "options": ["Thermometer", "Accelerometer", "Barometer", "Microphone"], "correct": 1},
                    {"question": "Can the Micro:bit measure temperature?", "options": ["Yes", "No", "Only with extra parts", "Only in Celsius"], "correct": 0},
                    {"question": "What can the Micro:bit use to communicate wirelessly?", "options": ["WiFi only", "Radio and Bluetooth", "Satellite", "Infrared"], "correct": 1},
                    {"question": "How many pins are on the edge connector for connecting external components?", "options": ["3", "10", "25", "50"], "correct": 2}
                ]
            },
            {
                "title": "Programming Languages Quiz",
                "description": "Learn about the different programming languages you can use with Micro:bit.",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 1: What is Micro:bit?",
                "difficulty": "Easy",
                "problem_type": "Quiz",
                "quiz_questions": [
                    {"question": "What programming language uses blocks that snap together?", "options": ["Python", "JavaScript", "MakeCode Blocks", "C++"], "correct": 2},
                    {"question": "What text-based language is popular for Micro:bit?", "options": ["Java", "MicroPython", "Ruby", "PHP"], "correct": 1},
                    {"question": "What is the name of the editor we use for MicroPython?", "options": ["Mu Editor", "Word", "Notepad", "Paint"], "correct": 0},
                    {"question": "How do you transfer code to the Micro:bit?", "options": ["Email it", "Drag and drop the file", "Print it", "Say it out loud"], "correct": 1}
                ]
            },
            {
                "title": "Micro:bit History Quiz",
                "description": "Learn about the history and purpose of the BBC Micro:bit.",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 1: What is Micro:bit?",
                "difficulty": "Easy",
                "problem_type": "Quiz",
                "quiz_questions": [
                    {"question": "Which organization created the Micro:bit?", "options": ["Apple", "BBC", "Google", "Microsoft"], "correct": 1},
                    {"question": "What was the main purpose of creating the Micro:bit?", "options": ["Playing games", "Teaching coding to students", "Making phone calls", "Taking photos"], "correct": 1},
                    {"question": "In what year was the Micro:bit first released?", "options": ["2010", "2016", "2020", "2005"], "correct": 1},
                    {"question": "The Micro:bit was inspired by which 1980s computer?", "options": ["Apple II", "BBC Micro", "Commodore 64", "Atari"], "correct": 1}
                ]
            },
            
            # Lesson 2: Your First Program - Display Heart (Code - 5 problems)
            {
                "title": "Display a Heart",
                "description": "Write your first Micro:bit program! Display a heart image on the LED matrix using display.show(Image.HEART).",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 2: Display Heart",
                "difficulty": "Easy",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\n# Display a heart on the LED screen\n# Your code here:\n",
                "solution_code": "from microbit import *\n\n# Display a heart on the LED screen\ndisplay.show(Image.HEART)",
                "test_cases": [
                    {"description": "Imports microbit module", "pattern": "from microbit import", "points": 25},
                    {"description": "Uses display.show()", "pattern": "display.show", "points": 25},
                    {"description": "Shows HEART image", "pattern": "Image.HEART", "points": 50}
                ]
            },
            {
                "title": "Hello World - Scroll Text",
                "description": "Make the LED display scroll the message 'Hello' across the screen using display.scroll().",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 2: Display Heart",
                "difficulty": "Easy",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\n# Make the display scroll 'Hello'\n# Your code here:\n",
                "solution_code": "from microbit import *\n\ndisplay.scroll('Hello')",
                "test_cases": [
                    {"description": "Uses display.scroll()", "pattern": "display.scroll", "points": 50},
                    {"description": "Scrolls 'Hello'", "pattern": "Hello", "points": 50}
                ]
            },
            {
                "title": "Display Your Name",
                "description": "Scroll your name across the LED display. Replace 'YourName' with your actual name!",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 2: Display Heart",
                "difficulty": "Easy",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\n# Scroll your name\n# Your code here:\n",
                "solution_code": "from microbit import *\n\ndisplay.scroll('Student')",
                "test_cases": [
                    {"description": "Uses display.scroll()", "pattern": "display.scroll", "points": 100}
                ]
            },
            {
                "title": "Show a Happy Face",
                "description": "Display a happy face image using the built-in Image.HAPPY.",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 2: Display Heart",
                "difficulty": "Easy",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\n# Show a happy face\n# Your code here:\n",
                "solution_code": "from microbit import *\n\ndisplay.show(Image.HAPPY)",
                "test_cases": [
                    {"description": "Uses display.show()", "pattern": "display.show", "points": 50},
                    {"description": "Shows HAPPY image", "pattern": "Image.HAPPY", "points": 50}
                ]
            },
            {
                "title": "Show Multiple Images",
                "description": "Show a heart, wait 1 second, then show a happy face. Use sleep(1000) to pause.",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 2: Display Heart",
                "difficulty": "Medium",
                "problem_type": "Challenge",
                "starter_code": "from microbit import *\n\n# Show heart, wait, then show happy\n# Your code here:\n",
                "solution_code": "from microbit import *\n\ndisplay.show(Image.HEART)\nsleep(1000)\ndisplay.show(Image.HAPPY)",
                "test_cases": [
                    {"description": "Shows HEART", "pattern": "Image.HEART", "points": 30},
                    {"description": "Uses sleep()", "pattern": "sleep(", "points": 30},
                    {"description": "Shows HAPPY", "pattern": "Image.HAPPY", "points": 40}
                ]
            },
            
            # Lesson 3: LED Patterns & Animations (Code - 5 problems)
            {
                "title": "Beating Heart Animation",
                "description": "Create a beating heart animation by alternating between HEART and HEART_SMALL images in a loop.",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 3: Animations",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\n# Create a beating heart animation\n# Use while True loop\n# Your code here:\n",
                "solution_code": "from microbit import *\n\nwhile True:\n    display.show(Image.HEART)\n    sleep(500)\n    display.show(Image.HEART_SMALL)\n    sleep(500)",
                "test_cases": [
                    {"description": "Uses while True loop", "pattern": "while True:", "points": 25},
                    {"description": "Shows HEART", "pattern": "Image.HEART", "points": 25},
                    {"description": "Shows HEART_SMALL", "pattern": "Image.HEART_SMALL", "points": 25},
                    {"description": "Uses sleep()", "pattern": "sleep(", "points": 25}
                ]
            },
            {
                "title": "Happy Sad Animation",
                "description": "Create an animation that alternates between happy and sad faces every half second.",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 3: Animations",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\n# Animate between happy and sad faces\n# Your code here:\n",
                "solution_code": "from microbit import *\n\nwhile True:\n    display.show(Image.HAPPY)\n    sleep(500)\n    display.show(Image.SAD)\n    sleep(500)",
                "test_cases": [
                    {"description": "Uses while True loop", "pattern": "while True:", "points": 25},
                    {"description": "Shows HAPPY", "pattern": "Image.HAPPY", "points": 25},
                    {"description": "Shows SAD", "pattern": "Image.SAD", "points": 25},
                    {"description": "Uses sleep()", "pattern": "sleep(", "points": 25}
                ]
            },
            {
                "title": "Clock Animation",
                "description": "Create an animation showing clock hands moving: CLOCK12, CLOCK3, CLOCK6, CLOCK9 in a loop.",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 3: Animations",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\n# Create a clock animation\n# Show CLOCK12, CLOCK3, CLOCK6, CLOCK9\n# Your code here:\n",
                "solution_code": "from microbit import *\n\nwhile True:\n    display.show(Image.CLOCK12)\n    sleep(250)\n    display.show(Image.CLOCK3)\n    sleep(250)\n    display.show(Image.CLOCK6)\n    sleep(250)\n    display.show(Image.CLOCK9)\n    sleep(250)",
                "test_cases": [
                    {"description": "Uses while True loop", "pattern": "while True:", "points": 20},
                    {"description": "Shows CLOCK images", "pattern": "Image.CLOCK", "points": 40},
                    {"description": "Uses sleep()", "pattern": "sleep(", "points": 40}
                ]
            },
            {
                "title": "Arrow Spinner",
                "description": "Make an arrow spin around! Show ARROW_N, ARROW_E, ARROW_S, ARROW_W in sequence.",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 3: Animations",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\n# Make an arrow spin around\n# Your code here:\n",
                "solution_code": "from microbit import *\n\nwhile True:\n    display.show(Image.ARROW_N)\n    sleep(200)\n    display.show(Image.ARROW_E)\n    sleep(200)\n    display.show(Image.ARROW_S)\n    sleep(200)\n    display.show(Image.ARROW_W)\n    sleep(200)",
                "test_cases": [
                    {"description": "Uses while True loop", "pattern": "while True:", "points": 20},
                    {"description": "Shows ARROW images", "pattern": "Image.ARROW", "points": 40},
                    {"description": "Uses sleep()", "pattern": "sleep(", "points": 40}
                ]
            },
            {
                "title": "Custom Image Animation",
                "description": "Create your own custom image using Image() and animate it with another image.",
                "unit": "Unit 1: Getting Started",
                "chapter": "Chapter 1: LED Patterns",
                "lesson": "Lesson 3: Animations",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "from microbit import *\n\n# Create a custom image\n# Image('09090:09090:09090:09090:09090') makes vertical lines\n# Your code here:\n",
                "solution_code": "from microbit import *\n\nimg1 = Image('09090:09090:09090:09090:09090')\nimg2 = Image('90909:90909:90909:90909:90909')\n\nwhile True:\n    display.show(img1)\n    sleep(300)\n    display.show(img2)\n    sleep(300)",
                "test_cases": [
                    {"description": "Creates custom Image", "pattern": "Image(", "points": 40},
                    {"description": "Uses while True loop", "pattern": "while True:", "points": 30},
                    {"description": "Uses sleep()", "pattern": "sleep(", "points": 30}
                ]
            },
            
            # ==================== UNIT 2: BUTTONS & INPUT ====================
            
            # Lesson 4: Button A & B Basics (Code - 5 problems)
            {
                "title": "Button A - Show A",
                "description": "When button A is pressed, display the letter 'A' on the screen.",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 4: Button Basics",
                "difficulty": "Easy",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Check if button A is pressed\n    # If pressed, show 'A'\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    if button_a.is_pressed():\n        display.show('A')",
                "test_cases": [
                    {"description": "Checks button_a", "pattern": "button_a", "points": 30},
                    {"description": "Uses is_pressed()", "pattern": "is_pressed()", "points": 30},
                    {"description": "Shows 'A'", "pattern": "'A'", "points": 40}
                ]
            },
            {
                "title": "Button B - Show B",
                "description": "When button B is pressed, display the letter 'B' on the screen.",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 4: Button Basics",
                "difficulty": "Easy",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Check if button B is pressed\n    # If pressed, show 'B'\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    if button_b.is_pressed():\n        display.show('B')",
                "test_cases": [
                    {"description": "Checks button_b", "pattern": "button_b", "points": 30},
                    {"description": "Uses is_pressed()", "pattern": "is_pressed()", "points": 30},
                    {"description": "Shows 'B'", "pattern": "'B'", "points": 40}
                ]
            },
            {
                "title": "Button A & B - Different Faces",
                "description": "Button A shows a happy face, Button B shows a sad face. Use if/elif.",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 4: Button Basics",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Button A = Happy\n    # Button B = Sad\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    if button_a.is_pressed():\n        display.show(Image.HAPPY)\n    elif button_b.is_pressed():\n        display.show(Image.SAD)",
                "test_cases": [
                    {"description": "Checks button_a", "pattern": "button_a", "points": 25},
                    {"description": "Checks button_b", "pattern": "button_b", "points": 25},
                    {"description": "Shows HAPPY", "pattern": "Image.HAPPY", "points": 25},
                    {"description": "Shows SAD", "pattern": "Image.SAD", "points": 25}
                ]
            },
            {
                "title": "Both Buttons - Surprise!",
                "description": "When BOTH buttons A and B are pressed together, show a surprised face!",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 4: Button Basics",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Both A and B = Surprised\n    # Use 'and' to check both\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    if button_a.is_pressed() and button_b.is_pressed():\n        display.show(Image.SURPRISED)",
                "test_cases": [
                    {"description": "Checks button_a", "pattern": "button_a", "points": 25},
                    {"description": "Checks button_b", "pattern": "button_b", "points": 25},
                    {"description": "Uses 'and'", "pattern": " and ", "points": 25},
                    {"description": "Shows SURPRISED", "pattern": "Image.SURPRISED", "points": 25}
                ]
            },
            {
                "title": "Clear on No Button",
                "description": "Show 'A' for button A, 'B' for button B, and clear the display when neither is pressed.",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 4: Button Basics",
                "difficulty": "Medium",
                "problem_type": "Challenge",
                "starter_code": "from microbit import *\n\nwhile True:\n    # A pressed = 'A'\n    # B pressed = 'B'\n    # Neither = clear display\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    if button_a.is_pressed():\n        display.show('A')\n    elif button_b.is_pressed():\n        display.show('B')\n    else:\n        display.clear()",
                "test_cases": [
                    {"description": "Checks button_a", "pattern": "button_a", "points": 20},
                    {"description": "Checks button_b", "pattern": "button_b", "points": 20},
                    {"description": "Uses else", "pattern": "else:", "points": 30},
                    {"description": "Uses display.clear()", "pattern": "display.clear()", "points": 30}
                ]
            },
            
            # Lesson 5: Button Counter (Code - 5 problems)
            {
                "title": "Simple Counter",
                "description": "Create a counter that increases by 1 each time button A is pressed. Use was_pressed() to count once per click.",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 5: Button Counter",
                "difficulty": "Easy",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\ncount = 0\n\nwhile True:\n    # Increase count when A is pressed\n    # Display the count\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\ncount = 0\n\nwhile True:\n    if button_a.was_pressed():\n        count = count + 1\n    display.show(count)",
                "test_cases": [
                    {"description": "Creates count variable", "pattern": "count", "points": 25},
                    {"description": "Uses was_pressed()", "pattern": "was_pressed()", "points": 25},
                    {"description": "Increments count", "pattern": "count + 1|count +=", "points": 25},
                    {"description": "Displays count", "pattern": "display.show", "points": 25}
                ]
            },
            {
                "title": "Up and Down Counter",
                "description": "Button A adds 1, Button B subtracts 1. Display the current count.",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 5: Button Counter",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\ncount = 0\n\nwhile True:\n    # A = add 1\n    # B = subtract 1\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\ncount = 0\n\nwhile True:\n    if button_a.was_pressed():\n        count = count + 1\n    if button_b.was_pressed():\n        count = count - 1\n    display.show(count)",
                "test_cases": [
                    {"description": "Increments count", "pattern": "count + 1|count +=", "points": 25},
                    {"description": "Decrements count", "pattern": "count - 1|count -=", "points": 25},
                    {"description": "Uses was_pressed()", "pattern": "was_pressed()", "points": 25},
                    {"description": "Displays count", "pattern": "display.show", "points": 25}
                ]
            },
            {
                "title": "Counter with Reset",
                "description": "A adds 1, B subtracts 1, Both buttons together reset to 0.",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 5: Button Counter",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\ncount = 0\n\nwhile True:\n    # A = +1, B = -1, Both = reset to 0\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\ncount = 0\n\nwhile True:\n    if button_a.is_pressed() and button_b.is_pressed():\n        count = 0\n    elif button_a.was_pressed():\n        count = count + 1\n    elif button_b.was_pressed():\n        count = count - 1\n    display.show(count)",
                "test_cases": [
                    {"description": "Checks both buttons", "pattern": "and", "points": 25},
                    {"description": "Resets count to 0", "pattern": "count = 0", "points": 25},
                    {"description": "Increments and decrements", "pattern": "count +|count -", "points": 25},
                    {"description": "Displays count", "pattern": "display.show", "points": 25}
                ]
            },
            {
                "title": "Score Keeper",
                "description": "Create a score keeper that adds 10 points for A and subtracts 5 for B.",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 5: Button Counter",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\nscore = 0\n\nwhile True:\n    # A = +10 points, B = -5 points\n    # Scroll the score\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nscore = 0\n\nwhile True:\n    if button_a.was_pressed():\n        score = score + 10\n        display.scroll(score)\n    if button_b.was_pressed():\n        score = score - 5\n        display.scroll(score)",
                "test_cases": [
                    {"description": "Adds 10 for A", "pattern": "+ 10|+= 10", "points": 25},
                    {"description": "Subtracts 5 for B", "pattern": "- 5|-= 5", "points": 25},
                    {"description": "Uses was_pressed()", "pattern": "was_pressed()", "points": 25},
                    {"description": "Scrolls score", "pattern": "display.scroll", "points": 25}
                ]
            },
            {
                "title": "Click Speed Game",
                "description": "Count how many times button A is pressed in 5 seconds, then show the result.",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 5: Button Counter",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "from microbit import *\nimport time\n\n# Count button A presses in 5 seconds\n# Show countdown then result\n# Your code here:\n",
                "solution_code": "from microbit import *\n\ndisplay.scroll('GO!')\ncount = 0\nstart = running_time()\n\nwhile running_time() - start < 5000:\n    if button_a.was_pressed():\n        count = count + 1\n        display.show(count)\n\ndisplay.scroll('Score:' + str(count))",
                "test_cases": [
                    {"description": "Uses running_time()", "pattern": "running_time()", "points": 30},
                    {"description": "Counts button presses", "pattern": "count", "points": 30},
                    {"description": "Shows result", "pattern": "display.scroll|display.show", "points": 40}
                ]
            },
            
            # Lesson 6: Rock Paper Scissors Game (Code - 5 problems)
            {
                "title": "Random Number",
                "description": "Generate a random number between 1 and 3 when shaken. Display the number.",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 6: RPS Game",
                "difficulty": "Easy",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\nimport random\n\nwhile True:\n    # When shaken, show random 1-3\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\nimport random\n\nwhile True:\n    if accelerometer.was_gesture('shake'):\n        num = random.randint(1, 3)\n        display.show(num)",
                "test_cases": [
                    {"description": "Imports random", "pattern": "import random", "points": 25},
                    {"description": "Detects shake", "pattern": "shake", "points": 25},
                    {"description": "Uses randint()", "pattern": "random.randint", "points": 25},
                    {"description": "Displays number", "pattern": "display.show", "points": 25}
                ]
            },
            {
                "title": "Rock Paper Scissors - Letters",
                "description": "Shake to play RPS! Show 'R' for Rock, 'P' for Paper, 'S' for Scissors randomly.",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 6: RPS Game",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\nimport random\n\nwhile True:\n    # Shake = random R, P, or S\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\nimport random\n\nwhile True:\n    if accelerometer.was_gesture('shake'):\n        choice = random.randint(0, 2)\n        if choice == 0:\n            display.show('R')\n        elif choice == 1:\n            display.show('P')\n        else:\n            display.show('S')",
                "test_cases": [
                    {"description": "Imports random", "pattern": "import random", "points": 20},
                    {"description": "Detects shake", "pattern": "shake", "points": 20},
                    {"description": "Shows R", "pattern": "'R'", "points": 20},
                    {"description": "Shows P", "pattern": "'P'", "points": 20},
                    {"description": "Shows S", "pattern": "'S'", "points": 20}
                ]
            },
            {
                "title": "RPS with Images",
                "description": "Create custom images for Rock (square), Paper (all LEDs), and Scissors (X shape).",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 6: RPS Game",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\nimport random\n\nrock = Image('00000:09990:09990:09990:00000')\npaper = Image('99999:99999:99999:99999:99999')\nscissors = Image('90009:09090:00900:09090:90009')\n\nwhile True:\n    # Shake to show random choice\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\nimport random\n\nrock = Image('00000:09990:09990:09990:00000')\npaper = Image('99999:99999:99999:99999:99999')\nscissors = Image('90009:09090:00900:09090:90009')\n\nwhile True:\n    if accelerometer.was_gesture('shake'):\n        choice = random.choice([rock, paper, scissors])\n        display.show(choice)",
                "test_cases": [
                    {"description": "Creates rock Image", "pattern": "rock = Image", "points": 25},
                    {"description": "Creates paper Image", "pattern": "paper = Image", "points": 25},
                    {"description": "Detects shake", "pattern": "shake", "points": 25},
                    {"description": "Shows random choice", "pattern": "display.show", "points": 25}
                ]
            },
            {
                "title": "Digital Dice",
                "description": "Shake to roll a dice! Show random number 1-6.",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 6: RPS Game",
                "difficulty": "Easy",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\nimport random\n\nwhile True:\n    # Shake to roll dice (1-6)\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\nimport random\n\nwhile True:\n    if accelerometer.was_gesture('shake'):\n        roll = random.randint(1, 6)\n        display.show(roll)",
                "test_cases": [
                    {"description": "Imports random", "pattern": "import random", "points": 25},
                    {"description": "Detects shake", "pattern": "shake", "points": 25},
                    {"description": "Uses randint(1, 6)", "pattern": "randint(1, 6)", "points": 25},
                    {"description": "Displays roll", "pattern": "display.show", "points": 25}
                ]
            },
            {
                "title": "Magic 8 Ball",
                "description": "Shake for a random answer! Show 'Yes', 'No', or 'Maybe' randomly.",
                "unit": "Unit 2: Buttons & Input",
                "chapter": "Chapter 2: Buttons",
                "lesson": "Lesson 6: RPS Game",
                "difficulty": "Medium",
                "problem_type": "Challenge",
                "starter_code": "from microbit import *\nimport random\n\nanswers = ['Yes', 'No', 'Maybe']\n\nwhile True:\n    # Shake for random answer\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\nimport random\n\nanswers = ['Yes', 'No', 'Maybe']\n\nwhile True:\n    if accelerometer.was_gesture('shake'):\n        answer = random.choice(answers)\n        display.scroll(answer)",
                "test_cases": [
                    {"description": "Creates answers list", "pattern": "answers = ", "points": 25},
                    {"description": "Uses random.choice()", "pattern": "random.choice", "points": 25},
                    {"description": "Detects shake", "pattern": "shake", "points": 25},
                    {"description": "Scrolls answer", "pattern": "display.scroll", "points": 25}
                ]
            },
            
            # ==================== UNIT 3: SENSORS ====================
            
            # Lesson 7: Accelerometer Basics (Code - 5 problems)
            {
                "title": "Tilt Left or Right",
                "description": "Show '<' when tilted left, '>' when tilted right, using accelerometer X value.",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 7: Accelerometer",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Get X value\n    # Tilt left (x < -200) = '<'\n    # Tilt right (x > 200) = '>'\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    x = accelerometer.get_x()\n    if x < -200:\n        display.show('<')\n    elif x > 200:\n        display.show('>')\n    else:\n        display.show('-')",
                "test_cases": [
                    {"description": "Gets X value", "pattern": "accelerometer.get_x()", "points": 30},
                    {"description": "Checks x < -200", "pattern": "x < -200|x<-200", "points": 20},
                    {"description": "Checks x > 200", "pattern": "x > 200|x>200", "points": 20},
                    {"description": "Shows direction", "pattern": "display.show", "points": 30}
                ]
            },
            {
                "title": "Spirit Level",
                "description": "Create a spirit level! Show arrows for tilt direction: up, down, left, right.",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 7: Accelerometer",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Use gestures to detect tilt direction\n    # Show arrow pointing that way\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    if accelerometer.is_gesture('left'):\n        display.show(Image.ARROW_W)\n    elif accelerometer.is_gesture('right'):\n        display.show(Image.ARROW_E)\n    elif accelerometer.is_gesture('up'):\n        display.show(Image.ARROW_N)\n    elif accelerometer.is_gesture('down'):\n        display.show(Image.ARROW_S)",
                "test_cases": [
                    {"description": "Detects tilt gestures", "pattern": "is_gesture", "points": 40},
                    {"description": "Shows ARROW images", "pattern": "Image.ARROW", "points": 40},
                    {"description": "Uses if/elif", "pattern": "elif", "points": 20}
                ]
            },
            {
                "title": "Face Up or Down",
                "description": "Detect if the Micro:bit is face up or face down using the Z axis.",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 7: Accelerometer",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # z < -800 = face up, z > 800 = face down\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    z = accelerometer.get_z()\n    if z < -800:\n        display.show(Image.HAPPY)\n    elif z > 800:\n        display.show(Image.SAD)\n    else:\n        display.show('-')",
                "test_cases": [
                    {"description": "Gets Z value", "pattern": "accelerometer.get_z()", "points": 40},
                    {"description": "Checks z values", "pattern": "z <|z >", "points": 30},
                    {"description": "Shows different images", "pattern": "display.show", "points": 30}
                ]
            },
            {
                "title": "Shake Detector",
                "description": "Show a surprised face when the Micro:bit is shaken!",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 7: Accelerometer",
                "difficulty": "Easy",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Detect shake and show surprised face\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    if accelerometer.was_gesture('shake'):\n        display.show(Image.SURPRISED)\n        sleep(500)\n        display.clear()",
                "test_cases": [
                    {"description": "Detects shake", "pattern": "shake", "points": 50},
                    {"description": "Shows SURPRISED", "pattern": "Image.SURPRISED", "points": 50}
                ]
            },
            {
                "title": "Ball Game",
                "description": "Create a ball that moves based on tilt! Use a pixel that moves with X and Y tilt.",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 7: Accelerometer",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "from microbit import *\n\nx = 2\ny = 2\n\nwhile True:\n    # Move ball based on tilt\n    # Keep within 0-4 bounds\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nx = 2\ny = 2\n\nwhile True:\n    display.clear()\n    tilt_x = accelerometer.get_x()\n    tilt_y = accelerometer.get_y()\n    \n    if tilt_x > 200 and x < 4:\n        x += 1\n    elif tilt_x < -200 and x > 0:\n        x -= 1\n    \n    if tilt_y > 200 and y < 4:\n        y += 1\n    elif tilt_y < -200 and y > 0:\n        y -= 1\n    \n    display.set_pixel(x, y, 9)\n    sleep(100)",
                "test_cases": [
                    {"description": "Gets X and Y tilt", "pattern": "accelerometer.get", "points": 30},
                    {"description": "Uses set_pixel()", "pattern": "display.set_pixel", "points": 30},
                    {"description": "Has boundary checks", "pattern": "x <|y <|x >|y >", "points": 40}
                ]
            },
            
            # Lesson 8: Step Counter Project (Code - 5 problems)
            {
                "title": "Basic Step Counter",
                "description": "Count steps using shake detection. Display the count when button A is pressed.",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 8: Step Counter",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\nsteps = 0\n\nwhile True:\n    # Count steps when shaken\n    # Show count when A is pressed\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nsteps = 0\n\nwhile True:\n    if accelerometer.was_gesture('shake'):\n        steps += 1\n    if button_a.was_pressed():\n        display.scroll(steps)",
                "test_cases": [
                    {"description": "Creates steps variable", "pattern": "steps", "points": 25},
                    {"description": "Detects shake", "pattern": "shake", "points": 25},
                    {"description": "Increments steps", "pattern": "steps +|steps +=", "points": 25},
                    {"description": "Displays on button press", "pattern": "button_a", "points": 25}
                ]
            },
            {
                "title": "Step Counter with Reset",
                "description": "Count steps, show count with A, reset to 0 with B.",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 8: Step Counter",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\nsteps = 0\n\nwhile True:\n    # Shake = count step\n    # A = show count\n    # B = reset to 0\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nsteps = 0\n\nwhile True:\n    if accelerometer.was_gesture('shake'):\n        steps += 1\n    if button_a.was_pressed():\n        display.scroll(steps)\n    if button_b.was_pressed():\n        steps = 0\n        display.show(Image.YES)",
                "test_cases": [
                    {"description": "Counts steps", "pattern": "steps +|steps +=", "points": 25},
                    {"description": "Shows count on A", "pattern": "button_a", "points": 25},
                    {"description": "Resets on B", "pattern": "steps = 0", "points": 25},
                    {"description": "Detects shake", "pattern": "shake", "points": 25}
                ]
            },
            {
                "title": "Step Goal Tracker",
                "description": "Set a goal of 10 steps. Show a check mark when goal is reached!",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 8: Step Counter",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\nsteps = 0\ngoal = 10\n\nwhile True:\n    # Count steps\n    # Show check when goal reached\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nsteps = 0\ngoal = 10\n\nwhile True:\n    if accelerometer.was_gesture('shake'):\n        steps += 1\n        if steps >= goal:\n            display.show(Image.YES)\n        else:\n            display.show(steps)",
                "test_cases": [
                    {"description": "Sets goal", "pattern": "goal", "points": 20},
                    {"description": "Counts steps", "pattern": "steps +=|steps +", "points": 20},
                    {"description": "Compares to goal", "pattern": "steps >=|steps >", "points": 30},
                    {"description": "Shows YES at goal", "pattern": "Image.YES", "points": 30}
                ]
            },
            {
                "title": "Distance Calculator",
                "description": "Estimate distance walked! Each step = 0.7 meters. Show total meters.",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 8: Step Counter",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\nsteps = 0\nstep_length = 0.7  # meters per step\n\nwhile True:\n    # Count steps, calculate distance\n    # A = show distance\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nsteps = 0\nstep_length = 0.7\n\nwhile True:\n    if accelerometer.was_gesture('shake'):\n        steps += 1\n    if button_a.was_pressed():\n        distance = steps * step_length\n        display.scroll(str(int(distance)) + 'm')",
                "test_cases": [
                    {"description": "Has step_length", "pattern": "step_length", "points": 25},
                    {"description": "Calculates distance", "pattern": "steps *|distance", "points": 25},
                    {"description": "Counts steps", "pattern": "steps +=|steps +", "points": 25},
                    {"description": "Shows distance", "pattern": "display.scroll", "points": 25}
                ]
            },
            {
                "title": "Fitness Tracker",
                "description": "Track steps and estimate calories burned (1 cal per 20 steps). Show on button press.",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 8: Step Counter",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "from microbit import *\n\nsteps = 0\n\nwhile True:\n    # Count steps\n    # A = show steps\n    # B = show calories (steps / 20)\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nsteps = 0\n\nwhile True:\n    if accelerometer.was_gesture('shake'):\n        steps += 1\n    if button_a.was_pressed():\n        display.scroll('S:' + str(steps))\n    if button_b.was_pressed():\n        calories = steps // 20\n        display.scroll('C:' + str(calories))",
                "test_cases": [
                    {"description": "Counts steps", "pattern": "steps +=|steps +", "points": 25},
                    {"description": "Calculates calories", "pattern": "/ 20|// 20", "points": 25},
                    {"description": "Shows steps on A", "pattern": "button_a", "points": 25},
                    {"description": "Shows calories on B", "pattern": "button_b", "points": 25}
                ]
            },
            
            # Lesson 9: Digital Compass (Code - 5 problems)
            {
                "title": "Compass Heading",
                "description": "Display the compass heading (0-359 degrees). Remember to calibrate first!",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 9: Compass",
                "difficulty": "Easy",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\ncompass.calibrate()\n\nwhile True:\n    # Show compass heading\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\ncompass.calibrate()\n\nwhile True:\n    heading = compass.heading()\n    display.scroll(heading)\n    sleep(500)",
                "test_cases": [
                    {"description": "Calibrates compass", "pattern": "compass.calibrate()", "points": 30},
                    {"description": "Gets heading", "pattern": "compass.heading()", "points": 40},
                    {"description": "Displays heading", "pattern": "display.scroll|display.show", "points": 30}
                ]
            },
            {
                "title": "North Finder",
                "description": "Show 'N' when pointing North (heading 0 ± 45 degrees).",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 9: Compass",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\ncompass.calibrate()\n\nwhile True:\n    # Show 'N' when pointing North\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\ncompass.calibrate()\n\nwhile True:\n    heading = compass.heading()\n    if heading < 45 or heading > 315:\n        display.show('N')\n    else:\n        display.clear()",
                "test_cases": [
                    {"description": "Calibrates compass", "pattern": "compass.calibrate()", "points": 25},
                    {"description": "Gets heading", "pattern": "compass.heading()", "points": 25},
                    {"description": "Checks heading range", "pattern": "< 45|> 315", "points": 25},
                    {"description": "Shows N", "pattern": "'N'", "points": 25}
                ]
            },
            {
                "title": "Four Directions",
                "description": "Show N, E, S, or W based on compass direction.",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 9: Compass",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\ncompass.calibrate()\n\nwhile True:\n    # N = 315-45, E = 45-135, S = 135-225, W = 225-315\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\ncompass.calibrate()\n\nwhile True:\n    heading = compass.heading()\n    if heading < 45 or heading > 315:\n        display.show('N')\n    elif heading < 135:\n        display.show('E')\n    elif heading < 225:\n        display.show('S')\n    else:\n        display.show('W')",
                "test_cases": [
                    {"description": "Gets heading", "pattern": "compass.heading()", "points": 25},
                    {"description": "Shows N", "pattern": "'N'", "points": 25},
                    {"description": "Shows E or W", "pattern": "'E'|'W'", "points": 25},
                    {"description": "Shows S", "pattern": "'S'", "points": 25}
                ]
            },
            {
                "title": "Compass Arrow",
                "description": "Show an arrow image pointing to North as you rotate the Micro:bit.",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 9: Compass",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\ncompass.calibrate()\n\nwhile True:\n    # Show arrow pointing to North\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\ncompass.calibrate()\n\nwhile True:\n    heading = compass.heading()\n    if heading < 45 or heading > 315:\n        display.show(Image.ARROW_N)\n    elif heading < 135:\n        display.show(Image.ARROW_W)\n    elif heading < 225:\n        display.show(Image.ARROW_S)\n    else:\n        display.show(Image.ARROW_E)",
                "test_cases": [
                    {"description": "Gets heading", "pattern": "compass.heading()", "points": 25},
                    {"description": "Shows ARROW_N", "pattern": "Image.ARROW_N", "points": 25},
                    {"description": "Shows other arrows", "pattern": "Image.ARROW", "points": 50}
                ]
            },
            {
                "title": "Treasure Hunt Compass",
                "description": "Hot/cold game! Show HAPPY when within 30° of a target direction (90°), SAD otherwise.",
                "unit": "Unit 3: Sensors",
                "chapter": "Chapter 3: Sensors",
                "lesson": "Lesson 9: Compass",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "from microbit import *\n\ncompass.calibrate()\ntarget = 90  # East\n\nwhile True:\n    # Happy if within 30 degrees of target\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\ncompass.calibrate()\ntarget = 90\n\nwhile True:\n    heading = compass.heading()\n    diff = abs(heading - target)\n    if diff > 180:\n        diff = 360 - diff\n    if diff < 30:\n        display.show(Image.HAPPY)\n    else:\n        display.show(Image.SAD)",
                "test_cases": [
                    {"description": "Sets target", "pattern": "target", "points": 20},
                    {"description": "Gets heading", "pattern": "compass.heading()", "points": 20},
                    {"description": "Calculates difference", "pattern": "abs(|diff", "points": 30},
                    {"description": "Shows HAPPY/SAD", "pattern": "Image.HAPPY|Image.SAD", "points": 30}
                ]
            },
            
            # ==================== UNIT 4: EXTERNAL COMPONENTS ====================
            
            # Lesson 10: External LED Circuit (Code - 5 problems)
            {
                "title": "Turn On External LED",
                "description": "Turn on an LED connected to pin0 using write_digital(1).",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 10: External LED",
                "difficulty": "Easy",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\n# Turn on LED on pin0\n# Your code here:\n",
                "solution_code": "from microbit import *\n\npin0.write_digital(1)",
                "test_cases": [
                    {"description": "Uses pin0", "pattern": "pin0", "points": 50},
                    {"description": "Writes digital 1", "pattern": "write_digital(1)", "points": 50}
                ],
                "wiring_instructions": "1. Connect LED long leg to Pin 0\n2. Connect short leg through 220Ω resistor to GND"
            },
            {
                "title": "Blink External LED",
                "description": "Make the external LED blink on and off every 500ms.",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 10: External LED",
                "difficulty": "Easy",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Blink LED on pin0\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    pin0.write_digital(1)\n    sleep(500)\n    pin0.write_digital(0)\n    sleep(500)",
                "test_cases": [
                    {"description": "Turns LED on", "pattern": "write_digital(1)", "points": 25},
                    {"description": "Turns LED off", "pattern": "write_digital(0)", "points": 25},
                    {"description": "Uses sleep()", "pattern": "sleep(", "points": 25},
                    {"description": "Uses while True", "pattern": "while True:", "points": 25}
                ],
                "wiring_instructions": "Connect LED and 220Ω resistor between Pin 0 and GND"
            },
            {
                "title": "Button Controlled LED",
                "description": "Turn on external LED when button A is pressed, off when released.",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 10: External LED",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # A pressed = LED on, else LED off\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    if button_a.is_pressed():\n        pin0.write_digital(1)\n    else:\n        pin0.write_digital(0)",
                "test_cases": [
                    {"description": "Checks button_a", "pattern": "button_a", "points": 25},
                    {"description": "Turns LED on", "pattern": "write_digital(1)", "points": 25},
                    {"description": "Turns LED off", "pattern": "write_digital(0)", "points": 25},
                    {"description": "Uses if/else", "pattern": "else:", "points": 25}
                ],
                "wiring_instructions": "Connect LED circuit to Pin 0"
            },
            {
                "title": "LED Brightness Control",
                "description": "Use write_analog() to set LED brightness to 50% (value 512).",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 10: External LED",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\n# Set LED to 50% brightness\n# write_analog uses 0-1023\n# Your code here:\n",
                "solution_code": "from microbit import *\n\npin0.write_analog(512)",
                "test_cases": [
                    {"description": "Uses pin0", "pattern": "pin0", "points": 50},
                    {"description": "Uses write_analog()", "pattern": "write_analog(", "points": 50}
                ],
                "wiring_instructions": "Connect LED circuit to Pin 0"
            },
            {
                "title": "Fade LED",
                "description": "Create a fading effect by gradually increasing and decreasing brightness.",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 10: External LED",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Fade up from 0 to 1023\n    # Then fade down\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    # Fade up\n    for brightness in range(0, 1024, 64):\n        pin0.write_analog(brightness)\n        sleep(50)\n    # Fade down\n    for brightness in range(1023, -1, -64):\n        pin0.write_analog(brightness)\n        sleep(50)",
                "test_cases": [
                    {"description": "Uses write_analog()", "pattern": "write_analog(", "points": 30},
                    {"description": "Uses for loop", "pattern": "for ", "points": 30},
                    {"description": "Uses range()", "pattern": "range(", "points": 20},
                    {"description": "Uses sleep()", "pattern": "sleep(", "points": 20}
                ],
                "wiring_instructions": "Connect LED circuit to Pin 0"
            },
            
            # Lesson 11: Traffic Light Project (Code - 5 problems)
            {
                "title": "Two LED Control",
                "description": "Control two LEDs on pin0 (red) and pin1 (green). Alternate between them.",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 11: Traffic Light",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Alternate red (pin0) and green (pin1)\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    pin0.write_digital(1)\n    pin1.write_digital(0)\n    sleep(1000)\n    pin0.write_digital(0)\n    pin1.write_digital(1)\n    sleep(1000)",
                "test_cases": [
                    {"description": "Controls pin0", "pattern": "pin0.write_digital", "points": 25},
                    {"description": "Controls pin1", "pattern": "pin1.write_digital", "points": 25},
                    {"description": "Uses sleep()", "pattern": "sleep(", "points": 25},
                    {"description": "Uses while True", "pattern": "while True:", "points": 25}
                ],
                "wiring_instructions": "Red LED on Pin 0, Green LED on Pin 1, both through 220Ω to GND"
            },
            {
                "title": "Traffic Light Sequence",
                "description": "Create a traffic light! Red (3s) → Yellow (1s) → Green (3s) → Yellow (1s) → repeat.",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 11: Traffic Light",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\n# Pin 0 = Red, Pin 1 = Yellow, Pin 2 = Green\n\nwhile True:\n    # Traffic light sequence\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    # Red\n    pin0.write_digital(1)\n    pin1.write_digital(0)\n    pin2.write_digital(0)\n    sleep(3000)\n    # Yellow\n    pin0.write_digital(0)\n    pin1.write_digital(1)\n    pin2.write_digital(0)\n    sleep(1000)\n    # Green\n    pin0.write_digital(0)\n    pin1.write_digital(0)\n    pin2.write_digital(1)\n    sleep(3000)\n    # Yellow\n    pin0.write_digital(0)\n    pin1.write_digital(1)\n    pin2.write_digital(0)\n    sleep(1000)",
                "test_cases": [
                    {"description": "Controls pin0 (red)", "pattern": "pin0.write_digital", "points": 25},
                    {"description": "Controls pin1 (yellow)", "pattern": "pin1.write_digital", "points": 25},
                    {"description": "Controls pin2 (green)", "pattern": "pin2.write_digital", "points": 25},
                    {"description": "Has timing", "pattern": "sleep(", "points": 25}
                ],
                "wiring_instructions": "Red LED → Pin 0, Yellow LED → Pin 1, Green LED → Pin 2"
            },
            {
                "title": "Pedestrian Crossing",
                "description": "Add a button! Press button A to trigger pedestrian crossing (changes to red).",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 11: Traffic Light",
                "difficulty": "Hard",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\n# Traffic light that responds to button A\n# Your code here:\n",
                "solution_code": "from microbit import *\n\nwhile True:\n    # Normal: Green light\n    pin2.write_digital(1)\n    pin0.write_digital(0)\n    \n    if button_a.was_pressed():\n        # Yellow\n        pin2.write_digital(0)\n        pin1.write_digital(1)\n        sleep(2000)\n        # Red for pedestrians\n        pin1.write_digital(0)\n        pin0.write_digital(1)\n        sleep(5000)\n        # Back to green\n        pin0.write_digital(0)",
                "test_cases": [
                    {"description": "Checks button_a", "pattern": "button_a", "points": 25},
                    {"description": "Controls multiple pins", "pattern": "pin0|pin1|pin2", "points": 25},
                    {"description": "Has timing", "pattern": "sleep(", "points": 25},
                    {"description": "Uses if statement", "pattern": "if ", "points": 25}
                ],
                "wiring_instructions": "Red LED → Pin 0, Yellow LED → Pin 1, Green LED → Pin 2"
            },
            {
                "title": "Emergency Mode",
                "description": "Both buttons pressed = Emergency mode (all lights flash rapidly).",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 11: Traffic Light",
                "difficulty": "Hard",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Both buttons = emergency flash mode\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    if button_a.is_pressed() and button_b.is_pressed():\n        # Emergency - flash all\n        pin0.write_digital(1)\n        pin1.write_digital(1)\n        pin2.write_digital(1)\n        sleep(200)\n        pin0.write_digital(0)\n        pin1.write_digital(0)\n        pin2.write_digital(0)\n        sleep(200)\n    else:\n        # Normal operation\n        pin2.write_digital(1)\n        pin0.write_digital(0)\n        pin1.write_digital(0)",
                "test_cases": [
                    {"description": "Checks both buttons", "pattern": "and", "points": 25},
                    {"description": "Flashes all pins", "pattern": "pin0|pin1|pin2", "points": 25},
                    {"description": "Has fast timing", "pattern": "sleep(", "points": 25},
                    {"description": "Has else for normal", "pattern": "else:", "points": 25}
                ],
                "wiring_instructions": "Red → Pin 0, Yellow → Pin 1, Green → Pin 2"
            },
            {
                "title": "Smart Traffic Light",
                "description": "Create a traffic light that shows the current color on the Micro:bit display too!",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 11: Traffic Light",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Show color on display AND external LEDs\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nred_img = Image('99999:99999:00000:00000:00000')\nyellow_img = Image('00000:00000:99999:00000:00000')\ngreen_img = Image('00000:00000:00000:99999:99999')\n\nwhile True:\n    pin0.write_digital(1)\n    display.show(red_img)\n    sleep(3000)\n    pin0.write_digital(0)\n    pin1.write_digital(1)\n    display.show(yellow_img)\n    sleep(1000)\n    pin1.write_digital(0)\n    pin2.write_digital(1)\n    display.show(green_img)\n    sleep(3000)\n    pin2.write_digital(0)",
                "test_cases": [
                    {"description": "Controls external LEDs", "pattern": "write_digital", "points": 30},
                    {"description": "Shows on display", "pattern": "display.show", "points": 30},
                    {"description": "Has timing", "pattern": "sleep(", "points": 20},
                    {"description": "Creates images", "pattern": "Image(", "points": 20}
                ],
                "wiring_instructions": "Red → Pin 0, Yellow → Pin 1, Green → Pin 2"
            },
            
            # Lesson 12: Night Light (Code - 5 problems)
            {
                "title": "Read Light Sensor",
                "description": "Read the light level from an LDR on pin1 and display the value.",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 12: Night Light",
                "difficulty": "Easy",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Read light level from pin1\n    # Display it\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    light = pin1.read_analog()\n    display.scroll(light)\n    sleep(1000)",
                "test_cases": [
                    {"description": "Reads analog value", "pattern": "read_analog()", "points": 50},
                    {"description": "Displays value", "pattern": "display.scroll|display.show", "points": 50}
                ],
                "wiring_instructions": "LDR between 3V and Pin 1, 10kΩ resistor between Pin 1 and GND"
            },
            {
                "title": "Dark Detector",
                "description": "Show a moon image when it's dark (light < 300), sun when bright.",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 12: Night Light",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "from microbit import *\n\nmoon = Image('00900:09990:09990:09990:00900')\nsun = Image('90909:09990:99999:09990:90909')\n\nwhile True:\n    # Dark = moon, Bright = sun\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nmoon = Image('00900:09990:09990:09990:00900')\nsun = Image('90909:09990:99999:09990:90909')\n\nwhile True:\n    light = pin1.read_analog()\n    if light < 300:\n        display.show(moon)\n    else:\n        display.show(sun)\n    sleep(100)",
                "test_cases": [
                    {"description": "Reads light level", "pattern": "read_analog()", "points": 30},
                    {"description": "Compares to threshold", "pattern": "light <|light >", "points": 30},
                    {"description": "Shows different images", "pattern": "display.show", "points": 40}
                ],
                "wiring_instructions": "LDR voltage divider on Pin 1"
            },
            {
                "title": "Automatic Night Light",
                "description": "Turn on external LED (pin0) when dark, off when bright.",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 12: Night Light",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Dark = LED on, Bright = LED off\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    light = pin1.read_analog()\n    if light < 300:\n        pin0.write_digital(1)\n    else:\n        pin0.write_digital(0)\n    sleep(100)",
                "test_cases": [
                    {"description": "Reads light level", "pattern": "read_analog()", "points": 25},
                    {"description": "Compares to threshold", "pattern": "light <|light >", "points": 25},
                    {"description": "Turns LED on", "pattern": "write_digital(1)", "points": 25},
                    {"description": "Turns LED off", "pattern": "write_digital(0)", "points": 25}
                ],
                "wiring_instructions": "LDR on Pin 1, LED on Pin 0"
            },
            {
                "title": "Brightness Indicator",
                "description": "Show 1-5 LEDs on the display based on light level (bar graph style).",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 12: Night Light",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "from microbit import *\n\nwhile True:\n    # Show bar graph of brightness\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nwhile True:\n    light = pin1.read_analog()\n    # Map 0-1023 to 0-5 bars\n    bars = light // 200\n    if bars > 5:\n        bars = 5\n    \n    display.clear()\n    for i in range(bars):\n        for y in range(5):\n            display.set_pixel(i, y, 9)\n    sleep(100)",
                "test_cases": [
                    {"description": "Reads light level", "pattern": "read_analog()", "points": 25},
                    {"description": "Maps to bars", "pattern": "// |/ ", "points": 25},
                    {"description": "Uses set_pixel()", "pattern": "set_pixel", "points": 25},
                    {"description": "Uses loop", "pattern": "for ", "points": 25}
                ],
                "wiring_instructions": "LDR voltage divider on Pin 1"
            },
            {
                "title": "Smart Night Light",
                "description": "Night light with adjustable threshold! A increases threshold, B decreases it.",
                "unit": "Unit 4: External Components",
                "chapter": "Chapter 4: Circuits",
                "lesson": "Lesson 12: Night Light",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "from microbit import *\n\nthreshold = 300\n\nwhile True:\n    # A = increase threshold, B = decrease\n    # LED on when dark\n    # Your code here:\n    pass",
                "solution_code": "from microbit import *\n\nthreshold = 300\n\nwhile True:\n    if button_a.was_pressed():\n        threshold += 50\n        display.scroll(threshold)\n    if button_b.was_pressed():\n        threshold -= 50\n        display.scroll(threshold)\n    \n    light = pin1.read_analog()\n    if light < threshold:\n        pin0.write_digital(1)\n        display.show(Image.HAPPY)\n    else:\n        pin0.write_digital(0)\n        display.clear()\n    sleep(100)",
                "test_cases": [
                    {"description": "Has adjustable threshold", "pattern": "threshold", "points": 25},
                    {"description": "Button adjusts threshold", "pattern": "button_a|button_b", "points": 25},
                    {"description": "Reads light level", "pattern": "read_analog()", "points": 25},
                    {"description": "Controls LED", "pattern": "write_digital", "points": 25}
                ],
                "wiring_instructions": "LDR on Pin 1, LED on Pin 0"
            }
        ]
        
        # Insert all problems
        for problem in microbit_problems:
            problem_doc = {
                "id": str(uuid.uuid4()),
                "title": problem["title"],
                "description": problem["description"],
                "starter_code": problem.get("starter_code", "from microbit import *\n\n# Your code here:\n"),
                "solution_code": problem.get("solution_code", ""),
                "expected_output": "",
                "category": "Micro:bit",
                "difficulty": problem["difficulty"],
                "unit": problem["unit"],
                "chapter": problem["chapter"],
                "lesson": problem["lesson"],
                "problem_type": problem["problem_type"],
                "assignment_type": "microbit",
                "test_cases": problem.get("test_cases", []),
                "quiz_questions": problem.get("quiz_questions", []),
                "wiring_instructions": problem.get("wiring_instructions", "No additional wiring needed - using built-in features"),
                "resources_link": "",
                "csta_standard": "",
                "creator_id": "system",
                "creator_name": "System",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.problems.insert_one(problem_doc)
        
        final_count = await db.problems.count_documents({"assignment_type": "microbit"})
        logger.info(f"✅ Micro:bit problems seeded: {final_count}")
    except Exception as e:
        logger.error(f"❌ Error seeding Micro:bit problems: {str(e)}")


@app.on_event("startup")
async def seed_turtle_problems():
    """Seed Turtle curriculum problems - 5 per topic + quiz = ~30 total"""
    try:
        # Check if FULL curriculum structure exists (all 6 chapters)
        chapter6_exists = await db.problems.find_one({"assignment_type": "turtle", "chapter": "Chapter 6: Projects"})
        if chapter6_exists:
            existing_count = await db.problems.count_documents({"assignment_type": "turtle", "chapter": {"$regex": "^Chapter"}})
            logger.info(f"✅ Turtle curriculum already seeded: {existing_count} problems")
            return
        
        logger.info("🔄 Seeding Turtle curriculum problems...")
        
        # Clear ALL existing turtle problems to replace with new curriculum
        await db.problems.delete_many({"assignment_type": "turtle"})
        
        turtle_problems = [
            # ==================== TOPIC 1: BASICS - FIRST STEPS ====================
            
            # Quiz for Basics
            {
                "title": "Turtle Basics Quiz",
                "description": "Test your knowledge of basic turtle graphics commands! Learn about movement, turning, and creating simple shapes.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 1: First Steps",
                "lesson": "Basics Quiz",
                "difficulty": "Easy",
                "problem_type": "Quiz",
                "quiz_questions": [
                    {"question": "What command moves the turtle forward?", "options": ["t.forward(100)", "t.move(100)", "t.go(100)", "t.walk(100)"], "correct": 0},
                    {"question": "What does t.right(90) do?", "options": ["Move right 90 pixels", "Turn right 90 degrees", "Draw 90 lines", "Create a 90-sided shape"], "correct": 1},
                    {"question": "How many degrees are in a right angle (corner of a square)?", "options": ["45", "90", "180", "360"], "correct": 1},
                    {"question": "What import statement is needed for turtle graphics?", "options": ["import graphics", "import drawing", "import turtle", "import canvas"], "correct": 2},
                    {"question": "How many 90° turns make a complete circle?", "options": ["2", "3", "4", "6"], "correct": 2}
                ]
            },
            
            # Problem 1: Name Your Turtle
            {
                "title": "Name Your Turtle",
                "description": "Create a turtle with a custom name (like 'bob' or 'sally') and make it move forward 100 pixels. Personalize your turtle!",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 1: First Steps",
                "lesson": "Lesson 1: Name Your Turtle",
                "difficulty": "Easy",
                "problem_type": "Class Practice",
                "starter_code": "import turtle\n\n# Create a turtle with a fun name!\n# Example: bob = turtle.Turtle()\n# Your code here:\n",
                "solution_code": "import turtle\n\nbob = turtle.Turtle()\nbob.forward(100)",
                "test_cases": [
                    {"description": "Imports turtle module", "pattern": "import turtle", "points": 25},
                    {"description": "Creates a Turtle object", "pattern": "turtle.Turtle()", "points": 25},
                    {"description": "Uses forward() command", "pattern": "forward(", "points": 50}
                ]
            },
            
            # Problem 2: Move Forward
            {
                "title": "Move Forward",
                "description": "Make the turtle move forward 150 pixels. The turtle starts in the center facing right.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 1: First Steps",
                "lesson": "Lesson 2: Moving Forward",
                "difficulty": "Easy",
                "problem_type": "Class Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Move forward 150 pixels\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.forward(150)",
                "test_cases": [
                    {"description": "Uses forward() command", "pattern": "forward(", "points": 50},
                    {"description": "Moves 150 pixels", "pattern": "150", "points": 50}
                ]
            },
            
            # Problem 3: Move Backward
            {
                "title": "Move Backward",
                "description": "Move the turtle forward 100 pixels, then backward 50 pixels. The turtle should end up 50 pixels from the start.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 1: First Steps",
                "lesson": "Lesson 3: Moving Backward",
                "difficulty": "Easy",
                "problem_type": "Class Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Move forward 100, then backward 50\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.forward(100)\nt.backward(50)",
                "test_cases": [
                    {"description": "Uses forward()", "pattern": "forward(", "points": 40},
                    {"description": "Uses backward()", "pattern": "backward(", "points": 60}
                ]
            },
            
            # Problem 4: Turn Right and Left
            {
                "title": "Turn Right and Left",
                "description": "Draw an L-shape: move forward 100, turn right 90°, move forward 50.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 1: First Steps",
                "lesson": "Lesson 4: Turning",
                "difficulty": "Easy",
                "problem_type": "Independent Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Draw an L-shape\n# Forward 100, turn right 90, forward 50\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.forward(100)\nt.right(90)\nt.forward(50)",
                "test_cases": [
                    {"description": "Uses forward()", "pattern": "forward(", "points": 30},
                    {"description": "Uses right() to turn", "pattern": "right(", "points": 40},
                    {"description": "Turns 90 degrees", "pattern": "90", "points": 30}
                ]
            },
            
            # Problem 5: Draw a Square (Manual)
            {
                "title": "Draw a Square (Step by Step)",
                "description": "Draw a square with sides of 80 pixels. Use forward() and right(90) four times.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 1: First Steps",
                "lesson": "Lesson 5: Drawing a Square",
                "difficulty": "Easy",
                "problem_type": "Challenge",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Draw a square with 80-pixel sides\n# Hint: forward, right 90, forward, right 90...\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.forward(80)\nt.right(90)\nt.forward(80)\nt.right(90)\nt.forward(80)\nt.right(90)\nt.forward(80)",
                "test_cases": [
                    {"description": "Uses forward() multiple times", "pattern": "forward(", "points": 40},
                    {"description": "Uses right(90) to turn corners", "pattern": "right(90)", "points": 40},
                    {"description": "Uses 80 pixels for sides", "pattern": "80", "points": 20}
                ]
            },
            
            # ==================== TOPIC 2: LOOPS ====================
            
            # Quiz for Loops
            {
                "title": "Loops Quiz",
                "description": "Test your understanding of for loops in turtle graphics! Learn how to repeat commands efficiently.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 2: Loops",
                "lesson": "Loops Quiz",
                "difficulty": "Medium",
                "problem_type": "Quiz",
                "quiz_questions": [
                    {"question": "What does 'for i in range(4):' do?", "options": ["Counts to 4", "Repeats code 4 times", "Creates 4 turtles", "Draws 4 lines"], "correct": 1},
                    {"question": "To draw a triangle, how many times should the loop repeat?", "options": ["2", "3", "4", "5"], "correct": 1},
                    {"question": "What is the turning angle for a triangle? (360 ÷ 3)", "options": ["60°", "90°", "120°", "180°"], "correct": 2},
                    {"question": "What is the turning angle for a hexagon (6 sides)?", "options": ["30°", "45°", "60°", "90°"], "correct": 2},
                    {"question": "In 'for i in range(5):', what values does i take?", "options": ["1,2,3,4,5", "0,1,2,3,4", "0,1,2,3,4,5", "1,2,3,4"], "correct": 1}
                ]
            },
            
            # Problem 1: Square with Loop
            {
                "title": "Square with Loop",
                "description": "Use a for loop to draw a square! Much easier than writing forward and right 4 times.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 2: Loops",
                "lesson": "Lesson 1: For Loop Basics",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Draw a square using a for loop\n# for i in range(4):\n#     forward, right 90\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\n\nfor i in range(4):\n    t.forward(100)\n    t.right(90)",
                "test_cases": [
                    {"description": "Uses for loop", "pattern": "for ", "points": 30},
                    {"description": "Uses range(4)", "pattern": "range(4)", "points": 30},
                    {"description": "Uses forward()", "pattern": "forward(", "points": 20},
                    {"description": "Turns 90 degrees", "pattern": "right(90)", "points": 20}
                ]
            },
            
            # Problem 2: Triangle
            {
                "title": "Draw a Triangle",
                "description": "Draw a triangle using a for loop. Remember: angle = 360 ÷ 3 = 120°",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 2: Loops",
                "lesson": "Lesson 2: Triangle with Loop",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Draw a triangle\n# 3 sides, turn 120 degrees each time\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\n\nfor i in range(3):\n    t.forward(100)\n    t.left(120)",
                "test_cases": [
                    {"description": "Uses for loop", "pattern": "for ", "points": 25},
                    {"description": "Repeats 3 times", "pattern": "range(3)", "points": 25},
                    {"description": "Turns 120 degrees", "pattern": "120", "points": 25},
                    {"description": "Uses forward()", "pattern": "forward(", "points": 25}
                ]
            },
            
            # Problem 3: Pentagon
            {
                "title": "Draw a Pentagon",
                "description": "Draw a pentagon (5 sides) using a loop. Calculate the angle: 360 ÷ 5 = 72°",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 2: Loops",
                "lesson": "Lesson 3: Any Polygon",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Draw a pentagon (5 sides)\n# Angle = 360 / 5 = 72 degrees\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\n\nfor i in range(5):\n    t.forward(80)\n    t.right(72)",
                "test_cases": [
                    {"description": "Uses for loop", "pattern": "for ", "points": 25},
                    {"description": "Repeats 5 times", "pattern": "range(5)", "points": 25},
                    {"description": "Turns 72 degrees", "pattern": "72", "points": 25},
                    {"description": "Uses forward()", "pattern": "forward(", "points": 25}
                ]
            },
            
            # Problem 4: Hexagon with Variable
            {
                "title": "Polygon with Variables",
                "description": "Use variables for sides and angle to draw a hexagon. Set sides=6 and calculate angle=360/sides.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 2: Loops",
                "lesson": "Lesson 3: Any Polygon",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\nsides = 6\nangle = 360 / sides\n\n# Use the variables to draw the hexagon\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\n\nsides = 6\nangle = 360 / sides\n\nfor i in range(sides):\n    t.forward(50)\n    t.right(angle)",
                "test_cases": [
                    {"description": "Uses sides variable", "pattern": "sides", "points": 25},
                    {"description": "Calculates angle", "pattern": "360", "points": 25},
                    {"description": "Uses for loop with variable", "pattern": "range(sides)", "points": 25},
                    {"description": "Uses angle variable in turn", "pattern": "angle", "points": 25}
                ]
            },
            
            # Problem 5: Spiral
            {
                "title": "Draw a Spiral",
                "description": "Create a spiral by increasing the distance each time. Use i*5 for the forward distance.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 2: Loops",
                "lesson": "Lesson 4: Spiral Pattern",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\n# Draw a spiral\n# Use i * 5 for distance, turn 90 each time\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\nfor i in range(30):\n    t.forward(i * 5)\n    t.right(90)",
                "test_cases": [
                    {"description": "Uses for loop", "pattern": "for ", "points": 25},
                    {"description": "Uses i in calculation", "pattern": "i *", "points": 35},
                    {"description": "Uses forward()", "pattern": "forward(", "points": 20},
                    {"description": "Uses right() to turn", "pattern": "right(", "points": 20}
                ]
            },
            
            # ==================== TOPIC 3: COLORS ====================
            
            # Quiz for Colors
            {
                "title": "Colors Quiz",
                "description": "Test your knowledge of turtle colors and fill commands!",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 3: Colors",
                "lesson": "Colors Quiz",
                "difficulty": "Medium",
                "problem_type": "Quiz",
                "quiz_questions": [
                    {"question": "What command changes the line color?", "options": ["t.linecolor()", "t.pencolor()", "t.drawcolor()", "t.strokecolor()"], "correct": 1},
                    {"question": "What TWO commands surround a shape to fill it?", "options": ["start_fill/stop_fill", "begin_fill/end_fill", "fill_start/fill_end", "open_fill/close_fill"], "correct": 1},
                    {"question": "What does pensize(5) do?", "options": ["Draw 5 lines", "Make lines 5 pixels thick", "Use 5 colors", "Move 5 pixels"], "correct": 1},
                    {"question": "How do you set the fill color to yellow?", "options": ["t.fillcolor('yellow')", "t.fill('yellow')", "t.color_fill('yellow')", "t.inside('yellow')"], "correct": 0},
                    {"question": "What does i % 6 give you when cycling through 6 colors?", "options": ["Always 6", "Numbers 0-5 repeating", "Numbers 1-6", "Random numbers"], "correct": 1}
                ]
            },
            
            # Problem 1: Colored Lines
            {
                "title": "Colored Lines",
                "description": "Draw a red line, then a blue line, then a green line. Use pencolor() to change colors.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 3: Colors",
                "lesson": "Lesson 1: Pen Color",
                "difficulty": "Easy",
                "problem_type": "Class Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Draw lines in different colors\n# Use t.pencolor('red'), t.pencolor('blue'), etc.\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\n\nt.pencolor('red')\nt.forward(100)\nt.right(90)\n\nt.pencolor('blue')\nt.forward(100)\nt.right(90)\n\nt.pencolor('green')\nt.forward(100)",
                "test_cases": [
                    {"description": "Uses pencolor()", "pattern": "pencolor(", "points": 30},
                    {"description": "Uses red color", "pattern": "red", "points": 20},
                    {"description": "Uses blue color", "pattern": "blue", "points": 20},
                    {"description": "Uses green color", "pattern": "green", "points": 30}
                ]
            },
            
            # Problem 2: Filled Square
            {
                "title": "Filled Square",
                "description": "Draw a yellow filled square. Use begin_fill() before and end_fill() after drawing.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 3: Colors",
                "lesson": "Lesson 2: Fill Shapes",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\nt.fillcolor('yellow')\n\n# Start fill, draw square, end fill\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\n\nt.fillcolor('yellow')\nt.begin_fill()\n\nfor i in range(4):\n    t.forward(100)\n    t.right(90)\n\nt.end_fill()",
                "test_cases": [
                    {"description": "Sets fill color", "pattern": "fillcolor(", "points": 20},
                    {"description": "Uses begin_fill()", "pattern": "begin_fill()", "points": 30},
                    {"description": "Uses end_fill()", "pattern": "end_fill()", "points": 30},
                    {"description": "Draws a shape", "pattern": "forward(", "points": 20}
                ]
            },
            
            # Problem 3: Rainbow Triangle
            {
                "title": "Rainbow Triangle",
                "description": "Draw a triangle with each side a different color: red, green, blue.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 3: Colors",
                "lesson": "Lesson 3: Rainbow Colors",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.pensize(3)\n\ncolors = ['red', 'green', 'blue']\n\n# Draw a triangle with each side a different color\n# Hint: use colors[i] to get each color\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.pensize(3)\n\ncolors = ['red', 'green', 'blue']\n\nfor i in range(3):\n    t.pencolor(colors[i])\n    t.forward(100)\n    t.left(120)",
                "test_cases": [
                    {"description": "Uses color list", "pattern": "colors[", "points": 30},
                    {"description": "Uses pencolor()", "pattern": "pencolor(", "points": 25},
                    {"description": "Uses for loop", "pattern": "for ", "points": 25},
                    {"description": "Draws triangle (120 degrees)", "pattern": "120", "points": 20}
                ]
            },
            
            # Problem 4: Thick Lines
            {
                "title": "Growing Lines",
                "description": "Draw 5 lines, each thicker than the last. Use pensize(i*2) to increase thickness.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 3: Colors",
                "lesson": "Lesson 4: Pen Size",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Draw 5 lines with increasing thickness\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\n\nfor i in range(1, 6):\n    t.pensize(i * 2)\n    t.forward(50)\n    t.right(90)",
                "test_cases": [
                    {"description": "Uses pensize()", "pattern": "pensize(", "points": 40},
                    {"description": "Uses for loop", "pattern": "for ", "points": 30},
                    {"description": "Increases size with i", "pattern": "i *", "points": 30}
                ]
            },
            
            # Problem 5: Rainbow Spiral
            {
                "title": "Rainbow Spiral",
                "description": "Create a colorful spiral using a list of colors and the modulo operator to cycle through them.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 3: Colors",
                "lesson": "Lesson 3: Rainbow Colors",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\ncolors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']\n\n# Draw a rainbow spiral\n# Use colors[i % 6] to cycle through colors\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\ncolors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']\n\nfor i in range(36):\n    t.pencolor(colors[i % 6])\n    t.forward(i * 5)\n    t.right(60)",
                "test_cases": [
                    {"description": "Uses color list", "pattern": "colors[", "points": 25},
                    {"description": "Uses modulo operator", "pattern": "% 6", "points": 30},
                    {"description": "Creates spiral with i *", "pattern": "i *", "points": 25},
                    {"description": "Uses for loop", "pattern": "for ", "points": 20}
                ]
            },
            
            # ==================== TOPIC 4: CONDITIONALS ====================
            
            # Quiz for Conditionals
            {
                "title": "Conditionals Quiz",
                "description": "Test your understanding of if statements and conditions in turtle graphics!",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 4: Conditionals",
                "lesson": "Conditionals Quiz",
                "difficulty": "Medium",
                "problem_type": "Quiz",
                "quiz_questions": [
                    {"question": "What does 'if i % 2 == 0:' check?", "options": ["If i is odd", "If i is even", "If i equals 2", "If i is positive"], "correct": 1},
                    {"question": "What does t.xcor() return?", "options": ["The turtle's color", "The turtle's x position", "The number of steps", "The pen size"], "correct": 1},
                    {"question": "What keyword is used when the if condition is False?", "options": ["then", "otherwise", "else", "false"], "correct": 2},
                    {"question": "What does 'elif' stand for?", "options": ["else if", "element if", "end if", "early if"], "correct": 0},
                    {"question": "If t.ycor() > 0, where is the turtle?", "options": ["Left side", "Right side", "Top half", "Bottom half"], "correct": 2}
                ]
            },
            
            # Problem 1: Even/Odd Colors
            {
                "title": "Even/Odd Colors",
                "description": "Draw 10 lines. Color even-numbered lines red and odd-numbered lines blue using i % 2.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 4: Conditionals",
                "lesson": "Lesson 4: Alternating with %",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\nfor i in range(10):\n    # If i is even (i % 2 == 0), use red\n    # Otherwise use blue\n    # Your code here:\n    \n    t.forward(30)\n    t.right(36)",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\n\nfor i in range(10):\n    if i % 2 == 0:\n        t.pencolor('red')\n    else:\n        t.pencolor('blue')\n    \n    t.forward(30)\n    t.right(36)",
                "test_cases": [
                    {"description": "Uses if statement", "pattern": "if ", "points": 25},
                    {"description": "Checks even with % 2", "pattern": "% 2", "points": 30},
                    {"description": "Uses else", "pattern": "else:", "points": 25},
                    {"description": "Changes pen color", "pattern": "pencolor(", "points": 20}
                ]
            },
            
            # Problem 2: Position Check
            {
                "title": "Position-Based Color",
                "description": "Draw a circle. When the turtle is on the right side (xcor() > 0), use red. Otherwise use blue.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 4: Conditionals",
                "lesson": "Lesson 1: If Statement",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\nfor i in range(360):\n    # Check if turtle is on right side: t.xcor() > 0\n    # Your code here:\n    \n    t.forward(1)\n    t.right(1)",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\nfor i in range(360):\n    if t.xcor() > 0:\n        t.pencolor('red')\n    else:\n        t.pencolor('blue')\n    \n    t.forward(1)\n    t.right(1)",
                "test_cases": [
                    {"description": "Uses xcor()", "pattern": "xcor()", "points": 30},
                    {"description": "Uses if statement", "pattern": "if ", "points": 25},
                    {"description": "Uses else", "pattern": "else:", "points": 25},
                    {"description": "Compares with > 0", "pattern": "> 0", "points": 20}
                ]
            },
            
            # Problem 3: Four Quadrants
            {
                "title": "Four Quadrant Colors",
                "description": "Draw a circle with 4 colors based on position: top-right=red, top-left=green, bottom-left=blue, bottom-right=yellow.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 4: Conditionals",
                "lesson": "Lesson 3: Multiple Conditions",
                "difficulty": "Hard",
                "problem_type": "Independent Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\nfor i in range(360):\n    x = t.xcor()\n    y = t.ycor()\n    \n    # Use if/elif/else to check quadrants\n    # Top-right: x > 0 and y > 0 -> red\n    # Your code here:\n    \n    t.forward(1)\n    t.right(1)",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\nfor i in range(360):\n    x = t.xcor()\n    y = t.ycor()\n    \n    if x > 0 and y > 0:\n        t.pencolor('red')\n    elif x < 0 and y > 0:\n        t.pencolor('green')\n    elif x < 0 and y < 0:\n        t.pencolor('blue')\n    else:\n        t.pencolor('yellow')\n    \n    t.forward(1)\n    t.right(1)",
                "test_cases": [
                    {"description": "Uses xcor() and ycor()", "pattern": "xcor()|ycor()", "points": 25},
                    {"description": "Uses if statement", "pattern": "if ", "points": 20},
                    {"description": "Uses elif", "pattern": "elif ", "points": 30},
                    {"description": "Uses 'and' for conditions", "pattern": " and ", "points": 25}
                ]
            },
            
            # Problem 4: Checkerboard Row
            {
                "title": "Checkerboard Row",
                "description": "Draw 8 squares in a row. Fill every other square with black (checkerboard pattern).",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 4: Conditionals",
                "lesson": "Lesson 4: Alternating with %",
                "difficulty": "Hard",
                "problem_type": "Independent Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\nfor i in range(8):\n    # Fill black if i is even\n    # Your code here:\n    \n    # Draw square\n    for j in range(4):\n        t.forward(30)\n        t.right(90)\n    \n    # Move to next position\n    t.penup()\n    t.forward(40)\n    t.pendown()",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\nfor i in range(8):\n    if i % 2 == 0:\n        t.fillcolor('black')\n        t.begin_fill()\n    \n    for j in range(4):\n        t.forward(30)\n        t.right(90)\n    \n    if i % 2 == 0:\n        t.end_fill()\n    \n    t.penup()\n    t.forward(40)\n    t.pendown()",
                "test_cases": [
                    {"description": "Uses % 2 for alternating", "pattern": "% 2", "points": 30},
                    {"description": "Uses begin_fill()", "pattern": "begin_fill()", "points": 25},
                    {"description": "Uses end_fill()", "pattern": "end_fill()", "points": 25},
                    {"description": "Uses nested loops", "pattern": "for j", "points": 20}
                ]
            },
            
            # Problem 5: Size by Position
            {
                "title": "Dynamic Line Size",
                "description": "As the turtle moves, make the line thicker when going up (ycor increasing) and thinner when going down.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 4: Conditionals",
                "lesson": "Lesson 2: If-Else",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\nfor i in range(360):\n    # Thick line (pensize 3) when y > 0\n    # Thin line (pensize 1) when y <= 0\n    # Your code here:\n    \n    t.forward(1)\n    t.right(1)",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\nfor i in range(360):\n    if t.ycor() > 0:\n        t.pensize(3)\n    else:\n        t.pensize(1)\n    \n    t.forward(1)\n    t.right(1)",
                "test_cases": [
                    {"description": "Uses ycor()", "pattern": "ycor()", "points": 30},
                    {"description": "Uses if statement", "pattern": "if ", "points": 25},
                    {"description": "Uses pensize()", "pattern": "pensize(", "points": 25},
                    {"description": "Uses else", "pattern": "else:", "points": 20}
                ]
            },
            
            # ==================== TOPIC 5: FUNCTIONS ====================
            
            # Quiz for Functions
            {
                "title": "Functions Quiz",
                "description": "Test your understanding of defining and using functions in turtle graphics!",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 5: Functions",
                "lesson": "Functions Quiz",
                "difficulty": "Medium",
                "problem_type": "Quiz",
                "quiz_questions": [
                    {"question": "What keyword is used to define a function?", "options": ["function", "def", "define", "func"], "correct": 1},
                    {"question": "What is a parameter?", "options": ["A type of loop", "A value passed to a function", "A color name", "A turtle command"], "correct": 1},
                    {"question": "How do you call a function named 'draw_star'?", "options": ["call draw_star", "draw_star()", "run draw_star", "execute draw_star"], "correct": 1},
                    {"question": "What does 'def draw_square(size):' mean?", "options": ["Draw a square of size 'size'", "Create a function that takes a size parameter", "Size equals draw_square", "Define size as square"], "correct": 1},
                    {"question": "Can functions call other functions?", "options": ["No, never", "Yes, this is called composition", "Only in Python 3", "Only once"], "correct": 1}
                ]
            },
            
            # Problem 1: Simple Function
            {
                "title": "Create a Square Function",
                "description": "Define a function called draw_square() that draws a square. Then call it twice to draw two squares.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 5: Functions",
                "lesson": "Lesson 1: Defining Functions",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\n# Define the function\ndef draw_square():\n    # Draw a square here\n    pass\n\n# Call the function twice\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\n\ndef draw_square():\n    for i in range(4):\n        t.forward(50)\n        t.right(90)\n\ndraw_square()\nt.penup()\nt.forward(70)\nt.pendown()\ndraw_square()",
                "test_cases": [
                    {"description": "Defines function with def", "pattern": "def draw_square", "points": 30},
                    {"description": "Function draws square", "pattern": "forward(", "points": 25},
                    {"description": "Calls function", "pattern": "draw_square()", "points": 25},
                    {"description": "Calls function multiple times", "pattern": "draw_square()", "points": 20}
                ]
            },
            
            # Problem 2: Function with Parameter
            {
                "title": "Square with Size Parameter",
                "description": "Create draw_square(size) that takes a size parameter. Draw squares of sizes 30, 60, and 90.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 5: Functions",
                "lesson": "Lesson 2: Parameters",
                "difficulty": "Medium",
                "problem_type": "Class Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\ndef draw_square(size):\n    # Use 'size' for the forward distance\n    # Your code here:\n    pass\n\n# Draw squares of different sizes\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\n\ndef draw_square(size):\n    for i in range(4):\n        t.forward(size)\n        t.right(90)\n\ndraw_square(30)\nt.penup()\nt.forward(50)\nt.pendown()\ndraw_square(60)\nt.penup()\nt.forward(80)\nt.pendown()\ndraw_square(90)",
                "test_cases": [
                    {"description": "Function has size parameter", "pattern": "def draw_square(size)", "points": 30},
                    {"description": "Uses size in forward()", "pattern": "forward(size)", "points": 30},
                    {"description": "Calls with different sizes", "pattern": "draw_square(", "points": 40}
                ]
            },
            
            # Problem 3: Two Parameters
            {
                "title": "Colored Square Function",
                "description": "Create draw_square(size, color) with two parameters. Draw a red square, blue square, and green square.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 5: Functions",
                "lesson": "Lesson 3: Multiple Parameters",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\ndef draw_square(size, color):\n    # Set fill color and draw filled square\n    # Your code here:\n    pass\n\n# Draw red, blue, and green squares\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\n\ndef draw_square(size, color):\n    t.fillcolor(color)\n    t.begin_fill()\n    for i in range(4):\n        t.forward(size)\n        t.right(90)\n    t.end_fill()\n\ndraw_square(50, 'red')\nt.penup()\nt.forward(70)\nt.pendown()\ndraw_square(50, 'blue')\nt.penup()\nt.forward(70)\nt.pendown()\ndraw_square(50, 'green')",
                "test_cases": [
                    {"description": "Function has two parameters", "pattern": "def draw_square(size, color)", "points": 30},
                    {"description": "Uses color parameter", "pattern": "fillcolor(color)", "points": 30},
                    {"description": "Calls with different colors", "pattern": "'red'|'blue'|'green'", "points": 40}
                ]
            },
            
            # Problem 4: Triangle Function
            {
                "title": "Reusable Triangle Function",
                "description": "Create draw_triangle(size) and use it to draw 3 triangles of different sizes.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 5: Functions",
                "lesson": "Lesson 2: Parameters",
                "difficulty": "Medium",
                "problem_type": "Independent Practice",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\n\ndef draw_triangle(size):\n    # Draw a triangle with given size\n    # Remember: turn 120 degrees\n    # Your code here:\n    pass\n\n# Draw 3 triangles\n# Your code here:\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\n\ndef draw_triangle(size):\n    for i in range(3):\n        t.forward(size)\n        t.left(120)\n\ndraw_triangle(40)\nt.penup()\nt.forward(60)\nt.pendown()\ndraw_triangle(60)\nt.penup()\nt.forward(80)\nt.pendown()\ndraw_triangle(80)",
                "test_cases": [
                    {"description": "Defines triangle function", "pattern": "def draw_triangle", "points": 25},
                    {"description": "Uses size parameter", "pattern": "forward(size)", "points": 25},
                    {"description": "Turns 120 degrees", "pattern": "120", "points": 25},
                    {"description": "Calls function multiple times", "pattern": "draw_triangle(", "points": 25}
                ]
            },
            
            # Problem 5: Flower using Composition
            {
                "title": "Flower with Function Composition",
                "description": "Create draw_square(size) and draw_flower() that uses draw_square 6 times rotated 60° apart.",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 5: Functions",
                "lesson": "Lesson 4: Function Composition",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\ndef draw_square(size):\n    # Draw a square\n    # Your code here:\n    pass\n\ndef draw_flower():\n    # Draw 6 squares, rotating 60 degrees between each\n    # Your code here:\n    pass\n\ndraw_flower()",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\ndef draw_square(size):\n    for i in range(4):\n        t.forward(size)\n        t.right(90)\n\ndef draw_flower():\n    for i in range(6):\n        draw_square(50)\n        t.right(60)\n\ndraw_flower()",
                "test_cases": [
                    {"description": "Defines draw_square function", "pattern": "def draw_square", "points": 20},
                    {"description": "Defines draw_flower function", "pattern": "def draw_flower", "points": 20},
                    {"description": "draw_flower calls draw_square", "pattern": "draw_square(", "points": 30},
                    {"description": "Rotates 60 degrees", "pattern": "60", "points": 15},
                    {"description": "Calls draw_flower()", "pattern": "draw_flower()", "points": 15}
                ]
            },
            
            # ==================== CHAPTER 6: PROJECTS & CHALLENGES ====================
            
            # Quiz for Chapter 6
            {
                "title": "Projects & Challenges Quiz",
                "description": "Test your understanding of combining turtle graphics concepts for creative projects!",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 6: Projects",
                "lesson": "Projects Quiz",
                "difficulty": "Hard",
                "problem_type": "Quiz",
                "quiz_questions": [
                    {"question": "What's the benefit of using functions in a drawing project?", "options": ["Makes code longer", "Reuse code and organize better", "Makes drawing slower", "Only for colors"], "correct": 1},
                    {"question": "How would you draw the same shape in 6 different colors?", "options": ["Copy paste 6 times", "Use a loop with a color list", "Use 6 turtles", "Not possible"], "correct": 1},
                    {"question": "To make a pattern that changes based on position, you need:", "options": ["More colors", "Conditionals with xcor()/ycor()", "Faster speed", "Bigger shapes"], "correct": 1},
                    {"question": "What makes code 'creative' in turtle graphics?", "options": ["Using only basic commands", "Combining loops, functions, colors, and conditionals", "Writing very long code", "Copying examples exactly"], "correct": 1},
                    {"question": "How do you count colors in your code?", "options": ["Count pencolor() and fillcolor() calls with different colors", "Count all forward() calls", "Count number of lines", "Count turtle objects"], "correct": 0}
                ]
            },
            
            # Challenge 1: Rainbow Garden
            {
                "title": "Rainbow Garden",
                "description": "🌸 Create a beautiful garden scene! Draw flowers, grass, or any nature elements you like.\n\n**Requirements to earn full credit:**\n• Use at least **5 different colors**\n• Define at least **3 functions** (e.g., draw_flower, draw_grass, draw_sun)\n• Use at least **4 loops**\n• Use at least **2 conditional statements**\n\n*Be creative! Your garden can have any design - just meet the requirements above.*",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 6: Projects",
                "lesson": "Lesson 1: Geometric Art",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\n# 🌸 Rainbow Garden Challenge!\n# Requirements:\n# - 5+ different colors\n# - 3+ functions (def)\n# - 4+ loops (for/while)\n# - 2+ conditionals (if/elif/else)\n\n# Example function to get you started:\ndef draw_flower(size, color):\n    t.fillcolor(color)\n    t.begin_fill()\n    for i in range(6):\n        t.forward(size)\n        t.right(60)\n    t.end_fill()\n\n# Your creative garden code here:\n\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\ndef draw_flower(size, color):\n    t.fillcolor(color)\n    t.begin_fill()\n    for i in range(6):\n        t.forward(size)\n        t.right(60)\n    t.end_fill()\n\ndef draw_stem():\n    t.pencolor('green')\n    t.right(90)\n    t.forward(50)\n    t.left(90)\n\ndef draw_grass():\n    t.pencolor('darkgreen')\n    for i in range(20):\n        t.forward(5)\n        t.left(80)\n        t.forward(15)\n        t.backward(15)\n        t.right(80)\n\ncolors = ['red', 'yellow', 'pink', 'orange', 'purple']\n\nfor i in range(5):\n    t.penup()\n    t.goto(-150 + i*75, 0)\n    t.pendown()\n    if i % 2 == 0:\n        draw_flower(30, colors[i])\n    else:\n        draw_flower(20, colors[i])\n    draw_stem()",
                "test_cases": [
                    {"description": "Uses 5+ different colors", "pattern": "pencolor|fillcolor|color", "min_count": 5, "points": 25},
                    {"description": "Defines 3+ functions", "pattern": "def ", "min_count": 3, "points": 25},
                    {"description": "Uses 4+ loops", "pattern": "for |while ", "min_count": 4, "points": 25},
                    {"description": "Uses 2+ conditionals", "pattern": "if |elif |else:", "min_count": 2, "points": 25}
                ]
            },
            
            # Challenge 2: Geometric Mandala
            {
                "title": "Geometric Mandala",
                "description": "🔮 Create a mesmerizing mandala pattern! Mandalas are circular designs with repeating patterns.\n\n**Requirements to earn full credit:**\n• Use at least **4 different colors**\n• Define at least **2 functions**\n• Use at least **5 loops** (nested loops work great for mandalas!)\n• Use at least **3 conditional statements**\n\n*Tip: Use rotation and repetition to create symmetric patterns!*",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 6: Projects",
                "lesson": "Lesson 1: Geometric Art",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\n# 🔮 Geometric Mandala Challenge!\n# Requirements:\n# - 4+ different colors\n# - 2+ functions (def)\n# - 5+ loops (for/while)\n# - 3+ conditionals (if/elif/else)\n\n# Tip: Mandalas use lots of rotation!\n\n# Your mandala code here:\n\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\ncolors = ['red', 'blue', 'green', 'purple']\n\ndef draw_petal(size):\n    for i in range(2):\n        t.forward(size)\n        t.right(60)\n        t.forward(size)\n        t.right(120)\n\ndef draw_ring(petals, size, color):\n    t.pencolor(color)\n    angle = 360 / petals\n    for i in range(petals):\n        draw_petal(size)\n        t.right(angle)\n\nfor ring in range(4):\n    if ring == 0:\n        draw_ring(8, 30, colors[0])\n    elif ring == 1:\n        draw_ring(12, 50, colors[1])\n    elif ring == 2:\n        draw_ring(16, 70, colors[2])\n    else:\n        draw_ring(20, 90, colors[3])",
                "test_cases": [
                    {"description": "Uses 4+ different colors", "pattern": "pencolor|fillcolor|color", "min_count": 4, "points": 25},
                    {"description": "Defines 2+ functions", "pattern": "def ", "min_count": 2, "points": 25},
                    {"description": "Uses 5+ loops", "pattern": "for |while ", "min_count": 5, "points": 25},
                    {"description": "Uses 3+ conditionals", "pattern": "if |elif |else:", "min_count": 3, "points": 25}
                ]
            },
            
            # Challenge 3: City Skyline
            {
                "title": "City Skyline",
                "description": "🏙️ Design a city skyline at sunset! Draw buildings, windows, and a colorful sky.\n\n**Requirements to earn full credit:**\n• Use at least **6 different colors** (buildings, windows, sky, sun, etc.)\n• Define at least **4 functions** (e.g., draw_building, draw_window, draw_sun, draw_sky)\n• Use at least **3 loops**\n• Use at least **4 conditional statements**\n\n*Make your city unique - tall buildings, short buildings, different window patterns!*",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 6: Projects",
                "lesson": "Lesson 2: Scene Drawing",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\n# 🏙️ City Skyline Challenge!\n# Requirements:\n# - 6+ different colors\n# - 4+ functions (def)\n# - 3+ loops (for/while)\n# - 4+ conditionals (if/elif/else)\n\n# Example: A simple building function\ndef draw_building(width, height, color):\n    t.fillcolor(color)\n    t.begin_fill()\n    for i in range(2):\n        t.forward(width)\n        t.left(90)\n        t.forward(height)\n        t.left(90)\n    t.end_fill()\n\n# Your city skyline code here:\n\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\ndef draw_building(width, height, color):\n    t.fillcolor(color)\n    t.begin_fill()\n    for i in range(2):\n        t.forward(width)\n        t.left(90)\n        t.forward(height)\n        t.left(90)\n    t.end_fill()\n\ndef draw_window():\n    t.fillcolor('yellow')\n    t.begin_fill()\n    for i in range(4):\n        t.forward(10)\n        t.right(90)\n    t.end_fill()\n\ndef draw_sun():\n    t.penup()\n    t.goto(150, 150)\n    t.pendown()\n    t.fillcolor('orange')\n    t.begin_fill()\n    t.circle(40)\n    t.end_fill()\n\ndef draw_ground():\n    t.penup()\n    t.goto(-200, -100)\n    t.pendown()\n    t.fillcolor('darkgray')\n    t.begin_fill()\n    for i in range(2):\n        t.forward(400)\n        t.right(90)\n        t.forward(50)\n        t.right(90)\n    t.end_fill()\n\nbuildings = [(60, 150, 'gray'), (40, 100, 'darkblue'), (80, 200, 'brown')]\nx_pos = -180\n\nfor width, height, color in buildings:\n    t.penup()\n    t.goto(x_pos, -100)\n    t.pendown()\n    draw_building(width, height, color)\n    if height > 150:\n        window_rows = 4\n    elif height > 100:\n        window_rows = 3\n    else:\n        window_rows = 2\n    x_pos += width + 20\n\ndraw_sun()\ndraw_ground()",
                "test_cases": [
                    {"description": "Uses 6+ different colors", "pattern": "pencolor|fillcolor|color", "min_count": 6, "points": 25},
                    {"description": "Defines 4+ functions", "pattern": "def ", "min_count": 4, "points": 25},
                    {"description": "Uses 3+ loops", "pattern": "for |while ", "min_count": 3, "points": 25},
                    {"description": "Uses 4+ conditionals", "pattern": "if |elif |else:", "min_count": 4, "points": 25}
                ]
            },
            
            # Challenge 4: Abstract Art
            {
                "title": "Abstract Art Generator",
                "description": "🎨 Create abstract art with lots of colors and patterns! Think Kandinsky or Mondrian.\n\n**Requirements to earn full credit:**\n• Use at least **8 different colors** (go wild with the rainbow!)\n• Define at least **2 functions**\n• Use at least **6 loops** (create lots of repetition)\n• Use at least **2 conditional statements**\n\n*Abstract art has no rules - except the requirements above! Mix shapes, colors, and patterns.*",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 6: Projects",
                "lesson": "Lesson 3: Animation Basics",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "import turtle\nimport random\n\nt = turtle.Turtle()\nt.speed(0)\n\n# 🎨 Abstract Art Generator Challenge!\n# Requirements:\n# - 8+ different colors (use a big color list!)\n# - 2+ functions (def)\n# - 6+ loops (for/while)\n# - 2+ conditionals (if/elif/else)\n\n# Big color list to choose from:\ncolors = ['red', 'orange', 'yellow', 'green', 'blue', \n          'purple', 'pink', 'cyan', 'magenta', 'lime']\n\n# Your abstract art code here:\n\n",
                "solution_code": "import turtle\nimport random\n\nt = turtle.Turtle()\nt.speed(0)\n\ncolors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'cyan']\n\ndef random_shape(size):\n    sides = random.randint(3, 8)\n    angle = 360 / sides\n    for i in range(sides):\n        t.forward(size)\n        t.right(angle)\n\ndef spiral_burst(colors_list):\n    for i in range(36):\n        t.pencolor(colors_list[i % len(colors_list)])\n        t.forward(i * 3)\n        t.right(91)\n\nfor x in range(-150, 151, 150):\n    for y in range(-100, 101, 100):\n        t.penup()\n        t.goto(x, y)\n        t.pendown()\n        if x < 0:\n            spiral_burst(colors[:4])\n        else:\n            spiral_burst(colors[4:])\n\nfor i in range(20):\n    t.penup()\n    t.goto(random.randint(-180, 180), random.randint(-150, 150))\n    t.pendown()\n    t.pencolor(colors[i % 8])\n    random_shape(20)",
                "test_cases": [
                    {"description": "Uses 8+ different colors", "pattern": "pencolor|fillcolor|color", "min_count": 8, "points": 25},
                    {"description": "Defines 2+ functions", "pattern": "def ", "min_count": 2, "points": 25},
                    {"description": "Uses 6+ loops", "pattern": "for |while ", "min_count": 6, "points": 25},
                    {"description": "Uses 2+ conditionals", "pattern": "if |elif |else:", "min_count": 2, "points": 25}
                ]
            },
            
            # Challenge 5: Final Masterpiece
            {
                "title": "Final Masterpiece",
                "description": "🏆 **THE ULTIMATE CHALLENGE!** Create your best work combining everything you've learned!\n\n**Requirements to earn full credit:**\n• Use at least **6 different colors**\n• Define at least **5 functions** (good code organization!)\n• Use at least **5 loops**\n• Use at least **5 conditional statements**\n\n*This is your chance to show off! Create something you're proud of - a scene, pattern, game board, logo, or anything you can imagine.*",
                "unit": "Unit 3: Turtle Graphics",
                "chapter": "Chapter 6: Projects",
                "lesson": "Lesson 4: Creative Challenge",
                "difficulty": "Hard",
                "problem_type": "Challenge",
                "starter_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\nscreen = turtle.Screen()\nscreen.bgcolor('white')\n\n# 🏆 FINAL MASTERPIECE CHALLENGE!\n# Requirements:\n# - 6+ different colors\n# - 5+ functions (def) - organize your code!\n# - 5+ loops (for/while)\n# - 5+ conditionals (if/elif/else)\n\n# This is your ultimate test!\n# Show everything you've learned!\n\n# Your masterpiece code here:\n\n",
                "solution_code": "import turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\ncolors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']\n\ndef draw_star(size, color):\n    t.fillcolor(color)\n    t.begin_fill()\n    for i in range(5):\n        t.forward(size)\n        t.right(144)\n    t.end_fill()\n\ndef draw_circle_pattern(radius, color):\n    t.pencolor(color)\n    for i in range(36):\n        t.circle(radius)\n        t.right(10)\n\ndef draw_square_spiral(size):\n    for i in range(20):\n        t.pencolor(colors[i % 6])\n        t.forward(size + i * 5)\n        t.right(91)\n\ndef draw_rainbow_arc():\n    for i, color in enumerate(colors):\n        t.pencolor(color)\n        t.pensize(5)\n        t.circle(100 - i * 10, 180)\n\ndef draw_border():\n    t.penup()\n    t.goto(-200, -180)\n    t.pendown()\n    for i in range(4):\n        if i % 2 == 0:\n            t.pencolor('gold')\n        else:\n            t.pencolor('darkblue')\n        if i < 2:\n            t.forward(400)\n        else:\n            t.forward(360)\n        t.left(90)\n\nt.penup()\nt.goto(0, 50)\nt.pendown()\ndraw_square_spiral(10)\n\nfor i in range(6):\n    t.penup()\n    x = 120 * (1 if i < 3 else -1)\n    y = 80 if i % 2 == 0 else -80\n    t.goto(x, y)\n    t.pendown()\n    if i % 3 == 0:\n        draw_star(30, colors[i])\n    elif i % 3 == 1:\n        draw_circle_pattern(20, colors[i])\n    else:\n        draw_star(20, colors[i])\n\ndraw_border()",
                "test_cases": [
                    {"description": "Uses 6+ different colors", "pattern": "pencolor|fillcolor|color", "min_count": 6, "points": 25},
                    {"description": "Defines 5+ functions", "pattern": "def ", "min_count": 5, "points": 25},
                    {"description": "Uses 5+ loops", "pattern": "for |while ", "min_count": 5, "points": 25},
                    {"description": "Uses 5+ conditionals", "pattern": "if |elif |else:", "min_count": 5, "points": 25}
                ]
            }
        ]
        
        # Insert all problems
        for problem in turtle_problems:
            problem_doc = {
                "id": str(uuid.uuid4()),
                "title": problem["title"],
                "description": problem["description"],
                "starter_code": problem.get("starter_code", "import turtle\n\nt = turtle.Turtle()\n\n# Your code here:\n"),
                "solution_code": problem.get("solution_code", ""),
                "expected_output": "",
                "category": "Turtle",
                "difficulty": problem["difficulty"],
                "unit": problem["unit"],
                "chapter": problem["chapter"],
                "lesson": problem["lesson"],
                "problem_type": problem["problem_type"],
                "assignment_type": "turtle",
                "test_cases": problem.get("test_cases", []),
                "quiz_questions": problem.get("quiz_questions", []),
                "resources_link": "",
                "csta_standard": "",
                "creator_id": "system",
                "creator_name": "System",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.problems.insert_one(problem_doc)
        
        final_count = await db.problems.count_documents({"assignment_type": "turtle"})
        logger.info(f"✅ Turtle problems seeded: {final_count}")
    except Exception as e:
        logger.error(f"Error seeding Turtle problems: {str(e)}")


@app.on_event("startup")
async def seed_skill_quiz_questions():
    """Seed skill quiz questions for all skill categories"""
    try:
        # Check if questions already exist
        existing_count = await db.skill_quiz_questions.count_documents({})
        if existing_count > 0:
            logger.info(f"✅ Skill quiz questions already exist: {existing_count}")
            return
        
        logger.info("🔄 Seeding skill quiz questions...")
        
        skill_quiz_questions = [
            # ==================== TURTLE - FIRST STEPS ====================
            {
                "skill_category": "Turtle - First Steps",
                "question_text": "What command moves the turtle forward 100 pixels?",
                "choice_a": "t.forward(100)",
                "choice_b": "t.move(100)",
                "choice_c": "t.go(100)",
                "choice_d": "t.walk(100)",
                "correct_answer": "A",
                "explanation": "forward() is the standard turtle command to move forward a specified number of pixels.",
                "concept_tags": ["movement", "forward"]
            },
            {
                "skill_category": "Turtle - First Steps",
                "question_text": "What does t.right(90) do?",
                "choice_a": "Move the turtle 90 pixels to the right",
                "choice_b": "Turn the turtle 90 degrees clockwise",
                "choice_c": "Draw a line 90 pixels long",
                "choice_d": "Create a 90-degree angle",
                "correct_answer": "B",
                "explanation": "right() turns the turtle clockwise by the specified degrees without moving it.",
                "concept_tags": ["turning", "angles"]
            },
            {
                "skill_category": "Turtle - First Steps",
                "question_text": "How do you create a new turtle object?",
                "choice_a": "turtle.new()",
                "choice_b": "create.Turtle()",
                "choice_c": "turtle.Turtle()",
                "choice_d": "new Turtle()",
                "correct_answer": "C",
                "explanation": "turtle.Turtle() creates a new turtle object from the turtle module.",
                "concept_tags": ["objects", "initialization"]
            },
            {
                "skill_category": "Turtle - First Steps",
                "question_text": "What import statement is needed for turtle graphics?",
                "choice_a": "import graphics",
                "choice_b": "import drawing",
                "choice_c": "import turtle",
                "choice_d": "import canvas",
                "correct_answer": "C",
                "explanation": "The turtle module must be imported to use turtle graphics.",
                "concept_tags": ["import", "module"]
            },
            {
                "skill_category": "Turtle - First Steps",
                "question_text": "What does t.backward(50) do?",
                "choice_a": "Turn the turtle around",
                "choice_b": "Move backward 50 pixels without turning",
                "choice_c": "Delete the last 50 pixels drawn",
                "choice_d": "Slow down the turtle by 50%",
                "correct_answer": "B",
                "explanation": "backward() moves the turtle in reverse without changing its direction.",
                "concept_tags": ["movement", "backward"]
            },
            
            # ==================== TURTLE - LOOPS ====================
            {
                "skill_category": "Turtle - Loops",
                "question_text": "What does 'for i in range(4):' do?",
                "choice_a": "Runs the code 4 times",
                "choice_b": "Creates 4 turtles",
                "choice_c": "Moves forward 4 pixels",
                "choice_d": "Waits 4 seconds",
                "correct_answer": "A",
                "explanation": "range(4) creates values 0,1,2,3 so the loop runs 4 times.",
                "concept_tags": ["for loop", "range"]
            },
            {
                "skill_category": "Turtle - Loops",
                "question_text": "To draw a square, how many times should you repeat forward + right(90)?",
                "choice_a": "2",
                "choice_b": "3",
                "choice_c": "4",
                "choice_d": "6",
                "correct_answer": "C",
                "explanation": "A square has 4 sides, so you need 4 repetitions of forward and turn.",
                "concept_tags": ["shapes", "repetition"]
            },
            {
                "skill_category": "Turtle - Loops",
                "question_text": "What does range(1, 5) produce?",
                "choice_a": "1, 2, 3, 4, 5",
                "choice_b": "1, 2, 3, 4",
                "choice_c": "0, 1, 2, 3, 4",
                "choice_d": "1, 5",
                "correct_answer": "B",
                "explanation": "range(1, 5) starts at 1 and stops before 5, giving 1,2,3,4.",
                "concept_tags": ["range", "parameters"]
            },
            {
                "skill_category": "Turtle - Loops",
                "question_text": "How do you draw a triangle using a loop?",
                "choice_a": "for i in range(3): t.forward(100); t.right(120)",
                "choice_b": "for i in range(3): t.forward(100); t.right(90)",
                "choice_c": "for i in range(4): t.forward(100); t.right(60)",
                "choice_d": "for i in range(6): t.forward(100); t.right(60)",
                "correct_answer": "A",
                "explanation": "A triangle has 3 sides and exterior angles of 120° (360÷3=120).",
                "concept_tags": ["shapes", "angles"]
            },
            {
                "skill_category": "Turtle - Loops",
                "question_text": "What does 'i' represent in 'for i in range(5):'?",
                "choice_a": "The turtle's position",
                "choice_b": "A counter that changes each loop (0,1,2,3,4)",
                "choice_c": "The pen size",
                "choice_d": "The number of sides",
                "correct_answer": "B",
                "explanation": "The loop variable 'i' takes each value from range() in sequence.",
                "concept_tags": ["loop variable", "iteration"]
            },
            
            # ==================== TURTLE - COLORS & PEN ====================
            {
                "skill_category": "Turtle - Colors & Pen",
                "question_text": "How do you change the turtle's drawing color to red?",
                "choice_a": "t.color = 'red'",
                "choice_b": "t.pencolor('red')",
                "choice_c": "t.draw('red')",
                "choice_d": "t.setcolor('red')",
                "correct_answer": "B",
                "explanation": "pencolor() sets the color of the line the turtle draws.",
                "concept_tags": ["colors", "pencolor"]
            },
            {
                "skill_category": "Turtle - Colors & Pen",
                "question_text": "What does t.penup() do?",
                "choice_a": "Makes the pen thicker",
                "choice_b": "Changes the pen color",
                "choice_c": "Lifts the pen so moving doesn't draw",
                "choice_d": "Speeds up the turtle",
                "correct_answer": "C",
                "explanation": "penup() lifts the pen so the turtle can move without drawing.",
                "concept_tags": ["pen control", "penup"]
            },
            {
                "skill_category": "Turtle - Colors & Pen",
                "question_text": "How do you fill a shape with color?",
                "choice_a": "t.paint() and t.done()",
                "choice_b": "t.begin_fill() and t.end_fill()",
                "choice_c": "t.start_color() and t.stop_color()",
                "choice_d": "t.fill_on() and t.fill_off()",
                "correct_answer": "B",
                "explanation": "begin_fill() starts recording, end_fill() fills the enclosed shape.",
                "concept_tags": ["fill", "shapes"]
            },
            {
                "skill_category": "Turtle - Colors & Pen",
                "question_text": "What does t.pensize(5) do?",
                "choice_a": "Sets the turtle size to 5",
                "choice_b": "Draws 5 lines",
                "choice_c": "Sets the line thickness to 5 pixels",
                "choice_d": "Moves forward 5 pixels",
                "correct_answer": "C",
                "explanation": "pensize() sets the width of the line the turtle draws.",
                "concept_tags": ["pen control", "pensize"]
            },
            {
                "skill_category": "Turtle - Colors & Pen",
                "question_text": "What's the difference between pencolor() and fillcolor()?",
                "choice_a": "They are the same thing",
                "choice_b": "pencolor is for lines, fillcolor is for shape interiors",
                "choice_c": "fillcolor is for lines, pencolor is for backgrounds",
                "choice_d": "pencolor only works with RGB values",
                "correct_answer": "B",
                "explanation": "pencolor sets the outline color, fillcolor sets the interior color.",
                "concept_tags": ["colors", "fill"]
            },
            
            # ==================== TURTLE - CONDITIONALS ====================
            {
                "skill_category": "Turtle - Conditionals",
                "question_text": "What does 'if i % 2 == 0:' check?",
                "choice_a": "If i is odd",
                "choice_b": "If i is even",
                "choice_c": "If i equals 2",
                "choice_d": "If i is positive",
                "correct_answer": "B",
                "explanation": "% is modulo (remainder). If i % 2 equals 0, i is divisible by 2 (even).",
                "concept_tags": ["modulo", "even/odd"]
            },
            {
                "skill_category": "Turtle - Conditionals",
                "question_text": "What does t.xcor() return?",
                "choice_a": "The turtle's color",
                "choice_b": "The turtle's x position",
                "choice_c": "The number of steps taken",
                "choice_d": "The pen size",
                "correct_answer": "B",
                "explanation": "xcor() returns the turtle's current x-coordinate position.",
                "concept_tags": ["position", "coordinates"]
            },
            {
                "skill_category": "Turtle - Conditionals",
                "question_text": "What keyword runs code when the if condition is False?",
                "choice_a": "then",
                "choice_b": "otherwise",
                "choice_c": "else",
                "choice_d": "false",
                "correct_answer": "C",
                "explanation": "else: runs when the if condition evaluates to False.",
                "concept_tags": ["else", "branching"]
            },
            {
                "skill_category": "Turtle - Conditionals",
                "question_text": "What does 'elif' mean?",
                "choice_a": "End loop if",
                "choice_b": "Else if",
                "choice_c": "Element if",
                "choice_d": "Early if",
                "correct_answer": "B",
                "explanation": "elif is short for 'else if' - checks another condition if the first was False.",
                "concept_tags": ["elif", "chained conditions"]
            },
            {
                "skill_category": "Turtle - Conditionals",
                "question_text": "If t.ycor() > 0, where is the turtle?",
                "choice_a": "Left side of screen",
                "choice_b": "Right side of screen",
                "choice_c": "Top half of screen",
                "choice_d": "Bottom half of screen",
                "correct_answer": "C",
                "explanation": "Positive y values are above the center (0,0), in the top half.",
                "concept_tags": ["coordinates", "position"]
            },
            
            # ==================== TURTLE - FUNCTIONS ====================
            {
                "skill_category": "Turtle - Functions",
                "question_text": "How do you define a function in Python?",
                "choice_a": "function draw_square():",
                "choice_b": "def draw_square():",
                "choice_c": "create draw_square():",
                "choice_d": "new draw_square():",
                "correct_answer": "B",
                "explanation": "'def' is the keyword to define a function in Python.",
                "concept_tags": ["function definition", "def"]
            },
            {
                "skill_category": "Turtle - Functions",
                "question_text": "What is a parameter?",
                "choice_a": "A type of loop",
                "choice_b": "A value passed into a function",
                "choice_c": "A turtle command",
                "choice_d": "A color name",
                "correct_answer": "B",
                "explanation": "Parameters are variables that receive values when a function is called.",
                "concept_tags": ["parameters", "arguments"]
            },
            {
                "skill_category": "Turtle - Functions",
                "question_text": "How do you call a function named draw_star?",
                "choice_a": "call draw_star",
                "choice_b": "run draw_star",
                "choice_c": "draw_star()",
                "choice_d": "execute draw_star",
                "correct_answer": "C",
                "explanation": "Functions are called by their name followed by parentheses.",
                "concept_tags": ["function call", "invocation"]
            },
            {
                "skill_category": "Turtle - Functions",
                "question_text": "Why use functions in your code?",
                "choice_a": "They make code run faster",
                "choice_b": "They let you reuse code without rewriting it",
                "choice_c": "They change colors automatically",
                "choice_d": "They are required by Python",
                "correct_answer": "B",
                "explanation": "Functions allow code reuse and make programs more organized.",
                "concept_tags": ["code reuse", "organization"]
            },
            {
                "skill_category": "Turtle - Functions",
                "question_text": "What does 'def draw_shape(size):' mean?",
                "choice_a": "Draw a shape that is 'size' pixels",
                "choice_b": "Define a function that takes 'size' as input",
                "choice_c": "Default the shape to size",
                "choice_d": "Delete the shape called size",
                "correct_answer": "B",
                "explanation": "'size' is a parameter - a variable that receives a value when called.",
                "concept_tags": ["parameters", "function definition"]
            },
            
            # ==================== MICRO:BIT - LED DISPLAY ====================
            {
                "skill_category": "Micro:bit - LED Display",
                "question_text": "How do you display a heart on the micro:bit?",
                "choice_a": "display.heart()",
                "choice_b": "display.show(Image.HEART)",
                "choice_c": "show.image('heart')",
                "choice_d": "led.heart()",
                "correct_answer": "B",
                "explanation": "display.show() displays images, Image.HEART is a built-in image.",
                "concept_tags": ["display", "images"]
            },
            {
                "skill_category": "Micro:bit - LED Display",
                "question_text": "What does display.scroll('Hello') do?",
                "choice_a": "Shows 'Hello' all at once",
                "choice_b": "Scrolls the text across the LED display",
                "choice_c": "Says 'Hello' out loud",
                "choice_d": "Saves 'Hello' to memory",
                "correct_answer": "B",
                "explanation": "scroll() animates text moving across the 5x5 LED display.",
                "concept_tags": ["scroll", "text"]
            },
            {
                "skill_category": "Micro:bit - LED Display",
                "question_text": "How do you turn on a single LED at position (2, 2)?",
                "choice_a": "display.on(2, 2)",
                "choice_b": "display.set_pixel(2, 2, 9)",
                "choice_c": "led.light(2, 2)",
                "choice_d": "pixel(2, 2) = True",
                "correct_answer": "B",
                "explanation": "set_pixel(x, y, brightness) controls individual LEDs. 9 is max brightness.",
                "concept_tags": ["pixel", "coordinates"]
            },
            {
                "skill_category": "Micro:bit - LED Display",
                "question_text": "What does display.clear() do?",
                "choice_a": "Resets the micro:bit",
                "choice_b": "Turns off all LEDs",
                "choice_c": "Clears the code",
                "choice_d": "Deletes all variables",
                "correct_answer": "B",
                "explanation": "clear() turns off all 25 LEDs on the display.",
                "concept_tags": ["clear", "display"]
            },
            {
                "skill_category": "Micro:bit - LED Display",
                "question_text": "How many LEDs are on the micro:bit display?",
                "choice_a": "16 (4x4)",
                "choice_b": "25 (5x5)",
                "choice_c": "36 (6x6)",
                "choice_d": "64 (8x8)",
                "correct_answer": "B",
                "explanation": "The micro:bit has a 5x5 grid of 25 red LEDs.",
                "concept_tags": ["hardware", "LED grid"]
            },
            
            # ==================== MICRO:BIT - BUTTONS ====================
            {
                "skill_category": "Micro:bit - Buttons",
                "question_text": "How do you check if button A is pressed?",
                "choice_a": "if button_a.pressed():",
                "choice_b": "if button_a.is_pressed():",
                "choice_c": "if press(button_a):",
                "choice_d": "if button_a == True:",
                "correct_answer": "B",
                "explanation": "is_pressed() returns True while the button is being held down.",
                "concept_tags": ["buttons", "input"]
            },
            {
                "skill_category": "Micro:bit - Buttons",
                "question_text": "What's the difference between is_pressed() and was_pressed()?",
                "choice_a": "They are the same",
                "choice_b": "is_pressed checks now, was_pressed checks if pressed since last check",
                "choice_c": "was_pressed is for button B only",
                "choice_d": "is_pressed is faster",
                "correct_answer": "B",
                "explanation": "was_pressed() returns True once per press, useful for counting presses.",
                "concept_tags": ["buttons", "event detection"]
            },
            {
                "skill_category": "Micro:bit - Buttons",
                "question_text": "How many physical buttons does the micro:bit have?",
                "choice_a": "1",
                "choice_b": "2",
                "choice_c": "3",
                "choice_d": "4",
                "correct_answer": "B",
                "explanation": "The micro:bit has 2 buttons: A (left) and B (right).",
                "concept_tags": ["hardware", "buttons"]
            },
            {
                "skill_category": "Micro:bit - Buttons",
                "question_text": "How do you detect both buttons pressed together?",
                "choice_a": "button_ab.is_pressed()",
                "choice_b": "button_a.is_pressed() and button_b.is_pressed()",
                "choice_c": "buttons.both()",
                "choice_d": "press_all()",
                "correct_answer": "B",
                "explanation": "Use 'and' to check if both conditions are True at the same time.",
                "concept_tags": ["logic", "and operator"]
            },
            {
                "skill_category": "Micro:bit - Buttons",
                "question_text": "What does button_a.get_presses() return?",
                "choice_a": "True or False",
                "choice_b": "The number of times button A was pressed",
                "choice_c": "The button's color",
                "choice_d": "The button's position",
                "correct_answer": "B",
                "explanation": "get_presses() returns the count of presses since last called, then resets.",
                "concept_tags": ["buttons", "counting"]
            },
            
            # ==================== MICRO:BIT - SENSORS ====================
            {
                "skill_category": "Micro:bit - Sensors",
                "question_text": "How do you read the temperature from the micro:bit?",
                "choice_a": "read.temp()",
                "choice_b": "temperature()",
                "choice_c": "sensor.temperature",
                "choice_d": "get_temp()",
                "correct_answer": "B",
                "explanation": "temperature() returns the temperature in Celsius from the CPU sensor.",
                "concept_tags": ["temperature", "sensors"]
            },
            {
                "skill_category": "Micro:bit - Sensors",
                "question_text": "What does accelerometer.get_x() measure?",
                "choice_a": "The x position on screen",
                "choice_b": "Tilt/acceleration in the x direction",
                "choice_c": "The x button presses",
                "choice_d": "The x coordinate of an LED",
                "correct_answer": "B",
                "explanation": "The accelerometer measures tilt and movement in 3 directions (x, y, z).",
                "concept_tags": ["accelerometer", "motion"]
            },
            {
                "skill_category": "Micro:bit - Sensors",
                "question_text": "How do you detect if the micro:bit is shaken?",
                "choice_a": "if shaking():",
                "choice_b": "if accelerometer.was_gesture('shake'):",
                "choice_c": "if motion.shake:",
                "choice_d": "if sensor.detect('shake'):",
                "correct_answer": "B",
                "explanation": "was_gesture() detects gestures like 'shake', 'face up', 'face down'.",
                "concept_tags": ["gestures", "accelerometer"]
            },
            {
                "skill_category": "Micro:bit - Sensors",
                "question_text": "What does compass.heading() return?",
                "choice_a": "North, South, East, or West",
                "choice_b": "A number from 0-359 representing degrees",
                "choice_c": "The GPS location",
                "choice_d": "True if pointing north",
                "correct_answer": "B",
                "explanation": "heading() returns degrees from north (0=N, 90=E, 180=S, 270=W).",
                "concept_tags": ["compass", "direction"]
            },
            {
                "skill_category": "Micro:bit - Sensors",
                "question_text": "What does display.read_light_level() measure?",
                "choice_a": "The brightness of the LEDs",
                "choice_b": "The ambient light hitting the display",
                "choice_c": "The battery level",
                "choice_d": "The screen contrast",
                "correct_answer": "B",
                "explanation": "The LEDs can also detect light! This reads environmental brightness 0-255.",
                "concept_tags": ["light sensor", "input"]
            },
            
            # ==================== MICRO:BIT - EXTERNAL COMPONENTS ====================
            {
                "skill_category": "Micro:bit - External Components",
                "question_text": "Which pins can be used for analog input?",
                "choice_a": "Only pin0",
                "choice_b": "pin0, pin1, pin2",
                "choice_c": "All pins",
                "choice_d": "None, analog is not supported",
                "correct_answer": "B",
                "explanation": "Pins 0, 1, and 2 support analog input for sensors like potentiometers.",
                "concept_tags": ["pins", "analog"]
            },
            {
                "skill_category": "Micro:bit - External Components",
                "question_text": "How do you turn on an LED connected to pin0?",
                "choice_a": "pin0.on()",
                "choice_b": "pin0.write_digital(1)",
                "choice_c": "digital.pin0 = True",
                "choice_d": "led.pin0.light()",
                "correct_answer": "B",
                "explanation": "write_digital(1) sends HIGH signal to turn on external components.",
                "concept_tags": ["digital output", "pins"]
            },
            {
                "skill_category": "Micro:bit - External Components",
                "question_text": "What does pin0.read_analog() return?",
                "choice_a": "True or False",
                "choice_b": "A number from 0 to 1023",
                "choice_c": "The pin's name",
                "choice_d": "The voltage in volts",
                "correct_answer": "B",
                "explanation": "Analog read returns 0-1023 representing 0V to 3V input.",
                "concept_tags": ["analog input", "sensors"]
            },
            {
                "skill_category": "Micro:bit - External Components",
                "question_text": "What is PWM used for?",
                "choice_a": "Reading button presses",
                "choice_b": "Controlling brightness or motor speed",
                "choice_c": "Playing music",
                "choice_d": "Connecting to WiFi",
                "correct_answer": "B",
                "explanation": "PWM (Pulse Width Modulation) controls analog-like outputs for dimming/speed.",
                "concept_tags": ["PWM", "analog output"]
            },
            {
                "skill_category": "Micro:bit - External Components",
                "question_text": "How do you play a sound on a connected speaker?",
                "choice_a": "speaker.play('beep')",
                "choice_b": "music.play(music.DADADADUM)",
                "choice_c": "sound.make('tone')",
                "choice_d": "audio.beep()",
                "correct_answer": "B",
                "explanation": "The music module plays built-in tunes and custom melodies.",
                "concept_tags": ["music", "audio"]
            },
            
            # ==================== BLOCK - OUTPUT & PRINT ====================
            {
                "skill_category": "Block - Output & Print",
                "question_text": "Which block displays text on the screen?",
                "choice_a": "show block",
                "choice_b": "say block",
                "choice_c": "print block",
                "choice_d": "display block",
                "correct_answer": "B",
                "explanation": "The 'say' block makes a sprite display a speech bubble with text.",
                "concept_tags": ["output", "say"]
            },
            {
                "skill_category": "Block - Output & Print",
                "question_text": "What's the difference between 'say' and 'think' blocks?",
                "choice_a": "They are identical",
                "choice_b": "'say' shows speech bubble, 'think' shows thought bubble",
                "choice_c": "'think' is faster",
                "choice_d": "'say' is for numbers only",
                "correct_answer": "B",
                "explanation": "'say' creates a speech bubble, 'think' creates a cloud-shaped thought bubble.",
                "concept_tags": ["output", "sprites"]
            },
            {
                "skill_category": "Block - Output & Print",
                "question_text": "How do you join text together in blocks?",
                "choice_a": "add block",
                "choice_b": "join block",
                "choice_c": "combine block",
                "choice_d": "merge block",
                "correct_answer": "B",
                "explanation": "The 'join' operator block combines two pieces of text together.",
                "concept_tags": ["strings", "operators"]
            },
            {
                "skill_category": "Block - Output & Print",
                "question_text": "What does 'say [Hello] for [2] seconds' do?",
                "choice_a": "Shows 'Hello' forever",
                "choice_b": "Shows 'Hello' for 2 seconds then disappears",
                "choice_c": "Says 'Hello' twice",
                "choice_d": "Waits 2 seconds then shows 'Hello'",
                "correct_answer": "B",
                "explanation": "The timed 'say' block displays text temporarily for the specified duration.",
                "concept_tags": ["timing", "output"]
            },
            {
                "skill_category": "Block - Output & Print",
                "question_text": "How do you display a variable's value?",
                "choice_a": "Use 'show variable' block",
                "choice_b": "Drag the variable into a 'say' block",
                "choice_c": "Variables display automatically",
                "choice_d": "Use 'print variable' block",
                "correct_answer": "B",
                "explanation": "You can drag variable blocks into say/think blocks to display their values.",
                "concept_tags": ["variables", "output"]
            },
            
            # ==================== BLOCK - VARIABLES ====================
            {
                "skill_category": "Block - Variables",
                "question_text": "How do you create a new variable in Scratch?",
                "choice_a": "Type the variable name",
                "choice_b": "Click 'Make a Variable' in the Variables category",
                "choice_c": "Drag a variable block to the stage",
                "choice_d": "Right-click and select 'New Variable'",
                "correct_answer": "B",
                "explanation": "Click 'Make a Variable' button in the Variables category to create one.",
                "concept_tags": ["variables", "creation"]
            },
            {
                "skill_category": "Block - Variables",
                "question_text": "What does 'set [score] to [0]' do?",
                "choice_a": "Adds 0 to score",
                "choice_b": "Changes score to exactly 0",
                "choice_c": "Checks if score is 0",
                "choice_d": "Creates a variable called score",
                "correct_answer": "B",
                "explanation": "'set' assigns a specific value to the variable, replacing its current value.",
                "concept_tags": ["assignment", "set"]
            },
            {
                "skill_category": "Block - Variables",
                "question_text": "What's the difference between 'set' and 'change' blocks?",
                "choice_a": "They do the same thing",
                "choice_b": "'set' replaces the value, 'change' adds to it",
                "choice_c": "'change' is for text only",
                "choice_d": "'set' only works with numbers",
                "correct_answer": "B",
                "explanation": "'set' replaces the value completely, 'change' adds or subtracts from it.",
                "concept_tags": ["variables", "modification"]
            },
            {
                "skill_category": "Block - Variables",
                "question_text": "If score is 5, what does 'change [score] by [3]' result in?",
                "choice_a": "3",
                "choice_b": "5",
                "choice_c": "8",
                "choice_d": "15",
                "correct_answer": "C",
                "explanation": "'change by' adds to the current value: 5 + 3 = 8.",
                "concept_tags": ["math", "change"]
            },
            {
                "skill_category": "Block - Variables",
                "question_text": "How do you show a variable on the stage?",
                "choice_a": "Use the 'display' block",
                "choice_b": "Check the checkbox next to the variable name",
                "choice_c": "Variables always show automatically",
                "choice_d": "Drag it to the stage",
                "correct_answer": "B",
                "explanation": "Click the checkbox in the Variables category to show/hide on stage.",
                "concept_tags": ["display", "variables"]
            },
            
            # ==================== BLOCK - LOOPS ====================
            {
                "skill_category": "Block - Loops",
                "question_text": "What does the 'repeat [10]' block do?",
                "choice_a": "Waits 10 seconds",
                "choice_b": "Runs the blocks inside it 10 times",
                "choice_c": "Creates 10 copies",
                "choice_d": "Moves 10 steps",
                "correct_answer": "B",
                "explanation": "The repeat block executes its contents the specified number of times.",
                "concept_tags": ["loops", "repeat"]
            },
            {
                "skill_category": "Block - Loops",
                "question_text": "What's the difference between 'repeat' and 'forever'?",
                "choice_a": "They are the same",
                "choice_b": "'repeat' runs a set number of times, 'forever' never stops",
                "choice_c": "'forever' is faster",
                "choice_d": "'repeat' only works with motion blocks",
                "correct_answer": "B",
                "explanation": "'repeat' runs a specific count, 'forever' runs until the program stops.",
                "concept_tags": ["loops", "infinite"]
            },
            {
                "skill_category": "Block - Loops",
                "question_text": "What does 'repeat until [condition]' do?",
                "choice_a": "Repeats while condition is true",
                "choice_b": "Repeats until condition becomes true",
                "choice_c": "Checks condition once",
                "choice_d": "Skips if condition is false",
                "correct_answer": "B",
                "explanation": "'repeat until' keeps looping until the condition becomes true.",
                "concept_tags": ["loops", "conditional"]
            },
            {
                "skill_category": "Block - Loops",
                "question_text": "How do you make a sprite spin forever?",
                "choice_a": "Use 'turn forever' block",
                "choice_b": "Put 'turn 15 degrees' inside a 'forever' block",
                "choice_c": "Set rotation to infinite",
                "choice_d": "Use 'spin' block",
                "correct_answer": "B",
                "explanation": "Combining 'turn' with 'forever' creates continuous spinning.",
                "concept_tags": ["loops", "animation"]
            },
            {
                "skill_category": "Block - Loops",
                "question_text": "What happens if you put a 'wait' block inside a 'repeat' loop?",
                "choice_a": "The wait is ignored",
                "choice_b": "It pauses between each repetition",
                "choice_c": "The loop runs faster",
                "choice_d": "It only waits once at the end",
                "correct_answer": "B",
                "explanation": "Wait blocks pause execution each time they're reached in the loop.",
                "concept_tags": ["loops", "timing"]
            },
            
            # ==================== BLOCK - CONDITIONALS ====================
            {
                "skill_category": "Block - Conditionals",
                "question_text": "What does the 'if-then' block do?",
                "choice_a": "Always runs the code inside",
                "choice_b": "Only runs the code if the condition is true",
                "choice_c": "Runs the code twice",
                "choice_d": "Creates a new variable",
                "correct_answer": "B",
                "explanation": "'if-then' checks a condition and only executes if it's true.",
                "concept_tags": ["conditionals", "if"]
            },
            {
                "skill_category": "Block - Conditionals",
                "question_text": "What block checks if two things are equal?",
                "choice_a": "The '=' block",
                "choice_b": "The '==' block",
                "choice_c": "The green '=' operator block",
                "choice_d": "The 'equals' block",
                "correct_answer": "C",
                "explanation": "The green '=' block in Operators compares two values for equality.",
                "concept_tags": ["comparison", "operators"]
            },
            {
                "skill_category": "Block - Conditionals",
                "question_text": "What's the difference between 'if-then' and 'if-then-else'?",
                "choice_a": "They are the same",
                "choice_b": "'if-then-else' also runs code when condition is false",
                "choice_c": "'if-then-else' is faster",
                "choice_d": "'if-then-else' checks multiple conditions",
                "correct_answer": "B",
                "explanation": "'if-then-else' has two code sections: one for true, one for false.",
                "concept_tags": ["conditionals", "else"]
            },
            {
                "skill_category": "Block - Conditionals",
                "question_text": "How do you check if a sprite is touching another sprite?",
                "choice_a": "Use 'distance to' block",
                "choice_b": "Use 'touching [sprite]?' block",
                "choice_c": "Compare x and y positions",
                "choice_d": "Use 'collision' block",
                "correct_answer": "B",
                "explanation": "The 'touching?' sensing block detects sprite collisions.",
                "concept_tags": ["sensing", "collision"]
            },
            {
                "skill_category": "Block - Conditionals",
                "question_text": "What does the 'and' block do?",
                "choice_a": "Adds two numbers",
                "choice_b": "Returns true only if both conditions are true",
                "choice_c": "Joins two text strings",
                "choice_d": "Runs two blocks at once",
                "correct_answer": "B",
                "explanation": "'and' combines conditions - both must be true for the result to be true.",
                "concept_tags": ["logic", "operators"]
            },
            
            # ==================== PYTHON - VARIABLES ====================
            {
                "skill_category": "Python - Variables",
                "question_text": "How do you create a variable called 'score' with value 10?",
                "choice_a": "var score = 10",
                "choice_b": "score = 10",
                "choice_c": "int score = 10",
                "choice_d": "create score = 10",
                "correct_answer": "B",
                "explanation": "Python uses simple assignment with = to create variables.",
                "concept_tags": ["assignment", "variables"]
            },
            {
                "skill_category": "Python - Variables",
                "question_text": "What does x = x + 5 do?",
                "choice_a": "Checks if x equals x + 5",
                "choice_b": "Adds 5 to x and stores the result back in x",
                "choice_c": "Creates two variables",
                "choice_d": "This is an error",
                "correct_answer": "B",
                "explanation": "The right side is calculated first, then assigned to the left side.",
                "concept_tags": ["assignment", "math"]
            },
            {
                "skill_category": "Python - Variables",
                "question_text": "Which is a valid variable name?",
                "choice_a": "2fast",
                "choice_b": "my-score",
                "choice_c": "player_name",
                "choice_d": "class",
                "correct_answer": "C",
                "explanation": "Variable names can't start with numbers, contain hyphens, or be keywords.",
                "concept_tags": ["naming", "syntax"]
            },
            {
                "skill_category": "Python - Variables",
                "question_text": "What is the shorthand for x = x + 3?",
                "choice_a": "x + 3",
                "choice_b": "x += 3",
                "choice_c": "x =+ 3",
                "choice_d": "x + = 3",
                "correct_answer": "B",
                "explanation": "+= is the addition assignment operator, a shortcut for adding to a variable.",
                "concept_tags": ["operators", "shorthand"]
            },
            {
                "skill_category": "Python - Variables",
                "question_text": "What type of data is stored in: name = 'Alice'?",
                "choice_a": "Integer",
                "choice_b": "Float",
                "choice_c": "String",
                "choice_d": "Boolean",
                "correct_answer": "C",
                "explanation": "Text in quotes is a string. 'Alice' is a string value.",
                "concept_tags": ["data types", "strings"]
            },
            
            # ==================== PYTHON - STRINGS ====================
            {
                "skill_category": "Python - Strings",
                "question_text": "How do you combine 'Hello' and 'World'?",
                "choice_a": "'Hello' + 'World'",
                "choice_b": "'Hello' & 'World'",
                "choice_c": "'Hello'.add('World')",
                "choice_d": "combine('Hello', 'World')",
                "correct_answer": "A",
                "explanation": "The + operator concatenates (joins) strings in Python.",
                "concept_tags": ["concatenation", "operators"]
            },
            {
                "skill_category": "Python - Strings",
                "question_text": "What does len('Python') return?",
                "choice_a": "5",
                "choice_b": "6",
                "choice_c": "7",
                "choice_d": "'Python'",
                "correct_answer": "B",
                "explanation": "len() returns the number of characters. 'Python' has 6 letters.",
                "concept_tags": ["length", "functions"]
            },
            {
                "skill_category": "Python - Strings",
                "question_text": "What does 'hello'.upper() return?",
                "choice_a": "'hello'",
                "choice_b": "'Hello'",
                "choice_c": "'HELLO'",
                "choice_d": "5",
                "correct_answer": "C",
                "explanation": "upper() converts all characters to uppercase.",
                "concept_tags": ["methods", "case"]
            },
            {
                "skill_category": "Python - Strings",
                "question_text": "How do you get the first character of string s?",
                "choice_a": "s[1]",
                "choice_b": "s[0]",
                "choice_c": "s.first()",
                "choice_d": "first(s)",
                "correct_answer": "B",
                "explanation": "Python uses 0-based indexing. The first character is at index 0.",
                "concept_tags": ["indexing", "characters"]
            },
            {
                "skill_category": "Python - Strings",
                "question_text": "What does f'Score: {points}' do?",
                "choice_a": "Creates a file named 'Score'",
                "choice_b": "Inserts the value of 'points' into the string",
                "choice_c": "Formats 'points' as a filename",
                "choice_d": "This is invalid syntax",
                "correct_answer": "B",
                "explanation": "f-strings (formatted strings) insert variable values using {variable}.",
                "concept_tags": ["f-strings", "formatting"]
            },
            
            # ==================== PYTHON - LISTS ====================
            {
                "skill_category": "Python - Lists",
                "question_text": "How do you create a list with 1, 2, 3?",
                "choice_a": "list = (1, 2, 3)",
                "choice_b": "list = [1, 2, 3]",
                "choice_c": "list = {1, 2, 3}",
                "choice_d": "list = <1, 2, 3>",
                "correct_answer": "B",
                "explanation": "Lists use square brackets [] to hold multiple values.",
                "concept_tags": ["lists", "creation"]
            },
            {
                "skill_category": "Python - Lists",
                "question_text": "How do you add an item to the end of a list?",
                "choice_a": "mylist.add(item)",
                "choice_b": "mylist.append(item)",
                "choice_c": "mylist.insert(item)",
                "choice_d": "mylist + item",
                "correct_answer": "B",
                "explanation": "append() adds an item to the end of a list.",
                "concept_tags": ["lists", "methods"]
            },
            {
                "skill_category": "Python - Lists",
                "question_text": "If colors = ['red', 'green', 'blue'], what is colors[1]?",
                "choice_a": "'red'",
                "choice_b": "'green'",
                "choice_c": "'blue'",
                "choice_d": "1",
                "correct_answer": "B",
                "explanation": "Index 1 is the second item (0-based indexing). colors[1] is 'green'.",
                "concept_tags": ["indexing", "lists"]
            },
            {
                "skill_category": "Python - Lists",
                "question_text": "How do you find how many items are in a list?",
                "choice_a": "mylist.count()",
                "choice_b": "mylist.size()",
                "choice_c": "len(mylist)",
                "choice_d": "mylist.length",
                "correct_answer": "C",
                "explanation": "len() returns the number of items in a list (or string).",
                "concept_tags": ["length", "functions"]
            },
            {
                "skill_category": "Python - Lists",
                "question_text": "What does 'for item in mylist:' do?",
                "choice_a": "Checks if item is in mylist",
                "choice_b": "Loops through each item in mylist one at a time",
                "choice_c": "Adds item to mylist",
                "choice_d": "Removes item from mylist",
                "correct_answer": "B",
                "explanation": "for-in loops iterate through each element in the list.",
                "concept_tags": ["loops", "iteration"]
            },
            
            # ==================== PYTHON - LOOPS ====================
            {
                "skill_category": "Python - Loops",
                "question_text": "What does range(5) produce?",
                "choice_a": "1, 2, 3, 4, 5",
                "choice_b": "0, 1, 2, 3, 4",
                "choice_c": "0, 1, 2, 3, 4, 5",
                "choice_d": "5",
                "correct_answer": "B",
                "explanation": "range(5) produces 5 numbers starting from 0: 0, 1, 2, 3, 4.",
                "concept_tags": ["range", "sequences"]
            },
            {
                "skill_category": "Python - Loops",
                "question_text": "How do you exit a loop early?",
                "choice_a": "exit",
                "choice_b": "stop",
                "choice_c": "break",
                "choice_d": "end",
                "correct_answer": "C",
                "explanation": "'break' immediately exits the loop it's inside.",
                "concept_tags": ["break", "control flow"]
            },
            {
                "skill_category": "Python - Loops",
                "question_text": "What does 'continue' do in a loop?",
                "choice_a": "Exits the loop",
                "choice_b": "Skips to the next iteration",
                "choice_c": "Repeats the current iteration",
                "choice_d": "Pauses the loop",
                "correct_answer": "B",
                "explanation": "'continue' skips the rest of the current iteration and moves to the next.",
                "concept_tags": ["continue", "control flow"]
            },
            {
                "skill_category": "Python - Loops",
                "question_text": "What does 'while x < 10:' do?",
                "choice_a": "Runs exactly 10 times",
                "choice_b": "Keeps running as long as x is less than 10",
                "choice_c": "Sets x to 10",
                "choice_d": "Runs once if x < 10",
                "correct_answer": "B",
                "explanation": "'while' loops continue as long as the condition remains True.",
                "concept_tags": ["while", "conditions"]
            },
            {
                "skill_category": "Python - Loops",
                "question_text": "What's the output of: for i in range(3): print(i)",
                "choice_a": "1 2 3",
                "choice_b": "0 1 2",
                "choice_c": "0 1 2 3",
                "choice_d": "3",
                "correct_answer": "B",
                "explanation": "range(3) gives 0, 1, 2 and each is printed on a new line.",
                "concept_tags": ["range", "output"]
            },
            
            # ==================== PYTHON - FUNCTIONS ====================
            {
                "skill_category": "Python - Functions",
                "question_text": "How do you define a function named 'greet'?",
                "choice_a": "function greet():",
                "choice_b": "def greet():",
                "choice_c": "create greet():",
                "choice_d": "func greet():",
                "correct_answer": "B",
                "explanation": "'def' is the keyword to define functions in Python.",
                "concept_tags": ["def", "definition"]
            },
            {
                "skill_category": "Python - Functions",
                "question_text": "What does 'return' do in a function?",
                "choice_a": "Prints a value",
                "choice_b": "Sends a value back to where the function was called",
                "choice_c": "Ends the program",
                "choice_d": "Creates a variable",
                "correct_answer": "B",
                "explanation": "'return' sends a value back to the caller and exits the function.",
                "concept_tags": ["return", "output"]
            },
            {
                "skill_category": "Python - Functions",
                "question_text": "What is a parameter?",
                "choice_a": "A function's name",
                "choice_b": "A value received by a function when called",
                "choice_c": "A type of loop",
                "choice_d": "A return value",
                "correct_answer": "B",
                "explanation": "Parameters are variables that receive values when the function is called.",
                "concept_tags": ["parameters", "inputs"]
            },
            {
                "skill_category": "Python - Functions",
                "question_text": "What's wrong with: def add(a, b) return a + b",
                "choice_a": "add is a reserved word",
                "choice_b": "Missing colon after the parentheses",
                "choice_c": "return should be print",
                "choice_d": "a and b need types",
                "correct_answer": "B",
                "explanation": "Function definitions need a colon: def add(a, b): return a + b",
                "concept_tags": ["syntax", "colon"]
            },
            {
                "skill_category": "Python - Functions",
                "question_text": "What's the difference between print() and return?",
                "choice_a": "They do the same thing",
                "choice_b": "print displays output, return sends a value back to the caller",
                "choice_c": "return is faster",
                "choice_d": "print only works with strings",
                "correct_answer": "B",
                "explanation": "print() displays to screen, return sends a value back to be used in code.",
                "concept_tags": ["print", "return"]
            }
        ]
        
        # Insert all skill quiz questions
        for q in skill_quiz_questions:
            question_doc = {
                "id": str(uuid.uuid4()),
                "skill_category": q["skill_category"],
                "question_text": q["question_text"],
                "choice_a": q["choice_a"],
                "choice_b": q["choice_b"],
                "choice_c": q["choice_c"],
                "choice_d": q["choice_d"],
                "correct_answer": q["correct_answer"],
                "explanation": q.get("explanation", ""),
                "concept_tags": q.get("concept_tags", []),
                "creator_id": "system",
                "creator_name": "System",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.skill_quiz_questions.insert_one(question_doc)
        
        final_count = await db.skill_quiz_questions.count_documents({})
        logger.info(f"✅ Skill quiz questions seeded: {final_count}")
    except Exception as e:
        logger.error(f"Error seeding skill quiz questions: {str(e)}")

        logger.error(f"Error seeding Micro:bit problems: {str(e)}")