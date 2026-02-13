import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, Plus, ArrowLeft, Edit, Trash2, Eye, Copy, ChevronDown, ChevronRight, 
  Save, FileText, Code, Target, Zap, GraduationCap, Play, CheckCircle, 
  Video, Image, Link, ExternalLink, Dumbbell, HelpCircle
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Format lesson content (markdown-like) to HTML for preview
const formatLessonContent = (content) => {
  if (!content) return "";
  
  const escapeHtml = (text) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  let result = content;
  
  // First, convert escaped newlines to actual newlines
  result = result.replace(/\\n/g, '\n');

  // Process fenced code blocks first
  result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const escapedCode = escapeHtml(code.trim());
    return `<pre class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto my-4 text-sm font-mono"><code>${escapedCode}</code></pre>`;
  });

  // Process inline code
  result = result.replace(/`([^`]+)`/g, (match, code) => {
    const escapedCode = escapeHtml(code);
    return `<code class="bg-gray-200 px-1.5 py-0.5 rounded text-purple-700 font-mono text-sm">${escapedCode}</code>`;
  });

  // Process markdown formatting
  result = result
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-indigo-700 mb-4">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-purple-600 mb-3 mt-6">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-green-600 mb-2 mt-4">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-600">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-purple-500">$1</em>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 mb-1">• $1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 mb-1 list-decimal">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br>');

  return result;
};

export default function LessonPlanCreator({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [previewLesson, setPreviewLesson] = useState(null);
  const [activeTab, setActiveTab] = useState("content");
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  
  // New lesson form state
  const [newLesson, setNewLesson] = useState({
    lesson_id: "",
    module_id: "batesville-jh",
    title: "",
    description: "",
    order: 1,
    content: "",
    exercise_type: "code",
    starter_code: "",
    solution_code: "",
    validation_rules: {
      required_tags: [],
      required_attributes: [],
      required_text: [],
      css_properties: []
    },
    xp_reward: 100,
    practice: []
  });

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const response = await axios.get(`${API}/lesson-plans`, {
        withCredentials: true,
      });
      setLessons(response.data);
    } catch (error) {
      console.error("Error fetching lesson plans:", error);
      // If endpoint doesn't exist yet, show empty state
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    
    if (!newLesson.title.trim()) {
      toast.error("Please enter a lesson title");
      return;
    }
    
    if (!newLesson.lesson_id.trim()) {
      toast.error("Please enter a lesson ID");
      return;
    }

    try {
      await axios.post(
        `${API}/lesson-plans`,
        newLesson,
        { withCredentials: true }
      );
      toast.success("Lesson plan created!");
      setCreateDialogOpen(false);
      resetNewLesson();
      fetchLessons();
    } catch (error) {
      console.error("Error creating lesson plan:", error);
      toast.error(error.response?.data?.detail || "Failed to create lesson plan");
    }
  };

  const handleUpdateLesson = async (e) => {
    e.preventDefault();
    
    if (!editingLesson) return;

    try {
      await axios.put(
        `${API}/lesson-plans/${editingLesson._id || editingLesson.id}`,
        editingLesson,
        { withCredentials: true }
      );
      toast.success("Lesson plan updated!");
      setEditDialogOpen(false);
      setEditingLesson(null);
      fetchLessons();
    } catch (error) {
      console.error("Error updating lesson plan:", error);
      toast.error("Failed to update lesson plan");
    }
  };

  const handleDeleteLesson = async (lessonId, lessonTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${lessonTitle}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      await axios.delete(`${API}/lesson-plans/${lessonId}`, {
        withCredentials: true
      });
      toast.success("Lesson plan deleted!");
      fetchLessons();
    } catch (error) {
      console.error("Error deleting lesson plan:", error);
      toast.error("Failed to delete lesson plan");
    }
  };

  const handleDuplicateLesson = async (lesson) => {
    const duplicated = {
      ...lesson,
      lesson_id: `${lesson.lesson_id}-copy`,
      title: `${lesson.title} (Copy)`,
    };
    delete duplicated._id;
    delete duplicated.id;

    try {
      await axios.post(
        `${API}/lesson-plans`,
        duplicated,
        { withCredentials: true }
      );
      toast.success("Lesson plan duplicated!");
      fetchLessons();
    } catch (error) {
      console.error("Error duplicating lesson plan:", error);
      toast.error("Failed to duplicate lesson plan");
    }
  };

  const resetNewLesson = () => {
    setNewLesson({
      lesson_id: "",
      module_id: "batesville-jh",
      title: "",
      description: "",
      order: 1,
      content: "",
      exercise_type: "code",
      starter_code: "",
      solution_code: "",
      validation_rules: {
        required_tags: [],
        required_attributes: [],
        required_text: [],
        css_properties: []
      },
      xp_reward: 100,
      practice: []
    });
    setActiveTab("content");
  };

  const openEditDialog = (lesson) => {
    setEditingLesson({
      ...lesson,
      validation_rules: lesson.validation_rules || {
        required_tags: [],
        required_attributes: [],
        required_text: [],
        css_properties: []
      },
      practice: lesson.practice || []
    });
    setEditDialogOpen(true);
    setActiveTab("content");
  };

  const openPreview = (lesson) => {
    setPreviewLesson(lesson);
    setPreviewDialogOpen(true);
  };

  // Filter lessons
  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = !searchTerm || 
      lesson.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.lesson_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = moduleFilter === "all" || lesson.module_id === moduleFilter;
    
    return matchesSearch && matchesModule;
  });

  // Get unique modules
  const modules = [...new Set(lessons.map(l => l.module_id).filter(Boolean))];

  // Add practice exercise to lesson
  const addPracticeExercise = (lessonState, setLessonState) => {
    const practice = [...(lessonState.practice || [])];
    const exerciseNum = practice.length + 1;
    practice.push({
      exercise_id: `${lessonState.lesson_id}-p${exerciseNum}`,
      title: `Practice Exercise ${exerciseNum}`,
      instructions: "",
      starter_code: "",
      solution_code: "",
      validation_rules: {
        required_tags: [],
        required_text: []
      },
      hints: [],
      xp_reward: 25
    });
    setLessonState({ ...lessonState, practice });
  };

  // Remove practice exercise
  const removePracticeExercise = (lessonState, setLessonState, index) => {
    const practice = lessonState.practice.filter((_, i) => i !== index);
    setLessonState({ ...lessonState, practice });
  };

  // Update practice exercise
  const updatePracticeExercise = (lessonState, setLessonState, index, field, value) => {
    const practice = [...lessonState.practice];
    practice[index] = { ...practice[index], [field]: value };
    setLessonState({ ...lessonState, practice });
  };

  // Render the lesson form (used in both create and edit dialogs)
  const renderLessonForm = (lessonState, setLessonState, onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="content" className="gap-1">
            <FileText className="w-4 h-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="code" className="gap-1">
            <Code className="w-4 h-4" />
            Code
          </TabsTrigger>
          <TabsTrigger value="validation" className="gap-1">
            <Target className="w-4 h-4" />
            Validation
          </TabsTrigger>
          <TabsTrigger value="practice" className="gap-1">
            <Dumbbell className="w-4 h-4" />
            Practice
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lesson_id">Lesson ID *</Label>
              <Input
                id="lesson_id"
                placeholder="e.g., python-01-intro"
                value={lessonState.lesson_id}
                onChange={(e) => setLessonState({ ...lessonState, lesson_id: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Unique identifier (module-number-name)</p>
            </div>
            <div>
              <Label htmlFor="module_id">Module</Label>
              <Input
                id="module_id"
                placeholder="e.g., batesville-jh"
                value={lessonState.module_id}
                onChange={(e) => setLessonState({ ...lessonState, module_id: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Batesville Junior High School</p>
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Introduction to Variables"
              value={lessonState.title}
              onChange={(e) => setLessonState({ ...lessonState, title: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Short description for curriculum page"
              value={lessonState.description}
              onChange={(e) => setLessonState({ ...lessonState, description: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="order">Order</Label>
              <Input
                id="order"
                type="number"
                min="1"
                value={lessonState.order}
                onChange={(e) => setLessonState({ ...lessonState, order: parseInt(e.target.value) || 1 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="xp_reward">XP Reward</Label>
              <Input
                id="xp_reward"
                type="number"
                min="0"
                step="25"
                value={lessonState.xp_reward}
                onChange={(e) => setLessonState({ ...lessonState, xp_reward: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="exercise_type">Exercise Type</Label>
            <Select 
              value={lessonState.exercise_type} 
              onValueChange={(val) => setLessonState({ ...lessonState, exercise_type: val })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code">Code Exercise</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="quiz">Quiz Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="content">Lesson Content</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openPreview(lessonState)}
                className="gap-1"
              >
                <Eye className="w-3 h-3" />
                Preview
              </Button>
            </div>
            <Textarea
              id="content"
              placeholder={`# Lesson Title 📚

