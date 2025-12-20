import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Play, 
  RotateCcw,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Code,
  Maximize2,
  Boxes,
  Lightbulb,
  Copy
} from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { toast } from "sonner";

// Teaching examples organized by concept
const TEACHING_EXAMPLES = {
  basics: {
    title: "🧱 Block Basics",
    lessons: [
      {
        id: "intro",
        title: "What are Blocks?",
        description: "Blocks are visual pieces that snap together to create programs. Each block represents a command.",
        pythonEquivalent: `# In Python, blocks become text commands:
print("Hello, World!")
`,
        concepts: ["blocks", "visual programming", "commands"],
        demo: "print"
      },
      {
        id: "sequence",
        title: "Sequences",
        description: "Programs run from top to bottom, one block at a time. This is called a sequence.",
        pythonEquivalent: `# Commands run in order:
print("First")
print("Second")
print("Third")
`,
        concepts: ["sequence", "order", "step-by-step"],
        demo: "sequence"
      },
      {
        id: "motion",
        title: "Motion Blocks",
        description: "Motion blocks move sprites around the screen using x and y coordinates.",
        pythonEquivalent: `# In turtle graphics:
import turtle
t = turtle.Turtle()
t.forward(100)  # Move forward
t.right(90)     # Turn right
`,
        concepts: ["motion", "coordinates", "direction"],
        demo: "motion"
      }
    ]
  },
  loops: {
    title: "🔄 Loops",
    lessons: [
      {
        id: "repeat",
        title: "Repeat Blocks",
        description: "Repeat blocks run the same code multiple times. Much easier than copying!",
        pythonEquivalent: `# Repeat 4 times in Python:
for i in range(4):
    print("Hello!")
    # This runs 4 times
`,
        concepts: ["repeat", "loop", "iteration"],
        demo: "repeat"
      },
      {
        id: "forever",
        title: "Forever Loops",
        description: "Forever loops run continuously until you stop the program. Great for games!",
        pythonEquivalent: `# Forever loop in Python:
while True:
    # This runs forever
    check_for_input()
    update_screen()
`,
        concepts: ["forever", "infinite loop", "game loop"],
        demo: "forever"
      },
      {
        id: "nested",
        title: "Nested Loops",
        description: "Loops inside loops create powerful patterns. The inner loop runs completely for each outer loop.",
        pythonEquivalent: `# Nested loops in Python:
for row in range(3):
    for col in range(3):
        print(f"Row {row}, Col {col}")
`,
        concepts: ["nested", "inner loop", "outer loop"],
        demo: "nested"
      }
    ]
  },
  conditionals: {
    title: "🔀 Decisions",
    lessons: [
      {
        id: "if",
        title: "If Blocks",
        description: "If blocks check a condition and only run the code inside if it's true.",
        pythonEquivalent: `# If statement in Python:
score = 100
if score > 50:
    print("You passed!")
`,
        concepts: ["if", "condition", "true/false"],
        demo: "if"
      },
      {
        id: "ifelse",
        title: "If-Else Blocks",
        description: "If-else handles both outcomes - what to do when true AND when false.",
        pythonEquivalent: `# If-else in Python:
age = 15
if age >= 18:
    print("Adult")
else:
    print("Minor")
`,
        concepts: ["if-else", "branching", "either-or"],
        demo: "ifelse"
      },
      {
        id: "comparison",
        title: "Comparisons",
        description: "Compare values using greater than, less than, and equals.",
        pythonEquivalent: `# Comparisons in Python:
a = 10
b = 20
print(a > b)   # False
print(a < b)   # True
print(a == b)  # False
`,
        concepts: [">", "<", "==", "comparison"],
        demo: "comparison"
      }
    ]
  },
  variables: {
    title: "📦 Variables",
    lessons: [
      {
        id: "create",
        title: "Creating Variables",
        description: "Variables are like labeled boxes that store values. Give them meaningful names!",
        pythonEquivalent: `# Creating variables in Python:
score = 0
player_name = "Alex"
is_playing = True
`,
        concepts: ["variable", "value", "naming"],
        demo: "variable"
      },
      {
        id: "change",
        title: "Changing Variables",
        description: "Variables can be updated. You can set new values or modify existing ones.",
        pythonEquivalent: `# Changing variables in Python:
score = 0
score = score + 10  # Now 10
score += 5          # Now 15
`,
        concepts: ["update", "increment", "modify"],
        demo: "change"
      },
      {
        id: "use",
        title: "Using Variables",
        description: "Use variables in conditions, calculations, and to display values.",
        pythonEquivalent: `# Using variables in Python:
lives = 3
if lives > 0:
    print(f"Lives: {lives}")
    lives -= 1
`,
        concepts: ["read", "display", "calculate"],
        demo: "use"
      }
    ]
  },
  transition: {
    title: "🔄 Blocks → Python",
    lessons: [
      {
        id: "translate",
        title: "Translating Blocks",
        description: "Every block has a Python equivalent. Visual programming teaches the same concepts!",
        pythonEquivalent: `# Block: "say Hello for 2 seconds"
print("Hello")
import time
time.sleep(2)

# Block: "repeat 4"
for i in range(4):
    # blocks inside
`,
        concepts: ["translation", "syntax", "equivalence"],
        demo: "translate"
      },
      {
        id: "syntax",
        title: "Python Syntax",
        description: "Python uses text, colons, and indentation instead of block shapes and colors.",
        pythonEquivalent: `# Python syntax rules:
# 1. Use : after if, for, while
# 2. Indent code inside blocks
# 3. Use quotes for text

if True:
    print("Indented!")
`,
        concepts: ["syntax", "indentation", "punctuation"],
        demo: "syntax"
      },
      {
        id: "practice",
        title: "Practice Converting",
        description: "Try converting these common block patterns to Python code.",
        pythonEquivalent: `# Common conversions:

# "Repeat 10 times" block:
for i in range(10):
    # code here

# "If touching edge" block:
if x > 200 or x < -200:
    # code here

# "Set variable to" block:
score = 0
`,
        concepts: ["practice", "conversion", "patterns"],
        demo: "practice"
      }
    ]
  }
};

