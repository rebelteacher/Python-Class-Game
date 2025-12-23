import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  ExternalLink,
  Play,
  BookOpen,
  Lightbulb,
  Monitor,
  Users,
  Target,
  Copy
} from "lucide-react";
import { toast } from "sonner";

// Lesson content aligned with curriculum chapters
const LESSONS = {
  chapter1: {
    title: "Chapter 1: Block Basics",
    color: "from-purple-500 to-indigo-500",
    lessons: [
      {
        id: "1-1",
        name: "Lesson 1: What are Blocks?",
        scratchProject: "https://scratch.mit.edu/projects/editor/",
        objectives: [
          "Understand what programming blocks are",
          "Connect blocks together in sequence",
          "Use the 'say' block to display messages"
        ],
        demoSteps: [
          "Show students the Scratch interface",
          "Explain the block categories (Events, Looks, Motion)",
          "Drag a 'when green flag clicked' event",
          "Add a 'say Hello!' block",
          "Click the green flag to run"
        ],
        studentActivity: "Have students make the cat say their name"
      },
      {
        id: "1-2",
        name: "Lesson 2: Motion & Actions",
        scratchProject: "https://scratch.mit.edu/projects/editor/",
        objectives: [
          "Use motion blocks to move sprites",
          "Understand coordinates (x, y)",
          "Make sprites glide and turn"
        ],
        demoSteps: [
          "Show the motion blocks category",
          "Demonstrate 'move 10 steps'",
          "Show 'turn' blocks for rotation",
          "Explain x,y coordinates on the stage",
          "Create a simple square path"
        ],
        studentActivity: "Make the cat walk in a square pattern"
      },
      {
        id: "1-3",
        name: "Lesson 3: Events & Triggers",
        scratchProject: "https://scratch.mit.edu/projects/editor/",
        objectives: [
          "Understand event-driven programming",
          "Use different event blocks",
          "React to keyboard and mouse input"
        ],
        demoSteps: [
          "Explain what events are",
          "Show 'when green flag clicked'",
          "Show 'when key pressed' blocks",
          "Demonstrate 'when this sprite clicked'",
          "Build interactive keyboard controls"
        ],
        studentActivity: "Create arrow key controls to move the cat"
      }
    ]
  },
  chapter2: {
    title: "Chapter 2: Loops & Repetition",
    color: "from-blue-500 to-cyan-500",
    lessons: [
      {
        id: "2-1",
        name: "Lesson 4: Repeat Blocks",
        scratchProject: "https://scratch.mit.edu/projects/editor/",
        objectives: [
          "Understand why loops are useful",
          "Use 'repeat' blocks",
          "Create patterns with loops"
        ],
        demoSteps: [
          "Show code duplication problem",
          "Introduce the 'repeat' block",
          "Draw a square with repeat",
          "Create a star pattern",
          "Discuss efficiency"
        ],
        studentActivity: "Draw a pentagon using a repeat loop"
      },
      {
        id: "2-2",
        name: "Lesson 5: Forever Loops",
        scratchProject: "https://scratch.mit.edu/projects/editor/",
        objectives: [
          "Understand continuous loops",
          "Create animations",
          "Build interactive programs"
        ],
        demoSteps: [
          "Introduce 'forever' block",
          "Create a spinning animation",
          "Make a bouncing ball",
          "Discuss when to use forever vs repeat"
        ],
        studentActivity: "Create an animated fish swimming back and forth"
      },
      {
        id: "2-3",
        name: "Lesson 6: Nested Loops",
        scratchProject: "https://scratch.mit.edu/projects/editor/",
        objectives: [
          "Understand loops inside loops",
          "Create complex patterns",
          "Build grids and matrices"
        ],
        demoSteps: [
          "Review single loops",
          "Show loop inside loop concept",
          "Create a row of dots",
          "Create a grid of dots",
          "Build a spiral pattern"
        ],
        studentActivity: "Create a 3x3 grid of stamps"
      }
    ]
  },
  chapter3: {
    title: "Chapter 3: Decisions & Logic",
    color: "from-green-500 to-emerald-500",
    lessons: [
      {
        id: "3-1",
        name: "Lesson 7: If Blocks",
        scratchProject: "https://scratch.mit.edu/projects/editor/",
        objectives: [
          "Understand conditional logic",
          "Use 'if' blocks",
          "Check conditions"
        ],
        demoSteps: [
          "Explain decision making in programs",
          "Show 'if' block structure",
          "Use 'touching edge?' condition",
          "Make sprite turn at edges",
          "Use sensing blocks"
        ],
        studentActivity: "Make the cat change color when touching the edge"
      },
      {
        id: "3-2",
        name: "Lesson 8: If-Else Blocks",
        scratchProject: "https://scratch.mit.edu/projects/editor/",
        objectives: [
          "Understand two-way decisions",
          "Use 'if-else' blocks",
          "Handle both cases"
        ],
        demoSteps: [
          "Review 'if' blocks",
          "Introduce 'if-else'",
          "Build a day/night checker",
          "Create a guessing game"
        ],
        studentActivity: "Create a number guessing game with feedback"
      },
      {
        id: "3-3",
        name: "Lesson 9: Comparison & Logic",
        scratchProject: "https://scratch.mit.edu/projects/editor/",
        objectives: [
          "Use comparison operators",
          "Combine conditions with AND/OR",
          "Build complex logic"
        ],
        demoSteps: [
          "Show <, >, = operators",
          "Introduce 'and' and 'or' blocks",
          "Build multi-condition checks",
          "Create a grade checker"
        ],
        studentActivity: "Create a program that checks if a number is between 1 and 10"
      }
    ]
  },
  chapter4: {
    title: "Chapter 4: Variables & Data",
    color: "from-orange-500 to-amber-500",
    lessons: [
      {
        id: "4-1",
        name: "Lesson 10: What are Variables?",
        scratchProject: "https://scratch.mit.edu/projects/editor/",
        objectives: [
          "Understand what variables are",
          "Create and name variables",
          "Set and display variable values"
        ],
        demoSteps: [
          "Explain variables as 'storage boxes'",
          "Create a variable named 'score'",
          "Set the variable to a value",
          "Display the variable on stage"
        ],
        studentActivity: "Create a variable for your name and display it"
      },
      {
        id: "4-2",
        name: "Lesson 11: Using Variables",
        scratchProject: "https://scratch.mit.edu/projects/editor/",
        objectives: [
          "Change variable values",
          "Use variables in calculations",
          "Build a counter"
        ],
        demoSteps: [
          "Review creating variables",
          "Show 'change by' block",
          "Build a click counter",
          "Create a simple calculator"
        ],
        studentActivity: "Create a click counter that adds 1 each time you click the cat"
      },
      {
        id: "4-3",
        name: "Lesson 12: Variables in Games",
        scratchProject: "https://scratch.mit.edu/projects/editor/",
        objectives: [
          "Use variables for game mechanics",
          "Track scores and lives",
          "Create game over conditions"
        ],
        demoSteps: [
          "Create score and lives variables",
          "Increase score on events",
          "Decrease lives on collision",
          "Check for game over"
        ],
        studentActivity: "Add a scoring system to a simple catching game"
      }
    ]
  },
  chapter5: {
    title: "Chapter 5: Blocks to Text",
    color: "from-pink-500 to-rose-500",
    lessons: [
      {
        id: "5-1",
        name: "Lesson 13: Blocks → Python",
        scratchProject: "https://scratch.mit.edu/projects/editor/",
        objectives: [
          "Compare blocks to Python code",
          "Understand the transition",
          "See the similarities"
        ],
        demoSteps: [
          "Show a block program",
          "Show equivalent Python code",
          "Highlight similarities",
          "Discuss text syntax"
        ],
        studentActivity: "Match block programs to their Python equivalents"
      },
      {
        id: "5-2",
        name: "Lesson 14: Writing Your First Python",
        scratchProject: null,
        objectives: [
          "Write a print statement",
          "Understand Python syntax",
          "Debug simple errors"
        ],
        demoSteps: [
          "Open the Python coding page",
          "Write print('Hello!')",
          "Explain quotation marks",
          "Show common errors",
          "Practice fixing bugs"
        ],
        studentActivity: "Write your first Python program with print()"
      },
      {
        id: "5-3",
        name: "Lesson 15: Transition Challenge",
        scratchProject: null,
        objectives: [
          "Convert blocks to Python",
          "Apply programming concepts",
          "Complete the transition"
        ],
        demoSteps: [
          "Review key concepts",
          "Show block to Python conversions",
          "Practice loop conversion",
          "Practice conditional conversion"
        ],
        studentActivity: "Convert 3 block programs to Python code"
      }
    ]
  }
};

