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
  Code,
  Repeat,
  GitBranch,
  Box,
  Palette,
  Star,
  Trophy
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Turtle curriculum structure - Unit 2: Visual Python with Turtle Graphics
// Map from curriculum unit to database chapter
const CHAPTER_MAPPING = {
  "unit1": "Chapter 1: First Steps",
  "unit2": "Chapter 2: Loops", 
  "unit3": "Chapter 3: Colors",
  "unit4": "Chapter 4: Conditionals",
  "unit5": "Chapter 5: Functions",
  "unit6": "Chapter 6: Projects"
};

const TURTLE_CURRICULUM = {
  units: [
    {
      id: "unit1",
      title: "Chapter 1: First Steps with Turtle",
      description: "Introduction to turtle graphics and basic commands",
      icon: "🐢",
      color: "from-green-500 to-emerald-500",
      weeks: "Week 1",
      lessons: [
        {
          id: "lesson1",
          title: "Meet the Turtle",
          type: "Introduction",
          duration: "30 min",
          objectives: [
            "Understand what turtle graphics is",
            "Create your first turtle program",
            "Use forward() and backward() commands"
          ],
          dokLevel: 2
        },
        {
          id: "lesson2", 
          title: "Turning & Direction",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Use right() and left() to turn",
            "Understand angles and degrees",
            "Draw simple angled lines"
          ],
          dokLevel: 2
        },
        {
          id: "lesson3",
          title: "Your First Shape",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Combine movement and turning",
            "Draw a complete square",
            "Understand the concept of a closed shape"
          ],
          dokLevel: 3
        },
        {
          id: "lesson4",
          title: "Pen Control",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Use penup() and pendown() commands",
            "Draw shapes without connecting lines",
            "Create patterns with gaps"
          ],
          dokLevel: 2
        },
        {
          id: "lesson5",
          title: "Location",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Use goto() to move to specific coordinates",
            "Understand the turtle coordinate system",
            "Use setx(), sety(), home() commands",
            "Get position with pos(), xcor(), ycor()"
          ],
          dokLevel: 3
        }
      ]
    },
    {
      id: "unit2",
      title: "Chapter 2: Loops - The Power of Repetition",
      description: "Use loops to create patterns efficiently",
      icon: "🔁",
      color: "from-blue-500 to-indigo-500",
      weeks: "Weeks 2-3",
      lessons: [
        {
          id: "lesson1",
          title: "For Loops Introduction",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Understand the for loop syntax",
            "Use range() function",
            "Draw shapes using loops"
          ],
          dokLevel: 3
        },
        {
          id: "lesson2",
          title: "Polygons with Loops",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Calculate angles for regular polygons",
            "Draw triangles, pentagons, hexagons",
            "Understand the relationship between sides and angles"
          ],
          dokLevel: 3
        },
        {
          id: "lesson3",
          title: "Nested Loops",
          type: "Code",
          duration: "60 min",
          objectives: [
            "Understand nested loop structure",
            "Create grids and patterns",
            "Draw multiple shapes systematically"
          ],
          dokLevel: 3
        },
        {
          id: "lesson4",
          title: "While Loops & Spirals",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Use while loops for unknown iterations",
            "Create spiral patterns",
            "Understand loop control variables"
          ],
          dokLevel: 3
        }
      ]
    },
    {
      id: "unit3",
      title: "Chapter 3: Colors & Style",
      description: "Add color and customize your drawings",
      icon: "🎨",
      color: "from-pink-500 to-rose-500",
      weeks: "Week 4",
      lessons: [
        {
          id: "lesson1",
          title: "Pen Colors",
          type: "Code",
          duration: "30 min",
          objectives: [
            "Use pencolor() to change line color",
            "Understand color names and RGB values",
            "Create colorful patterns"
          ],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "Fill Colors",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Use begin_fill() and end_fill()",
            "Fill shapes with color",
            "Combine outline and fill colors"
          ],
          dokLevel: 3
        },
        {
          id: "lesson3",
          title: "Pen Size & Style",
          type: "Practice",
          duration: "30 min",
          objectives: [
            "Control pen width with pensize()",
            "Use penup() and pendown()",
            "Create dashed patterns"
          ],
          dokLevel: 2
        }
      ]
    },
    {
      id: "unit4",
      title: "Chapter 4: Conditionals - Making Decisions",
      description: "Use if/else to create dynamic drawings",
      icon: "🔀",
      color: "from-purple-500 to-violet-500",
      weeks: "Weeks 5-6",
      lessons: [
        {
          id: "lesson1",
          title: "If Statements",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Understand if statement syntax",
            "Make decisions based on conditions",
            "Change colors based on position"
          ],
          dokLevel: 3
        },
        {
          id: "lesson2",
          title: "If-Else Decisions",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Use else for alternative actions",
            "Create alternating patterns",
            "Draw checkerboard patterns"
          ],
          dokLevel: 3
        },
        {
          id: "lesson3",
          title: "Multiple Conditions (elif)",
          type: "Code",
          duration: "60 min",
          objectives: [
            "Use elif for multiple conditions",
            "Create rainbow patterns",
            "Complex decision making in loops"
          ],
          dokLevel: 3
        },
        {
          id: "lesson4",
          title: "Boolean Logic in Art",
          type: "Project",
          duration: "60 min",
          objectives: [
            "Combine and/or operators",
            "Create complex conditional patterns",
            "Design algorithmic art"
          ],
          dokLevel: 4
        }
      ]
    },
    {
      id: "unit5",
      title: "Chapter 5: Functions - Reusable Code",
      description: "Create your own commands with functions",
      icon: "📦",
      color: "from-orange-500 to-amber-500",
      weeks: "Weeks 7-8",
      lessons: [
        {
          id: "lesson1",
          title: "Defining Functions",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Understand function syntax",
            "Create reusable shape functions",
            "Call functions multiple times"
          ],
          dokLevel: 3
        },
        {
          id: "lesson2",
          title: "Parameters & Arguments",
          type: "Practice",
          duration: "60 min",
          objectives: [
            "Add parameters to functions",
            "Create scalable shapes",
            "Pass different values to functions"
          ],
          dokLevel: 3
        },
        {
          id: "lesson3",
          title: "Multiple Parameters",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Use multiple parameters",
            "Create customizable drawings",
            "Control size, color, and position"
          ],
          dokLevel: 3
        },
        {
          id: "lesson4",
          title: "Function Composition",
          type: "Project",
          duration: "60 min",
          objectives: [
            "Call functions from other functions",
            "Build complex scenes from simple parts",
            "Create a complete picture using functions"
          ],
          dokLevel: 4
        }
      ]
    },
    {
      id: "unit6",
      title: "Chapter 6: Projects & Challenges",
      description: "Apply all skills to create amazing art",
      icon: "🏆",
      color: "from-yellow-500 to-orange-500",
      weeks: "Week 9+",
      lessons: [
        {
          id: "lesson1",
          title: "Geometric Art",
          type: "Project",
          duration: "90 min",
          objectives: [
            "Combine loops and functions",
            "Create mandala-style patterns",
            "Apply mathematical concepts"
          ],
          dokLevel: 4
        },
        {
          id: "lesson2",
          title: "Scene Drawing",
          type: "Project",
          duration: "90 min",
          objectives: [
            "Plan and design a scene",
            "Use functions for scene elements",
            "Create a complete picture"
          ],
          dokLevel: 4
        },
        {
          id: "lesson3",
          title: "Animation Basics",
          type: "Challenge",
          duration: "60 min",
          objectives: [
            "Understand screen updates",
            "Create simple animations",
            "Use loops for movement"
          ],
          dokLevel: 4
        },
        {
          id: "lesson4",
          title: "Creative Challenge",
          type: "Challenge",
          duration: "90 min",
          objectives: [
            "Design your own project",
            "Apply all learned concepts",
            "Present and explain your code"
          ],
          dokLevel: 4
        }
      ]
    }
  ]
};