// Simple block visualization component
function BlockVisualization({ demo }) {
  const blocks = {
    print: [
      { color: "bg-purple-500", text: "when ▶ clicked", type: "event" },
      { color: "bg-indigo-500", text: 'say "Hello, World!"', type: "looks" }
    ],
    sequence: [
      { color: "bg-purple-500", text: "when ▶ clicked", type: "event" },
      { color: "bg-indigo-500", text: 'say "First"', type: "looks" },
      { color: "bg-indigo-500", text: 'say "Second"', type: "looks" },
      { color: "bg-indigo-500", text: 'say "Third"', type: "looks" }
    ],
    motion: [
      { color: "bg-purple-500", text: "when ▶ clicked", type: "event" },
      { color: "bg-blue-500", text: "move 100 steps", type: "motion" },
      { color: "bg-blue-500", text: "turn ↻ 90 degrees", type: "motion" },
      { color: "bg-blue-500", text: "move 100 steps", type: "motion" }
    ],
    repeat: [
      { color: "bg-purple-500", text: "when ▶ clicked", type: "event" },
      { color: "bg-orange-500", text: "repeat 4", type: "control", children: [
        { color: "bg-indigo-500", text: 'say "Hello!"', type: "looks" }
      ]}
    ],
    forever: [
      { color: "bg-purple-500", text: "when ▶ clicked", type: "event" },
      { color: "bg-orange-500", text: "forever", type: "control", children: [
        { color: "bg-blue-500", text: "move 10 steps", type: "motion" },
        { color: "bg-blue-500", text: "if on edge, bounce", type: "motion" }
      ]}
    ],
    nested: [
      { color: "bg-purple-500", text: "when ▶ clicked", type: "event" },
      { color: "bg-orange-500", text: "repeat 3", type: "control", children: [
        { color: "bg-orange-500", text: "repeat 3", type: "control", children: [
          { color: "bg-indigo-500", text: 'say "★"', type: "looks" }
        ]}
      ]}
    ],
    if: [
      { color: "bg-purple-500", text: "when ▶ clicked", type: "event" },
      { color: "bg-orange-500", text: "if score > 50 then", type: "control", children: [
        { color: "bg-indigo-500", text: 'say "You passed!"', type: "looks" }
      ]}
    ],
    ifelse: [
      { color: "bg-purple-500", text: "when ▶ clicked", type: "event" },
      { color: "bg-orange-500", text: "if age >= 18 then", type: "control", children: [
        { color: "bg-indigo-500", text: 'say "Adult"', type: "looks" }
      ], elseChildren: [
        { color: "bg-indigo-500", text: 'say "Minor"', type: "looks" }
      ]}
    ],
    comparison: [
      { color: "bg-green-500", text: "10 > 20", type: "operator", result: "false" },
      { color: "bg-green-500", text: "10 < 20", type: "operator", result: "true" },
      { color: "bg-green-500", text: "10 = 20", type: "operator", result: "false" }
    ],
    variable: [
      { color: "bg-purple-500", text: "when ▶ clicked", type: "event" },
      { color: "bg-red-500", text: "set score to 0", type: "variable" },
      { color: "bg-red-500", text: 'set player_name to "Alex"', type: "variable" }
    ],
    change: [
      { color: "bg-purple-500", text: "when ▶ clicked", type: "event" },
      { color: "bg-red-500", text: "set score to 0", type: "variable" },
      { color: "bg-red-500", text: "change score by 10", type: "variable" },
      { color: "bg-red-500", text: "change score by 5", type: "variable" }
    ],
    use: [
      { color: "bg-purple-500", text: "when ▶ clicked", type: "event" },
      { color: "bg-orange-500", text: "if lives > 0 then", type: "control", children: [
        { color: "bg-indigo-500", text: 'say (join "Lives: " lives)', type: "looks" },
        { color: "bg-red-500", text: "change lives by -1", type: "variable" }
      ]}
    ],
    translate: [
      { color: "bg-indigo-500", text: 'say "Hello" for 2 secs', type: "looks" },
      { color: "bg-orange-500", text: "repeat 4", type: "control", children: [
        { color: "bg-blue-500", text: "move 100 steps", type: "motion" },
        { color: "bg-blue-500", text: "turn ↻ 90 degrees", type: "motion" }
      ]}
    ],
    syntax: [
      { color: "bg-orange-500", text: "if ◇ then", type: "control", children: [
        { color: "bg-indigo-500", text: 'say "Indented!"', type: "looks" }
      ]}
    ],
    practice: [
      { color: "bg-orange-500", text: "repeat 10", type: "control", children: [
        { color: "bg-blue-500", text: "move 50 steps", type: "motion" }
      ]},
      { color: "bg-orange-500", text: "if touching edge then", type: "control", children: [
        { color: "bg-blue-500", text: "turn ↻ 180 degrees", type: "motion" }
      ]},
      { color: "bg-red-500", text: "set score to 0", type: "variable" }
    ]
  };

  const renderBlock = (block, depth = 0) => {
    const indent = depth * 20;
    
    if (block.result) {
      return (
        <div key={block.text} className="flex items-center gap-4 my-2">
          <div className={`${block.color} text-white px-4 py-2 rounded-lg font-mono text-sm shadow-md`}>
            {block.text}
          </div>
          <span className="text-lg">→</span>
          <span className={`font-bold ${block.result === 'true' ? 'text-green-600' : 'text-red-600'}`}>
            {block.result}
          </span>
        </div>
      );
    }

    return (
      <div key={block.text} style={{ marginLeft: indent }} className="my-1">
        <div className={`${block.color} text-white px-4 py-2 rounded-lg font-mono text-sm shadow-md inline-block min-w-[200px] ${
          block.children ? 'rounded-b-none' : ''
        }`}>
          {block.text}
        </div>
        {block.children && (
          <div className={`${block.color} bg-opacity-30 border-l-4 ${block.color.replace('bg-', 'border-')} ml-0 pl-2 py-2 rounded-bl-lg`}>
            {block.children.map((child, i) => renderBlock(child, 1))}
          </div>
        )}
        {block.elseChildren && (
          <>
            <div className={`${block.color} text-white px-4 py-1 font-mono text-sm inline-block min-w-[200px]`}>
              else
            </div>
            <div className={`${block.color} bg-opacity-30 border-l-4 ${block.color.replace('bg-', 'border-')} ml-0 pl-2 py-2 rounded-bl-lg`}>
              {block.elseChildren.map((child, i) => renderBlock(child, 1))}
            </div>
          </>
        )}
      </div>
    );
  };

  const demoBlocks = blocks[demo] || blocks.print;

  return (
    <div className="p-6 bg-gray-100 rounded-xl min-h-[300px]">
      <div className="space-y-1">
        {demoBlocks.map((block, i) => renderBlock(block))}
      </div>
    </div>
  );
}

