import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  BookOpen, 
  Clock, 
  CheckCircle,
  Play,
  Target,
  Zap,
  ChevronDown,
  ChevronRight,
  Boxes,
  Code,
  Repeat,
  GitBranch,
  Variable,
  ArrowRightLeft,
  Star,
  Lightbulb
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Unit 1: Block-Based Coding curriculum structure (Foundation before text-based Python)
const BLOCK_CURRICULUM = {
  units: [
    {
      id: "unit1-1",
      title: "Chapter 1: Block Basics",
      description: "Introduction to visual programming with blocks",
      icon: "🧱",
      color: "from-purple-500 to-indigo-500",
      weeks: "Week 1",
      lessons: [
        {
          id: "lesson1",
          title: "What are Blocks?",
          type: "Introduction",
          duration: "30 min",
          objectives: [
            "Understand what block-based programming is",
            "Learn how blocks connect together",
            "Create your first block program"
          ],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "Motion & Actions",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Use motion blocks to move sprites",
            "Understand coordinates (x, y)",
            "Chain multiple blocks together"
          ],
          dokLevel: 2
        },
        {
          id: "lesson3",
          title: "Events & Triggers",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Learn about event blocks",
            "Respond to clicks and key presses",
            "Create interactive programs"
          ],
          dokLevel: 3
        }
      ]
    },
    {
      id: "unit1-2",
      title: "Chapter 2: Loops & Repetition",
      description: "Making code repeat with loop blocks",
      icon: "🔄",
      color: "from-blue-500 to-cyan-500",
      weeks: "Week 2",
      lessons: [
        {
          id: "lesson4",
          title: "Repeat Blocks",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Use repeat blocks to run code multiple times",
            "Understand loop counters",
            "Draw shapes using loops"
          ],
          dokLevel: 2
        },
        {
          id: "lesson5",
          title: "Forever Loops",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Create animations with forever loops",
            "Understand infinite loops",
            "Build interactive games"
          ],
          dokLevel: 3
        },
        {
          id: "lesson6",
          title: "Nested Loops",
          type: "Challenge",
          duration: "60 min",
          objectives: [
            "Put loops inside loops",
            "Create complex patterns",
            "Understand nested iteration"
          ],
          dokLevel: 3
        }
      ]
    },
    {
      id: "unit1-3",
      title: "Chapter 3: Decisions & Logic",
      description: "Making programs that choose",
      icon: "🔀",
      color: "from-green-500 to-emerald-500",
      weeks: "Week 3",
      lessons: [
        {
          id: "lesson7",
          title: "If Blocks",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Use if blocks to make decisions",
            "Understand conditions (true/false)",
            "Create responsive programs"
          ],
          dokLevel: 2
        },
        {
          id: "lesson8",
          title: "If-Else Blocks",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Handle both outcomes of a decision",
            "Create branching logic",
            "Build simple games with choices"
          ],
          dokLevel: 3
        },
        {
          id: "lesson9",
          title: "Comparison & Logic",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Use comparison operators (>, <, =)",
            "Combine conditions with AND/OR",
            "Create complex decision trees"
          ],
          dokLevel: 3
        }
      ]
    },
    {
      id: "unit1-4",
      title: "Chapter 4: Variables & Data",
      description: "Storing and using information",
      icon: "📦",
      color: "from-orange-500 to-amber-500",
      weeks: "Week 4",
      lessons: [
        {
          id: "lesson10",
          title: "What are Variables?",
          type: "Introduction",
          duration: "45 min",
          objectives: [
            "Understand variables as containers",
            "Create and name variables",
            "Store numbers and text"
          ],
          dokLevel: 2
        },
        {
          id: "lesson11",
          title: "Using Variables",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Read and change variable values",
            "Use variables in calculations",
            "Create score counters"
          ],
          dokLevel: 3
        },
        {
          id: "lesson12",
          title: "Variables in Games",
          type: "Project",
          duration: "60 min",
          objectives: [
            "Track game state with variables",
            "Create lives and health systems",
            "Build a complete mini-game"
          ],
          dokLevel: 3
        }
      ]
    },
    {
      id: "unit1-5",
      title: "Chapter 5: Blocks to Text",
      description: "Preparing for text-based programming",
      icon: "🔄",
      color: "from-pink-500 to-rose-500",
      weeks: "Week 5",
      lessons: [
        {
          id: "lesson13",
          title: "Blocks → Python",
          type: "Introduction",
          duration: "45 min",
          objectives: [
            "See how blocks translate to Python",
            "Understand syntax basics",
            "Compare visual and text code"
          ],
          dokLevel: 2
        },
        {
          id: "lesson14",
          title: "Writing Your First Python",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Type simple Python code",
            "Understand print statements",
            "Debug basic syntax errors"
          ],
          dokLevel: 2
        },
        {
          id: "lesson15",
          title: "Transition Challenge",
          type: "Assessment",
          duration: "60 min",
          objectives: [
            "Convert block programs to Python",
            "Apply all learned concepts",
            "Prepare for Unit 2: Text-Based Python Programming"
          ],
          dokLevel: 3
        }
      ]
    }
  ]
};

