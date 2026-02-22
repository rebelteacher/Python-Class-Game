# ByteSize Learning - Product Requirements Document

## Overview
A coding education platform for K-12 students featuring multiple programming environments: Blocks, Turtle Graphics, Python, and Micro:bit.

## Current Curriculum Structure
- **Unit 1**: Turtle Blocks (Visual block-based turtle programming)
- **Unit 2**: Turtle Graphics (Python turtle with visual output)
- **Unit 3**: Python (Text-based programming)
- **Unit 4**: Micro:bit (Hardware programming)
- **Future Units**: Networking, Cybersecurity, AI

## Core Features Implemented

### Teacher Features
- Classroom management
- Assignment library with problem creation
- Test builder (MC tests + Coding tests)
- Test reports with release controls
- Question bank with filtering and bulk edit
- Skill quiz manager
- **Teacher Panel** - View student progress and code submissions (Jan 2025)
- **Block Problem Creation** - Teachers create block assignments using Blockly editors (Jan 2025)
- **AI Lesson Plan Generator** - Generate multi-day lesson plans using Gemini AI (Feb 2025)
  - Custom standards & learning objectives input
  - Problem filtering by Unit/Chapter (with dropdown showing "Unit - Chapter" format)
  - Word document (.docx) export
  - Properly formatted Learner Outcomes section

### Student Features
- Assignment completion with auto-grading
- Live turtle graphics preview
- Code editor with syntax highlighting
- Test taking with results review
- Progress tracking and XP system

### Turtle Graphics System
- Live AnimatedTurtle component with play controls
- Pattern-based test case grading with count support
- Grid toggle and coordinate hover display
- Code line highlighting during animation
- **List variable support** (Feb 2025): `colors = ["red", "blue"]` with `pencolor(colors[i])` and modulo cycling
- **Multi-line list support** (Feb 2025): Parser now handles lists spanning multiple lines with inline comments
- Support for: forward, backward, left, right, goto, circle (with extent), penup, pendown, color, pencolor, fillcolor, home, write, hideturtle, showturtle, etc.

### Turtle Blocks (Unit 1) - UPDATED Feb 2025
- Visual block-based programming using Blockly
- **Full-screen layout** for students (Instructions | TurtleBlocklyEditor with inline preview)
- **Flyout auto-close** fixed via CSS scrollbar hiding
- **25% smaller blocks** for better workspace utilization
- **Full Blockly toolbox** with all standard categories:
  - **🚩 Events blocks** (NEW Feb 2025): when program starts, when key pressed, when turtle clicked, when mouse moves
  - **Motion blocks**: forward, backward, left, right, goto, home
  - **Pen blocks**: penup, pendown, color, pensize
  - **Looks blocks**: say (write text), say for seconds, hide turtle, show turtle
  - **Loop blocks**: repeat, for, while, forEach, flow control
  - **Control blocks**: if, if-else (both turtle-specific and standard Blockly)
  - **Logic blocks**: comparisons, and/or, not, boolean values, null, ternary
  - **Math blocks**: numbers, arithmetic, trig, constants, random, modulo, constrain
  - **Text blocks**: text manipulation, join, length, indexOf, substring, print, prompt
  - **Lists blocks**: create, repeat, length, indexOf, getIndex, setIndex, sort, reverse
  - **Variables**: Custom variable creation with "Create variable..." button
  - **Functions**: Custom function/procedure creation
- **Event-driven programming** - Students can create interactive programs that respond to:
  - Keyboard events (space, arrow keys, letters a-d, w, s, any key)
  - Turtle click events
  - Mouse movement events
  - Program start events
- "Events Active" indicator shows when event handlers are running
- Code toggle: Show generated Python code from blocks
- Live turtle canvas preview (larger size: 300x300px)
- Replaces external Scratch integration

### Teacher Panel (Jan 2025)
A sidebar panel similar to code.org that allows teachers to view student progress and code submissions during live lessons.

**Features:**
- Collapsible sidebar on right side of AssignmentPage
- "Me" section for teacher demo/example solution
- Student list with color-coded badges:
  - 🟢 Green = Done (student clicked "Done")
  - 🟡 Yellow = Started (has submissions but not done)
  - 🔴 Red = Not started (no work)
