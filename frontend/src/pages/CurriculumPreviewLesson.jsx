import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Lock, GraduationCap, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Editor from "@monaco-editor/react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Very small markdown → HTML for the instructions block. Mirrors the tiny
// renderer already used in LessonPageTemplate.jsx so styling stays consistent.
const renderMarkdown = (text) => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-cyber-black/80 border border-cyber-cyan/20 rounded p-3 my-3 overflow-x-auto"><code class="text-cyber-lime text-sm font-mono">$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-cyber-black/60 text-cyber-cyan px-1.5 py-0.5 rounded text-sm">$1</code>')
    .replace(/^### (.*)$/gm, '<h3 class="text-cyber-cyan font-chakra font-bold text-lg mt-4 mb-2">$1</h3>')
    .replace(/^## (.*)$/gm, '<h2 class="text-white font-chakra font-bold text-xl mt-5 mb-2">$1</h2>')
    .replace(/^# (.*)$/gm, '<h1 class="text-white font-chakra font-bold text-2xl mt-6 mb-3">$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
    .replace(/^- (.*)$/gm, '<li class="ml-4 text-slate-300">$1</li>')
    .replace(/\n\n/g, '</p><p class="my-2 text-slate-300 leading-relaxed">')
    .replace(/\n/g, "<br/>");
};

export default function CurriculumPreviewLesson() {
  const { assignmentType, chapter, lesson } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedProblemIdx, setSelectedProblemIdx] = useState(0);

  useEffect(() => {
    axios.get(`${API}/preview/lesson`, {
      params: {
        assignment_type: assignmentType,
        chapter: decodeURIComponent(chapter),
        lesson: decodeURIComponent(lesson),
      },
    })
      .then((res) => setData(res.data))
      .catch((err) => {
        const msg = err?.response?.data?.detail || "Could not load this lesson.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [assignmentType, chapter, lesson]);

  const currentProblem = data?.problems?.[selectedProblemIdx];

  return (
    <div data-testid="preview-lesson-page" className="min-h-screen bg-cyber-black cyber-grid-bg text-slate-100">
      {/* Top bar */}
      <header className="border-b border-cyber-cyan/20 bg-cyber-navy/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 font-orbitron text-cyber-cyan text-lg tracking-widest">
              <Sparkles className="w-5 h-5" />
              ByteBattles
            </Link>
            <span className="text-slate-500 hidden sm:inline">·</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/preview")}
              className="text-slate-400 hover:text-cyber-cyan"
              data-testid="preview-lesson-back-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Curriculum
            </Button>
          </div>
          <Button
            data-testid="preview-lesson-signup-btn"
            onClick={() => navigate("/teacher-login")}
            size="sm"
            className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] font-orbitron text-xs uppercase tracking-widest rounded-none font-bold"
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Sign In / Sign Up
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Breadcrumb / title */}
        <div className="mb-6">
          <p className="text-xs text-slate-500 font-orbitron uppercase tracking-widest mb-1">
            {decodeURIComponent(chapter)}
          </p>
          <h1 className="text-3xl font-bold text-white font-chakra heading-glow-cyan">
            {decodeURIComponent(lesson)}
          </h1>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-lime/10 border border-cyber-lime/30 text-cyber-lime text-xs font-orbitron uppercase tracking-widest">
            Read-only preview
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-40 bg-cyber-navy/40" />
            <Skeleton className="h-80 bg-cyber-navy/40" />
          </div>
        )}

        {error && !loading && (
          <Card className="bg-cyber-navy/60 border-red-500/30">
            <CardContent className="p-8 text-center">
              <Lock className="w-10 h-10 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-300 mb-4">{error}</p>
              <Button
                onClick={() => navigate("/preview")}
                className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] font-orbitron text-xs uppercase tracking-widest rounded-none font-bold"
              >
                Back to Preview
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && data && (
          <>
            {/* Instructions */}
            {data.instructions && (
              <Card className="bg-cyber-navy/60 border-cyber-cyan/20 mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-cyber-cyan font-orbitron text-sm uppercase tracking-widest">
                    Lesson Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: `<p class="text-slate-300 leading-relaxed">${renderMarkdown(data.instructions)}</p>` }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Problems */}
            {data.problems && data.problems.length > 0 && (
              <div className="grid md:grid-cols-3 gap-4">
                {/* Problem list */}
                <div className="md:col-span-1 space-y-2">
                  <h3 className="font-orbitron text-xs uppercase tracking-widest text-slate-400 mb-2">
                    Problems in this lesson
                  </h3>
                  {data.problems.map((p, idx) => (
                    <button
                      key={p.id || idx}
                      onClick={() => setSelectedProblemIdx(idx)}
                      data-testid={`preview-problem-select-${idx}`}
                      className={`w-full text-left px-3 py-2 rounded border transition-all ${
                        idx === selectedProblemIdx
                          ? "border-cyber-cyan bg-cyber-cyan/10 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                          : "border-cyber-cyan/10 bg-cyber-black/40 hover:border-cyber-cyan/40"
                      }`}
                    >
                      <div className="text-xs text-cyber-cyan font-orbitron uppercase tracking-widest mb-0.5">
                        {p.problem_type || "Problem"}
                      </div>
                      <div className="text-sm text-slate-200">{p.title}</div>
                    </button>
                  ))}
                </div>

                {/* Problem detail */}
                <div className="md:col-span-2">
                  {currentProblem && (
                    <Card className="bg-cyber-navy/60 border-cyber-cyan/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white font-chakra">{currentProblem.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {currentProblem.description && (
                          <div
                            className="text-slate-300 leading-relaxed text-sm"
                            dangerouslySetInnerHTML={{ __html: `<p>${renderMarkdown(currentProblem.description)}</p>` }}
                          />
                        )}

                        {currentProblem.starter_code && (
                          <div>
                            <div className="text-xs font-orbitron uppercase tracking-widest text-cyber-cyan mb-2">
                              Starter Code
                            </div>
                            <div className="border border-cyber-cyan/20 rounded overflow-hidden">
                              <Editor
                                height="260px"
                                defaultLanguage={
                                  currentProblem.assignment_type === "block" ? "javascript" : "python"
                                }
                                value={currentProblem.starter_code}
                                theme="vs-dark"
                                options={{
                                  minimap: { enabled: false },
                                  fontSize: 13,
                                  readOnly: true,
                                  scrollBeyondLastLine: false,
                                  lineNumbers: "on",
                                  wordWrap: "on",
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Signup nudge on every problem */}
                        <div className="border-t border-cyber-cyan/10 pt-4 mt-4 flex items-center justify-between gap-3 flex-wrap">
                          <p className="text-slate-400 text-xs">
                            Want to run this code and see how the autograder responds?
                          </p>
                          <Button
                            data-testid="preview-problem-signup-btn"
                            onClick={() => navigate("/teacher-login")}
                            size="sm"
                            className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] font-orbitron text-xs uppercase tracking-widest rounded-none font-bold"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Sign Up To Try It
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {(!data.problems || data.problems.length === 0) && (
              <Card className="bg-cyber-navy/60 border-cyber-cyan/20">
                <CardContent className="p-8 text-center text-slate-400">
                  This lesson has no problems authored yet.
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