export default function BlockCurriculum({ user }) {
  const navigate = useNavigate();
  const [expandedUnits, setExpandedUnits] = useState(new Set(["unit1-1"]));
  const [classrooms, setClassrooms] = useState([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedClassroom, setSelectedClassroom] = useState("");

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const response = await axios.get(`${API}/classrooms`, { withCredentials: true });
        setClassrooms(response.data);
      } catch (error) {
        console.error("Error fetching classrooms:", error);
      }
    };
    fetchClassrooms();
  }, []);

  const toggleUnit = (unitId) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId);
    } else {
      newExpanded.add(unitId);
    }
    setExpandedUnits(newExpanded);
  };

  const getIconComponent = (iconName) => {
    const icons = {
      Boxes: Boxes,
      Repeat: Repeat,
      GitBranch: GitBranch,
      Variable: Variable,
      ArrowRightLeft: ArrowRightLeft
    };
    return icons[iconName] || Boxes;
  };

  const handleAssignLesson = async () => {
    if (!selectedClassroom || !selectedLesson) {
      toast.error("Please select a classroom");
      return;
    }

    try {
      // Create an assignment from this lesson
      await axios.post(`${API}/assignments`, {
        title: selectedLesson.title,
        description: selectedLesson.objectives.join(". "),
        classroom_ids: [selectedClassroom],
        problem_ids: [],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        chapter: "Unit 1: Block-Based Coding",
        lesson: selectedLesson.title
      }, { withCredentials: true });

      toast.success(`Assigned "${selectedLesson.title}" to classroom!`);
      setShowAssignDialog(false);
      setSelectedLesson(null);
      setSelectedClassroom("");
    } catch (error) {
      toast.error("Failed to create assignment");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/teacher/dashboard")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-xl">
              <Boxes className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Unit 1: Block-Based Coding</h1>
              <p className="text-purple-100 mt-1">
                Visual programming fundamentals • Foundation for text-based Python
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/library?type=code&chapter=Chapter%201%3A%20Block%20Basics")}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Problem Library</h3>
                <p className="text-sm text-gray-600">View & create Block problems</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-purple-500 bg-purple-50" onClick={() => navigate("/blocks/teach")}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-500 rounded-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-700">Teaching Mode</h3>
                <p className="text-sm text-purple-600">Live demo with blocks</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/blocks/teach")}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Block Playground</h3>
                <p className="text-sm text-gray-600">Try blocks interactively</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/teacher/dashboard")}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Student Progress</h3>
                <p className="text-sm text-gray-600">View in classroom page</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Learning Objectives Banner */}
        <Card className="mb-8 bg-gradient-to-r from-purple-100 to-indigo-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Lightbulb className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-purple-900 mb-2">Unit 1 Competencies (DOK 2-3)</h3>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>✓ Reinforce and apply block-based programming concepts</li>
                  <li>✓ Review, revisit, and remediate key programming concepts</li>
                  <li>✓ Prepare for transition to text-based programming</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Curriculum Units */}
        <div className="space-y-4">
          {BLOCK_CURRICULUM.units.map((unit) => (
            <Card key={unit.id} className="overflow-hidden">
              <div
                className={`bg-gradient-to-r ${unit.color} p-4 cursor-pointer`}
                onClick={() => toggleUnit(unit.id)}
              >
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{unit.icon}</span>
                    <div>
                      <h2 className="text-xl font-bold">{unit.title}</h2>
                      <p className="text-white/80 text-sm">{unit.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                      {unit.weeks}
                    </span>
                    {expandedUnits.has(unit.id) ? (
                      <ChevronDown className="w-6 h-6" />
                    ) : (
                      <ChevronRight className="w-6 h-6" />
                    )}
                  </div>
                </div>
              </div>

              {expandedUnits.has(unit.id) && (
                <CardContent className="p-4">
                  <div className="grid gap-4">
                    {unit.lessons.map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                lesson.type === "Introduction" ? "bg-blue-100 text-blue-700" :
                                lesson.type === "Practice" ? "bg-green-100 text-green-700" :
                                lesson.type === "Code" ? "bg-purple-100 text-purple-700" :
                                lesson.type === "Challenge" ? "bg-orange-100 text-orange-700" :
                                lesson.type === "Project" ? "bg-pink-100 text-pink-700" :
                                "bg-red-100 text-red-700"
                              }`}>
                                {lesson.type}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {lesson.duration}
                              </span>
                              <span className="text-xs text-gray-500">
                                DOK {lesson.dokLevel}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedLesson(lesson);
                              setShowAssignDialog(true);
                            }}
                          >
                            <Zap className="w-4 h-4 mr-1" />
                            Assign
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => navigate("/blocks/teach")}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Teach
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Transition to Text-Based Programming */}
        <Card className="mt-8 border-2 border-dashed border-purple-300">
          <CardContent className="p-6 text-center">
            <ArrowRightLeft className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ready for Unit 2?</h3>
            <p className="text-gray-600 mb-4">
              After completing Unit 1, students will be prepared to transition to text-based Python programming.
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => navigate("/python-curriculum")} className="bg-blue-600 hover:bg-blue-700">
                🐍 Python Text (Unit 2)
              </Button>
              <Button variant="outline" onClick={() => navigate("/turtle-curriculum")}>
                🐢 Turtle Graphics (Unit 3)
              </Button>
              <Button variant="outline" onClick={() => navigate("/microbit")}>
                ⚡ Micro:bit (Unit 4+)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Lesson to Classroom</DialogTitle>
            <DialogDescription>
              {selectedLesson && `Assign "${selectedLesson.title}" to a classroom`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Select Classroom</label>
              <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a classroom" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedLesson && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Learning Objectives:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {selectedLesson.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignLesson}>
              Assign Lesson
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
