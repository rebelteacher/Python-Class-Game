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
import { ArrowLeft, Plus, Users, BookOpen, Trash2, Code2, Trophy, Swords, Edit, Calendar, Clock, Folder, FolderOpen, ChevronRight, ChevronDown, FileQuestion, Lock, Unlock } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editScheduleDialogOpen, setEditScheduleDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [curriculumData, setCurriculumData] = useState([]);
  const [unlockedLessons, setUnlockedLessons] = useState(new Set());
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
        <Tabs defaultValue={isTeacher ? "tests" : "assignments"} className="w-full">
          <TabsList className="mb-8">
            {!isTeacher && (
              <TabsTrigger data-testid="assignments-tab" value="assignments" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Assignments
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
            {isTeacher && (
              <TabsTrigger data-testid="lessons-tab" value="lessons" className="gap-2">
                <Lock className="w-4 h-4" />
                Lesson Locks
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="tests">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Tests</h2>
            </div>

            {tests.length === 0 && codingTests.length === 0 ? (
              <div className="text-center py-20">
                <FileQuestion className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-300 mb-2">No tests assigned yet</h3>
                <p className="text-slate-500 mb-6">
                  {isTeacher 
                    ? "Create MC tests or Coding tests to assess your students"
                    : "Tests will appear here when your teacher assigns them"}
                </p>
                {isTeacher && (
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => navigate("/test-builder")} className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold">
                      <Plus className="w-4 h-4 mr-2" />
                      MC Test
                    </Button>
                    <Button onClick={() => navigate("/coding-tests")} className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Coding Test
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Coding Tests Section */}
                {codingTests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Code2 className="w-5 h-5 text-purple-600" />
                      Coding Tests
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {codingTests.map((test) => {
                        const now = new Date();
                        const availableDate = test.available_date ? new Date(test.available_date) : null;
                        const dueDate = test.due_date ? new Date(test.due_date) : null;
                        
                        const isScheduled = availableDate && now < availableDate;
                        const isClosed = dueDate && now > dueDate;
                        const isAvailable = !isScheduled && !isClosed;

                        if (!isTeacher && isScheduled) return null;

                        return (
                          <Card key={test.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between">
                                <span>{test.title}</span>
                                {isScheduled && (
                                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">Scheduled</span>
                                )}
                                {isClosed && (
                                  <span className="px-2 py-1 bg-cyber-navy/30 text-slate-200 text-xs rounded">Closed</span>
                                )}
                                {isAvailable && (
                                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Available</span>
                                )}
                              </CardTitle>
                              <CardDescription>{test.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2 text-sm text-slate-400">
                                <div className="flex items-center gap-2">
                                  <Code2 className="w-4 h-4" />
                                  <span>{test.problem_ids?.length || 0} problems</span>
                                </div>
                                {test.time_limit_minutes > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span>{test.time_limit_minutes} minute limit</span>
                                  </div>
                                )}
                                {dueDate && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>Due: {dueDate.toLocaleDateString()}</span>
                                  </div>
                                )}
                                {isTeacher && test.proctor_code && (
                                  <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                                    <p className="text-xs font-semibold text-yellow-900">Proctor Code:</p>
                                    <p className="text-lg font-mono font-bold text-yellow-400">{test.proctor_code}</p>
                                  </div>
                                )}
                              </div>
                              
                              {/* Action Buttons for Teachers */}
                              {isTeacher && (
                                <div className="mt-4 flex gap-2">
                                  <Button
                                    onClick={() => {
                                      // Set up editing state for schedule
                                      setEditingAssignment({
                                        id: test.id,
                                        title: test.title,
                                        available_date: availableDate ? availableDate.toISOString().split('T')[0] : '',
                                        available_time: availableDate ? availableDate.toISOString().split('T')[1].substring(0, 5) : '00:00',
                                        due_date: dueDate ? dueDate.toISOString().split('T')[0] : '',
                                        due_time: dueDate ? dueDate.toISOString().split('T')[1].substring(0, 5) : '23:59',
                                        isCodingTest: true // Flag to identify coding test
                                      });
                                      setEditScheduleDialogOpen(true);
                                    }}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    onClick={() => navigate(`/coding-tests/${test.id}/submissions`)}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                  >
                                    View Results
                                  </Button>
                                  <Button
                                    onClick={async () => {
                                      if (window.confirm('Are you sure you want to delete this coding test?')) {
                                        try {
                                          await axios.delete(`${API}/coding-tests/${test.id}`, {
                                            withCredentials: true
                                          });
                                          toast.success('Coding test deleted successfully');
                                          fetchCodingTests();
                                        } catch (error) {
                                          console.error('Error deleting test:', error);
                                          toast.error('Failed to delete test');
                                        }
                                      }
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* MC Tests Section */}
                {tests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <FileQuestion className="w-5 h-5 text-cyber-cyan" />
                      Multiple Choice Tests
                    </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map((test) => {
                  const now = new Date();
                  const availableDate = test.available_date ? new Date(test.available_date) : null;
                  const dueDate = test.due_date ? new Date(test.due_date) : null;
                  
                  const isScheduled = availableDate && now < availableDate;
                  const isClosed = dueDate && now > dueDate;
                  const isAvailable = !isScheduled && !isClosed;

                  // Students shouldn't see scheduled tests
                  if (!isTeacher && isScheduled) return null;

                  return (
                    <Card key={test.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{test.title}</CardTitle>
                          {isScheduled && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                              Scheduled
                            </span>
                          )}
                          {isAvailable && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                              Available
                            </span>
                          )}
                          {isClosed && (
                            <span className="px-2 py-1 bg-cyber-navy/30 text-slate-300 text-xs rounded">
                              Closed
                            </span>
                          )}
                        </div>
                        <CardDescription>{test.description || "No description"}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-slate-400">
                          <div className="flex items-center gap-2">
                            <FileQuestion className="w-4 h-4" />
                            <span>{test.num_questions} questions (from pool of {test.question_pool_ids?.length || 0})</span>
                          </div>
                          {test.time_limit_minutes > 0 && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{test.time_limit_minutes} minute time limit</span>
                            </div>
                          )}
                          {availableDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Available: {availableDate.toLocaleString()}</span>
                            </div>
                          )}
                          {dueDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Due: {dueDate.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex gap-2">
                          {!isTeacher && isAvailable && (
                            <Button 
                              onClick={() => navigate(`/test/${test.id}`)}
                              className="w-full bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold"
                            >
                              Start Test
                            </Button>
                          )}
                          {isTeacher && (
                            <>
                              <Button
                                onClick={() => {
                                  const availDate = test.available_date ? new Date(test.available_date) : null;
                                  const dueDate = test.due_date ? new Date(test.due_date) : null;
                                  
                                  setEditingAssignment({
                                    id: test.id,
                                    title: test.title,
                                    chapter: test.chapter || '',
                                    lesson: test.lesson || '',
                                    available_date: availDate ? availDate.toISOString().split('T')[0] : '',
                                    available_time: availDate ? availDate.toISOString().split('T')[1].substring(0, 5) : '00:00',
                                    due_date: dueDate ? dueDate.toISOString().split('T')[0] : '',
                                    due_time: dueDate ? dueDate.toISOString().split('T')[1].substring(0, 5) : '23:59',
                                    isTest: true // Mark as test so we update the right collection
                                  });
                                  setEditScheduleDialogOpen(true);
                                }}
                                variant="outline"
                                size="sm"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                onClick={() => navigate(`/test-reports`, { state: { classroomId: classroomId, selectedTestId: test.id } })}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                              >
                                View Results
                              </Button>
                              <Button
                                onClick={async () => {
                                  if (window.confirm('Are you sure you want to delete this MC test? This will also delete all student submissions.')) {
                                    try {
                                      await axios.delete(`${API}/mc-tests/${test.id}`, {
                                        withCredentials: true
                                      });
                                      toast.success('Test deleted successfully');
                                      fetchTests();
                                    } catch (error) {
                                      console.error('Error deleting test:', error);
                                      toast.error('Failed to delete test');
                                    }
                                  }
                                }}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:bg-red-500/10"
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
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="battles">
            <BattleZone classroomId={classroomId} isTeacher={isTeacher} />
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard classroomId={classroomId} currentUserId={user.id} />
          </TabsContent>

          <TabsContent value="assignments">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Assignments</h2>
              {isTeacher && (
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="create-assignment-btn" className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold gap-2">
                      <Plus className="w-5 h-5" />
                      Create Assignment
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="create-assignment-dialog" className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Assignment</DialogTitle>
                      <DialogDescription>
                        Create a Python coding assignment with test cases
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateAssignment} className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          data-testid="assignment-title-input"
                          id="title"
                          placeholder="e.g., Sum of Two Numbers"
                          value={newAssignment.title}
                          onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          data-testid="assignment-description-input"
                          id="description"
                          placeholder="Describe the assignment..."
                          value={newAssignment.description}
                          onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                          className="mt-1"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="starterCode">Starter Code (Optional)</Label>
                        <Textarea
                          data-testid="assignment-starter-code-input"
                          id="starterCode"
                          placeholder="# Starter code for students..."
                          value={newAssignment.starter_code}
                          onChange={(e) => setNewAssignment({ ...newAssignment, starter_code: e.target.value })}
                          className="mt-1 font-mono text-sm"
                          rows={5}
                        />
                      </div>

                      <div>
                        <Label htmlFor="solutionCode">Solution Code *</Label>
                        <Textarea
                          data-testid="assignment-solution-code-input"
                          id="solutionCode"
                          placeholder="# Your solution code..."
                          value={newAssignment.solution_code}
                          onChange={(e) => setNewAssignment({ ...newAssignment, solution_code: e.target.value })}
                          className="mt-1 font-mono text-sm"
                          rows={8}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label>Test Cases (Optional)</Label>
                          <Button data-testid="add-test-case-btn" type="button" onClick={addTestCase} size="sm" variant="outline">
                            <Plus className="w-4 h-4 mr-1" />
                            Add Test Case
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">
                          Leave empty to grade based on output comparison only. Add test cases for specific input/output validation.
                        </p>
                        {newAssignment.test_cases.map((testCase, index) => (
                          <Card key={index} className="mb-3">
                            <CardContent className="pt-4">
                              <div className="flex justify-between items-start mb-2">
                                <Label className="text-sm font-semibold">Test Case {index + 1}</Label>
                                {newAssignment.test_cases.length > 1 && (
                                  <Button
                                    data-testid={`remove-test-case-${index}-btn`}
                                    type="button"
                                    onClick={() => removeTestCase(index)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Description</Label>
                                  <Input
                                    data-testid={`test-case-${index}-description`}
                                    placeholder="e.g., Test with positive numbers"
                                    value={testCase.description}
                                    onChange={(e) => updateTestCase(index, "description", e.target.value)}
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Input Data</Label>
                                  <Textarea
                                    data-testid={`test-case-${index}-input`}
                                    placeholder="Input for the program..."
                                    value={testCase.input_data}
                                    onChange={(e) => updateTestCase(index, "input_data", e.target.value)}
                                    className="mt-1 font-mono text-sm"
                                    rows={2}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Expected Output</Label>
                                  <Textarea
                                    data-testid={`test-case-${index}-output`}
                                    placeholder="Expected output..."
                                    value={testCase.expected_output}
                                    onChange={(e) => updateTestCase(index, "expected_output", e.target.value)}
                                    className="mt-1 font-mono text-sm"
                                    rows={2}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <Button data-testid="create-assignment-submit-btn" type="submit" className="w-full bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold">
                        Create Assignment
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {assignments.length === 0 && tests.length === 0 ? (
              <div data-testid="no-assignments" className="text-center py-20">
                <BookOpen className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-300 mb-2">No assignments or tests yet</h3>
                {isTeacher && (
                  <>
                    <p className="text-slate-500 mb-6">Create your first assignment</p>
                    <Button data-testid="create-first-assignment-btn" onClick={() => setCreateDialogOpen(true)} className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Assignment
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Top-level folders: Classwork and Tests */}
                {['classwork', 'tests'].map((folderType) => {
                  const isFolderExpanded = expandedFolders.has(folderType);
                  const folderData = organizedAssignments[folderType] || {};
                  const hasContent = Object.keys(folderData).length > 0;
                  
                  if (!hasContent) return null;
                  
                  return (
                    <div key={folderType} className="border-2 rounded-lg bg-cyber-navy/50 shadow-md">
                      {/* Main Folder Header */}
                      <div
                        className="flex items-center gap-3 p-5 cursor-pointer hover:bg-cyber-navy/60/50 transition-colors"
                        onClick={() => toggleFolder(folderType)}
                      >
                        {isFolderExpanded ? (
                          <ChevronDown className="w-6 h-6 text-slate-300" />
                        ) : (
                          <ChevronRight className="w-6 h-6 text-slate-300" />
                        )}
                        {isFolderExpanded ? (
                          <FolderOpen className="w-7 h-7 text-purple-600" />
                        ) : (
                          <Folder className="w-7 h-7 text-purple-600" />
                        )}
                        <h2 className="text-2xl font-bold text-white capitalize">{folderType}</h2>
                        <span className="ml-auto text-sm text-slate-400 bg-cyber-navy/60 px-3 py-1 rounded-full font-medium">
                          {Object.keys(folderData).length} chapter{Object.keys(folderData).length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {/* Chapters within folder */}
                      {isFolderExpanded && (
                        <div className="px-4 pb-4 space-y-3">
                          {Object.keys(folderData).sort().map((chapter) => {
                            const chapterKey = `${folderType}-${chapter}`;
                            const isChapterExpanded = expandedChapters.has(chapterKey);
                            const lessons = folderData[chapter];
                  
                            return (
                              <div key={chapterKey} className="border rounded-lg bg-cyber-navy/60 backdrop-blur-sm">
                                {/* Chapter Folder */}
                                <div
                                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-cyber-navy/40 transition-colors"
                                  onClick={() => toggleChapter(chapterKey)}
                                >
                                  {isChapterExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-slate-400" />
                                  )}
                                  {isChapterExpanded ? (
                                    <FolderOpen className="w-6 h-6 text-blue-500" />
                                  ) : (
                                    <Folder className="w-6 h-6 text-blue-500" />
                                  )}
                                  <h3 className="text-lg font-semibold text-white">{chapter}</h3>
                                  <span className="ml-auto text-sm text-slate-500 bg-cyber-navy/30 px-3 py-1 rounded-full">
                                    {Object.keys(lessons).length} lesson{Object.keys(lessons).length !== 1 ? 's' : ''}
                                  </span>
                                </div>

                                {/* Lessons in Chapter */}
                                {isChapterExpanded && (
                                  <div className="pl-8 pr-4 pb-4 space-y-3">
                                    {Object.keys(lessons).sort().map((lesson) => {
                                      const lessonKey = `${chapterKey}-${lesson}`;
                                      const isLessonExpanded = expandedLessons.has(lessonKey);
                                      const lessonAssignments = lessons[lesson];
                            
                                      return (
                                        <div key={lessonKey} className="border rounded-lg bg-cyber-navy/40">
                                {/* Lesson Folder */}
                                <div
                                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-cyber-navy/30 transition-colors rounded-lg"
                                  onClick={() => toggleLesson(lessonKey)}
                                >
                                  {isLessonExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                  {isLessonExpanded ? (
                                    <FolderOpen className="w-5 h-5 text-teal-500" />
                                  ) : (
                                    <Folder className="w-5 h-5 text-teal-500" />
                                  )}
                                  <h4 className="text-md font-medium text-slate-200">{lesson}</h4>
                                  <span className="ml-auto text-xs text-slate-500 bg-cyber-navy/60 px-2 py-1 rounded-full">
                                    {lessonAssignments.length} assignment{lessonAssignments.length !== 1 ? 's' : ''}
                                  </span>
                                </div>

                                {/* Assignments in Lesson */}
                                {isLessonExpanded && (
                                  <div className="p-3 pt-0 grid md:grid-cols-2 gap-4">
                                    {lessonAssignments.map((assignment) => (
                                      <Card
                                        data-testid={`assignment-card-${assignment.id}`}
                                        key={assignment.id}
                                        className="hover:shadow-lg transition-shadow border-2 border-cyber-cyan/10"
                                      >
                                        <CardHeader>
                                          <CardTitle className="text-lg">{assignment.title}</CardTitle>
                                          <CardDescription className="line-clamp-2">{assignment.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="text-sm text-slate-400 mb-3">
                                            {assignment.problem_count ? `${assignment.problem_count} problems` : `${assignment.test_cases?.length || 0} test cases`}
                                          </div>
                                          {isTeacher && assignment.proctor_code && (
                                            <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                                              <p className="text-xs font-semibold text-yellow-900">Proctor Code:</p>
                                              <p className="text-lg font-mono font-bold text-yellow-400">{assignment.proctor_code}</p>
                                              <p className="text-xs text-yellow-400 mt-1">Share with students who need to unlock this assignment</p>
                                            </div>
                                          )}
                                          <div className="flex gap-2">
                                            <Button
                                              onClick={() => {
                                                // Check if this is a test or assignment
                                                const isTest = assignment.num_questions !== undefined || assignment.question_pool_ids !== undefined;
                                                if (isTest && isTeacher) {
                                                  // Teachers view test results
                                                  navigate(`/test-reports`, { state: { classroomId: classroomId, selectedTestId: assignment.id } });
                                                } else if (isTest) {
                                                  // Students take test
                                                  navigate(`/test/${assignment.id}`);
                                                } else {
                                                  // Regular assignment
                                                  navigate(`/assignment/${assignment.id}`, { state: { classroomId: classroomId } });
                                                }
                                              }}
                                              className="flex-1"
                                              size="sm"
                                            >
                                              {assignment.num_questions !== undefined || assignment.question_pool_ids !== undefined ? 
                                                (isTeacher ? "View Results" : "Start Test") : "View"}
                                            </Button>
                                            {isTeacher && !(assignment.num_questions !== undefined || assignment.question_pool_ids !== undefined) && (
                                              <>
                                                <Button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const availDate = assignment.available_date ? new Date(assignment.available_date) : null;
                                                    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
                                                    
                                                    setEditingAssignment({
                                                      id: assignment.id,
                                                      title: assignment.title,
                                                      chapter: assignment.chapter || '',
                                                      lesson: assignment.lesson || '',
                                                      available_date: availDate ? availDate.toISOString().split('T')[0] : '',
                                                      available_time: availDate ? availDate.toISOString().split('T')[1].substring(0, 5) : '00:00',
                                                      due_date: dueDate ? dueDate.toISOString().split('T')[0] : '',
                                                      due_time: dueDate ? dueDate.toISOString().split('T')[1].substring(0, 5) : '23:59',
                                                      allow_late_submission: assignment.allow_late_submission ?? true,
                                                      late_penalty_percent: assignment.late_penalty_percent || 0
                                                    });
                                                    setEditScheduleDialogOpen(true);
                                                  }}
                                                  variant="outline"
                                                  size="sm"
                                                  className="gap-1"
                                                >
                                                  <Edit className="w-4 h-4" />
                                                  Edit
                                                </Button>
                                                <Button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenLessonDialog(assignment);
                                                  }}
                                                  variant="outline"
                                                  size="sm"
                                                  className="gap-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-300"
                                                >
                                                  <BookOpen className="w-4 h-4" />
                                                  Lesson
                                                </Button>
                                                <Button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteAssignment(assignment.id, assignment.title);
                                                  }}
                                                  variant="outline"
                                                  size="sm"
                                                  className="text-red-600 hover:text-red-400 hover:bg-red-500/10"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
                            onClick={() => setExpandedCurrChapters(prev => {
                              const next = new Set(prev);
                              next.has(chapter.name) ? next.delete(chapter.name) : next.add(chapter.name);
                              return next;
                            })}
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
      </main>
    </div>
  );
}