- Click any student to view their code (read-only)
- Section/Classroom filter
- Sort options (display name, status, score)
- Summary footer showing completion counts

**API Endpoints:**
- `GET /api/assignments/{id}/student-progress` - Returns aggregated student progress per problem
- `GET /api/assignments/{id}/student-code/{student_id}/{problem_id}` - Returns specific student's code submission

### Block Problem Creation Workflow (Jan 2025)
Teachers can now create "Block" type assignments using drag-and-drop Blockly editors instead of typing Python code.

**Features:**
- Blockly editor for creating Starter Blocks (what students see initially)
- Blockly editor for creating Solution Blocks (used for grading reference)
- Lesson Materials support (video URLs, image URLs, text, links)
- Automatic Python code generation from blocks
- XML persistence for block configurations
- Edit dialog also shows Blockly editors for existing block problems

**New Database Fields in Problem model:**
- `starter_blocks_xml: string` - XML representation of starter blocks
- `solution_blocks_xml: string` - XML representation of solution blocks
- `lesson_materials: List[dict]` - Array of {type, title, content} for instructional content

**Frontend Changes:**
- `AssignmentLibrary.jsx`: Create/Edit dialogs conditionally show TurtleBlocklyEditor for block type
- Validation checks `solution_blocks_xml` instead of `solution_code` for block assignments

---

## Roadmap

### Completed (Feb 2025)
- [x] **Turtle Fill Bug Fix** (Feb 22, 2025) - Fixed self-intersecting polygon fill for shapes like 5-pointed stars:
  - Backend `turtle_sim.py`: Added `_fill_polygon_nonzero()` method that calculates inner intersection points and fills them separately to match Python turtle's nonzero winding rule behavior
  - Frontend `AnimatedTurtle.jsx`: Updated to use `ctx.fill('nonzero')` for canvas rendering
  - Stars, pentagrams, and other self-intersecting shapes now fill completely including the center
- [x] **fillcolor() Command Support** (Feb 22, 2025) - Added `fillcolor()` method to turtle simulator for setting fill color
- [x] **begin_fill()/end_fill() Support** (Feb 22, 2025) - Implemented fill tracking and polygon rendering
- [x] **Lesson Plan Generator** (Feb 13, 2025) - AI-powered lesson plan creator for teachers:
  - Editable header fields saved to localStorage (School Name, Teacher Name, Class Name, Lesson Range, Pacing times, Next Major Assessment)
  - **Standards & Objectives Input**: Teachers can paste their specific standards (CCSS, ISTE, etc.) and learning objectives - AI incorporates them into generated lessons
  - **Unit/Chapter Problem Filter**: Specify exact unit/chapter (e.g., "Unit 2: Turtle Graphics", "Chapter 3: Colors") to pull practice problems ONLY from that section
  - AI generates comprehensive multi-day lesson plans using Gemini (gemini-3-flash-preview)
  - 14 lesson plan sections per day: Learner Outcomes (bulleted list format), Standards, Anticipatory Set, Teaching the Lesson, Modeling, Instructional Strategies, Checks for Understanding, Guided Practice, Independent Practice, Closure, Formative Assessment, Summative Assessment Date, Extended Activities, Review/Reteach Activities
  - Bold questions/prompts generated for teacher use
  - **App Problem Integration**: Automatically pulls relevant problems from the app's library for Guided Practice and Independent Practice sections
  - "Suggested App Problems" panels with copy/open links for easy assignment
  - All sections editable after generation
  - **Export as Word Document**: Download button generates .docx file for admin submission
  - Save, load, delete lesson plans
  - Print-friendly output
  - Route: /lesson-plans (teacher-only)
- [x] **Events Blocks Implementation** - 4 new event blocks for interactive programs:
  - "when program starts" - runs code at startup
  - "when key pressed" - responds to keyboard events (space, arrows, letters, any)
  - "when turtle clicked" - responds to mouse clicks on turtle
  - "when mouse moves" - responds to mouse movement
