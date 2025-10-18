import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [hasRun, setHasRun] = useState(false);
  const [livesRemaining, setLivesRemaining] = useState(3);
  const [isLockedOut, setIsLockedOut] = useState(false);

  useEffect(() => {
    fetchAssignment();
    fetchSubmissions();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      const response = await axios.get(`${API}/assignments/${assignmentId}`, {
        withCredentials: true,
      });
      setAssignment(response.data);
      setCode(response.data.starter_code || "# Write your code here\n");
    } catch (error) {
      console.error("Error fetching assignment:", error);
      toast.error("Failed to load assignment");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await axios.get(`${API}/submissions/assignment/${assignmentId}`, {
        withCredentials: true,
      });
      setSubmissions(response.data);
      
      // Calculate lives remaining for students
      if (user.role === "student") {
        if (response.data.length === 0) {
          // No submissions yet - start with 3 lives
          setLivesRemaining(3);
          setIsLockedOut(false);
        } else {
          const lastSubmission = response.data[response.data.length - 1];
          const lives = lastSubmission.lives_remaining !== undefined ? lastSubmission.lives_remaining : 3;
          setLivesRemaining(lives);
          setIsLockedOut(lives <= 0);
        }
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const handleRunCode = async () => {
    setRunning(true);
    setOutput("");
    setHasRun(true);
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
    
    if (isLockedOut) {
      toast.error("You've used all 3 lives on this assignment. No more submissions allowed.");
      return;
    }

    if (!code.trim()) {
      toast.error("Please write some code before submitting");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API}/submissions`,
        {
          assignment_id: assignmentId,
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
      
      setLivesRemaining(newLivesRemaining);
      setIsLockedOut(newLivesRemaining <= 0);
      
      if (rankUp) {
        toast.success(`🎉 RANK UP! You're now a ${newRank}!`, { duration: 5000 });
      }
      
      if (isPassing) {
        toast.success(
          `✅ Great job! Score: ${response.data.score.toFixed(1)}% | +${xpEarned} XP | +${coinsEarned} 🪙`,
          { duration: 4000 }
        );
      } else if (newLivesRemaining > 0) {
        toast.warning(`Score: ${response.data.score.toFixed(1)}% - ${newLivesRemaining} ${newLivesRemaining === 1 ? 'life' : 'lives'} remaining`);
      } else {
        toast.error(`Score: ${response.data.score.toFixed(1)}% - No lives remaining. Assignment locked.`);
      }
      
      setHasRun(false);
      fetchSubmissions();
    } catch (error) {
      console.error("Error submitting assignment:", error);
      if (error.response?.status === 403) {
        toast.error(error.response.data.detail || "Submission not allowed");
        setIsLockedOut(true);
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
              data-testid="back-to-classroom-btn" 
              onClick={() => navigate(`/classroom/${assignment.classroom_id}`)} 
              variant="ghost" 
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Classroom
            </Button>
            <div className="flex items-center space-x-2">
              <Code2 className="w-7 h-7 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">{assignment.title}</span>
            </div>
          </div>
        </div>
      </nav>

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
                  <p className="text-gray-700 whitespace-pre-wrap">{assignment.description || "No description provided."}</p>
                </CardContent>
              </Card>

              <Card data-testid="test-cases-card">
                <CardHeader>
                  <CardTitle>Test Cases</CardTitle>
                  <CardDescription>Your code will be tested against these cases</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assignment.test_cases?.map((testCase, index) => (
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
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600">Lives:</span>
                          {isLockedOut ? (
                            <span className="text-red-600 font-semibold">🚫 Locked</span>
                          ) : (
                            <span>
                              {Array.from({ length: livesRemaining }).map((_, i) => (
                                <span key={i} className="text-red-500">❤️</span>
                              ))}
                              {Array.from({ length: 3 - livesRemaining }).map((_, i) => (
                                <span key={i} className="text-gray-300">🤍</span>
                              ))}
                            </span>
                          )}
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
                          disabled={submitting || isLockedOut || !hasRun}
                          className="bg-indigo-600 hover:bg-indigo-700 gap-2 flex-1"
                          size="sm"
                        >
                          <Send className="w-4 h-4" />
                          {submitting ? "Submitting..." : isLockedOut ? "Locked" : !hasRun ? "Run First" : "Submit"}
                        </Button>
                      </div>
                      {!hasRun && !isLockedOut && (
                        <p className="text-xs text-amber-600">⚠️ You must run your code before submitting</p>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Editor
                      height="600px"
                      defaultLanguage="python"
                      value={code}
                      onChange={(value) => setCode(value || "")}
                      theme="vs-light"
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
              <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-indigo-400 transition-colors rounded-full cursor-col-resize" />

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
                  {assignment.solution_code}
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
        </PanelGroup>
      </main>
    </div>
  );
}
