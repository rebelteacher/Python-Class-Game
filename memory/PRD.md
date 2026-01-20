# ByteSize Learning - Product Requirements Document

## Overview
A coding education platform for K-12 students featuring multiple programming environments: Blocks, Turtle Graphics, Python, and Micro:bit.

## Current Curriculum Structure
- **Unit 1**: Turtle Blocks (Visual block-based turtle programming - NEW!)
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
- Support for: forward, backward, left, right, goto, circle (with extent), penup, pendown, color, home, etc.

### Turtle Blocks (NEW - Unit 1)
- Visual block-based programming using Blockly
- **Motion blocks**: forward, backward, left, right, goto, home
- **Pen blocks**: penup, pendown, color, pensize
- **Loop blocks**: repeat N times, count with variable, while
- **Control blocks**: if, if-else
- **Logic blocks**: comparisons, and/or, not, boolean values
- **Variable blocks**: create, set, change, get variables
- **Math blocks**: numbers, arithmetic (+, -, ×, ÷), random
- Code toggle: Show generated Python code from blocks
- Live turtle canvas preview
- Replaces external Scratch integration

---

## Roadmap

### P0 - Completed This Session
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

### P1 - Next Priority
- [ ] Fix students not seeing expected output image (may need backend check)
- [ ] Extend custom curriculum feature to Python/Turtle/Micro:bit
- [ ] End-to-end quiz flow testing

### P2 - Upcoming
- [ ] **Turtle Blocks** (replaces Scratch) - See detailed spec below
- [ ] Brain Break Games integration
- [ ] Build out remaining curriculum units

### P3 - Future
- [ ] Self-Paced Learning Module
- [ ] AI-powered code feedback
- [ ] Parent portal

---

## Feature Spec: Turtle Blocks (P2)

### Purpose
Replace the external Scratch link with an integrated block-based turtle programming environment. Serves as a **review tool** for students who have already been exposed to Code.org Unit 3 (approximately 10 hours of instruction).

### User Experience
```
┌─────────────────────────────────────────────────────────────┐
│  BLOCKS (drag & drop)          │  GENERATED PYTHON CODE     │
│  ┌─────────────────────┐       │  import turtle             │
│  │ Move forward [100]  │       │  t = turtle.Turtle()       │
│  └─────────────────────┘       │  t.forward(100)            │
│  ┌─────────────────────┐       │  t.right(90)               │
│  │ Turn right [90]     │       │                            │
│  └─────────────────────┘       │                            │
│────────────────────────────────┴────────────────────────────│
│              🐢 TURTLE CANVAS (AnimatedTurtle)              │
└─────────────────────────────────────────────────────────────┘
```

### Learning Progression
1. **Unit 1: Turtle Blocks** - Drag & drop, see Python code generated
2. **Unit 2: Turtle Text** - Write Python turtle code directly
3. **Unit 3: Python** - General programming

### Benefits Over Scratch
| Scratch (Current) | Turtle Blocks (Proposed) |
|-------------------|-------------------------|
| External website | Integrated in app |
| Different concepts | Same turtle commands |
| No code visibility | Shows generated Python |
| Screenshot grading | Pattern-based grading |
| No transition path | Natural blocks → text progression |

### Technical Requirements

#### Blockly Toolbox Categories
1. **Movement**: forward, backward, goto, home
2. **Turning**: left, right, setheading
3. **Pen**: penup, pendown, pensize, pencolor
4. **Drawing**: circle, dot, stamp
5. **Control**: repeat loop, variables
6. **Color**: color picker for pen/fill

#### Code Generator
- Blocks → Python turtle code (real-time)
- Generated code displayed alongside blocks
- Same code runs in AnimatedTurtle component

#### Design Considerations
- **IMPORTANT**: Reduce spacing around blocks - previous Blockly implementation had blocks that didn't fit well
- Compact block design for smaller screens
- Match existing app color scheme
- Mobile-friendly touch targets

#### Grading
- Uses existing pattern-based test case system
- Teacher creates test cases same way as turtle text problems
- Grading runs against generated Python code

### Files to Modify/Create
- `TurtleBlockEditor.jsx` - New component
- `TurtleCurriculum.jsx` - Add Turtle Blocks section
- Custom Blockly block definitions
- Code generator functions

### Estimated Effort
1-2 focused sessions for v1

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
- `/app/frontend/src/components/AnimatedTurtle.jsx` - Turtle graphics engine
- `/app/frontend/src/pages/AssignmentPage.jsx` - Student assignment view
- `/app/frontend/src/pages/AssignmentLibrary.jsx` - Teacher problem management
- `/app/backend/server.py` - API endpoints
- `/app/backend/turtle_sim.py` - Backend turtle simulator

---

## Known Issues

### Carried Over
- Fragile layout on AssignmentPage.jsx (react-resizable-panels)
- Assignment creation classroom_ids bug (potential)

### To Investigate
- Students may not see expected turtle output image in some cases

---

*Last Updated: January 2025*
