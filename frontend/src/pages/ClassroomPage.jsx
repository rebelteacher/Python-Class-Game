import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Users, BookOpen, Trash2, Code2, Trophy, Swords, Edit, Calendar, Clock, Folder, FolderOpen, ChevronRight, ChevronDown, FileQuestion, Lock, Unlock, X } from "lucide-react";
import Leaderboard from "@/components/Leaderboard";
import BattleZone from "@/components/BattleZone";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ClassroomPage({ user }) {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [tests, setTests] = useState([]);
  const [codingTests, setCodingTests] = useState([]);
  const [testAssignments, setTestAssignments] = useState([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [testLibrary, setTestLibrary] = useState([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [selectedLibraryTest, setSelectedLibraryTest] = useState(null);
  const [myClassrooms, setMyClassrooms] = useState([]);
  const [scheduleByClassroom, setScheduleByClassroom] = useState({}); // { [classroomId]: { selected, available_from, due_at } }
  const [assignAllowLate, setAssignAllowLate] = useState(false);
  const [assignLatePenalty, setAssignLatePenalty] = useState(0);
  const [assignAutoReleaseResults, setAssignAutoReleaseResults] = useState(true);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editScheduleDialogOpen, setEditScheduleDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [curriculumData, setCurriculumData] = useState([]);
  const [unlockedLessons, setUnlockedLessons] = useState(new Set());
  const [chapterPlacements, setChapterPlacements] = useState({}); // { "{at}|{chapter}": [placements] }
  const [chapterProgress, setChapterProgress] = useState([]);
  const [expandedCurrChapters, setExpandedCurrChapters] = useState(new Set());
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonPreview, setLessonPreview] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['classwork', 'tests'])); // Open by default
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    starter_code: "",
    solution_code: "",
    test_cases: [{ input_data: "", expected_output: "", description: "" }],
  });

  useEffect(() => {
    fetchClassroom();
    fetchAssignments();
    fetchTests();
    fetchCodingTests();
    fetchCurriculumLocks();
    fetchTestAssignments();
    fetchChapterProgress();
  }, [classroomId]);

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folder)) {
        newSet.delete(folder);
      } else {
        newSet.add(folder);
      }
      return newSet;
    });
  };

  const toggleChapter = (chapter) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapter)) {
        newSet.delete(chapter);
      } else {
        newSet.add(chapter);
      }
      return newSet;
    });
  };

  const toggleLesson = (lessonKey) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonKey)) {
        newSet.delete(lessonKey);
      } else {
        newSet.add(lessonKey);
      }
      return newSet;
    });
  };

  const organizeAssignments = () => {
    const organized = {
      classwork: {},
      tests: {}
    };
    
    console.log("📊 Organizing assignments:", assignments);
    assignments.forEach(assignment => {
      const chapter = assignment.chapter || "Uncategorized";
      const lesson = assignment.lesson || "Lesson 1";
      const folder = 'classwork'; // All assignments go to classwork
      
      if (!organized[folder][chapter]) {
        organized[folder][chapter] = {};
      }
      if (!organized[folder][chapter][lesson]) {
        organized[folder][chapter][lesson] = [];
      }
      organized[folder][chapter][lesson].push(assignment);
    });
    
    console.log("📊 Organizing tests:", tests);
    tests.forEach(test => {
      const chapter = test.chapter || "Uncategorized";
      const lesson = test.lesson || "Lesson 1";
      const folder = 'tests';
      
      if (!organized[folder][chapter]) {
        organized[folder][chapter] = {};
      }
      if (!organized[folder][chapter][lesson]) {
        organized[folder][chapter][lesson] = [];
      }
      organized[folder][chapter][lesson].push(test);
    });
    
    console.log("📁 Organized result:", organized);
    return organized;
  };

  const organizedAssignments = organizeAssignments();
  console.log("🎯 Final organizedAssignments:", organizedAssignments);

  const fetchClassroom = async () => {
    try {
      const response = await axios.get(`${API}/classrooms/${classroomId}`, {
        withCredentials: true,
      });
      setClassroom(response.data);
      // Load unlocked lessons
      if (response.data?.unlocked_lessons) {
        setUnlockedLessons(new Set(response.data.unlocked_lessons));
      }
    } catch (error) {
      console.error("Error fetching classroom:", error);
      toast.error("Failed to load classroom");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await axios.get(`${API}/assignments/classroom/${classroomId}`, {
        withCredentials: true,
      });
      setAssignments(response.data);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load assignments");
    }
  };

  const fetchCurriculumLocks = async () => {
    try {
      const response = await axios.get(`${API}/curriculum/units`, { withCredentials: true });
      setCurriculumData(response.data);
      // Load current unlocked lessons from classroom data
      if (classroom?.unlocked_lessons) {
        setUnlockedLessons(new Set(classroom.unlocked_lessons));
      }
    } catch (error) {
      console.error("Error fetching curriculum:", error);
    }
  };

  const handleToggleLessonLock = async (lessonKey) => {
    const isCurrentlyUnlocked = unlockedLessons.has(lessonKey);
    const action = isCurrentlyUnlocked ? "lock" : "unlock";
    try {
      await axios.post(`${API}/classrooms/${classroomId}/toggle-lesson-lock`, {
        lesson_key: lessonKey, action,
      }, { withCredentials: true });
      setUnlockedLessons(prev => {
        const next = new Set(prev);
        isCurrentlyUnlocked ? next.delete(lessonKey) : next.add(lessonKey);
        return next;
      });
    } catch (error) {
      console.error("Error toggling lesson lock:", error);
      toast.error("Failed to update lesson lock");
    }
  };

  const fetchChapterPlacements = async (assignmentType, chapter) => {
    const key = `${assignmentType}|${chapter}`;
    try {
      const res = await axios.get(`${API}/curriculum/test-placements`, {
        params: { assignment_type: assignmentType, chapter, classroom_id: classroomId },
        withCredentials: true,
      });
      setChapterPlacements(prev => ({ ...prev, [key]: res.data.placements || [] }));
    } catch (error) {
      console.error("Error fetching chapter placements:", error);
    }
  };

  const fetchChapterProgress = async () => {
    try {
      const res = await axios.get(`${API}/classrooms/${classroomId}/chapter-progress`, { withCredentials: true });
      setChapterProgress(res.data?.rows || []);
    } catch (error) {
      // Non-teachers will 403 — silently ignore
      if (error.response?.status !== 403) console.error("Error fetching chapter progress:", error);
    }
  };

  const handleToggleTestUnlock = async (placement) => {
    try {
      await axios.post(`${API}/classrooms/${classroomId}/toggle-test-unlock`, {
        placement_id: placement.id,
      }, { withCredentials: true });
      toast.success(placement.unlocked_by_teacher ? "Test locked" : "Test unlocked");
      // Refresh just this chapter
      const unit = curriculumData.find(u => u.chapters.some(c => c.name === placement.chapter));
      if (unit) fetchChapterPlacements(unit.assignment_type, placement.chapter);
      // Refresh class progress to update unlock badges in the widget
      fetchChapterProgress();
    } catch (error) {
      console.error("Error toggling test unlock:", error);
      toast.error("Failed to toggle test unlock");
    }
  };



  const fetchTests = async () => {
    try {
      const response = await axios.get(`${API}/mc-tests/classroom/${classroomId}`, {
        withCredentials: true,
      });
      setTests(response.data);
    } catch (error) {
      console.error("Error fetching tests:", error);
      toast.error("Failed to load tests");
    }
  };

  const fetchCodingTests = async () => {
    try {
      const response = await axios.get(`${API}/coding-tests/classroom/${classroomId}`, {
        withCredentials: true,
      });
      setCodingTests(response.data);
    } catch (error) {
      console.error("Error fetching coding tests:", error);
      toast.error("Failed to load coding tests");
    }
  };

  const fetchTestAssignments = async () => {
    try {
      const res = await axios.get(`${API}/classrooms/${classroomId}/test-assignments`, { withCredentials: true });
      setTestAssignments(res.data.assignments || []);
    } catch (error) {
      console.error("Error fetching test assignments:", error);
    }
  };

  const openAssignDialog = async () => {
    try {
      const [libRes, classroomsRes] = await Promise.all([
        axios.get(`${API}/admin-tests/library`, { withCredentials: true }),
        axios.get(`${API}/classrooms`, { withCredentials: true }),
      ]);
      setTestLibrary(libRes.data.tests || []);
      const teacherClassrooms = (classroomsRes.data || []).filter(c => !c.is_archived);
      setMyClassrooms(teacherClassrooms);
      // Default: only the current classroom is preselected
      const initSchedule = {};
      teacherClassrooms.forEach(c => {
        initSchedule[c.id] = {
          selected: c.id === classroomId,
          available_from: "",
          due_at: "",
        };
      });
      setScheduleByClassroom(initSchedule);
      setSelectedLibraryTest(null);
      setLibrarySearch("");
      setAssignAllowLate(false);
      setAssignLatePenalty(0);
      setAssignAutoReleaseResults(true);
      setAssignDialogOpen(true);
    } catch (error) {
      console.error("Error opening assign dialog:", error);
      toast.error("Failed to load test library");
    }
  };

  const submitAssignTest = async () => {
    if (!selectedLibraryTest) {
      toast.error("Pick a test from the library");
      return;
    }
    const schedules = Object.entries(scheduleByClassroom)
      .filter(([, v]) => v.selected)
      .map(([cid, v]) => ({
        classroom_id: cid,
        available_from: v.available_from || null,
        due_at: v.due_at || null,
      }));
    if (schedules.length === 0) {
      toast.error("Select at least one classroom");
      return;
    }
    setAssignSubmitting(true);
    try {
      const res = await axios.post(
        `${API}/test-assignments/bulk`,
        {
          test_id: selectedLibraryTest.id,
          test_type: selectedLibraryTest.test_type,
          schedules,
          allow_late: assignAllowLate,
          late_penalty_percent: assignLatePenalty,
          auto_release_results: assignAutoReleaseResults,
        },
        { withCredentials: true }
      );
      toast.success(`Assigned to ${res.data.assigned} classroom${res.data.assigned !== 1 ? "s" : ""}`);
      setAssignDialogOpen(false);
      fetchTestAssignments();
    } catch (error) {
      console.error("Error assigning test:", error);
      toast.error(error.response?.data?.detail || "Failed to assign test");
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleDeleteTestAssignment = async (assignmentId) => {
    if (!window.confirm("Unassign this test from the classroom? Students will lose access.")) return;
    try {
      await axios.delete(`${API}/test-assignments/${assignmentId}`, { withCredentials: true });
      toast.success("Test unassigned");
      fetchTestAssignments();
    } catch (error) {
      console.error("Error deleting test assignment:", error);
      toast.error("Failed to unassign test");
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    
    if (!newAssignment.title.trim() || !newAssignment.solution_code.trim()) {
      toast.error("Please fill in title and solution code");
      return;
    }

    // Filter out empty test cases
    const validTestCases = newAssignment.test_cases.filter(
      tc => tc.description.trim() || tc.input_data.trim() || tc.expected_output.trim()
    );

    try {
      await axios.post(
        `${API}/assignments`,
        {
          ...newAssignment,
          classroom_id: classroomId,
          test_cases: validTestCases,
        },
        { withCredentials: true }
      );
      toast.success("Assignment created successfully!");
      setCreateDialogOpen(false);
      setNewAssignment({
        title: "",
        description: "",
        starter_code: "",
        solution_code: "",
        test_cases: [{ input_data: "", expected_output: "", description: "" }],
      });
      fetchAssignments();
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error("Failed to create assignment");
    }
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    try {
      const availableDateTime = editingAssignment.available_date && editingAssignment.available_time
        ? `${editingAssignment.available_date}T${editingAssignment.available_time}:00Z`
        : null;
      
      const dueDateTime = editingAssignment.due_date && editingAssignment.due_time
        ? `${editingAssignment.due_date}T${editingAssignment.due_time}:00Z`
        : null;
      
      if (editingAssignment.isTest) {
        // Update MC test schedule
        await axios.put(
          `${API}/mc-tests/${editingAssignment.id}/schedule`,
          {
            available_date: availableDateTime,
            due_date: dueDateTime
          },
          { withCredentials: true }
        );
        toast.success("Test schedule updated!");
      } else if (editingAssignment.isCodingTest) {
        // Update Coding test schedule
        await axios.put(
          `${API}/coding-tests/${editingAssignment.id}/schedule`,
          {
            available_date: availableDateTime,
            due_date: dueDateTime
          },
          { withCredentials: true }
        );
        toast.success("Coding test schedule updated!");
      } else {
        // Update assignment details via new endpoint
        await axios.put(
          `${API}/assignments/${editingAssignment.id}`,
          {
            title: editingAssignment.title,
            chapter: editingAssignment.chapter,
            lesson: editingAssignment.lesson,
            due_date: dueDateTime
          },
          { withCredentials: true }
        );
        
        // Update schedule via existing endpoint
        await axios.put(
          `${API}/assignments/${editingAssignment.id}/schedule`,
          {
            available_date: availableDateTime,
            due_date: dueDateTime,
            allow_late_submission: editingAssignment.allow_late_submission,
            late_penalty_percent: parseInt(editingAssignment.late_penalty_percent)
          },
          { withCredentials: true }
        );
        toast.success("Assignment updated!");
      }
      
      setEditScheduleDialogOpen(false);
      setEditingAssignment(null);
      fetchAssignments();
      fetchTests();
      fetchCodingTests();
    } catch (error) {
      console.error("Error updating:", error);
      toast.error(editingAssignment.isTest ? "Failed to update test" : "Failed to update assignment");
    }
  };

  const handleOpenLessonDialog = async (assignment) => {
    // Fetch existing lesson if it exists
    try {
      const response = await axios.get(`${API}/lessons/${assignment.id}`, {
        withCredentials: true
      });
      
      if (response.data.exists === false) {
        // No lesson exists, create new
        setEditingLesson({
          assignment_id: assignment.id,
          assignment_title: assignment.title,
          title: `Learn: ${assignment.title}`,
          content: "# Welcome!\n\nAdd your lesson content here with markdown...\n\n## Example:\n```python\nprint('Hello, World!')\n```\n\n![Add image URL](https://example.com/image.jpg)"
        });
      } else {
        // Lesson exists, edit it
        setEditingLesson({
          ...response.data,
          assignment_title: assignment.title
        });
      }
      setLessonDialogOpen(true);
    } catch (error) {
      console.error("Error fetching lesson:", error);
      toast.error("Failed to load lesson");
    }
  };

  const handleSaveLesson = async () => {
    try {
      let lessonId = editingLesson.id;
      
      if (editingLesson.id) {
        // Update existing lesson
        await axios.put(
          `${API}/lessons/${editingLesson.id}`,
          {
            assignment_id: editingLesson.assignment_id,
            title: editingLesson.title,
            content: editingLesson.content,
            problem_id: null
          },
          { withCredentials: true }
        );
        toast.success("Lesson updated!");
      } else {
        // Create new lesson
        const response = await axios.post(
          `${API}/lessons`,
          {
            assignment_id: editingLesson.assignment_id,
            title: editingLesson.title,
            content: editingLesson.content,
            problem_id: null
          },
          { withCredentials: true }
        );
        lessonId = response.data.lesson_id; // Fixed: use lesson_id from response
        toast.success("Lesson created!");
      }
      
      // Upload video if a file was selected
      if (editingLesson.videoFile && lessonId) {
        toast.info("Uploading video...");
        const formData = new FormData();
        formData.append("video", editingLesson.videoFile);
        
        await axios.post(
          `${API}/lessons/${lessonId}/upload-video`,
          formData,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              console.log(`Upload progress: ${percentCompleted}%`);
            }
          }
        );
        toast.success("Video uploaded!");
      }
      
      setLessonDialogOpen(false);
      setEditingLesson(null);
    } catch (error) {
      console.error("Error saving lesson:", error);
      toast.error(error.response?.data?.detail || "Failed to save lesson");
    }
  };

  const handleDeleteLesson = async () => {
    if (!window.confirm("Are you sure you want to delete this lesson?")) {
      return;
    }

    try {
      await axios.delete(`${API}/lessons/${editingLesson.id}`, {
        withCredentials: true
      });
      toast.success("Lesson deleted");
      setLessonDialogOpen(false);
      setEditingLesson(null);
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast.error("Failed to delete lesson");
    }
  };

  const handleDeleteAssignment = async (assignmentId, assignmentTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${assignmentTitle}"? This will also delete all student submissions.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/assignments/${assignmentId}`, {
        withCredentials: true
      });
      toast.success("Assignment deleted");
      fetchAssignments();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast.error("Failed to delete assignment");
    }
  };

  const addTestCase = () => {
    setNewAssignment({
      ...newAssignment,
      test_cases: [...newAssignment.test_cases, { input_data: "", expected_output: "", description: "" }],
    });
  };

  const removeTestCase = (index) => {
    const updatedTestCases = newAssignment.test_cases.filter((_, i) => i !== index);
    setNewAssignment({ ...newAssignment, test_cases: updatedTestCases });
  };

  const updateTestCase = (index, field, value) => {
    const updatedTestCases = [...newAssignment.test_cases];
    updatedTestCases[index][field] = value;
    setNewAssignment({ ...newAssignment, test_cases: updatedTestCases });
  };

  if (loading) {
    return (
      <div data-testid="classroom-loading" className="min-h-screen flex items-center justify-center bg-cyber-black cyber-grid-bg">
        <div className="text-xl text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-black cyber-grid-bg">
        <div className="text-xl text-slate-400">Classroom not found</div>
      </div>
    );
  }

  const isTeacher = user.role === "teacher";

  return (
    <div data-testid="classroom-page" className="min-h-screen bg-cyber-black cyber-grid-bg">
      <nav className="bg-cyber-navy/80 backdrop-blur-xl border-b border-cyber-cyan/20">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button data-testid="back-btn" onClick={() => navigate(isTeacher ? "/teacher/dashboard" : "/student/dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-2">
              <Code2 className="w-7 h-7 text-cyber-cyan" />
              <span className="text-xl font-bold text-white">{classroom.name}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-sm font-mono font-semibold">
              {classroom.class_code}
            </span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        <Tabs defaultValue={isTeacher ? "lessons" : "tests"} className="w-full">
          <TabsList className="mb-8">
            {isTeacher && (
              <TabsTrigger data-testid="lessons-tab" value="lessons" className="gap-2">
                <Lock className="w-4 h-4" />
                Lesson Locks
              </TabsTrigger>
            )}
            <TabsTrigger data-testid="tests-tab" value="tests" className="gap-2">
              <FileQuestion className="w-4 h-4" />
              Tests
            </TabsTrigger>
            <TabsTrigger data-testid="battles-tab" value="battles" className="gap-2">
              <Swords className="w-4 h-4" />
              Battles
            </TabsTrigger>
            <TabsTrigger data-testid="leaderboard-tab" value="leaderboard" className="gap-2">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </TabsTrigger>
            {isTeacher && (
              <TabsTrigger data-testid="students-tab" value="students" className="gap-2">
                <Users className="w-4 h-4" />
                Students
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="tests">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Tests</h2>
                <p className="text-sm text-slate-500 font-chakra">
                  {isTeacher
                    ? "Assign tests from the admin library and schedule each class separately."
                    : "Tests your teacher has assigned to this class."}
                </p>
              </div>
              {isTeacher && (
                <Button
                  data-testid="open-assign-test-btn"
                  onClick={openAssignDialog}
                  className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-orbitron uppercase tracking-widest text-xs rounded-none gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Assign Test
                </Button>
              )}
            </div>

            {testAssignments.length === 0 ? (
              <div className="text-center py-20 border border-cyber-cyan/20 rounded-none bg-cyber-navy/30">
                <FileQuestion className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-300 mb-2">
                  {isTeacher ? "No tests assigned to this class yet" : "No tests available yet"}
                </h3>
                <p className="text-slate-500 mb-6">
                  {isTeacher
                    ? "Click 'Assign Test' to browse the admin library and schedule one."
                    : "Tests will appear here as soon as your teacher assigns them."}
                </p>
              </div>
            ) : (
              <div data-testid="test-assignments-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testAssignments.map((a) => {
                  const now = new Date();
                  const availFrom = a.available_from ? new Date(a.available_from) : null;
                  const dueAt = a.due_at ? new Date(a.due_at) : null;
                  const isScheduled = availFrom && now < availFrom;
                  const isClosed = dueAt && now > dueAt;
                  const isAvailable = !isScheduled && !isClosed;
                  const typeBadgeClass = a.test_type === "coding"
                    ? "border-purple-500/50 text-purple-300 bg-purple-500/10"
                    : "border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10";

                  return (
                    <Card key={a.assignment_id} data-testid={`test-assignment-${a.assignment_id}`} className="bg-cyber-navy/40 border border-cyber-cyan/20 rounded-none hover:border-cyber-cyan/50 transition-all">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <CardTitle className="text-white font-orbitron text-sm uppercase tracking-wider truncate">{a.title}</CardTitle>
                            {(a.chapter || a.lesson) && (
                              <CardDescription className="text-xs text-slate-500 truncate">
                                {[a.chapter, a.lesson].filter(Boolean).join(" · ")}
                              </CardDescription>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 border text-[10px] font-orbitron uppercase tracking-widest rounded-none shrink-0 ${typeBadgeClass}`}>
                            {a.test_type === "coding" ? "Coding" : "MC"}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                          <FileQuestion className="w-4 h-4" />
                          <span>{a.num_questions} {a.test_type === "coding" ? "problems" : "questions"}</span>
                          {a.time_limit_minutes > 0 && (
                            <>
                              <Clock className="w-4 h-4 ml-2" />
                              <span>{a.time_limit_minutes}m</span>
                            </>
                          )}
                        </div>
                        {availFrom && (
                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Opens: {availFrom.toLocaleString()}</span>
                          </div>
                        )}
                        {dueAt && (
                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Due: {dueAt.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="pt-2">
                          {isScheduled && (
                            <span className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 text-xs rounded-none font-orbitron uppercase tracking-widest">Scheduled</span>
                          )}
                          {isClosed && (
                            <span className="px-2 py-1 bg-slate-500/10 border border-slate-500/40 text-slate-400 text-xs rounded-none font-orbitron uppercase tracking-widest">Closed</span>
                          )}
                          {isAvailable && (
                            <span className="px-2 py-1 bg-green-500/10 border border-green-500/40 text-green-400 text-xs rounded-none font-orbitron uppercase tracking-widest">Available</span>
                          )}
                        </div>
                        <div className="pt-3 flex gap-2">
                          {!isTeacher && isAvailable && (
                            <Button
                              data-testid={`take-test-${a.assignment_id}`}
                              size="sm"
                              className="flex-1 bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-orbitron uppercase tracking-widest text-xs rounded-none"
                              onClick={() => navigate(a.test_type === "coding" ? `/coding-test/${a.test_id}` : `/test/${a.test_id}`)}
                            >
                              Start Test
                            </Button>
                          )}
                          {isTeacher && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 rounded-none"
                                onClick={() => navigate(a.test_type === "coding" ? `/coding-tests/${a.test_id}/submissions` : `/test/${a.test_id}/results`)}
                              >
                                Results
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid={`unassign-test-${a.assignment_id}`}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => handleDeleteTestAssignment(a.assignment_id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="battles">
            <BattleZone classroomId={classroomId} isTeacher={isTeacher} />
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard classroomId={classroomId} currentUserId={user.id} />
          </TabsContent>

          {isTeacher && (
            <TabsContent value="students">
              <h2 className="text-2xl font-bold text-white mb-6">Students</h2>
              {classroom.student_details?.length === 0 ? (
                <div data-testid="no-students" className="text-center py-20">
                  <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">No students yet</h3>
                  <p className="text-slate-500">Share the class code with students to join</p>
                </div>
              ) : (
                <div data-testid="students-list" className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classroom.student_details.map((student) => (
                    <Card key={student.id} data-testid={`student-card-${student.id}`}>
                      <CardHeader>
                        <CardTitle className="text-base">{student.name}</CardTitle>
                        <CardDescription className="text-sm">{student.email}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* Lesson Locks Tab */}
          {isTeacher && (
            <TabsContent value="lessons">
              <div className="space-y-4">
                {/* Class Progress Widget */}
                {chapterProgress.filter(r => r.has_chapter_test).length > 0 && (
                  <div data-testid="class-progress-widget" className="border border-cyber-magenta/30 rounded-none bg-gradient-to-br from-cyber-magenta/10 via-cyber-navy/40 to-cyber-cyan/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-base font-orbitron text-cyber-magenta uppercase tracking-widest">Class Progress</h3>
                        <p className="text-xs text-slate-500 font-chakra">Chapter-test readiness across this classroom</p>
                      </div>
                      <span className="text-xs font-fira text-cyber-magenta">
                        {chapterProgress.filter(r => r.has_chapter_test).length} chapter tests assigned
                      </span>
                    </div>
                    <div className="space-y-2">
                      {chapterProgress.filter(r => r.has_chapter_test).map(row => {
                        const ready = row.readiness_percent;
                        const barClass = ready >= 80 ? "bg-cyber-lime" : ready >= 40 ? "bg-yellow-400" : "bg-cyber-magenta";
                        return (
                          <div key={`${row.assignment_type}|${row.chapter}`} className="border border-cyber-cyan/15 rounded-none bg-cyber-black/40 p-3">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="min-w-0">
                                <div className="text-sm text-white font-chakra truncate">{row.chapter}</div>
                                <div className="text-[11px] text-slate-500 font-fira">
                                  {row.assignment_type.toUpperCase()} · Test: {row.chapter_test_title || "(untitled)"}
                                </div>
                              </div>
                              <Button
                                data-testid={`progress-unlock-${row.chapter_test_placement_id}`}
                                size="sm"
                                onClick={() => handleToggleTestUnlock({
                                  id: row.chapter_test_placement_id,
                                  chapter: row.chapter,
                                  unlocked_by_teacher: row.chapter_test_unlocked,
                                })}
                                className={`shrink-0 rounded-none h-7 px-3 text-xs font-orbitron uppercase tracking-wider border ${
                                  row.chapter_test_unlocked
                                    ? "bg-cyber-red/10 text-cyber-red border-cyber-red/40 hover:bg-cyber-red/20"
                                    : "bg-cyber-magenta/10 text-cyber-magenta border-cyber-magenta/40 hover:bg-cyber-magenta/20"
                                }`}
                              >
                                {row.chapter_test_unlocked ? "Lock for class" : "Unlock for class"}
                              </Button>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-cyber-navy/80 border border-cyber-cyan/15 overflow-hidden rounded-none">
                                <div
                                  className={`h-full ${barClass} shadow-[0_0_8px_currentColor] transition-all`}
                                  style={{ width: `${ready}%` }}
                                />
                              </div>
                              <span className="text-xs font-fira text-slate-300 shrink-0 min-w-[70px] text-right">
                                {row.completed_count}/{row.total_students}
                                <span className="text-slate-500 ml-1">({ready}%)</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-orbitron text-white uppercase tracking-wider">Lesson Locks</h3>
                    <p className="text-sm text-slate-500 font-chakra">Toggle which lessons students in this class can access</p>
                  </div>
                  <span className="text-xs font-fira text-cyber-cyan">{unlockedLessons.size} unlocked</span>
                </div>

                {curriculumData.map(unit => (
                  <div key={unit.name} className="border border-cyber-cyan/15 rounded-none">
                    <div className="p-3 bg-cyber-navy/40 border-b border-cyber-cyan/10">
                      <span className="font-orbitron text-sm text-white uppercase tracking-wider">{unit.name}</span>
                    </div>
                    <div className="divide-y divide-cyber-cyan/5">
                      {unit.chapters.map(chapter => (
                        <div key={chapter.name}>
                          <button
                            onClick={() => {
                              setExpandedCurrChapters(prev => {
                                const next = new Set(prev);
                                next.has(chapter.name) ? next.delete(chapter.name) : next.add(chapter.name);
                                return next;
                              });
                              fetchChapterPlacements(unit.assignment_type, chapter.name);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2 hover:bg-cyber-navy/30 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {expandedCurrChapters.has(chapter.name) ? <ChevronDown className="w-3.5 h-3.5 text-cyber-cyan" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                              <span className="text-sm font-chakra text-slate-300">{chapter.name}</span>
                            </div>
                            <span className="text-xs text-slate-600">{chapter.lessons.length} lessons</span>
                          </button>

                          {expandedCurrChapters.has(chapter.name) && (
                            <div className="pl-8 pr-4 pb-2 space-y-1">
                              {chapter.lessons.map(lesson => {
                                const lessonKey = `${unit.assignment_type}|${chapter.name}|${lesson.name}`;
                                const isUnlocked = unlockedLessons.has(lessonKey);
                                return (
                                  <div key={lessonKey} className="flex items-center justify-between py-1.5">
                                    <div className="flex items-center gap-2">
                                      {isUnlocked
                                        ? <Unlock className="w-3.5 h-3.5 text-cyber-lime" />
                                        : <Lock className="w-3.5 h-3.5 text-slate-600" />}
                                      <span className={`text-sm font-chakra ${isUnlocked ? 'text-slate-200' : 'text-slate-500'}`}>
                                        {lesson.name}
                                      </span>
                                      <span className="text-xs text-slate-600 font-fira">{lesson.problem_count}</span>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleToggleLessonLock(lessonKey)}
                                      className={`rounded-none h-7 px-3 text-xs font-orbitron uppercase tracking-wider ${
                                        isUnlocked
                                          ? 'text-cyber-red hover:bg-cyber-red/10 border border-cyber-red/30'
                                          : 'text-cyber-lime hover:bg-cyber-lime/10 border border-cyber-lime/30'
                                      }`}
                                    >
                                      {isUnlocked ? 'Lock' : 'Unlock'}
                                    </Button>
                                  </div>
                                );
                              })}
                              {(chapterPlacements[`${unit.assignment_type}|${chapter.name}`] || []).map(p => (
                                <div key={p.id} data-testid={`placement-toggle-${p.id}`} className="flex items-center justify-between py-1.5 border-t border-cyber-magenta/15 mt-1 pt-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {p.unlocked_by_teacher
                                      ? <Unlock className="w-3.5 h-3.5 text-cyber-magenta" />
                                      : <Lock className="w-3.5 h-3.5 text-slate-600" />}
                                    <span className="text-[10px] font-orbitron uppercase tracking-widest text-cyber-magenta shrink-0">
                                      {p.placement_type === "lesson_quiz" ? "Quiz" : "Chapter Test"}
                                    </span>
                                    <span className={`text-sm font-chakra truncate ${p.unlocked_by_teacher ? 'text-slate-200' : 'text-slate-500'}`}>
                                      {p.title}
                                    </span>
                                    {p.placement_type === "lesson_quiz" && p.lesson && (
                                      <span className="text-xs text-slate-600 font-fira truncate">→ {p.lesson}</span>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleToggleTestUnlock(p)}
                                    className={`rounded-none h-7 px-3 text-xs font-orbitron uppercase tracking-wider shrink-0 ${
                                      p.unlocked_by_teacher
                                        ? 'text-cyber-red hover:bg-cyber-red/10 border border-cyber-red/30'
                                        : 'text-cyber-magenta hover:bg-cyber-magenta/10 border border-cyber-magenta/30'
                                    }`}
                                  >
                                    {p.unlocked_by_teacher ? 'Lock' : 'Unlock'}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Edit Schedule Dialog */}
        {editingAssignment && (
          <Dialog open={editScheduleDialogOpen} onOpenChange={setEditScheduleDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Assignment</DialogTitle>
                <DialogDescription>
                  Update assignment details, chapter/lesson, and schedule
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateSchedule} className="space-y-4">
                {/* Title, Chapter, Lesson */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-title">Assignment Title</Label>
                    <Input
                      id="edit-title"
                      type="text"
                      value={editingAssignment.title}
                      onChange={(e) => setEditingAssignment({ ...editingAssignment, title: e.target.value })}
                      className="mt-1"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-chapter">Chapter</Label>
                      <Input
                        id="edit-chapter"
                        type="text"
                        placeholder="e.g., Chapter 1"
                        value={editingAssignment.chapter || ""}
                        onChange={(e) => setEditingAssignment({ ...editingAssignment, chapter: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-lesson">Lesson</Label>
                      <Input
                        id="edit-lesson"
                        type="text"
                        placeholder="e.g., Lesson 1"
                        value={editingAssignment.lesson || ""}
                        onChange={(e) => setEditingAssignment({ ...editingAssignment, lesson: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Schedule Section */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-3 text-slate-300">Schedule</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-available-date">Available Date</Label>
                      <Input
                        id="edit-available-date"
                        type="date"
                        value={editingAssignment.available_date}
                        onChange={(e) => setEditingAssignment({ ...editingAssignment, available_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-available-time">Available Time</Label>
                      <Input
                        id="edit-available-time"
                        type="time"
                        value={editingAssignment.available_time}
                        onChange={(e) => setEditingAssignment({ ...editingAssignment, available_time: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-due-date">Due Date</Label>
                      <Input
                        id="edit-due-date"
                        type="date"
                        value={editingAssignment.due_date}
                        onChange={(e) => setEditingAssignment({ ...editingAssignment, due_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-due-time">Due Time</Label>
                      <Input
                        id="edit-due-time"
                        type="time"
                        value={editingAssignment.due_time}
                        onChange={(e) => setEditingAssignment({ ...editingAssignment, due_time: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-allow-late"
                      checked={editingAssignment.allow_late_submission}
                      onChange={(e) => setEditingAssignment({ ...editingAssignment, allow_late_submission: e.target.checked })}
                    />
                    <label htmlFor="edit-allow-late" className="text-sm font-medium cursor-pointer">
                      Allow late submissions
                    </label>
                  </div>
                  {editingAssignment.allow_late_submission && (
                    <div>
                      <Label htmlFor="edit-late-penalty">Late Penalty (%)</Label>
                      <Input
                        id="edit-late-penalty"
                        type="number"
                        min="0"
                        max="100"
                        value={editingAssignment.late_penalty_percent}
                        onChange={(e) => setEditingAssignment({ ...editingAssignment, late_penalty_percent: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold">
                  Update Assignment
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Lesson Management Dialog */}
        {lessonDialogOpen && editingLesson && (
          <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
            <DialogContent className="max-w-[90vw] max-h-[90vh] w-full overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  {editingLesson.id ? "Edit" : "Create"} Lesson: {editingLesson.assignment_title}
                </DialogTitle>
                <DialogDescription>
                  Add learning materials with text, images, memes, and code examples using Markdown
                </DialogDescription>
              </DialogHeader>

              <Tabs value={lessonPreview ? "preview" : "edit"} onValueChange={(v) => setLessonPreview(v === "preview")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="edit">✏️ Edit</TabsTrigger>
                  <TabsTrigger value="preview">👁️ Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="space-y-4">
                  <div>
                    <Label htmlFor="lesson-title">Lesson Title</Label>
                    <Input
                      id="lesson-title"
                      value={editingLesson.title}
                      onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                      placeholder="e.g., Learn: Understanding Loops"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lesson-content">Lesson Content (Markdown)</Label>
                    <Textarea
                      id="lesson-content"
                      value={editingLesson.content}
                      onChange={(e) => setEditingLesson({ ...editingLesson, content: e.target.value })}
                      placeholder="Use markdown to format your lesson..."
                      rows={20}
                      className="mt-1 font-mono text-sm"
                    />
                  </div>

                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <Label className="text-purple-900 font-semibold flex items-center gap-2">
                      🎥 Tutorial Video (Optional)
                    </Label>
                    <p className="text-sm text-purple-400 mb-3">Upload a screen recording to help students learn (up to 10 minutes, MP4/WEBM)</p>
                    
                    {editingLesson.video_filename ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-cyber-navy/60 border border-purple-300 rounded px-3 py-2 text-sm">
                          ✅ Video uploaded: {editingLesson.video_filename}
                        </div>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (window.confirm("Remove this video?")) {
                              setEditingLesson({ ...editingLesson, video_filename: null });
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Store file temporarily - will upload when saving
                            setEditingLesson({ ...editingLesson, videoFile: file });
                          }
                        }}
                        className="block w-full text-sm text-purple-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                      />
                    )}
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">📝 Markdown Tips:</h4>
                      <ul className="text-sm text-blue-400 space-y-1">
                        <li>• <code># Heading</code> for titles</li>
                        <li>• <code>**bold**</code> for emphasis</li>
                        <li>• <code>`code`</code> for inline code</li>
                        <li>• <code>```python</code> (on new line) for code blocks</li>
                      </ul>
                    </div>
                    
                    <div className="border-t border-blue-300 pt-3">
                      <h4 className="font-semibold text-blue-900 mb-2">🖼️ How to Add Memes/Images:</h4>
                      <ol className="text-sm text-blue-400 space-y-2">
                        <li className="font-medium">1. Find your meme/image online (Google, Imgflip, etc.)</li>
                        <li className="font-medium">2. Right-click the image → "Copy image address" or "Copy image link"</li>
                        <li className="font-medium">3. Paste in this format: <code className="bg-cyber-navy/60 px-1">![Description](paste-url-here)</code></li>
                        <li className="pl-4">
                          <strong>Example:</strong><br/>
                          <code className="bg-cyber-navy/60 px-2 py-1 block mt-1">![Funny loop meme](https://i.imgflip.com/7k3jqx.jpg)</code>
                        </li>
                        <li className="text-blue-600 font-medium">💡 Popular meme sites: imgflip.com, imgur.com, quickmeme.com</li>
                      </ol>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="border rounded-lg p-6 bg-cyber-navy/60 min-h-[400px]">
                  <div className="prose prose-sm max-w-none">
                    <h2 className="text-2xl font-bold mb-4">{editingLesson.title}</h2>
                    <div className="whitespace-pre-wrap">{editingLesson.content}</div>
                    <p className="text-sm text-slate-500 mt-4 italic">
                      Note: Full preview with markdown rendering will show to students
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between pt-4 border-t">
                <div>
                  {editingLesson.id && (
                    <Button
                      onClick={handleDeleteLesson}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Lesson
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setLessonDialogOpen(false);
                      setEditingLesson(null);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveLesson}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {editingLesson.id ? "Update" : "Create"} Lesson
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Assign Test Dialog (teacher only) */}
        {isTeacher && (
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogContent data-testid="assign-test-dialog" className="max-w-4xl max-h-[90vh] overflow-y-auto bg-cyber-navy/95 border border-cyber-cyan/40 rounded-none">
              <DialogHeader>
                <DialogTitle className="text-white font-orbitron uppercase tracking-widest text-lg">
                  Assign Test
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-chakra">
                  Pick a test from the admin library, then schedule it for one or more of your classes.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Step 1: Pick a test */}
                <div>
                  <Label className="text-cyber-cyan font-orbitron text-xs uppercase tracking-widest">1. Choose a Test</Label>
                  <Input
                    data-testid="library-search"
                    placeholder="Search by title, chapter, or lesson"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    className="mt-2 bg-cyber-black/50 border-cyber-cyan/30 rounded-none text-white"
                  />
                  <div className="mt-3 max-h-64 overflow-y-auto border border-cyber-cyan/20 rounded-none divide-y divide-cyber-cyan/10">
                    {testLibrary.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-sm">
                        No admin-created tests in the library yet. Ask an admin to create some.
                      </div>
                    ) : (
                      testLibrary
                        .filter(t => {
                          const q = librarySearch.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            (t.title || "").toLowerCase().includes(q) ||
                            (t.chapter || "").toLowerCase().includes(q) ||
                            (t.lesson || "").toLowerCase().includes(q)
                          );
                        })
                        .map((t) => {
                          const isSelected = selectedLibraryTest?.id === t.id && selectedLibraryTest?.test_type === t.test_type;
                          const typeBadge = t.test_type === "coding"
                            ? "border-purple-500/50 text-purple-300 bg-purple-500/10"
                            : "border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10";
                          return (
                            <button
                              key={`${t.test_type}-${t.id}`}
                              type="button"
                              data-testid={`library-test-${t.id}`}
                              onClick={() => setSelectedLibraryTest(t)}
                              className={`w-full text-left p-3 hover:bg-cyber-cyan/5 transition-colors flex items-center justify-between gap-3 ${isSelected ? "bg-cyber-cyan/10 border-l-2 border-l-cyber-cyan" : ""}`}
                            >
                              <div className="min-w-0">
                                <div className="text-sm text-white font-medium truncate">{t.title}</div>
                                {(t.chapter || t.lesson) && (
                                  <div className="text-xs text-slate-500 truncate">{[t.chapter, t.lesson].filter(Boolean).join(" · ")}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-slate-500">
                                  {t.test_type === "coding" ? `${t.num_questions} problems` : `${t.num_questions}/${t.pool_size} qs`}
                                </span>
                                <span className={`px-2 py-0.5 border text-[10px] font-orbitron uppercase tracking-widest rounded-none ${typeBadge}`}>
                                  {t.test_type === "coding" ? "Coding" : "MC"}
                                </span>
                              </div>
                            </button>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* Step 2: Per-classroom schedule */}
                <div>
                  <Label className="text-cyber-cyan font-orbitron text-xs uppercase tracking-widest">2. Schedule per Class</Label>
                  <p className="text-xs text-slate-500 mt-1 mb-3 font-chakra">
                    Select the classes you want to assign this test to. Each class can have its own start and due time.
                  </p>
                  <div className="space-y-3">
                    {myClassrooms.map((c) => {
                      const sched = scheduleByClassroom[c.id] || { selected: false, available_from: "", due_at: "" };
                      return (
                        <div
                          key={c.id}
                          className={`border rounded-none p-3 transition-all ${sched.selected ? "border-cyber-cyan/50 bg-cyber-cyan/5" : "border-cyber-cyan/15 bg-cyber-navy/30"}`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              data-testid={`classroom-checkbox-${c.id}`}
                              checked={sched.selected}
                              onCheckedChange={(checked) => {
                                setScheduleByClassroom(prev => ({
                                  ...prev,
                                  [c.id]: { ...sched, selected: !!checked },
                                }));
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white font-medium truncate">{c.name}</div>
                              <div className="text-xs text-slate-500">{c.student_ids?.length || 0} students · {c.class_code}</div>
                            </div>
                          </div>
                          {sched.selected && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pl-7">
                              <div>
                                <Label className="text-xs text-slate-400">Available From</Label>
                                <Input
                                  data-testid={`available-from-${c.id}`}
                                  type="datetime-local"
                                  value={sched.available_from}
                                  onChange={(e) => setScheduleByClassroom(prev => ({
                                    ...prev,
                                    [c.id]: { ...sched, available_from: e.target.value },
                                  }))}
                                  className="mt-1 bg-cyber-black/50 border-cyber-cyan/30 rounded-none text-white text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-slate-400">Due At</Label>
                                <Input
                                  data-testid={`due-at-${c.id}`}
                                  type="datetime-local"
                                  value={sched.due_at}
                                  onChange={(e) => setScheduleByClassroom(prev => ({
                                    ...prev,
                                    [c.id]: { ...sched, due_at: e.target.value },
                                  }))}
                                  className="mt-1 bg-cyber-black/50 border-cyber-cyan/30 rounded-none text-white text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {myClassrooms.length === 0 && (
                      <div className="text-center text-slate-500 text-sm py-4">
                        You don't have any active classrooms.
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3: Global options */}
                <div>
                  <Label className="text-cyber-cyan font-orbitron text-xs uppercase tracking-widest">3. Options</Label>
                  <div className="space-y-3 mt-3">
                    <div className="flex items-center justify-between bg-cyber-black/40 border border-cyber-cyan/15 p-3 rounded-none">
                      <div>
                        <div className="text-sm text-white">Auto-release results after due date</div>
                        <div className="text-xs text-slate-500">Students see their answers once the due time has passed.</div>
                      </div>
                      <Switch
                        data-testid="auto-release-switch"
                        checked={assignAutoReleaseResults}
                        onCheckedChange={setAssignAutoReleaseResults}
                      />
                    </div>
                    <div className="flex items-center justify-between bg-cyber-black/40 border border-cyber-cyan/15 p-3 rounded-none">
                      <div>
                        <div className="text-sm text-white">Allow late submission</div>
                        <div className="text-xs text-slate-500">Accept submissions after the due time (with optional penalty).</div>
                      </div>
                      <Switch
                        data-testid="allow-late-switch"
                        checked={assignAllowLate}
                        onCheckedChange={setAssignAllowLate}
                      />
                    </div>
                    {assignAllowLate && (
                      <div className="flex items-center gap-3 bg-cyber-black/40 border border-cyber-cyan/15 p-3 rounded-none">
                        <Label className="text-sm text-white shrink-0">Late penalty (%)</Label>
                        <Input
                          data-testid="late-penalty-input"
                          type="number"
                          min="0"
                          max="100"
                          value={assignLatePenalty}
                          onChange={(e) => setAssignLatePenalty(parseInt(e.target.value || "0", 10))}
                          className="bg-cyber-black/50 border-cyber-cyan/30 rounded-none text-white w-24"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setAssignDialogOpen(false)}
                    className="rounded-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    data-testid="submit-assign-test-btn"
                    onClick={submitAssignTest}
                    disabled={assignSubmitting || !selectedLibraryTest}
                    className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-orbitron uppercase tracking-widest text-xs rounded-none"
                  >
                    {assignSubmitting ? "Assigning..." : "Assign Test"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}