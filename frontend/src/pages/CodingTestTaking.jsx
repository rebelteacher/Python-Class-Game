import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Play, Send, AlertTriangle, Maximize, Trophy } from "lucide-react";
import Editor from "@monaco-editor/react";
import InteractiveInputCollector from "@/components/InteractiveInputCollector";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CodingTestTaking({ user }) {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [submittedProblemIds, setSubmittedProblemIds] = useState([]);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showInteractiveDialog, setShowInteractiveDialog] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [proctorCodeInput, setProctorCodeInput] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  
  const timerRef = useRef(null);
  
  const currentProblem = problems[currentProblemIndex];

  useEffect(() => {
    startTest();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      exitFullscreen();
    };
  }, [testId]);

  // Request fullscreen after test is loaded
  useEffect(() => {
    if (!loading && problems.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        requestFullscreen();
      }, 100);
    }
  }, [loading, problems]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && test && !submitting) {
        setTabSwitchCount(prev => prev + 1);
        toast.warning("⚠️ Tab switch detected! Please stay on this page.");
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement && test && !submitting && !showScoreModal) {
        // Lock the test if they exit fullscreen
        setIsLocked(true);
        toast.error("⚠️ Test locked! Enter proctor code to continue.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [test, submitting]);

  const requestFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.error("Fullscreen request failed:", err);
      });
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const startTest = async () => {
    try {
      const response = await axios.get(`${API}/coding-tests/${testId}/start`, {
        withCredentials: true
      });
      
      setTest(response.data.test);
      setProblems(response.data.problems || []);
      setSubmittedProblemIds(response.data.submitted_problem_ids || []);
      
      // Set initial code for first problem
      if (response.data.problems && response.data.problems.length > 0) {
        setCode(response.data.problems[0].starter_code || "# Write your code here\n");
      }
      
      setStartTime(Date.now());
      
      if (response.data.test.time_limit_minutes > 0) {
        setTimeRemaining(response.data.test.time_limit_minutes * 60);
        startTimer(response.data.test.time_limit_minutes * 60);
      }
    } catch (error) {
      console.error("Error starting test:", error);
      toast.error(error.response?.data?.detail || "Failed to start test");
      navigate("/my-tests");
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (seconds) => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRunCode = async (providedInput = null) => {
    const hasInputCalls = /input\s*\(/i.test(code);
    if (hasInputCalls && providedInput === null) {
      setShowInteractiveDialog(true);
      return;
    }

    setRunning(true);
    setOutput("");
    
    try {
      const response = await axios.post(
        `${API}/code/execute`,
        {
          code: code,
          test_input: providedInput || ""
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        setOutput(response.data.output || "(no output)");
      } else {
        setOutput(`Error:\n${response.data.error}`);
      }
    } catch (error) {
      console.error("Error running code:", error);
      setOutput(`Execution failed: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleInteractiveInputSubmit = (collectedInputs) => {
    setShowInteractiveDialog(false);
    handleRunCode(collectedInputs);
  };

  const handleVerifyProctorCode = async () => {
    if (!proctorCodeInput.trim()) {
      toast.error("Please enter the proctor code");
      return;
    }

    setVerifyingCode(true);
    try {
      console.log("Verifying code:", proctorCodeInput);
      const response = await axios.post(
        `${API}/coding-tests/${testId}/verify-proctor-code`,
        { proctor_code: proctorCodeInput.trim() },
        { withCredentials: true }
      );

      console.log("Verification response:", response.data);

      if (response.data.success) {
        setIsLocked(false);
        setProctorCodeInput("");
        toast.success("Code verified! Returning to fullscreen...");
        setTimeout(() => requestFullscreen(), 500);
      } else {
        toast.error("Invalid proctor code. Please ask your teacher.");
        setProctorCodeInput("");
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      toast.error(error.response?.data?.detail || "Failed to verify code");
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentProblem) return;
    
    const confirmSubmit = window.confirm(
      `⚠️ Are you sure you want to submit "${currentProblem.title}"? You can only submit once per problem.`
    );
    
    if (!confirmSubmit) return;

    setSubmitting(true);
    
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    
    try {
      await axios.post(
        `${API}/coding-tests/${testId}/submit`,
        {
          test_id: testId,
          problem_id: currentProblem.id,
          code: code,
          time_taken_seconds: timeTaken
        },
        { withCredentials: true }
      );
      
      toast.success(`Problem "${currentProblem.title}" submitted successfully!`);
      
      // Add to submitted list
      const newSubmittedIds = [...submittedProblemIds, currentProblem.id];
      setSubmittedProblemIds(newSubmittedIds);
      
      // Check if all problems are submitted
      if (newSubmittedIds.length >= problems.length) {
        // Fetch results and show modal
        exitFullscreen();
        const resultsResponse = await axios.get(`${API}/coding-tests/${testId}/result`, {
          withCredentials: true
        });
        setTestResults(resultsResponse.data);
        setShowScoreModal(true);
      } else {
        // Move to next problem
        const nextIndex = currentProblemIndex + 1;
        if (nextIndex < problems.length) {
          setCurrentProblemIndex(nextIndex);
          setCode(problems[nextIndex].starter_code || "# Write your code here\n");
          setOutput("");
        }
      }
    } catch (error) {
      console.error("Error submitting problem:", error);
      toast.error(error.response?.data?.detail || "Failed to submit problem");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    toast.warning("⏰ Time's up! Submitting automatically...");
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    
    try {
      await axios.post(
        `${API}/coding-tests/${testId}/submit`,
        {
          test_id: testId,
          code: code,
          time_taken_seconds: timeTaken
        },
        { withCredentials: true }
      );
      
      exitFullscreen();
      navigate(`/coding-test-result/${testId}`);
    } catch (error) {
      console.error("Error auto-submitting test:", error);
      toast.error("Failed to auto-submit test");
    }
  };

  const handleEditorMount = (editor, monaco) => {
    editor.onKeyDown((e) => {
      if ((e.ctrlKey || e.metaKey) && (e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88)) {
        e.preventDefault();
        toast.error("Copy-paste is disabled during the test");
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Loading test...</p>
      </div>
    );
  }

  // Show start screen if not in fullscreen yet
  if (!isFullscreen && !isLocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white flex items-center justify-center p-8">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{test?.title}</CardTitle>
            <CardDescription className="text-center text-lg">
              Ready to begin your coding test?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg text-gray-900">
              <h3 className="font-semibold mb-3 text-lg">Test Information:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="font-semibold">Problems:</span> {problems.length}
                </li>
                {timeRemaining && (
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-semibold">Time Limit:</span> {Math.floor(timeRemaining / 60)} minutes
                  </li>
                )}
              </ul>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
              <h3 className="font-semibold mb-2 text-yellow-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Important Rules:
              </h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Test will open in <strong>fullscreen mode</strong></li>
                <li>• Stay in fullscreen throughout the test</li>
                <li>• If you exit fullscreen, you'll need a proctor code to continue</li>
                <li>• Copy-paste is disabled</li>
                <li>• Tab switching is monitored</li>
                <li>• You can only submit each problem once</li>
              </ul>
            </div>

            <Button
              onClick={requestFullscreen}
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Test in Fullscreen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden relative">
      {/* Proctor Code Lock Screen */}
      {isLocked && (
        <div className="absolute inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                Test Locked
              </CardTitle>
              <CardDescription className="text-center">
                You exited fullscreen mode. Enter the proctor code to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Proctor Code
                </label>
                <input
                  type="text"
                  value={proctorCodeInput}
                  onChange={(e) => setProctorCodeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerifyProctorCode()}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-2 border rounded text-center text-2xl font-mono tracking-widest"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <Button
                onClick={handleVerifyProctorCode}
                disabled={verifyingCode || proctorCodeInput.length !== 6}
                className="w-full"
              >
                {verifyingCode ? "Verifying..." : "Verify Code"}
              </Button>
              <div className="space-y-2">
                <p className="text-xs text-center text-gray-500">
                  Ask your teacher for the proctor code to unlock the test.
                </p>
                <p className="text-xs text-center text-orange-600 font-medium">
                  ⚠️ Important: Close all other browser tabs (especially teacher login) before starting the test to avoid authentication conflicts.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Header with Timer */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-xl font-bold">{test?.title}</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-sm text-gray-400">
              Problem {currentProblemIndex + 1} of {problems.length}: {currentProblem?.title}
            </p>
            {submittedProblemIds.includes(currentProblem?.id) && (
              <span className="px-2 py-1 bg-green-600 text-xs rounded">Submitted</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {timeRemaining !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded ${
              timeRemaining < 300 ? 'bg-red-600' : 'bg-blue-600'
            }`}>
              <Clock className="w-5 h-5" />
              <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
            </div>
          )}
          
          {!isFullscreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={requestFullscreen}
              className="gap-2"
            >
              <Maximize className="w-4 h-4" />
              Enter Fullscreen
            </Button>
          )}
        </div>
      </div>

      {/* Tab Switch Warning */}
      {tabSwitchCount > 0 && (
        <Alert className="m-4 bg-yellow-900 border-yellow-700">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Tab switches detected: {tabSwitchCount}. Please stay focused on the test.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Instructions Panel */}
        <div className="w-1/3 bg-gray-800 p-6 overflow-y-auto border-r border-gray-700">
          {/* Problem Navigation */}
          <div className="mb-4 flex gap-2 flex-wrap">
            {problems.map((prob, idx) => (
              <button
                key={prob.id}
                onClick={() => {
                  setCurrentProblemIndex(idx);
                  setCode(prob.starter_code || "# Write your code here\n");
                  setOutput("");
                }}
                className={`px-3 py-1 rounded text-sm ${
                  idx === currentProblemIndex
                    ? 'bg-blue-600 text-white'
                    : submittedProblemIds.includes(prob.id)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                disabled={submitting}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <h2 className="text-lg font-bold mb-4">Instructions</h2>
          {currentProblem && (
            <div className="prose prose-invert text-sm">
              <p className="whitespace-pre-wrap">{currentProblem.description}</p>
              
              {currentProblem.expected_output && (
                <div className="mt-4 p-3 bg-gray-900 rounded">
                  <p className="font-semibold mb-2">Expected Output:</p>
                  <pre className="text-green-400">{currentProblem.expected_output}</pre>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-blue-900 rounded">
                <p className="font-semibold mb-2">Test Rules:</p>
                <ul className="text-xs space-y-1">
                  <li>✓ Stay in fullscreen mode</li>
                  <li>✓ Do not switch tabs or windows</li>
                  <li>✓ Copy-paste is disabled</li>
                  <li>✓ You can only submit once per problem</li>
                  <li>✓ Click "Run" to test your code before submitting</li>
                  <li>✓ Navigate between problems using numbered buttons</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Code Editor Panel */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 border-b border-gray-700">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>

          {/* Output Panel */}
          <div className="h-1/4 bg-gray-950 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold mb-2">Output:</h3>
            <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
              {output || "Run your code to see output here..."}
            </pre>
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-800 p-4 flex gap-4">
            <Button
              onClick={() => handleRunCode()}
              disabled={running}
              className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
            >
              <Play className="w-4 h-4" />
              {running ? "Running..." : "Run Code"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || submittedProblemIds.includes(currentProblem?.id)}
              className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
            >
              <Send className="w-4 h-4" />
              {submittedProblemIds.includes(currentProblem?.id)
                ? "Already Submitted"
                : submitting
                ? "Submitting..."
                : `Submit Problem ${currentProblemIndex + 1}`}
            </Button>
          </div>
        </div>
      </div>

      {/* Interactive Input Dialog */}
      <InteractiveInputCollector
        isOpen={showInteractiveDialog}
        onClose={() => setShowInteractiveDialog(false)}
        onSubmitInputs={handleInteractiveInputSubmit}
        codePreview={code}
      />

      {/* Score Modal */}
      <Dialog open={showScoreModal} onOpenChange={setShowScoreModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Test Complete! 🎉</DialogTitle>
            <DialogDescription>
              Here are your results for all problems
            </DialogDescription>
          </DialogHeader>

          {testResults && (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2">
                <p className="text-sm text-gray-600 mb-2">Overall Score</p>
                <p className={`text-6xl font-bold ${
                  testResults.overall_score >= 90 ? 'text-green-600' :
                  testResults.overall_score >= 70 ? 'text-blue-600' :
                  testResults.overall_score >= 50 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {Math.round(testResults.overall_score)}%
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {testResults.total_problems} {testResults.total_problems === 1 ? 'Problem' : 'Problems'} Completed
                </p>
              </div>

              {/* Individual Problem Scores */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Problem Breakdown:</h3>
                {testResults.submissions?.map((submission, index) => (
                  <div key={submission.problem_id} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Problem {index + 1}</span>
                      <span className={`text-xl font-bold ${
                        submission.score >= 90 ? 'text-green-600' :
                        submission.score >= 70 ? 'text-blue-600' :
                        submission.score >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {Math.round(submission.score)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                      {submission.feedback}
                    </p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowScoreModal(false);
                    navigate("/my-tests");
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Done
                </Button>
                <Button
                  onClick={() => navigate(`/coding-test-result/${testId}`)}
                  variant="outline"
                  className="flex-1"
                >
                  View Full Results
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
