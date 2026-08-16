import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Lock, GraduationCap, Sparkles, Zap, Mail, Play, Send, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ContactForm from "@/components/ContactForm";
import Editor from "@monaco-editor/react";
import { toast } from "sonner";

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
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  // Trial-mode state: student can edit code, run it, and check their work
  const [codeByProblem, setCodeByProblem] = useState({}); // {problemId: code}
  const [runOutput, setRunOutput] = useState(null); // {output, error, image_data} for current problem
  const [runBusy, setRunBusy] = useState(false);
  const [gradeResult, setGradeResult] = useState(null); // {score, feedback, image_data}
  const [gradeBusy, setGradeBusy] = useState(false);

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

  // Reset run/grade panels when switching problems
  useEffect(() => {
    setRunOutput(null);
    setGradeResult(null);
  }, [selectedProblemIdx]);

  // Seed editable code with starter_code when the problem list loads
  useEffect(() => {
    if (data?.problems) {
      const seed = {};
      for (const p of data.problems) {
        if (p.id && !(p.id in codeByProblem)) {
          seed[p.id] = p.starter_code || "";
        }
      }
      if (Object.keys(seed).length) {
        setCodeByProblem((prev) => ({ ...seed, ...prev }));
      }
    }
    // Depend only on data changes to seed once per load
  }, [data]);

  const currentCode = currentProblem?.id ? (codeByProblem[currentProblem.id] ?? currentProblem.starter_code ?? "") : "";

  const handleRun = async () => {
    if (!currentProblem) return;
    setRunBusy(true);
    setRunOutput(null);
    try {
      const isTurtle = currentProblem.assignment_type === "turtle" || currentProblem.assignment_type === "block";
      if (isTurtle) {
        const res = await axios.post(`${API}/preview/execute-turtle`, { code: currentCode });
        setRunOutput(res.data);
      } else {
        // For python/other: hit grade endpoint (it runs tests) but display as "run"
        const res = await axios.post(`${API}/preview/grade`, {
          assignment_type: currentProblem.assignment_type,
          chapter: decodeURIComponent(chapter),
          lesson: decodeURIComponent(lesson),
          problem_id: currentProblem.id,
          code: currentCode,
        });
        setRunOutput({ output: res.data.feedback, error: null, success: true });
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || "Something went wrong.";
      if (err?.response?.status === 429) toast.error(msg);
      setRunOutput({ output: "", error: msg, success: false });
    } finally {
      setRunBusy(false);
    }
  };

  const handleCheck = async () => {
    if (!currentProblem) return;
    setGradeBusy(true);
    setGradeResult(null);
    try {
      const res = await axios.post(`${API}/preview/grade`, {
        assignment_type: currentProblem.assignment_type,
        chapter: decodeURIComponent(chapter),
        lesson: decodeURIComponent(lesson),
        problem_id: currentProblem.id,
        code: currentCode,
      });
      setGradeResult(res.data);
      if (res.data.score >= 70) toast.success(`Nice — ${res.data.score}%!`);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Grading failed.";
      if (err?.response?.status === 429) toast.error(msg);
      setGradeResult({ score: 0, feedback: msg });
    } finally {
      setGradeBusy(false);
    }
  };

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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/teacher-login")}
              className="text-slate-400 hover:text-cyber-cyan font-chakra text-sm hidden sm:inline-flex"
              data-testid="preview-lesson-signin-btn"
            >
              Already have a code? Sign In
            </Button>
            <Button
              data-testid="preview-lesson-invite-btn"
              onClick={() => setInviteModalOpen(true)}
              size="sm"
              className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] font-orbitron text-xs uppercase tracking-widest rounded-none font-bold"
            >
              <Mail className="w-4 h-4 mr-2" />
              Request Invite Code
            </Button>
          </div>
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
            Free Trial — run & grade real code
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
                        <CardTitle className="text-white font-chakra flex items-center justify-between gap-2 flex-wrap">
                          <span>{currentProblem.title}</span>
                          <span className="text-xs font-orbitron uppercase tracking-widest px-2 py-1 rounded-full bg-cyber-lime/10 text-cyber-lime border border-cyber-lime/30">
                            Trial Mode — no save
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {currentProblem.description && (
                          <div
                            className="text-slate-300 leading-relaxed text-sm"
                            dangerouslySetInnerHTML={{ __html: `<p>${renderMarkdown(currentProblem.description)}</p>` }}
                          />
                        )}

                        {/* Editable code area */}
                        <div>
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <div className="text-xs font-orbitron uppercase tracking-widest text-cyber-cyan">
                              Your Code
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={handleRun}
                                disabled={runBusy || gradeBusy}
                                className="bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan/30 font-orbitron text-xs uppercase tracking-widest rounded-none"
                                data-testid="preview-run-btn"
                              >
                                {runBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
                                Run Code
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleCheck}
                                disabled={runBusy || gradeBusy}
                                className="bg-cyber-lime/20 border border-cyber-lime text-cyber-lime hover:bg-cyber-lime/30 font-orbitron text-xs uppercase tracking-widest rounded-none"
                                data-testid="preview-check-btn"
                              >
                                {gradeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                                Check My Work
                              </Button>
                            </div>
                          </div>
                          <div className="border border-cyber-cyan/20 rounded overflow-hidden">
                            <Editor
                              height="260px"
                              defaultLanguage="python"
                              value={currentCode}
                              onChange={(v) => setCodeByProblem((prev) => ({ ...prev, [currentProblem.id]: v || "" }))}
                              theme="vs-dark"
                              options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                readOnly: false,
                                scrollBeyondLastLine: false,
                                lineNumbers: "on",
                                wordWrap: "on",
                              }}
                            />
                          </div>
                        </div>

                        {/* Run output */}
                        {runOutput && (
                          <div data-testid="preview-run-output" className={`border rounded p-3 ${runOutput.error ? "border-red-500/40 bg-red-500/10" : "border-cyber-cyan/30 bg-cyber-cyan/5"}`}>
                            <div className="text-xs font-orbitron uppercase tracking-widest text-cyber-cyan mb-2">Output</div>
                            {runOutput.error ? (
                              <pre className="text-red-300 text-xs whitespace-pre-wrap">{runOutput.error}</pre>
                            ) : (
                              <>
                                {runOutput.image_data && (
                                  <div className="flex justify-center bg-black/40 p-3 rounded mb-2">
                                    <img src={`data:image/png;base64,${runOutput.image_data}`} alt="Turtle output" className="max-h-64" />
                                  </div>
                                )}
                                {runOutput.output && (
                                  <pre className="text-slate-200 text-xs whitespace-pre-wrap">{runOutput.output}</pre>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* Grade result */}
                        {gradeResult && (
                          <div data-testid="preview-grade-result" className={`border rounded p-3 ${gradeResult.score >= 70 ? "border-cyber-lime/40 bg-cyber-lime/5" : "border-amber-500/40 bg-amber-500/5"}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-orbitron uppercase tracking-widest text-cyber-lime flex items-center gap-2">
                                {gradeResult.score >= 70 ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4 text-amber-400" />}
                                Grader Feedback
                              </div>
                              <span className={`text-lg font-orbitron ${gradeResult.score >= 70 ? "text-cyber-lime" : "text-amber-300"}`}>
                                {gradeResult.score}%
                              </span>
                            </div>
                            <pre className="text-slate-200 text-xs whitespace-pre-wrap">{gradeResult.feedback}</pre>
                            {gradeResult.image_data && (
                              <div className="flex justify-center bg-black/40 p-3 rounded mt-2">
                                <img src={`data:image/png;base64,${gradeResult.image_data}`} alt="Your submission" className="max-h-48" />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Signup nudge on every problem */}
                        <div className="border-t border-cyber-cyan/10 pt-4 mt-4 flex items-center justify-between gap-3 flex-wrap">
                          <p className="text-slate-400 text-xs">
                            👀 Enjoying the trial? Sign up to save progress, track a class, and unlock all units.
                          </p>
                          <Button
                            data-testid="preview-problem-signup-btn"
                            onClick={() => setInviteModalOpen(true)}
                            size="sm"
                            className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] font-orbitron text-xs uppercase tracking-widest rounded-none font-bold"
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Request Invite Code
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

      <ContactForm
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        defaultCategory="invite_request"
        title="Request an Invite Code"
        subtitle="Tell us about you and your class — we'll send you a teacher invite code so you can sign up."
        defaultMessage={`Hi Amy,\nI just looked at "${decodeURIComponent(lesson)}" in the preview and I'd love an invite code to try ByteBattles with my students.\n\nMy school:\nMy grade level:\nWhat I'd like to teach:\n`}
      />
    </div>
  );
}
