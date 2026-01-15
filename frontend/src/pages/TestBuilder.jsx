import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, FileQuestion, Folder, FolderOpen, ChevronRight, ChevronDown, X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TestBuilder({ user }) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [creating, setCreating] = useState(false);
  
  const [testData, setTestData] = useState({
    title: "",
    description: "",
    chapter: "",
    lesson: "",
    num_questions: "",
    time_limit_minutes: "",
    available_date: "",
    due_date: "",
    classroom_ids: [],
    allow_retake: false,
    show_answers_after: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [questionsRes, classroomsRes] = await Promise.all([
        axios.get(`${API}/mc-questions`, { withCredentials: true }),
        axios.get(`${API}/classrooms`, { withCredentials: true })
      ]);
      setQuestions(questionsRes.data);
      setClassrooms(classroomsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
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

  const toggleQuestion = (questionId) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const toggleClassroom = (classroomId) => {
    setTestData(prev => {
      const classroom_ids = prev.classroom_ids.includes(classroomId)
        ? prev.classroom_ids.filter(id => id !== classroomId)
        : [...prev.classroom_ids, classroomId];
      return { ...prev, classroom_ids };
    });
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    
    if (!testData.title.trim()) {
      toast.error("Please enter a test title");
      return;
    }

    if (selectedQuestions.size === 0) {
      toast.error("Please select at least one question");
      return;
    }

    const numQuestions = parseInt(testData.num_questions);
    if (!numQuestions || numQuestions <= 0) {
      toast.error("Please enter number of questions");
      return;
    }

    if (numQuestions > selectedQuestions.size) {
      toast.error("Number of questions exceeds selected question pool");
      return;
    }

    if (testData.classroom_ids.length === 0) {
      toast.error("Please select at least one classroom");
      return;
    }

    setCreating(true);

    try {
      await axios.post(
        `${API}/mc-tests`,
        {
          title: testData.title,
          description: testData.description,
          chapter: testData.chapter,
          lesson: testData.lesson,
          question_pool_ids: Array.from(selectedQuestions),
          num_questions: numQuestions,
          time_limit_minutes: parseInt(testData.time_limit_minutes) || 0,
          classroom_ids: testData.classroom_ids,
          available_date: testData.available_date || null,
          due_date: testData.due_date || null,
          allow_retake: testData.allow_retake,
          show_answers_after: testData.show_answers_after
        },
        { withCredentials: true }
      );
      
      toast.success("Test created successfully!");
      navigate("/teacher/dashboard");
    } catch (error) {
      console.error("Error creating test:", error);
      toast.error(error.response?.data?.detail || "Failed to create test");
    } finally {
      setCreating(false);
    }
  };

  const organizeQuestions = () => {
    const organized = {};
    questions.forEach(question => {
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

  const removeSelectedQuestion = (questionId) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      newSet.delete(questionId);
      return newSet;
    });
  };

  const getSelectedQuestionsList = () => {
    return questions.filter(q => selectedQuestions.has(q.id));
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
              <span className="text-xl font-bold text-gray-900">Test Builder</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center py-20">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Test Configuration */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Test Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateTest} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Test Title *</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Chapter 1 Quiz"
                        value={testData.title}
                        onChange={(e) => setTestData({ ...testData, title: e.target.value })}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Test description..."
                        value={testData.description}
                        onChange={(e) => setTestData({ ...testData, description: e.target.value })}
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="chapter">Chapter</Label>
                        <Input
                          id="chapter"
                          placeholder="e.g., Chapter 1"
                          value={testData.chapter}
                          onChange={(e) => setTestData({ ...testData, chapter: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lesson">Lesson</Label>
                        <Input
                          id="lesson"
                          placeholder="e.g., Lesson 1"
                          value={testData.lesson}
                          onChange={(e) => setTestData({ ...testData, lesson: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="num_questions">Number of Questions Per Student *</Label>
                      <Input
                        id="num_questions"
                        type="number"
                        min="1"
                        placeholder="e.g., 10"
                        value={testData.num_questions}
                        onChange={(e) => setTestData({ ...testData, num_questions: e.target.value })}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Each student will get this many random questions from your selected pool
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                      <Input
                        id="time_limit"
                        type="number"
                        min="0"
                        placeholder="0 = no limit"
                        value={testData.time_limit_minutes}
                        onChange={(e) => setTestData({ ...testData, time_limit_minutes: e.target.value })}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="available_date">Available From (Central Time)</Label>
                      <Input
                        id="available_date"
                        type="datetime-local"
                        value={testData.available_date}
                        onChange={(e) => setTestData({ ...testData, available_date: e.target.value })}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Test will appear to students on this date/time
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="due_date">Due Date (Central Time)</Label>
                      <Input
                        id="due_date"
                        type="datetime-local"
                        value={testData.due_date}
                        onChange={(e) => setTestData({ ...testData, due_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Assign to Classrooms *</Label>
                      <div className="space-y-2 mt-2 max-h-40 overflow-y-auto border rounded p-3">
                        {classrooms.length === 0 ? (
                          <p className="text-sm text-gray-500">No classrooms available</p>
                        ) : (
                          classrooms.map((classroom) => (
                            <div key={classroom.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`classroom-${classroom.id}`}
                                checked={testData.classroom_ids.includes(classroom.id)}
                                onCheckedChange={() => toggleClassroom(classroom.id)}
                              />
                              <Label
                                htmlFor={`classroom-${classroom.id}`}
                                className="cursor-pointer"
                              >
                                {classroom.name}
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Test Options */}
                    <div className="space-y-3 pt-4 border-t">
                      <Label className="text-base font-semibold">Test Options</Label>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="allow_retake"
                          checked={testData.allow_retake}
                          onCheckedChange={(checked) => setTestData({ ...testData, allow_retake: checked })}
                        />
                        <Label htmlFor="allow_retake" className="cursor-pointer">
                          Allow students to retake this test
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="show_answers_after"
                          checked={testData.show_answers_after}
                          onCheckedChange={(checked) => setTestData({ ...testData, show_answers_after: checked })}
                        />
                        <Label htmlFor="show_answers_after" className="cursor-pointer">
                          Show correct answers after submission
                        </Label>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={creating}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      {creating ? "Creating..." : "Create Test"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Middle: Question Bank */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Select Questions ({selectedQuestions.size} selected)</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto">
                  {questions.length === 0 ? (
                    <p className="text-center text-gray-500 py-10">
                      No questions available. Create questions first.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Object.keys(organizedQuestions).sort().map((chapter) => {
                        const isChapterExpanded = expandedChapters.has(chapter);
                        const lessons = organizedQuestions[chapter];
                        
                        return (
                          <div key={chapter} className="border rounded-lg">
                            <div
                              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50"
                              onClick={() => toggleChapter(chapter)}
                            >
                              {isChapterExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <Folder className="w-5 h-5 text-blue-500" />
                              <span className="font-medium text-sm">{chapter}</span>
                            </div>

                            {isChapterExpanded && (
                              <div className="pl-6 pr-3 pb-3 space-y-2">
                                {Object.keys(lessons).sort().map((lesson) => {
                                  const lessonKey = `${chapter}-${lesson}`;
                                  const isLessonExpanded = expandedLessons.has(lessonKey);
                                  const lessonQuestions = lessons[lesson];
                                  
                                  return (
                                    <div key={lessonKey} className="border rounded">
                                      <div
                                        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-50"
                                        onClick={() => toggleLesson(lessonKey)}
                                      >
                                        {isLessonExpanded ? (
                                          <ChevronDown className="w-3 h-3" />
                                        ) : (
                                          <ChevronRight className="w-3 h-3" />
                                        )}
                                        <Folder className="w-4 h-4 text-teal-500" />
                                        <span className="text-xs font-medium">{lesson}</span>
                                      </div>

                                      {isLessonExpanded && (
                                        <div className="p-2 space-y-2">
                                          {lessonQuestions.map((question) => (
                                            <div
                                              key={question.id}
                                              className="flex items-start space-x-2 p-2 border rounded hover:bg-gray-50"
                                            >
                                              <Checkbox
                                                id={`q-${question.id}`}
                                                checked={selectedQuestions.has(question.id)}
                                                onCheckedChange={() => toggleQuestion(question.id)}
                                              />
                                              <Label
                                                htmlFor={`q-${question.id}`}
                                                className="text-xs cursor-pointer flex-1"
                                              >
                                                {question.question_text}
                                              </Label>
                                            </div>
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
                </CardContent>
              </Card>
            </div>

            {/* Right: Selected Questions */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Question Pool ({selectedQuestions.size})</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto">
                  {selectedQuestions.size === 0 ? (
                    <p className="text-center text-gray-500 py-10">
                      No questions selected yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {getSelectedQuestionsList().map((question) => (
                        <div
                          key={question.id}
                          className="border rounded p-3 bg-blue-50"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-xs flex-1">{question.question_text}</p>
                            <Button
                              onClick={() => removeSelectedQuestion(question.id)}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs bg-white px-2 py-1 rounded">
                              {question.chapter || "No chapter"}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              question.difficulty === "Easy" ? "bg-green-100 text-green-700" :
                              question.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {question.difficulty}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
