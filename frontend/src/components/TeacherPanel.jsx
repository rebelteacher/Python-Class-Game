import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ChevronLeft, Users, User, Eye, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Editor from "@monaco-editor/react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TeacherPanel({ 
  assignmentId, 
  classroomId, 
  currentProblemIndex,
  problems,
  onViewStudentCode 
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentCode, setStudentCode] = useState(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  // Class picker: teacher's classrooms + the one currently selected (defaults to prop)
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState(classroomId || "");
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);

  // Fetch the teacher's classrooms once when the panel mounts
  useEffect(() => {
    let cancelled = false;
    const fetchClassrooms = async () => {
      setLoadingClassrooms(true);
      try {
        const response = await axios.get(`${API}/classrooms`, { withCredentials: true });
        if (cancelled) return;
        const list = Array.isArray(response.data) ? response.data : [];
        setClassrooms(list);
        // If no class was pre-selected via navigation state, default to the first one so
        // the panel is immediately useful (previously showed "No students enrolled" forever).
        if (!classroomId && list.length > 0) {
          setSelectedClassroomId(list[0].id);
        }
      } catch (error) {
        console.error("Error fetching classrooms:", error);
      } finally {
        if (!cancelled) setLoadingClassrooms(false);
      }
    };
    fetchClassrooms();
    return () => { cancelled = true; };
  }, [classroomId]);

  // Fetch student progress when assignment or the selected classroom changes
  useEffect(() => {
    if (assignmentId) {
      fetchStudentProgress();
    }
  }, [assignmentId, selectedClassroomId]);

  const fetchStudentProgress = async () => {
    setLoading(true);
    try {
      // encodeURIComponent so lesson ids like `lesson_..._blocks?` (yes, with a `?`)
      // don't break the URL by being treated as the query-string delimiter.
      const encodedId = encodeURIComponent(assignmentId);
      const url = selectedClassroomId
        ? `${API}/assignments/${encodedId}/student-progress?classroom_id=${selectedClassroomId}`
        : `${API}/assignments/${encodedId}/student-progress`;

      const response = await axios.get(url, { withCredentials: true });
      setProgressData(response.data);
    } catch (error) {
      console.error("Error fetching student progress:", error);
      toast.error("Failed to load student progress");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = async (student) => {
    if (!problems || !problems[currentProblemIndex]) return;
    
    const problemId = problems[currentProblemIndex].id;
    setSelectedStudent(student);
    setLoadingCode(true);
    setShowCodeDialog(true);
    
    try {
      const encodedId = encodeURIComponent(assignmentId);
      const response = await axios.get(
        `${API}/assignments/${encodedId}/student-code/${student.id}/${problemId}`,
        { withCredentials: true }
      );
      setStudentCode(response.data);
      
      // If parent wants to handle code viewing
      if (onViewStudentCode) {
        onViewStudentCode(response.data);
      }
    } catch (error) {
      console.error("Error fetching student code:", error);
      toast.error("Failed to load student code");
      setStudentCode(null);
    } finally {
      setLoadingCode(false);
    }
  };

  // Get current problem's progress
  const getCurrentProblemProgress = () => {
    if (!progressData || !problems || !problems[currentProblemIndex]) return null;
    
    const problemId = problems[currentProblemIndex].id;
    return progressData.problems?.find(p => p.problem_id === problemId);
  };

  const currentProgress = getCurrentProblemProgress();

  // Build student list with status for current problem
  const getStudentListWithStatus = () => {
    if (!progressData || !currentProgress) return [];
    
    const allStudents = progressData.students || [];
    
    return allStudents.map(student => {
      // Check if completed (green)
      const completed = currentProgress.completed_students?.find(s => s.id === student.id);
      if (completed) {
        return {
          ...student,
          status: 'completed',
          score: completed.score,
          is_final: completed.is_final
        };
      }
      
      // Check if in progress (yellow)
      const inProgress = currentProgress.in_progress_students?.find(s => s.id === student.id);
      if (inProgress) {
        return {
          ...student,
          status: 'in_progress',
          score: inProgress.score,
          attempts: inProgress.attempts
        };
      }
      
      // Not started (red)
      return {
        ...student,
        status: 'not_started'
      };
    });
  };

  const studentsWithStatus = getStudentListWithStatus();

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500/100 text-white';
      case 'in_progress': return 'bg-yellow-400 text-white';
      case 'not_started': return 'bg-red-400 text-white';
      default: return 'bg-gray-300 text-slate-300';
    }
  };

  // Get status label
  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return '✓';
      case 'in_progress': return '~';
      case 'not_started': return '✗';
      default: return '?';
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-50">
        <Button
          data-testid="expand-teacher-panel-btn"
          onClick={() => setIsExpanded(true)}
          className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-l-lg rounded-r-none px-2 py-8 shadow-lg"
        >
          <ChevronLeft className="w-5 h-5" />
          <Users className="w-5 h-5 mt-2" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Teacher Panel Sidebar */}
      <div 
        data-testid="teacher-panel"
        className="fixed right-0 top-0 h-full w-72 bg-cyan-50 border-l-4 border-cyan-500 shadow-xl z-40 flex flex-col"
      >
        {/* Header */}
        <div className="bg-cyan-600 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span className="font-bold">Teacher Panel</span>
          </div>
          <Button
            data-testid="collapse-teacher-panel-btn"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="text-white hover:bg-cyan-700 p-1"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* View Mode Toggle */}
        <div className="px-4 py-2 bg-cyan-500/20 border-b border-cyan-200">
          <div className="text-xs text-slate-400 mb-1">View page as:</div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="flex-1 text-xs h-7">
              Student
            </Button>
            <Button size="sm" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs h-7">
              Teacher
            </Button>
          </div>
        </div>

        {/* "Me" Section - Teacher's work */}
        <div className="px-4 py-3 border-b border-cyan-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-cyber-navy/80 rounded-full flex items-center justify-center border-2 border-cyan-500 text-cyan-600 font-bold text-sm">
              {currentProblemIndex + 1}
            </div>
            <div>
              <div className="font-semibold text-slate-200">Me</div>
              <div className="text-xs text-slate-500">Last Updated: N/A</div>
            </div>
          </div>
          <Button 
            size="sm" 
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
            onClick={() => {
              setSelectedStudent(null);
              setStudentCode(null);
              if (onViewStudentCode) {
                onViewStudentCode(null);
              }
            }}
          >
            Example Solution
          </Button>
        </div>

        {/* Class Picker Dropdown */}
        <div className="px-4 py-2 border-b border-cyan-200 bg-cyber-navy/80">
          <label htmlFor="teacher-panel-class-select" className="text-xs text-slate-400 block mb-1">
            Class:
          </label>
          <select
            id="teacher-panel-class-select"
            data-testid="teacher-panel-class-select"
            value={selectedClassroomId}
            onChange={(e) => setSelectedClassroomId(e.target.value)}
            className="w-full text-sm text-slate-200 bg-cyber-navy border border-cyan-500/40 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            disabled={loadingClassrooms}
          >
            {loadingClassrooms && <option value="">Loading classes…</option>}
            {!loadingClassrooms && classrooms.length === 0 && (
              <option value="">No classes yet — create one first</option>
            )}
            {!loadingClassrooms && classrooms.length > 0 && (
              <option value="">All classes</option>
            )}
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{typeof c.students?.length === "number" ? ` (${c.students.length})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Options */}
        <div className="px-4 py-2 border-b border-cyan-200 bg-cyber-navy/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">Sort by:</span>
          <select className="text-xs border rounded px-2 py-1">
            <option>Display name</option>
            <option>Status</option>
            <option>Score</option>
          </select>
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-slate-500">Loading...</div>
            </div>
          ) : studentsWithStatus.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm">
              <Users className="w-8 h-8 mb-2 opacity-50" />
              <div>No students enrolled</div>
            </div>
          ) : (
            <div className="divide-y divide-cyan-100">
              {studentsWithStatus.map((student) => (
                <button
                  key={student.id}
                  data-testid={`student-row-${student.id}`}
                  onClick={() => handleStudentClick(student)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-cyan-500/20 transition-colors text-left ${
                    selectedStudent?.id === student.id ? 'bg-cyan-500/20' : ''
                  }`}
                >
                  {/* Problem Number Badge with Status Color */}
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getStatusColor(student.status)}`}
                  >
                    {currentProblemIndex + 1}
                  </div>
                  
                  {/* Student Name */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-200 truncate text-sm flex items-center gap-2">
                      <span className="truncate">{student.name}</span>
                      {typeof student.problems_solved === "number" && typeof student.problems_total === "number" && (
                        <span
                          data-testid={`student-progress-${student.id}`}
                          className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            student.problems_solved === student.problems_total && student.problems_total > 0
                              ? 'bg-green-600/30 text-green-300'
                              : student.problems_solved > 0
                              ? 'bg-yellow-500/25 text-yellow-200'
                              : 'bg-slate-700/60 text-slate-400'
                          }`}
                          title={`${student.problems_solved} of ${student.problems_total} problems solved in this assignment`}
                        >
                          {student.problems_solved}/{student.problems_total}
                        </span>
                      )}
                    </div>
                    {student.status === 'completed' && (
                      <div className="text-xs text-green-600">
                        {student.is_final ? '✓ Done' : `${student.score?.toFixed(0)}%`}
                      </div>
                    )}
                    {student.status === 'in_progress' && (
                      <div className="text-xs text-yellow-400">
                        {student.attempts} attempt(s)
                      </div>
                    )}
                    {student.status === 'not_started' && (
                      <div className="text-xs text-red-600">Not started</div>
                    )}
                  </div>
                  
                  {/* View Icon */}
                  <Eye className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {currentProgress && (
          <div className="px-4 py-3 bg-cyan-500/20 border-t border-cyan-200 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>
                <span className="inline-block w-3 h-3 rounded-full bg-green-500/100 mr-1"></span>
                Done: {currentProgress.completed_students?.length || 0}
              </span>
              <span>
                <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-1"></span>
                Started: {currentProgress.in_progress_students?.length || 0}
              </span>
              <span>
                <span className="inline-block w-3 h-3 rounded-full bg-red-400 mr-1"></span>
                None: {currentProgress.not_started_students?.length || 0}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Student Code Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-600" />
              {selectedStudent?.name}&apos;s Work
            </DialogTitle>
            <DialogDescription>
              Problem {currentProblemIndex + 1}: {problems?.[currentProblemIndex]?.title || 'Untitled'}
            </DialogDescription>
          </DialogHeader>
          
          {loadingCode ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-500">Loading student code...</div>
            </div>
          ) : studentCode?.code ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Status Bar */}
              <div className="flex items-center gap-4 mb-3 p-3 bg-cyber-navy/40 rounded-lg">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  studentCode.is_final ? 'bg-green-500/20 text-green-400' :
                  studentCode.is_passing ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {studentCode.is_final ? '✓ Done' : 
                   studentCode.is_passing ? 'Passing' : 'In Progress'}
                </div>
                <div className="text-sm text-slate-400">
                  Score: <span className="font-semibold">{studentCode.score?.toFixed(1)}%</span>
                </div>
                <div className="text-sm text-slate-400">
                  Attempts: <span className="font-semibold">{studentCode.attempts}</span>
                </div>
              </div>
              
              {/* Code Editor (Read-Only) */}
              <div className="flex-1 border rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  value={studentCode.code}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on'
                  }}
                  theme="vs-light"
                />
              </div>
              
              {/* Feedback Section */}
              {studentCode.feedback && (
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="text-sm font-semibold text-blue-400 mb-1">Feedback:</div>
                  <div className="text-sm text-blue-400">{studentCode.feedback}</div>
                </div>
              )}
              
              {/* Turtle Image if exists */}
              {studentCode.turtle_image && (
                <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="text-sm font-semibold text-green-400 mb-2">Turtle Output:</div>
                  <div className="flex justify-center">
                    <img 
                      src={`data:image/png;base64,${studentCode.turtle_image}`}
                      alt="Student turtle output"
                      className="max-w-full h-auto max-h-48 border rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <X className="w-12 h-12 mb-3 opacity-30" />
              <div className="text-lg font-medium">No submission yet</div>
              <div className="text-sm">This student hasn&apos;t submitted code for this problem.</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
