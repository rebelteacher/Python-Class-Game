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
- Support for: forward, backward, left, right, goto, circle (with extent), penup, pendown, color, home, write, hideturtle, showturtle, etc.

### Turtle Blocks (Unit 1) - UPDATED Jan 2025
- Visual block-based programming using Blockly
- **Full-screen layout** for students (Instructions | TurtleBlocklyEditor with inline preview)
- **Flyout auto-close** fixed via CSS scrollbar hiding
- **25% smaller blocks** for better workspace utilization
- **Full Blockly toolbox** with all standard categories:
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
- Blockly (block programming)
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

*Last Updated: January 26, 2025*
