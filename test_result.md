#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Build Teacher Reports page for ByteBattles Arena:
  1. Gradebook-style report with assignments across top, students down side (sorted by last name, first name)
  2. Excel (.xlsx) export format (not CSV)
  3. Multi-classroom selection support
  4. Missing/Incomplete assignments report (separate view for individual students)
  5. Integration with existing assignment scoring logic

backend:
  - task: "Create gradebook report endpoint"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Created POST /api/reports/gradebook endpoint that accepts classroom_ids and assignment_ids. Returns structured data with students sorted by last name/first name, scores for each assignment (average of best attempts, 0 for unattempted/locked), and completion dates. Uses existing lesson-scores logic."
  
  - task: "Create missing/incomplete report endpoint"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Created POST /api/reports/missing endpoint that accepts classroom_ids. Returns list of students with their missing (not started) and incomplete assignments. Students sorted by last name/first name."

frontend:
  - task: "Add Teacher Reports route"
    implemented: true
    working: "NA"
    file: "frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added /teacher-reports route in App.js with TeacherReports component, protected for teachers only."
  
  - task: "Add Reports button to Teacher Dashboard"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/TeacherDashboard.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added Reports navigation button with FileSpreadsheet icon in teacher dashboard navbar."
  
  - task: "Build Teacher Reports UI with gradebook layout"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/TeacherReports.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implemented complete Teacher Reports page with: multi-classroom selection, assignment selection (for gradebook), report type toggle (grades/missing), gradebook-style table preview (assignments across top, students down side), missing/incomplete preview cards, Excel export using xlsx library. Color-coded cells in gradebook (green ≥90, yellow ≥70, orange >0, red =0)."
  
  - task: "Implement Excel export functionality"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/TeacherReports.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Installed xlsx library (v0.18.5). Implemented downloadGradebookExcel() for gradebook format (student names in column A, assignments across top) and downloadMissingExcel() for missing/incomplete reports with formatted sections per student."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 3
  run_ui: false

test_plan:
  current_focus:
    - "Create gradebook report endpoint"
    - "Create missing/incomplete report endpoint"
    - "Build Teacher Reports UI with gradebook layout"
    - "Implement Excel export functionality"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Fixed critical backend bugs and removed student library access.
      
      BACKEND FIXES:
      1. 403 Error: Removed incorrect HTTPException at line 862 that was preventing first-time submissions
      2. Lives System: Logic was correct, bug was caused by the same line 862 issue
      
      FRONTEND FIX:
      3. Removed Library button from student dashboard navigation
      
      Please test the following scenarios:
      - First-time assignment submission (should work without 403 error)
      - Lives tracking: Submit code with <70% score 3 times, verify lockout after 3rd failed attempt
      - Verify successful submission (>=70%) does NOT deduct a life
      - Confirm Library button is removed from student dashboard
      
      Test with:
      - Student login
      - Join a classroom
      - Attempt an assignment multiple times with intentionally wrong code
      - Verify lives counter decrements correctly
  - agent: "testing"
    message: |
      ✅ COMPREHENSIVE BACKEND TESTING COMPLETED - ALL CRITICAL FIXES VERIFIED
      
      BACKEND TEST RESULTS (30/30 tests passed - 100% success rate):
      
      🔒 403 FORBIDDEN ERROR FIX - ✅ WORKING
      - First-time submissions now work perfectly (no 403 error)
      - Lives correctly set to 3 on first attempt
      - Attempt number correctly set to 1
      
      ❤️ LIVES SYSTEM - ✅ WORKING PERFECTLY
      - Failing submissions (<70% score) properly deduct lives: 3→2→1→0
      - 4th attempt correctly blocked with 403 error and message
      - Passing submissions (≥70% score) do NOT deduct lives
      - Lives tracking is accurate and consistent
      
      📤 SUBMISSION SYSTEM - ✅ WORKING
      - Assignment submissions work end-to-end
      - XP and coins awarded correctly for passing submissions
      - AI evaluation providing proper scores and feedback
      - Teacher can view all submissions, students see only their own
      
      🔧 API ENDPOINTS - ✅ ALL WORKING
      - Authentication, classrooms, assignments, code execution all functional
      - Proper error handling and status codes
      - Database operations working correctly
      
      ⚠️ FRONTEND: Library button removal not tested (system limitations)
      
      RECOMMENDATION: All critical backend bugs are fixed and verified. Main agent should summarize and finish the task.
  - agent: "user"
    message: "User reports submission still fails - 403 error persists despite passing backend tests"
  - agent: "troubleshoot"
    message: |
      ROOT CAUSE: Submission endpoint missing availability date validation causing intermittent 403s
      - Assignment detail endpoint validates available_date (lines 747-751)
      - Submission endpoint lacked this check
      - Mixed 200/403 responses due to timing-based race condition
      FIX: Add classroom membership + available_date validation in submission endpoint
  - agent: "main"
    message: |
      ADDITIONAL FIX APPLIED - Submission endpoint now validates:
      1. Student is enrolled in assignment's classroom
      2. Assignment available_date has been reached
      3. Prevents submissions to unavailable or unauthorized assignments
      
      Changes made after line 838 in server.py:
      - Added classroom lookup and student membership verification
      - Added available_date check matching assignment detail endpoint
      - Raises 403 with clear error messages
      
      Please retest submission flow with various scenarios:
      - Assignment with available_date in future (should block with clear message)
      - Assignment with available_date in past (should allow)
      - Student not in classroom (should block)
      - Normal submission flow (should work)
  - agent: "main"
    message: |
      TEACHER REPORTS IMPLEMENTATION COMPLETE - READY FOR TESTING
      
      BACKEND ENDPOINTS:
      1. POST /api/reports/gradebook - Generates gradebook data
         - Accepts: classroom_ids[], assignment_ids[]
         - Returns: Students sorted by last name/first name, scores per assignment
         - Score calculation: Average of best attempts (0 for unattempted/locked)
         - Includes completion dates
      
      2. POST /api/reports/missing - Generates missing/incomplete report
         - Accepts: classroom_ids[]
         - Returns: Students with missing (not started) and incomplete assignments
         - Sorted by last name/first name
      
      FRONTEND FEATURES:
      1. Multi-classroom selection with checkboxes
      2. Assignment selection for gradebook reports
      3. Report type toggle (Grades vs Missing/Incomplete)
      4. Live preview table:
         - Gradebook: Assignments across top, students down side
         - Color-coded scores (green/yellow/orange/red)
         - Missing: Individual student cards with lists
      5. Excel export (.xlsx format) using xlsx library
      
      NAVIGATION:
      - Added /teacher-reports route (teachers only)
      - Added Reports button in Teacher Dashboard navbar
      
      Please test the following scenarios:
      - Create teacher account and classrooms with students
      - Create assignments and have students submit work
      - Navigate to Reports page
      - Select multiple classrooms
      - Generate gradebook report (select assignments)
      - Verify table layout (assignments horizontal, students vertical, sorted by last name)
      - Download Excel file and verify format
      - Generate missing/incomplete report
      - Verify student list with missing/incomplete assignments
      - Download Excel file for missing report