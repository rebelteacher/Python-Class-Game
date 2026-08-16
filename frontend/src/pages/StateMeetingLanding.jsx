import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import axios from "axios";
import {
  Sparkles,
  Zap,
  Play,
  GraduationCap,
  Mail,
  ChevronRight,
  Users,
  BookOpen,
  Bot,
  Trophy,
  Terminal,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ContactForm from "@/components/ContactForm";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Public-facing production URL — used for the QR so attendees scanning it
// hit the live app, not the preview.
const PRODUCTION_URL = "https://byte-dashboard.emergent.host";
const TRIAL_LAUNCH_PATH = "/start-trial";
const TRIAL_QR_URL = `${PRODUCTION_URL}${TRIAL_LAUNCH_PATH}`;

const FEATURE_BULLETS = [
  { icon: Terminal, title: "Real Python + Turtle + Blocks", body: "Students code in the same tools they'll use in a college CS class — right in the browser." },
  { icon: Bot, title: "AI Teaching Assistant", body: "AI help buttons walk kids through bugs while you focus on the class." },
  { icon: Trophy, title: "Gamified Progress", body: "Quests, coins, and cyberpunk vibes turn drills into moments kids brag about." },
  { icon: Users, title: "Classroom Management", body: "Rosters, gradebook, pacing, and live monitoring — all in one dashboard." },
  { icon: BookOpen, title: "Ready-to-teach Curriculum", body: "4 units, 30+ lessons, aligned to CS standards — hand it to any teacher." },
  { icon: Rocket, title: "Made for real classrooms", body: "Built by a working middle-school CS teacher — the tool she actually wanted." },
];

export default function StateMeetingLanding() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const navigate = useNavigate();

  // Fire a lightweight ping so the admin dashboard sees this specific campaign
  // separately from general /preview traffic in the analytics tab.
  useEffect(() => {
    axios.post(`${API}/analytics/pageview`, {
      path: "/nov",
      referrer: document.referrer || "",
    }).catch(() => {});
  }, []);

  return (
    <div data-testid="state-meeting-landing" className="min-h-screen bg-cyber-black cyber-grid-bg text-slate-100">
      {/* Top nav */}
      <header className="border-b border-cyber-cyan/20 bg-cyber-navy/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link to="/" className="flex items-center gap-2 font-orbitron text-cyber-cyan text-lg tracking-widest">
            <Sparkles className="w-5 h-5" />
            ByteBattles
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/teacher-login")}
              className="text-slate-400 hover:text-cyber-cyan font-chakra text-sm hidden sm:inline-flex"
            >
              Already have a code? Sign In
            </Button>
            <Button
              data-testid="nov-invite-btn"
              onClick={() => setInviteOpen(true)}
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
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-12 grid lg:grid-cols-5 gap-10 items-center">
          <div className="lg:col-span-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-pink/10 border border-cyber-pink/30 text-cyber-pink text-xs font-orbitron uppercase tracking-widest mb-6">
              <Rocket className="w-3.5 h-3.5" />
              State CS Educators Meeting · Nov 2026
            </div>
            <h1 className="font-chakra font-bold text-white text-5xl sm:text-6xl mb-4 heading-glow-cyan leading-tight">
              Try the platform<br />
              <span className="text-cyber-cyan">right at the booth.</span>
            </h1>
            <p className="text-slate-300 font-chakra text-lg mb-8 max-w-xl">
              Scan the code, or tap the button. In 10 seconds you&apos;ll be running real Python, drawing with turtles, and watching the autograder score your work — no signup needed.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button
                data-testid="nov-trial-btn"
                onClick={() => navigate("/start-trial")}
                className="px-8 py-6 bg-cyber-cyan text-cyber-black hover:shadow-[0_0_40px_rgba(0,240,255,0.7)] font-orbitron text-sm uppercase tracking-widest rounded-none border border-cyber-cyan transition-all duration-300 font-bold gap-2"
              >
                <Play className="w-5 h-5" />
                Start 14-Day Free Trial
              </Button>
              <Button
                data-testid="nov-hero-signup"
                onClick={() => setInviteOpen(true)}
                className="px-8 py-6 bg-transparent border border-cyber-lime/60 text-cyber-lime hover:bg-cyber-lime/10 hover:shadow-[0_0_20px_rgba(163,230,53,0.4)] font-orbitron text-sm uppercase tracking-widest rounded-none transition-all duration-300 gap-2"
              >
                <GraduationCap className="w-5 h-5" />
                I&apos;m a Teacher — Send Me A Code
              </Button>
            </div>
          </div>

          {/* QR panel */}
          <div className="lg:col-span-2">
            <div className="bg-cyber-navy/60 border-2 border-cyber-cyan/40 rounded p-6 text-center shadow-[0_0_60px_rgba(0,240,255,0.15)]">
              <p className="text-xs font-orbitron uppercase tracking-widest text-cyber-cyan mb-4">
                Scan to try it now
              </p>
              <div className="bg-white p-4 rounded inline-block">
                <QRCodeSVG
                  value={TRIAL_QR_URL}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#0891b2"
                  level="M"
                  imageSettings={undefined}
                />
              </div>
              <p className="text-xs text-slate-400 mt-4 font-mono break-all">
                {TRIAL_QR_URL.replace("https://", "")}
              </p>
              <p className="text-[11px] text-slate-500 mt-2 font-chakra">
                Point any phone camera → tap the notification
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="font-chakra text-white text-2xl sm:text-3xl mb-6 heading-glow-cyan">
          What&apos;s inside
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURE_BULLETS.map((f) => (
            <div
              key={f.title}
              className="bg-cyber-navy/60 border border-cyber-cyan/20 hover:border-cyber-cyan/60 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all duration-300 p-5"
            >
              <f.icon className="w-6 h-6 text-cyber-cyan mb-3" />
              <h3 className="font-orbitron text-cyber-lime text-sm uppercase tracking-widest mb-2">{f.title}</h3>
              <p className="text-slate-300 text-sm font-chakra leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Try This callout */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-br from-cyber-navy/80 to-cyber-navy/40 border border-cyber-lime/40 rounded p-8 text-center">
          <Zap className="w-8 h-8 text-cyber-lime mx-auto mb-4" />
          <h3 className="font-chakra text-white text-2xl mb-3">Feel the &quot;aha&quot; in under 30 seconds</h3>
          <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
            The trial gives you exactly what a student experiences — write turtle code, click Run, watch it draw. Click Check My Work to see the same autograder feedback with line-number hints. No demo videos. The real thing.
          </p>
          <Button
            data-testid="nov-second-trial-btn"
            onClick={() => navigate("/start-trial")}
            className="px-10 py-6 bg-cyber-lime text-cyber-black hover:shadow-[0_0_40px_rgba(163,230,53,0.6)] font-orbitron text-sm uppercase tracking-widest rounded-none border border-cyber-lime font-bold gap-2"
          >
            <Play className="w-5 h-5" />
            Start Free Trial
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Signup CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <div className="bg-cyber-navy/60 border border-cyber-pink/30 rounded p-8">
          <h3 className="font-chakra text-white text-2xl mb-3">Bringing ByteBattles to your classroom?</h3>
          <p className="text-slate-300 mb-6">
            Drop your info and Amy will personally send you an invite code plus a walk-through of getting started with your first class.
          </p>
          <Button
            data-testid="nov-footer-invite"
            onClick={() => setInviteOpen(true)}
            className="px-10 py-6 bg-cyber-cyan text-cyber-black hover:shadow-[0_0_30px_rgba(0,240,255,0.7)] font-orbitron text-sm uppercase tracking-widest rounded-none border border-cyber-cyan font-bold gap-2"
          >
            <Mail className="w-5 h-5" />
            Request Invite Code
          </Button>
        </div>
      </section>

      <ContactForm
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        defaultCategory="invite_request"
        title="Request an Invite Code"
        subtitle="Tell us a bit about you and your class — Amy will send you a code within a day, personally."
        defaultMessage={"Hi Amy,\nI met you at the state meeting and I'd love an invite code so I can use ByteBattles with my students.\n\nMy school:\nMy grade level:\nWhat I'd like to teach:\n"}
      />
    </div>
  );
}
