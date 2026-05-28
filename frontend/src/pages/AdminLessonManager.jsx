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
  Plus, BookOpen, Code, X, GripVertical
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
          {UNIT_TYPES.map(unit => (
            <button
              key={unit.value}
              onClick={() => setSelectedUnit(unit.value)}
              className={`text-left px-3 py-2 text-sm font-chakra rounded-none transition-all ${
                selectedUnit === unit.value
                  ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30'
                  : 'text-slate-400 hover:text-white hover:bg-cyber-navy/60 border border-transparent'
              }`}
            >
              {unit.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl">
            {currentUnit ? (
              <div className="space-y-4">
                {currentUnit.chapters.map(chapter => (
                  <div key={chapter.name} className="border border-cyber-cyan/20 rounded-none">
                    {/* Chapter Header */}
                    <button
                      onClick={() => toggleChapter(chapter.name)}
                      className="w-full flex items-center justify-between p-4 bg-cyber-navy/60 hover:bg-cyber-navy/80 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedChapters.has(chapter.name) ? <ChevronDown className="w-4 h-4 text-cyber-cyan" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                        <span className="font-orbitron text-sm text-white uppercase tracking-wider">{chapter.name}</span>
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
                            <div key={lesson.name} className="border-b border-cyber-cyan/5 last:border-b-0">
                              {/* Lesson Header */}
                              <button
                                onClick={() => toggleLesson(currentUnit.assignment_type, chapter.name, lesson.name)}
                                className="w-full flex items-center justify-between px-6 py-3 hover:bg-cyber-navy/30 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-cyber-pink" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                                  <span className="text-sm font-chakra text-slate-300">{lesson.name}</span>
                                  <span className="text-xs text-slate-600 font-fira">{lesson.problem_count} problems</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/lesson/${currentUnit.assignment_type}/${encodeURIComponent(chapter.name)}/${encodeURIComponent(lesson.name)}`);
                                    }}
                                    className="text-cyber-cyan hover:bg-cyber-cyan/10 rounded-none text-xs h-7 px-2"
                                  >
                                    Preview
                                  </Button>
                                </div>
                              </button>

                              {/* Expanded Lesson Content */}
                              {isExpanded && (
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-20 font-chakra">Select a unit to manage lessons</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
