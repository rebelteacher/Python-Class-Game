import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, ChevronDown, ChevronRight, Pencil, Save, Trash2,
  Plus, BookOpen, Code, X, GripVertical, FileQuestion
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UNIT_TYPES = [
  { label: "Unit 1: Block-Based Coding", value: "block" },
  { label: "Unit 2: Turtle Graphics", value: "turtle" },
  { label: "Unit 3: Python Text", value: "code" },
  { label: "Unit 4: Micro:bit", value: "microbit" },
];

// Format markdown for preview
const formatMarkdown = (content) => {
  if (!content) return "<p class='text-slate-600 text-sm italic'>No instructions yet. Click Edit to add.</p>";
  let result = content;
  result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, l, code) =>
    `<pre class="bg-[#0A0E17] p-3 rounded border border-[#00F0FF]/20 my-2"><code class="text-[#39FF14] font-mono text-xs">${code.trim().replace(/</g,'&lt;')}</code></pre>`);
  result = result.replace(/`([^`]+)`/g, '<code class="bg-[#0F172A] px-1 py-0.5 text-[#39FF14] font-mono text-xs rounded">$1</code>');
  result = result
    .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-[#FF00AA] mt-2 mb-1 font-orbitron">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-[#FF00AA] mt-3 mb-1 font-orbitron">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-[#00F0FF] mt-2 mb-1 font-orbitron">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#00F0FF]">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-[#FF00AA]">$1</em>')
    .replace(/^- (.*$)/gim, '<li class="ml-3 text-slate-300 text-sm flex gap-1"><span class="text-[#00F0FF]">&#9656;</span>$1</li>')
    .replace(/\n\n/g, '</p><p class="text-slate-300 text-sm mb-1">')
    .replace(/\n/g, '<br>');
  return `<p class="text-slate-300 text-sm mb-1">${result}</p>`;
};

export default function AdminLessonManager({ user }) {
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [lessonProblems, setLessonProblems] = useState({});
  const [lessonInstructions, setLessonInstructions] = useState({});
  const [editingInstructions, setEditingInstructions] = useState(null);
  const [instructionsDraft, setInstructionsDraft] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [renamingLesson, setRenamingLesson] = useState(null); // lessonKey being renamed
  const [renameValue, setRenameValue] = useState("");
  const [addingLesson, setAddingLesson] = useState(null); // chapter name where adding
  const [newLessonName, setNewLessonName] = useState("");
  // Test placements
  const [chapterPlacements, setChapterPlacements] = useState({}); // { "{at}|{chapter}": [placements] }
  const [attachDialog, setAttachDialog] = useState(null); // { assignmentType, chapter, placement_type, lesson }
  const [attachLibrary, setAttachLibrary] = useState([]);
  const [attachSearch, setAttachSearch] = useState("");
  const [attachSubmitting, setAttachSubmitting] = useState(false);

  const fetchChapterPlacements = useCallback(async (assignmentType, chapter) => {
    const key = `${assignmentType}|${chapter}`;
    try {
      const res = await axios.get(`${API}/curriculum/test-placements`, {
        params: { assignment_type: assignmentType, chapter },
        withCredentials: true,
      });
      setChapterPlacements(prev => ({ ...prev, [key]: res.data.placements || [] }));
    } catch (error) {
      console.error("Error fetching placements:", error);
    }
  }, []);

  const openAttachDialog = async (assignmentType, chapter, placement_type, lesson = null) => {
    setAttachDialog({ assignmentType, chapter, placement_type, lesson });
    setAttachSearch("");
    try {
      const res = await axios.get(`${API}/admin-tests/library`, { withCredentials: true });
      // Only MC for lesson quizzes (per spec), allow both for chapter tests
      const tests = (res.data.tests || []).filter(t =>
        placement_type === "lesson_quiz" ? t.test_type === "mc" : true
      );
      setAttachLibrary(tests);
    } catch (error) {
      console.error("Error loading test library:", error);
      toast.error("Failed to load admin test library");
    }
  };

  const attachTest = async (test) => {
    if (!attachDialog) return;
    setAttachSubmitting(true);
    try {
      await axios.post(`${API}/curriculum/test-placements`, {
        test_id: test.id,
        test_type: test.test_type,
        assignment_type: attachDialog.assignmentType,
        chapter: attachDialog.chapter,
        placement_type: attachDialog.placement_type,
        lesson: attachDialog.lesson,
      }, { withCredentials: true });
      toast.success(`${attachDialog.placement_type === "lesson_quiz" ? "Lesson quiz" : "Chapter test"} attached`);
      setAttachDialog(null);
      fetchChapterPlacements(attachDialog.assignmentType, attachDialog.chapter);
    } catch (error) {
      console.error("Error attaching placement:", error);
      toast.error(error.response?.data?.detail || "Failed to attach test");
    } finally {
      setAttachSubmitting(false);
    }
  };

  const removePlacement = async (placement) => {
    if (!window.confirm(`Remove this ${placement.placement_type === "lesson_quiz" ? "lesson quiz" : "chapter test"}? Students will lose access immediately.`)) return;
    try {
      await axios.delete(`${API}/curriculum/test-placements/${placement.id}`, { withCredentials: true });
      toast.success("Placement removed");
      // refresh placements for this chapter
      fetchChapterPlacements(selectedUnit, placement.chapter);
    } catch (error) {
      console.error("Error removing placement:", error);
      toast.error("Failed to remove placement");
    }
  };

  const fetchUnits = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/curriculum/units`, { withCredentials: true });
      setUnits(response.data);
      if (!selectedUnit && response.data.length > 0) {
        setSelectedUnit(response.data[0].assignment_type);
      }
    } catch (error) {
      console.error("Error fetching units:", error);
      toast.error("Failed to load curriculum");
    } finally {
      setLoading(false);
    }
  }, [selectedUnit]);

  useEffect(() => { fetchUnits(); }, [fetchUnits]);

  const fetchLessonProblems = async (assignmentType, chapter, lesson) => {
    const key = `${assignmentType}|${chapter}|${lesson}`;
    try {
      const params = new URLSearchParams({ assignment_type: assignmentType, chapter, lesson });
      const response = await axios.get(`${API}/curriculum/lesson-problems?${params}`, { withCredentials: true });
      setLessonProblems(prev => ({ ...prev, [key]: response.data.problems }));
      setLessonInstructions(prev => ({ ...prev, [key]: response.data.instructions || "" }));
    } catch (error) {
      console.error("Error fetching lesson problems:", error);
    }
  };

  const toggleChapter = (chapterName) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      next.has(chapterName) ? next.delete(chapterName) : next.add(chapterName);
      return next;
    });
  };

  const toggleLesson = (assignmentType, chapter, lesson) => {
    const key = `${assignmentType}|${chapter}|${lesson}`;
    setExpandedLessons(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        if (!lessonProblems[key]) {
          fetchLessonProblems(assignmentType, chapter, lesson);
        }
      }
      return next;
    });
  };

  const handleRemoveProblem = async (problemId, problemTitle, lessonKey) => {
    if (!window.confirm(`Remove "${problemTitle}" from this lesson?`)) return;
    try {
      await axios.post(`${API}/curriculum/remove-problem-from-lesson`, { problem_id: problemId }, { withCredentials: true });
      setLessonProblems(prev => ({
        ...prev,
        [lessonKey]: prev[lessonKey]?.filter(p => p.id !== problemId)
      }));
      toast.success(`Removed "${problemTitle}"`);
    } catch (error) {
      console.error("Error removing problem:", error);
      toast.error("Failed to remove problem");
    }
  };

  const handleSaveInstructions = async (assignmentType, chapter, lesson) => {
    setSavingInstructions(true);
    try {
      await axios.put(`${API}/curriculum/lesson-instructions`, {
        assignment_type: assignmentType, chapter, lesson, instructions: instructionsDraft,
      }, { withCredentials: true });
      const key = `${assignmentType}|${chapter}|${lesson}`;
      setLessonInstructions(prev => ({ ...prev, [key]: instructionsDraft }));
      setEditingInstructions(null);
      toast.success("Instructions saved!");
    } catch (error) {
      console.error("Error saving instructions:", error);
      toast.error("Failed to save instructions");
    } finally {
      setSavingInstructions(false);
    }
  };

  const handleRenameLesson = async (assignmentType, chapter, oldName, newName) => {
    if (!newName.trim() || newName.trim() === oldName) {
      setRenamingLesson(null);
      return;
    }
    try {
      await axios.post(`${API}/curriculum/rename-lesson`, {
        assignment_type: assignmentType, chapter, old_name: oldName, new_name: newName.trim(),
      }, { withCredentials: true });
      toast.success(`Renamed to "${newName.trim()}"`);
      setRenamingLesson(null);
      setRenameValue("");
      fetchUnits(); // Refresh to show new name
    } catch (error) {
      console.error("Error renaming lesson:", error);
      toast.error(error.response?.data?.detail || "Failed to rename lesson");
    }
  };

  const handleAddLesson = async (assignmentType, chapter) => {
    if (!newLessonName.trim()) return;
    try {
      await axios.post(`${API}/curriculum/add-lesson`, {
        assignment_type: assignmentType, chapter, lesson_name: newLessonName.trim(),
      }, { withCredentials: true });
      toast.success(`Lesson "${newLessonName.trim()}" created`);
      setAddingLesson(null);
      setNewLessonName("");
      fetchUnits(); // Refresh
    } catch (error) {
      console.error("Error adding lesson:", error);
      toast.error(error.response?.data?.detail || "Failed to add lesson");
    }
  };

  const handleDeleteLesson = async (assignmentType, chapter, lessonName, problemCount) => {
    if (!window.confirm(`Delete "${lessonName}"?\n\n${problemCount} problem(s) will be unassigned from this lesson but kept in the library.`)) return;
    try {
      await axios.post(`${API}/curriculum/delete-lesson`, {
        assignment_type: assignmentType, chapter, lesson_name: lessonName,
      }, { withCredentials: true });
      toast.success(`Lesson "${lessonName}" deleted`);
      fetchUnits(); // Refresh
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast.error("Failed to delete lesson");
    }
  };

  const handleDeleteOrphans = async (assignmentType, chapter, problemCount) => {
    if (!window.confirm(
      `Permanently delete ${problemCount} orphan problem(s) under "${chapter}"?\n\n` +
      `These problems have no formal lesson assignment and will be removed from the database. This cannot be undone.`
    )) return;
    try {
      const res = await axios.post(`${API}/curriculum/delete-orphan-problems`, {
        assignment_type: assignmentType, chapter,
      }, { withCredentials: true });
      toast.success(`Deleted ${res.data.deleted} orphan problem(s)`);
      fetchUnits();
    } catch (error) {
      console.error("Error deleting orphans:", error);
      toast.error("Failed to delete orphan problems");
    }
  };

  const currentUnit = units.find(u => u.assignment_type === selectedUnit);

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg flex items-center justify-center">
        <div className="text-cyber-cyan font-orbitron animate-pulse">Loading curriculum...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      {/* Header */}
      <nav className="bg-cyber-navy/80 backdrop-blur-xl border-b border-cyber-cyan/20 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin-dashboard")} className="text-slate-400 hover:text-cyber-cyan rounded-none gap-1">
            <ArrowLeft className="w-4 h-4" />
            Admin
          </Button>
          <div className="h-5 w-px bg-cyber-cyan/20" />
          <h1 className="text-lg font-orbitron text-cyber-cyan uppercase tracking-wider heading-glow-cyan">Lesson Manager</h1>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Sidebar - Unit Selection */}
        <div className="w-56 bg-cyber-navy/50 border-r border-cyber-cyan/20 p-3 flex flex-col gap-1 shrink-0">
          {UNIT_TYPES.map(unit => {
            const unitData = units.find(u => u.assignment_type === unit.value);
            const unitHasOrphans = unitData?.chapters?.some(c => c.lessons?.some(l => l.is_orphan));
            return (
              <button
                key={unit.value}
                onClick={() => setSelectedUnit(unit.value)}
                data-testid={`unit-tab-${unit.value}`}
                className={`text-left px-3 py-2 text-sm font-chakra rounded-none transition-all flex items-center justify-between gap-2 ${
                  selectedUnit === unit.value
                    ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30'
                    : 'text-slate-400 hover:text-white hover:bg-cyber-navy/60 border border-transparent'
                }`}
              >
                <span>{unit.label}</span>
                <span
                  data-testid={`unit-health-${unit.value}`}
                  title={unitHasOrphans ? "This unit has orphan problems" : "All clean"}
                  className={`w-2 h-2 rounded-full shrink-0 ${unitHasOrphans ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)] animate-pulse" : "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"}`}
                />
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl">
            {currentUnit ? (
              <div className="space-y-4">
                {currentUnit.chapters.map(chapter => {
                  const chapterHasOrphans = chapter.lessons?.some(l => l.is_orphan);
                  const chapterKey = `${currentUnit.assignment_type}|${chapter.name}`;
                  const placements = chapterPlacements[chapterKey] || [];
                  const chapterTestPlacement = placements.find(p => p.placement_type === "chapter_test");
                  const lessonQuizByLesson = Object.fromEntries(
                    placements.filter(p => p.placement_type === "lesson_quiz").map(p => [p.lesson, p])
                  );
                  return (
                  <div key={chapter.name} className="border border-cyber-cyan/20 rounded-none">
                    {/* Chapter Header */}
                    <button
                      onClick={() => { toggleChapter(chapter.name); fetchChapterPlacements(currentUnit.assignment_type, chapter.name); }}
                      className="w-full flex items-center justify-between p-4 bg-cyber-navy/60 hover:bg-cyber-navy/80 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedChapters.has(chapter.name) ? <ChevronDown className="w-4 h-4 text-cyber-cyan" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                        <span className="font-orbitron text-sm text-white uppercase tracking-wider">{chapter.name}</span>
                        <span
                          data-testid={`chapter-health-${chapter.name}`}
                          title={chapterHasOrphans ? "Chapter has orphan problems — click to expand and clean up" : "All clean"}
                          className={`w-2 h-2 rounded-full shrink-0 ml-1 ${chapterHasOrphans ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)] animate-pulse" : "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"}`}
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-chakra">{chapter.problem_count} problems / {chapter.lessons.length} lessons</span>
                    </button>

                    {/* Lessons */}
                    {expandedChapters.has(chapter.name) && (
                      <div className="border-t border-cyber-cyan/10">
                        {chapter.lessons.map(lesson => {
                          const lessonKey = `${currentUnit.assignment_type}|${chapter.name}|${lesson.name}`;
                          const isExpanded = expandedLessons.has(lessonKey);
                          const problems = lessonProblems[lessonKey] || [];
                          const instructions = lessonInstructions[lessonKey] || "";

                          return (
                            <div key={lesson.name} className={`border-b border-cyber-cyan/5 last:border-b-0 ${lesson.is_orphan ? "bg-cyber-red/5" : ""}`}>
                              {/* Lesson Header */}
                              <div className="flex items-center justify-between px-6 py-3 hover:bg-cyber-navy/30 transition-colors">
                                {lesson.is_orphan ? (
                                  <>
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="text-xs font-orbitron uppercase tracking-widest text-amber-400 shrink-0">⚠ Orphan</span>
                                      <span className="text-sm font-chakra text-slate-300">{lesson.name}</span>
                                      <span className="text-xs text-slate-500 font-fira shrink-0">{lesson.problem_count} problems with no lesson assigned</span>
                                    </div>
                                    <Button
                                      data-testid={`delete-orphans-${currentUnit.assignment_type}-${chapter.name}`}
                                      size="sm"
                                      onClick={() => handleDeleteOrphans(currentUnit.assignment_type, chapter.name, lesson.problem_count)}
                                      className="bg-cyber-red/20 border border-cyber-red/50 text-cyber-red hover:bg-cyber-red/30 font-orbitron text-xs uppercase tracking-widest rounded-none h-7 px-3 gap-1"
                                      title="Permanently delete these orphan problems"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Clean Up
                                    </Button>
                                  </>
                                ) : (
                                <>
                                <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={() => toggleLesson(currentUnit.assignment_type, chapter.name, lesson.name)}>
                                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-cyber-pink shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                                  {renamingLesson === lessonKey ? (
                                    <form onSubmit={(e) => { e.preventDefault(); handleRenameLesson(currentUnit.assignment_type, chapter.name, lesson.name, renameValue); }}
                                      className="flex items-center gap-2 flex-1"
                                      onClick={(e) => e.stopPropagation()}>
                                      <Input
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        autoFocus
                                        className="h-7 text-sm bg-cyber-black/50 border-cyber-cyan/30 text-white rounded-none font-chakra"
                                        onKeyDown={(e) => { if (e.key === 'Escape') setRenamingLesson(null); }}
                                      />
                                      <Button type="submit" size="sm" className="bg-cyber-cyan text-cyber-black rounded-none h-7 px-2 text-xs font-bold">
                                        <Save className="w-3 h-3" />
                                      </Button>
                                      <Button type="button" size="sm" variant="ghost" onClick={() => setRenamingLesson(null)} className="text-slate-400 rounded-none h-7 px-2 text-xs">
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </form>
                                  ) : (
                                    <>
                                      <span className="text-sm font-chakra text-slate-300 truncate">{lesson.name}</span>
                                      <span className="text-xs text-slate-600 font-fira shrink-0">{lesson.problem_count} problems</span>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <Button size="sm" variant="ghost"
                                    onClick={() => { setRenamingLesson(lessonKey); setRenameValue(lesson.name); }}
                                    className="text-slate-500 hover:text-cyber-cyan hover:bg-cyber-cyan/10 rounded-none h-7 w-7 p-0" title="Rename lesson">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost"
                                    onClick={() => handleDeleteLesson(currentUnit.assignment_type, chapter.name, lesson.name, lesson.problem_count)}
                                    className="text-slate-500 hover:text-cyber-red hover:bg-cyber-red/10 rounded-none h-7 w-7 p-0" title="Delete lesson">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost"
                                    onClick={() => navigate(`/lesson/${currentUnit.assignment_type}/${encodeURIComponent(chapter.name)}/${encodeURIComponent(lesson.name)}`)}
                                    className="text-cyber-cyan hover:bg-cyber-cyan/10 rounded-none text-xs h-7 px-2">
                                    Preview
                                  </Button>
                                  {lessonQuizByLesson[lesson.name] ? (
                                    <div
                                      data-testid={`lesson-quiz-attached-${lesson.name}`}
                                      className="flex items-center gap-1 px-2 h-7 border border-cyber-magenta/40 bg-cyber-magenta/10 rounded-none"
                                      title={`Quiz: ${lessonQuizByLesson[lesson.name].title}`}
                                    >
                                      <FileQuestion className="w-3.5 h-3.5 text-cyber-magenta" />
                                      <span className="text-[10px] font-orbitron text-cyber-magenta uppercase tracking-widest truncate max-w-[120px]">{lessonQuizByLesson[lesson.name].title}</span>
                                      <button
                                        type="button"
                                        onClick={() => removePlacement(lessonQuizByLesson[lesson.name])}
                                        className="text-cyber-magenta/70 hover:text-cyber-magenta ml-1"
                                        title="Remove quiz"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm" variant="ghost"
                                      data-testid={`attach-lesson-quiz-${lesson.name}`}
                                      onClick={() => openAttachDialog(currentUnit.assignment_type, chapter.name, "lesson_quiz", lesson.name)}
                                      className="text-cyber-magenta/70 hover:text-cyber-magenta hover:bg-cyber-magenta/10 rounded-none text-xs h-7 px-2 gap-1"
                                      title="Attach a lesson quiz"
                                    >
                                      <FileQuestion className="w-3.5 h-3.5" />
                                      + Quiz
                                    </Button>
                                  )}
                                </div>
                                </>
                                )}
                              </div>

                              {/* Expanded Lesson Content */}
                              {!lesson.is_orphan && isExpanded && (
                                <div className="px-6 pb-4 space-y-3">
                                  {/* Instructions Section */}
                                  <div className="border border-cyber-cyan/15 rounded-none">
                                    <div className="flex items-center justify-between px-3 py-2 bg-cyber-navy/40 border-b border-cyber-cyan/10">
                                      <span className="text-xs font-orbitron text-cyber-cyan uppercase tracking-widest">Lesson Instructions</span>
                                      {editingInstructions === lessonKey ? (
                                        <div className="flex gap-1">
                                          <Button size="sm" onClick={() => handleSaveInstructions(currentUnit.assignment_type, chapter.name, lesson.name)}
                                            disabled={savingInstructions}
                                            className="bg-cyber-cyan text-cyber-black font-orbitron text-xs rounded-none h-6 px-2 font-bold gap-1">
                                            <Save className="w-3 h-3" />{savingInstructions ? "..." : "Save"}
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={() => setEditingInstructions(null)}
                                            className="text-slate-400 rounded-none h-6 px-2 text-xs">Cancel</Button>
                                        </div>
                                      ) : (
                                        <Button size="sm" variant="ghost"
                                          onClick={() => { setEditingInstructions(lessonKey); setInstructionsDraft(instructions); }}
                                          className="text-cyber-cyan hover:bg-cyber-cyan/10 rounded-none h-6 px-2 text-xs gap-1">
                                          <Pencil className="w-3 h-3" />Edit
                                        </Button>
                                      )}
                                    </div>
                                    <div className="p-3">
                                      {editingInstructions === lessonKey ? (
                                        <Textarea
                                          value={instructionsDraft}
                                          onChange={(e) => setInstructionsDraft(e.target.value)}
                                          placeholder="Write lesson instructions with markdown..."
                                          className="min-h-[150px] bg-cyber-black/50 border-cyber-cyan/30 text-white font-fira text-sm rounded-none resize-y"
                                        />
                                      ) : (
                                        <div className="max-h-32 overflow-y-auto" dangerouslySetInnerHTML={{ __html: formatMarkdown(instructions) }} />
                                      )}
                                    </div>
                                  </div>

                                  {/* Problems List */}
                                  <div className="border border-cyber-pink/15 rounded-none">
                                    <div className="px-3 py-2 bg-cyber-navy/40 border-b border-cyber-pink/10 flex items-center justify-between">
                                      <span className="text-xs font-orbitron text-cyber-pink uppercase tracking-widest">
                                        Problems ({problems.length})
                                      </span>
                                    </div>
                                    <div className="divide-y divide-cyber-cyan/5">
                                      {problems.length === 0 ? (
                                        <p className="text-slate-600 text-xs p-3 text-center font-chakra">Loading problems...</p>
                                      ) : problems.map((problem, idx) => (
                                        <div key={problem.id} className="flex items-center gap-2 px-3 py-2 hover:bg-cyber-navy/20 group">
                                          <span className="text-xs text-slate-600 font-fira w-6">{idx + 1}.</span>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-chakra text-slate-300 truncate">{problem.title}</p>
                                            <span className={`text-xs px-1.5 py-0.5 rounded-none ${
                                              problem.problem_type === 'Class Practice' ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20' :
                                              problem.problem_type === 'Paired Programming' ? 'bg-cyber-pink/10 text-cyber-pink border border-cyber-pink/20' :
                                              problem.problem_type === 'Independent Practice' ? 'bg-cyber-lime/10 text-cyber-lime border border-cyber-lime/20' :
                                              'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                            }`}>
                                              {problem.problem_type || "Unknown"}
                                            </span>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleRemoveProblem(problem.id, problem.title, lessonKey)}
                                            className="opacity-0 group-hover:opacity-100 text-cyber-red hover:bg-cyber-red/10 rounded-none h-6 w-6 p-0"
                                            title="Remove from lesson"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Add Lesson Button */}
                        <div className="px-6 py-3 border-t border-dashed border-cyber-lime/20">
                          {addingLesson === chapter.name ? (
                            <form onSubmit={(e) => { e.preventDefault(); handleAddLesson(currentUnit.assignment_type, chapter.name); }}
                              className="flex items-center gap-2">
                              <Input
                                value={newLessonName}
                                onChange={(e) => setNewLessonName(e.target.value)}
                                placeholder="e.g., Lesson 4: Advanced Topics"
                                autoFocus
                                className="h-8 text-sm bg-cyber-black/50 border-cyber-lime/30 text-white rounded-none font-chakra flex-1"
                                onKeyDown={(e) => { if (e.key === 'Escape') { setAddingLesson(null); setNewLessonName(""); } }}
                              />
                              <Button type="submit" size="sm" className="bg-cyber-lime text-cyber-black rounded-none h-8 px-3 text-xs font-orbitron font-bold gap-1">
                                <Plus className="w-3.5 h-3.5" /> Add
                              </Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingLesson(null); setNewLessonName(""); }}
                                className="text-slate-400 rounded-none h-8 px-2 text-xs">
                                Cancel
                              </Button>
                            </form>
                          ) : (
                            <button
                              onClick={() => setAddingLesson(chapter.name)}
                              className="flex items-center gap-2 text-cyber-lime/60 hover:text-cyber-lime text-xs font-chakra transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Lesson to {chapter.name}
                            </button>
                          )}
                        </div>

                        {/* Chapter Test Row */}
                        <div className="px-6 py-3 border-t border-dashed border-cyber-magenta/20 bg-cyber-magenta/5">
                          {chapterTestPlacement ? (
                            <div className="flex items-center justify-between gap-3" data-testid={`chapter-test-attached-${chapter.name}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <FileQuestion className="w-4 h-4 text-cyber-magenta shrink-0" />
                                <span className="text-xs font-orbitron text-cyber-magenta uppercase tracking-widest shrink-0">Chapter Test:</span>
                                <span className="text-sm font-chakra text-slate-300 truncate">{chapterTestPlacement.title}</span>
                                <span className="text-[10px] text-slate-500 shrink-0">({chapterTestPlacement.num_questions} questions{chapterTestPlacement.test_type === "mc" ? `, pool ${chapterTestPlacement.pool_size}` : ""})</span>
                              </div>
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => removePlacement(chapterTestPlacement)}
                                className="text-cyber-red hover:bg-cyber-red/10 rounded-none h-7 px-2 gap-1"
                                title="Remove chapter test"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="text-xs">Remove</span>
                              </Button>
                            </div>
                          ) : (
                            <button
                              data-testid={`attach-chapter-test-${chapter.name}`}
                              onClick={() => openAttachDialog(currentUnit.assignment_type, chapter.name, "chapter_test")}
                              className="flex items-center gap-2 text-cyber-magenta/70 hover:text-cyber-magenta text-xs font-chakra transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Attach Chapter Test to {chapter.name}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-20 font-chakra">Select a unit to manage lessons</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Attach Test Dialog */}
      {attachDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setAttachDialog(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-cyber-navy/95 border border-cyber-magenta/40 rounded-none w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-cyber-magenta/30 flex items-center justify-between">
              <div>
                <h3 className="text-white font-orbitron uppercase tracking-widest text-lg">
                  Attach {attachDialog.placement_type === "lesson_quiz" ? "Lesson Quiz" : "Chapter Test"}
                </h3>
                <p className="text-xs text-slate-400 font-chakra mt-1">
                  {attachDialog.placement_type === "lesson_quiz"
                    ? `to ${attachDialog.lesson}`
                    : `to ${attachDialog.chapter}`}
                </p>
              </div>
              <button onClick={() => setAttachDialog(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-cyber-magenta/20">
              <Input
                data-testid="attach-search"
                placeholder={attachDialog.placement_type === "lesson_quiz" ? "Search MC tests by title…" : "Search tests by title…"}
                value={attachSearch}
                onChange={(e) => setAttachSearch(e.target.value)}
                className="bg-cyber-black/50 border-cyber-magenta/30 rounded-none text-white"
              />
            </div>
            <ScrollArea className="flex-1 max-h-[50vh]">
              <div className="divide-y divide-cyber-magenta/10">
                {attachLibrary.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No admin-created tests yet. Build one in the Test Builder, then come back.
                  </div>
                ) : (
                  attachLibrary
                    .filter(t => {
                      const q = attachSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (t.title || "").toLowerCase().includes(q);
                    })
                    .map(t => (
                      <button
                        key={`${t.test_type}-${t.id}`}
                        type="button"
                        data-testid={`attach-test-${t.id}`}
                        disabled={attachSubmitting}
                        onClick={() => attachTest(t)}
                        className="w-full text-left p-4 hover:bg-cyber-magenta/10 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-white font-medium truncate">{t.title}</div>
                          <div className="text-xs text-slate-500 truncate">
                            {[t.chapter, t.lesson].filter(Boolean).join(" · ")}
                            {t.num_questions ? ` · ${t.num_questions} questions` : ""}
                            {t.pool_size && t.test_type === "mc" ? ` · pool ${t.pool_size}` : ""}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 border text-[10px] font-orbitron uppercase tracking-widest rounded-none shrink-0 ${t.test_type === "coding" ? "border-purple-500/50 text-purple-300 bg-purple-500/10" : "border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10"}`}>
                          {t.test_type === "coding" ? "Coding" : "MC"}
                        </span>
                      </button>
                    ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
