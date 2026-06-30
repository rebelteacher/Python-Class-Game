import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  HelpCircle,
  Search,
  ExternalLink,
  Sparkles,
  Loader2,
  ArrowRight,
  X,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Floating "Help?" button shown on every teacher/admin page.
 * Architected so we can flip this on for students later by changing the role gate.
 */
export default function HelpButton({ user }) {
  const [open, setOpen] = useState(false);

  // Role gate — teachers and admins only for now.
  if (!user) return null;
  const isAdmin = !!user.is_admin;
  const isTeacher = user.role === "teacher";
  if (!isTeacher && !isAdmin) return null;

  return (
    <>
      <button
        data-testid="floating-help-btn"
        onClick={() => setOpen(true)}
        aria-label="Open help"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-cyber-cyan text-cyber-black shadow-[0_0_25px_rgba(0,240,255,0.6)] hover:shadow-[0_0_35px_rgba(0,240,255,0.9)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
      >
        <HelpCircle className="w-7 h-7" strokeWidth={2.5} />
        <span className="absolute right-full mr-3 px-3 py-1.5 rounded-md bg-cyber-navy border border-cyber-cyan/40 text-cyber-cyan text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Help?
        </span>
      </button>

      <HelpPanel open={open} onOpenChange={setOpen} user={user} />
    </>
  );
}

function HelpPanel({ open, onOpenChange, user }) {
  const navigate = useNavigate();
  const [faq, setFaq] = useState({ entries: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [askMode, setAskMode] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const askInputRef = useRef(null);

  const audience = user?.is_admin ? "admin" : "teacher";

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    axios
      .get(`${API}/help/faq`, { params: { audience }, withCredentials: true })
      .then((res) => setFaq(res.data || { entries: [], categories: [] }))
      .catch((err) => {
        console.error("Failed to fetch help faq", err);
        toast.error("Couldn't load the help articles. Try again in a moment.");
      })
      .finally(() => setLoading(false));
  }, [open, audience]);

  const filtered = useMemo(() => {
    if (!query.trim()) return faq.entries;
    const q = query.toLowerCase();
    return faq.entries.filter(
      (e) =>
        e.question.toLowerCase().includes(q) ||
        e.answer.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
  }, [query, faq.entries]);

  const grouped = useMemo(() => {
    const map = {};
    for (const e of filtered) {
      if (!map[e.category]) map[e.category] = [];
      map[e.category].push(e);
    }
    return map;
  }, [filtered]);

  const submitAi = async () => {
    const q = aiQuestion.trim();
    if (!q) {
      toast.warning("Type a question first.");
      return;
    }
    setAiLoading(true);
    setAiAnswer("");
    try {
      const res = await axios.post(
        `${API}/help/ask`,
        { question: q },
        { withCredentials: true }
      );
      setAiAnswer(res.data.answer || "");
    } catch (err) {
      console.error("AI help error", err);
      toast.error(err.response?.data?.detail || "Help AI is unavailable right now.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleNavigate = (path) => {
    onOpenChange(false);
    setTimeout(() => navigate(path), 150);
  };

  // Detect "/path" suggestions in AI answers and turn them into a Go button
  const detectPathInAnswer = (text) => {
    if (!text) return null;
    const m = text.match(/Try:\s*(\/[a-zA-Z0-9/_-]+)/);
    return m ? m[1] : null;
  };
  const aiSuggestedPath = detectPathInAnswer(aiAnswer);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-testid="help-panel"
        side="right"
        className="w-full sm:max-w-lg bg-cyber-black border-l border-cyber-cyan/30 overflow-y-auto p-0"
      >
        <SheetHeader className="px-6 py-5 border-b border-cyber-cyan/15 bg-cyber-navy/60 sticky top-0 z-10 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white flex items-center gap-2 font-orbitron uppercase tracking-wider">
              <HelpCircle className="w-5 h-5 text-cyber-cyan" />
              Help &amp; FAQs
            </SheetTitle>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {user?.is_admin ? "Admin help" : "Teacher help"} — search articles below, or ask the AI assistant.
          </p>
        </SheetHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              data-testid="help-search-input"
              placeholder="Search how-to articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 bg-cyber-navy/40 border-cyber-cyan/20 text-white"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 text-xs">
            <button
              data-testid="help-mode-faq"
              onClick={() => setAskMode(false)}
              className={`flex-1 py-2 rounded font-bold uppercase tracking-wider transition-colors ${
                !askMode
                  ? "bg-cyber-cyan text-cyber-black"
                  : "bg-cyber-navy/40 text-slate-300 hover:bg-cyber-navy/60"
              }`}
            >
              FAQ
            </button>
            <button
              data-testid="help-mode-ai"
              onClick={() => {
                setAskMode(true);
                setTimeout(() => askInputRef.current?.focus(), 50);
              }}
              className={`flex-1 py-2 rounded font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
                askMode
                  ? "bg-fuchsia-500 text-white"
                  : "bg-cyber-navy/40 text-slate-300 hover:bg-cyber-navy/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask AI
            </button>
          </div>

          {/* FAQ view */}
          {!askMode && (
            <div data-testid="help-faq-list" className="space-y-5">
              {loading && (
                <div className="text-center py-8 text-slate-400 text-sm">Loading articles...</div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <p className="text-slate-400 text-sm">No articles match &ldquo;{query}&rdquo;.</p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setAiQuestion(query);
                      setAskMode(true);
                      setTimeout(() => askInputRef.current?.focus(), 50);
                    }}
                    className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Ask the AI assistant instead
                  </Button>
                </div>
              )}
              {!loading &&
                Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat}>
                    <h3 className="text-xs font-orbitron uppercase tracking-widest text-cyber-cyan/70 mb-2 px-1">
                      {cat}
                    </h3>
                    <div className="space-y-2">
                      {items.map((entry) => (
                        <FaqItem key={entry.id} entry={entry} onNavigate={handleNavigate} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* AI view */}
          {askMode && (
            <div data-testid="help-ai-panel" className="space-y-3">
              <Textarea
                ref={askInputRef}
                data-testid="help-ai-input"
                placeholder="Ask anything about ByteBattles — e.g. 'How do I unlock the chapter test for my 3rd period class?'"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                rows={3}
                className="bg-cyber-navy/40 border-cyber-cyan/20 text-white resize-none"
              />
              <Button
                data-testid="help-ai-submit"
                onClick={submitAi}
                disabled={aiLoading || !aiQuestion.trim()}
                className="w-full bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold gap-2"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Ask AI
                  </>
                )}
              </Button>

              {aiAnswer && (
                <div
                  data-testid="help-ai-answer"
                  className="bg-cyber-navy/40 border border-fuchsia-500/30 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 text-xs text-fuchsia-300 font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Answer
                  </div>
                  <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{aiAnswer}</p>
                  {aiSuggestedPath && (
                    <Button
                      size="sm"
                      onClick={() => handleNavigate(aiSuggestedPath)}
                      className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold gap-2"
                    >
                      Open {aiSuggestedPath}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-500 pt-2 leading-relaxed">
                The AI assistant has knowledge of ByteBattles features but can make mistakes. Always double-check critical actions like assigning tests or unlocking lessons.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FaqItem({ entry, onNavigate }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      data-testid={`faq-item-${entry.id}`}
      className="border border-cyber-cyan/15 rounded-md bg-cyber-navy/30 overflow-hidden hover:border-cyber-cyan/40 transition-colors"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-2"
      >
        <span className="text-sm text-white font-medium leading-snug">{entry.question}</span>
        <ArrowRight
          className={`w-4 h-4 text-cyber-cyan shrink-0 mt-0.5 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-cyber-cyan/10 bg-cyber-navy/20">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{entry.answer}</p>
          {entry.link && (
            <Button
              data-testid={`faq-link-${entry.id}`}
              size="sm"
              onClick={() => onNavigate(entry.link)}
              className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold gap-2 h-8"
            >
              {entry.link_label || "Open"}
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
