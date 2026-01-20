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

// Lesson content aligned with curriculum chapters - Turtle Blocks Edition
const LESSONS = {
  chapter1: {
    title: "Chapter 1: Block Basics",
    color: "from-purple-500 to-indigo-500",
    lessons: [
      {
        id: "1-1",
        name: "Lesson 1: What are Blocks?",
        objectives: [
          "Understand what programming blocks are",
          "Connect blocks together in sequence",
          "Make the turtle move forward"
        ],
        demoSteps: [
          "Show students the Turtle Blocks interface",
          "Explain the block categories (Motion, Pen, Control, Numbers)",
          "Drag a 'forward 50 steps' block",
          "Click Run to see the turtle move",
          "Explain that blocks represent code commands"
        ],
        studentActivity: "Make the turtle move forward 100 steps"
      },
      {
        id: "1-2",
        name: "Lesson 2: Motion & Turning",
        objectives: [
          "Use motion blocks to move the turtle",
          "Understand turning with degrees",
          "Create simple shapes"
        ],
        demoSteps: [
          "Show the motion blocks category",
          "Demonstrate 'forward' and 'backward' blocks",
          "Show 'turn right' and 'turn left' blocks",
          "Explain degrees (90° = quarter turn)",
          "Draw a line and turn"
        ],
        studentActivity: "Make the turtle draw an L-shape"
      },
      {
        id: "1-3",
        name: "Lesson 3: Drawing with the Pen",
        objectives: [
          "Understand pen up and pen down",
          "Change colors and pen size",
          "Move without drawing"
        ],
        demoSteps: [
          "Show 'pen down' and 'pen up' blocks",
          "Demonstrate the color picker",
          "Show pen size block",
          "Draw two separate lines using pen up",
          "Create a colorful pattern"
        ],
        studentActivity: "Draw two colored squares in different positions"
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
        objectives: [
          "Understand why loops are useful",
          "Use 'repeat' blocks",
          "Draw shapes with fewer blocks"
        ],
        demoSteps: [
          "Show drawing a square with 8 blocks",
          "Introduce the 'repeat' block",
          "Draw a square with repeat 4 times",
          "Explain: forward + turn = one side",
          "Count how many blocks we saved"
        ],
        studentActivity: "Draw a triangle using a repeat 3 times loop"
      },
      {
        id: "2-2",
        name: "Lesson 5: Counter Patterns",
        objectives: [
          "Understand patterns in shapes",
          "Calculate turns for regular shapes",
          "Create pentagons and hexagons"
        ],
        demoSteps: [
          "Review: triangle = repeat 3, turn 120°",
          "Review: square = repeat 4, turn 90°",
          "Pattern: turn = 360 ÷ sides",
          "Calculate pentagon: 360 ÷ 5 = 72°",
          "Create a hexagon (360 ÷ 6 = 60°)"
        ],
        studentActivity: "Draw a pentagon and octagon"
      },
      {
        id: "2-3",
        name: "Lesson 6: Spiral Patterns",
        objectives: [
          "Create growing patterns",
          "Use increasing values in loops",
          "Build complex designs"
        ],
        demoSteps: [
          "Show a simple square",
          "Make each side slightly longer",
          "Create a square spiral",
          "Experiment with turn angles",
          "Create artistic patterns"
        ],
        studentActivity: "Create your own spiral design"
      }
    ]
  },
  chapter3: {
    title: "Chapter 3: Coordinates & Position",
    color: "from-green-500 to-emerald-500",
    lessons: [
      {
        id: "3-1",
        name: "Lesson 7: The Coordinate Grid",
        objectives: [
          "Understand x and y coordinates",
          "Use 'go to' blocks",
          "Navigate the canvas"
        ],
        demoSteps: [
          "Enable grid on the canvas",
          "Explain center is (0, 0)",
          "Show x goes left (-) and right (+)",
          "Show y goes down (-) and up (+)",
          "Use 'go to x: y:' block"
        ],
        studentActivity: "Move the turtle to four corners using coordinates"
      },
      {
        id: "3-2",
        name: "Lesson 8: Drawing at Positions",
        objectives: [
          "Combine goto with drawing",
          "Use pen up to move without drawing",
          "Create positioned shapes"
        ],
        demoSteps: [
          "Pen up, go to position, pen down",
          "Draw a shape at that position",
          "Move to another position",
          "Draw another shape",
          "Create a pattern of shapes"
        ],
        studentActivity: "Draw a house using goto for positioning"
      },
      {
        id: "3-3",
        name: "Lesson 9: Home & Reset",
        objectives: [
          "Return turtle to center",
          "Use home block",
          "Create symmetrical designs"
        ],
        demoSteps: [
          "Draw a line outward",
          "Use 'go home' block",
          "Draw another line at angle",
          "Create a star from center",
          "Build symmetrical patterns"
        ],
        studentActivity: "Create a compass rose from the center"
      }
    ]
  },
  chapter4: {
    title: "Chapter 4: Project Challenge",
    color: "from-orange-500 to-amber-500",
    lessons: [
      {
        id: "4-1",
        name: "Lesson 10: Planning Your Design",
        objectives: [
          "Plan before coding",
          "Break down complex shapes",
          "Sketch ideas first"
        ],
        demoSteps: [
          "Show example finished projects",
          "Discuss planning on paper first",
          "Identify shapes needed",
          "Plan colors and positions",
          "Create a step-by-step plan"
        ],
        studentActivity: "Sketch a design and list the shapes needed"
      },
      {
        id: "4-2",
        name: "Lesson 11: Building Your Project",
        objectives: [
          "Apply all learned concepts",
          "Debug and fix problems",
          "Test and iterate"
        ],
        demoSteps: [
          "Start with basic shapes",
          "Test each part separately",
          "Combine pieces together",
          "Fix any issues",
          "Add colors and details"
        ],
        studentActivity: "Build your planned project"
      },
      {
        id: "4-3",
        name: "Lesson 12: Show Your Code",
        objectives: [
          "Toggle to see generated Python code",
          "Understand blocks become text",
          "Prepare for text coding"
        ],
        demoSteps: [
          "Click 'Show Code' toggle",
          "Point out import turtle",
          "Show t.forward() is the forward block",
          "Show for loop is the repeat block",
          "Preview Unit 2: Turtle text coding"
        ],
        studentActivity: "Compare your blocks to the Python code"
      }
    ]
  }
};

