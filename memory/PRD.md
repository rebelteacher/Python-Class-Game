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
- **Ordered Execution Check** scoring method (Feb 2026) — teachers can grade turtle/block problems by comparing the **order** of executed turtle commands against a `target_sequence` instead of visual output. On mismatch, students see: `Step [X] was ``[method]``, try that again and resubmit.` — perfect for debugging tasks. Backward-compatible: existing problems default to `text_match` scoring. Fields added: `Problem.scoring_method`, `Problem.target_sequence`. Turtle simulator now exposes `commands_used` in tracking_data.

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

### Phase 2: Student Lesson Flow (In Progress, May 2025)
- [x] **Leaderboard Redesign** — New 3-category leaderboard on Student Dashboard: Class Rank, Teacher Rank, Overall Rank. Top 3 per category with gold/silver/bronze badges. Backend: `GET /api/leaderboard/ranks/:studentId`
- [x] **Backend: Curriculum Units API** (`/api/curriculum/units`) — Returns all units with chapters, lessons, and problem counts
- [x] **Backend: Lesson Problems API** (`/api/curriculum/lesson-problems`) — Returns problems for a specific lesson sorted by type (Class Practice → Paired → Independent → Challenge), formatted like an assignment
- [x] **Backend: Lesson Submissions** — Updated submission endpoint to accept lesson-based submissions (no real assignment document needed)
- [x] **Frontend: LessonPage wrapper** — Fetches lesson data and passes to AssignmentPage
- [x] **Frontend: AssignmentPage accepts lessonData prop** — Reuses the existing 3-column layout for both assigned and auto-loaded lessons
- [x] **Lesson Instructions**: Teacher-editable markdown instructions per lesson, stored in `lesson_instructions` collection. Teachers see Edit button, students see formatted read-only view. Supports full markdown (headings, bold, code blocks, bullets) with cyberpunk styling (cyan/pink/lime).
- [x] **Route**: `/lesson/:assignmentType/:chapter/:lesson` — Directly navigable lesson URLs

