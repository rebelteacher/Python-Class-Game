import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EXAMPLE_CODE = `import turtle

# Create a turtle
t = turtle.Turtle()
t.speed(2)

# Draw a square
for i in range(4):
    t.forward(100)
    t.right(90)

# Hide the turtle
t.hideturtle()
`;

export default function TurtleViewer({ initialCode = EXAMPLE_CODE, onCodeChange }) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState("");
  const [imageData, setImageData] = useState(null);
  const [running, setRunning] = useState(false);

  const handleCodeChange = (value) => {
    setCode(value || "");
    if (onCodeChange) {
      onCodeChange(value || "");
    }
  };

  const runTurtleCode = async () => {
    setRunning(true);
    setOutput("");
    setImageData(null);

    try {
      const response = await axios.post(
        `${API}/code/execute-turtle`,
        {
          code: code,
          test_input: ""
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setImageData(response.data.image_data);
        if (response.data.output) {
          setOutput(response.data.output);
        }
        toast.success("Turtle graphics rendered!");
      } else {
        setOutput(response.data.error || "Execution failed");
        toast.error("Failed to run turtle code");
      }
    } catch (error) {
      console.error("Error running turtle code:", error);
      setOutput(`Error: ${error.message}`);
      toast.error("Failed to execute turtle code");
    } finally {
      setRunning(false);
    }
  };

  const downloadImage = () => {
    if (!imageData) {
      toast.error("No image to download");
      return;
    }

    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageData}`;
    link.download = 'turtle_graphics.png';
    link.click();
    toast.success("Image downloaded!");
  };

  const resetCode = () => {
    setCode(EXAMPLE_CODE);
    setOutput("");
    setImageData(null);
    if (onCodeChange) {
      onCodeChange(EXAMPLE_CODE);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* Code Editor */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Python Code</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={resetCode}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </Button>
              <Button
                onClick={runTurtleCode}
                disabled={running}
                className="bg-green-600 hover:bg-green-700 gap-1"
                size="sm"
              >
                <Play className="w-3 h-3" />
                {running ? "Running..." : "Run"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            onChange={handleCodeChange}
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

      {/* Canvas Output */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Turtle Canvas</CardTitle>
            {imageData && (
              <Button
                onClick={downloadImage}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <Download className="w-3 h-3" />
                Download
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          {imageData ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed overflow-auto">
              <img
                src={`data:image/png;base64,${imageData}`}
                alt="Turtle Graphics Output"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed">
              <div className="text-center text-gray-500">
                <p className="text-lg font-semibold mb-2">🐢 Turtle Canvas</p>
                <p className="text-sm">Click "Run" to see your turtle graphics</p>
              </div>
            </div>
          )}
          
          {/* Output Text */}
          {output && (
            <div className="mt-3 p-3 bg-gray-900 rounded text-sm">
              <p className="text-white font-mono whitespace-pre-wrap">{output}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