export default function BlockTeaching({ user }) {
  const navigate = useNavigate();
  const [selectedChapter, setSelectedChapter] = useState("chapter1");
  const [selectedLesson, setSelectedLesson] = useState(LESSONS.chapter1.lessons[0]);

  const openTurtleBlocks = () => {
    navigate('/turtle-blocks');
  };

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
            onClick={openTurtleBlocks}
            className="bg-white text-orange-600 hover:bg-orange-50"
          >
            <Play className="w-4 h-4 mr-2" />
            Open Turtle Blocks
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

                  {/* Turtle Blocks Link */}
                  <Card className="bg-gradient-to-r from-purple-100 to-blue-100 border-purple-200">
                    <CardContent className="py-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-4xl">🐢</span>
                          <div>
                            <h3 className="font-bold text-purple-800">Ready to Demo?</h3>
                            <p className="text-sm text-purple-600">Open Turtle Blocks and share your screen with students</p>
                          </div>
                        </div>
                        <Button onClick={openTurtleBlocks} className="bg-purple-500 hover:bg-purple-600">
                          <Play className="w-4 h-4 mr-2" />
                          Open Turtle Blocks
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Python Preview Note */}
                  {selectedLesson.id === "4-3" && (
                    <Card className="bg-gradient-to-r from-green-100 to-emerald-100 border-green-200">
                      <CardContent className="py-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-4xl">🐍</span>
                            <div>
                              <h3 className="font-bold text-green-800">Ready for Text Coding?</h3>
                              <p className="text-sm text-green-600">Students who've mastered blocks can move to Python Turtle</p>
                            </div>
                          </div>
                          <Button onClick={() => navigate("/turtle-curriculum")} className="bg-green-500 hover:bg-green-600">
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Go to Turtle Unit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
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
