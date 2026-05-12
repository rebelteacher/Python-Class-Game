import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit, 
  Brain, 
  FileQuestion,
  Users,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Download,
  Send,
  Calendar
} from "lucide-react";
import * as XLSX from "xlsx";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Predefined skill categories
const SKILL_CATEGORIES = [
  "Turtle - First Steps",
  "Turtle - Loops",
  "Turtle - Colors & Pen",
  "Turtle - Conditionals",
  "Turtle - Functions",
  "Micro:bit - LED Display",
  "Micro:bit - Buttons",
  "Micro:bit - Sensors",
  "Micro:bit - External Components",
  "Block - Output & Print",
  "Block - Variables",
  "Block - Loops",
  "Block - Conditionals",
  "Python - Variables",
  "Python - Strings",
  "Python - Lists",
  "Python - Loops",
  "Python - Functions"
];

export default function SkillQuizManager({ user }) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [questionsByCategory, setQuestionsByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  
  // Results state
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [quizResults, setQuizResults] = useState(null);
  
  // Assign quiz state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignCategory, setAssignCategory] = useState("");
  const [assignClassroom, setAssignClassroom] = useState("");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assigning, setAssigning] = useState(false);
  
  // New question form
  const [newQuestion, setNewQuestion] = useState({
    skill_category: "",
    question_text: "",
    choice_a: "",
    choice_b: "",
    choice_c: "",
    choice_d: "",
    correct_answer: "A",
    explanation: "",
    concept_tags: []
  });

  useEffect(() => {
    fetchQuestions();
    fetchClassrooms();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(`${API}/skill-quiz/questions`, { withCredentials: true });
      setQuestions(response.data.questions || []);
      setQuestionsByCategory(response.data.by_category || {});
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load quiz questions");
    } finally {
      setLoading(false);
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

  const fetchResults = async () => {
    if (!selectedCategory) {
      toast.warning("Please select a skill category");
      return;
    }
    
    try {
      const params = new URLSearchParams();
      if (selectedClassroom && selectedClassroom !== "all") {
        params.append("classroom_id", selectedClassroom);
      }
      
      const response = await axios.get(
        `${API}/skill-quiz/results/${encodeURIComponent(selectedCategory)}?${params.toString()}`,
        { withCredentials: true }
      );
      setQuizResults(response.data);
    } catch (error) {
      console.error("Error fetching results:", error);
      toast.error("Failed to load results");
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.skill_category || !newQuestion.question_text) {
      toast.error("Please fill in skill category and question text");
      return;
    }
    
    try {
      await axios.post(`${API}/skill-quiz/questions`, newQuestion, { withCredentials: true });
      toast.success("Question added successfully!");
      setShowAddDialog(false);
      setNewQuestion({
        skill_category: "",
        question_text: "",
        choice_a: "",
        choice_b: "",
        choice_c: "",
        choice_d: "",
        correct_answer: "A",
        explanation: "",
        concept_tags: []
      });
      fetchQuestions();
    } catch (error) {
      console.error("Error adding question:", error);
      toast.error("Failed to add question");
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    
    try {
      await axios.delete(`${API}/skill-quiz/questions/${questionId}`, { withCredentials: true });
      toast.success("Question deleted");
      fetchQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const exportResults = () => {
    if (!quizResults || !quizResults.attempts || quizResults.attempts.length === 0) {
      toast.warning("No results to export");
      return;
    }

    const data = quizResults.attempts.map(a => ({
      "Student Name": a.student_name,
      "Score (%)": a.score.toFixed(1),
      "Correct": a.correct_count,
      "Total": a.total_questions,
      "Date": new Date(a.submitted_at).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quiz Results");
    XLSX.writeFile(wb, `skill_quiz_results_${selectedCategory.replace(/\s+/g, '_')}.xlsx`);
    toast.success("Results exported!");
  };

  const handleAssignQuiz = async () => {
    if (!assignCategory) {
      toast.error("Please select a skill category");
      return;
    }
    if (!assignClassroom) {
      toast.error("Please select a classroom");
      return;
    }
    
    // Check if there are questions for this category
    const categoryQuestions = questionsByCategory[assignCategory];
    if (!categoryQuestions || categoryQuestions.length === 0) {
      toast.error("No questions available for this skill category");
      return;
    }
    
    setAssigning(true);
    try {
      const response = await axios.post(`${API}/skill-quiz/assign`, {
        skill_category: assignCategory,
        classroom_id: assignClassroom,
        title: assignTitle || `${assignCategory} Quiz`,
        due_date: assignDueDate || null
      }, { withCredentials: true });
      
      toast.success(`Quiz assigned! ${categoryQuestions.length} questions assigned to class.`);
      setShowAssignDialog(false);
      setAssignCategory("");
      setAssignClassroom("");
      setAssignTitle("");
      setAssignDueDate("");
    } catch (error) {
      console.error("Error assigning quiz:", error);
      toast.error(error.response?.data?.detail || "Failed to assign quiz");
    } finally {
      setAssigning(false);
    }
  };

  const openAssignDialog = (category = "") => {
    setAssignCategory(category);
    setAssignTitle(category ? `${category} Quiz` : "");
    setShowAssignDialog(true);
  };

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/teacher/dashboard")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Skill Quiz Manager</h1>
              <p className="text-purple-100">Create quizzes and view student results</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="questions" className="flex items-center gap-2">
              <FileQuestion className="w-4 h-4" />
              Questions
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Results
            </TabsTrigger>
          </TabsList>

          {/* Questions Tab */}
          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Quiz Questions</CardTitle>
                    <CardDescription>
                      {questions.length} questions across {Object.keys(questionsByCategory).length} skills
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => openAssignDialog()} variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50">
                      <Send className="w-4 h-4 mr-2" />
                      Assign Quiz
                    </Button>
                    <Button onClick={() => setShowAddDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading questions...</div>
                ) : Object.keys(questionsByCategory).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No quiz questions yet. Add your first question!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(questionsByCategory).map(([category, categoryQuestions]) => (
                      <div key={category} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                          <button
                            onClick={() => toggleCategory(category)}
                            className="flex items-center gap-3 flex-1"
                          >
                            {expandedCategories[category] ? (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                            <span className="font-medium">{category}</span>
                            <span className="text-sm text-gray-500">
                              ({categoryQuestions.length} questions)
                            </span>
                          </button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssignDialog(category);
                            }}
                            className="border-purple-300 text-purple-600 hover:bg-purple-50"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Assign
                          </Button>
                        </div>
                        
                        {expandedCategories[category] && (
                          <div className="divide-y">
                            {categoryQuestions.map((q, idx) => (
                              <div key={q.id} className="p-4 flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <p className="font-medium text-sm mb-1">
                                    Q{idx + 1}: {q.question_text}
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-2">
                                    <span className={q.correct_answer === "A" ? "text-green-600 font-medium" : ""}>
                                      A: {q.choice_a}
                                    </span>
                                    <span className={q.correct_answer === "B" ? "text-green-600 font-medium" : ""}>
                                      B: {q.choice_b}
                                    </span>
                                    <span className={q.correct_answer === "C" ? "text-green-600 font-medium" : ""}>
                                      C: {q.choice_c}
                                    </span>
                                    <span className={q.correct_answer === "D" ? "text-green-600 font-medium" : ""}>
                                      D: {q.choice_d}
                                    </span>
                                  </div>
                                  {q.concept_tags && q.concept_tags.length > 0 && (
                                    <div className="flex gap-1 mt-2">
                                      {q.concept_tags.map((tag, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Results</CardTitle>
                <CardDescription>View student quiz performance by skill</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <Label>Skill Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select skill..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SKILL_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label>Classroom (Optional)</Label>
                    <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All classrooms..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classrooms</SelectItem>
                        {classrooms.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={fetchResults} className="bg-purple-600 hover:bg-purple-700">
                      Load Results
                    </Button>
                  </div>
                </div>

                {quizResults && (
                  <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4">
                      <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-purple-700">
                            {quizResults.stats.total_attempts}
                          </div>
                          <div className="text-sm text-purple-600">Total Attempts</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-700">
                            {quizResults.stats.average_score.toFixed(1)}%
                          </div>
                          <div className="text-sm text-green-600">Average Score</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-blue-700">
                            {quizResults.stats.highest_score.toFixed(1)}%
                          </div>
                          <div className="text-sm text-blue-600">Highest Score</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-orange-50 border-orange-200">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-orange-700">
                            {quizResults.stats.lowest_score.toFixed(1)}%
                          </div>
                          <div className="text-sm text-orange-600">Lowest Score</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Export Button */}
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={exportResults}>
                        <Download className="w-4 h-4 mr-2" />
                        Export to Excel
                      </Button>
                    </div>

                    {/* Results Table */}
                    {quizResults.attempts && quizResults.attempts.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Score</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Correct</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {quizResults.attempts.map((attempt) => (
                              <tr key={attempt.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">{attempt.student_name}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`font-medium ${
                                    attempt.score >= 80 ? 'text-green-600' :
                                    attempt.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {attempt.score.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center text-gray-600">
                                  {attempt.correct_count} / {attempt.total_questions}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-500 text-sm">
                                  {new Date(attempt.submitted_at).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No quiz attempts for this skill yet.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Question Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Quiz Question</DialogTitle>
            <DialogDescription>
              Create a new multiple choice question for skill assessment
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Skill Category *</Label>
              <Select 
                value={newQuestion.skill_category} 
                onValueChange={(val) => setNewQuestion({...newQuestion, skill_category: val})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select skill..." />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Question Text *</Label>
              <Textarea
                value={newQuestion.question_text}
                onChange={(e) => setNewQuestion({...newQuestion, question_text: e.target.value})}
                placeholder="What does the forward(100) command do?"
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Choice A *</Label>
                <Input
                  value={newQuestion.choice_a}
                  onChange={(e) => setNewQuestion({...newQuestion, choice_a: e.target.value})}
                  placeholder="First choice"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Choice B *</Label>
                <Input
                  value={newQuestion.choice_b}
                  onChange={(e) => setNewQuestion({...newQuestion, choice_b: e.target.value})}
                  placeholder="Second choice"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Choice C *</Label>
                <Input
                  value={newQuestion.choice_c}
                  onChange={(e) => setNewQuestion({...newQuestion, choice_c: e.target.value})}
                  placeholder="Third choice"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Choice D *</Label>
                <Input
                  value={newQuestion.choice_d}
                  onChange={(e) => setNewQuestion({...newQuestion, choice_d: e.target.value})}
                  placeholder="Fourth choice"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Correct Answer *</Label>
              <Select 
                value={newQuestion.correct_answer} 
                onValueChange={(val) => setNewQuestion({...newQuestion, correct_answer: val})}
              >
                <SelectTrigger className="mt-1 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Explanation (shown after answering)</Label>
              <Textarea
                value={newQuestion.explanation}
                onChange={(e) => setNewQuestion({...newQuestion, explanation: e.target.value})}
                placeholder="Explain why this answer is correct..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label>Concept Tags (comma-separated)</Label>
              <Input
                value={newQuestion.concept_tags.join(", ")}
                onChange={(e) => setNewQuestion({
                  ...newQuestion, 
                  concept_tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean)
                })}
                placeholder="forward(), distance, pixels"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddQuestion} className="bg-purple-600 hover:bg-purple-700">
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Quiz Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-600" />
              Assign Quiz to Class
            </DialogTitle>
            <DialogDescription>
              Assign a skill quiz to your students
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Skill Category *</Label>
              <Select value={assignCategory} onValueChange={setAssignCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a skill category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(questionsByCategory).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat} ({questionsByCategory[cat].length} questions)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Classroom *</Label>
              <Select value={assignClassroom} onValueChange={setAssignClassroom}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a classroom" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quiz Title</Label>
              <Input
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                placeholder="e.g., Loops Practice Quiz"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Due Date (optional)
              </Label>
              <Input
                type="date"
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
                className="mt-1"
              />
            </div>

            {assignCategory && questionsByCategory[assignCategory] && (
              <div className="bg-purple-50 p-3 rounded-lg text-sm">
                <p className="font-medium text-purple-800">
                  This quiz will include {questionsByCategory[assignCategory].length} questions
                </p>
                <p className="text-purple-600 mt-1">
                  Students will see it in their assignments list
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignQuiz} 
              disabled={assigning || !assignCategory || !assignClassroom}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {assigning ? "Assigning..." : "Assign Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
