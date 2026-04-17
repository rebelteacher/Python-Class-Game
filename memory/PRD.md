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
- **Question Bank Block Mode** (March 2025) - Teachers can use visual Blockly-style blocks as answer choices in multiple choice questions
  - Toggle between Text Mode and Block Mode
  - Dropdown with all block categories: Motion, Pen, Looks, Sensing, Events, Loops, Control, Logic, Variables, Math, Text, Lists
  - Visual CSS-rendered blocks matching Blockly appearance (not actual Blockly instances)

### Student Features
- Assignment completion with auto-grading
- Live turtle graphics preview
- Code editor with syntax highlighting
- Test taking with results review (now supports visual block answers)
- Progress tracking and XP system

### Turtle Graphics System
- Live AnimatedTurtle component with play controls
- Pattern-based test case grading with count support
- Grid toggle and coordinate hover display
- Code line highlighting during animation
- **List variable support** (Feb 2025)
- **Multi-line list support** (Feb 2025)
- **Event-driven programming** (March 2025)
- **User-defined function support** (March 2025): `def` and parameterized function calls parsed and executed
- **Runtime variable evaluation** (March 2025): All numeric commands evaluate variables at runtime, not parse-time
- **Background color block** (March 2025): `turtle_bgcolor` block sets canvas background color

### Turtle Blocks (Unit 1) - UPDATED March 2025
- Visual block-based programming using Blockly
- **Full-screen layout** for students
- **Runtime random evaluation** (March 2025): Random values re-evaluated each run
- **While loop variable support** (March 2025): Variables in while conditions evaluated at runtime
- **Say block with variables** (March 2025): Say blocks display variable values
- **Runtime variable evaluation for all commands** (March 2025): goto, forward, backward, right, left, setheading, pensize, dot, circle all evaluate variables at runtime
- **If block runtime conditions** (March 2025): Conditions evaluated with active variable state
- **For loop counter injection** (March 2025): For loop counters accessible as variables inside conditional logic
- **Background color block** (March 2025): bgcolor block with canvas sync via useRef
- **Math subtraction fix** (March 2025): SUBTRACT maps correctly to MINUS operator
- **Complete block dropdown in Question Bank** (March 2025): All 85+ block types across 12 categories available for test choices

### Question Bank & Test System (March 2025)
- **Block Mode for answer choices**: Visual Blockly-style blocks as MC answer options
- **BlockRenderer component**: Pure CSS/React rendering of block shapes with colors, input slots, and connectors
- **Hidden select overlay**: Native HTML select with transparent overlay for seamless block selection
- **Category-grouped dropdown**: Blocks organized by Motion, Pen, Looks, Sensing, Events, Loops, Control, Logic, Variables, Math, Text, Lists
- **Backend AST grading updates**: Correctly counts if statements, variables, say, and bgcolor commands

### Teacher Panel (Jan 2025)
- Collapsible sidebar on right side of AssignmentPage
- Student list with color-coded progress badges
- Click to view student code (read-only)
- Section/Classroom filter and sort options

### Block Problem Creation Workflow (Jan 2025)
- Blockly editor for Starter Blocks and Solution Blocks
- Lesson Materials support
- Automatic Python code generation from blocks
- XML persistence for block configurations

---

## Roadmap

### Completed (March 2025)
- [x] **Question Bank Block Mode** (March 2025) - Visual block rendering in MC question choices
  - BlockRenderer with Blockly CSS styling
  - 85+ block types across 12 categories in dropdown
  - Matching renderer in TestTaking.jsx for students
- [x] **User-Defined Function Support** (March 2025) - AnimatedTurtle parser handles `def` and parameterized function calls
- [x] **Background Color Block** (March 2025) - turtle_bgcolor block with canvas sync via useRef (no flashing)
- [x] **If Block Runtime Evaluation** (March 2025) - Raw conditions evaluated at runtime with active variables
- [x] **For Loop Counter Injection** (March 2025) - Loop counters injected as hidden set_variable for conditional access
- [x] **Backend Grading Fixes** (March 2025) - AST logic correctly counts if, variables, say, bgcolor
- [x] **Math Subtraction Fix** (March 2025) - SUBTRACT correctly maps to MINUS operator
- [x] **Say Block String Fix** (March 2025) - Handles string literals properly
- [x] **Runtime Variable Evaluation Fix** (March 2025) - goto, forward, backward, right, left, setheading, pensize, dot, circle use runtime values
- [x] **Text-Based Turtle Events Support** (March 2025) - Full event support for Python turtle (Unit 2)

### Completed (Feb 2025)
- [x] **Turtle Fill Bug Fix** - Self-intersecting polygon fill
- [x] **Circle Fill Bug Fix** - Circles fill with fillcolor/begin_fill/end_fill
- [x] **Background Color Support** - screen.bgcolor() and turtle.bgcolor()
- [x] **Lesson Plan Generator** - AI-powered multi-day lesson plans with Gemini
- [x] **Events Blocks Implementation** - 4 event blocks for interactive programs