export default function BlockTeaching({ user }) {
  const navigate = useNavigate();
  const [selectedChapter, setSelectedChapter] = useState("chapter1");
  const [selectedLesson, setSelectedLesson] = useState(LESSONS.chapter1.lessons[0]);

  const openScratch = () => {
    window.open('https://scratch.mit.edu/projects/editor/', '_blank');
  };

  const copyObjectives = () => {
    const text = selectedLesson.objectives.join('\n• ');
    navigator.clipboard.writeText('• ' + text);
    toast.success("Objectives copied!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/blocks-curriculum")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Curriculum
            </Button>
            <div className="flex items-center gap-2">
              <Monitor className="w-6 h-6" />
              <span className="text-xl font-bold">Teaching Mode</span>
            </div>
          </div>
          
          <Button
            onClick={openScratch}
            className="bg-white text-orange-600 hover:bg-orange-50"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Scratch Editor
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Chapter Tabs */}
        <Tabs value={selectedChapter} onValueChange={(v) => {
          setSelectedChapter(v);
          setSelectedLesson(LESSONS[v].lessons[0]);
        }}>
          <TabsList className="w-full flex flex-wrap h-auto gap-2 bg-transparent mb-6">
            {Object.entries(LESSONS).map(([key, chapter]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className={`flex-1 min-w-[150px] py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:${chapter.color} data-[state=active]:text-white`}
              >
                {chapter.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(LESSONS).map(([chapterKey, chapter]) => (
            <TabsContent key={chapterKey} value={chapterKey}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lesson Selector */}
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader className={`bg-gradient-to-r ${chapter.color} text-white rounded-t-lg`}>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Lessons
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {chapter.lessons.map((lesson, idx) => (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLesson(lesson)}
                          className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${
                            selectedLesson.id === lesson.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                          }`}
                        >
                          <div className="font-medium">{lesson.name}</div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Play className="w-5 h-5 text-green-600" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button onClick={openScratch} className="w-full bg-orange-500 hover:bg-orange-600">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Scratch (Demo)
                      </Button>
                      <Button onClick={() => navigate("/library?type=block")} variant="outline" className="w-full">
                        <BookOpen className="w-4 h-4 mr-2" />
                        View Problems
                      </Button>
                      <Button onClick={copyObjectives} variant="outline" className="w-full">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Objectives
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Lesson Details */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Lesson Header */}
                  <Card className={`bg-gradient-to-r ${chapter.color}`}>
                    <CardContent className="py-6 text-white">
                      <h2 className="text-2xl font-bold mb-2">{selectedLesson.name}</h2>
                      <p className="opacity-90">Block-Based Programming • {chapter.title}</p>
                    </CardContent>
                  </Card>

                  {/* Learning Objectives */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        Learning Objectives
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedLesson.objectives.map((obj, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-500 mt-1">✓</span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Demo Steps */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-purple-600" />
                        Teacher Demo Steps
                      </CardTitle>
                      <CardDescription>Follow these steps while screen sharing Scratch</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-3">
                        {selectedLesson.demoSteps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>

                  {/* Student Activity */}
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-600" />
                        Student Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                        <p className="text-lg">{selectedLesson.studentActivity}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Scratch Link */}
                  {selectedLesson.scratchProject && (
                    <Card className="bg-gradient-to-r from-orange-100 to-yellow-100 border-orange-200">
                      <CardContent className="py-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <img 
                              src="https://scratch.mit.edu/images/logo_sm.png" 
                              alt="Scratch" 
                              className="h-10"
                            />
                            <div>
                              <h3 className="font-bold text-orange-800">Ready to Demo?</h3>
                              <p className="text-sm text-orange-600">Open Scratch and share your screen with students</p>
                            </div>
                          </div>
                          <Button onClick={openScratch} className="bg-orange-500 hover:bg-orange-600">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open Scratch
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Python Transition Note */}
                  {!selectedLesson.scratchProject && (
                    <Card className="bg-gradient-to-r from-blue-100 to-indigo-100 border-blue-200">
                      <CardContent className="py-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-4xl">🐍</span>
                            <div>
                              <h3 className="font-bold text-blue-800">Python Transition Lesson</h3>
                              <p className="text-sm text-blue-600">This lesson uses the Python coding environment</p>
                            </div>
                          </div>
                          <Button onClick={() => navigate("/python-curriculum")} className="bg-blue-500 hover:bg-blue-600">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Go to Python
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
