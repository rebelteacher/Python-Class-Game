import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Play, Code2, Trash2, Moon, Sun, Keyboard } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import InteractiveInputCollector from "@/components/InteractiveInputCollector";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function StudentSandbox({ user }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("# Write your Python code here\nprint('Hello, World!')");
  const [testInput, setTestInput] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('sandboxDarkMode');
    return saved === 'true';
  });
  const [showInteractiveDialog, setShowInteractiveDialog] = useState(false);

  const handleRunCode = async (providedInput = null) => {
    if (!code.trim()) {
      toast.error("Please write some code first!");
      return;
    }

    // Check if code contains input() calls and no input provided yet
    const hasInputCalls = /input\s*\(/i.test(code);
    if (hasInputCalls && !testInput && providedInput === null) {
      // Show interactive dialog
      setShowInteractiveDialog(true);
      return;
    }

    setRunning(true);
    setOutput("Running code...");

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

      if (response.data.output) {
        setOutput(response.data.output);
      } else if (response.data.error) {
        setOutput(`Error:\n${response.data.error}`);
      } else {
        setOutput("Code ran successfully with no output.");
      }
    } catch (error) {
      console.error("Error running code:", error);
      setOutput(`Error: ${error.response?.data?.detail || error.message}`);
      toast.error("Failed to run code");
    } finally {
      setRunning(false);
    }
  };

  const handleInteractiveInputSubmit = (collectedInputs) => {
    handleRunCode(collectedInputs);
  };

  const handleClearCode = () => {
    setCode("# Write your Python code here\n");
    setOutput("");
    setTestInput("");
    toast.success("Sandbox cleared!");
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('sandboxDarkMode', newMode);
  };

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/student/dashboard")}
              variant="outline"
              size="sm"
              className="gap-2 border-white/30 text-white hover:bg-cyber-navy/60/20 bg-cyber-navy/60/10"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Code2 className="w-6 h-6" />
              <h1 className="text-2xl font-bold">Free-Style Coding Sandbox</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={toggleDarkMode}
              variant="outline"
              size="sm"
              className="gap-2 border-white/30 text-white hover:bg-cyber-navy/60/20 bg-cyber-navy/60/10"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {darkMode ? "Light" : "Dark"}
            </Button>
            <Button
              onClick={handleClearCode}
              variant="outline"
              size="sm"
              className="gap-2 border-white/30 text-white hover:bg-cyber-navy/60/20 bg-cyber-navy/60/10"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
            <Button
              onClick={() => handleRunCode()}
              disabled={running}
              size="sm"
              className="gap-2 bg-cyber-navy/60 text-purple-600 hover:bg-cyber-navy/30"
            >
              <Play className="w-4 h-4" />
              {running ? "Running..." : "Run Code"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Info Banner */}
          <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Code2 className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-lg font-semibold text-purple-900 mb-2">
                    Practice Python Coding - No Limits!
                  </h2>
                  <p className="text-sm text-purple-700">
                    This is your personal coding playground. Write any Python code you want, test your ideas, 
                    and experiment freely. Your code won't be graded or saved - this is just for practice and fun! 🚀
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editor and Output Layout */}
          <div className="h-[calc(100vh-240px)]">
            <PanelGroup direction="horizontal">
              {/* Code Editor - Left */}
              <Panel defaultSize={55} minSize={40}>
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Python Code Editor</span>
                      <span className="text-sm font-normal text-slate-500">
                        {darkMode ? "🌙 Dark Mode" : "☀️ Light Mode"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-80px)]">
                    <Editor
                      height="100%"
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
                        wordWrap: "on",
                        wrappingIndent: "indent",
                      }}
                    />
                  </CardContent>
                </Card>
              </Panel>

              {/* Resize Handle */}
              <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-purple-500 transition-colors cursor-col-resize mx-2" />

              {/* Output - Right - Full Space */}
              <Panel defaultSize={45} minSize={35}>
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-2 pt-3 flex-shrink-0">
                    <CardTitle className="text-lg">Output</CardTitle>
                    <CardDescription className="text-xs">
                      Code with input() will show interactive dialog automatically
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto min-h-0">
                    <pre className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm whitespace-pre-wrap h-full">
                      {output || "Run your code to see output here... 🎯"}
                    </pre>
                  </CardContent>
                </Card>
              </Panel>
            </PanelGroup>
          </div>

          {/* Quick Tips */}
          <Card className="mt-6 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="pt-3 pb-3">
              <h3 className="font-semibold text-blue-900 mb-1 text-sm">💡 Quick Tips:</h3>
              <ul className="text-xs text-blue-700 space-y-0.5">
                <li>• <strong>NEW!</strong> Code with <code className="bg-blue-100 px-1 rounded">input()</code> shows an interactive dialog</li>
                <li>• Toggle light/dark theme • Press <strong>Clear</strong> to reset</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interactive Input Dialog */}
      <InteractiveInputCollector
        isOpen={showInteractiveDialog}
        onClose={() => setShowInteractiveDialog(false)}
        onSubmitInputs={handleInteractiveInputSubmit}
        codePreview={code}
      />
    </div>
  );
}
