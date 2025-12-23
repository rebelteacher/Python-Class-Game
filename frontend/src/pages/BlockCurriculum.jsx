import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Star,
  Lightbulb,
  ArrowRightLeft,
  Loader2
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Chapter metadata with icons and colors
const CHAPTER_META = {
  "Chapter 1: Block Basics": {
    icon: "🧱",
    color: "from-purple-500 to-indigo-500",
    weeks: "Week 1",
    description: "Introduction to visual programming with blocks"
  },
  "Chapter 2: Loops & Repetition": {
    icon: "🔄",
    color: "from-blue-500 to-cyan-500",
    weeks: "Week 2",
    description: "Making code repeat with loop blocks"
  },
  "Chapter 3: Decisions & Logic": {
    icon: "🔀",
    color: "from-green-500 to-emerald-500",
    weeks: "Week 3",
    description: "Making programs that choose"
  },
  "Chapter 4: Variables & Data": {
    icon: "📦",
    color: "from-orange-500 to-amber-500",
    weeks: "Week 4",
    description: "Storing and using information"
  },
  "Chapter 5: Blocks to Text": {
    icon: "🔄",
    color: "from-pink-500 to-rose-500",
    weeks: "Week 5",
    description: "Preparing for text-based programming"
  }
};

// Problem type to badge styling
const getProblemTypeBadge = (type) => {
  const styles = {
    "Class Practice": "bg-blue-100 text-blue-700",
    "Independent Practice": "bg-green-100 text-green-700",
    "Paired Programming": "bg-purple-100 text-purple-700",
    "Debugging": "bg-red-100 text-red-700",
    "Challenge": "bg-orange-100 text-orange-700",
    "Project": "bg-pink-100 text-pink-700",
    "Assessment": "bg-yellow-100 text-yellow-700"
  };
  return styles[type] || "bg-gray-100 text-gray-700";
};

