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
import { ArrowLeft, Plus, Users, BookOpen, Trash2, Code2, Trophy, Swords, Edit, Calendar, Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editScheduleDialogOpen, setEditScheduleDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
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
  }, [classroomId]);

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
    const organized = {};
    console.log("📊 Organizing assignments:", assignments);
    assignments.forEach(assignment => {
      const chapter = assignment.chapter || "Uncategorized";
      const lesson = assignment.lesson || "General";
      
      if (!organized[chapter]) {
        organized[chapter] = {};
      }
      if (!organized[chapter][lesson]) {
        organized[chapter][lesson] = [];
      }
      organized[chapter][lesson].push(assignment);
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
      
      toast.success("Schedule updated!");
      setEditScheduleDialogOpen(false);
      setEditingAssignment(null);
      fetchAssignments();
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast.error("Failed to update schedule");
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
      <div data-testid="classroom-loading" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-xl text-gray-600">Classroom not found</div>
      </div>
    );
  }

  const isTeacher = user.role === "teacher";

  return (
    <div data-testid="classroom-page" className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button data-testid="back-btn" onClick={() => navigate(isTeacher ? "/teacher/dashboard" : "/student/dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-2">
              <Code2 className="w-7 h-7 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">{classroom.name}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-mono font-semibold">
              {classroom.class_code}
            </span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        <Tabs defaultValue="assignments" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger data-testid="assignments-tab" value="assignments" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Assignments
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

          <TabsContent value="battles">
            <BattleZone classroomId={classroomId} isTeacher={isTeacher} />
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard classroomId={classroomId} currentUserId={user.id} />
          </TabsContent>

          <TabsContent value="assignments">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Assignments</h2>
              {isTeacher && (
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="create-assignment-btn" className="bg-indigo-600 hover:bg-indigo-700 gap-2">
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
                        <p className="text-xs text-gray-500 mb-3">
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

                      <Button data-testid="create-assignment-submit-btn" type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                        Create Assignment
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {assignments.length === 0 ? (
              <div data-testid="no-assignments" className="text-center py-20">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No assignments yet</h3>
                {isTeacher && (
                  <>
                    <p className="text-gray-500 mb-6">Create your first assignment</p>
                    <Button data-testid="create-first-assignment-btn" onClick={() => setCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Assignment
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(organizedAssignments).sort().map((chapter) => {
                  const isChapterExpanded = expandedChapters.has(chapter);
                  const lessons = organizedAssignments[chapter];
                  
                  return (
                    <div key={chapter} className="border rounded-lg bg-white shadow-sm">
                      {/* Chapter Folder */}
                      <div
                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleChapter(chapter)}
                      >
                        {isChapterExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                        {isChapterExpanded ? (
                          <FolderOpen className="w-6 h-6 text-blue-500" />
                        ) : (
                          <Folder className="w-6 h-6 text-blue-500" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-900">{chapter}</h3>
                        <span className="ml-auto text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {Object.keys(lessons).length} lesson{Object.keys(lessons).length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Lessons in Chapter */}
                      {isChapterExpanded && (
                        <div className="pl-8 pr-4 pb-4 space-y-3">
                          {Object.keys(lessons).sort().map((lesson) => {
                            const lessonKey = `${chapter}-${lesson}`;
                            const isLessonExpanded = expandedLessons.has(lessonKey);
                            const lessonAssignments = lessons[lesson];
                            
                            return (
                              <div key={lessonKey} className="border rounded-lg bg-gray-50">
                                {/* Lesson Folder */}
                                <div
                                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 transition-colors rounded-lg"
                                  onClick={() => toggleLesson(lessonKey)}
                                >
                                  {isLessonExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-600" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-600" />
                                  )}
                                  {isLessonExpanded ? (
                                    <FolderOpen className="w-5 h-5 text-teal-500" />
                                  ) : (
                                    <Folder className="w-5 h-5 text-teal-500" />
                                  )}
                                  <h4 className="text-md font-medium text-gray-800">{lesson}</h4>
                                  <span className="ml-auto text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
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
                                        className="hover:shadow-lg transition-shadow border-2 border-gray-100"
                                      >
                                        <CardHeader>
                                          <CardTitle className="text-lg">{assignment.title}</CardTitle>
                                          <CardDescription className="line-clamp-2">{assignment.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="text-sm text-gray-600 mb-3">
                                            {assignment.problem_count ? `${assignment.problem_count} problems` : `${assignment.test_cases?.length || 0} test cases`}
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              onClick={() => navigate(`/assignment/${assignment.id}`, { 
                                                state: { classroomId: classroomId } 
                                              })}
                                              className="flex-1"
                                              size="sm"
                                            >
                                              View
                                            </Button>
                                            {isTeacher && (
                                              <>
                                                <Button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const availDate = assignment.available_date ? new Date(assignment.available_date) : null;
                                                    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
                                                    
                                                    setEditingAssignment({
                                                      id: assignment.id,
                                                      title: assignment.title,
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
                                                >
                                                  <Calendar className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteAssignment(assignment.id, assignment.title);
                                                  }}
                                                  variant="outline"
                                                  size="sm"
                                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
          </TabsContent>

          {isTeacher && (
            <TabsContent value="students">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Students</h2>
              {classroom.student_details?.length === 0 ? (
                <div data-testid="no-students" className="text-center py-20">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No students yet</h3>
                  <p className="text-gray-500">Share the class code with students to join</p>
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
        </Tabs>

        {/* Edit Schedule Dialog */}
        {editingAssignment && (
          <Dialog open={editScheduleDialogOpen} onOpenChange={setEditScheduleDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Assignment Schedule</DialogTitle>
                <DialogDescription>
                  Update availability and due dates for: {editingAssignment.title}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateSchedule} className="space-y-4">
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

                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                  Update Schedule
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}