Write your lesson content using markdown-like formatting:

## Section Title

Regular text with **bold** and *italic*.

### Subsection

Use \`backticks\` for inline code.

\`\`\`python
# Code blocks
print("Hello World!")
\`\`\`

- Bullet points
- Another item

1. Numbered lists
2. Second item

## Your Challenge 🎯

Describe what students should do.`}
              value={lessonState.content}
              onChange={(e) => setLessonState({ ...lessonState, content: e.target.value })}
              className="mt-1 font-mono text-sm"
              rows={12}
            />
            <p className="text-xs text-gray-500 mt-1">
              Use markdown: # H1, ## H2, **bold**, *italic*, `code`, ```code blocks```
            </p>
          </div>
        </TabsContent>

        {/* Code Tab */}
        <TabsContent value="code" className="space-y-4 mt-4">
          <div>
            <Label htmlFor="starter_code">Starter Code</Label>
            <p className="text-xs text-gray-500 mb-2">Pre-filled code that students will see</p>
            <Textarea
              id="starter_code"
              placeholder="# Write your code here..."
              value={lessonState.starter_code}
              onChange={(e) => setLessonState({ ...lessonState, starter_code: e.target.value })}
              className="mt-1 font-mono text-sm"
              rows={8}
            />
          </div>

          <div>
            <Label htmlFor="solution_code">Solution Code *</Label>
            <p className="text-xs text-gray-500 mb-2">Correct solution (for reference/grading)</p>
            <Textarea
              id="solution_code"
              placeholder="# Solution:\nprint('Hello World!')"
              value={lessonState.solution_code}
              onChange={(e) => setLessonState({ ...lessonState, solution_code: e.target.value })}
              className="mt-1 font-mono text-sm"
              rows={8}
            />
          </div>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-4 mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4" />
              Validation Rules Help
            </h4>
            <p className="text-sm text-blue-700">
              These rules auto-check student code. Leave empty for AI-only grading.
            </p>
          </div>

          <div>
            <Label>Required Tags (one per line)</Label>
            <Textarea
              placeholder="h1&#10;p&#10;div"
              value={lessonState.validation_rules?.required_tags?.join('\n') || ''}
              onChange={(e) => setLessonState({
                ...lessonState,
                validation_rules: {
                  ...lessonState.validation_rules,
                  required_tags: e.target.value.split('\n').filter(t => t.trim())
                }
              })}
              className="mt-1 font-mono text-sm"
              rows={4}
            />
          </div>

          <div>
            <Label>Required Attributes (one per line)</Label>
            <Textarea
              placeholder="src&#10;href&#10;alt"
              value={lessonState.validation_rules?.required_attributes?.join('\n') || ''}
              onChange={(e) => setLessonState({
                ...lessonState,
                validation_rules: {
                  ...lessonState.validation_rules,
                  required_attributes: e.target.value.split('\n').filter(a => a.trim())
                }
              })}
              className="mt-1 font-mono text-sm"
              rows={4}
            />
          </div>

          <div>
            <Label>Required Text (one per line)</Label>
            <Textarea
              placeholder="Hello&#10;World"
              value={lessonState.validation_rules?.required_text?.join('\n') || ''}
              onChange={(e) => setLessonState({
                ...lessonState,
                validation_rules: {
                  ...lessonState.validation_rules,
                  required_text: e.target.value.split('\n').filter(t => t.trim())
                }
              })}
              className="mt-1 font-mono text-sm"
              rows={4}
            />
          </div>

          <div>
            <Label>CSS Properties (one per line)</Label>
            <Textarea
              placeholder="color&#10;background-color&#10;padding"
              value={lessonState.validation_rules?.css_properties?.join('\n') || ''}
              onChange={(e) => setLessonState({
                ...lessonState,
                validation_rules: {
                  ...lessonState.validation_rules,
                  css_properties: e.target.value.split('\n').filter(p => p.trim())
                }
              })}
              className="mt-1 font-mono text-sm"
              rows={4}
            />
          </div>
        </TabsContent>

        {/* Practice Tab */}
        <TabsContent value="practice" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Practice Exercises</h3>
              <p className="text-sm text-gray-500">
                Add practice exercises for students to complete after the main lesson
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => addPracticeExercise(lessonState, setLessonState)}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Exercise
            </Button>
          </div>

          {lessonState.practice?.length > 0 ? (
            <div className="space-y-4">
              {lessonState.practice.map((exercise, index) => (
                <Card key={index} className="border-purple-200 bg-purple-50">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-purple-600" />
                        Exercise {index + 1}
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePracticeExercise(lessonState, setLessonState, index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Exercise ID</Label>
                        <Input
                          value={exercise.exercise_id}
                          onChange={(e) => updatePracticeExercise(lessonState, setLessonState, index, 'exercise_id', e.target.value)}
                          className="mt-1"
                          placeholder="lesson-p1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">XP Reward</Label>
                        <Input
                          type="number"
                          value={exercise.xp_reward}
                          onChange={(e) => updatePracticeExercise(lessonState, setLessonState, index, 'xp_reward', parseInt(e.target.value) || 0)}
                          className="mt-1"
                          min="0"
                          step="5"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Title</Label>
                      <Input
                        value={exercise.title}
                        onChange={(e) => updatePracticeExercise(lessonState, setLessonState, index, 'title', e.target.value)}
                        className="mt-1"
                        placeholder="Create an H1 Heading"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Instructions</Label>
                      <Textarea
                        value={exercise.instructions}
                        onChange={(e) => updatePracticeExercise(lessonState, setLessonState, index, 'instructions', e.target.value)}
                        className="mt-1"
                        rows={2}
                        placeholder="Create an `<h1>` heading that says 'My First Heading'"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Starter Code</Label>
                      <Textarea
                        value={exercise.starter_code}
                        onChange={(e) => updatePracticeExercise(lessonState, setLessonState, index, 'starter_code', e.target.value)}
                        className="mt-1 font-mono text-sm"
                        rows={3}
                        placeholder="<!-- Create your heading below -->"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Solution Code</Label>
                      <Textarea
                        value={exercise.solution_code}
                        onChange={(e) => updatePracticeExercise(lessonState, setLessonState, index, 'solution_code', e.target.value)}
                        className="mt-1 font-mono text-sm"
                        rows={3}
                        placeholder="<h1>My First Heading</h1>"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Hints (one per line)</Label>
                      <Textarea
                        value={exercise.hints?.join('\n') || ''}
                        onChange={(e) => updatePracticeExercise(
                          lessonState, setLessonState, index, 'hints', 
                          e.target.value.split('\n').filter(h => h.trim())
                        )}
                        className="mt-1"
                        rows={2}
                        placeholder="Start with <h1>&#10;Don't forget </h1> at the end"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No practice exercises yet</p>
              <p className="text-sm">Click "Add Exercise" to create practice problems</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Save className="w-4 h-4" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading lesson plans...</div>
      </div>
    );
  }

  return (
    <div data-testid="lesson-plan-creator" className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate("/teacher/dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-7 h-7 text-purple-600" />
              <div>
                <span className="text-xl font-bold text-gray-900">Lesson Plan Creator</span>
                <p className="text-xs text-gray-500">Batesville Junior High School</p>
              </div>
            </div>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-lesson-btn" className="bg-purple-600 hover:bg-purple-700 gap-2">
                <Plus className="w-5 h-5" />
                Create Lesson Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Lesson Plan</DialogTitle>
                <DialogDescription>
                  Design an interactive lesson with content, code exercises, and practice problems
                </DialogDescription>
              </DialogHeader>
              {renderLessonForm(newLesson, setNewLesson, handleCreateLesson, "Create Lesson")}
            </DialogContent>
          </Dialog>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search lessons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {modules.map(mod => (
                <SelectItem key={mod} value={mod}>{mod}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lessons Grid */}
        {filteredLessons.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <GraduationCap className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Lesson Plans Yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first lesson plan to get started
              </p>
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Lesson
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLessons.map((lesson) => (
              <Card key={lesson._id || lesson.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                        {lesson.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {lesson.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      #{lesson.order}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Code className="w-4 h-4" />
                        {lesson.exercise_type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        {lesson.xp_reward} XP
                      </span>
                      {lesson.practice?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Dumbbell className="w-4 h-4 text-purple-500" />
                          {lesson.practice.length} practice
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-400 font-mono">
                      ID: {lesson.lesson_id}
                    </div>
                    
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPreview(lesson)}
                        className="flex-1 gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(lesson)}
                        className="flex-1 gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateLesson(lesson)}
                        className="text-gray-500"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLesson(lesson._id || lesson.id, lesson.title)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lesson Plan</DialogTitle>
            <DialogDescription>
              Update the lesson content, code, and practice exercises
            </DialogDescription>
          </DialogHeader>
          {editingLesson && renderLessonForm(editingLesson, setEditingLesson, handleUpdateLesson, "Save Changes")}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              Preview: {previewLesson?.title}
            </DialogTitle>
            <DialogDescription>
              This is how students will see the lesson content
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              {/* Lesson Header */}
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{previewLesson?.title}</h2>
                  <p className="text-gray-600">{previewLesson?.description}</p>
                </div>
                <Badge className="ml-auto bg-yellow-100 text-yellow-800">
                  <Zap className="w-3 h-3 mr-1" />
                  +{previewLesson?.xp_reward} XP
                </Badge>
              </div>

              {/* Lesson Content */}
              <div className="prose prose-sm max-w-none">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: formatLessonContent(previewLesson?.content || "") 
                  }}
                />
              </div>

              {/* Starter Code Preview */}
              {previewLesson?.starter_code && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Starter Code
                  </h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{previewLesson.starter_code}</code>
                  </pre>
                </div>
              )}

              {/* Practice Exercises Preview */}
              {previewLesson?.practice?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-purple-600" />
                    Practice Exercises ({previewLesson.practice.length})
                  </h3>
                  <div className="space-y-3">
                    {previewLesson.practice.map((ex, i) => (
                      <div key={i} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-purple-800">{ex.title}</span>
                          <Badge variant="outline" className="text-purple-600">
                            +{ex.xp_reward} XP
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{ex.instructions}</p>
                        {ex.hints?.length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            💡 {ex.hints.length} hint(s) available
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