export default function BlockCurriculum({ user }) {
  const navigate = useNavigate();
  const [expandedChapters, setExpandedChapters] = useState(new Set(["Chapter 1: Block Basics"]));
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [classrooms, setClassrooms] = useState([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [loading, setLoading] = useState(true);
  const [curriculum, setCurriculum] = useState({});
  const [totalProblems, setTotalProblems] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch block problems
        const problemsResponse = await axios.get(`${API}/problems?assignment_type=block`, { withCredentials: true });
        const problems = problemsResponse.data;
        setTotalProblems(problems.length);
        
        // Organize problems by chapter > lesson
        const organized = {};
        problems.forEach(problem => {
          const chapter = problem.chapter || "Uncategorized";
          const lesson = problem.lesson || "General";
          
          if (!organized[chapter]) {
            organized[chapter] = {};
          }
          if (!organized[chapter][lesson]) {
            organized[chapter][lesson] = [];
          }
          organized[chapter][lesson].push(problem);
        });
        
        setCurriculum(organized);
        
        // Fetch classrooms
        const classroomsResponse = await axios.get(`${API}/classrooms`, { withCredentials: true });
        setClassrooms(classroomsResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load curriculum");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleChapter = (chapter) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapter)) {
      newExpanded.delete(chapter);
    } else {
      newExpanded.add(chapter);
    }
    setExpandedChapters(newExpanded);
  };

  const toggleLesson = (lessonKey) => {
    const newExpanded = new Set(expandedLessons);
    if (newExpanded.has(lessonKey)) {
      newExpanded.delete(lessonKey);
    } else {
      newExpanded.add(lessonKey);
    }
    setExpandedLessons(newExpanded);
  };

  const handleAssignProblem = async () => {
    if (!selectedClassroom || !selectedProblem) {
      toast.error("Please select a classroom");
      return;
    }

    try {
      await axios.post(`${API}/assignments`, {
        title: selectedProblem.title,
        description: selectedProblem.description,
        classroom_ids: [selectedClassroom],
        problem_ids: [selectedProblem.id],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        chapter: selectedProblem.chapter,
        lesson: selectedProblem.lesson
      }, { withCredentials: true });

      toast.success(`Assigned "${selectedProblem.title}" to classroom!`);
      setShowAssignDialog(false);
      setSelectedProblem(null);
      setSelectedClassroom("");
    } catch (error) {
      toast.error("Failed to create assignment");
    }
  };

  const sortedChapters = Object.keys(curriculum).sort((a, b) => {
    // Extract chapter numbers for sorting
    const numA = parseInt(a.match(/Chapter (\d+)/)?.[1] || "99");
    const numB = parseInt(b.match(/Chapter (\d+)/)?.[1] || "99");
    return numA - numB;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading curriculum...</p>
        </div>
      </div>
    );
  }

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
                Visual programming fundamentals • {totalProblems} problems available
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/library?type=block")}>
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
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-indigo-200" onClick={() => navigate("/blocks/sprites")}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Star className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold">Sprite Editor</h3>
                <p className="text-sm text-gray-600">Create with sprites & AI</p>
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

        {/* Empty State */}
        {sortedChapters.length === 0 && (
          <Card className="p-8 text-center">
            <Boxes className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Block Problems Yet</h3>
            <p className="text-gray-500 mb-4">
              Create block-based problems in the library to populate this curriculum.
            </p>
            <Button onClick={() => navigate("/library?type=block")}>
              <BookOpen className="w-4 h-4 mr-2" />
              Go to Problem Library
            </Button>
          </Card>
        )}

        {/* Curriculum Chapters */}
        <div className="space-y-4">
          {sortedChapters.map((chapter) => {
            const meta = CHAPTER_META[chapter] || {
              icon: "📚",
              color: "from-gray-500 to-slate-500",
              weeks: "",
              description: ""
            };
            const lessons = curriculum[chapter];
            const lessonKeys = Object.keys(lessons).sort((a, b) => {
              const numA = parseInt(a.match(/Lesson (\d+)/)?.[1] || "99");
              const numB = parseInt(b.match(/Lesson (\d+)/)?.[1] || "99");
              return numA - numB;
            });
            const totalInChapter = lessonKeys.reduce((sum, l) => sum + lessons[l].length, 0);

            return (
              <Card key={chapter} className="overflow-hidden">
                <div
                  className={`bg-gradient-to-r ${meta.color} p-4 cursor-pointer`}
                  onClick={() => toggleChapter(chapter)}
                >
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{meta.icon}</span>
                      <div>
                        <h2 className="text-xl font-bold">{chapter}</h2>
                        <p className="text-white/80 text-sm">{meta.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                        {totalInChapter} problems
                      </span>
                      {meta.weeks && (
                        <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                          {meta.weeks}
                        </span>
                      )}
                      {expandedChapters.has(chapter) ? (
                        <ChevronDown className="w-6 h-6" />
                      ) : (
                        <ChevronRight className="w-6 h-6" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedChapters.has(chapter) && (
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {lessonKeys.map((lesson, lessonIndex) => {
                        const problems = lessons[lesson];
                        const lessonKey = `${chapter}-${lesson}`;
                        const isLessonExpanded = expandedLessons.has(lessonKey);

                        return (
                          <div key={lesson} className="border rounded-lg overflow-hidden">
                            {/* Lesson Header */}
                            <div
                              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                              onClick={() => toggleLesson(lessonKey)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                                  {lessonIndex + 1}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">{lesson}</h3>
                                  <p className="text-xs text-gray-500">{problems.length} problems</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/library?type=block&chapter=${encodeURIComponent(chapter)}&lesson=${encodeURIComponent(lesson)}`);
                                  }}
                                >
                                  <BookOpen className="w-4 h-4 mr-1" />
                                  View in Library
                                </Button>
                                {isLessonExpanded ? (
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                            </div>

                            {/* Problems in Lesson */}
                            {isLessonExpanded && (
                              <div className="divide-y">
                                {problems.map((problem, problemIndex) => (
                                  <div
                                    key={problem.id}
                                    className="flex items-center justify-between p-3 pl-14 hover:bg-gray-50"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm text-gray-400 w-6">{problemIndex + 1}.</span>
                                      <div>
                                        <h4 className="font-medium text-gray-800">{problem.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getProblemTypeBadge(problem.problem_type)}`}>
                                            {problem.problem_type}
                                          </span>
                                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            problem.difficulty === "Easy" ? "bg-green-100 text-green-700" :
                                            problem.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                                            "bg-red-100 text-red-700"
                                          }`}>
                                            {problem.difficulty}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedProblem(problem);
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
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Transition to Text-Based Programming */}
        <Card className="mt-8 border-2 border-dashed border-purple-300">
          <CardContent className="p-6 text-center">
            <ArrowRightLeft className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ready for Unit 2?</h3>
            <p className="text-gray-600 mb-4">
              After completing Unit 1, students will be prepared to transition to text-based Python programming.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
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
            <DialogTitle>Assign Problem to Classroom</DialogTitle>
            <DialogDescription>
              {selectedProblem && `Assign "${selectedProblem.title}" to a classroom`}
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
            {selectedProblem && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Problem Details:</h4>
                <p className="text-sm text-gray-600 mb-2">{selectedProblem.description}</p>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getProblemTypeBadge(selectedProblem.problem_type)}`}>
                    {selectedProblem.problem_type}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    selectedProblem.difficulty === "Easy" ? "bg-green-100 text-green-700" :
                    selectedProblem.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {selectedProblem.difficulty}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignProblem}>
              Assign Problem
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
