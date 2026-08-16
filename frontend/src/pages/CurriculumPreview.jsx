import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { ChevronDown, ChevronRight, Lock, Unlock, GraduationCap, Zap, Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ContactForm from "@/components/ContactForm";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Cyberpunk color per unit to match the rest of the app
const UNIT_ACCENT = {
  block: {
    border: "border-purple-500/40",
    hover: "hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.35)]",
    text: "text-purple-300",
    dot: "bg-purple-400",
  },
  turtle: {
    border: "border-cyan-500/40",
    hover: "hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,240,255,0.35)]",
    text: "text-cyan-300",
    dot: "bg-cyan-400",
  },
  code: {
    border: "border-lime-500/40",
    hover: "hover:border-lime-400 hover:shadow-[0_0_20px_rgba(163,230,53,0.35)]",
    text: "text-lime-300",
    dot: "bg-lime-400",
  },
  microbit: {
    border: "border-pink-500/40",
    hover: "hover:border-pink-400 hover:shadow-[0_0_20px_rgba(255,0,170,0.35)]",
    text: "text-pink-300",
    dot: "bg-pink-400",
  },
};

export default function CurriculumPreview() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/preview/units`)
      .then((res) => {
        setUnits(res.data || []);
        // Auto-expand the first unit so visitors see content immediately
        if (res.data?.[0]) setExpanded(new Set([res.data[0].name]));
      })
      .catch((err) => {
        console.error("Failed to load preview curriculum", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = (unitName) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(unitName)) next.delete(unitName);
      else next.add(unitName);
      return next;
    });
  };

  return (
    <div data-testid="curriculum-preview-page" className="min-h-screen bg-cyber-black cyber-grid-bg text-slate-100">
      {/* Top bar */}
      <header className="border-b border-cyber-cyan/20 bg-cyber-navy/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link to="/" className="flex items-center gap-2 font-orbitron text-cyber-cyan text-lg tracking-widest">
            <Sparkles className="w-5 h-5" />
            ByteBattles
          </Link>
          <div className="flex items-center gap-2">
            <Button
              data-testid="preview-signin-btn"
              onClick={() => navigate("/teacher-login")}
              size="sm"
              variant="ghost"
              className="text-slate-400 hover:text-cyber-cyan font-chakra text-sm"
            >
              Already have a code? Sign In
            </Button>
            <Button
              data-testid="preview-invite-request-btn"
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

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-lime/10 border border-cyber-lime/30 text-cyber-lime text-xs font-orbitron uppercase tracking-widest mb-6">
          <Unlock className="w-3.5 h-3.5" />
          Free Preview
        </div>
        <h1 className="font-chakra font-bold text-white text-4xl sm:text-5xl mb-4 heading-glow-cyan">
          Explore the ByteBattles Curriculum
        </h1>
        <p className="text-slate-300 font-chakra text-base sm:text-lg max-w-2xl mx-auto">
          Browse every unit and click any <span className="text-cyber-cyan">unlocked chapter</span> to see the lesson content teachers use in the classroom. Sign up with an invite code to try lessons hands-on.
        </p>
      </section>

      {/* Units */}
      <main className="max-w-4xl mx-auto px-6 pb-24 space-y-4">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 bg-cyber-navy/40" />)}
          </div>
        )}

        {!loading && units.map((unit) => {
          const accent = UNIT_ACCENT[unit.assignment_type] || UNIT_ACCENT.block;
          const isOpen = expanded.has(unit.name);
          const unlockedCount = unit.chapters.filter((c) => !c.is_locked).length;
          return (
            <div
              key={unit.name}
              data-testid={`preview-unit-${unit.assignment_type}`}
              className={`bg-cyber-navy/60 backdrop-blur border ${accent.border} ${accent.hover} transition-all duration-500 rounded`}
            >
              <button
                onClick={() => toggle(unit.name)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${accent.dot} shadow-[0_0_8px_currentColor]`} />
                  <h2 className={`font-orbitron text-lg ${accent.text}`}>{unit.name}</h2>
                  <span className="text-xs text-slate-500">
                    {unlockedCount === unit.chapters.length ? "All chapters open" :
                     unlockedCount > 0 ? `${unlockedCount} of ${unit.chapters.length} chapters open` :
                     "Locked — coming soon"}
                  </span>
                </div>
                {isOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
              </button>

              {isOpen && (
                <div className="border-t border-cyber-cyan/10 p-4 space-y-2">
                  {unit.chapters.length === 0 && (
                    <p className="text-slate-500 text-sm italic px-2">No chapters authored yet — check back soon.</p>
                  )}
                  {unit.chapters.map((chapter) => (
                    <ChapterRow
                      key={chapter.name}
                      chapter={chapter}
                      assignmentType={unit.assignment_type}
                      accent={accent}
                      onOpenLesson={(lesson) => navigate(
                        `/preview/lesson/${encodeURIComponent(unit.assignment_type)}/${encodeURIComponent(chapter.name)}/${encodeURIComponent(lesson.name)}`
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </main>

      {/* Signup CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="bg-cyber-navy/60 border border-cyber-pink/30 rounded p-8">
          <h3 className="font-chakra text-white text-2xl mb-3">Ready to use ByteBattles with your students?</h3>
          <p className="text-slate-300 mb-6">
            Full access to every unit, live grading, classroom management, and AI-powered feedback. Request your teacher invite code — Amy replies personally.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              data-testid="preview-cta-invite-btn"
              onClick={() => setInviteModalOpen(true)}
              className="px-8 py-5 bg-cyber-cyan text-cyber-black hover:shadow-[0_0_30px_rgba(0,240,255,0.7)] font-orbitron text-xs uppercase tracking-widest rounded-none border border-cyber-cyan font-bold"
            >
              <Mail className="w-4 h-4 mr-2" />
              Request Invite Code
            </Button>
            <Button
              data-testid="preview-cta-signin-btn"
              onClick={() => navigate("/teacher-login")}
              variant="outline"
              className="px-8 py-5 bg-transparent border border-cyber-pink/60 text-cyber-pink hover:bg-cyber-pink/10 font-orbitron text-xs uppercase tracking-widest rounded-none"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Already Have a Code? Sign In
            </Button>
          </div>
        </div>
      </section>

      <ContactForm
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        defaultCategory="invite_request"
        title="Request an Invite Code"
        subtitle="Tell us a bit about you and your class — we'll send you a teacher invite code so you can sign up."
        defaultMessage={"Hi Amy,\nI'd love an invite code so I can use ByteBattles with my students.\n\nMy school:\nMy grade level:\nWhat I'd like to teach:\n"}
      />
    </div>
  );
}

function ChapterRow({ chapter, assignmentType, accent, onOpenLesson }) {
  const [open, setOpen] = useState(false);

  if (chapter.is_locked) {
    // Locked: visible name only, non-clickable, no cursor pointer
    return (
      <div
        data-testid={`preview-chapter-locked-${assignmentType}-${chapter.name}`}
        className="flex items-center gap-3 px-4 py-3 rounded bg-cyber-black/40 opacity-50 select-none"
        style={{ cursor: "default" }}
      >
        <Lock className="w-4 h-4 text-slate-600 shrink-0" />
        <span className="text-slate-500 font-chakra text-sm flex-1">{chapter.name}</span>
        <span className="text-xs text-slate-600 uppercase tracking-widest font-orbitron">Locked</span>
      </div>
    );
  }

  return (
    <div className="rounded bg-cyber-black/40 border border-cyber-cyan/10">
      <button
        onClick={() => setOpen((v) => !v)}
        data-testid={`preview-chapter-open-${assignmentType}-${chapter.name}`}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-cyber-navy/40 transition-colors"
      >
        <Unlock className={`w-4 h-4 ${accent.text} shrink-0`} />
        <span className="text-slate-200 font-chakra text-sm flex-1">{chapter.name}</span>
        <span className="text-xs text-slate-500">
          {chapter.lessons.length} lesson{chapter.lessons.length !== 1 ? "s" : ""}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 space-y-1">
          {chapter.lessons.length === 0 && (
            <p className="text-xs text-slate-500 italic pl-7">No lessons authored yet.</p>
          )}
          {chapter.lessons.map((lesson) => (
            <button
              key={lesson.name}
              onClick={() => onOpenLesson(lesson)}
              data-testid={`preview-lesson-${lesson.name}`}
              className="w-full flex items-center gap-3 pl-7 pr-3 py-2 rounded text-left hover:bg-cyber-cyan/10 transition-colors group"
            >
              <span className="text-slate-300 group-hover:text-cyber-cyan text-sm flex-1">{lesson.name}</span>
              <span className="text-xs text-slate-500">{lesson.problem_count} problems</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