- [x] Event handlers generate Python functions (def on_key_space(): etc.)
- [x] Keyboard event listeners in AnimatedTurtle for real-time key detection
- [x] "Events Active" indicator when event mode is running
- [x] Lesson 3: Events & Triggers problems now solvable
- [x] **Fixed Event Handler Timing Bug** - Fixed issue where eventHandlersRef was stale when startEventMode ran (Feb 3, 2025)
- [x] **Fixed "say" block (write command)** - Added write() method to turtle_sim.py and both MockTurtle classes in server.py
- [x] **Fixed function-skipping in parseCode** - Code inside event handler functions was incorrectly running on startup
- [x] **Fixed event mode activation** - runInstant() and play() now properly activate event mode after running startup code
- [x] **Fixed dialog closing on button click** - Added e.stopPropagation() to AnimatedTurtle control buttons
- [x] **Fixed block code saving** - Student block XML now saves to localStorage and restores on page refresh
- [x] **Fixed backend preview for event-based code** - Backend now auto-executes all event handler functions when generating preview images, so "Expected Output" shows the complete result

### Completed (Jan 2025)
- [x] Problem library limit increased (1000 → 10000)
- [x] Test case grading bugs fixed
- [x] Turtle functions expanded (home, circle extent, etc.)
- [x] Test case table UI for turtle problems
- [x] Grid toggle button for students
- [x] MC Test: Show missed questions
- [x] MC Test: Allow retakes setting
- [x] MC Test: Release results feature
- [x] Question bank line breaks preserved
- [x] Turtle coding tests show turtle canvas
- [x] Preview vs Expected Output now match
- [x] Hover coordinates display on turtle canvas
- [x] Teacher preview with run controls
- [x] Code line highlighting during turtle animation
- [x] Turtle Blocks feature (replaces Scratch)
- [x] **Teacher Panel** - View student progress and code during live lessons
- [x] **Looks blocks** - say, say for seconds, hide/show turtle
- [x] **Block Problem Creation Workflow** - Teachers create block problems with Blockly editors
- [x] **Blockly Number Input Bug Fix** - Fixed issue where users couldn't type in number fields inside dialogs (Jan 31, 2025)

### P1 - Next Priority
- [ ] Direct Image Upload for Lesson Materials (instead of pasting URLs, with click-to-enlarge for students)
- [ ] Extend custom curriculum feature to Python/Turtle/Micro:bit
- [ ] Fix students not seeing expected output image (may need backend check)
- [ ] End-to-end quiz flow testing

### P2 - Upcoming
- [ ] Brain Break Games integration
- [ ] Build out remaining curriculum units

### P3 - Future
- [ ] Self-Paced Learning Module
- [ ] AI-powered code feedback
- [ ] Parent portal
- [ ] Add more Turtle Blocks types (circle, fill, stamp)
- [ ] Student-facing features for Turtle Blocks (save/load projects, challenges)

---

## Technical Architecture

### Frontend Stack
- React 18
- Monaco Editor (code editing)
- Blockly 10.4.3 (block programming - downgraded from v12 for stability)
- Tailwind CSS + shadcn/ui
- AnimatedTurtle component (custom)

### Backend Stack
- FastAPI (Python)
- MongoDB
- Pillow (turtle image generation)
- Custom turtle_sim.py simulator

### Key Files
- `/app/frontend/src/components/AnimatedTurtle.jsx` - Turtle graphics engine (supports write command)
- `/app/frontend/src/components/TeacherPanel.jsx` - Teacher Panel sidebar
- `/app/frontend/src/components/TurtleBlocklyEditor.jsx` - Reusable Blockly editor component for block problems
- `/app/frontend/src/components/ui/dialog.jsx` - Dialog component (modified to support `modal={false}` for Blockly compatibility)
- `/app/frontend/src/pages/AssignmentPage.jsx` - Student/Teacher assignment view
- `/app/frontend/src/pages/AssignmentLibrary.jsx` - Teacher problem management (with Blockly editors for block type)
- `/app/frontend/src/pages/TurtleBlocks.jsx` - Blockly editor for turtle programming (with Looks category)
- `/app/backend/server.py` - API endpoints
- `/app/backend/turtle_sim.py` - Backend turtle simulator

---

## Known Issues

### Carried Over (P2)
- Fragile layout on AssignmentPage.jsx (react-resizable-panels)
- Assignment creation classroom_ids bug (potential)

### To Investigate
- Students may not see expected turtle output image in some cases

---

*Last Updated: February 3, 2025*
