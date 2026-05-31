import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ChapterTestRow from "../components/ChapterTestRow";
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
  Loader2,
  Plus,
  Trash2
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

// Available icons for custom chapters
const CHAPTER_ICONS = ["📚", "🎯", "🚀", "⭐", "💡", "🔧", "🎨", "🎮", "🌟", "✨"];

// Available colors for custom chapters
const CHAPTER_COLORS = [
  { name: "Purple", value: "from-purple-500 to-indigo-500" },
  { name: "Blue", value: "from-blue-500 to-cyan-500" },
  { name: "Green", value: "from-green-500 to-emerald-500" },
  { name: "Orange", value: "from-orange-500 to-amber-500" },
  { name: "Pink", value: "from-pink-500 to-rose-500" },
  { name: "Red", value: "from-red-500 to-orange-500" },
  { name: "Teal", value: "from-teal-500 to-cyan-500" },
  { name: "Gray", value: "from-gray-500 to-slate-500" }
];

// Problem type to badge styling
const getProblemTypeBadge = (type) => {
  const styles = {
    "Class Practice": "bg-blue-500/20 text-blue-400",
    "Independent Practice": "bg-green-500/20 text-green-400",
    "Paired Programming": "bg-purple-500/20 text-purple-400",
    "Debugging": "bg-red-500/20 text-red-400",
    "Challenge": "bg-orange-500/20 text-orange-400",
    "Project": "bg-pink-100 text-pink-700",
    "Assessment": "bg-yellow-500/20 text-yellow-400"
  };
  return styles[type] || "bg-cyber-navy/30 text-slate-300";
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
  
  // Custom curriculum state
  const [customCurriculum, setCustomCurriculum] = useState({ chapters: [], lessons: [] });
  const [showAddChapterDialog, setShowAddChapterDialog] = useState(false);
  const [showAddLessonDialog, setShowAddLessonDialog] = useState(false);
  const [selectedChapterForLesson, setSelectedChapterForLesson] = useState("");
  const [newChapter, setNewChapter] = useState({
    title: "",
    description: "",
    icon: "📚",
    color: "from-gray-500 to-slate-500",
    weeks: ""
  });
  const [newLesson, setNewLesson] = useState({
    title: "",
    type: "Code",
    duration: "30 min",
    objectives: ""
  });

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
        
        // Fetch custom curriculum
        try {
          const customResponse = await axios.get(`${API}/curriculum/block/custom`, { withCredentials: true });
          setCustomCurriculum(customResponse.data);
          
          // Add custom chapters to organized structure if they don't exist
          customResponse.data.chapters.forEach(chapter => {
            if (!organized[chapter.title]) {
              organized[chapter.title] = {};
            }
          });
          
          // Add custom lessons to organized structure
          customResponse.data.lessons.forEach(lesson => {
            if (organized[lesson.chapter] && !organized[lesson.chapter][lesson.title]) {
              organized[lesson.chapter][lesson.title] = [];
            }
          });
          
          setCurriculum({ ...organized });
        } catch (err) {
          console.log("No custom curriculum found");
        }
        
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

  const handleAddChapter = async () => {
    if (!newChapter.title.trim()) {
      toast.error("Please enter a chapter title");
      return;
    }

    try {
      const response = await axios.post(`${API}/curriculum/block/chapter`, newChapter, { withCredentials: true });
      toast.success("Chapter added successfully!");
      
      // Update local state
      setCustomCurriculum(prev => ({
        ...prev,
        chapters: [...prev.chapters, response.data.chapter]
      }));
      
      // Add to curriculum display
      setCurriculum(prev => ({
        ...prev,
        [newChapter.title]: {}
      }));
      
      // Reset form
      setNewChapter({ title: "", description: "", icon: "📚", color: "from-gray-500 to-slate-500", weeks: "" });
      setShowAddChapterDialog(false);
    } catch (error) {
      toast.error("Failed to add chapter");
    }
  };

  const handleAddLesson = async () => {
    if (!newLesson.title.trim() || !selectedChapterForLesson) {
      toast.error("Please enter a lesson title and select a chapter");
      return;
    }

    try {
      const lessonData = {
        chapter: selectedChapterForLesson,
        title: newLesson.title,
        type: newLesson.type,
        duration: newLesson.duration,
        objectives: newLesson.objectives.split("\n").filter(o => o.trim())
      };
      
      const response = await axios.post(`${API}/curriculum/block/lesson`, lessonData, { withCredentials: true });
      toast.success("Lesson added successfully!");
      
      // Update local state
      setCustomCurriculum(prev => ({
        ...prev,
        lessons: [...prev.lessons, response.data.lesson]
      }));
      
      // Add to curriculum display
      setCurriculum(prev => {
        const updated = { ...prev };
        if (!updated[selectedChapterForLesson]) {
          updated[selectedChapterForLesson] = {};
        }
        updated[selectedChapterForLesson][newLesson.title] = [];
        return updated;
      });
      
      // Reset form
      setNewLesson({ title: "", type: "Code", duration: "30 min", objectives: "" });
      setSelectedChapterForLesson("");
      setShowAddLessonDialog(false);
    } catch (error) {
      toast.error("Failed to add lesson");
    }
  };

  const handleDeleteChapter = async (chapterObj) => {
    if (!confirm(`Delete chapter "${chapterObj.title}"? This will also delete any custom lessons in this chapter.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/curriculum/block/chapter/${chapterObj.id}`, { withCredentials: true });
      toast.success("Chapter deleted");
      
      // Update local state
      setCustomCurriculum(prev => ({
        chapters: prev.chapters.filter(c => c.id !== chapterObj.id),
        lessons: prev.lessons.filter(l => l.chapter !== chapterObj.title)
      }));
      
      // Remove from curriculum display if empty
      setCurriculum(prev => {
        const updated = { ...prev };
        if (updated[chapterObj.title] && Object.keys(updated[chapterObj.title]).length === 0) {
          delete updated[chapterObj.title];
        }
        return updated;
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete chapter");
    }
  };

  const handleDeleteLesson = async (lessonObj) => {
    if (!confirm(`Delete lesson "${lessonObj.title}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/curriculum/block/lesson/${lessonObj.id}`, { withCredentials: true });
      toast.success("Lesson deleted");
      
      // Update local state
      setCustomCurriculum(prev => ({
        ...prev,
        lessons: prev.lessons.filter(l => l.id !== lessonObj.id)
      }));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete lesson");
    }
  };

  // Get custom chapter/lesson objects for delete buttons
  const getCustomChapter = (chapterTitle) => {
    return customCurriculum.chapters.find(c => c.title === chapterTitle);
  };

  const getCustomLesson = (lessonTitle, chapterTitle) => {
    return customCurriculum.lessons.find(l => l.title === lessonTitle && l.chapter === chapterTitle);
  };

  const sortedChapters = Object.keys(curriculum).sort((a, b) => {
    // Extract chapter numbers for sorting
    const numA = parseInt(a.match(/Chapter (\d+)/)?.[1] || "99");
    const numB = parseInt(b.match(/Chapter (\d+)/)?.[1] || "99");
    return numA - numB;
  });

  // Get all chapter titles for lesson dropdown
  const allChapterTitles = [...new Set([
    ...Object.keys(curriculum),
    ...customCurriculum.chapters.map(c => c.title)
  ])].sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-400">Loading curriculum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/teacher/dashboard")}
              className="text-white hover:bg-cyber-navy/60/20"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-cyber-navy/60/20 rounded-xl">
                <Boxes className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Unit 1: Block-Based Coding</h1>
                <p className="text-purple-100 mt-1">
                  Visual programming fundamentals • {totalProblems} problems available
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAddChapterDialog(true)}
                className="bg-cyber-navy/60/20 hover:bg-cyber-navy/60/30"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Chapter
              </Button>
              <Button
                onClick={() => setShowAddLessonDialog(true)}
                className="bg-cyber-navy/60/20 hover:bg-cyber-navy/60/30"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Lesson
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-purple-500 bg-purple-500/10" onClick={() => navigate("/blocks/teach")}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-500/100 rounded-lg">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Teaching Guide</h3>
                <p className="text-sm text-slate-400">Interactive lesson guides</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-500 bg-blue-500/10" onClick={() => navigate("/turtle-blocks")}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-500/100 rounded-lg">
                <span className="text-2xl">🐢</span>
              </div>
              <div>
                <h3 className="font-semibold">Turtle Blocks Editor</h3>
                <p className="text-sm text-slate-400">Visual block coding workspace</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/teacher/dashboard")}>            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Student Progress</h3>
                <p className="text-sm text-slate-400">View in classroom page</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Learning Objectives Banner */}
        <Card className="mb-8 bg-gradient-to-r from-purple-100 to-indigo-100 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Lightbulb className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-purple-900 mb-2">Unit 1 Competencies (DOK 2-3)</h3>
                <ul className="text-sm text-purple-400 space-y-1">
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
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No Block Problems Yet</h3>
            <p className="text-slate-500 mb-4">
              Block-based problems will appear here once they are created.
            </p>
          </Card>
        )}

        {/* Curriculum Chapters */}
        <div className="space-y-4">
          {sortedChapters.map((chapter) => {
            const customChapterObj = getCustomChapter(chapter);
            const meta = CHAPTER_META[chapter] || customChapterObj || {
              icon: "📚",
              color: "from-gray-500 to-slate-500",
              weeks: "",
              description: ""
            };
            const lessons = curriculum[chapter] || {};
            const lessonKeys = Object.keys(lessons).sort((a, b) => {
              const numA = parseInt(a.match(/Lesson (\d+)/)?.[1] || "99");
              const numB = parseInt(b.match(/Lesson (\d+)/)?.[1] || "99");
              return numA - numB;
            });
            const totalInChapter = lessonKeys.reduce((sum, l) => sum + (lessons[l]?.length || 0), 0);

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
                      {customChapterObj && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white hover:bg-cyber-navy/60/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChapter(customChapterObj);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      <span className="text-sm bg-cyber-navy/60/20 px-3 py-1 rounded-full">
                        {totalInChapter} problems
                      </span>
                      {meta.weeks && (
                        <span className="text-sm bg-cyber-navy/60/20 px-3 py-1 rounded-full">
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
                      {lessonKeys.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <p>No lessons yet. Add lessons or create problems in the library.</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => {
                              setSelectedChapterForLesson(chapter);
                              setShowAddLessonDialog(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Lesson to {chapter}
                          </Button>
                        </div>
                      ) : (
                        lessonKeys.map((lesson, lessonIndex) => {
                          const problems = lessons[lesson] || [];
                          const lessonKey = `${chapter}-${lesson}`;
                          const isLessonExpanded = expandedLessons.has(lessonKey);
                          const customLessonObj = getCustomLesson(lesson, chapter);

                          return (
                            <div key={lesson} className="border rounded-lg overflow-hidden">
                              {/* Lesson Header */}
                              <div
                                className="flex items-center justify-between p-4 bg-cyber-navy/40 cursor-pointer hover:bg-cyber-navy/30"
                                onClick={() => navigate(`/lesson/block/${encodeURIComponent(chapter)}/${encodeURIComponent(lesson)}`)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                                    {lessonIndex + 1}
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-white">{lesson}</h3>
                                    <p className="text-xs text-slate-500">{problems.length} problems</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {customLessonObj && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteLesson(customLessonObj);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/lesson/block/${encodeURIComponent(chapter)}/${encodeURIComponent(lesson)}`);
                                    }}
                                    className="bg-cyber-cyan text-cyber-black font-orbitron text-xs uppercase tracking-widest rounded-none border border-cyber-cyan hover:shadow-[0_0_12px_rgba(0,240,255,0.5)] font-bold gap-1 transition-all"
                                  >
                                    <Play className="w-4 h-4" />
                                    Start Lesson
                                  </Button>
                                  {isLessonExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-slate-500" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-slate-500" />
                                  )}
                                </div>
                              </div>

                              {/* Problems in Lesson */}
                              {isLessonExpanded && (
                                <div className="divide-y">
                                  {problems.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500">
                                      <p className="text-sm">No problems in this lesson yet.</p>
                                      <Button
                                        size="sm"
                                        variant="link"
                                        onClick={() => navigate(`/library?type=block&chapter=${encodeURIComponent(chapter)}&lesson=${encodeURIComponent(lesson)}`)}
                                      >
                                        Create problems in library →
                                      </Button>
                                    </div>
                                  ) : (
                                    problems.map((problem, problemIndex) => (
                                      <div
                                        key={problem.id}
                                        className="flex items-center justify-between p-3 pl-14 hover:bg-cyber-navy/40"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="text-sm text-slate-500 w-6">{problemIndex + 1}.</span>
                                          <div>
                                            <h4 className="font-medium text-slate-200">{problem.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getProblemTypeBadge(problem.problem_type)}`}>
                                                {problem.problem_type}
                                              </span>
                                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                problem.difficulty === "Easy" ? "bg-green-500/20 text-green-400" :
                                                problem.difficulty === "Medium" ? "bg-yellow-500/20 text-yellow-400" :
                                                "bg-red-500/20 text-red-400"
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
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                      
                      {/* Chapter Test (admin-placed) */}
                      <ChapterTestRow assignmentType="block" chapter={chapter} user={user} />

                      {/* Add Lesson Button within chapter */}
                      <Button
                        variant="ghost"
                        className="w-full border-2 border-dashed border-cyber-cyan/10 hover:border-purple-300 hover:bg-purple-500/10"
                        onClick={() => {
                          setSelectedChapterForLesson(chapter);
                          setShowAddLessonDialog(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Lesson to {chapter}
                      </Button>
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
            <h3 className="text-xl font-bold text-white mb-2">Ready for Unit 2?</h3>
            <p className="text-slate-400 mb-4">
              After completing Unit 1, students will be prepared to transition to Turtle Graphics - learning Python syntax through visual programming!
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Button onClick={() => navigate("/turtle-curriculum")} className="bg-green-600 hover:bg-green-700">
                🐢 Turtle Graphics (Unit 2)
              </Button>
              <Button variant="outline" onClick={() => navigate("/python-curriculum")}>
                🐍 Python Text (Unit 3)
              </Button>
              <Button variant="outline" onClick={() => navigate("/microbit")}>
                ⚡ Micro:bit (Unit 4)
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
              <div className="bg-cyber-navy/40 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Problem Details:</h4>
                <p className="text-sm text-slate-400 mb-2">{selectedProblem.description}</p>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getProblemTypeBadge(selectedProblem.problem_type)}`}>
                    {selectedProblem.problem_type}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    selectedProblem.difficulty === "Easy" ? "bg-green-500/20 text-green-400" :
                    selectedProblem.difficulty === "Medium" ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-red-500/20 text-red-400"
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

      {/* Add Chapter Dialog */}
      <Dialog open={showAddChapterDialog} onOpenChange={setShowAddChapterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Chapter</DialogTitle>
            <DialogDescription>
              Create a new chapter for the Block curriculum
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Chapter Title *</Label>
              <Input
                value={newChapter.title}
                onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                placeholder="e.g., Chapter 6: Advanced Blocks"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newChapter.description}
                onChange={(e) => setNewChapter({ ...newChapter, description: e.target.value })}
                placeholder="Brief description of this chapter"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icon</Label>
                <Select value={newChapter.icon} onValueChange={(v) => setNewChapter({ ...newChapter, icon: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHAPTER_ICONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <Select value={newChapter.color} onValueChange={(v) => setNewChapter({ ...newChapter, color: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHAPTER_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>{color.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Weeks (optional)</Label>
              <Input
                value={newChapter.weeks}
                onChange={(e) => setNewChapter({ ...newChapter, weeks: e.target.value })}
                placeholder="e.g., Week 6"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddChapterDialog(false)}>Cancel</Button>
            <Button onClick={handleAddChapter}>Add Chapter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog open={showAddLessonDialog} onOpenChange={setShowAddLessonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lesson</DialogTitle>
            <DialogDescription>
              Create a new lesson within a chapter
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Chapter *</Label>
              <Select value={selectedChapterForLesson} onValueChange={setSelectedChapterForLesson}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a chapter" />
                </SelectTrigger>
                <SelectContent>
                  {allChapterTitles.map((chapter) => (
                    <SelectItem key={chapter} value={chapter}>{chapter}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lesson Title *</Label>
              <Input
                value={newLesson.title}
                onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                placeholder="e.g., Lesson 4: Custom Events"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={newLesson.type} onValueChange={(v) => setNewLesson({ ...newLesson, type: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Introduction">Introduction</SelectItem>
                    <SelectItem value="Code">Code</SelectItem>
                    <SelectItem value="Practice">Practice</SelectItem>
                    <SelectItem value="Project">Project</SelectItem>
                    <SelectItem value="Assessment">Assessment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration</Label>
                <Input
                  value={newLesson.duration}
                  onChange={(e) => setNewLesson({ ...newLesson, duration: e.target.value })}
                  placeholder="e.g., 30 min"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Learning Objectives (one per line)</Label>
              <Textarea
                value={newLesson.objectives}
                onChange={(e) => setNewLesson({ ...newLesson, objectives: e.target.value })}
                placeholder="Understand X&#10;Learn to Y&#10;Practice Z"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLessonDialog(false)}>Cancel</Button>
            <Button onClick={handleAddLesson}>Add Lesson</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
