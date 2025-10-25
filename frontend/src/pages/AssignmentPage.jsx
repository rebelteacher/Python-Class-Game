import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play, Send, CheckCircle, XCircle, Code2 } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

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

  useEffect(() => {
    fetchAssignment();
    fetchSubmissions();
    
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('editorDarkMode');
    if (savedDarkMode === 'true') {
      setDarkMode(true);
    }
  }, [assignmentId]);

  useEffect(() => {
    // Save current code before switching
    if (assignment && assignment.problems && assignment.problems[currentProblemIndex]) {
      const currentProblemId = getCurrentProblemId();
      
      // Load saved code for this problem, or use starter code if none saved
      const savedCode = savedCodePerProblem[currentProblemId];
      const currentProblem = assignment.problems[currentProblemIndex];
      
      if (savedCode) {
        setCode(savedCode);
      } else {
        setCode(currentProblem.starter_code || "# Write your code here\n");
      }
      
      setOutput("");
    }
  }, [currentProblemIndex, assignment]);
  
  // Auto-save code as students type
  useEffect(() => {
    if (assignment && code) {
      const currentProblemId = getCurrentProblemId();
      setSavedCodePerProblem(prev => ({
        ...prev,
        [currentProblemId]: code
      }));
    }
  }, [code]);

  // Get current problem's run status
  const getCurrentProblemId = () => {
    if (assignment?.problems && assignment.problems[currentProblemIndex]) {
      return assignment.problems[currentProblemIndex].id;
    }
    return assignmentId; // Fallback for old single-problem assignments
  };

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
        
        // Initialize all problems with 3 lives and no status
        assignment.problems.forEach(problem => {
          livesMap[problem.id] = 3;
          statusMap[problem.id] = null; // null = not attempted
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
        });
        
        setLivesPerProblem(livesMap);
        setProblemStatuses(statusMap);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const handleRunCode = async () => {
    setRunning(true);
    setOutput("");
    
    // Mark current problem as run
    const currentProblemId = getCurrentProblemId();
    setHasRunPerProblem(prev => ({
      ...prev,
      [currentProblemId]: true
    }));
    
    try {
      const response = await axios.post(
        `${API}/code/execute`,
        {
          code: code,
          test_input: "",
        },
        { withCredentials: true }
      );
      setOutput(response.data.output || response.data.error || "No output");
    } catch (error) {
      console.error("Error running code:", error);
      setOutput("Error running code: " + error.message);
    } finally {
      setRunning(false);
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
                navigate(dashboardPath);
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
              <div className="text-sm text-gray-600">
                Progress: {Object.values(problemStatuses).filter(score => score && score >= 70).length}/{assignment.problems.length} completed
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
        <PanelGroup direction="horizontal">
          {/* Left Side: Instructions & Test Cases */}
          <Panel defaultSize={30} minSize={20} maxSize={50}>
            <div className="space-y-6 pr-3">
              <Card data-testid="assignment-instructions">
                <CardHeader>
                  <CardTitle>Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {(assignment.problems && assignment.problems[currentProblemIndex]?.description) || assignment.description || "No description provided."}
                  </p>
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
            <div className="pl-3">
            {!isTeacher ? (
              <PanelGroup direction="horizontal">
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
                          onClick={handleRunCode} 
                          disabled={running || isLockedOut}
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
                          disabled={submitting || (livesPerProblem[getCurrentProblemId()] || 3) <= 0 || !hasRun}
                          className="bg-indigo-600 hover:bg-indigo-700 gap-2 flex-1"
                          size="sm"
                        >
                          <Send className="w-4 h-4" />
                          {submitting ? "Submitting..." : (livesPerProblem[getCurrentProblemId()] || 3) <= 0 ? "Locked" : !hasRun ? "Run First" : "Submit"}
                        </Button>
                      </div>
                      {!hasRun && (livesPerProblem[getCurrentProblemId()] || 3) > 0 && (
                        <p className="text-xs text-amber-600">⚠️ You must run your code before submitting</p>
                      )}
                      {(livesPerProblem[getCurrentProblemId()] || 3) <= 0 && (
                        <p className="text-xs text-red-600">🚫 This problem is locked. Try the next one!</p>
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
                      onChange={(value) => setCode(value || "")}
                      theme={darkMode ? "vs-dark" : "vs-light"}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                      }}
                    />
                  </CardContent>
                </Card>
              </Panel>

              {/* Resize Handle */}
              <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-indigo-500 transition-colors cursor-col-resize mx-2" />

              {/* Output - Right */}
              <Panel defaultSize={50} minSize={30}>
                <Card data-testid="output-card" className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Output</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm h-[600px] overflow-auto">
                      {output || "Run your code to see output here..."}
                    </pre>
                  </CardContent>
                </Card>
              </Panel>
              </PanelGroup>
            ) : (
              <Card data-testid="teacher-view-card">
              <CardHeader>
                <CardTitle>Solution Code</CardTitle>
                <CardDescription>This is your reference solution</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg font-mono text-sm overflow-auto max-h-[500px]">
                  {(assignment.problems && assignment.problems[0]?.solution_code) || assignment.solution_code || "No solution code available"}
                </pre>
              </CardContent>
              </Card>
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
      </main>
    </div>
  );
}
