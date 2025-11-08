import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Play, Code2, StickyNote } from "lucide-react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TeacherPractice({ user }) {
  const { problemId } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [testInput, setTestInput] = useState("");

  useEffect(() => {
    fetchProblem();
  }, [problemId]);

  const fetchProblem = async () => {
    try {
      const response = await axios.get(`${API}/problems`, {
        withCredentials: true,
      });
      const foundProblem = response.data.find(p => p.id === problemId);
      
      if (foundProblem) {
        setProblem(foundProblem);
        setCode(foundProblem.starter_code || "# Write your code here\n");
        
        // Load saved notes
        const savedNotes = localStorage.getItem(`teacher_notes_${problemId}`);
        if (savedNotes) {
          setNotes(savedNotes);
        }
      } else {
        toast.error("Problem not found");
        navigate("/library");
      }
    } catch (error) {
      console.error("Error fetching problem:", error);
      toast.error("Failed to load problem");
    } finally {
      setLoading(false);
    }
  };

  const handleRunCode = async () => {
    setRunning(true);
    setOutput("");
    
    try {
      const response = await axios.post(
        `${API}/code/execute`,
        {
          code: code,
          test_input: testInput,
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

  const handleSaveNotes = () => {
    setSavingNotes(true);
    localStorage.setItem(`teacher_notes_${problemId}`, notes);
    toast.success("Notes saved!");
    setTimeout(() => setSavingNotes(false), 500);
  };

  const handleShowSolution = () => {
    if (problem.solution_code) {
      setCode(problem.solution_code);
      toast.success("Solution loaded!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading practice environment...</div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Problem not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => navigate("/library")} 
                variant="ghost" 
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Library
              </Button>
              <div className="flex items-center space-x-2">
                <Code2 className="w-7 h-7 text-green-600" />
                <span className="text-xl font-bold text-gray-900">Practice: {problem.title}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 bg-green-100 px-3 py-1 rounded-full">Teacher Practice Mode</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-6">
        <PanelGroup direction="horizontal">
          {/* Left Side: Instructions & Notes */}
          <Panel defaultSize={30} minSize={20} maxSize={50}>
            <div className="space-y-6 pr-3">
              <Card>
                <CardHeader>
                  <CardTitle>Instructions</CardTitle>
                  <CardDescription>
                    {problem.difficulty} • {problem.category}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{problem.description}</p>
                </CardContent>
              </Card>

              {problem.expected_output && (
                <Card className="border-2 border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Expected Output</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="p-3 bg-white rounded border border-green-300 text-gray-800 text-sm font-mono whitespace-pre-wrap">
                      {problem.expected_output}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Teacher Notes Section */}
              <Card className="border-2 border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <StickyNote className="w-5 h-5 text-purple-600" />
                    Private Teacher Notes
                  </CardTitle>
                  <CardDescription>
                    Only you can see these notes (like PowerPoint presenter view)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="Add your teaching notes, tips, common mistakes to watch for, etc..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={8}
                    className="font-sans"
                  />
                  <Button 
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    size="sm"
                  >
                    {savingNotes ? "Saved!" : "Save Notes"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-indigo-400 transition-colors" />

          {/* Right Side: Code Editor & Output */}
          <Panel defaultSize={70} minSize={50}>
            <PanelGroup direction="vertical">
              {/* Code Editor */}
              <Panel defaultSize={60} minSize={30}>
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Code Editor</span>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleShowSolution}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          Show Solution
                        </Button>
                        <Button 
                          onClick={handleRunCode} 
                          disabled={running}
                          className="bg-green-600 hover:bg-green-700 gap-2"
                          size="sm"
                        >
                          <Play className="w-4 h-4" />
                          {running ? "Running..." : "Run Code"}
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-1">
                    <Editor
                      height="100%"
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
                        wordWrap: "on",
                        wrappingIndent: "indent",
                      }}
                    />
                  </CardContent>
                </Card>
              </Panel>

              <PanelResizeHandle className="h-2 bg-gray-200 hover:bg-indigo-400 transition-colors" />

              {/* Test Input & Output */}
              <Panel defaultSize={40} minSize={20}>
                <div className="h-full flex flex-col gap-3 p-3">
                  {/* Test Input Section */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Test Input (Optional)</CardTitle>
                      <CardDescription className="text-xs">
                        Enter input data for input() functions. Leave empty if no input needed.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Enter input data here (e.g., blue)"
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        rows={2}
                        className="font-mono text-sm"
                      />
                    </CardContent>
                  </Card>

                  {/* Output Window */}
                  <Card className="flex-1 flex flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Output</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                      <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg font-mono text-sm whitespace-pre-wrap min-h-[100px]">
                        {output || "Run your code to see output here..."}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </main>
    </div>
  );
}
