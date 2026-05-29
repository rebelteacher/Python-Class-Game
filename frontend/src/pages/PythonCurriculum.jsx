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

// Python curriculum structure - matching Python Library curriculum
const DEFAULT_PYTHON_CURRICULUM = {
  units: [
    {
      id: "chapter1",
      title: "Chapter 1: Printing",
      description: "Master the print() function and output formatting",
      icon: "🖨️",
      color: "from-blue-500 to-indigo-500",
      weeks: "Week 1-3",
      lessons: [
        {
          id: "lesson1",
          title: "Intro to Print",
          type: "Introduction",
          duration: "30 min",
          objectives: ["Write your first print statement", "Understand print() syntax", "Display text on screen"],
          dokLevel: 1
        },
        {
          id: "lesson2",
          title: "Numbers",
          type: "Code",
          duration: "30 min",
          objectives: ["Print numbers without quotes", "Understand integers vs strings", "Perform basic calculations in print"],
          dokLevel: 1
        },
        {
          id: "lesson3",
          title: "Multi Line Print",
          type: "Code",
          duration: "30 min",
          objectives: ["Use multiple print statements", "Understand program flow", "Create multi-line output"],
          dokLevel: 2
        },
        {
          id: "lesson4",
          title: "Multiple Print Arguments",
          type: "Code",
          duration: "30 min",
          objectives: ["Use commas to separate arguments", "Understand automatic spacing", "Mix text and numbers"],
          dokLevel: 2
        },
        {
          id: "lesson5",
          title: "Variables",
          type: "Code",
          duration: "45 min",
          objectives: ["Store values in variables", "Print variable values", "Use descriptive variable names"],
          dokLevel: 2
        },
        {
          id: "lesson6",
          title: "New Line Escape",
          type: "Code",
          duration: "30 min",
          objectives: ["Use \\n for new lines", "Create formatted output", "Understand escape sequences"],
          dokLevel: 2
        },
        {
          id: "lesson7",
          title: "Tab Escape",
          type: "Code",
          duration: "30 min",
          objectives: ["Use \\t for tabs", "Align output in columns", "Format data tables"],
          dokLevel: 2
        },
        {
          id: "lesson8",
          title: "Escape Quotations",
          type: "Code",
          duration: "30 min",
          objectives: ["Use \\\\ to escape quotes", "Print quotes inside strings", "Mix quote styles"],
          dokLevel: 2
        },
        {
          id: "lesson9",
          title: "Triple Quotes",
          type: "Code",
          duration: "30 min",
          objectives: ["Use triple quotes for multi-line strings", "Preserve formatting", "Create text blocks"],
          dokLevel: 2
        },
        {
          id: "lesson10",
          title: "end, sep, custom",
          type: "Code",
          duration: "45 min",
          objectives: ["Use end parameter", "Use sep parameter", "Customize print output"],
          dokLevel: 3
        },
        {
          id: "lesson11",
          title: "Concatenation",
          type: "Code",
          duration: "30 min",
          objectives: ["Join strings with +", "Combine variables and text", "Build dynamic messages"],
          dokLevel: 2
        },
        {
          id: "lesson12",
          title: "f-strings",
          type: "Code",
          duration: "45 min",
          objectives: ["Use f-string syntax", "Embed variables in strings", "Format expressions inline"],
          dokLevel: 3
        }
      ]
    },
    {
      id: "chapter2",
      title: "Chapter 2: Variables and Input",
      description: "Work with variables, data types, and user input",
      icon: "📝",
      color: "from-green-500 to-emerald-500",
      weeks: "Week 4-5",
      lessons: [
        {
          id: "lesson1",
          title: "Intro to Variables",
          type: "Introduction",
          duration: "45 min",
          objectives: ["Understand variable assignment", "Use = operator", "Store different types of data"],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "Data Types",
          type: "Code",
          duration: "45 min",
          objectives: ["Identify int, str, float, bool", "Use type() function", "Understand type differences"],
          dokLevel: 2
        },
        {
          id: "lesson3",
          title: "String Conversion",
          type: "Code",
          duration: "30 min",
          objectives: ["Convert between types", "Use int(), str(), float()", "Handle conversion errors"],
          dokLevel: 2
        },
        {
          id: "lesson4",
          title: "upper, lower, title",
          type: "Code",
          duration: "30 min",
          objectives: ["Use .upper() method", "Use .lower() method", "Use .title() method"],
          dokLevel: 2
        },
        {
          id: "lesson5",
          title: "strip, lstrip, rstrip",
          type: "Code",
          duration: "30 min",
          objectives: ["Remove whitespace with strip()", "Use lstrip() for left side", "Use rstrip() for right side"],
          dokLevel: 2
        },
        {
          id: "lesson6",
          title: "replace, count, capitalize",
          type: "Code",
          duration: "30 min",
          objectives: ["Use .replace() to swap text", "Use .count() to find occurrences", "Use .capitalize()"],
          dokLevel: 2
        },
        {
          id: "lesson7",
          title: "Chaining Methods",
          type: "Practice",
          duration: "30 min",
          objectives: ["Chain multiple methods together", "Understand method order", "Create efficient code"],
          dokLevel: 3
        },
        {
          id: "lesson8",
          title: "Input",
          type: "Code",
          duration: "45 min",
          objectives: ["Use input() function", "Store user responses", "Create interactive programs"],
          dokLevel: 2
        }
      ]
    },
    {
      id: "chapter3",
      title: "Chapter 3: Python Math",
      description: "Perform calculations and mathematical operations",
      icon: "🔢",
      color: "from-orange-500 to-red-500",
      weeks: "Week 6-7",
      lessons: [
        {
          id: "lesson1",
          title: "Variable Math",
          type: "Code",
          duration: "45 min",
          objectives: ["Add, subtract, multiply, divide", "Use variables in calculations", "Store results in variables"],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "Type Conversion",
          type: "Code",
          duration: "30 min",
          objectives: ["Convert strings to numbers", "Handle input for math", "Avoid type errors"],
          dokLevel: 2
        },
        {
          id: "lesson3",
          title: "String Math",
          type: "Code",
          duration: "30 min",
          objectives: ["Multiply strings", "Understand string repetition", "Combine with numbers"],
          dokLevel: 2
        },
        {
          id: "lesson4",
          title: "Reassignment",
          type: "Code",
          duration: "30 min",
          objectives: ["Change variable values", "Update based on current value", "Track value changes"],
          dokLevel: 2
        },
        {
          id: "lesson5",
          title: "Augmentation",
          type: "Code",
          duration: "30 min",
          objectives: ["Use += operator", "Use -=, *=, /= operators", "Write shorter code"],
          dokLevel: 2
        },
        {
          id: "lesson6",
          title: "Booleans",
          type: "Code",
          duration: "30 min",
          objectives: ["Understand True and False", "Use comparison operators", "Evaluate boolean expressions"],
          dokLevel: 2
        }
      ]
    },
    {
      id: "chapter4",
      title: "Chapter 4: Conditionals",
      description: "Make decisions in your code with if statements",
      icon: "🔀",
      color: "from-cyan-500 to-blue-500",
      weeks: "Week 8-9",
      lessons: [
        {
          id: "lesson1",
          title: "if only",
          type: "Introduction",
          duration: "45 min",
          objectives: ["Write basic if statements", "Use comparison operators", "Understand indentation"],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "if/else",
          type: "Code",
          duration: "45 min",
          objectives: ["Add else clause", "Handle two outcomes", "Create branching logic"],
          dokLevel: 2
        },
        {
          id: "lesson3",
          title: "if/elif/else",
          type: "Code",
          duration: "45 min",
          objectives: ["Use elif for multiple conditions", "Check conditions in order", "Create grading programs"],
          dokLevel: 3
        },
        {
          id: "lesson4a",
          title: "if with AND pt 1",
          type: "Code",
          duration: "30 min",
          objectives: ["Use 'and' operator", "Require multiple conditions", "Build complex checks"],
          dokLevel: 3
        },
        {
          id: "lesson4b",
          title: "if with AND pt 2",
          type: "Practice",
          duration: "30 min",
          objectives: ["Practice AND conditions", "Combine multiple checks", "Debug AND logic"],
          dokLevel: 3
        },
        {
          id: "lesson5",
          title: "if with OR",
          type: "Code",
          duration: "30 min",
          objectives: ["Use 'or' operator", "Allow alternative conditions", "Create flexible checks"],
          dokLevel: 3
        },
        {
          id: "lesson6",
          title: "if with AND/OR",
          type: "Code",
          duration: "45 min",
          objectives: ["Combine AND and OR", "Use parentheses for clarity", "Build complex logic"],
          dokLevel: 3
        },
        {
          id: "lesson7",
          title: "if/elif/else with AND/OR",
          type: "Practice",
          duration: "45 min",
          objectives: ["Combine all conditional concepts", "Create decision trees", "Build real-world programs"],
          dokLevel: 4
        },
        {
          id: "lesson8",
          title: "Chained Comparison",
          type: "Code",
          duration: "30 min",
          objectives: ["Use chained comparisons", "Check ranges efficiently", "Write cleaner code"],
          dokLevel: 3
        }
      ]
    },
    {
      id: "chapter5",
      title: "Chapter 5: Lists",
      description: "Store and manage collections of data",
      icon: "📋",
      color: "from-violet-500 to-purple-500",
      weeks: "Week 10-11",
      lessons: [
        {
          id: "lesson1",
          title: "Intro to Lists",
          type: "Introduction",
          duration: "45 min",
          objectives: ["Create lists with []", "Store multiple values", "Understand list structure"],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "Get a list element",
          type: "Code",
          duration: "30 min",
          objectives: ["Use index notation []", "Access by position", "Understand zero-indexing"],
          dokLevel: 2
        },
        {
          id: "lesson3",
          title: "Change a list element",
          type: "Code",
          duration: "30 min",
          objectives: ["Modify list items", "Assign new values by index", "Update list contents"],
          dokLevel: 2
        },
        {
          id: "lesson4",
          title: "Add elements",
          type: "Code",
          duration: "30 min",
          objectives: ["Use append() method", "Use insert() method", "Grow lists dynamically"],
          dokLevel: 2
        },
        {
          id: "lesson5",
          title: "Remove elements",
          type: "Code",
          duration: "30 min",
          objectives: ["Use remove() method", "Use pop() method", "Delete by value or index"],
          dokLevel: 2
        },
        {
          id: "lesson6",
          title: "Sorting",
          type: "Code",
          duration: "30 min",
          objectives: ["Use sort() method", "Use reverse() method", "Organize list data"],
          dokLevel: 2
        },
        {
          id: "lesson7",
          title: "List Length",
          type: "Code",
          duration: "30 min",
          objectives: ["Use len() function", "Count list items", "Check list size"],
          dokLevel: 2
        },
        {
          id: "lesson8",
          title: "Count occurrences in lists",
          type: "Code",
          duration: "30 min",
          objectives: ["Use count() method", "Find duplicates", "Analyze list contents"],
          dokLevel: 2
        }
      ]
    },
    {
      id: "chapter6",
      title: "Chapter 6: Loops",
      description: "Repeat actions efficiently with for and while loops",
      icon: "🔁",
      color: "from-teal-500 to-green-500",
      weeks: "Week 12-13",
      lessons: [
        {
          id: "lesson1",
          title: "Intro to loops",
          type: "Introduction",
          duration: "45 min",
          objectives: ["Understand loop concept", "Identify repetition patterns", "Recognize loop benefits"],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "for + range()",
          type: "Code",
          duration: "45 min",
          objectives: ["Use for loop syntax", "Use range() function", "Control loop iterations"],
          dokLevel: 2
        },
        {
          id: "lesson3",
          title: "while infinite",
          type: "Code",
          duration: "30 min",
          objectives: ["Create while True loops", "Understand infinite loops", "Use break to exit"],
          dokLevel: 3
        },
        {
          id: "lesson4",
          title: "while conditional",
          type: "Code",
          duration: "45 min",
          objectives: ["Use while with conditions", "Create countdown loops", "Avoid infinite loops"],
          dokLevel: 3
        },
        {
          id: "lesson5",
          title: "Nested Loops",
          type: "Code",
          duration: "45 min",
          objectives: ["Put loops inside loops", "Create grids and patterns", "Understand iteration order"],
          dokLevel: 4
        },
        {
          id: "lesson6",
          title: "Breaking out",
          type: "Code",
          duration: "30 min",
          objectives: ["Use break statement", "Use continue statement", "Control loop flow"],
          dokLevel: 3
        }
      ]
    },
    {
      id: "chapter7",
      title: "Chapter 7: Functions",
      description: "Create reusable blocks of code",
      icon: "📦",
      color: "from-amber-500 to-orange-500",
      weeks: "Week 14-15",
      lessons: [
        {
          id: "lesson1",
          title: "Intro to Functions",
          type: "Introduction",
          duration: "45 min",
          objectives: ["Use def keyword", "Call functions", "Understand function structure"],
          dokLevel: 2
        },
        {
          id: "lesson2",
          title: "Parameters",
          type: "Code",
          duration: "45 min",
          objectives: ["Pass values to functions", "Use multiple parameters", "Create flexible functions"],
          dokLevel: 3
        },
        {
          id: "lesson3",
          title: "Return",
          type: "Code",
          duration: "45 min",
          objectives: ["Use return statement", "Get values from functions", "Store returned results"],
          dokLevel: 3
        },
        {
          id: "lesson4",
          title: "Scope of Variables: Global",
          type: "Code",
          duration: "30 min",
          objectives: ["Understand global scope", "Use global keyword", "Access variables anywhere"],
          dokLevel: 3
        },
        {
          id: "lesson5",
          title: "Scope of Variables: Local",
          type: "Code",
          duration: "30 min",
          objectives: ["Understand local scope", "Variables inside functions", "Avoid scope conflicts"],
          dokLevel: 3
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
  const [dbLessonNames, setDbLessonNames] = useState({});

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
    fetchDbLessonNames();
  }, []);

  const fetchDbLessonNames = async () => {
    try {
      const response = await axios.get(`${API}/curriculum/units`, { withCredentials: true });
      const pyUnit = response.data.find(u => u.assignment_type === 'code');
      if (pyUnit) {
        const mapping = {};
        for (const ch of pyUnit.chapters) {
          mapping[ch.name] = ch.lessons.map(l => l.name);
        }
        setDbLessonNames(mapping);
      }
    } catch (error) {
      console.error("Error fetching DB lesson names:", error);
    }
  };

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
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/teacher/dashboard")}
              className="text-white hover:bg-cyber-navy/60/20"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-cyber-navy/60/20 rounded-xl flex items-center justify-center">
              <Terminal className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Python Text Curriculum</h1>
              <p className="text-blue-100 mt-1">Unit 3: Text-based Python programming</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-6xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-cyber-navy/60 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-blue-500/30" onClick={() => navigate("/python/teach")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/100 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-sm text-blue-400">Teaching Mode</p>
                <p className="text-xs text-slate-500">Live demo environment</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-cyber-navy/60 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate("/skill-quiz-manager")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Skill Quizzes</p>
                <p className="text-xs text-slate-500">Manage quiz questions</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-cyber-navy/60 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate("/teacher-reports")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Student Progress</p>
                <p className="text-xs text-slate-500">Track performance</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Curriculum Units */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-200">Curriculum Overview</h2>
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
                        className="p-4 hover:bg-cyber-navy/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${unit.color} flex items-center justify-center text-white text-sm font-medium`}>
                              {lessonIndex + 1}
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-200">{lesson.title}</h4>
                              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                  {getIconForType(lesson.type)}
                                  {lesson.type}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {lesson.duration}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-cyber-navy/30 rounded">
                                  DOK {lesson.dokLevel}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const dbLessons = dbLessonNames[unit.title] || [];
                                const dbLessonName = dbLessons[lessonIndex] || `Lesson ${lessonIndex + 1} ${lesson.title}`;
                                navigate(`/lesson/code/${encodeURIComponent(unit.title)}/${encodeURIComponent(dbLessonName)}`);
                              }}
                              className="bg-cyber-cyan text-cyber-black font-orbitron text-xs uppercase tracking-widest rounded-none border border-cyber-cyan hover:shadow-[0_0_12px_rgba(0,240,255,0.5)] font-bold gap-1 transition-all"
                            >
                              Start Lesson
                            </Button>

                          </div>
                        </div>
                        
                        {/* Learning Objectives */}
                        <div className="mt-3 pl-12">
                          <p className="text-xs text-slate-500 mb-1">Learning Objectives:</p>
                          <ul className="grid grid-cols-1 md:grid-cols-3 gap-1">
                            {lesson.objectives.map((obj, i) => (
                              <li key={i} className="text-xs text-slate-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                {obj}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                    
                    {unit.lessons.length === 0 && (
                      <div className="p-8 text-center text-slate-500">
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
