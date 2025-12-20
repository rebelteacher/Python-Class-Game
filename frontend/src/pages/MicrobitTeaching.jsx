import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Play, 
  RotateCcw,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Cpu,
  Lightbulb
} from "lucide-react";
import Editor from "@monaco-editor/react";
import MicrobitSimulator from "@/components/MicrobitSimulator";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

// Teaching examples organized by concept
const TEACHING_EXAMPLES = {
  display: {
    title: "💡 LED Display",
    lessons: [
      {
        id: "show_image",
        title: "Display an Image",
        description: "Use display.show() with built-in images like HEART, HAPPY, SAD.",
        code: `from microbit import *

# Show a heart on the LED display
display.show(Image.HEART)
`,
        concepts: ["display.show()", "Image.HEART", "built-in images"]
      },
      {
        id: "show_text",
        title: "Display Text",
        description: "Use display.scroll() to show scrolling text across the LEDs.",
        code: `from microbit import *

# Scroll text across the display
display.scroll("Hello!")
`,
        concepts: ["display.scroll()", "text output"]
      },
      {
        id: "set_pixel",
        title: "Control Individual LEDs",
        description: "Use display.set_pixel(x, y, brightness) to light up specific LEDs.",
        code: `from microbit import *

# Light up individual pixels
# set_pixel(x, y, brightness)
# x: column (0-4), y: row (0-4)
# brightness: 0-9

display.set_pixel(2, 2, 9)  # Center LED
display.set_pixel(0, 0, 5)  # Top-left (dimmer)
display.set_pixel(4, 4, 9)  # Bottom-right
`,
        concepts: ["display.set_pixel()", "x, y coordinates", "brightness 0-9"]
      },
      {
        id: "animation",
        title: "Simple Animation",
        description: "Create animations by showing images with sleep() delays.",
        code: `from microbit import *

while True:
    display.show(Image.HEART)
    sleep(500)
    display.show(Image.HEART_SMALL)
    sleep(500)
`,
        concepts: ["while True:", "sleep()", "animation loop"]
      }
    ]
  },
  buttons: {
    title: "🔘 Buttons",
    lessons: [
      {
        id: "button_check",
        title: "Check Button Press",
        description: "Use button_a.is_pressed() to check if a button is currently pressed.",
        code: `from microbit import *

while True:
    if button_a.is_pressed():
        display.show(Image.HAPPY)
    else:
        display.show(Image.SAD)
`,
        concepts: ["button_a.is_pressed()", "if statement"]
      },
      {
        id: "both_buttons",
        title: "Both Buttons",
        description: "React differently to button A, button B, or both.",
        code: `from microbit import *

while True:
    if button_a.is_pressed() and button_b.is_pressed():
        display.show(Image.SURPRISED)
    elif button_a.is_pressed():
        display.show("A")
    elif button_b.is_pressed():
        display.show("B")
    else:
        display.clear()
`,
        concepts: ["button_a", "button_b", "and operator", "elif"]
      },
      {
        id: "button_counter",
        title: "Button Counter",
        description: "Count button presses and display the count.",
        code: `from microbit import *

count = 0

while True:
    if button_a.is_pressed():
        count = count + 1
        display.show(count)
        sleep(300)  # Debounce
    if button_b.is_pressed():
        count = 0
        display.show(count)
        sleep(300)
`,
        concepts: ["variables", "counter", "debouncing"]
      },
      {
        id: "button_game",
        title: "Reaction Game",
        description: "A simple reaction time game using buttons.",
        code: `from microbit import *
import random

while True:
    display.show(Image.ASLEEP)
    sleep(random.randint(1000, 3000))
    display.show(Image.SURPRISED)
    
    if button_a.is_pressed():
        display.scroll("WIN!")
    else:
        sleep(1000)
        display.scroll("Slow!")
`,
        concepts: ["random", "game logic", "timing"]
      }
    ]
  },
  loops: {
    title: "🔁 Loops",
    lessons: [
      {
        id: "while_true",
        title: "Forever Loop",
        description: "Use while True: to run code forever.",
        code: `from microbit import *

while True:
    display.show(Image.HEART)
    sleep(1000)
    display.clear()
    sleep(1000)
`,
        concepts: ["while True:", "forever loop"]
      },
      {
        id: "for_loop",
        title: "For Loop with Range",
        description: "Use for loops to repeat actions a specific number of times.",
        code: `from microbit import *

# Count from 0 to 9
for i in range(10):
    display.show(i)
    sleep(500)

display.scroll("Done!")
`,
        concepts: ["for i in range()", "counting"]
      },
      {
        id: "loop_brightness",
        title: "Brightness Loop",
        description: "Use a loop to fade an LED in and out.",
        code: `from microbit import *

while True:
    # Fade in
    for brightness in range(10):
        display.set_pixel(2, 2, brightness)
        sleep(100)
    
    # Fade out
    for brightness in range(9, -1, -1):
        display.set_pixel(2, 2, brightness)
        sleep(100)
`,
        concepts: ["nested loops", "range with step", "fading"]
      },
      {
        id: "loop_patterns",
        title: "Pattern Loop",
        description: "Loop through a list of images to create patterns.",
        code: `from microbit import *

images = [
    Image.ARROW_N,
    Image.ARROW_E,
    Image.ARROW_S,
    Image.ARROW_W
]

while True:
    for image in images:
        display.show(image)
        sleep(200)
`,
        concepts: ["lists", "for item in list", "image arrays"]
      }
    ]
  },
  variables: {
    title: "📦 Variables",
    lessons: [
      {
        id: "var_intro",
        title: "Using Variables",
        description: "Variables store values that can change.",
        code: `from microbit import *

score = 0

while True:
    if button_a.is_pressed():
        score = score + 1
        display.show(score)
        sleep(300)
`,
        concepts: ["variable assignment", "updating values"]
      },
      {
        id: "var_math",
        title: "Math with Variables",
        description: "Perform calculations with variables.",
        code: `from microbit import *

health = 10

while True:
    display.show(health)
    
    if button_a.is_pressed():
        health = health - 1  # Take damage
        sleep(300)
    
    if button_b.is_pressed():
        health = health + 1  # Heal
        if health > 10:
            health = 10
        sleep(300)
`,
        concepts: ["math operations", "boundaries", "game mechanics"]
      },
      {
        id: "var_boolean",
        title: "True/False Variables",
        description: "Boolean variables can be True or False.",
        code: `from microbit import *

game_over = False

while not game_over:
    display.show(Image.HAPPY)
    
    if button_a.is_pressed() and button_b.is_pressed():
        game_over = True

display.scroll("GAME OVER")
`,
        concepts: ["boolean", "True/False", "while not"]
      },
      {
        id: "var_string",
        title: "Text Variables",
        description: "Store and display text messages.",
        code: `from microbit import *

messages = ["Hi!", "Hello", "Yo!"]
index = 0

while True:
    if button_a.is_pressed():
        display.scroll(messages[index])
        index = index + 1
        if index >= len(messages):
            index = 0
        sleep(500)
`,
        concepts: ["strings", "lists", "index"]
      }
    ]
  },
  functions: {
    title: "📦 Functions",
    lessons: [
      {
        id: "func_basic",
        title: "Creating Functions",
        description: "Functions are reusable blocks of code.",
        code: `from microbit import *

# Define a function
def blink():
    display.show(Image.HEART)
    sleep(500)
    display.clear()
    sleep(500)

# Use the function
while True:
    blink()
`,
        concepts: ["def", "function definition", "calling functions"]
      },
      {
        id: "func_params",
        title: "Functions with Parameters",
        description: "Pass values into functions to customize behavior.",
        code: `from microbit import *

def flash(image, times):
    for i in range(times):
        display.show(image)
        sleep(300)
        display.clear()
        sleep(300)

while True:
    if button_a.is_pressed():
        flash(Image.HEART, 3)
    if button_b.is_pressed():
        flash(Image.HAPPY, 5)
`,
        concepts: ["parameters", "arguments", "customization"]
      },
      {
        id: "func_return",
        title: "Functions that Return Values",
        description: "Functions can calculate and return results.",
        code: `from microbit import *

def add_scores(a, b):
    return a + b

score1 = 5
score2 = 3
total = add_scores(score1, score2)

display.scroll(total)
`,
        concepts: ["return", "calculating results"]
      },
      {
        id: "func_organize",
        title: "Organizing with Functions",
        description: "Use functions to organize your code logically.",
        code: `from microbit import *

def show_ready():
    display.show(Image.TARGET)
    sleep(500)

def show_win():
    display.show(Image.HAPPY)
    display.scroll("WIN!")

def show_lose():
    display.show(Image.SAD)
    display.scroll("LOSE")

show_ready()
if button_a.is_pressed():
    show_win()
else:
    show_lose()
`,
        concepts: ["code organization", "readable code"]
      }
    ]
  }
};

