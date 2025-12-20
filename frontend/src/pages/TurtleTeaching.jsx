import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  RotateCcw,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from "lucide-react";
import Editor from "@monaco-editor/react";
import AnimatedTurtle from "@/components/AnimatedTurtle";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

// Teaching examples organized by concept
const TEACHING_EXAMPLES = {
  basics: {
    title: "🐢 First Steps",
    lessons: [
      {
        id: "forward",
        title: "Moving Forward",
        description: "The turtle starts in the center, facing right. forward(100) moves it 100 pixels.",
        code: `import turtle

t = turtle.Turtle()

# Move forward 100 pixels
t.forward(100)

t.hideturtle()`,
        concepts: ["forward()", "distance in pixels"]
      },
      {
        id: "backward",
        title: "Moving Backward",
        description: "backward() moves the turtle in the opposite direction without turning.",
        code: `import turtle

t = turtle.Turtle()

t.forward(100)
t.backward(50)

t.hideturtle()`,
        concepts: ["backward()", "relative movement"]
      },
      {
        id: "turning",
        title: "Turning Right & Left",
        description: "right(90) turns 90 degrees clockwise. left(90) turns counter-clockwise.",
        code: `import turtle

t = turtle.Turtle()

t.forward(100)
t.right(90)    # Turn right 90 degrees
t.forward(100)

t.hideturtle()`,
        concepts: ["right()", "left()", "degrees"]
      },
      {
        id: "square",
        title: "Drawing a Square",
        description: "Combine forward and turn to draw a square. Each corner is a 90° turn.",
        code: `import turtle

t = turtle.Turtle()

# Draw a square manually
t.forward(100)
t.right(90)
t.forward(100)
t.right(90)
t.forward(100)
t.right(90)
t.forward(100)

t.hideturtle()`,
        concepts: ["combining commands", "closed shapes"]
      }
    ]
  },
  loops: {
    title: "🔁 Loops",
    lessons: [
      {
        id: "for_basic",
        title: "For Loop Basics",
        description: "for i in range(4) repeats code 4 times. Perfect for shapes!",
        code: `import turtle

t = turtle.Turtle()

# This is much better than repeating!
for i in range(4):
    t.forward(100)
    t.right(90)

t.hideturtle()`,
        concepts: ["for loop", "range()", "repetition"]
      },
      {
        id: "triangle",
        title: "Triangle with Loop",
        description: "Triangle has 3 sides. The turning angle is 360÷3 = 120°",
        code: `import turtle

t = turtle.Turtle()

# Triangle: 3 sides, 120 degree turns
for i in range(3):
    t.forward(100)
    t.left(120)

t.hideturtle()`,
        concepts: ["angle calculation", "360 / sides"]
      },
      {
        id: "polygon",
        title: "Any Polygon",
        description: "Use a variable for sides and calculate the angle: 360 / sides",
        code: `import turtle

t = turtle.Turtle()

sides = 6  # Try changing this!
angle = 360 / sides

for i in range(sides):
    t.forward(50)
    t.right(angle)

t.hideturtle()`,
        concepts: ["variables in loops", "formula: 360/n"]
      },
      {
        id: "spiral",
        title: "Spiral Pattern",
        description: "Increase the distance each time to create a spiral effect.",
        code: `import turtle

t = turtle.Turtle()
t.speed(0)

for i in range(50):
    t.forward(i * 5)  # Gets bigger each time!
    t.right(90)

t.hideturtle()`,
        concepts: ["changing values", "i * multiplier"]
      }
    ]
  },
  colors: {
    title: "🎨 Colors",
    lessons: [
      {
        id: "pencolor",
        title: "Pen Color",
        description: "pencolor() changes the line color. Use color names like 'red', 'blue'.",
        code: `import turtle

t = turtle.Turtle()

t.pencolor('red')
t.forward(100)
t.right(90)

t.pencolor('blue')
t.forward(100)

t.hideturtle()`,
        concepts: ["pencolor()", "color names"]
      },
      {
        id: "fillcolor",
        title: "Fill Shapes",
        description: "Use begin_fill() before and end_fill() after to fill a shape.",
        code: `import turtle

t = turtle.Turtle()

t.fillcolor('yellow')
t.begin_fill()

for i in range(4):
    t.forward(100)
    t.right(90)

t.end_fill()
t.hideturtle()`,
        concepts: ["fillcolor()", "begin_fill()", "end_fill()"]
      },
      {
        id: "rainbow",
        title: "Rainbow Colors",
        description: "Use a list of colors and cycle through them with % operator.",
        code: `import turtle

t = turtle.Turtle()
t.speed(0)

colors = ['red', 'orange', 'yellow', 
          'green', 'blue', 'purple']

for i in range(36):
    t.pencolor(colors[i % 6])
    t.forward(i * 5)
    t.right(60)

t.hideturtle()`,
        concepts: ["color list", "% modulo", "cycling"]
      },
      {
        id: "pensize",
        title: "Pen Size",
        description: "pensize() changes line thickness. Higher number = thicker line.",
        code: `import turtle

t = turtle.Turtle()

for i in range(1, 6):
    t.pensize(i * 2)
    t.forward(50)
    t.right(90)

t.hideturtle()`,
        concepts: ["pensize()", "line thickness"]
      }
    ]
  },
  conditionals: {
    title: "🔀 Conditionals",
    lessons: [
      {
        id: "if_basic",
        title: "If Statement",
        description: "if checks a condition. Only runs the indented code if True.",
        code: `import turtle

t = turtle.Turtle()
t.speed(0)

for i in range(360):
    if t.xcor() > 0:  # If on right side
        t.pencolor('red')
    t.forward(1)
    t.right(1)

t.hideturtle()`,
        concepts: ["if statement", "condition", "xcor()"]
      },
      {
        id: "if_else",
        title: "If-Else",
        description: "else runs when the if condition is False.",
        code: `import turtle

t = turtle.Turtle()
t.speed(0)

for i in range(360):
    if t.ycor() > 0:  # If in top half
        t.pencolor('blue')
    else:
        t.pencolor('red')
    t.forward(1)
    t.right(1)

t.hideturtle()`,
        concepts: ["if-else", "alternative path"]
      },
      {
        id: "elif",
        title: "Multiple Conditions (elif)",
        description: "elif checks additional conditions after if.",
        code: `import turtle

t = turtle.Turtle()
t.speed(0)
t.pensize(3)

for i in range(360):
    if i < 90:
        t.pencolor('red')
    elif i < 180:
        t.pencolor('green')
    elif i < 270:
        t.pencolor('blue')
    else:
        t.pencolor('purple')
    t.forward(1)
    t.right(1)

t.hideturtle()`,
        concepts: ["elif", "multiple conditions"]
      },
      {
        id: "modulo",
        title: "Alternating with %",
        description: "i % 2 == 0 checks if i is even. Great for alternating patterns!",
        code: `import turtle

t = turtle.Turtle()
t.speed(0)

for i in range(12):
    if i % 2 == 0:
        t.fillcolor('black')
        t.begin_fill()
    
    for j in range(4):
        t.forward(40)
        t.right(90)
    
    if i % 2 == 0:
        t.end_fill()
    
    t.penup()
    t.forward(50)
    t.pendown()

t.hideturtle()`,
        concepts: ["% modulo", "even/odd check"]
      }
    ]
  },
  functions: {
    title: "📦 Functions",
    lessons: [
      {
        id: "def_basic",
        title: "Defining Functions",
        description: "def creates a reusable block of code. Call it by name().",
        code: `import turtle

t = turtle.Turtle()

# Define a function
def draw_square():
    for i in range(4):
        t.forward(50)
        t.right(90)

# Call it multiple times!
draw_square()
t.penup()
t.forward(70)
t.pendown()
draw_square()

t.hideturtle()`,
        concepts: ["def", "function definition", "calling functions"]
      },
      {
        id: "parameters",
        title: "Parameters",
        description: "Parameters make functions flexible. Pass values when calling.",
        code: `import turtle

t = turtle.Turtle()

def draw_square(size):
    for i in range(4):
        t.forward(size)
        t.right(90)

# Different sizes!
draw_square(30)
t.penup()
t.forward(50)
t.pendown()
draw_square(60)
t.penup()
t.forward(80)
t.pendown()
draw_square(90)

t.hideturtle()`,
        concepts: ["parameters", "arguments", "flexibility"]
      },
      {
        id: "multi_params",
        title: "Multiple Parameters",
        description: "Functions can have multiple parameters separated by commas.",
        code: `import turtle

t = turtle.Turtle()

def draw_square(size, color):
    t.fillcolor(color)
    t.begin_fill()
    for i in range(4):
        t.forward(size)
        t.right(90)
    t.end_fill()

draw_square(50, 'red')
t.penup()
t.forward(70)
t.pendown()
draw_square(50, 'blue')
t.penup()
t.forward(70)
t.pendown()
draw_square(50, 'green')

t.hideturtle()`,
        concepts: ["multiple parameters", "customization"]
      },
      {
        id: "composition",
        title: "Function Composition",
        description: "Functions can call other functions to build complex drawings.",
        code: `import turtle

t = turtle.Turtle()
t.speed(0)

def draw_square(size):
    for i in range(4):
        t.forward(size)
        t.right(90)

def draw_flower():
    for i in range(6):
        draw_square(50)
        t.right(60)

draw_flower()

t.hideturtle()`,
        concepts: ["composition", "building blocks"]
      }
    ]
  }
};

