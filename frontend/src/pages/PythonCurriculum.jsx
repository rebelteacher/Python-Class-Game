import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  BookOpen, 
  Clock, 
  CheckCircle,
  Play,
  Target,
  ChevronDown,
  ChevronRight,
  Code,
  Repeat,
  GitBranch,
  Box,
  Terminal,
  Plus,
  Edit,
  Trash2,
  GraduationCap,
  Library,
  Users
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Python curriculum structure - can be extended with new chapters
const DEFAULT_PYTHON_CURRICULUM = {
  units: [
    {
      id: "chapter1",
      title: "Chapter 1: Output & Print",
      description: "Learn to display text and communicate with the user",
      icon: "🖨️",
      color: "from-blue-500 to-indigo-500",
      weeks: "Week 1-2",
      lessons: [
        {
          id: "lesson1",
          title: "Your First Program",
          type: "Introduction",
          duration: "30 min",
          objectives: [
            "Understand what programming is",
            "Write your first print statement",
            "Run a Python program"
          ],
          dokLevel: 1
        },
        {
          id: "lesson2",
          title: "Print Multiple Lines",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Use multiple print statements",
            "Understand program flow (top to bottom)",
            "Format output with blank lines"
          ],
          dokLevel: 2
        },
        {
          id: "lesson3",
          title: "Print with Strings",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Use single and double quotes",
            "Print special characters",
            "Combine text in print statements"
          ],
          dokLevel: 2
        },
        {
          id: "lesson4",
          title: "Debugging Print Errors",
          type: "Debugging",
          duration: "30 min",
          objectives: [
            "Identify common syntax errors",
            "Fix missing quotes and parentheses",
            "Read error messages"
          ],
          dokLevel: 3
        }
      ]
    },
    {
      id: "chapter2",
      title: "Chapter 2: Strings & Text",
      description: "Work with text data and string manipulation",
      icon: "📝",
      color: "from-green-500 to-emerald-500",
      weeks: "Week 3-4",
      lessons: [
        {
          id: "lesson1",
          title: "String Basics",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Create and store strings",
            "Understand string data type",
            "Use variables with strings"
          ],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "String Concatenation",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Join strings with +",
            "Combine strings and variables",
            "Build dynamic messages"
          ],
          dokLevel: 2
        },
        {
          id: "lesson3",
          title: "Multiple Print Arguments",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Use commas in print()",
            "Mix strings and variables",
            "Understand automatic spacing"
          ],
          dokLevel: 2
        },
        {
          id: "lesson4",
          title: "Custom Separator (sep)",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Use sep parameter",
            "Create formatted output",
            "Customize output appearance"
          ],
          dokLevel: 3
        },
        {
          id: "lesson5",
          title: "End Parameter",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Use end parameter",
            "Print on same line",
            "Create patterns with print"
          ],
          dokLevel: 3
        }
      ]
    },
    {
      id: "chapter3",
      title: "Chapter 3: User Input",
      description: "Get information from the user and create interactive programs",
      icon: "⌨️",
      color: "from-purple-500 to-pink-500",
      weeks: "Week 5-6",
      lessons: [
        {
          id: "lesson1",
          title: "The input() Function",
          type: "Introduction",
          duration: "45 min",
          objectives: [
            "Use input() to get text",
            "Store input in variables",
            "Create greeting programs"
          ],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "Input with Prompts",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Write clear prompt messages",
            "Guide users with instructions",
            "Handle user responses"
          ],
          dokLevel: 2
        },
        {
          id: "lesson3",
          title: "Converting Input",
          type: "Code",
          duration: "60 min",
          objectives: [
            "Convert strings to integers",
            "Use int() function",
            "Perform math with user input"
          ],
          dokLevel: 3
        },
        {
          id: "lesson4",
          title: "Input Debugging",
          type: "Debugging",
          duration: "45 min",
          objectives: [
            "Fix type conversion errors",
            "Handle invalid input",
            "Debug input programs"
          ],
          dokLevel: 3
        }
      ]
    },
    {
      id: "chapter4",
      title: "Chapter 4: Variables & Math",
      description: "Store data and perform calculations",
      icon: "🔢",
      color: "from-orange-500 to-red-500",
      weeks: "Week 7-8",
      lessons: [
        {
          id: "lesson1",
          title: "Introduction to Variables",
          type: "Introduction",
          duration: "45 min",
          objectives: [
            "Create and name variables",
            "Understand variable assignment",
            "Use descriptive names"
          ],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "Math Operations",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Use +, -, *, / operators",
            "Understand order of operations",
            "Calculate with variables"
          ],
          dokLevel: 2
        },
        {
          id: "lesson3",
          title: "More Math Operators",
          type: "Practice",
          duration: "45 min",
          objectives: [
            "Use // (floor division)",
            "Use % (modulo/remainder)",
            "Use ** (exponent)"
          ],
          dokLevel: 3
        },
        {
          id: "lesson4",
          title: "Math Problems",
          type: "Practice",
          duration: "60 min",
          objectives: [
            "Solve real-world calculations",
            "Calculate areas and totals",
            "Build a simple calculator"
          ],
          dokLevel: 3
        }
      ]
    },
    {
      id: "chapter5",
      title: "Chapter 5: Conditionals",
      description: "Make decisions in your code with if statements",
      icon: "🔀",
      color: "from-cyan-500 to-blue-500",
      weeks: "Week 9-10",
      lessons: [
        {
          id: "lesson1",
          title: "If Statements",
          type: "Introduction",
          duration: "45 min",
          objectives: [
            "Write if statements",
            "Use comparison operators",
            "Understand True and False"
          ],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "If-Else",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Add else to if statements",
            "Handle two possible outcomes",
            "Create decision programs"
          ],
          dokLevel: 2
        },
        {
          id: "lesson3",
          title: "Elif - Multiple Conditions",
          type: "Practice",
          duration: "60 min",
          objectives: [
            "Use elif for multiple choices",
            "Create grading programs",
            "Handle multiple cases"
          ],
          dokLevel: 3
        },
        {
          id: "lesson4",
          title: "Logical Operators",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Use and, or, not",
            "Combine conditions",
            "Create complex decisions"
          ],
          dokLevel: 3
        }
      ]
    },
    {
      id: "chapter6",
      title: "Chapter 6: Loops",
      description: "Repeat actions efficiently with for and while loops",
      icon: "🔁",
      color: "from-teal-500 to-green-500",
      weeks: "Week 11-12",
      lessons: [
        {
          id: "lesson1",
          title: "For Loops",
          type: "Introduction",
          duration: "45 min",
          objectives: [
            "Use for loop syntax",
            "Understand range()",
            "Repeat code efficiently"
          ],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "Loop with range()",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Use range with start, stop, step",
            "Count backwards",
            "Create number patterns"
          ],
          dokLevel: 3
        },
        {
          id: "lesson3",
          title: "While Loops",
          type: "Practice",
          duration: "60 min",
          objectives: [
            "Use while loop syntax",
            "Create counting loops",
            "Avoid infinite loops"
          ],
          dokLevel: 3
        },
        {
          id: "lesson4",
          title: "Nested Loops",
          type: "Code",
          duration: "60 min",
          objectives: [
            "Put loops inside loops",
            "Create patterns and grids",
            "Understand loop levels"
          ],
          dokLevel: 4
        }
      ]
    },
    {
      id: "chapter7",
      title: "Chapter 7: Lists",
      description: "Store and manage collections of data",
      icon: "📋",
      color: "from-violet-500 to-purple-500",
      weeks: "Week 13-14",
      lessons: [
        {
          id: "lesson1",
          title: "Creating Lists",
          type: "Introduction",
          duration: "45 min",
          objectives: [
            "Create lists with []",
            "Store multiple values",
            "Access list items"
          ],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "List Operations",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Add items with append()",
            "Remove items with remove()",
            "Get list length"
          ],
          dokLevel: 2
        },
        {
          id: "lesson3",
          title: "Looping Through Lists",
          type: "Practice",
          duration: "60 min",
          objectives: [
            "Use for item in list",
            "Process each item",
            "Build list-based programs"
          ],
          dokLevel: 3
        },
        {
          id: "lesson4",
          title: "List Methods",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Use sort(), reverse()",
            "Find items with index()",
            "Slice lists"
          ],
          dokLevel: 3
        }
      ]
    },
    {
      id: "chapter8",
      title: "Chapter 8: Functions",
      description: "Create reusable blocks of code",
      icon: "📦",
      color: "from-amber-500 to-orange-500",
      weeks: "Week 15-16",
      lessons: [
        {
          id: "lesson1",
          title: "Defining Functions",
          type: "Introduction",
          duration: "45 min",
          objectives: [
            "Use def keyword",
            "Call your functions",
            "Understand function structure"
          ],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "Parameters",
          type: "Code",
          duration: "45 min",
          objectives: [
            "Pass values to functions",
            "Use multiple parameters",
            "Make flexible functions"
          ],
          dokLevel: 3
        },
        {
          id: "lesson3",
          title: "Return Values",
          type: "Practice",
          duration: "60 min",
          objectives: [
            "Use return statement",
            "Get values from functions",
            "Build calculation functions"
          ],
          dokLevel: 3
        },
        {
          id: "lesson4",
          title: "Function Design",
          type: "Practice",
          duration: "60 min",
          objectives: [
            "Plan function purpose",
            "Break down problems",
            "Create multi-function programs"
          ],
          dokLevel: 4
        }
      ]
    }
  ]
};