export default function BlockTeaching({ user }) {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState("basics");
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentTopic = TEACHING_EXAMPLES[selectedTopic];
  const currentLesson = currentTopic.lessons[currentLessonIndex];

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

  const copyPython = () => {
    navigator.clipboard.writeText(currentLesson.pythonEquivalent);
    toast.success("Python code copied!");
  };

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 py-3 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/blocks-curriculum")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              <span className="font-bold">Block Teaching Mode</span>
              <span className="text-purple-200">| {currentTopic.title}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedTopic} onValueChange={(v) => { setSelectedTopic(v); setCurrentLessonIndex(0); }}>
              <SelectTrigger className="w-48 bg-white/10 border-white/30 text-white">
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
        {/* Left: Block Visualization */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col border-r border-gray-700">
            {/* Lesson Info */}
            <div className="p-4 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-purple-400">{currentLesson.title}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>{currentLessonIndex + 1} / {currentTopic.lessons.length}</span>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-2">{currentLesson.description}</p>
              <div className="flex gap-2 flex-wrap">
                {currentLesson.concepts.map((concept, i) => (
                  <span key={i} className="px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded text-xs">
                    {concept}
                  </span>
                ))}
              </div>
            </div>

            {/* Block Display */}
            <div className="flex-1 overflow-auto p-6 bg-gray-950">
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
                <Boxes className="w-4 h-4" />
                <span>Visual Blocks</span>
              </div>
              <BlockVisualization demo={currentLesson.demo} />
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
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-gray-700" />

        {/* Right: Python Equivalent */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-gray-950">
            <div className="p-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
              <span className="font-medium text-green-400 flex items-center gap-2">
                <Code className="w-4 h-4" />
                Python Equivalent
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyPython}
                className="text-gray-400 hover:text-white"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <pre className="bg-gray-900 p-6 rounded-xl text-green-400 font-mono text-sm leading-relaxed overflow-x-auto">
                {currentLesson.pythonEquivalent}
              </pre>
              
              {/* Explanation */}
              <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-medium text-gray-300">Key Takeaway</h3>
                </div>
                <p className="text-xs text-gray-400">
                  {selectedTopic === "basics" && "Blocks and Python do the same thing - just in different formats. Each block is a command!"}
                  {selectedTopic === "loops" && "Loops save you from repeating code. In Python, 'for' and 'while' replace repeat blocks."}
                  {selectedTopic === "conditionals" && "Decisions in code use True/False logic. Python uses 'if' and 'else' keywords."}
                  {selectedTopic === "variables" && "Variables store data. In Python, use = to set values and meaningful names."}
                  {selectedTopic === "transition" && "The concepts are identical - only the syntax changes. You already know how to program!"}
                </p>
              </div>
            </div>

            {/* Quick Reference */}
            <div className="p-4 bg-gray-800 border-t border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Block → Python Cheat Sheet</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-500">
                  <span className="text-purple-400">repeat 10</span> → <code className="text-green-400">for i in range(10):</code>
                </div>
                <div className="text-gray-500">
                  <span className="text-orange-400">if ◇ then</span> → <code className="text-green-400">if condition:</code>
                </div>
                <div className="text-gray-500">
                  <span className="text-red-400">set x to 5</span> → <code className="text-green-400">x = 5</code>
                </div>
                <div className="text-gray-500">
                  <span className="text-indigo-400">say &quot;hi&quot;</span> → <code className="text-green-400">print(&quot;hi&quot;)</code>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
