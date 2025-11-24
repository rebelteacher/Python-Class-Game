import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Play, Send, CheckCircle, XCircle, Code2, Lightbulb, X, BookOpen } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InteractiveInputCollector from "@/components/InteractiveInputCollector";
import LessonModal from "@/components/LessonModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AssignmentPage({ user }) {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const classroomIdFromNav = location.state?.classroomId; // Get classroom_id if passed from navigation
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [savedCodePerProblem, setSavedCodePerProblem] = useState({}); // Save code for each problem
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [hasRunPerProblem, setHasRunPerProblem] = useState({}); // Track run status per problem
  const [livesPerProblem, setLivesPerProblem] = useState({}); // Track lives for each problem separately
  const [problemStatuses, setProblemStatuses] = useState({}); // Track completion status (score) per problem
  const [problemsFinal, setProblemsFinal] = useState({}); // Track which problems are marked as done/final
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [darkMode, setDarkMode] = useState(false); // Dark mode toggle
  const [markingFinal, setMarkingFinal] = useState(false);
  const [testInput, setTestInput] = useState(""); // For input() functions
  const [showInteractiveDialog, setShowInteractiveDialog] = useState(false); // Interactive input mode
  
  // Hint system state
  const [hintStatus, setHintStatus] = useState({ hints_used: 0, hints_remaining: 2, hint1_used: false, hint2_used: false });
  const [loadingHint, setLoadingHint] = useState(false);
  const [currentHint, setCurrentHint] = useState(null);
  const [showHintDialog, setShowHintDialog] = useState(false);
  
  // Lesson state
  const [lesson, setLesson] = useState(null);
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [loadingLesson, setLoadingLesson] = useState(false);

  // Get current problem's ID
  const getCurrentProblemId = () => {
    if (assignment && assignment.problems && assignment.problems[currentProblemIndex]) {
      return assignment.problems[currentProblemIndex].id;
    }
    return assignmentId; // Fallback for old single-problem structure
  };

  useEffect(() => {
    // Fetch assignment data
    fetchAssignment();
    
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('editorDarkMode');
    if (savedDarkMode === 'true') {
      setDarkMode(true);
    }
    
    // Load saved code from localStorage
    const savedCodeData = localStorage.getItem(`saved_code_${assignmentId}`);
    if (savedCodeData) {
      try {
        const parsedData = JSON.parse(savedCodeData);
        setSavedCodePerProblem(parsedData);
      } catch (e) {
        console.error("Error loading saved code:", e);
      }
    }
  }, [assignmentId]);
  
  // Fetch submissions whenever assignment or navigation changes
  useEffect(() => {
    if (assignment) {
      fetchSubmissions();
    }
  }, [assignment, classroomIdFromNav]);

  useEffect(() => {
    // Load saved code when switching problems or when savedCodePerProblem updates
    if (assignment && assignment.problems && assignment.problems[currentProblemIndex]) {
      const currentProblemId = getCurrentProblemId();
      const currentProblem = assignment.problems[currentProblemIndex];
      
      // If problem is marked as final/done, load the submitted code
      if (problemsFinal[currentProblemId] && submissions.length > 0) {
        const problemSubmissions = submissions.filter(sub => sub.problem_id === currentProblemId);
        if (problemSubmissions.length > 0) {
          // Get the final submission (last one with is_final flag)
          const finalSubmission = problemSubmissions.find(sub => sub.is_final) || 
                                  problemSubmissions[problemSubmissions.length - 1];
          if (finalSubmission && finalSubmission.code) {
            setCode(finalSubmission.code);
            setOutput(""); // Clear output when loading saved submission
            return;
          }
        }
      }
      
      // Otherwise, check for saved code in localStorage
      const savedCode = savedCodePerProblem[currentProblemId];
      
      if (savedCode && savedCode.trim() !== "" && savedCode !== currentProblem.starter_code) {
        // Load saved code
        setCode(savedCode);
      } else {
        // Load starter code
        setCode(currentProblem.starter_code || "# Write your code here\n");
      }
      
      setOutput("");
    }
  }, [currentProblemIndex, assignment, savedCodePerProblem, problemsFinal, submissions]);
  
  // Auto-save code to localStorage (debounced to prevent flickering)
  useEffect(() => {
    if (!assignment || !code) return;
    
    const currentProblemId = getCurrentProblemId();
    if (!currentProblemId) return;
    
    // Debounce: wait 1 second after typing stops before saving
    const timeoutId = setTimeout(() => {
      // Save to state
      setSavedCodePerProblem(prev => {
        const newState = {
          ...prev,
          [currentProblemId]: code
        };
        
        // Also save to localStorage for persistence across refreshes
        localStorage.setItem(`saved_code_${assignmentId}`, JSON.stringify(newState));
        
        return newState;
      });
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [code, assignment, assignmentId]);

  const hasRun = hasRunPerProblem[getCurrentProblemId()] || false;

  const fetchAssignment = async () => {
    try {
      const response = await axios.get(`${API}/assignments/${assignmentId}`, {
        withCredentials: true,
      });
      console.log("Assignment data:", response.data); // Debug log
      setAssignment(response.data);
      
      // Handle both old (direct starter_code) and new (problems array) structure
      const starterCode = response.data.starter_code || 
                         (response.data.problems && response.data.problems[0]?.starter_code) ||
                         "# Write your code here\n";
      setCode(starterCode);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      toast.error("Failed to load assignment");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      // If we have a classroom_id from navigation, pass it to filter submissions
      const url = classroomIdFromNav 
        ? `${API}/submissions/assignment/${assignmentId}?classroom_id=${classroomIdFromNav}`
        : `${API}/submissions/assignment/${assignmentId}`;
      
      const response = await axios.get(url, {
        withCredentials: true,
      });
      setSubmissions(response.data);
      
      // Calculate lives remaining and status PER PROBLEM for students
      if (user.role === "student" && assignment && assignment.problems) {
        const livesMap = {};
        const statusMap = {};
        const finalMap = {};
        
        // Initialize all problems with 3 lives and no status
        assignment.problems.forEach(problem => {
          livesMap[problem.id] = 3;
          statusMap[problem.id] = null; // null = not attempted
          finalMap[problem.id] = false;
        });
        
        // Update based on submissions
        response.data.forEach(submission => {
          const problemId = submission.problem_id;
          
          // Track lives for this specific problem
          if (submission.lives_remaining !== undefined) {
            livesMap[problemId] = submission.lives_remaining;
          }
          
          // Track best score for this problem
          const currentBestScore = statusMap[problemId];
          const newScore = submission.score || 0;
          if (currentBestScore === null || newScore > currentBestScore) {
            statusMap[problemId] = newScore;
          }
          
          // Track if marked as final
          if (submission.is_final) {
            finalMap[problemId] = true;
          }
        });
        
        setLivesPerProblem(livesMap);
        setProblemStatuses(statusMap);
        setProblemsFinal(finalMap);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const handleRunCode = async (providedInput = null) => {
    // Check if code contains input() calls and no input provided yet
    const hasInputCalls = /input\s*\(/i.test(code);
    if (hasInputCalls && !testInput && providedInput === null) {
      // Show interactive dialog
      setShowInteractiveDialog(true);
      return;
    }

    setRunning(true);
    setOutput("");
    
    // Mark current problem as run
    const currentProblemId = getCurrentProblemId();
    setHasRunPerProblem(prev => ({
      ...prev,
      [currentProblemId]: true
    }));
    
    try {
      const inputToUse = providedInput !== null ? providedInput : testInput;
      const response = await axios.post(
        `${API}/code/execute`,
        {
          code: code,
          test_input: inputToUse,
        },
        { withCredentials: true }
      );
      setOutput(response.data.output || response.data.error || "No output");
    } catch (error) {
      console.error("Error running code:", error);
      const errorMsg = error.response?.status === 502 
        ? "Server timeout - your code might have an infinite loop or is taking too long. Please check your code and try again."
        : error.response?.data?.error || error.message || "Failed to run code";
      setOutput("❌ Error: " + errorMsg);
      toast.error("Code execution failed");
    } finally {
      setRunning(false);
    }
  };

  const handleInteractiveInputSubmit = (collectedInputs) => {
    handleRunCode(collectedInputs);
  };

  const handleViewLesson = async () => {
    setLoadingLesson(true);
    try {
      const currentProblemId = getCurrentProblemId();
      const response = await axios.get(
        `${API}/lessons/${assignmentId}?problem_id=${currentProblemId}`,
        { withCredentials: true }
      );
      
      if (response.data.exists === false) {
        toast.info("No lesson available yet for this assignment. Check back later!");
        return;
      }
      
      setLesson(response.data);
      setShowLessonDialog(true);
    } catch (error) {
      console.error("Error fetching lesson:", error);
      toast.error("Failed to load lesson");
    } finally {
      setLoadingLesson(false);
    }
  };

  const handleSubmit = async () => {
    if (!hasRun) {
      toast.error("Please run your code first before submitting!");
      return;
    }

    if (!code.trim()) {
      toast.error("Please write some code before submitting");
      return;
    }

    // Check if THIS PROBLEM is locked out
    const problemId = assignment.problems && assignment.problems[currentProblemIndex] 
      ? assignment.problems[currentProblemIndex].id 
      : assignmentId;
    
    // Check if marked as final/done
    if (problemsFinal[problemId]) {
      toast.error("This problem is marked as done. You cannot submit again!");
      return;
    }
    
    const currentProblemLives = livesPerProblem[problemId] || 3;
    if (currentProblemLives <= 0) {
      toast.error("You've used all 3 lives on THIS problem. Try the next one!");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API}/submissions`,
        {
          assignment_id: assignmentId,
          problem_id: problemId,
          code: code,
        },
        { withCredentials: true }
      );
      
      const isPassing = response.data.score >= 70;
      const newLivesRemaining = response.data.lives_remaining;
      const xpEarned = response.data.xp_earned || 0;
      const coinsEarned = response.data.coins_earned || 0;
      const rankUp = response.data.rank_up;
      const newRank = response.data.new_rank;
      
      // Update lives for THIS problem only
      setLivesPerProblem(prev => ({
        ...prev,
        [problemId]: newLivesRemaining
      }));
      
      // Update status for THIS problem
      setProblemStatuses(prev => ({
        ...prev,
        [problemId]: response.data.score
      }));
      
      if (rankUp) {
        toast.success(`🎉 RANK UP! You're now a ${newRank}!`, { duration: 5000 });
      }
      
      if (isPassing) {
        toast.success(
          `✅ Great job! Score: ${response.data.score.toFixed(1)}% | +${xpEarned} XP | +${coinsEarned} 🪙`,
          { duration: 4000 }
        );
      } else if (newLivesRemaining > 0) {
        toast.warning(`Score: ${response.data.score.toFixed(1)}% - ${newLivesRemaining} ${newLivesRemaining === 1 ? 'life' : 'lives'} remaining for this problem`);
      } else {
        toast.error(`Score: ${response.data.score.toFixed(1)}% - No lives remaining for THIS problem. Move to the next one!`);
      }
      
      // Reset run status for current problem after submission
      setHasRunPerProblem(prev => ({
        ...prev,
        [problemId]: false
      }));
      fetchSubmissions();
    } catch (error) {
      console.error("Error submitting assignment:", error);
      if (error.response?.status === 403) {
        toast.error(error.response.data.detail || "Submission not allowed");
      } else {
        toast.error("Failed to submit assignment");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkFinal = async () => {
    const problemId = getCurrentProblemId();
    
    // Get the most recent submission for this problem
    const problemSubmissions = submissions.filter(sub => sub.problem_id === problemId);
    if (problemSubmissions.length === 0) {
      toast.error("You must submit at least once before marking as done");
      return;
    }
    
    // Get latest submission
    const latestSubmission = problemSubmissions[problemSubmissions.length - 1];
    
    setMarkingFinal(true);
    try {
      await axios.post(
        `${API}/submissions/${latestSubmission.id}/mark-final`,
        {},
        { withCredentials: true }
      );
      
      // Update local state
      setProblemsFinal(prev => ({
        ...prev,
        [problemId]: true
      }));
      
      toast.success("Problem marked as done! You can no longer submit to this problem.");
    } catch (error) {
      console.error("Error marking final:", error);
      toast.error(error.response?.data?.detail || "Failed to mark as done");
    } finally {
      setMarkingFinal(false);
    }
  };


  // Fetch hint status when assignment loads
  useEffect(() => {
    if (assignment && user?.role === "student") {
      fetchHintStatus();
    }
  }, [assignment]);

  const fetchHintStatus = async () => {
    try {
      const response = await axios.get(`${API}/hint-status/${assignmentId}`, {
        withCredentials: true
      });
      setHintStatus(response.data);
    } catch (error) {
      console.error("Error fetching hint status:", error);
    }
  };

  const handleRequestHint = async (hintLevel) => {
    if (!code.trim()) {
      toast.error("Please write some code first before requesting a hint!");
      return;
    }
    
    if (loadingHint) {
      return; // Prevent duplicate requests
    }

    const coinCost = hintLevel === 1 ? 50 : 100;
    
    setLoadingHint(true);
    try {
      console.log("Requesting hint level:", hintLevel);
      const response = await axios.post(
        `${API}/get-hint`,
        {
          assignment_id: assignmentId,
          problem_id: getCurrentProblemId(),
          code: code,
          hint_level: hintLevel
        },
        { withCredentials: true }
      );

      console.log("Hint response:", response.data);

      if (response.data && response.data.hint) {
        setCurrentHint({
          text: response.data.hint,
          level: hintLevel,
          coins_spent: response.data.coins_spent
        });
        
        // Update hint status first
        setHintStatus({
          hints_used: response.data.hints_used,
          hints_remaining: response.data.hints_remaining,
          hint1_used: hintLevel === 1 ? true : hintStatus.hint1_used,
          hint2_used: hintLevel === 2 ? true : hintStatus.hint2_used
        });
        
        // Then show the dialog
        setTimeout(() => {
          setShowHintDialog(true);
          console.log("Dialog should be showing now");
        }, 100);
        
        toast.success(`Hint received! ${coinCost} coins spent. ${response.data.remaining_coins} coins remaining.`);
      } else {
        toast.error("Hint received but was empty");
      }
      
    } catch (error) {
      console.error("Error requesting hint:", error);
      const errorMsg = error.response?.data?.detail || "Failed to get hint";
      toast.error(errorMsg);
      
      // Refresh hint status in case something changed
      fetchHintStatus();
    } finally {
      setLoadingHint(false);
    }
  };


  if (loading) {
    return (
      <div data-testid="assignment-loading" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-xl text-gray-600">Assignment not found</div>
      </div>
    );
  }

  const isTeacher = user.role === "teacher";
  const latestSubmission = submissions.length > 0 ? submissions[submissions.length - 1] : null;

  return (
    <div data-testid="assignment-page" className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button 
              data-testid="back-to-dashboard-btn" 
              onClick={() => {
                const dashboardPath = user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
                // Use replace to force a fresh load of the dashboard
                navigate(dashboardPath, { replace: true, state: { refresh: Date.now() } });
              }} 
              variant="ghost" 
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <Code2 className="w-7 h-7 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">{assignment.title}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Multi-Problem Navigation */}
      {assignment.problems && assignment.problems.length > 1 && (
        <div className="bg-white border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Problem {currentProblemIndex + 1} of {assignment.problems.length}
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Progress: {Object.values(problemsFinal).filter(isDone => isDone).length}/{assignment.problems.length} done
                </div>
                {user.role === "student" && (
                  <div className="text-sm font-semibold">
                    Final Grade: {(() => {
                      const scores = assignment.problems.map(p => problemStatuses[p.id] || 0);
                      const totalProblems = assignment.problems.length;
                      const averageScore = totalProblems > 0 
                        ? scores.reduce((sum, score) => sum + score, 0) / totalProblems 
                        : 0;
                      const gradeColor = averageScore >= 90 ? "text-green-600" :
                                        averageScore >= 70 ? "text-yellow-600" :
                                        averageScore > 0 ? "text-orange-600" : "text-gray-500";
                      return <span className={gradeColor}>{averageScore.toFixed(1)}%</span>;
                    })()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {assignment.problems.map((problem, index) => {
                const problemScore = problemStatuses[problem.id];
                const problemLives = livesPerProblem[problem.id] || 3;
                
                // Determine color based on score
                let colorClass = 'bg-gray-100 text-gray-700 hover:bg-gray-200'; // Not attempted
                if (problemScore !== null && problemScore !== undefined) {
                  if (problemScore === 100) {
                    colorClass = 'bg-green-500 text-white hover:bg-green-600'; // Perfect
                  } else if (problemScore >= 70) {
                    colorClass = 'bg-yellow-400 text-gray-900 hover:bg-yellow-500'; // Passing
                  } else {
                    colorClass = 'bg-red-400 text-white hover:bg-red-500'; // Failed
                  }
                }
                
                // Locked out?
                const isLocked = problemLives <= 0;
                if (isLocked) {
                  colorClass = 'bg-gray-300 text-gray-500 cursor-not-allowed';
                }
                
                // Current problem highlight
                if (currentProblemIndex === index && !isLocked) {
                  colorClass = 'bg-indigo-600 text-white border-2 border-indigo-800';
                }
                
                return (
                  <button
                    key={problem.id}
                    onClick={() => !isLocked && setCurrentProblemIndex(index)}
                    disabled={isLocked}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${colorClass}`}
                  >
                    {problemScore === 100 && '✓ '}
                    {isLocked && '🔒 '}
                    {index + 1}. {problem.title}
                    {problemScore !== null && problemScore !== undefined && (
                      <span className="ml-1 text-xs">({problemScore.toFixed(0)}%)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-6 py-6">
        <div style={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
        <PanelGroup direction="horizontal" style={{ height: '100%' }}>
          {/* Left Side: Instructions & Test Cases */}
          <Panel defaultSize={30} minSize={20} maxSize={50}>
            <div className="space-y-6 pr-3 h-full overflow-y-auto">
              <Card data-testid="assignment-instructions">
                <CardHeader>
                  <CardTitle>Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {(assignment.problems && assignment.problems[currentProblemIndex]?.description) || assignment.description || "No description provided."}
                  </p>
                  
                  {/* Teacher Solution Button */}
                  {user.role === "teacher" && (
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={() => {
                          const problem = assignment.problems ? assignment.problems[currentProblemIndex] : assignment;
                          if (problem.solution_code) {
                            if (code === problem.solution_code) {
                              // Hide solution - load starter code
                              setCode(problem.starter_code || "# Write your code here\n");
                              toast.info("Solution hidden");
                            } else {
                              // Show solution
                              setCode(problem.solution_code);
                              toast.success("Solution code loaded!");
                            }
                          } else {
                            toast.info("No solution code available for this problem");
                          }
                        }}
                        variant="outline"
                        className="w-full gap-2 border-green-600 text-green-700 hover:bg-green-50"
                        size="sm"
                      >
                        <Code2 className="w-4 h-4" />
                        {(() => {
                          const problem = assignment.problems ? assignment.problems[currentProblemIndex] : assignment;
                          return code === problem?.solution_code ? "Hide Solution" : "Show Solution Code";
                        })()}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {(assignment.expected_output || (assignment.problems && assignment.problems[currentProblemIndex]?.expected_output)) && (
                <Card data-testid="expected-output-card" className="border-2 border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Expected Output</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="p-3 bg-white rounded border border-green-300 text-gray-800 text-sm font-mono whitespace-pre-wrap">
                      {assignment.expected_output || assignment.problems[currentProblemIndex].expected_output}
                    </pre>
                  </CardContent>
                </Card>
              )}

              <Card data-testid="test-cases-card">
                <CardHeader>
                  <CardTitle>Test Cases</CardTitle>
                  <CardDescription>Your code will be tested against these cases</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(assignment.test_cases || (assignment.problems && assignment.problems[0]?.test_cases) || []).map((testCase, index) => (
                    <div key={testCase.id} data-testid={`test-case-display-${index}`} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="font-semibold text-sm text-gray-900 mb-2">
                        Test {index + 1}: {testCase.description}
                      </div>
                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="font-medium text-gray-600">Input:</span>
                          <pre className="mt-1 p-2 bg-white rounded border border-gray-200 text-gray-800">{testCase.input_data || "(no input)"}</pre>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Expected Output:</span>
                          <pre className="mt-1 p-2 bg-white rounded border border-gray-200 text-gray-800">{testCase.expected_output}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {latestSubmission && (
                <Card data-testid="latest-submission-card" className="border-2 border-indigo-200 bg-indigo-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Latest Submission</CardTitle>
                    <CardDescription>
                      Score: <span className="font-bold text-indigo-600">{latestSubmission.score.toFixed(1)}%</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3">
                      <div className="font-semibold text-sm text-gray-900 mb-2">Feedback:</div>
                      <p className="text-sm text-gray-700">{latestSubmission.feedback}</p>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900 mb-2">Test Results:</div>
                      <div className="space-y-2">
                        {latestSubmission.test_results?.map((result, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            {result.passed ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={result.passed ? "text-green-700" : "text-red-700"}>
                              {result.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-indigo-500 transition-colors cursor-col-resize mx-2" />

          {/* Right Side: Code Editor & Output */}
          <Panel defaultSize={70} minSize={50}>
            <div className="pl-3 h-full">
            {!isTeacher ? (
              <PanelGroup direction="horizontal" style={{ height: '100%' }}>
                {/* Code Editor - Left */}
                <Panel defaultSize={50} minSize={30}>
                <Card data-testid="code-editor-card" className="h-full">
                  <CardHeader>
                    <CardTitle className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span>Code Editor</span>
                        <div className="flex items-center gap-3">
                          {/* Dark Mode Toggle */}
                          <Button
                            onClick={() => {
                              const newMode = !darkMode;
                              setDarkMode(newMode);
                              localStorage.setItem('editorDarkMode', newMode);
                            }}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            {darkMode ? '☀️ Light' : '🌙 Dark'}
                          </Button>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600">Lives (this problem):</span>
                            {(() => {
                              const currentProblemId = getCurrentProblemId();
                              const currentLives = livesPerProblem[currentProblemId] || 3;
                              const isProblemLocked = currentLives <= 0;
                              
                              if (isProblemLocked) {
                                return <span className="text-red-600 font-semibold">🚫 Locked</span>;
                              }
                              
                              return (
                                <span>
                                  {Array.from({ length: currentLives }).map((_, i) => (
                                    <span key={i} className="text-red-500">❤️</span>
                                  ))}
                                  {Array.from({ length: 3 - currentLives }).map((_, i) => (
                                    <span key={i} className="text-gray-300">🤍</span>
                                  ))}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          data-testid="run-code-btn" 
                          onClick={() => handleRunCode()} 
                          disabled={running}
                          variant="outline" 
                          size="sm"
                          className="gap-2 flex-1"
                        >
                          <Play className="w-4 h-4" />
                          {running ? "Running..." : "Run"}
                        </Button>
                        <Button 
                          data-testid="submit-code-btn" 
                          onClick={handleSubmit} 
                          disabled={submitting || (livesPerProblem[getCurrentProblemId()] || 3) <= 0 || !hasRun || problemsFinal[getCurrentProblemId()]}
                          className="bg-indigo-600 hover:bg-indigo-700 gap-2 flex-1"
                          size="sm"
                        >
                          <Send className="w-4 h-4" />
                          {submitting ? "Submitting..." : problemsFinal[getCurrentProblemId()] ? "Done" : (livesPerProblem[getCurrentProblemId()] || 3) <= 0 ? "Locked" : !hasRun ? "Run First" : "Submit"}
                        </Button>
                      </div>
                      {!hasRun && (livesPerProblem[getCurrentProblemId()] || 3) > 0 && (
                        <p className="text-xs text-amber-600">⚠️ You must run your code before submitting</p>
                      )}
                      {(livesPerProblem[getCurrentProblemId()] || 3) <= 0 && (
                        <p className="text-xs text-red-600">🚫 This problem is locked. Try the next one!</p>
                      )}
                      
                      {/* Learn Button - Always visible for students */}
                      {user.role === "student" && (
                        <div className="mt-4 pt-4 border-t">
                          <Button
                            onClick={handleViewLesson}
                            disabled={loadingLesson}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            size="sm"
                          >
                            <BookOpen className="w-4 h-4 mr-2" />
                            {loadingLesson ? "Loading..." : "📚 Learn This Concept (FREE)"}
                          </Button>
                          <p className="text-xs text-center text-gray-500 mt-2">
                            💡 Review the lesson anytime - no coins needed!
                          </p>
                        </div>
                      )}

                      {/* Hint and Mark as Done Buttons Row */}
                      {user.role === "student" && !problemsFinal[getCurrentProblemId()] && submissions.filter(s => s.problem_id === getCurrentProblemId()).length > 0 && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          {/* Hint Buttons */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleRequestHint(1)}
                              disabled={loadingHint || hintStatus.hint1_used || hintStatus.hints_remaining === 0}
                              variant="outline"
                              className="flex-1 border-yellow-400 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
                              size="sm"
                            >
                              <Lightbulb className="w-4 h-4 mr-1" />
                              {hintStatus.hint1_used ? "Hint 1 Used" : "Hint 1 (50🪙)"}
                            </Button>
                            <Button
                              onClick={() => handleRequestHint(2)}
                              disabled={loadingHint || !hintStatus.hint1_used || hintStatus.hint2_used || hintStatus.hints_remaining === 0}
                              variant="outline"
                              className="flex-1 border-orange-400 text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                              size="sm"
                            >
                              <Lightbulb className="w-4 h-4 mr-1" />
                              {hintStatus.hint2_used ? "Hint 2 Used" : "Hint 2 (100🪙)"}
                            </Button>
                            <Button
                              onClick={handleMarkFinal}
                              disabled={markingFinal}
                              variant="outline"
                              className="flex-1 border-green-500 text-green-700 hover:bg-green-50"
                              size="sm"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {markingFinal ? "..." : "Done"}
                            </Button>
                          </div>
                          <div className="text-xs text-center space-y-1">
                            <p className="text-gray-600">
                              💡 {hintStatus.hints_remaining}/2 hints remaining for this assignment
                            </p>
                            <p className="text-gray-500">
                              💰 Try reading the feedback first to save coins!
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {problemsFinal[getCurrentProblemId()] && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center justify-center gap-2 text-green-700 font-semibold mb-2">
                              <CheckCircle className="w-5 h-5" />
                              This problem is marked as done!
                            </div>
                            <p className="text-sm text-green-600 text-center">
                              You're viewing your final submitted code. You can reference it anytime, but cannot submit changes.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Problem Navigation Buttons */}
                      {assignment.problems && assignment.problems.length > 1 && (
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          <Button
                            onClick={() => setCurrentProblemIndex(Math.max(0, currentProblemIndex - 1))}
                            disabled={currentProblemIndex === 0}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            ← Previous
                          </Button>
                          <Button
                            onClick={() => setCurrentProblemIndex(Math.min(assignment.problems.length - 1, currentProblemIndex + 1))}
                            disabled={currentProblemIndex === assignment.problems.length - 1}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Next →
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Editor
                      height="600px"
                      defaultLanguage="python"
                      value={code}
                      onChange={(value) => !problemsFinal[getCurrentProblemId()] && setCode(value || "")}
                      theme={darkMode ? "vs-dark" : "vs-light"}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: "on",
                        wrappingIndent: "indent",
                        readOnly: problemsFinal[getCurrentProblemId()],
                      }}
                    />
                  </CardContent>
                </Card>
              </Panel>

              {/* Resize Handle */}
              <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-indigo-500 transition-colors cursor-col-resize mx-2" />

              {/* Output - Right - Full Space */}
              <Panel defaultSize={50} minSize={30}>
                <Card data-testid="output-card" className="h-full flex flex-col">
                  <CardHeader className="pb-2 pt-3 flex-shrink-0">
                    <CardTitle className="text-lg">Output</CardTitle>
                    <CardDescription className="text-xs">
                      Code with input() will show interactive dialog automatically
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto min-h-0">
                    <pre className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm whitespace-pre-wrap h-full">
                      {output || "Run your code to see output here..."}
                    </pre>
                  </CardContent>
                </Card>
              </Panel>
              </PanelGroup>
            ) : (
              // Teacher Demo/Sandbox Mode - Interactive coding without submissions
              <PanelGroup direction="horizontal" style={{ height: '100%' }}>
                {/* Code Editor - Left */}
                <Panel defaultSize={50} minSize={30}>
                <Card data-testid="teacher-sandbox-card" className="h-full">
                  <CardHeader>
                    <CardTitle className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span>Live Demo / Sandbox</span>
                        <div className="flex items-center gap-3">
                          {/* Dark Mode Toggle */}
                          <Button
                            onClick={() => {
                              const newMode = !darkMode;
                              setDarkMode(newMode);
                              localStorage.setItem(`darkMode_${assignmentId}`, newMode);
                            }}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            {darkMode ? '☀️ Light' : '🌙 Dark'}
                          </Button>
                          
                          <span className="text-sm text-green-600 font-semibold">
                            🎓 Teacher Mode
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          data-testid="teacher-run-code-btn" 
                          onClick={() => handleRunCode()} 
                          disabled={running}
                          variant="outline" 
                          size="sm"
                          className="gap-2 flex-1"
                        >
                          <Play className="w-4 h-4" />
                          {running ? "Running..." : "Run Code"}
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-120px)]">
                    <Editor
                      height="100%"
                      defaultLanguage="python"
                      value={code}
                      onChange={(value) => !problemsFinal[getCurrentProblemId()] && setCode(value || "")}
                      theme={darkMode ? "vs-dark" : "light"}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: "on",
                        wrappingIndent: "indent",
                        readOnly: problemsFinal[getCurrentProblemId()],
                      }}
                    />
                  </CardContent>
                </Card>
                </Panel>

                <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-indigo-500 transition-colors cursor-col-resize mx-2" />

                {/* Output - Right - Full Space */}
                <Panel defaultSize={50} minSize={30}>
                  <Card className="h-full flex flex-col">
                    <CardHeader className="pb-2 pt-3 flex-shrink-0">
                      <CardTitle className="flex justify-between items-center">
                        <span>Output</span>
                        <span className="text-xs text-gray-500 font-normal">Demo mode - not graded</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Code with input() will show interactive dialog automatically
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto min-h-0">
                      <pre className={`p-4 ${darkMode ? 'bg-gray-900 text-green-400' : 'bg-gray-100 text-gray-900'} rounded-lg font-mono text-sm whitespace-pre-wrap h-full`}>
                        {output || "Run your code to see output here..."}
                      </pre>
                    </CardContent>
                  </Card>
                </Panel>
              </PanelGroup>
            )}

            {isTeacher && submissions.length > 0 && (
              <Card data-testid="teacher-submissions-card">
              <CardHeader>
                <CardTitle>Student Submissions</CardTitle>
                <CardDescription>{submissions.length} submission(s)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-auto">
                  {submissions.map((sub, index) => (
                    <div key={sub.id} data-testid={`submission-${index}`} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-sm">{sub.student_name}</div>
                        <div className="text-sm font-bold text-indigo-600">{sub.score.toFixed(1)}%</div>
                      </div>
                      <div className="text-xs text-gray-600">{sub.feedback}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </div>
          </Panel>
        </PanelGroup>
        </div>
      </main>

      {/* Hint Dialog */}
      <Dialog open={showHintDialog} onOpenChange={setShowHintDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Hint {currentHint?.level} - {currentHint?.coins_spent} Coins Spent
            </DialogTitle>
            <DialogDescription>
              Here's a hint to help you solve this problem. Remember to read the feedback too!
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
            <p className="text-gray-800 whitespace-pre-wrap">{currentHint?.text}</p>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>💡 {hintStatus.hints_remaining} hints remaining for this assignment</span>
            <Button onClick={() => setShowHintDialog(false)} size="sm">
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Interactive Input Dialog */}
      <InteractiveInputCollector
        isOpen={showInteractiveDialog}
        onClose={() => setShowInteractiveDialog(false)}
        onSubmitInputs={handleInteractiveInputSubmit}
        codePreview={code}
      />

      {/* Lesson Modal */}
      <LessonModal
        isOpen={showLessonDialog}
        onClose={() => setShowLessonDialog(false)}
        lesson={lesson}
      />
    </div>
  );
}
