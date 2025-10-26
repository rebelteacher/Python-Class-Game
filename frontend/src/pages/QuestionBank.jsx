import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Plus, Edit, Trash2, FileQuestion, Folder, FolderOpen, ChevronRight, ChevronDown, Upload } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function QuestionBank({ user }) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    choice_a: "",
    choice_b: "",
    choice_c: "",
    choice_d: "",
    correct_answer: "A",
    chapter: "",
    lesson: "",
    difficulty: "Easy"
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

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

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    
    if (!newQuestion.question_text.trim() || !newQuestion.choice_a.trim() || 
        !newQuestion.choice_b.trim() || !newQuestion.choice_c.trim() || 
        !newQuestion.choice_d.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await axios.post(`${API}/mc-questions`, newQuestion, {
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
    questions.forEach(question => {
      const chapter = question.chapter || "Uncategorized";
      const lesson = question.lesson || "General";
      
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
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
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
                  <RadioGroup value={newQuestion.correct_answer} onValueChange={(val) => setNewQuestion({ ...newQuestion, correct_answer: val })}>
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="chapter">Chapter</Label>
                    <Input
                      id="chapter"
                      placeholder="e.g., Chapter 1"
                      value={newQuestion.chapter}
                      onChange={(e) => setNewQuestion({ ...newQuestion, chapter: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lesson">Lesson</Label>
                    <Input
                      id="lesson"
                      placeholder="e.g., Lesson 1"
                      value={newQuestion.lesson}
                      onChange={(e) => setNewQuestion({ ...newQuestion, lesson: e.target.value })}
                      className="mt-1"
                    />
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

                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                  Create Question
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center py-20">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-20">
            <FileQuestion className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No questions yet</h3>
            <p className="text-gray-500 mb-6">Create your first multiple choice question</p>
            <Button onClick={() => setCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Question
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(organizedQuestions).sort().map((chapter) => {
              const isChapterExpanded = expandedChapters.has(chapter);
              const lessons = organizedQuestions[chapter];
              
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
                      {Object.keys(lessons).length} lesson{Object.keys(lessons).length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {isChapterExpanded && (
                    <div className="pl-8 pr-4 pb-4 space-y-3">
                      {Object.keys(lessons).sort().map((lesson) => {
                        const lessonKey = `${chapter}-${lesson}`;
                        const isLessonExpanded = expandedLessons.has(lessonKey);
                        const lessonQuestions = lessons[lesson];
                        
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
                                {lessonQuestions.map((question) => (
                                  <Card key={question.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader>
                                      <div className="flex justify-between items-start">
                                        <CardTitle className="text-base">{question.question_text}</CardTitle>
                                        <div className={`px-2 py-1 rounded text-xs font-semibold ${
                                          question.difficulty === "Easy" ? "bg-green-100 text-green-700" :
                                          question.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                                          "bg-red-100 text-red-700"
                                        }`}>
                                          {question.difficulty}
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-1 text-sm mb-3">
                                        <div>A. {question.choice_a}</div>
                                        <div>B. {question.choice_b}</div>
                                        <div>C. {question.choice_c}</div>
                                        <div>D. {question.choice_d}</div>
                                      </div>
                                      <div className="text-sm text-green-600 font-medium mb-3">
                                        ✓ Correct Answer: {question.correct_answer}
                                      </div>
                                      <div className="flex gap-2">
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
                                    </CardContent>
                                  </Card>
                                ))}
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
          <DialogContent className="max-w-2xl">
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
                <RadioGroup value={editingQuestion.correct_answer} onValueChange={(val) => setEditingQuestion({ ...editingQuestion, correct_answer: val })}>
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

              <div className="grid grid-cols-3 gap-4">
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

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                Update Question
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