### Completed (Jan 2025)
- [x] Problem library limit increased
- [x] Test case grading bugs fixed
- [x] Teacher Panel
- [x] Block Problem Creation Workflow
- [x] Looks blocks, MC Test features, Grid toggle, etc.

### Completed (April 17, 2025)
- [x] **Whitespace-Tolerant Pattern Matching** - Pattern grading now normalizes whitespace around commas, parentheses, and brackets so `display.set_pixel(0,0,9)` matches `display.set_pixel(0, 0, 9)`. Preserves spaces inside string literals. Applied to both Micro:bit and Turtle/Block grading.
- [x] **Alternate Patterns Field** - Teachers can add optional alternate accepted patterns per test case in the Micro:bit pattern check UI (both Create and Edit forms). Useful for accepting genuinely different code approaches.

### Completed (April 15, 2025)
- [x] **WebUSB Flash with LittleFS Code Embedding** - Fixed P0 bug where flashing to physical micro:bit devices silently failed. The `flashToDevice` function now uses client-side `@microbit/microbit-fs` to embed user Python code as `main.py` into the MicroPython V2.1.2 firmware's LittleFS filesystem, creates a Universal Hex, and flashes via WebUSB. No backend API dependency.

### Completed (April 12, 2025)
- [x] **Micro:bit Simulator in Teacher Problem Editor** - Teachers now have a split-view code editor + Micro:bit simulator when creating or editing Micro:bit problems in the Assignment Library. Mirrors the student experience. Works in both Create and Edit dialogs.

### Completed (March 28, 2025)
- [x] **Question Bank Block Dropdown** - Verified all 85+ block types across 12 categories render correctly in QuestionBank.jsx and TestTaking.jsx
- [x] **Chapter 5 Editable Code** - Added `editableCode` prop to TurtleBlocklyEditor. When enabled (auto-detected for Chapter 5 problems), the Code view shows a full Monaco Python editor instead of read-only output. Students can type Python code, run it, and toggle back to blocks. Includes "Reset to blocks" button.

### P0 - Immediate
- [x] WebUSB Flash with LittleFS Code Embedding (Fixed April 15, 2025)
- [ ] Verify sensing blocks (x position, y position) have correct shape for logic comparison blocks

### P1 - Next Priority
- [ ] Synchronize TurtleBlocks.jsx and TurtleBlocklyEditor.jsx features
- [ ] Implement "One-Click Assign" feature (add problem to class from lesson plan)
- [ ] Direct Image Upload for Lesson Materials
- [ ] End-to-end quiz flow testing

### P2 - Upcoming
- [ ] Add "distance to x, y" block to block editor
- [ ] Refactor AnimatedTurtle.jsx parser into separate testable module
- [ ] Unify block definitions between editor components (reduce duplication)
- [ ] Build out remaining curriculum units (Networking, Cybersecurity, AI)

### P3 - Future
- [ ] Self-Paced Learning Module
- [ ] AI-powered code feedback
- [ ] Parent portal

---

## Technical Architecture

### Frontend Stack
- React 18
- Monaco Editor (code editing)
- Blockly 10.4.3 (block programming)
- Tailwind CSS + shadcn/ui
- AnimatedTurtle component (custom parser + runtime engine)

### Backend Stack
- FastAPI (Python)
- MongoDB
- Pillow (turtle image generation)
- Custom turtle_sim.py simulator

### Key Files
- `/app/frontend/src/components/AnimatedTurtle.jsx` - Turtle graphics engine (2300+ lines, monolithic)
- `/app/frontend/src/components/TurtleBlocklyEditor.jsx` - Blockly editor component
- `/app/frontend/src/pages/QuestionBank.jsx` - Question bank with Block Mode
- `/app/frontend/src/pages/TestTaking.jsx` - Student test UI with block rendering
- `/app/frontend/src/pages/AssignmentLibrary.jsx` - Teacher problem management
- `/app/frontend/src/pages/AssignmentPage.jsx` - Student/Teacher assignment view
- `/app/frontend/src/pages/TurtleBlocks.jsx` - Standalone Blockly turtle editor
- `/app/backend/server.py` - API endpoints + grading logic

---

## Known Issues

### Carried Over (P2)
- Fragile layout on AssignmentPage.jsx (react-resizable-panels)
- Assignment creation classroom_ids bug (potential)
- Sensing blocks may have wrong shape for logic comparison blocks (needs verification)

### Architecture Debt
- AnimatedTurtle.jsx is a 2300+ line monolith with fragile regex-based parsing
- Block definitions duplicated between TurtleBlocks.jsx and TurtleBlocklyEditor.jsx
- Parse-time vs runtime evaluation pattern has been a recurring source of bugs

---

*Last Updated: April 17, 2025*
