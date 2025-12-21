import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Play, Send, CheckCircle, XCircle, Code2, Lightbulb, X, BookOpen, Cpu } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import InteractiveInputCollector from "@/components/InteractiveInputCollector";
import LessonModal from "@/components/LessonModal";
import MicrobitSimulator from "@/components/MicrobitSimulator";
import SkillQuizPopup from "@/components/SkillQuizPopup";
import AnimatedTurtle from "@/components/AnimatedTurtle";
import MazeLeaderboard from "@/components/MazeLeaderboard";

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
  
  // Turtle graphics state
  const [turtleImage, setTurtleImage] = useState("");
  const [useLiveTurtle, setUseLiveTurtle] = useState(true); // Use AnimatedTurtle instead of static image
  const [mazeStartTime, setMazeStartTime] = useState(null); // Track time for maze challenges
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  // Proctor code for unlocking done problems (kept for teacher override)
  const [showProctorDialog, setShowProctorDialog] = useState(false);
  const [proctorCode, setProctorCode] = useState("");
  const [unlockingProblem, setUnlockingProblem] = useState(false);
  
  // Skill quiz state
  const [showSkillQuiz, setShowSkillQuiz] = useState(false);
  const [quizSkillCategory, setQuizSkillCategory] = useState("");

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
      
      // Calculate status PER PROBLEM for students (no lives tracking - unlimited attempts)
      if (user.role === "student" && assignment && assignment.problems) {
        const statusMap = {};
        const finalMap = {};
        
        // Initialize all problems with no status
        assignment.problems.forEach(problem => {
          statusMap[problem.id] = null; // null = not attempted
          finalMap[problem.id] = false;
        });
        
        // Update based on submissions
        response.data.forEach(submission => {
          const problemId = submission.problem_id;
          
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
        
        setProblemStatuses(statusMap);
        setProblemsFinal(finalMap);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const handleRunCode = async (providedInput = null) => {
    // Get current problem
    const currentProblem = assignment?.problems?.[currentProblemIndex];
    const isTurtle = currentProblem?.assignment_type === "turtle";
    const isMicrobit = currentProblem?.assignment_type === "microbit";
    
    // For Micro:bit assignments, don't run on backend - use the visual simulator only
    if (isMicrobit) {
      // Mark as run so submit button becomes enabled
      const currentProblemId = getCurrentProblemId();
      setHasRunPerProblem(prev => ({
        ...prev,
        [currentProblemId]: true
      }));
      
      // Show a helpful message
      setOutput("✅ Use the Virtual Micro:bit simulator above to test your code!\n\nClick the 'Run' button on the simulator to see your code in action.\n\nNote: The simulator shows LED display commands. For full functionality (sensors, buttons, pins), flash your code to a real Micro:bit.");
      return;
    }
    
    // Check if code contains input() calls and no input provided yet (skip for turtle)
    if (!isTurtle) {
      const hasInputCalls = /input\s*\(/i.test(code);
      if (hasInputCalls && !testInput && providedInput === null) {
        // Always show interactive dialog for student to enter input
        setShowInteractiveDialog(true);
        return;
      }
    }

    setRunning(true);
    setOutput("");
    setTurtleImage(""); // Clear previous turtle image
    
    // Mark current problem as run
    const currentProblemId = getCurrentProblemId();
    setHasRunPerProblem(prev => ({
      ...prev,
      [currentProblemId]: true
    }));
    
    try {
      if (isTurtle) {
        // Execute turtle graphics code
        const response = await axios.post(
          `${API}/code/execute-turtle`,
          {
            code: code,
            test_input: "",
          },
          { withCredentials: true }
        );
        
        if (response.data.success && response.data.image_data) {
          setTurtleImage(response.data.image_data);
          setOutput(response.data.output || "✅ Turtle graphics executed successfully!");
        } else {
          setOutput("❌ Error: " + (response.data.error || "Failed to generate turtle graphics"));
        }
      } else {
        // Regular code execution
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
      }
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

    // Get current problem ID
    const problemId = assignment.problems && assignment.problems[currentProblemIndex] 
      ? assignment.problems[currentProblemIndex].id 
      : assignmentId;
    
    // Check if marked as final/done
    if (problemsFinal[problemId]) {
      toast.error("This problem is marked as done. You cannot submit again!");
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
      const xpEarned = response.data.xp_earned || 0;
      const coinsEarned = response.data.coins_earned || 0;
      const rankUp = response.data.rank_up;
      const newRank = response.data.new_rank;
      
      // Update status for THIS problem (best score)
      setProblemStatuses(prev => {
        const currentBest = prev[problemId] || 0;
        return {
          ...prev,
          [problemId]: Math.max(currentBest, response.data.score)
        };
      });
      
      if (rankUp) {
        toast.success(`🎉 RANK UP! You're now a ${newRank}!`, { duration: 5000 });
      }
      
      if (isPassing) {
        toast.success(
          `✅ Great job! Score: ${response.data.score.toFixed(1)}% | +${xpEarned} XP | +${coinsEarned} 🪙`,
          { duration: 4000 }
        );
      } else {
        toast.warning(`Score: ${response.data.score.toFixed(1)}% - Keep trying! You can submit unlimited times until you click Done.`);
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
    
    // Get best score for this problem
    const bestScore = problemStatuses[problemId] || 0;
    
    // Confirmation dialog
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to submit this assignment as DONE?\n\n` +
      `Your current best score: ${bestScore.toFixed(0)}%\n\n` +
      `After clicking OK:\n` +
      `• This problem will be marked as COMPLETED\n` +
      `• You will NOT be able to submit again\n` +
      `• Only your teacher can unlock it with a proctor code\n\n` +
      `Click OK to confirm, or Cancel to keep working.`
    );
    
    if (!confirmed) return;
    
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
      
      toast.success("Problem submitted as done! It will now appear in your Completed assignments.");
      
      // Check if this was the last problem - trigger skill quiz
      if (assignment && assignment.problems) {
        const totalProblems = assignment.problems.length;
        const updatedFinalMap = { ...problemsFinal, [problemId]: true };
        const completedCount = Object.values(updatedFinalMap).filter(Boolean).length;
        
        // If all problems are done, show the skill quiz
        if (completedCount === totalProblems && totalProblems > 0) {
          // Use the assignment's category as the skill category
          const skillCategory = assignment.category || assignment.problems[0]?.category || "General";
          setQuizSkillCategory(skillCategory);
          setShowSkillQuiz(true);
        }
      }
    } catch (error) {
      console.error("Error marking final:", error);
      toast.error(error.response?.data?.detail || "Failed to mark as done");
    } finally {
      setMarkingFinal(false);
    }
  };
  
  const handleUnlockProblem = async () => {
    if (!proctorCode.trim()) {
      toast.error("Please enter the proctor code");
      return;
    }
    
    const problemId = getCurrentProblemId();
    setUnlockingProblem(true);
    
    try {
      // Verify proctor code with backend
      await axios.post(
        `${API}/assignments/${assignmentId}/unlock-problem`,
        {
          problem_id: problemId,
          proctor_code: proctorCode
        },
        { withCredentials: true }
      );
      
      // Update local state to unlock
      setProblemsFinal(prev => ({
        ...prev,
        [problemId]: false
      }));
      
      setShowProctorDialog(false);
      setProctorCode("");
      toast.success("Problem unlocked! You can now submit again.");
    } catch (error) {
      console.error("Error unlocking problem:", error);
      toast.error(error.response?.data?.detail || "Invalid proctor code");
    } finally {
      setUnlockingProblem(false);
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
                const isFinal = problemsFinal[problem.id];
                
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
                
                // Mark as done/final
                if (isFinal) {
                  colorClass = 'bg-blue-500 text-white hover:bg-blue-600';
                }
                
                // Current problem highlight
                if (currentProblemIndex === index) {
                  colorClass = 'bg-indigo-600 text-white border-2 border-indigo-800';
                }
                
                return (
                  <button
                    key={problem.id}
                    onClick={() => setCurrentProblemIndex(index)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${colorClass}`}
                  >
                    {problemScore === 100 && '✓ '}
                    {isFinal && problemScore !== 100 && '✔ '}
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

              {/* Micro:bit Specific Content */}
              {(() => {
                const currentProblem = assignment.problems?.[currentProblemIndex];
                const isMicrobit = currentProblem?.assignment_type === "microbit";
                
                if (!isMicrobit) return null;
                
                return (
                  <>
                    {/* Learning Objectives */}
                    {currentProblem.learning_objectives?.length > 0 && (
                      <Card className="border-cyan-200 bg-cyan-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            🎯 Learning Objectives
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {currentProblem.learning_objectives.map((obj, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                                <span>{obj}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Materials Needed */}
                    {currentProblem.materials_needed?.length > 0 && (
                      <Card className="border-yellow-200 bg-yellow-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            🔧 Materials Needed
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {currentProblem.materials_needed.map((mat, i) => (
                              <span 
                                key={i} 
                                className="px-2 py-1 bg-white border border-yellow-300 rounded-full text-xs font-medium"
                              >
                                {mat}
                              </span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Wiring Instructions */}
                    {currentProblem.wiring_instructions && (
                      <Card className="border-orange-200 bg-orange-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            ⚡ Wiring Instructions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-sm whitespace-pre-wrap font-sans text-gray-700">
                            {currentProblem.wiring_instructions}
                          </pre>
                        </CardContent>
                      </Card>
                    )}
                  </>
                );
              })()}

              {/* Expected Output - Text or Turtle Image */}
              {(() => {
                const currentProblem = assignment.problems?.[currentProblemIndex];
                const isTurtle = currentProblem?.assignment_type === "turtle";
                const hasExpectedOutput = assignment.expected_output || currentProblem?.expected_output;
                const hasExpectedImage = currentProblem?.expected_turtle_image;
                
                if (isTurtle && hasExpectedImage) {
                  return (
                    <Card data-testid="expected-output-card" className="border-2 border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-lg">🎯 Expected Output</CardTitle>
                        <CardDescription>Your turtle graphics should look like this</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-center">
                          <img 
                            src={`data:image/png;base64,${hasExpectedImage}`}
                            alt="Expected turtle output"
                            className="border-2 border-green-300 rounded max-w-full h-auto"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                } else if (!isTurtle && hasExpectedOutput) {
                  return (
                    <Card data-testid="expected-output-card" className="border-2 border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-lg">Expected Output</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="p-3 bg-white rounded border border-green-300 text-gray-800 text-sm font-mono whitespace-pre-wrap">
                          {assignment.expected_output || currentProblem.expected_output}
                        </pre>
                      </CardContent>
                    </Card>
                  );
                }
                return null;
              })()}

              <Card data-testid="test-cases-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    📋 Test Cases
                    <span className="text-sm font-normal text-gray-500">
                      ({(() => {
                        const problem = assignment.problems ? assignment.problems[currentProblemIndex] : assignment;
                        const testCases = problem?.test_cases || [];
                        return testCases.length;
                      })()} tests)
                    </span>
                  </CardTitle>
                  <CardDescription>Your code will be graded against ALL these test cases</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Test Cases Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-indigo-50">
                          <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-indigo-700">#</th>
                          <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-indigo-700">Test Name</th>
                          <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-indigo-700">Input</th>
                          <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-indigo-700">Expected Output</th>
                          <th className="border border-gray-200 px-3 py-2 text-center font-semibold text-indigo-700">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const problem = assignment.problems ? assignment.problems[currentProblemIndex] : assignment;
                          const testCases = problem?.test_cases || [];
                          const pointsPerTest = testCases.length > 0 ? Math.round(100 / testCases.length) : 0;
                          
                          return testCases.map((testCase, index) => (
                            <tr key={testCase.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
                                {index + 1}
                              </td>
                              <td className="border border-gray-200 px-3 py-2 font-medium text-gray-900">
                                {testCase.description || `Test ${index + 1}`}
                              </td>
                              <td className="border border-gray-200 px-3 py-2">
                                <pre className="whitespace-pre-wrap font-mono text-xs bg-blue-50 p-2 rounded text-blue-800 max-w-xs overflow-x-auto">
                                  {(testCase.input_data || testCase.input || "(no input)").split('\\n').join('\n')}
                                </pre>
                              </td>
                              <td className="border border-gray-200 px-3 py-2">
                                <pre className="whitespace-pre-wrap font-mono text-xs bg-green-50 p-2 rounded text-green-800 max-w-xs overflow-x-auto">
                                  {(testCase.expected_output || "").split('\\n').join('\n')}
                                </pre>
                              </td>
                              <td className="border border-gray-200 px-3 py-2 text-center">
                                <span className="inline-flex items-center justify-center px-2 py-1 bg-amber-100 text-amber-800 rounded-full font-semibold text-xs">
                                  {testCase.points || pointsPerTest} pts
                                </span>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Helpful tip for students */}
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      <strong>💡 Tip:</strong> Your output must match the expected output <strong>exactly</strong> (including spaces, capitalization, and punctuation). 
                      Run your code first to see what your program outputs!
                    </p>
                  </div>
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
                <div className="h-full overflow-y-auto">
                <Card data-testid="code-editor-card">
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
                          
                          {/* Show current best score for this problem */}
                          {(() => {
                            const currentProblemId = getCurrentProblemId();
                            const bestScore = problemStatuses[currentProblemId];
                            const isFinal = problemsFinal[currentProblemId];
                            
                            if (isFinal) {
                              return (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-blue-600 font-semibold">✔ Submitted as Done ({bestScore?.toFixed(0) || 0}%)</span>
                                </div>
                              );
                            }
                            
                            if (bestScore !== null && bestScore !== undefined) {
                              return (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-600">Best Score:</span>
                                  <span className={`font-semibold ${bestScore >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
                                    {bestScore.toFixed(0)}%
                                  </span>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="text-sm text-gray-500">
                                <span>Unlimited attempts</span>
                              </div>
                            );
                          })()}
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
                          disabled={submitting || !hasRun || problemsFinal[getCurrentProblemId()]}
                          className="bg-indigo-600 hover:bg-indigo-700 gap-2 flex-1"
                          size="sm"
                        >
                          <Send className="w-4 h-4" />
                          {submitting ? "Submitting..." : problemsFinal[getCurrentProblemId()] ? "Done" : !hasRun ? "Run First" : "Submit"}
                        </Button>
                      </div>
                      {!hasRun && !problemsFinal[getCurrentProblemId()] && (
                        <p className="text-xs text-amber-600">⚠️ You must run your code before submitting</p>
                      )}
                      
                      {/* Learn Button - Visible for both students and teachers */}
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
                              {markingFinal ? "..." : "Submit as Done"}
                            </Button>
                          </div>
                          <div className="text-xs text-center space-y-1 mt-2">
                            <p className="text-orange-600 font-medium">
                              ⚠️ Click "Submit as Done" only when you're finished!
                            </p>
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
                            <p className="text-sm text-green-600 text-center mb-3">
                              You&apos;re viewing your final submitted code. You can reference it anytime, but cannot submit changes.
                            </p>
                            <div className="flex justify-center">
                              <Button
                                onClick={() => setShowProctorDialog(true)}
                                variant="outline"
                                size="sm"
                                className="border-orange-400 text-orange-700 hover:bg-orange-50"
                              >
                                🔓 Accidentally clicked Done? Unlock with Proctor Code
                              </Button>
                            </div>
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
                </div>
              </Panel>

              {/* Resize Handle */}
              <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-indigo-500 transition-colors cursor-col-resize mx-2" />

              {/* Output - Right - Full Space */}
              <Panel defaultSize={50} minSize={30}>
                <Card data-testid="output-card" className="h-full flex flex-col">
                  <CardHeader className="pb-2 pt-3 flex-shrink-0">
                    <CardTitle className="text-lg">
                      {assignment.problems?.[currentProblemIndex]?.assignment_type === "turtle" 
                        ? "🐢 Your Turtle Output" 
                        : assignment.problems?.[currentProblemIndex]?.assignment_type === "microbit"
                          ? "⚡ Virtual Micro:bit"
                          : "Output"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {assignment.problems?.[currentProblemIndex]?.assignment_type === "turtle" 
                        ? "Your turtle graphics will appear here" 
                        : assignment.problems?.[currentProblemIndex]?.assignment_type === "microbit"
                          ? "Test your code on the virtual Micro:bit before using real hardware"
                          : "Code with input() will show interactive dialog automatically"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto min-h-0 p-4">
                    {assignment.problems?.[currentProblemIndex]?.assignment_type === "microbit" ? (
                      <div className="h-full flex flex-col gap-3">
                        {/* Micro:bit Simulator */}
                        <MicrobitSimulator 
                          code={code} 
                          onButtonPress={(button) => {
                            toast.info(`Button ${button} pressed!`);
                          }}
                        />
                        
                        {/* Console output below simulator */}
                        {output && (
                          <div className="mt-2">
                            <div className="text-sm font-semibold text-gray-700 mb-1">Console Output:</div>
                            <pre className="p-3 bg-gray-900 text-green-400 rounded-lg font-mono text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {output}
                            </pre>
                          </div>
                        )}
                        
                        {/* Helpful note */}
                        <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-xs text-cyan-800">
                          <strong>💡 Note:</strong> This is a visual simulator for testing display commands. 
                          For full functionality (sensors, pins), flash your code to a real Micro:bit!
                        </div>
                      </div>
                    ) : assignment.problems?.[currentProblemIndex]?.assignment_type === "turtle" ? (
                      <div className="h-full flex flex-col gap-3">
                        {turtleImage ? (
                          <div className="flex justify-center items-center bg-white p-4 rounded border-2 border-gray-200">
                            <img 
                              src={`data:image/png;base64,${turtleImage}`}
                              alt="Turtle output"
                              className="max-w-full h-auto"
                              style={{ maxHeight: "500px" }}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-64 bg-gray-50 rounded border-2 border-dashed border-gray-300 text-gray-500">
                            <div className="text-center">
                              <div className="text-4xl mb-2">🐢</div>
                              <div>Run your turtle code to see the output here...</div>
                            </div>
                          </div>
                        )}
                        {output && (
                          <div className="mt-2">
                            <div className="text-sm font-semibold text-gray-700 mb-1">Console Output:</div>
                            <pre className="p-3 bg-gray-900 text-green-400 rounded-lg font-mono text-xs whitespace-pre-wrap">
                              {output}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <pre className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm whitespace-pre-wrap h-full">
                        {output || "Run your code to see output here..."}
                      </pre>
                    )}
                  </CardContent>
                </Card>
              </Panel>
              </PanelGroup>
            ) : (
              // Teacher Demo/Sandbox Mode - Interactive coding without submissions
              <PanelGroup direction="horizontal" style={{ height: '100%' }}>
                {/* Code Editor - Left */}
                <Panel defaultSize={50} minSize={30}>
                <div className="h-full overflow-y-auto">
                <Card data-testid="teacher-sandbox-card">
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
                  <CardContent className="p-0">
                    <Editor
                      height="600px"
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
                </div>
                </Panel>

                <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-indigo-500 transition-colors cursor-col-resize mx-2" />

                {/* Output - Right - Full Space */}
                <Panel defaultSize={50} minSize={30}>
                  <Card className="h-full flex flex-col">
                    <CardHeader className="pb-2 pt-3 flex-shrink-0">
                      <CardTitle className="flex justify-between items-center">
                        <span>
                          {assignment.problems?.[currentProblemIndex]?.assignment_type === "turtle" 
                            ? "🐢 Turtle Output" 
                            : assignment.problems?.[currentProblemIndex]?.assignment_type === "microbit"
                              ? "⚡ Virtual Micro:bit"
                              : "Output"}
                        </span>
                        <span className="text-xs text-gray-500 font-normal">Demo mode - not graded</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {assignment.problems?.[currentProblemIndex]?.assignment_type === "turtle" 
                          ? "Your turtle graphics will appear here" 
                          : assignment.problems?.[currentProblemIndex]?.assignment_type === "microbit"
                            ? "Test your code on the virtual Micro:bit simulator"
                            : "Code with input() will show interactive dialog automatically"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto min-h-0 p-4">
                      {assignment.problems?.[currentProblemIndex]?.assignment_type === "microbit" ? (
                        <div className="h-full flex flex-col gap-3">
                          {/* Micro:bit Simulator for Teacher Demo Mode */}
                          <MicrobitSimulator 
                            code={code} 
                            onButtonPress={(button) => {
                              toast.info(`Button ${button} pressed!`);
                            }}
                          />
                          
                          {/* Console output below simulator */}
                          {output && (
                            <div className="mt-2">
                              <div className="text-sm font-semibold text-gray-700 mb-1">Console Output:</div>
                              <pre className={`p-3 ${darkMode ? 'bg-gray-900 text-green-400' : 'bg-gray-100 text-gray-900'} rounded-lg font-mono text-xs whitespace-pre-wrap max-h-32 overflow-y-auto`}>
                                {output}
                              </pre>
                            </div>
                          )}
                          
                          {/* Helpful note */}
                          <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-xs text-cyan-800">
                            <strong>💡 Note:</strong> This is a visual simulator for testing display commands. 
                            For full functionality (sensors, pins), flash your code to a real Micro:bit!
                          </div>
                        </div>
                      ) : assignment.problems?.[currentProblemIndex]?.assignment_type === "turtle" ? (
                        <div className="h-full flex flex-col gap-3">
                          {turtleImage ? (
                            <div className="flex justify-center items-center bg-white p-4 rounded border-2 border-gray-200">
                              <img 
                                src={`data:image/png;base64,${turtleImage}`}
                                alt="Turtle output"
                                className="max-w-full h-auto"
                                style={{ maxHeight: "500px" }}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-64 bg-gray-50 rounded border-2 border-dashed border-gray-300 text-gray-500">
                              <div className="text-center">
                                <div className="text-4xl mb-2">🐢</div>
                                <div>Run your turtle code to see the output here...</div>
                              </div>
                            </div>
                          )}
                          {output && (
                            <div className="mt-2">
                              <div className="text-sm font-semibold text-gray-700 mb-1">Console Output:</div>
                              <pre className={`p-3 ${darkMode ? 'bg-gray-900 text-green-400' : 'bg-gray-100 text-gray-900'} rounded-lg font-mono text-xs whitespace-pre-wrap`}>
                                {output}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <pre className={`p-4 ${darkMode ? 'bg-gray-900 text-green-400' : 'bg-gray-100 text-gray-900'} rounded-lg font-mono text-sm whitespace-pre-wrap h-full`}>
                          {output || "Run your code to see output here..."}
                        </pre>
                      )}
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
                  {submissions.map((sub, index) => {
                    const isTurtleSubmission = sub.turtle_image && sub.turtle_image.length > 0;
                    return (
                      <div key={sub.id} data-testid={`submission-${index}`} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-sm">{sub.student_name}</div>
                          <div className="text-sm font-bold text-indigo-600">{sub.score.toFixed(1)}%</div>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">{sub.feedback}</div>
                        
                        {/* Show turtle image if this is a turtle submission */}
                        {isTurtleSubmission && (
                          <div className="mt-3">
                            <div className="text-xs font-semibold text-gray-700 mb-1">Student&apos;s Turtle Graphics:</div>
                            <div className="flex justify-center bg-white p-2 rounded border">
                              <img 
                                src={`data:image/png;base64,${sub.turtle_image}`}
                                alt="Student turtle output"
                                className="max-w-full h-auto"
                                style={{ maxHeight: "200px" }}
                              />
                            </div>
                            {sub.turtle_tracking_data && (
                              <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded">
                                <div className="font-semibold mb-1">📊 Tracking Data:</div>
                                <div className="grid grid-cols-2 gap-1">
                                  <span>Lines: {sub.turtle_tracking_data.lines_drawn}</span>
                                  <span>Circles: {sub.turtle_tracking_data.circles_drawn}</span>
                                  <span>Distance: {sub.turtle_tracking_data.total_distance?.toFixed(0)}</span>
                                  <span>Colors: {sub.turtle_tracking_data.colors_used?.join(", ")}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
              Here&apos;s a hint to help you solve this problem. Remember to read the feedback too!
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
      
      {/* Proctor Code Dialog for Unlocking Done Problems */}
      <Dialog open={showProctorDialog} onOpenChange={setShowProctorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔓 Unlock Problem</DialogTitle>
            <DialogDescription>
              Enter the proctor code to unlock this problem and submit again
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="proctorCode">Proctor Code</Label>
              <Input
                id="proctorCode"
                type="text"
                placeholder="Enter 6-digit code"
                value={proctorCode}
                onChange={(e) => setProctorCode(e.target.value)}
                className="mt-2"
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUnlockProblem}
                disabled={unlockingProblem || !proctorCode.trim()}
                className="flex-1"
              >
                {unlockingProblem ? "Verifying..." : "Unlock Problem"}
              </Button>
              <Button
                onClick={() => {
                  setShowProctorDialog(false);
                  setProctorCode("");
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Skill Quiz Popup - triggered after completing all problems */}
      <SkillQuizPopup
        isOpen={showSkillQuiz}
        onClose={() => setShowSkillQuiz(false)}
        skillCategory={quizSkillCategory}
        assignmentId={assignmentId}
        classroomId={classroomIdFromNav || ""}
        onQuizComplete={(results) => {
          toast.success(`Quiz completed! Score: ${results.score?.toFixed(0)}%`);
        }}
      />
    </div>
  );
}