### Completed (May 2025)
- [x] **Phase 1: Cyberpunk Design Overhaul** - Applied futuristic dark theme across the entire app inspired by CyberCode Nexus:
  - CSS variables updated to dark cyberpunk palette (deep black #0A0E17, navy #0F172A, neon cyan #00F0FF, neon pink #FF00AA, neon lime #39FF14)
  - Custom fonts: Chakra Petch (headings/body), Orbitron (buttons/badges/nav), Fira Code (code)
  - Tailwind config extended with cyber-* color tokens and font families
  - Landing page fully redesigned: dark background, neon glow effects, sharp edges, grid background
  - Teacher Login: glassmorphism card with neon accents
  - Teacher Dashboard: dark sidebar, neon unit cards, glowing classroom cards with rotating neon accents
  - Student Dashboard: dark nav with neon branding
  - Assignment Library: dark nav, neon buttons
  - ClassroomPage: dark cards, neon accents
  - All 50+ page backgrounds converted from light gradients to dark cyber-black
  - All nav bars updated to dark glassmorphism style
  - All bg-white cards → bg-cyber-navy/60, all gray text → slate equivalents
  - All indigo/teal buttons → cyber-cyan neon buttons
  - All gray borders → subtle cyber-cyan borders
  - Custom scrollbar styling, neon text glow utilities, cyber grid background

### Completed (April 17, 2025)
- [x] **Whitespace-Tolerant Pattern Matching** - Pattern grading now normalizes whitespace around commas, parentheses, and brackets so `display.set_pixel(0,0,9)` matches `display.set_pixel(0, 0, 9)`. Preserves spaces inside string literals. Applied to both Micro:bit and Turtle/Block grading.
- [x] **Alternate Patterns Field** - Teachers can add optional alternate accepted patterns per test case in the Micro:bit pattern check UI (both Create and Edit forms). Useful for accepting genuinely different code approaches.
- [x] **Micro:bit Simulator Variable Tracking & Button Interactivity** - Simulator now supports variables (`count = 0`, `count = count + 1`, `count += 1`), resolves variables in `display.show(count)`, and maintains persistent variable state across button clicks. Buttons A/B correctly execute their conditional blocks without resetting state.
- [x] **A+B Button for Simulator** - Added dedicated "A+B" button below the micro:bit board for combined button press. Parser detects `button_a.is_pressed() and button_b.is_pressed()` combined conditions and only executes those blocks when both buttons are pressed simultaneously.

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

### Feb 2026 — Cyberpunk Redesign + Curriculum Auto-Assign
- Phase 1 Cyberpunk UI overhaul (CyberRain particle bg, neon palette, Orbitron/Chakra fonts)
- Auto-assigned curriculum lesson flow (3-column lesson layout)
- AdminLessonManager (add/rename/delete lessons & problems)
- Classroom archive + Lesson Locks (teacher tab)
- Markdown rendering for lesson instructions + problem descriptions
- Leaderboard redesign (overall / teacher / class ranks)
- Block grading engine fixed (event blocks, empty dropdowns) — 37% → 100% accuracy
- Removed legacy "My Assignments" block from StudentDashboard (students enter via curriculum)
- Fixed StudentDashboard.jsx parsing error from incremental edit corruption
- Added "Continue where you left off" hero card on StudentDashboard with `GET /api/student/last-activity` endpoint (deep-links into last lesson + shows lesson progress bar)
- Removed the legacy "Assignments" tab + content entirely from ClassroomPage (students access problems via curriculum)
- Built Admin Test Library + bulk Test Assignment system:
  - New `test_assignments` collection (test_id, classroom_id, per-classroom available_from/due_at, allow_late/penalty, auto_release_results)
  - `GET /api/admin-tests/library` — returns master library (MC + coding tests where creator is_admin=true)
  - `POST /api/test-assignments/bulk` — assign one test to many classrooms with per-classroom scheduling (upserts on duplicate)
  - `GET /api/classrooms/{id}/test-assignments` — teacher sees all, student sees only available_from<=now (TZ-aware comparison)
  - `DELETE /api/test-assignments/{id}` — owning teacher only
  - ClassroomPage Tests tab: "Assign Test" dialog with searchable library, per-classroom datetime-local schedule, switches for allow-late + auto-release, late penalty % input
  - 21/21 pytest cases passing in `/app/backend/tests/test_test_assignments.py`
- Removed "View in Library" / "Problems" button completely from BlockCurriculum, PythonCurriculum, TurtleCurriculum (admins included)
- Surfaced orphan problems (lesson="") as a synthetic "(Unassigned)" lesson in `/api/curriculum/units` so admins can clean them up via the Lesson Manager. New endpoint `POST /api/curriculum/delete-orphan-problems` hard-deletes them.
- Curriculum Test Placements (Feb 2026):
  - `CurriculumTestPlacement` model + `curriculum_test_placements` collection
  - `POST /api/curriculum/test-placements` (admin) — attach MC/coding test as lesson_quiz or chapter_test
  - `DELETE /api/curriculum/test-placements/{id}` (admin)
  - `GET /api/curriculum/test-placements?assignment_type&chapter&lesson&classroom_id` — student-aware unlock state (per-progress + per-classroom teacher unlock)
  - `POST /api/classrooms/{id}/toggle-test-unlock` (teacher) — toggles `classrooms.unlocked_test_placements`
  - Frontend: AdminLessonManager shows "+ Quiz" per lesson and "Attach Chapter Test" row per chapter; LessonPage banner "Take Lesson Quiz" when all problems passing; `ChapterTestRow` component rendered in BlockCurriculum / TurtleCurriculum / PythonCurriculum; ClassroomPage Lesson Locks tab adds per-test Lock/Unlock toggles per chapter.
- Teacher Class Progress widget (Feb 2026):
  - `GET /api/classrooms/{id}/chapter-progress` — returns per-chapter completion stats (students who passed every problem in every lesson) + chapter_test placement + unlock state
  - ClassroomPage Lesson Locks tab now opens with a magenta "Class Progress" widget listing chapters with chapter tests assigned, each row showing a glow-progress bar, X/Y student readiness, and one-click "Unlock for class" / "Lock for class" CTA
- Site Traffic Analytics (Feb 28, 2026):
  - New `site_pageviews` collection storing anonymous page views (visitor_id, session_id, path, referrer_source, device_type, ip_hash)
  - `POST /api/analytics/pageview` — public anonymous tracking; auto-flags admin/teacher views so they can be excluded from stats
  - `GET /api/admin/analytics/traffic?days=N` — admin-only aggregation: total/unique/sessions, top pages, top referrers (Facebook/Google/Direct/etc.), device breakdown (Mobile/Desktop/Tablet), daily series, live visitor count (last 5min), **new vs returning visitor breakdown for today/7d/30d with return rate**
  - Frontend tracker `utils/siteAnalytics.js` + `PageViewTracker` in `App.js` records on every route change; auto-anonymizes IPs (SHA256 hash, no PII)
  - AdminAnalytics page restructured with Tabs: **Site Traffic** (new) + **Teacher Activity** (existing). Site Traffic shows live visitor count, KPI grid, **New vs Returning visitors card** (Today / 7d / 30d, with split-bar visualization + return rate), daily traffic mini-chart, top sources, device breakdown, and top-pages table
  - "Ignore my browser" toggle (localStorage `bb_analytics_excluded`) — per-device opt-out for admins to keep their own visits out of stats even when logged out
  - Range selector: Last 7d / 30d / 90d
  - Admin views are excluded from all stats so the dashboard reflects real visitor traffic only

- Rename / Merge Chapter (Feb 29, 2026 — production bug fix):
  - Root cause: there was previously only a `rename-lesson` endpoint, no rename-chapter. When a user edited a chapter name on individual problems, the curriculum page (built from `db.problems.distinct("chapter", ...)`) ended up showing two separate chapters for what was meant to be one (e.g. "Chapter 3: Colors" + "Chapter 3: Colors & Style"), so newly created problems with one spelling did not appear under the lesson page rendering the other spelling.
  - `POST /api/curriculum/rename-chapter` — admin-only; updates `problems.chapter`, `lesson_instructions.chapter`, `curriculum_test_placements.chapter`, and `classrooms.unlocked_lessons` keys. If `new_name` already exists in problems, acts as a MERGE.
  - `GET /api/curriculum/chapter-audit?assignment_type=...` — admin-only diagnostic listing every distinct chapter name with problem/lesson counts (lets admins spot typos/duplicates).
  - Frontend: new "Rename" button (Pencil icon) on each chapter header row in `AdminLessonManager.jsx`. Opens a browser prompt → confirm dialog → calls the API → refreshes the units list. Toast indicates "Renamed" or "Merged" based on response.
  - **Backend tests**: 10 pytest cases at `/app/backend/tests/test_rename_chapter.py` covering auth, validation, simple rename, merge-into-existing, and cross-collection side effects. All passing.
  - **Action required from user**: redeploy + use the new "Rename" button on `/admin/lesson-manager` to merge `Chapter 3: Colors & Style` into `Chapter 3: Colors` (or vice versa).

- In-App Help System (Feb 29, 2026):
  - Floating Help? button (cyan circle, bottom-right corner) visible only to teachers + admins; will extend to students later when a kid-friendly FAQ is added.
  - `GET /api/help/faq?audience=teacher|admin` — returns curated Q&A entries grouped by category (Classrooms, Tests, Library, Analytics, Admin, Editors, Getting Started). Students receive 403.
  - `POST /api/help/ask` — free-form AI fallback using Emergent LLM key with gpt-4o-mini (cheap). System prompt is seeded with the full FAQ context so answers stay product-specific. Students receive 403. 1000 char question limit.
  - Frontend `HelpButton.jsx` (Sheet slide-in from right): search box, FAQ/Ask AI tab toggle, categorized FAQ list with expand/collapse, "Open this page" deep-link buttons per article, AI answer card with auto-detected `Try: /path` deep links.
  - 13 initial Q&A entries covering: lesson lock/unlock, chapter test unlock, classroom creation, student progress, test assignment, result release, library vs curriculum, chapter merge, site analytics, password reset, announcements, turtle editor, first-time onboarding.
  - **Backend tests**: 12 pytest cases at `/app/backend/tests/test_help_system.py` covering audience gating, role downgrade, validation, AI fallback, prompt-injection resilience, and unauth/forbidden paths. All passing.

- Unit 2 Turtle Curriculum sync fix (Feb 29, 2026 — production bug fix):
  - Root cause: `TurtleCurriculum.jsx` rendered chapter card titles from a hardcoded `TURTLE_CURRICULUM` array with pretty names like "Chapter 3: Colors & Style", "Chapter 1: First Steps with Turtle", "Chapter 4: Conditionals - Making Decisions". The Assignment Library always read live names from the DB ("Chapter 3: Colors", etc.), creating a permanent mismatch where new problems added under the DB names would not appear under the curriculum's hardcoded names.
  - Fix: replaced the hardcoded rendering with a `displayUnits` `useMemo` that builds chapter cards dynamically from `/api/curriculum/units` (turtle assignment_type), using the **live DB chapter name** and **live DB lesson list** while keeping visual styling (gradient color / icon / weeks badge) keyed by chapter number. "Start Lesson" now navigates with the live DB chapter+lesson names URL-encoded so the lesson loader always resolves.
  - **Backend regression tests**: 5 pytest cases at `/app/backend/tests/test_turtle_curriculum.py`. All passing. Testing agent verified frontend end-to-end: chapter cards now show 'Chapter 3: Colors' (not 'Chapter 3: Colors & Style'), expanded lessons match the library, Start Lesson reaches populated problem set.
  - Admin-only "🛠 ADMIN · UPDATED X ago" badge added beneath each chapter description on `/turtle-curriculum`. `last_updated` field returned by `/api/curriculum/units` (max of `updated_at` / `created_at` across each chapter's problems). `updated_at` is now stamped on problem edits, moves, lesson renames, and chapter renames. Visible only when `user.is_admin === true`; regular teachers never see it. Verified by logging in as both an admin and a non-admin teacher.
  - Known follow-up: `PythonCurriculum.jsx` may have a similar pattern (merges DEFAULT static curriculum with custom items) — not exhibiting the bug yet but worth watching when admins start customizing Python chapters.

- SEO P0 fixes (Feb 29, 2026):
  - New `/app/frontend/public/robots.txt` — proper text/plain robots file with crawl rules, blocks auth-gated app routes from indexing, blocks CCBot + ClaudeBot scrapers, references sitemap. (Cloudflare prepends its managed AI-scraper block at the top — both sections are honored by crawlers.)
  - New `/app/frontend/public/sitemap.xml` — single canonical homepage entry + login/signup pages.
  - Added `<link rel="canonical" href="https://bytebattles.org/" />` to `index.html`.
  - Added synchronous inline `<script>` redirect at the top of `<head>` that catches `www.bytebattles.org` visits and rewrites the URL to the non-www version. Client-side only — Google treats this as a soft redirect. For full strength, user should add a Cloudflare Page Rule: `www.bytebattles.org/* → https://bytebattles.org/$1 (301)`.

- SEO P1 fix — landing page content (Feb 29, 2026):
  - Expanded landing page from ~72 words → **787 words** to clear Google's "low word count" + "low text-to-HTML ratio" warnings.
  - Added two new long-form sections: **"Why ByteBattles"** (curriculum overview, what students learn, CSTA alignment, DOK levels) and **"Frequently asked"** (6 Q&A entries targeting long-tail SEO: ages, install, standards, homeschool co-ops, grading, free trial).
  - Added `<noscript>` fallback in `index.html` with full product description + email contact so JS-disabled crawlers still see meaningful content.
  - All new sections use existing cyberpunk styling (gradients, fonts, neon colors); no design regressions.

- SEO P3 fix (Feb 29, 2026):
  - New `/app/frontend/public/llms.txt` — properly formatted per the llms.txt spec (heading, blockquote summary, sectioned link lists). Tells AI crawlers (ChatGPT, Claude) about the product, curriculum, and contact path.

- SEO P2 remaining work (not yet shipped):
  - **NEXT UP**: SEO Health panel in Admin Analytics. Show "robots.txt accessible ✓", "sitemap.xml reachable ✓", "canonical tag present ✓", "homepage word count: N", "llms.txt valid ✓" + a "Re-check now" button. Lets Alisa verify changes are live without waiting for Semrush re-audit.
  - Bundle size still ~2.3 MB (Semrush warning #133). Recommended follow-ups: code-splitting heavy admin pages with React.lazy/Suspense, lazy-loading Blockly/CodeMirror only on the pages that need them, enabling gzip/brotli at the CDN (likely already on via Cloudflare — worth verifying with `curl -I -H "Accept-Encoding: gzip"`).
  - Minifying `suppress-overlay.js` (Semrush warning #135) — file is tiny, low ROI; can be done at build time if desired.

- Turtle engine pencolor/fillcolor bug fix (Feb 29, 2026):
  - Reported by user with concrete repro: an octagon with `fillcolor("purple")` was being filled ORANGE (the last pencolor in the loop) instead of purple.
  - Root cause: in `/app/frontend/src/components/AnimatedTurtle.jsx` line 431, the regex matching `t.color(...)` was not anchored with `^`. Because `turtlePrefix` is optional, the regex matched the SUBSTRING `color(...)` inside `pencolor(...)` and `fillcolor(...)`, misrouting every pencolor/fillcolor call to the combined-color handler that overwrites BOTH pen and fill.
  - Fix: added `^` anchor to the color() regex. Now `t.pencolor(...)` and `t.fillcolor(...)` correctly route to their dedicated handlers and do not affect each other.
  - **Verified by testing_agent (iteration_19)**: primary bug fixed (octagon now PURPLE); legitimate `t.color('red')` still sets both pen+fill; pure `t.fillcolor('blue')` still works.
  - **Secondary issue surfaced**: `t.color('red')` + `begin_fill()` outlines red but the fill renders dark — likely a separate pre-existing bug in how the color() command propagates fillColor to the begin_fill path. NOT a regression of this fix; flagged for future investigation.

- Backend turtle color() bug fix (Feb 29, 2026 — iteration_20):
  - Root cause: `TurtleSim.color()` in `/app/backend/turtle_sim.py` only set pen color when given a single argument, leaving `fill_color` at the default `'black'`. Real CPython turtle's `color('x')` sets BOTH pen and fill when given one argument.
  - Fix: `TurtleSim.color()` now correctly sets both pen+fill for the 1-arg string/tuple form, both for 3-arg RGB, and separate values for 2-arg and 6-arg forms — matching CPython semantics.
  - **Verified by testing_agent (iteration_20)**: 4/4 frontend scenarios passing 100% via pixel-sampling the rendered PNG. Includes regression test of iteration_19 purple-octagon (still works).
  - Minor follow-up flagged: 0-arg `color()` (which in CPython acts as a getter returning `(pen, fill)`) silently no-ops in our sim. Low priority unless a lesson uses it.

- Clear Code button on all editors (Mar 1, 2026):
  - New shared helper `/app/frontend/src/utils/resetCode.js` (`resetCodeWithConfirm`) — pops a browser confirm dialog, then resets the editor to the problem's `starter_code` (or a `# Write your code here` fallback if none). No-ops if the current code already equals the target.
  - Added `data-testid="clear-code-btn"` next to Run Code on: AssignmentPage teacher-mode Live Demo, AssignmentPage student editor (`student-clear-code-btn`), StudentSandbox, TeacherPractice, CodingTestTaking, and LessonPageTemplate.
  - Uses lucide-react Trash2 icon + "Clear" label. Disabled while running / submitting / problem is finalized.
  - **Verified by testing_agent (iteration_21)**: 100% pass rate on tested flows (3 pages behavioural, 2 pages code-inspection). Confirmed CodingTestTaking Clear does NOT increment submission counter.

- AnimatedTurtle `t.speed()` bug fix (Mar 1, 2026 — iteration_22):
  - User reported: `t.speed(0)` (which should be "instant" per CPython) actually left the turtle crawling at ~550ms per step.
  - Two root causes: (1) the `case 'speed':` executor handler was a no-op — it resolved without updating any delay; (2) the delay formula `(11 - speed) * 50` treated `speed=0` as the SLOWEST setting (550ms).
  - Fix: added a `speedRef` React ref mirroring the `speed` state so mid-run `t.speed(N)` propagates without re-memoizing `executeCommand`. New delay formula: `speed=0 → 0ms`, `speed=1..10 → (11-clamped)*50 ms`. `case 'speed'` handler now updates both `speedRef.current` and `setSpeed()`. A `useEffect` keeps the ref in sync with slider-driven state changes.
  - **Verified by testing_agent (iteration_22)**: 4/4 timing tests passed. `t.speed(0)` 20-step loop finished in 0.79s (previously ~30s). `t.speed(1)` correctly takes 3+s. Mid-run `t.speed(0)` propagates within one command.
  - Follow-up flagged (not shipped): add data-testid attributes to AnimatedTurtle Play/Pause/Reset/FastForward toolbar buttons for less brittle timing tests.

- Teacher Live Preview → Python PNG swap (Mar 1, 2026 — iteration_23):
  - Root cause: `AssignmentLibrary.jsx` used `<AnimatedTurtle>` (JS canvas approximation) in the Live Preview panel while students saw the backend-rendered Python turtle PNG — causing preview vs. expected-output mismatch.
  - Fix: replaced `<AnimatedTurtle>` with an `<img>` reading the base64 `expected_turtle_image` returned by `POST /api/code/execute-turtle` in both the **Create** dialog (~L2103) and the new **Edit** dialog Preview (~L3417). Added `edit-preview-turtle-btn` to the edit dialog.
  - **Verified by testing_agent (iteration_23)**: 6/6 frontend cases passed, 0 `<canvas>` in Live Preview containers, regression guard preserved for non-turtle assignment types.

- Help System FAQ expansion (Mar 2, 2026):
  - Extended `HelpButton.jsx` `FaqItem` component to render an optional `image` field (with `image_alt`) — image displays under the answer text, lazy-loaded, testid `faq-image-<id>`.
  - Added new FAQ entries:
    - **Answer Keys → "Where do I find the answer key / solution code for a problem?"** — describes the green LEFT-side "Show Solution Code" button, with an embedded screenshot.
    - **Answer Keys → "How do I add or edit the solution code for a problem?"** — Library edit flow + Preview Turtle Output tip.
    - **Turtle Troubleshooting → "Why aren't my student's turtle colors showing up?"** — covers geometry bug (tiny circle → position thresholds never trigger) + white-on-white invisibility. Includes `print(t.xcor())` debug tip.
    - **Classrooms → "How do I lock or unlock lessons for my class?"** — rewritten as numbered step-by-step from Teacher Dashboard through Lesson Locks toggle + Class Progress widget tip.
  - Because the AI `/api/help/ask` endpoint builds its system prompt from `HELP_FAQ_ENTRIES` dynamically, all four new entries are automatically part of the AI's grounded knowledge — no separate prompt update needed. Verified via curl.

- Curriculum lesson natural sort fix (Mar 2, 2026):
  - User reported: chapters with more than 9 lessons showed them in alphabetical order — "Lesson 1, Lesson 10, Lesson 11, Lesson 12, Lesson 2, Lesson 3..." instead of numeric order.
  - Root cause: both `/api/curriculum/units` (teacher/admin) and `/api/student/curriculum` (student) used plain string `sorted()` on chapter + lesson names. String comparison puts "10" before "2" because "1" < "2" character-wise.
  - Fix: added module-scope helper `_natural_key()` in `server.py` that splits strings on digit boundaries and casts numeric chunks to int (e.g. "Lesson 10 end" → `["lesson ", 10, " end"]`). Applied to both chapter and lesson sorts in both endpoints. This single fix covers Block, Turtle, Python, and Micro:bit curriculum pages for both teachers and students.
  - Verified via curl on preview: `Lesson 1 → Lesson 2 → Lesson 10` (previously `Lesson 1 → Lesson 10 → Lesson 2`).

- Wildcard tokens in autograder expected output (Mar 2, 2026):
  - User pain point: students personalizing outputs (replacing "Ada" or "[YourName]" with their real name) failed the autograder because it did strict `actual == expected` string equality.
  - Design: chose `{NAME}` (single-brace uppercase token) convention because it mirrors Python's own f-string / `.format()` syntax — free pedagogical transfer. Also standard in API docs and template engines.
  - Backend: added `outputs_match(expected, actual)` helper in `server.py`. Regex `_OUTPUT_TOKEN_RE = re.compile(r"\{[A-Z_][A-Z0-9_]*\}")` finds tokens; those get replaced with `.+` (one-or-more of any char except newline — token can't swallow an entire extra print). If expected output has NO tokens, falls back to strict equality (zero-risk regression). Replaced 6 direct equality checks across all grader paths (submission grader, test-case grader, solution-comparison fallback, challenge grader).
  - Frontend (`AssignmentLibrary.jsx`): updated Expected Output placeholder in both Create and Edit dialogs to include `Hello, {NAME}!` example. Added cyan tip line explaining the wildcard convention.
  - Help System: new **Grading** FAQ category → "Students want to put their own name in the output — how do I make the grader accept any name?" with examples and gotchas. AI `/api/help/ask` auto-discovers via `HELP_FAQ_ENTRIES`.
  - Verified: 11/11 outputs_match unit tests pass, including basic substitution, multi-word names, multiple tokens per output, multiline with token, empty-name rejection, no-newline-swallow, and lowercase-token rejection.

- AI Lesson Plan Generator blank-fields bug fix (Feb 2026 — iteration_29):
  - User (production) reported: downloaded lesson-plan .docx had **Learner Outcomes** and **Standards** sections left blank.
  - Root cause: the LLM prompt in `POST /api/lesson-plans/generate-from-schedule` (`/app/backend/server.py` ~L10670 `labels_directive`) told gpt-4o "Only include a key if you have real content for it… Skip labels that are purely structural." — the model silently dropped keys it considered structural, so the docx-fill left those sections blank.
  - Fix: rewrote `labels_directive` to (a) enumerate the required JSON keys explicitly, (b) give per-section guidance for every common label (Learner Outcomes → "Students will be able to…", Standards → "cite real CSTA codes like 1B-AP-10", etc.), (c) instruct the model to NEVER return an empty string. Aligned the `system_prompt` accordingly (removed the conflicting "only include keys" clause).
  - Server-side backstop added: after JSON parse, any `template_labels` that are missing or empty in the returned `sections` dict are backfilled with "See attached activities" so the downloaded docx **never** has a blank section again — even if the LLM misbehaves. Non-JSON responses now log a warning instead of silently dropping everything. List/dict values from the LLM get joined into readable text instead of being stringified as Python literals.
  - **Verified by testing_agent (iteration_29)**: 9/9 pytest tests pass. 4/4 independent generation runs (single-day + multi-day day-1/day-2, 3 different turtle chapters) returned ALL 11 requested labels with non-empty strings. Standards cited real CSTA codes. End-to-end docx download verified by parsing the returned .docx and confirming the generated Learner Outcomes/Standards text is present. Regressions checked: no-template freeform path still works, no-grounding-data guard still fires, auth gating (401/403) still correct.

- Student block-editor bug fixes (Feb 2026 — iteration_30, 4/4 tests pass):
  - **Submit did nothing after Step-through**: `AnimatedTurtle.stepForward` now calls the parent `onRun` on the first step so `hasRun` unlocks. Stepping through IS running the code, just one command at a time. (`/app/frontend/src/components/AnimatedTurtle.jsx` ~L2213)
  - **Submit did nothing after clicking an existing block**: `TurtleBlocklyEditor.handleChange` now only fires `onCodeChange` when the generated Python text actually changed. Blockly fires UI-only events (block clicked, workspace scrolled, block selected) that used to reset `hasRun=false` in the parent and silently break Submit. Guarded by `lastEmittedCodeRef`. (`/app/frontend/src/components/TurtleBlocklyEditor.jsx` ~L1290)
  - **Step-through didn't highlight code lines**: added `onLineHighlight` prop end-to-end. `TurtleBlocklyEditor` now (a) tracks `highlightedLine` state, (b) applies a Monaco `deltaDecorations` line-highlight for the editable Code view (Chapter 5+), and (c) renders each line of the read-only code preview as its own `<div>` so the active line gets a yellow background (`bg-yellow-400/30`, data-testid `code-line-<N>`). Wired from `AssignmentPage` for both student and teacher block branches.
  - **Grid disappeared ~50ms after clicking Grid button**: the Grid button had `setTimeout(() => drawCanvas(), 50)` that fired from a stale closure (with `showGrid: false`), erasing the newly-drawn grid. Removed the setTimeout — the existing `useEffect([drawCanvas])` already redraws when `showGrid` state flips. Same fix applied to the `toggleGrid` imperative ref method. (`/app/frontend/src/components/AnimatedTurtle.jsx` ~L2409, L2332)
  - Cleanup: removed 5 verbose `console.log` lines from `handleSubmit`.

- Student block-editor UX + layout follow-ups (Feb 2026 — from user report "Submit does not work + no line highlight"):
  - **Submit button now disables + relabels to "Run First"** when the student hasn't run yet — matches the non-block path. Same for Done. Users no longer think Submit is broken when it's really just showing a toast error that they missed. (`/app/frontend/src/pages/AssignmentPage.jsx` L1521-1546)
  - **Fixed layout overlap** where the AnimatedTurtle control row was rendering INSIDE the purple "Turtle Blocks" header bar (because the 420-px turtle column was `flex items-center` with content taller than the container, causing overflow upward). Changed to `items-start justify-center overflow-hidden`, and added `relative z-10` on the purple header so its Code/Reset/Run buttons are always on top and clickable. (`/app/frontend/src/components/TurtleBlocklyEditor.jsx` L1435, L1568)
  - Verified end-to-end on preview: student places blocks → clicks Step ⏭ once → Submit switches from grey "Run First" to cyan "Submit" and the corresponding Python line gets a yellow highlight in the Code preview. Layout is clean, no overlaps.

- Teacher Panel: class picker + per-student progress (Feb 2026 — from user report on production):
  - **Class dropdown** added at the top of the Teacher Panel (data-testid `teacher-panel-class-select`). Fetches `GET /api/classrooms` on mount and auto-selects the first class so the panel is immediately useful (was previously stuck on "No students enrolled" because there was no way to pick a class). Changing the selection refetches `/student-progress?classroom_id=...`. Also includes an "All classes" option for teachers who assign to multiple sections. (`/app/frontend/src/components/TeacherPanel.jsx` L34-72, L237-262)
  - **Per-student "X/Y solved" badge** next to each name — shows how many problems in the lesson/assignment that student has completed. Green when all done, yellow when partially, gray when none. Backend `/assignments/{id}/student-progress` now returns `problems_solved`, `problems_attempted`, and `problems_total` on each student object. (`/app/backend/server.py` L6280-6300, `TeacherPanel.jsx` L297-320)
  - **Fixed URL breakage on lesson pages**: lesson IDs contain `?` (e.g. `lesson_..._what_are_blocks?`), which axios was treating as the query-string delimiter — so the request went to `/assignments/lesson_..._what_are_blocks` (404). Now `encodeURIComponent(assignmentId)` on both `/student-progress` and `/student-code` calls. (`TeacherPanel.jsx` L79, L91)
  - **`/student-progress` now works on lesson pages too**: when `assignment_id` starts with `lesson_`, the backend rebuilds the virtual assignment by scanning problems whose `(assignment_type, chapter, lesson)` tuple regenerates the same lesson id, and treats the caller-supplied `classroom_id` as the roster. (`server.py` L6187-6238)
  - Also fixed AssignmentPage passing the wrong id to the panel — was `assignmentId` (undefined on `/lesson/*` routes since useParams gives `chapter/lesson` there), now `effectiveAssignmentId` (uses `lessonData.id` on lesson pages).
  - Verified in preview: dropdown lists all 30+ teacher classrooms, "2nd Period (2)" shows both students with "0/2" progress badges and "Done:0 Started:2 None:0" summary footer.

- Block-workspace glow during step-through (Feb 2026):
  - Extended `generatePythonCode` in `TurtleBlocklyEditor.jsx` to append `# BID:<block.id>` inline comments to every terminal Python statement (skips control-flow headers ending in `:` so `parseCode`'s regex isn't broken). `annotateWithBlockId` helper.
  - `parseCode` in `AnimatedTurtle.jsx` now post-processes commands to attach `blockId` from `# BID:` inline comments. Regex uses `\S+` (not `[\w-]+`) because Blockly IDs contain punctuation like `;` `!` `-` `_`.
  - `stepForward` and `play` pass `(line, blockId)` to `onLineHighlight`. `TurtleBlocklyEditor` uses `workspace.getBlockById(blockId).getSvgRoot().classList.add('bytebattles-step-glow')` and tracks the previously-glowing block in a ref so it swaps cleanly on each step. Custom class (not Blockly's `.blocklySelected`) so it doesn't collide with the student clicking a block to select it.
  - CSS: `.bytebattles-step-glow > .blocklyPath` gets a bright yellow drop-shadow (`0 0 6px + 0 0 12px #facc15`) with 3px yellow stroke.
  - Verified in preview: single Motion block → click Step ⏭ → block gets `bytebattles-step-glow` class + visible yellow glow; turtle draws forward; code line 6 highlights yellow simultaneously. Both features live together.

- Teacher Dashboard / Panel / Locks / Library fixes (Feb 2026 — from user report on production, batch of 4):
  - **Teacher Panel class dropdown made highly visible**: white background, 2px cyan-500 border, cyan-700 "📚 VIEWING CLASS" label, 12px padding + shadow. Was previously low-contrast dark-on-dark and getting missed by teachers. (`/app/frontend/src/components/TeacherPanel.jsx` L245-268)
  - **Problem Library shortcut** added to the Teacher Dashboard between "My Classrooms" heading and "Show Archived"/"Create Classroom" buttons. `data-testid=problem-library-link`, navigates to `/library`. (`/app/frontend/src/pages/TeacherDashboard.jsx` L664-673)
  - **Lesson Locks tab moved to first position** in the classroom page tab list (was buried after Students → teachers couldn't find it). Also flipped default tab to `lessons` for teachers so they land on locks immediately. (`/app/frontend/src/pages/ClassroomPage.jsx` L668-694)
  - **Lesson locks flipped to UNLOCKED-by-default** — one-time migration `unlock_all_lessons_feb2026` retroactively populated `unlocked_lessons` on every classroom with every lesson key currently in the problems collection. 83/83 classrooms now have all 92 lesson keys unlocked. `create_classroom` also pre-populates the same list so any new class starts fully unlocked. Idempotent via `db.migrations` marker. Teachers can still click "Lock" to gate individual lessons. (`/app/backend/server.py` L15216-15252 migration, L1689-1721 create endpoint)
  - **Problem Library isolation**: non-admin teachers now only see problems that are (a) seeded / no creator, (b) authored by any `is_admin=True` user, or (c) authored by themselves. Problems other teachers create stay in those teachers' libraries — no cross-contamination. Admin/platform teachers still see everything. (`/app/backend/server.py` L2064-2119)
  - Verified in preview: dashboard shows Problem Library button; classroom page opens on Lesson Locks tab; migration marker + 83/83 unlock confirmed via direct DB query.

- Turtle sim: dynamic pencolor/fillcolor + `len()` (Feb 2026):
  - Bug (user report): `t.pencolor(colors[i % len(colors)])` drew nothing. Three stacked issues — pencolor/fillcolor parser used lazy `[^)]+` regex that truncated at `len(colors`'s inner `)`; runtime `case 'pencolor'` only read `cmd.value` and ignored `cmd.expression`; `evaluateExpression` didn't understand `len(...)`.
  - Fix: both pencolor and fillcolor parsers now use `extractParenthesesContent` (balanced-paren) and fall back to storing `cmd.expression` when the color can't be resolved statically. Runtime cases evaluate that expression against `variablesRef.current`. `evaluateExpression` now inlines `len(<var>)` → numeric length before the math-only guard runs. Files: `/app/frontend/src/components/AnimatedTurtle.jsx`.
  - Verified via lint clean + code trace: for `colors = ["red",...,"purple"]`, `i=0` resolves `colors[0 % len(colors)]` → `colors[0]` → `"red"`; subsequent i values cycle through the palette.

- Unit 1 block-workspace persistence across devices (Feb 2026 — user report "Unit 1 not saving code"):
  - Root cause: block XML was only persisted to `localStorage[saved_xml_<id>]` which is per-browser, per-device. Students switching devices, using Chrome vs Safari, or having cache cleared lost all their placed blocks.
  - New backend: `POST /api/drafts` (upsert-by-{student,assignment,problem}) and `GET /api/drafts?assignment_id=` — separate `block_drafts` collection so we can write cheaply on every workspace change without polluting Submission history. `/app/backend/server.py` L2062-2095.
  - Frontend: `AssignmentPage` now (a) fetches server drafts on mount and merges them into `savedXmlPerProblem` after the localStorage seed, and (b) POSTs to `/api/drafts` with a 1.5s debounce on every `onXmlChange` so Blockly's rapid-fire events don't spam the API. Timers are keyed per-problem so navigating problems doesn't lose an in-flight save. `/app/frontend/src/pages/AssignmentPage.jsx`.
  - Result: students can leave a Unit 1 lesson (any device), come back later (same or different device), and their placed blocks are exactly where they left them. localStorage remains as offline fallback.
  - Verified: `POST /api/drafts` + `GET /api/drafts` round-trip works via curl (auth-gated).

- Full-access unlock for invite-code teachers (Feb 2026 — user report):
  - Bug: A teacher who signed up with an invite code saw units 2/3/4 grayed out with "Soon" badges and a not-allowed cursor. Dashboard was gating on `user?.is_admin`, which is False for any non-platform teacher — including invite-code teachers.
  - Fix (backend): `/auth/me` now returns `full_access: true` for admins + any teacher who is NOT on a self-serve trial (i.e., `trial_ends_at` is unset or the account has an active subscription). Trial accounts (`/start-trial`) still return `full_access: false` and stay gated to Unit 1. Also exposes `trial_ends_at` + `subscription_active` for future UI use. `/app/backend/server.py` L1162-1200.
  - Fix (frontend): `TeacherDashboard.jsx` now computes `hasFullAccess = user?.full_access || user?.is_admin` and gates Units 2/3/4 on that instead of the old `is_admin`-only check. Falls back to `is_admin` for older cached clients that predate the new field.
  - Result: any teacher you invite via invite code gets the full app immediately after they log in — no admin flag needed. Trial signups still see the Unit 1 preview.

- Quiz "Something went wrong please refresh to continue" crash (Feb 2026 — production report):
  - Root cause: `TestTaking.jsx` defined a module-level `renderChoice` that fell through to `renderTextWithLineBreaks(asStr)` for any non-block choice — but `renderTextWithLineBreaks` was only defined INSIDE the component. `const` isn't hoisted, so at module scope it was `undefined` → `ReferenceError` on every text choice → ErrorBoundary caught it and showed the "please refresh" screen. Any quiz that mixed block-style Question 1 with text-style Question 2 crashed the moment the student clicked Next (Question 1's block path skipped the throw).
  - Fix (`/app/frontend/src/pages/TestTaking.jsx`): lifted `renderTextWithLineBreaks` to module scope right above `renderChoice`, removed the inner duplicate, and added a defensive `(currentQuestion.choices || [])` guard so a question with malformed data can no longer crash the whole quiz.
  - Result: Unit 1 Lesson 1 quiz (and every other quiz) will now paginate cleanly regardless of choice-type mix.

- Quiz scores now visible on the Tests tab (Feb 2026 — user report "I can't find where their quiz scores are"):
  - Backend: `GET /api/classrooms/{id}/test-assignments` now folds in per-test class-wide stats for teachers only — `{total_students, attempts_done, avg_score}`. Queries `mc_test_attempts` or `coding_test_attempts` depending on `test_type`, keeps the BEST attempt per student, and normalizes legacy raw-score records against `num_questions`. Students see no stats field. `/app/backend/server.py` L11858-11914.
  - Frontend: Every test card in the Tests tab now shows two prominent at-a-glance stat blocks (`data-testid=test-stats-<id>`): "Completed X/Y" and "Class Avg XX%" (color-coded green ≥80, yellow ≥60, red <60, "—" when no attempts yet). The "Results" button was renamed to "**View Scores**" and promoted to the primary cyan style so it doesn't look like a secondary/outline action anymore. `/app/frontend/src/pages/ClassroomPage.jsx` L783-830.

- Three linked reporting bugs (Feb 2026 — user report "0/6 counter not moving, student reports empty, test cards show 0/0"):
  - **`classroom.get("student_ids")` used the wrong field name in 3 places**: the DB field is `classroom.students`. That's why the Tests-tab card `stats` always showed `0/0` even when 10 students had submitted, and why the `is_enrolled_student` check on the student-progress endpoint was silently rejecting real enrollees. Fixed at `/app/backend/server.py` L1750, L3515, L11826.
  - **`/mc-tests/classroom/{id}` only checked the legacy `mc_tests.classroom_ids` field** — but tests assigned via the newer `test_assignments` collection weren't returned. That's why picking a specific class in Test Reports showed 0 tests but "All" showed everything. Fixed: endpoint now unions BOTH assignment paths and dedupes on test id. `/app/backend/server.py` L12012-12068.
  - **Top-right "Progress: 0/6 done" counter never moved** because it counted only `is_final=true` submissions — students who clicked Submit and got a passing grade weren't counted since they hadn't clicked the separate "Done" button. Now counts `is_final || is_passing` so successful submissions bump the counter immediately. `/app/frontend/src/pages/AssignmentPage.jsx` L432-436.

- Regression fix: Submit no longer locks the workspace (Feb 2026 — user "This was working before, what happened?"):
  - Root cause: My previous fix to make the "Progress: 0/6 done" counter move on passing submissions overloaded the existing `problemsFinal` state — but `problemsFinal` also drives `readOnly={problemsFinal[...]}` on the block/code editor. So a passing Submit → problemsFinal=true → editor locked → student couldn't retry to see what they did wrong. That behavior should ONLY happen when they explicitly click **Done**.
  - Fix: split into two states in `AssignmentPage.jsx` — `problemsFinal` (only flips on `is_final`, still drives the read-only lock) and a new `problemsSolved` (flips on `is_final || is_passing`, drives ONLY the top-right progress counter). The counter still moves as students succeed, but the editor stays fully editable until they hit Done.

- Curriculum Gradebook Grid — Teacher Reports (Mar 2, 2026):
  - Root request: teachers wanted a classic gradebook — one wide table, one row per student, columns interleaving Lesson Avg | Lesson Quiz | ... | Chapter Test in curriculum order, with the student column and header row frozen while scrolling.
  - Backend `GET /api/reports/gradebook?classroom_id=` (auth: teacher, must own the classroom). Iterates every problem in `db.problems`, groups into chapters/lessons in natural order, joins with the teacher's own `mc_tests` split into lesson_quiz vs chapter_test, and returns `{columns, rows}` where each row's `cells` map is keyed by `columns[i].key`. `lesson_avg` = mean of best-per-problem score across every problem in the lesson (returns null if the student has never submitted any problem in that lesson so the cell renders as "—" rather than a misleading red 0). Quiz/chapter-test cells = best mc_test_attempt percentage (normalizes legacy raw-score attempts against num_questions).
  - Frontend: added a third "Curriculum Gradebook (grid view)" mode to `TeacherReports.jsx` alongside the existing assignment-based grade report + missing-assignments report. Single-classroom picker, big grid with `overflow:auto` container, `<th>` uses `position: sticky; top: 0; z-20/30` and student `<td>` uses `position: sticky; left: 0; z-10` with an opaque striped background so scrolled cells cannot bleed through the frozen column. Colour-coded scores (green ≥90, yellow ≥70, orange 1–69, red 0, dim "—" not attempted). Excel export writes the same wide layout with a frozen split at row 1 / col 1.
  - **Verified by testing_agent (iteration_31)**: 12/12 backend pytest cases pass — happy path shape, column ordering, cell completeness, empty-classroom (rows=[]), 404 for unknown classroom, 404 for cross-teacher access, 401 unauthenticated, 422 missing param, no BSON `_id` leak, and a direct-Mongo math check verifying the lesson-average calculation. Regression cases for the legacy `POST /api/reports/gradebook` and `POST /api/reports/missing` still pass. Frontend flow verified via Playwright: sticky column stays x-fixed after horizontal scroll and sticky header row stays y-fixed under forced vertical overflow.
  - Post-testing fixes: (a) the sticky student <td> was using `bg-inherit` which resolved to the row's translucent bg and let scrolled score cells bleed through — replaced with explicit opaque striped backgrounds; (b) tightened lesson_avg semantics to return null (renders "—") when a student has no submissions in the lesson at all, so blank rows aren't misread as red 0s.

- Gradebook Grid follow-ups (Mar 2, 2026 — user-requested):
  - **Merged chapter banner**: grid now renders a two-row header — Row 1 is a merged chapter banner ("Chapter 1: Block Basics" spanning all its lesson columns), Row 2 is the per-column labels. Both banner + column-header rows are `position: sticky; top` so they stay pinned while scrolling.
  - **Cleaner labels**: `lesson_avg` columns now show just the lesson name (no trailing "Avg"), `lesson_quiz` shows "Lesson N: Quiz" (extracted from the lesson prefix), `chapter_test` shows "Chapter N: Test" (extracted from the chapter prefix).
  - **Data source expanded**: `/reports/gradebook` now sources lesson quizzes and chapter tests from `curriculum_test_placements` first (canonical Feb-2026 mapping), with a legacy fallback to the older `mc_tests.chapter/lesson` tagging so teachers who haven't migrated to placements still see quiz/test columns. Also handles coding-test attempts (`coding_test_attempts`) alongside `mc_test_attempts` when a placement is `test_type: coding`.
  - **Excel export**: the .xlsx download now matches the layout the user sketched — Row 1 is a merged chapter banner cell per chapter (via SheetJS `!merges`), Row 2 is `Student | <lesson labels> | <quiz labels> | <chapter test labels>`, Row 3+ is student data. Frozen split at row 2 / column 1 so students + headers stay visible while scrolling in Excel.

- Gradebook Grid v3 — Unit/Chapter filters + Print (Mar 2, 2026 — user follow-up):
  - **Unit dropdown** ("All Units", "Unit 1: Blocks", "Unit 2: Turtle Graphics", "Unit 3: Python", "Unit 4: Micro:bit") narrows the 92-column view by curriculum. Backend endpoint now accepts optional `?assignment_type=` and includes `assignment_type` on every column so both server-side and client-side filtering work.
  - **Chapter dropdown** ("All chapters" plus every chapter under the currently-selected unit) narrows further to a single chapter. Options rebuild whenever the Unit filter changes; the Chapter selection auto-resets if the chosen chapter is hidden by the new Unit filter.
  - Filtering runs client-side over the already-fetched columns for instant response; the toolbar description tracks "N of 92 column(s)" so teachers can see the scope. Excel + Print both respect the current filter.
  - **Print button** (`data-testid=gradebook-print-btn`) calls `window.print()`. Added a print-only stylesheet in `App.css` that (a) sets `@page { size: landscape }`, (b) hides everything except the gradebook card via a `visibility` swap, (c) removes toolbar/legend/help-FAB via `.no-print`, (d) unsticks the sticky header/first-column so the table flows across pages naturally, (e) repeats the `<thead>` on every printed page via `display: table-header-group`, (f) converts the dark neon score bands to light print-safe pastels (green/yellow/orange/red), and (g) avoids splitting a student row across pages.
  - Verified in Playwright print-media emulation: white background, black text, merged chapter banner intact, only the gradebook table renders — no nav/filters/legend/help-FAB.

- Leaderboard year-scoped ranks + School Rank + old-names cleanup (Mar 2, 2026 — production bug fix):
  - **Bug reported**: Classroom Leaderboard "Overall Rank" panel still showed last year's top-3 students (Trenton Willingham, John Long, Camryn Hopper) even though the current class had no XP. Root cause: `/api/leaderboard/ranks/{student_id}` ranked by `users.xp` (cumulative all-time), so students who graduated / left the platform still dominated the podium forever.
  - **Fix (backend)**: `/leaderboard/ranks/{student_id}` now ranks by **XP earned since the current school year started** (`SCHOOL_YEAR_START` env var, default `2025-08-01T00:00:00Z`). New helper `_year_xp_map()` sums `xp_earned` from `submissions` + `mc_test_attempts` + `coding_test_attempts` filtered on `submitted_at >= cutoff`. Old names naturally drop off — their XP is pre-cutoff. Response now also returns `student_xp` (this-year XP) alongside `student_all_time_xp`, and `school_year_start` so the UI can render "Ranked on XP earned since Aug 1, 2025".
  - **Overall Rank pool**: now filters to students with `year_xp > 0` — the "anyone presently using the app" pool the teacher asked for. `total_students` is renamed semantically to "active students this school year."
  - **New School Rank category**: response returns `school_rank`, `school_rank_num`, `school_name`, `school_top3` computed across every student whose teacher belongs to the same `users.school` value. If the viewing student's teacher hasn't set a school, `school_rank` is `"N/A"` and `school_name` is empty — teachers get an inline "Set your school →" prompt to fix it.
  - **New endpoint**: `POST /api/auth/update-school` (teacher-only) — sets/updates the teacher's `users.school` (and optionally `district`) and upserts the `schools` collection via existing `update_school_record()`. Used by the inline prompt.
  - **`GET /api/auth/me`** now includes `school` + `district` so the Leaderboard component can decide whether to show the "Set your school" CTA.
  - **Frontend**: `Leaderboard.jsx` upgraded from 3 rank columns → 4 (Class / Teacher / **School** / Overall). Amber colour scheme for School (cyan / pink / amber / lime). Subtitles under each column ("2nd Period", teacher's name, school name, "Platform-wide"). "Set your school →" underline button appears in the top scoreboard only when the viewer is a teacher AND their school is empty; opens a browser prompt, POSTs to `/auth/update-school`, then refetches ranks so the School Rank recomputes instantly. Added `data-testid`s: `set-school-btn`, `my-class-rank`, `my-teacher-rank`, `my-school-rank`, `my-overall-rank`, `leaderboard-my-name`, `leaderboard-my-xp`.
  - Verified in preview: after clicking "Set your school → Loop Legends Academy", the toast fires, School Rank flips from N/A → 6th, subtitle updates to "Loop Legends Academy", and top-3 School Rank list populates. Overall Rank stays N/A / "0 active" because preview has no students with `xp_earned > 0` after Aug 1, 2025 — exactly the intended "old names drop off" behaviour.

- Reigning Beast badge + Bind Existing Schools (Mar 2, 2026):
  - **`<BeastBadge studentId />`** — new component in `/app/frontend/src/components/BeastBadge.jsx` that renders a tiny lime trophy pill next to a student's name if that student is currently the #1 ByteBattles Beast (top XP earner this school year, platform-wide). Uses module-level cache + shared in-flight promise so lists (Leaderboard rows, Teacher Panel, Gradebook student column) all read from the same single API call. 5-minute client-side cache. Renders nothing when the student is not the beast, so it's safe to sprinkle anywhere. Testid: `beast-badge-<studentId>`.
  - **`GET /api/leaderboard/beast`** — new endpoint that aggregates `xp_earned` from `submissions` + `mc_test_attempts` + `coding_test_attempts` with `submitted_at >= SCHOOL_YEAR_START`, returns `{beast: {id, name, picture, year_xp}, school_year_start}`. Signed-in users only. Returns `beast: null` when no student has any post-cutoff XP.
  - Wired into: Leaderboard top scoreboard "Name" cell, Leaderboard top-3 podium rows (Class/Teacher/School/Beasts), Teacher Panel student rows, and Curriculum Gradebook student column. Backend `_names_for()` helper in `/leaderboard/ranks/{id}` now returns `id` alongside name/xp so the frontend can match against the beast.
  - **`POST /api/admin/bind-schools`** — admin-only, idempotent. Iterates the `schools` collection and for every teacher listed in each school's `teacher_ids`, back-fills `users.school` (and `users.district` when set) if those fields are currently empty. Returns `{schools_processed, teachers_school_backfilled, teachers_district_backfilled}`. Handles the legacy-teacher gap where signup wrote to the `schools` collection but not back to `users.school`, which is why School Rank showed N/A for older accounts.
  - **Admin UI**: new amber "Bind Existing Schools" button in the Admin Tools row on `/admin-dashboard` (data-testid `admin-bind-schools-btn`). Confirm dialog explains it's idempotent. Toast summarizes: "Processed N schools · backfilled X teacher school(s), Y district(s)".
  - Preview smoke-tested end-to-end: inserted a fake xp_earned=5000 submission for Amy Stapp → refreshed leaderboard → **trophy badges appeared next to every "Amy Stapp" name in the podium** (Class, Teacher, School, Beasts columns), and Amy showed as 1st in the ByteBattles Beasts card. Clicking Bind Schools returned processed=0 (preview has no schools) with a clean toast; in production it will back-fill legacy teacher accounts.

- Beast Profile Ribbon + Configurable School Year Start (Mar 2, 2026):
  - **`<BeastRibbon studentId={id} />`** — new component (`/app/frontend/src/components/BeastRibbon.jsx`) that renders a full-width lime glowing "REIGNING BEAST" banner across the student dashboard header only when the current student is the platform's #1 XP earner this school year. Reuses the shared beast cache from `BeastBadge` via a new exported `useBeast()` hook, so ribbon + inline badge share one API fetch. Animated shine strip + pulsing Flame/Trophy icons. Dropped in right below `<WelcomeBanner>` on `StudentDashboard.jsx`. Testid: `beast-ribbon`.
  - **Database-backed school year cutoff** — new helper `_get_school_year_start()` reads `settings.school_year_start` from Mongo first, falls back to `SCHOOL_YEAR_START` env var, then to hard 2025-08-01 UTC. All three leaderboard endpoints (`/leaderboard/ranks/{id}`, `/leaderboard/beast`) now call the helper so admins can flip the cutoff without a redeploy.
  - **`GET /api/admin/config/school-year-start`** — signed-in users read the current cutoff + whether it's the DB override or the default fallback (used to render "Last set …" metadata on the admin card and by the Leaderboard's context line).
  - **`POST /api/admin/config/school-year-start`** — admin-only, accepts `YYYY-MM-DD` (interpreted midnight UTC) or a full ISO datetime. Upserts `settings.school_year_start` with `updated_at`/`updated_by`. Every subsequent leaderboard call picks up the new value instantly.
  - **Admin UI card** — new `<SchoolYearCard>` on `/admin/analytics` above the Traffic/Teacher-Activity tabs. Shows "Currently in effect" date + "Last set …" hint, a `<input type="date">` for the new cutoff, and an amber "Start New School Year" button that fires a confirm dialog and posts to the endpoint. Data-testids: `school-year-card`, `school-year-current`, `school-year-input`, `school-year-save-btn`.
  - Verified in preview end-to-end: opened Analytics → card showed "August 1, 2025" default → set to 2026-08-15 → toast "New school year starts 2026-08-15" → card refreshed showing "August 15, 2026" + "Last set 8/28/2026, 11:24:30 AM" → reset back to 2025-08-01. Backend cleanup: `db.settings.school_year_start` doc is created on first save, deleted on cleanup.

- Leaderboard "No data yet" + gradebook quiz values (Mar 2, 2026 — production hotfix):
  - **Bug A (gradebook quiz cells showing 1600 / 2000 / 800)**: `/reports/gradebook` was dividing `mc_test_attempts.score` (already stored as a 0-100 percentage per the `MCTestAttempt` model + `/mc-tests/{id}/submit` handler) by `num_questions` and re-multiplying by 100 — turning 100% into 100 ÷ 5 × 100 = 2000. Fixed to trust `score` directly (or `percentage` only when it looks like a 0-100 value), clamp to [0, 100], and skip incomplete attempts.
  - **Bug B (leaderboard "No data yet" everywhere)**: production classrooms store `students` as expanded `[{id, name, email}, ...]` for some records and `[id_str, ...]` for others. My `/leaderboard/ranks/{id}` was doing `db.classrooms.find({"students": student_id})` which only matched the id-string shape, so any student in an object-shape classroom got zero classrooms back → all top-3 lists returned empty → "No data yet" rendered in every panel. Fixed the classroom query to `$or` both shapes and added a `_extract_ids()` helper that normalizes either shape into a flat list of id strings; applied to class, teacher, and school aggregations.
  - Verified in preview: Amy Stapp's endpoint now returns `class_top3 length=2, teacher_top3 length=3, class_rank="1st", teacher_rank="6th"` where previously all were empty/N/A. Inserted a fake mc_test_attempt(score=100) → quiz cell rendered "100", not "5000".

*Last Updated: Mar, 2026*

## Deferred backlog (user-parked)
- **Missing-School Teacher Report (Mar 2, 2026)**: On `/admin-dashboard`, add a small "Teachers still missing a school" panel that lists every teacher account whose `users.school` is empty. Shows count + names + a quick action to open Reset-User-Password or email them so admins can chase down stragglers after running "Bind Existing Schools". Saved for later per user.

## Quiz & Chapter Test XP (Mar 2026)
- Lesson quizzes and chapter tests now award XP/coins on the **FIRST attempt only** (per user decision). Uses the same reward formula as problems (`calculate_xp_and_coins`: 100 XP pass ≥70%, 200 perfect, +50 first-try, +25 streak).
- New retake-safe `test_xp_awards` collection (`student_id`, `test_id`, `problem_id`, `placement_type`, `score`, `xp_earned`, `coins_earned`, `submitted_at`). Keyed per (student, test[, problem]) so retakes never re-award — attempts get deleted on retake but awards persist.
- `award_test_xp(user, test_id, score, problem_id=None)` helper in `server.py` (~L171). Called from `POST /mc-tests/{id}/submit` (MC quizzes/chapter tests) and `POST /coding-tests/{id}/submit` (coding, only when `attempt_number==1`). Bumps `users.xp`/`coins` too (counts toward dashboard rank/level).
- Both leaderboard aggregations (`_year_xp_map` ~L9906 and `/leaderboard/beast` ~L10113) now include `db.test_xp_awards` so quiz/test XP counts toward school-year rankings.
- Submit responses now return `xp_earned`. `TestTaking.jsx` shows a lime "+N XP earned!" badge (`data-testid=quiz-xp-earned`) on the results screen.
- **Verified** via curl end-to-end: first attempt (100%) → +250 XP + award row + user xp bumped; retake (50%) → xp_earned=0, user xp unchanged, award count stays 1; `/leaderboard/beast` reflects the 250 year-XP. Test artifacts cleaned up afterward.

## Top Quiz Scorers strip (Mar 2026)
- New `GET /api/leaderboard/top-quiz-scorers?days=7&limit=5` — top students by quiz/chapter-test XP earned in the last N days, sourced from `test_xp_awards` only (recent quiz effort, not cumulative). Returns `{days, scorers:[{rank,id,name,picture,xp}]}`. Signed-in users only; days clamped 1-90, limit 1-20.
- New `frontend/src/components/TopQuizScorers.jsx` — compact horizontal strip on the Student Dashboard (above the Leaderboard card). Medals for top 3 (crown/silver/bronze), avatar/initials, "+N XP", highlights the viewer as "You". Empty-state nudge when no one has scored this week. `data-testid=top-quiz-scorers`, `quiz-scorer-<rank>`.
- Verified endpoint via curl (returns ranked scorers). Component compiles clean; visual confirm blocked only by the synthetic preview student having no full dashboard render.

## Weekly reset + Champion streak flames (Mar 2026)
- Top Quiz Scorers strip is now anchored to the **calendar week** (Monday 00:00 UTC → next Monday) so it genuinely "resets every Monday". Endpoint returns `week_start` + `resets_at`; the strip shows a "Resets every Monday" note + a live countdown pill (`quiz-scorers-countdown`) that ticks each minute.
- New `weekly_quiz_champions` collection (one doc per completed week, keyed by Monday `week_start` ISO): `{champion_id, xp, recorded_at}`. Weeks with no quiz XP recorded with `champion_id=None` so they aren't recomputed and correctly break streaks.
- `_finalize_past_quiz_weeks()` lazily records every completed-but-unrecorded week from the earliest award forward (idempotent, upsert, concurrency-safe). Called on the scorers + stats endpoints. `_champion_stats_map()` computes per-student `total_weeks` (all-time #1 count) and `streak_weeks` (consecutive most-recent completed weeks won — only the latest week's champion has a live streak).
- New `GET /api/leaderboard/quiz-champion-stats/{student_id}` → `{champion_weeks, champion_streak}`. Scorers in `/top-quiz-scorers` also carry `champion_weeks` + `champion_streak`.
- Frontend strip stamps two badges under each scorer: 🔥 **Flame** (orange, shown when `champion_streak >= 2`) for weeks-in-a-row, and 👑 **Crown "N×"** (gold, shown when `champion_weeks >= 1`) for total weeks as champion. testids `quiz-flame-<rank>`, `quiz-champ-<rank>`.
- **Verified** via curl with seeded 3-week history: champions Aug3→A, Aug10→A, Aug17→B ⇒ A `{weeks:2, streak:0}`, B `{weeks:1, streak:1}`; current-week scorers correctly carried their champion stats. Seed data cleaned up.

## Hall of Fame · Past Champions (Mar 2026)
- New `GET /api/leaderboard/hall-of-fame?limit=12` — returns past weekly champions most-recent-first from `weekly_quiz_champions` (skips no-champion weeks). Each entry: `week_label` (e.g. "Aug 17 – 23", cross-month aware), champion name/picture, winning `xp`, and all-time `champion_weeks` so repeat winners stand out. Calls `_finalize_past_quiz_weeks()` so history is always current.
- New `frontend/src/components/HallOfFame.jsx` — "Hall of Fame · Past Champions" card on the Student Dashboard (between the Top Quiz Scorers strip and the Leaderboard). Rows show week label + avatar + name + XP; the top row (most recent week) is gold-highlighted with a "Reigning" tag; repeat winners get a 👑 "N×" badge; the viewer is labelled "You". Hidden entirely until the first champion is crowned. testids `hall-of-fame`, `hof-row-<idx>`.
- **Verified** via curl with seeded 3 weeks: returns Aug17→B, Aug10→A, Aug3→A in order, correct labels + repeat-winner counts. Frontend compiles clean. Seed data cleaned up.

## Class Leaderboard fix + fresh-year reset (Mar 2026, production bug)
- **Bug 1 (class shows "No data yet")**: `ClassroomPage.jsx` rendered `<Leaderboard classroomId currentUserId={user.id}>` but the component ignored `classroomId` and always ranked the current user. A teacher opening their class's Leaderboard tab ranked the *teacher* (in no student pool) → everything "No data yet".
  - Fix: new `GET /api/leaderboard/classroom/{classroom_id}/ranks` returns the Class/Teacher/School/Overall top-3 the class's students see. `Leaderboard.jsx` now enters "classroom mode" when `classroomId` is set — fetches that endpoint, hides the personal "your rank" row, keeps a teacher "Set your school" affordance.
- **Bug 2 ("still shows last year's names")**: class/teacher/school top-3 listed 0-XP roster students. Now all pools use `min_activity=True` (exclude 0 year-XP), matching the fresh-new-year reset — old names stay hidden until a student earns XP this school year (and quizzes now award XP, so boards fill as students play).
- Promoted the ranking helpers to module level (`_lb_extract_ids`/`_lb_year_xp_map`/`_lb_rank_of`/`_lb_names_for`) — `_lb_extract_ids` handles both `students:[id]` and `students:[{id}]` production shapes.
- **Verified** via curl on a real preview class: before seeding year-XP → all top-3 empty + total 0 ("No data yet"); after seeding one student 250 XP → that student appears in class/teacher top-3 and their personal `class_rank` = 1st. Frontend compiles clean; seed data cleaned up.
- NOTE: fix is in **Preview** — user must redeploy to push to production (byte-dashboard.emergent.host).

## Leaderboard → total users.xp + coding collection fix (Mar 2026, production blank-board)
- Production leaderboard was blank: historical attempt collections don't carry `xp_earned`/`submitted_at`, so the school-year-scoped sum was 0 for everyone (and min_activity hid them all). Per user decision, the leaderboard now ranks by **cumulative `users.xp`** (lifetime total); the school-year date filter no longer applies to ranks/beast.
- Changed: `get_student_ranks` nested `_year_xp_map` and module-level `_lb_year_xp_map` now read `users.xp` directly. `/leaderboard/beast` now returns the top `role:student` by `users.xp` (single indexed query). Classroom-ranks inherits the change. Frontend label changed to "Ranked by total XP".
- Hall of Fame + Top Quiz Scorers + weekly champions **unchanged** (still driven by `test_xp_awards`, which correctly carries per-week XP).
- **Naming-mismatch fix**: every read of the non-existent `coding_test_attempts` replaced with `coding_test_submissions` (grep count now 0). Two spots — the Gradebook cell aggregation and the test-assignments stats — now read coding `score` (already 0-100) as best-per-problem averaged into a test-level %. This also fixes coding-test scores that previously never appeared in the gradebook.
- **Verified** via curl on real preview data: beast → Amy Stapp 7100 XP; class board shows ranked names (7100, 1500); personal ranks → 1st of 19 active. Frontend compiles clean; test session cleaned up.
- NOTE: in **Preview** — redeploy to push to production.

## Leaderboard: active classes + enrolled students only (Mar 2026, "last year's students")
- Problem: last year's students (e.g. Trenton Willingham) still appeared. Root cause: pools aggregated **all** classrooms (incl. archived/previous-year) and Overall/Beast ranked **all** `role:student` users (incl. legacy students no longer in any active class).
- Added `_lb_enrolled_student_ids()` = union of students across **non-archived** classrooms (this year's roster).
- `get_student_ranks` + `/leaderboard/classroom/{id}/ranks`: class/teacher/school classroom queries now filter `is_archived != True`; the Overall pool now uses `_lb_enrolled_student_ids()` (currently-enrolled) instead of all `role:student` users.
- `/leaderboard/beast`: now picks the top `users.xp` among currently-enrolled students only (legacy students ignored).
- **Verified** on preview: enrolled(active)=76 vs 111 total role:student users, so 35 legacy/orphan students are now excluded from Overall/Beast. Beast + ranks return correctly (Amy Stapp 7100, overall total 19 active-with-XP).
- ⚠️ CAVEAT for production: this treats "legacy" = students only in **archived** classes (the only active/legacy marker in the schema). If a teacher's previous-year classes are NOT archived, their students still count — the teacher must **archive old classes** (or remove those students from the active roster) to drop them. A student still sitting in an *active* class roster is, by definition, "currently enrolled" and will show.
- NOTE: in **Preview** — redeploy to push to production.



## Block/Turtle lessons award XP + backfill (Mar 2026)
- **Live fix**: in `submit_assignment`, the `blockly_turtle` and `blockly_turtle_ordered` branches hardcoded `xp_earned: 0` and never touched `users.xp`. Both now, on `is_passing`, compute `calculate_xp_and_coins(base_score, attempt_number==1, streak)`, store it on the submission, AND `$inc users.xp/coins/problems_solved` — exactly like the code/coding-test paths.
- **Backfill** (`POST /api/admin/backfill-turtle-xp`, admin-only, idempotent): awards XP for historical passing turtle lessons saved with 0 XP.
  - SCOPED to `submission_type in [blockly_turtle, blockly_turtle_ordered]` ONLY — regular/coding submissions already incremented `users.xp` at submit time, so including them would double-count.
  - Awards ONCE per (student, problem) using the best passing submission (avoids resubmission inflation); flags every processed submission `xp_backfilled: True` so re-runs are safe. Bumps each student's `users.xp`/`coins`.
  - Admin UI button "Backfill Block/Turtle XP" added to `AdminDashboard.jsx` (`data-testid=admin-backfill-xp-btn`), next to Bind Existing Schools.
- **Verified** on seeded preview data: run → 550 XP / 3 lessons / 2 students, correct per-student totals (s1 0→400, s2 100→250), duplicate 80-score submission NOT double-awarded; re-run → all zeros (idempotent). Test data cleaned up. Frontend compiles clean.
- ⚠️ Run the backfill on **production** via the Admin Dashboard button (I can only run it on preview — separate DBs). Redeploy first.

## Remove / delete students → off leaderboard (Mar 2026)
- **Root bug**: `remove_student_from_classroom` used `$pull {students: student_id}`, which only matches STRING roster entries. Rosters can store students as objects `[{id,name,email}]`, so the pull silently missed them — the student stayed enrolled and kept appearing on the leaderboard (e.g. the teacher's dummy account knocking out real students).
- Fix: removal now pulls all three shapes (`student_id`, `{id: student_id}`, `{student_id: student_id}`) and clears the student's `classroom_id` if it pointed at that class. Since the leaderboard reads `classrooms.students`, a removed student now drops off immediately.
- New `DELETE /api/students/{student_id}` — permanently deletes a student account + ALL data (submissions, mc_test_attempts, coding_test_submissions, test_xp_awards, sessions, user) and pulls them from every classroom roster. Auth: platform admin can delete anyone; a teacher can delete only students in their own classes (else 403).
- Frontend: class **Students** tab cards now have **Remove** (amber, unenroll) and **Delete** (red, permanent) buttons with confirm prompts. testids `remove-student-<id>`, `delete-student-<id>`.
- **Verified** via curl: object-form remove drops student from roster but keeps account; full delete purges user+submissions+awards and removes from roster; non-admin teacher deleting an outsider → 403 (student preserved); admin bypass works. Frontend compiles clean; all test data cleaned up.

## Test/Dummy student flag (Mar 2026)
- New `is_test_account` bool on users. Flagged students are KEPT but hidden from every leaderboard.
- `PATCH /api/students/{student_id}/test-flag` body `{is_test: bool}` — admin can flag anyone; teacher only students in their own classes (else 403).
- Exclusion applied at the choke points: both XP-map helpers (`_lb_year_xp_map` + nested `_year_xp_map`) drop flagged sids → covers ranks, class/teacher/school/overall + classroom-ranks; `/leaderboard/beast` query adds `is_test_account != True`; `_lb_test_account_ids()` used to filter top-quiz-scorers, weekly-champion finalize, and hall-of-fame.
- `GET /classrooms/{id}` `student_details` now handles object-form rosters (via `_lb_extract_ids`) and returns `is_test_account`.
- Frontend: class Students tab card shows a **TEST** badge + a **Mark as test / Unmark test** toggle (`test-flag-<id>`, `test-badge-<id>`), alongside Remove & Delete.
- **Verified** via curl: flagging a 99999-XP dummy removed it from class ranks + beast (real student remained); roster reflects flag; unflagging restored it. Frontend compiles clean; test data cleaned up.
- NOTE: in **Preview** — redeploy to push to production.
- NOTE: in **Preview** — redeploy to push to production.