export default function TurtleTeaching({ user }) {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState("basics");
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [code, setCode] = useState("");
  const [highlightedLine, setHighlightedLine] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);

  const currentTopic = TEACHING_EXAMPLES[selectedTopic];
  const currentLesson = currentTopic.lessons[currentLessonIndex];

  const lessonCode = currentLesson?.code || "";
  useEffect(() => {
    // Load the code for current lesson
    setCode(lessonCode);
    setHighlightedLine(-1);
  }, [lessonCode]);

  // Handle line highlighting from AnimatedTurtle
  const handleLineHighlight = useCallback((lineNum) => {
    setHighlightedLine(lineNum);
    
    if (editorRef.current && lineNum >= 0) {
      const editor = editorRef.current;
      const monaco = window.monaco;
      
      // Clear previous decorations
      if (decorationsRef.current.length > 0) {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      }
      
      // Add new highlight (lineNum is 0-indexed, Monaco is 1-indexed)
      const monacoLine = lineNum + 1;
      decorationsRef.current = editor.deltaDecorations([], [
        {
          range: new monaco.Range(monacoLine, 1, monacoLine, 1),
          options: {
            isWholeLine: true,
            className: 'highlighted-line',
            glyphMarginClassName: 'highlighted-glyph'
          }
        }
      ]);
      
      // Scroll to the line
      editor.revealLineInCenter(monacoLine);
    } else if (editorRef.current && lineNum < 0) {
      // Clear highlights when done
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
  }, []);

  const resetCode = () => {
    setCode(currentLesson.code);
    setHighlightedLine(-1);
    if (editorRef.current && decorationsRef.current.length > 0) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
  };

  const nextLesson = () => {
    if (currentLessonIndex < currentTopic.lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  const prevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Add CSS for line highlighting
    const style = document.createElement('style');
    style.textContent = `
      .highlighted-line {
        background-color: rgba(34, 197, 94, 0.3) !important;
        border-left: 3px solid #22c55e !important;
      }
      .highlighted-glyph {
        background-color: #22c55e;
        margin-left: 3px;
      }
    `;
    document.head.appendChild(style);
  };

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 py-3 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/turtle-curriculum")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              <span className="font-bold">Teaching Mode</span>
              <span className="text-green-200">| {currentTopic.title}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedTopic} onValueChange={(v) => { setSelectedTopic(v); setCurrentLessonIndex(0); }}>
              <SelectTrigger className="w-40 bg-white/10 border-white/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TEACHING_EXAMPLES).map(([key, topic]) => (
                  <SelectItem key={key} value={key}>{topic.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-white hover:bg-white/20"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content with Resizable Panels */}
      <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-52px)]">
        {/* Left: Code Editor */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col border-r border-gray-700">
            {/* Lesson Info */}
            <div className="p-4 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-green-400">{currentLesson.title}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>{currentLessonIndex + 1} / {currentTopic.lessons.length}</span>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-2">{currentLesson.description}</p>
              <div className="flex gap-2 flex-wrap">
                {currentLesson.concepts.map((concept, i) => (
                  <span key={i} className="px-2 py-0.5 bg-green-900/50 text-green-300 rounded text-xs">
                    {concept}
                  </span>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
                value={code}
                onChange={setCode}
                onMount={handleEditorMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 16,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  glyphMargin: true,
                }}
              />
            </div>

            {/* Controls */}
            <div className="p-3 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  onClick={prevLesson}
                  disabled={currentLessonIndex === 0}
                  variant="outline"
                  size="sm"
                  className="bg-gray-700 border-gray-600 hover:bg-gray-600"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  onClick={nextLesson}
                  disabled={currentLessonIndex === currentTopic.lessons.length - 1}
                  variant="outline"
                  size="sm"
                  className="bg-gray-700 border-gray-600 hover:bg-gray-600"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              <Button
                onClick={resetCode}
                variant="outline"
                size="sm"
                className="bg-gray-700 border-gray-600 hover:bg-gray-600"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset Code
              </Button>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-gray-700" />

        {/* Right: Animated Turtle Output */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-gray-950">
            <div className="p-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
              <span className="font-medium text-green-400">🐢 Animated Turtle</span>
              <span className="text-xs text-gray-400">
                {highlightedLine >= 0 ? `Line ${highlightedLine + 1} executing...` : 'Press Play to animate'}
              </span>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-4">
              <AnimatedTurtle 
                code={code} 
                onLineHighlight={handleLineHighlight}
                width={450}
                height={450}
              />
            </div>

            {/* Quick Reference */}
            <div className="p-4 bg-gray-800 border-t border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Quick Reference</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-500">
                  <code className="text-green-400">forward(n)</code> - move forward
                </div>
                <div className="text-gray-500">
                  <code className="text-green-400">backward(n)</code> - move back
                </div>
                <div className="text-gray-500">
                  <code className="text-green-400">right(°)</code> - turn right
                </div>
                <div className="text-gray-500">
                  <code className="text-green-400">left(°)</code> - turn left
                </div>
                <div className="text-gray-500">
                  <code className="text-green-400">pencolor(c)</code> - line color
                </div>
                <div className="text-gray-500">
                  <code className="text-green-400">fillcolor(c)</code> - fill color
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
