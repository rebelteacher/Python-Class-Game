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

*Last Updated: Mar 2, 2026*