export default function MicrobitTeaching({ user }) {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState("display");
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [code, setCode] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorRef = useRef(null);

  const currentTopic = TEACHING_EXAMPLES[selectedTopic];
  const currentLesson = currentTopic.lessons[currentLessonIndex];

  // Initialize code when lesson changes
  const lessonCode = currentLesson?.code || "";
  useEffect(() => {
    setCode(lessonCode);
  }, [lessonCode]);

  const resetCode = () => {
    setCode(currentLesson.code);
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

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 py-3 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/microbit")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              <span className="font-bold">Teaching Mode</span>
              <span className="text-cyan-200">| {currentTopic.title}</span>
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
                <h2 className="text-lg font-bold text-cyan-400">{currentLesson.title}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>{currentLessonIndex + 1} / {currentTopic.lessons.length}</span>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-2">{currentLesson.description}</p>
              <div className="flex gap-2 flex-wrap">
                {currentLesson.concepts.map((concept, i) => (
                  <span key={i} className="px-2 py-0.5 bg-cyan-900/50 text-cyan-300 rounded text-xs">
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
                  wordWrap: "on",
                  wrappingIndent: "indent",
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
              
              <div className="flex gap-2">
                <Button
                  onClick={resetCode}
                  variant="outline"
                  size="sm"
                  className="bg-gray-700 border-gray-600 hover:bg-gray-600"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
                <Button
                  onClick={downloadCode}
                  variant="outline"
                  size="sm"
                  className="bg-gray-700 border-gray-600 hover:bg-gray-600"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-gray-700" />

        {/* Right: Micro:bit Simulator */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-gray-950">
            <div className="p-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
              <span className="font-medium text-cyan-400 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Micro:bit Simulator
              </span>
              <span className="text-xs text-gray-400">Click Run to test • Press A/B buttons</span>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <MicrobitSimulator code={code} />
            </div>

            {/* Quick Reference */}
            <div className="p-4 bg-gray-800 border-t border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <h3 className="text-sm font-medium text-gray-300">Quick Reference</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-500">
                  <code className="text-cyan-400">display.show(Image.X)</code> - show image
                </div>
                <div className="text-gray-500">
                  <code className="text-cyan-400">display.scroll("text")</code> - scroll text
                </div>
                <div className="text-gray-500">
                  <code className="text-cyan-400">button_a.is_pressed()</code> - check button
                </div>
                <div className="text-gray-500">
                  <code className="text-cyan-400">sleep(ms)</code> - wait milliseconds
                </div>
                <div className="text-gray-500">
                  <code className="text-cyan-400">display.set_pixel(x,y,b)</code> - set LED
                </div>
                <div className="text-gray-500">
                  <code className="text-cyan-400">display.clear()</code> - clear display
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
