import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Edit, Trash2, FileQuestion, Folder, FolderOpen, ChevronRight, ChevronDown, Upload, FolderInput, Search, Filter, X, CheckSquare, Square } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Unit type to unit name mapping
const UNIT_TYPE_MAP = {
  "block": "Unit 1: Block-Based Coding",
  "turtle": "Unit 2: Turtle Graphics",
  "code": "Unit 3: Python Text",
  "microbit": "Unit 4: Micro:bit"
};

const UNIT_TYPES = [
  { value: "block", label: "🧱 Block (Unit 1)" },
  { value: "turtle", label: "🐢 Turtle (Unit 2)" },
  { value: "code", label: "🐍 Python (Unit 3)" },
  { value: "microbit", label: "⚡ Micro:bit (Unit 4)" }
];

// Helper function to render text with line breaks preserved
const renderTextWithLineBreaks = (text) => {
  if (!text) return null;
  return text.split('\n').map((line, index, array) => (
    <span key={index}>
      {line}
      {index < array.length - 1 && <br />}
    </span>
  ));
};

export default function QuestionBank({ user }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingQuestion, setMovingQuestion] = useState(null);
  const [moveToChapter, setMoveToChapter] = useState("");
  const [moveToLesson, setMoveToLesson] = useState("");
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [unitTypeFilter, setUnitTypeFilter] = useState(searchParams.get("type") || "all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [chapterFilter, setChapterFilter] = useState("all");
  const [lessonFilter, setLessonFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  
  // Multi-select mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);
  const [bulkUpdateUnitType, setBulkUpdateUnitType] = useState("");
  const [bulkUpdateUnit, setBulkUpdateUnit] = useState("");
  const [bulkUpdateChapter, setBulkUpdateChapter] = useState("");
  const [bulkUpdateLesson, setBulkUpdateLesson] = useState("");
  
  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    choice_a: "",
    choice_b: "",
    choice_c: "",
    choice_d: "",
    correct_answer: "A",
    unit_type: "",
    unit: "",
    chapter: "",
    lesson: "",
    difficulty: "Easy"
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Apply filters when questions or filter values change
  useEffect(() => {
    applyFilters();
  }, [questions, searchTerm, unitTypeFilter, unitFilter, chapterFilter, lessonFilter, difficultyFilter]);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(`${API}/mc-questions`, {
        withCredentials: true
      });
      setQuestions(response.data);
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...questions];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q =>
        q.question_text?.toLowerCase().includes(term) ||
        q.choice_a?.toLowerCase().includes(term) ||
        q.choice_b?.toLowerCase().includes(term) ||
        q.choice_c?.toLowerCase().includes(term) ||
        q.choice_d?.toLowerCase().includes(term)
      );
    }

    // Unit type filter
    if (unitTypeFilter && unitTypeFilter !== "all") {
      filtered = filtered.filter(q => q.unit_type === unitTypeFilter);
    }

    // Unit filter
    if (unitFilter && unitFilter !== "all") {
      filtered = filtered.filter(q => q.unit === unitFilter);
    }

    // Chapter filter
    if (chapterFilter && chapterFilter !== "all") {
      filtered = filtered.filter(q => q.chapter === chapterFilter);
    }

    // Lesson filter
    if (lessonFilter && lessonFilter !== "all") {
      filtered = filtered.filter(q => q.lesson === lessonFilter);
    }

    // Difficulty filter
    if (difficultyFilter && difficultyFilter !== "all") {
      filtered = filtered.filter(q => q.difficulty === difficultyFilter);
    }

    setFilteredQuestions(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setUnitTypeFilter("all");
    setUnitFilter("all");
    setChapterFilter("all");
    setLessonFilter("all");
    setDifficultyFilter("all");
    setSearchParams({});
  };

  const hasActiveFilters = searchTerm || unitTypeFilter !== "all" || unitFilter !== "all" || 
    chapterFilter !== "all" || lessonFilter !== "all" || difficultyFilter !== "all";

  // Get unique values for filter dropdowns
  const chapters = [...new Set(questions.map(q => q.chapter).filter(Boolean))].sort();
  const lessons = [...new Set(questions.map(q => q.lesson).filter(Boolean))].sort();

  // Auto-detect unit type from chapter name
  const detectUnitType = (chapterName) => {
    const lowerChapter = chapterName.toLowerCase();
    if (lowerChapter.includes("block") || lowerChapter.includes("scratch")) return "block";
    if (lowerChapter.includes("turtle")) return "turtle";
    if (lowerChapter.includes("microbit") || lowerChapter.includes("micro:bit")) return "microbit";
    return "code"; // Default to Python code
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    
    if (!newQuestion.question_text.trim() || !newQuestion.choice_a.trim() || 
        !newQuestion.choice_b.trim() || !newQuestion.choice_c.trim() || 
        !newQuestion.choice_d.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      // Auto-detect unit type if not set but chapter is
      let unitType = newQuestion.unit_type;
      if (!unitType && newQuestion.chapter) {
        unitType = detectUnitType(newQuestion.chapter);
      }
      
      // Auto-set unit based on unit_type if not set
      let unit = newQuestion.unit;
      if (!unit && unitType) {
        unit = UNIT_TYPE_MAP[unitType] || "";
      }

      await axios.post(`${API}/mc-questions`, {
        ...newQuestion,
        unit_type: unitType,
        unit: unit
      }, {
        withCredentials: true
      });
      toast.success("Question created!");
      setCreateDialogOpen(false);
      setNewQuestion({
        question_text: "",
        choice_a: "",
        choice_b: "",
        choice_c: "",
        choice_d: "",
        correct_answer: "A",
        unit_type: "",
        unit: "",
        chapter: "",
        lesson: "",
        difficulty: "Easy"
      });
      fetchQuestions();
    } catch (error) {
      console.error("Error creating question:", error);
      toast.error("Failed to create question");
    }
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    
    try {
      await axios.put(
        `${API}/mc-questions/${editingQuestion.id}`,
        {
          question_text: editingQuestion.question_text,
          choice_a: editingQuestion.choice_a,
          choice_b: editingQuestion.choice_b,
          choice_c: editingQuestion.choice_c,
          choice_d: editingQuestion.choice_d,
          correct_answer: editingQuestion.correct_answer,
          unit_type: editingQuestion.unit_type || "",
          unit: editingQuestion.unit || "",
          chapter: editingQuestion.chapter,
          lesson: editingQuestion.lesson,
          difficulty: editingQuestion.difficulty
        },
        { withCredentials: true }
      );
      toast.success("Question updated!");
      setEditDialogOpen(false);
      setEditingQuestion(null);
      fetchQuestions();
    } catch (error) {
      console.error("Error updating question:", error);
      toast.error("Failed to update question");
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      await axios.delete(`${API}/mc-questions/${questionId}`, {
        withCredentials: true
      });
      toast.success("Question deleted");
      fetchQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  };

  const handleMoveQuestion = async () => {
    if (!movingQuestion) return;
    
    if (!moveToChapter.trim() || !moveToLesson.trim()) {
      toast.error("Please select both chapter and lesson");
      return;
    }

    try {
      await axios.put(
        `${API}/mc-questions/${movingQuestion.id}/move`,
        {
          chapter: moveToChapter,
          lesson: moveToLesson,
          order: 0
        },
        { withCredentials: true }
      );
      
      toast.success(`Question moved to ${moveToChapter} > ${moveToLesson}`);
      setMoveDialogOpen(false);
      setMovingQuestion(null);
      setMoveToChapter("");
      setMoveToLesson("");
      fetchQuestions();
    } catch (error) {
      console.error("Error moving question:", error);
      toast.error("Failed to move question");
    }
  };

  // Bulk operations
  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filteredQuestions.map(q => q.id);
    setSelectedQuestions(visibleIds);
  };

  const deselectAll = () => {
    setSelectedQuestions([]);
  };

  const handleBulkUpdate = async () => {
    if (selectedQuestions.length === 0) {
      toast.error("No questions selected");
      return;
    }

    try {
      const response = await axios.put(
        `${API}/mc-questions/bulk-update`,
        {
          question_ids: selectedQuestions,
          unit_type: bulkUpdateUnitType || undefined,
          unit: bulkUpdateUnit || undefined,
          chapter: bulkUpdateChapter || undefined,
          lesson: bulkUpdateLesson || undefined
        },
        { withCredentials: true }
      );
      
      toast.success(response.data.message);
      setBulkUpdateDialogOpen(false);
      setBulkUpdateUnitType("");
      setBulkUpdateUnit("");
      setBulkUpdateChapter("");
      setBulkUpdateLesson("");
      setSelectedQuestions([]);
      setSelectionMode(false);
      fetchQuestions();
    } catch (error) {
      console.error("Error bulk updating:", error);
      toast.error("Failed to update questions");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) {
      toast.error("No questions selected");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedQuestions.length} questions? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API}/mc-questions/bulk-delete`,
        { 
          data: { question_ids: selectedQuestions },
          withCredentials: true 
        }
      );
      
      toast.success(response.data.message);
      setSelectedQuestions([]);
      setSelectionMode(false);
      fetchQuestions();
    } catch (error) {
      console.error("Error bulk deleting:", error);
      toast.error("Failed to delete questions");
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("CSV file is empty or invalid");
        setUploading(false);
        return;
      }

      // Parse CSV - proper handling of quoted fields with commas
      const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]);
      const questionsData = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const question = {};
        
        headers.forEach((header, index) => {
          question[header] = values[index] || "";
        });
        
        if (question.question_text && question.choice_a) {
          questionsData.push(question);
        }
      }

      if (questionsData.length === 0) {
        toast.error("No valid questions found in CSV");
        setUploading(false);
        return;
      }

      const response = await axios.post(
        `${API}/mc-questions/bulk-upload`,
        { questions: questionsData },
        { withCredentials: true }
      );

      toast.success(`Created ${response.data.created} questions!`);
      if (response.data.errors.length > 0) {
        console.error("Upload errors:", response.data.errors);
        toast.error(`${response.data.errors.length} questions failed - check console`);
      }
      
      setBulkUploadDialogOpen(false);
      fetchQuestions();
    } catch (error) {
      console.error("Error uploading CSV:", error);
      toast.error("Failed to upload CSV");
    } finally {
      setUploading(false);
    }
  };

  const toggleChapter = (chapter) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapter)) {
        newSet.delete(chapter);
      } else {
        newSet.add(chapter);
      }
      return newSet;
    });
  };

  const toggleLesson = (lessonKey) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonKey)) {
        newSet.delete(lessonKey);
      } else {
        newSet.add(lessonKey);
      }
      return newSet;
    });
  };

  const organizeQuestions = () => {
    const organized = {};
    filteredQuestions.forEach(question => {
      const chapter = question.chapter || "Uncategorized";
      const lesson = question.lesson || "Lesson 1";
      
      if (!organized[chapter]) {
        organized[chapter] = {};
      }
      if (!organized[chapter][lesson]) {
        organized[chapter][lesson] = [];
      }
      organized[chapter][lesson].push(question);
    });
    return organized;
  };

  const organizedQuestions = organizeQuestions();

  // Get unit type badge
  const getUnitTypeBadge = (unitType) => {
    const badges = {
      "block": { bg: "bg-purple-100", text: "text-purple-700", label: "🧱 Block" },
      "turtle": { bg: "bg-green-100", text: "text-green-700", label: "🐢 Turtle" },
      "code": { bg: "bg-blue-100", text: "text-blue-700", label: "🐍 Python" },
      "microbit": { bg: "bg-cyan-100", text: "text-cyan-700", label: "⚡ Micro:bit" }
    };
    return badges[unitType] || { bg: "bg-gray-100", text: "text-gray-700", label: "❓ Unassigned" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate("/teacher/dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <FileQuestion className="w-7 h-7 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">Question Bank</span>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Selection Mode Toggle */}
            <Button
              variant={selectionMode ? "default" : "outline"}
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) {
                  setSelectedQuestions([]);
                }
              }}
              className={selectionMode ? "bg-indigo-600" : ""}
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              {selectionMode ? "Exit Selection" : "Select Multiple"}
            </Button>
            
            <Dialog open={bulkUploadDialogOpen} onOpenChange={setBulkUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Upload Questions</DialogTitle>
                  <DialogDescription>Upload a CSV file with your questions</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>CSV Format:</Label>
                    <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-x-auto whitespace-pre-wrap">
question_text,choice_a,choice_b,choice_c,choice_d,correct_answer,unit_type,unit,chapter,lesson,difficulty
What is 2+2?,3,4,5,6,B,code,Unit 3: Python Text,Chapter 1,Lesson 1,Easy</pre>
                    <p className="text-xs text-gray-600 mt-2">
                      • correct_answer should be A, B, C, or D<br/>
                      • unit_type should be block, turtle, code, or microbit<br/>
                      • difficulty should be Easy, Medium, or Hard
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="csv-upload">Select CSV File</Label>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleBulkUpload}
                      disabled={uploading}
                      className="mt-1"
                    />
                  </div>
                  {uploading && <p className="text-sm text-gray-600">Uploading...</p>}
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Multiple Choice Question</DialogTitle>
                  <DialogDescription>Add a new question to your question bank</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateQuestion} className="space-y-4">
                  <div>
                    <Label htmlFor="question_text">Question *</Label>
                    <Textarea
                      id="question_text"
                      placeholder="Enter your question..."
                      value={newQuestion.question_text}
                      onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Answer Choices *</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="A. First choice"
                        value={newQuestion.choice_a}
                        onChange={(e) => setNewQuestion({ ...newQuestion, choice_a: e.target.value })}
                      />
                      <Input
                        placeholder="B. Second choice"
                        value={newQuestion.choice_b}
                        onChange={(e) => setNewQuestion({ ...newQuestion, choice_b: e.target.value })}
                      />
                      <Input
                        placeholder="C. Third choice"
                        value={newQuestion.choice_c}
                        onChange={(e) => setNewQuestion({ ...newQuestion, choice_c: e.target.value })}
                      />
                      <Input
                        placeholder="D. Fourth choice"
                        value={newQuestion.choice_d}
                        onChange={(e) => setNewQuestion({ ...newQuestion, choice_d: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Correct Answer *</Label>
                    <RadioGroup value={newQuestion.correct_answer} onValueChange={(val) => setNewQuestion({ ...newQuestion, correct_answer: val })} className="flex gap-4 mt-1">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="A" id="correct-a" />
                        <Label htmlFor="correct-a">A</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="B" id="correct-b" />
                        <Label htmlFor="correct-b">B</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="C" id="correct-c" />
                        <Label htmlFor="correct-c">C</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="D" id="correct-d" />
                        <Label htmlFor="correct-d">D</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Unit Type</Label>
                      <Select 
                        value={newQuestion.unit_type} 
                        onValueChange={(val) => setNewQuestion({ 
                          ...newQuestion, 
                          unit_type: val,
                          unit: UNIT_TYPE_MAP[val] || ""
                        })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select unit type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select value={newQuestion.difficulty} onValueChange={(val) => setNewQuestion({ ...newQuestion, difficulty: val })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="chapter">Chapter</Label>
                      <Input
                        id="chapter"
                        placeholder="e.g., Chapter 1: Printing"
                        value={newQuestion.chapter}
                        onChange={(e) => setNewQuestion({ ...newQuestion, chapter: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lesson">Lesson</Label>
                      <Input
                        id="lesson"
                        placeholder="e.g., Lesson 1: Intro"
                        value={newQuestion.lesson}
                        onChange={(e) => setNewQuestion({ ...newQuestion, lesson: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                    Create Question
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-6">
        {/* Filters Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Unit Type Filter */}
              <Select value={unitTypeFilter} onValueChange={(v) => {
                setUnitTypeFilter(v);
                if (v && v !== "all") {
                  setSearchParams({ type: v });
                } else {
                  setSearchParams({});
                }
              }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {UNIT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Unit Filter */}
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  <SelectItem value="Unit 1: Block-Based Coding">Unit 1: Block-Based Coding</SelectItem>
                  <SelectItem value="Unit 2: Turtle Graphics">Unit 2: Turtle Graphics</SelectItem>
                  <SelectItem value="Unit 3: Python Text">Unit 3: Python Text</SelectItem>
                  <SelectItem value="Unit 4: Micro:bit">Unit 4: Micro:bit</SelectItem>
                </SelectContent>
              </Select>

              {/* Chapter Filter */}
              <Select value={chapterFilter} onValueChange={setChapterFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Chapters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Chapters</SelectItem>
                  {chapters.map(chapter => (
                    <SelectItem key={chapter} value={chapter}>{chapter}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Lesson Filter */}
              <Select value={lessonFilter} onValueChange={setLessonFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Lessons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lessons</SelectItem>
                  {lessons.map(lesson => (
                    <SelectItem key={lesson} value={lesson}>{lesson}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Difficulty Filter */}
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Selection Mode Actions */}
            {selectionMode && (
              <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                <span className="text-sm text-gray-600">
                  {selectedQuestions.length} selected
                </span>
                <Button variant="outline" size="sm" onClick={selectAllVisible}>
                  Select All Visible ({filteredQuestions.length})
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setBulkUpdateDialogOpen(true)}
                  disabled={selectedQuestions.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Bulk Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleBulkDelete}
                  disabled={selectedQuestions.length === 0}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredQuestions.length} of {questions.length} questions
        </div>

        {loading ? (
          <div className="text-center py-20">Loading questions...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-20">
            <FileQuestion className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {questions.length === 0 ? "No questions yet" : "No questions match your filters"}
            </h3>
            <p className="text-gray-500 mb-6">
              {questions.length === 0 
                ? "Create your first multiple choice question" 
                : "Try adjusting your filters or search term"}
            </p>
            {questions.length === 0 && (
              <Button onClick={() => setCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Question
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(organizedQuestions).sort().map((chapter) => {
              const isChapterExpanded = expandedChapters.has(chapter);
              const lessonsList = organizedQuestions[chapter];
              const chapterQuestionCount = Object.values(lessonsList).reduce((sum, arr) => sum + arr.length, 0);
              
              return (
                <div key={chapter} className="border rounded-lg bg-white shadow-sm">
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleChapter(chapter)}
                  >
                    {isChapterExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                    {isChapterExpanded ? (
                      <FolderOpen className="w-6 h-6 text-blue-500" />
                    ) : (
                      <Folder className="w-6 h-6 text-blue-500" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">{chapter}</h3>
                    <span className="ml-auto text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {chapterQuestionCount} question{chapterQuestionCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {isChapterExpanded && (
                    <div className="pl-8 pr-4 pb-4 space-y-3">
                      {Object.keys(lessonsList).sort().map((lesson) => {
                        const lessonKey = `${chapter}-${lesson}`;
                        const isLessonExpanded = expandedLessons.has(lessonKey);
                        const lessonQuestions = lessonsList[lesson];
                        
                        return (
                          <div key={lessonKey} className="border rounded-lg bg-gray-50">
                            <div
                              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 transition-colors rounded-lg"
                              onClick={() => toggleLesson(lessonKey)}
                            >
                              {isLessonExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                              )}
                              {isLessonExpanded ? (
                                <FolderOpen className="w-5 h-5 text-teal-500" />
                              ) : (
                                <Folder className="w-5 h-5 text-teal-500" />
                              )}
                              <h4 className="text-md font-medium text-gray-800">{lesson}</h4>
                              <span className="ml-auto text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                                {lessonQuestions.length} question{lessonQuestions.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {isLessonExpanded && (
                              <div className="p-3 pt-0 space-y-3">
                                {lessonQuestions.map((question) => {
                                  const badge = getUnitTypeBadge(question.unit_type);
                                  const isSelected = selectedQuestions.includes(question.id);
                                  
                                  return (
                                    <Card 
                                      key={question.id} 
                                      className={`hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
                                    >
                                      <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start gap-2">
                                          <div className="flex items-start gap-2 flex-1">
                                            {selectionMode && (
                                              <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleQuestionSelection(question.id)}
                                                className="mt-1"
                                              />
                                            )}
                                            <CardTitle className="text-base whitespace-pre-wrap">{renderTextWithLineBreaks(question.question_text)}</CardTitle>
                                          </div>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.bg} ${badge.text}`}>
                                              {badge.label}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                              question.difficulty === "Easy" ? "bg-green-100 text-green-700" :
                                              question.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                                              "bg-red-100 text-red-700"
                                            }`}>
                                              {question.difficulty}
                                            </span>
                                          </div>
                                        </div>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="space-y-1 text-sm mb-3">
                                          <div className={question.correct_answer === "A" ? "text-green-600 font-medium" : ""}>
                                            A. {question.choice_a}
                                          </div>
                                          <div className={question.correct_answer === "B" ? "text-green-600 font-medium" : ""}>
                                            B. {question.choice_b}
                                          </div>
                                          <div className={question.correct_answer === "C" ? "text-green-600 font-medium" : ""}>
                                            C. {question.choice_c}
                                          </div>
                                          <div className={question.correct_answer === "D" ? "text-green-600 font-medium" : ""}>
                                            D. {question.choice_d}
                                          </div>
                                        </div>
                                        <div className="text-sm text-green-600 font-medium mb-3">
                                          ✓ Correct Answer: {question.correct_answer}
                                        </div>
                                        {!selectionMode && (
                                          <div className="flex gap-2">
                                            <Button
                                              onClick={() => {
                                                setMovingQuestion(question);
                                                setMoveToChapter(question.chapter || "");
                                                setMoveToLesson(question.lesson || "");
                                                setMoveDialogOpen(true);
                                              }}
                                              variant="outline"
                                              size="sm"
                                              className="flex-1"
                                            >
                                              <FolderInput className="w-4 h-4 mr-1" />
                                              Move
                                            </Button>
                                            <Button
                                              onClick={() => {
                                                setEditingQuestion(question);
                                                setEditDialogOpen(true);
                                              }}
                                              variant="outline"
                                              size="sm"
                                              className="flex-1"
                                            >
                                              <Edit className="w-4 h-4 mr-1" />
                                              Edit
                                            </Button>
                                            <Button
                                              onClick={() => handleDeleteQuestion(question.id)}
                                              variant="outline"
                                              size="sm"
                                              className="text-red-600 hover:text-red-700"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      {editingQuestion && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Question</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateQuestion} className="space-y-4">
              <div>
                <Label htmlFor="edit-question_text">Question *</Label>
                <Textarea
                  id="edit-question_text"
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Answer Choices *</Label>
                <Input
                  placeholder="A."
                  value={editingQuestion.choice_a}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, choice_a: e.target.value })}
                />
                <Input
                  placeholder="B."
                  value={editingQuestion.choice_b}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, choice_b: e.target.value })}
                />
                <Input
                  placeholder="C."
                  value={editingQuestion.choice_c}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, choice_c: e.target.value })}
                />
                <Input
                  placeholder="D."
                  value={editingQuestion.choice_d}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, choice_d: e.target.value })}
                />
              </div>

              <div>
                <Label>Correct Answer *</Label>
                <RadioGroup value={editingQuestion.correct_answer} onValueChange={(val) => setEditingQuestion({ ...editingQuestion, correct_answer: val })} className="flex gap-4 mt-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="A" id="edit-correct-a" />
                    <Label htmlFor="edit-correct-a">A</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="B" id="edit-correct-b" />
                    <Label htmlFor="edit-correct-b">B</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="C" id="edit-correct-c" />
                    <Label htmlFor="edit-correct-c">C</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="D" id="edit-correct-d" />
                    <Label htmlFor="edit-correct-d">D</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Unit Type</Label>
                  <Select 
                    value={editingQuestion.unit_type || ""} 
                    onValueChange={(val) => setEditingQuestion({ 
                      ...editingQuestion, 
                      unit_type: val,
                      unit: UNIT_TYPE_MAP[val] || editingQuestion.unit
                    })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select unit type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select value={editingQuestion.difficulty} onValueChange={(val) => setEditingQuestion({ ...editingQuestion, difficulty: val })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Chapter</Label>
                  <Input
                    value={editingQuestion.chapter}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, chapter: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Lesson</Label>
                  <Input
                    value={editingQuestion.lesson}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, lesson: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                Update Question
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Move Dialog */}
      {movingQuestion && (
        <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move Question</DialogTitle>
              <DialogDescription>
                Move "{movingQuestion.question_text.substring(0, 50)}..." to a different location
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Chapter</Label>
                <Input
                  placeholder="e.g., Chapter 1: Printing"
                  value={moveToChapter}
                  onChange={(e) => setMoveToChapter(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Lesson</Label>
                <Input
                  placeholder="e.g., Lesson 1: Intro"
                  value={moveToLesson}
                  onChange={(e) => setMoveToLesson(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setMoveDialogOpen(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleMoveQuestion} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                  <FolderInput className="w-4 h-4 mr-2" />
                  Move Here
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Update Dialog */}
      <Dialog open={bulkUpdateDialogOpen} onOpenChange={setBulkUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit {selectedQuestions.length} Questions</DialogTitle>
            <DialogDescription>
              Update the unit type, unit, chapter, or lesson for all selected questions.
              Leave fields empty to keep their current values.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Unit Type</Label>
              <Select value={bulkUpdateUnitType} onValueChange={(val) => {
                setBulkUpdateUnitType(val);
                if (val && val !== "keep") {
                  setBulkUpdateUnit(UNIT_TYPE_MAP[val] || "");
                }
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Keep current type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">⏸️ Keep current type</SelectItem>
                  {UNIT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-blue-600 mt-1 font-medium">
                ⚠️ Change this to move questions to a different curriculum!
              </p>
            </div>
            <div>
              <Label>Unit</Label>
              <Input
                placeholder="e.g., Unit 2: Turtle Graphics"
                value={bulkUpdateUnit}
                onChange={(e) => setBulkUpdateUnit(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Examples: "Unit 1: Block-Based Coding", "Unit 2: Turtle Graphics", "Unit 3: Python Text"
              </p>
            </div>
            <div>
              <Label>Chapter</Label>
              <Input
                placeholder="e.g., Chapter 1: Printing"
                value={bulkUpdateChapter}
                onChange={(e) => setBulkUpdateChapter(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Lesson</Label>
              <Input
                placeholder="e.g., Lesson 1: Intro"
                value={bulkUpdateLesson}
                onChange={(e) => setBulkUpdateLesson(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setBulkUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate} className="bg-indigo-600 hover:bg-indigo-700">
              Update {selectedQuestions.length} Questions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