export default function TurtleCurriculum({ user }) {
  const navigate = useNavigate();
  const [expandedUnits, setExpandedUnits] = useState(new Set(["unit1"]));
  const [classrooms, setClassrooms] = useState([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const response = await axios.get(`${API}/classrooms`, { withCredentials: true });
      setClassrooms(response.data);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
    }
  };

  const toggleUnit = (unitId) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId);
    } else {
      newExpanded.add(unitId);
    }
    setExpandedUnits(newExpanded);
  };

  const handleAssignLesson = (lesson, unit) => {
    setSelectedLesson({ ...lesson, unitTitle: unit.title, unitId: unit.id });
    setShowAssignDialog(true);
  };

  const createAssignmentFromLesson = async () => {
    if (!selectedClassroom || !selectedLesson) {
      toast.error("Please select a classroom");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/turtle/create-from-lesson`,
        {
          unit_id: selectedLesson.unitId,
          lesson_id: selectedLesson.id,
          classroom_ids: [selectedClassroom]
        },
        { withCredentials: true }
      );

      toast.success("Assignment created successfully!");
      setShowAssignDialog(false);
      setSelectedLesson(null);
      setSelectedClassroom("");
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error("Failed to create assignment");
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "Introduction": return <BookOpen className="w-4 h-4" />;
      case "Code": return <Code className="w-4 h-4" />;
      case "Practice": return <Target className="w-4 h-4" />;
      case "Project": return <Star className="w-4 h-4" />;
      case "Challenge": return <Trophy className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "Introduction": return "bg-blue-500/20 text-blue-400";
      case "Code": return "bg-green-500/20 text-green-400";
      case "Practice": return "bg-purple-500/20 text-purple-400";
      case "Project": return "bg-orange-500/20 text-orange-400";
      case "Challenge": return "bg-red-500/20 text-red-400";
      default: return "bg-cyber-navy/30 text-slate-300";
    }
  };

  const getDOKBadge = (level) => {
    const colors = {
      1: "bg-green-500/20 text-green-400",
      2: "bg-blue-500/20 text-blue-400",
      3: "bg-purple-500/20 text-purple-400",
      4: "bg-red-500/20 text-red-400"
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${colors[level]}`}>
        DOK{level}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/teacher/dashboard")}
                className="text-white hover:bg-cyber-navy/60/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  🐢 Turtle Graphics Curriculum
                </h1>
                <p className="text-green-100 mt-1">Unit 2: Visual Python Programming</p>
              </div>
            </div>
            <Button
              onClick={() => navigate("/library?type=turtle")}
              className="bg-cyber-navy/60 text-green-600 hover:bg-green-500/10"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Go to Turtle Library
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-500 bg-green-500/10" onClick={() => navigate("/turtle/teach")}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-500/100 rounded-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-400">Teaching Mode</h3>
                <p className="text-sm text-green-600">Live demo with simulator</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/turtle")}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Turtle Sandbox</h3>
                <p className="text-sm text-slate-400">Try turtle code interactively</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/teacher/dashboard")}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Student Progress</h3>
                <p className="text-sm text-slate-400">View in classroom page</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Introduction Card */}
        <Card className="mb-8 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-cyber-navy/60/20 rounded-lg">
                <Zap className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Learn Python Visually with Turtle Graphics!</h2>
                <p className="text-green-100">
                  This curriculum uses turtle graphics to teach Python programming concepts visually. 
                  Students see their code come to life as the turtle draws on screen, making abstract concepts concrete.
                </p>
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="w-4 h-4" />
                    <span>21 Lessons</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>~20 Hours</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4" />
                    <span>DOK 2-4</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning Path */}
        <Card className="mb-6 border-green-500/30 bg-green-500/10/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <p className="text-slate-300 font-medium">
                    📚 Part of <span className="text-green-600">Unit 2: Turtle Graphics</span> curriculum
                  </p>
                  <p className="text-slate-500 text-xs">
                    Covers: Variables, Loops, Conditionals, Functions, Debugging
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">DOK2: Understand</span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">DOK3: Apply</span>
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">DOK4: Create</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Units */}
        <div className="space-y-4">
          {TURTLE_CURRICULUM.units.map((unit) => (
            <Card key={unit.id} className="overflow-hidden">
              <div
                className={`cursor-pointer bg-gradient-to-r ${unit.color} text-white p-4`}
                onClick={() => toggleUnit(unit.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{unit.icon}</span>
                    <div>
                      <h3 className="font-bold text-lg">{unit.title}</h3>
                      <p className="text-white/80 text-sm">{unit.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="font-medium">{unit.weeks}</div>
                      <div className="text-white/70">{unit.lessons.length} lessons</div>
                    </div>
                    {expandedUnits.has(unit.id) ? (
                      <ChevronDown className="w-6 h-6" />
                    ) : (
                      <ChevronRight className="w-6 h-6" />
                    )}
                  </div>
                </div>
              </div>

              {expandedUnits.has(unit.id) && (
                <CardContent className="p-4 bg-cyber-navy/40">
                  <div className="space-y-3">
                    {unit.lessons.map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className="bg-cyber-navy/60 p-4 rounded-lg border border-cyber-cyan/10 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyber-navy/30 text-slate-400 font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-white">{lesson.title}</h4>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${getTypeColor(lesson.type)}`}>
                                  {getTypeIcon(lesson.type)}
                                  {lesson.type}
                                </span>
                                {getDOKBadge(lesson.dokLevel)}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                                <Clock className="w-3 h-3" />
                                <span>{lesson.duration}</span>
                              </div>
                              <ul className="text-sm text-slate-400 space-y-1">
                                {lesson.objectives.map((obj, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                                    <span>{obj}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              const chapterName = CHAPTER_MAPPING[unit.id];
                              navigate(`/lesson/turtle/${encodeURIComponent(chapterName || "Chapter 1: First Steps")}/${encodeURIComponent("Lesson " + (index + 1) + ": " + lesson.title)}`);
                            }}
                            className="bg-cyber-cyan text-cyber-black font-orbitron text-xs uppercase tracking-widest rounded-none border border-cyber-cyan hover:shadow-[0_0_12px_rgba(0,240,255,0.5)] font-bold gap-1 transition-all"
                          >
                            <Play className="w-4 h-4" />
                            Start Lesson
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const chapterName = CHAPTER_MAPPING[unit.id];
                              console.log('Unit ID:', unit.id, 'Mapped Chapter:', chapterName);
                              navigate(`/library?type=turtle&chapter=${encodeURIComponent(chapterName || "Chapter 1: First Steps")}`);
                            }}
                          >
                            <BookOpen className="w-4 h-4 mr-1" />
                            Problems
                          </Button>
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Concept Progression */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-green-600" />
              Learning Progression
            </CardTitle>
            <CardDescription>How turtle graphics connects to Python programming concepts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <div className="text-2xl mb-2">1️⃣</div>
                <div className="font-semibold text-green-400">Basics</div>
                <div className="text-xs text-slate-400 mt-1">Commands, sequences</div>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                <div className="text-2xl mb-2">2️⃣</div>
                <div className="font-semibold text-blue-400">Loops</div>
                <div className="text-xs text-slate-400 mt-1">for, while, nested</div>
              </div>
              <div className="text-center p-4 bg-pink-500/10 rounded-lg">
                <div className="text-2xl mb-2">3️⃣</div>
                <div className="font-semibold text-pink-700">Style</div>
                <div className="text-xs text-slate-400 mt-1">Colors, pen control</div>
              </div>
              <div className="text-center p-4 bg-purple-500/10 rounded-lg">
                <div className="text-2xl mb-2">4️⃣</div>
                <div className="font-semibold text-purple-400">Logic</div>
                <div className="text-xs text-slate-400 mt-1">if, elif, else</div>
              </div>
              <div className="text-center p-4 bg-orange-500/10 rounded-lg">
                <div className="text-2xl mb-2">5️⃣</div>
                <div className="font-semibold text-orange-400">Functions</div>
                <div className="text-xs text-slate-400 mt-1">def, parameters</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-cyber-navy/40 rounded-lg text-sm text-slate-400">
              <strong>After Turtle:</strong> Students will take these same Python skills to 
              <span className="text-blue-600 font-medium"> Unit 3: Python Text</span> for advanced text-based programming, 
              then move to <span className="text-cyan-600 font-medium">Micro:bit physical computing</span>, 
              making LEDs blink, responding to buttons, and reading sensors.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Turtle Lesson</DialogTitle>
            <DialogDescription>
              {selectedLesson && (
                <span>
                  Assign "{selectedLesson.title}" from {selectedLesson.unitTitle} to your classroom
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Classroom</label>
              <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                <SelectTrigger>
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
              <div className="p-3 bg-green-500/10 rounded-lg">
                <h4 className="font-medium text-green-400 mb-2">Learning Objectives:</h4>
                <ul className="text-sm text-green-400 space-y-1">
                  {selectedLesson.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 mt-1 flex-shrink-0" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <Button 
              onClick={createAssignmentFromLesson} 
              disabled={loading || !selectedClassroom}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? "Creating..." : "Create Assignment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
