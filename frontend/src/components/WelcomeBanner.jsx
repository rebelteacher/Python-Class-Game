import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";

/**
 * Pilot-release welcome banner.
 * Shown to non-admin users on first visit; dismiss is remembered in localStorage.
 */
export default function WelcomeBanner({ user }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.is_admin) return; // admins don't need the pilot banner
    const dismissed = localStorage.getItem("bytebattles_welcome_dismissed_v1");
    if (!dismissed) setVisible(true);
  }, [user]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem("bytebattles_welcome_dismissed_v1", "1");
    setVisible(false);
  };

  return (
    <div
      data-testid="welcome-banner"
      className="relative max-w-6xl mx-auto mt-4 mb-2 mx-6 border border-cyber-cyan/40 bg-gradient-to-r from-cyber-magenta/10 via-cyber-navy/60 to-cyber-cyan/10 rounded-none p-4 overflow-hidden"
    >
      {/* Scanline overlay for cyberpunk vibe */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[repeating-linear-gradient(180deg,transparent_0_2px,rgba(0,240,255,0.04)_2px_3px)]" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 border border-cyber-magenta/50 bg-cyber-magenta/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-cyber-magenta" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-orbitron uppercase tracking-[0.25em] text-cyber-magenta mb-0.5">
              Pilot Release · Welcome
            </div>
            <h3 className="text-white font-orbitron uppercase tracking-wider text-base mb-1">
              Welcome to ByteBattles
            </h3>
            <p className="text-sm text-slate-300 font-chakra leading-snug">
              You&apos;re exploring the <span className="text-cyber-cyan font-semibold">Unit&nbsp;1 · Block-Based Coding</span> pilot &mdash; fully built with lessons,
              auto-graded problems, lesson quizzes, chapter tests, and live class-progress tracking. Units 2&ndash;4 (
              <span className="text-cyber-lime">Turtle Graphics</span>,{" "}
              <span className="text-blue-300">Python Text</span>, and{" "}
              <span className="text-cyber-cyan">Micro:bit</span>) roll out next using the same framework.
            </p>
            <p className="text-xs text-slate-500 font-chakra mt-2">
              Click any lesson card to begin. Feedback &amp; questions welcome.
            </p>
          </div>
        </div>
        <button
          onClick={dismiss}
          data-testid="welcome-dismiss"
          className="shrink-0 text-slate-400 hover:text-white transition-colors"
          aria-label="Dismiss welcome message"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