export default function PythonCurriculum({ user }) {
  const navigate = useNavigate();
  const [expandedUnits, setExpandedUnits] = useState({});
  const [curriculum, setCurriculum] = useState(DEFAULT_PYTHON_CURRICULUM);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapter, setNewChapter] = useState({
    title: "",
    description: "",
    icon: "📚",
    color: "from-gray-500 to-slate-500",
    weeks: ""
  });
  const [classrooms, setClassrooms] = useState([]);
  const [problemCounts, setProblemCounts] = useState({});

  const loadCustomCurriculum = async () => {
    // Load any custom chapters from localStorage or API
    const saved = localStorage.getItem('python_curriculum_custom');
    if (saved) {
      try {
        const custom = JSON.parse(saved);
        setCurriculum(prev => ({
          units: [...prev.units, ...custom.units]
        }));
      } catch (e) {
        console.error("Error loading custom curriculum:", e);
      }
    }
  };

  const fetchClassrooms = async () => {
    try {
      const response = await axios.get(`${API}/classrooms`, { withCredentials: true });
      setClassrooms(response.data.classrooms || []);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
    }
  };

  const fetchProblemCounts = async () => {
    try {
      const response = await axios.get(`${API}/problems?assignment_type=code`, { withCredentials: true });
      const problems = response.data || [];
      
      // Count problems by chapter/category
      const counts = {};
      problems.forEach(p => {
        const cat = p.category || "Unknown";
        counts[cat] = (counts[cat] || 0) + 1;
      });
      setProblemCounts(counts);
    } catch (error) {
      console.error("Error fetching problem counts:", error);
    }
  };

  useEffect(() => {
    fetchClassrooms();
    fetchProblemCounts();
    loadCustomCurriculum();
  }, []);

  const toggleUnit = (unitId) => {
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  const getIconForType = (type) => {
    switch (type) {
      case "Introduction": return <BookOpen className="w-4 h-4" />;
      case "Code": return <Code className="w-4 h-4" />;
      case "Practice": return <Target className="w-4 h-4" />;
      case "Debugging": return <GitBranch className="w-4 h-4" />;
      default: return <Box className="w-4 h-4" />;
    }
  };

  const handleAddChapter = () => {
    if (!newChapter.title.trim()) {
      toast.error("Please enter a chapter title");
      return;
    }

    const newUnit = {
      id: `custom_${Date.now()}`,
      title: newChapter.title,
      description: newChapter.description,
      icon: newChapter.icon,
      color: newChapter.color,
      weeks: newChapter.weeks,
      lessons: [],
      isCustom: true
    };

    setCurriculum(prev => ({
      units: [...prev.units, newUnit]
    }));

    // Save custom chapters
    const customUnits = curriculum.units.filter(u => u.isCustom);
    localStorage.setItem('python_curriculum_custom', JSON.stringify({
      units: [...customUnits, newUnit]
    }));

    setShowAddChapter(false);
    setNewChapter({
      title: "",
      description: "",
      icon: "📚",
      color: "from-gray-500 to-slate-500",
      weeks: ""
    });
    toast.success("Chapter added! You can now add lessons to it.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/teacher")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <Terminal className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Python Text Curriculum</h1>
              <p className="text-blue-100 mt-1">Core Python programming concepts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-6xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate("/assignment-library?type=code")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Library className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Problem Library</p>
                <p className="text-xs text-gray-500">Browse & add problems</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-blue-200" onClick={() => navigate("/python/teach")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-sm text-blue-700">Teaching Mode</p>
                <p className="text-xs text-gray-500">Live demo environment</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate("/skill-quiz-manager")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Skill Quizzes</p>
                <p className="text-xs text-gray-500">Manage quiz questions</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate("/teacher-reports")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Student Progress</p>
                <p className="text-xs text-gray-500">Track performance</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Curriculum Units */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Curriculum Overview</h2>
          <Button 
            onClick={() => setShowAddChapter(true)}
            variant="outline"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Chapter
          </Button>
        </div>

        <div className="space-y-4">
          {curriculum.units.map((unit, unitIndex) => (
            <Card key={unit.id} className="overflow-hidden">
              <div 
                className={`bg-gradient-to-r ${unit.color} p-4 cursor-pointer`}
                onClick={() => toggleUnit(unit.id)}
              >
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{unit.icon}</span>
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
                    {expandedUnits[unit.id] ? (
                      <ChevronDown className="w-6 h-6" />
                    ) : (
                      <ChevronRight className="w-6 h-6" />
                    )}
                  </div>
                </div>
              </div>

              {expandedUnits[unit.id] && (
                <CardContent className="p-0">
                  <div className="divide-y">
                    {unit.lessons.map((lesson, lessonIndex) => (
                      <div 
                        key={lesson.id} 
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${unit.color} flex items-center justify-center text-white text-sm font-medium`}>
                              {lessonIndex + 1}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-800">{lesson.title}</h4>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  {getIconForType(lesson.type)}
                                  {lesson.type}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {lesson.duration}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                                  DOK {lesson.dokLevel}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/assignment-library?category=${encodeURIComponent(unit.title)}`);
                              }}
                            >
                              <Library className="w-4 h-4 mr-1" />
                              Problems
                            </Button>
                          </div>
                        </div>
                        
                        {/* Learning Objectives */}
                        <div className="mt-3 pl-12">
                          <p className="text-xs text-gray-500 mb-1">Learning Objectives:</p>
                          <ul className="grid grid-cols-1 md:grid-cols-3 gap-1">
                            {lesson.objectives.map((obj, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                {obj}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                    
                    {unit.lessons.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No lessons added yet</p>
                        <p className="text-sm">Add lessons to this chapter</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Add Chapter Dialog */}
      <Dialog open={showAddChapter} onOpenChange={setShowAddChapter}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Chapter</DialogTitle>
            <DialogDescription>
              Create a new chapter to expand the curriculum
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Chapter Title *</Label>
              <Input
                value={newChapter.title}
                onChange={(e) => setNewChapter({...newChapter, title: e.target.value})}
                placeholder="Chapter 9: Advanced Topics"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={newChapter.description}
                onChange={(e) => setNewChapter({...newChapter, description: e.target.value})}
                placeholder="What students will learn in this chapter"
                className="mt-1"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icon (emoji)</Label>
                <Input
                  value={newChapter.icon}
                  onChange={(e) => setNewChapter({...newChapter, icon: e.target.value})}
                  placeholder="📚"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Timeline</Label>
                <Input
                  value={newChapter.weeks}
                  onChange={(e) => setNewChapter({...newChapter, weeks: e.target.value})}
                  placeholder="Week 17-18"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddChapter(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddChapter}>
              Add Chapter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
