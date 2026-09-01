import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Code2, ArrowLeft, Brain, Bot, Globe, Briefcase, Sparkles, Zap,
  GraduationCap, Cpu, CheckCircle2, Quote
} from "lucide-react";

const REASONS = [
  {
    icon: Brain,
    wrap: "border-cyber-cyan/40 bg-cyber-cyan/10",
    iconText: "text-cyber-cyan",
    num: "text-cyber-cyan",
    title: "Computational thinking & problem-solving",
    body:
      "Coding trains students to break down complex problems, spot patterns, abstract the essentials, design step-by-step algorithms, test hypotheses, and iterate when things fail. In an AI-saturated world the bottleneck shifts from generating solutions to defining problems clearly, judging outputs critically, and refining them. Without that foundation, people become passive consumers of AI suggestions they can't properly evaluate.",
  },
  {
    icon: Bot,
    wrap: "border-cyber-pink/40 bg-cyber-pink/10",
    iconText: "text-cyber-pink",
    num: "text-cyber-pink",
    title: "AI is a powerful but imperfect collaborator",
    body:
      "Generative models produce statistically plausible code, not guaranteed-correct or optimal code. They introduce bugs, security holes, inefficiencies, outdated patterns, and subtle logic errors, especially on novel or poorly specified problems. Someone still has to review, test, debug, secure, and maintain the result. Developers who understand the underlying concepts get far more from AI tools and catch failures faster. Blind reliance builds fragile systems.",
  },
  {
    icon: Globe,
    wrap: "border-cyber-lime/40 bg-cyber-lime/10",
    iconText: "text-cyber-lime",
    num: "text-cyber-lime",
    title: "Understanding the systems that run the world",
    body:
      "Software, and now AI, mediates nearly every part of modern life. Literacy in how computation works gives people agency instead of dependence on black-box tools. Those who can reason about code are far better positioned to audit AI for bias, privacy, safety, and ethics, and to build or adapt tools for new domains. Productivity tools have always expanded computing's reach rather than removing the need for skilled practitioners.",
  },
  {
    icon: Briefcase,
    wrap: "border-cyber-cyan/40 bg-cyber-cyan/10",
    iconText: "text-cyber-cyan",
    num: "text-cyber-cyan",
    title: "Career & opportunity realities",
    body:
      "Entry-level \"coding monkey\" roles may shrink, but demand is projected to grow for software development, data science, cybersecurity, and AI engineering across every industry. AI expands the set of problems solvable with code, creating more opportunities for people who think programmatically and can direct AI effectively. Organizations that differentiate with custom software still need humans who understand architecture, trade-offs, and system design.",
  },
  {
    icon: Sparkles,
    wrap: "border-cyber-pink/40 bg-cyber-pink/10",
    iconText: "text-cyber-pink",
    num: "text-cyber-pink",
    title: "Creativity, resilience & meta-skills",
    body:
      "Coding is creative expression under constraints, with rapid feedback loops and the daily habit of debugging both code and ideas. That builds intellectual resilience and the ability to learn new tools quickly, skills that stay valuable as technology keeps changing.",
  },
];

const PYTHON_POINTS = [
  {
    title: "Readable & approachable",
    body: "Clean syntax lowers the barrier to core concepts without excessive boilerplate, ideal for beginners yet powerful enough for professionals.",
  },
  {
    title: "Dominant in AI & data science",
    body: "PyTorch, TensorFlow, and most data and AI tooling are Python-centric, so students can inspect, modify, extend, and even build the AI systems themselves.",
  },
  {
    title: "Ecosystem & AI synergy",
    body: "AI assistants are especially strong with Python thanks to enormous training data, so students can prompt precisely and evaluate generated code accurately.",
  },
  {
    title: "Broadly applicable",
    body: "Automation, web backends, scripting, data analysis, prototyping, and research all lean on Python. Even non-developers gain real leverage.",
  },
];

export default function WhyCoding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cyber-black text-white relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-cyber-cyan/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-cyber-pink/10 blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="px-6 lg:px-12 py-5 flex justify-between items-center backdrop-blur-xl bg-cyber-black/80 border-b border-cyber-cyan/20 sticky top-0 z-50">
        <button
          onClick={() => navigate("/")}
          data-testid="whycoding-home-btn"
          className="flex items-center gap-3 group"
        >
          <Code2 className="w-7 h-7 text-cyber-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
          <span className="text-xl font-orbitron font-bold text-white tracking-wider">
            BYTE<span className="text-cyber-cyan">BATTLES</span>
          </span>
        </button>
        <Button
          onClick={() => navigate("/")}
          variant="ghost"
          data-testid="whycoding-back-btn"
          className="gap-2 text-slate-400 hover:text-cyber-cyan hover:bg-cyber-cyan/5 font-chakra"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </nav>

      <main className="px-6 lg:px-12 relative z-10 max-w-5xl mx-auto pb-28">
        {/* Hero */}
        <section className="py-20 lg:py-28">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px w-12 bg-cyber-cyan/60" />
            <span className="font-orbitron text-xs text-cyber-cyan uppercase tracking-[0.3em]">
              Why This Still Matters
            </span>
          </div>
          <h1 className="font-chakra font-bold leading-[0.98] mb-8">
            <span className="text-4xl sm:text-5xl lg:text-6xl block heading-glow-cyan">Coding in the</span>
            <span className="text-4xl sm:text-5xl lg:text-6xl block mt-2 text-cyber-cyan heading-glow-cyan">Age of AI</span>
          </h1>
          <p className="text-base lg:text-lg text-slate-300 max-w-2xl font-chakra leading-relaxed">
            AI coding tools like GitHub Copilot, Cursor, ChatGPT, and Claude dramatically accelerate
            writing and even debugging code. But they don't replace the need for human programmers,
            or the educational value of learning to code. Coding is less about typing syntax and more
            about developing a way of thinking that AI cannot fully substitute. It remains highly
            important, arguably more so than before.
          </p>
        </section>

        {/* Pull quote */}
        <section className="mb-20">
          <div className="relative border-l-2 border-cyber-lime/70 bg-cyber-navy/40 p-6 lg:p-8 rounded-none">
            <Quote className="w-8 h-8 text-cyber-lime/70 mb-3" />
            <p className="text-xl lg:text-2xl font-chakra text-white leading-snug">
              The calculator did not eliminate the need to understand mathematics.
              <span className="text-cyber-lime"> AI will not eliminate the need to understand computation.</span>
            </p>
          </div>
        </section>

        {/* Core reasons */}
        <section className="mb-24">
          <div className="flex items-center gap-2 mb-10">
            <span className="font-orbitron text-xs text-cyber-pink uppercase tracking-[0.3em]">
              Core reasons coding still matters
            </span>
            <div className="h-px flex-1 bg-cyber-pink/30" />
          </div>

          <div className="space-y-6">
            {REASONS.map((r, i) => {
              const Icon = r.icon;
              return (
                <div
                  key={i}
                  data-testid={`reason-card-${i}`}
                  className="group flex gap-5 border border-white/10 hover:border-cyber-cyan/40 bg-cyber-navy/30 hover:bg-cyber-navy/50 p-6 lg:p-7 rounded-none transition-all duration-300"
                >
                  <div className={`shrink-0 w-12 h-12 flex items-center justify-center border ${r.wrap}`}>
                    <Icon className={`w-6 h-6 ${r.iconText}`} />
                  </div>
                  <div>
                    <h3 className="font-orbitron text-base lg:text-lg text-white mb-2 flex items-center gap-3">
                      <span className={`${r.num} text-sm`}>{String(i + 1).padStart(2, "0")}</span>
                      {r.title}
                    </h3>
                    <p className="text-sm lg:text-base text-slate-400 font-chakra leading-relaxed">
                      {r.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Why Python */}
        <section className="mb-24">
          <div className="flex items-center gap-3 mb-8">
            <Cpu className="w-6 h-6 text-cyber-lime" />
            <h2 className="font-chakra font-bold text-3xl lg:text-4xl text-white">
              Why <span className="text-cyber-lime heading-glow-lime">Python</span> specifically?
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {PYTHON_POINTS.map((p, i) => (
              <div
                key={i}
                data-testid={`python-point-${i}`}
                className="border border-cyber-lime/20 bg-cyber-navy/30 p-6 rounded-none hover:border-cyber-lime/50 transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-cyber-lime shrink-0" />
                  <h4 className="font-orbitron text-sm text-white">{p.title}</h4>
                </div>
                <p className="text-sm text-slate-400 font-chakra leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing */}
        <section className="mb-20">
          <div className="border border-cyber-cyan/25 bg-gradient-to-b from-cyber-navy/60 to-cyber-black/40 p-8 lg:p-10 rounded-none">
            <p className="text-base lg:text-lg text-slate-300 font-chakra leading-relaxed mb-4">
              The goal of teaching is evolving: less memorizing every language detail, more solid
              fundamentals plus deliberate practice using AI as a co-pilot, with students required to
              explain, test, improve, and take responsibility for the output. Prompt engineering
              without understanding produces brittle results; strong computational foundations plus AI
              fluency produce capable practitioners.
            </p>
            <p className="text-base lg:text-lg text-white font-chakra leading-relaxed">
              AI makes <span className="text-cyber-cyan">writing</span> code faster, but it makes{" "}
              <span className="text-cyber-lime">understanding, directing, evaluating, and innovating with</span>{" "}
              computation more valuable than ever. Teaching students to code, especially in an
              accessible, widely used language like Python, equips them to be{" "}
              <span className="text-cyber-pink">creators and critical stewards</span> of technology
              rather than mere users of it.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="flex flex-col sm:flex-row gap-4">
          <Button
            data-testid="whycoding-trial-btn"
            onClick={() => navigate("/start-trial")}
            className="px-8 py-5 bg-cyber-lime text-cyber-black hover:shadow-[0_0_30px_rgba(163,230,53,0.6)] font-orbitron text-xs uppercase tracking-widest rounded-none border border-cyber-lime transition-all duration-300 font-bold gap-2"
          >
            <Zap className="w-5 h-5" />
            Start 14-Day Trial
          </Button>
          <Button
            data-testid="whycoding-preview-btn"
            onClick={() => navigate("/preview")}
            className="px-8 py-5 bg-transparent border border-cyber-cyan/60 text-cyber-cyan hover:bg-cyber-cyan/10 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] font-orbitron text-xs uppercase tracking-widest rounded-none transition-all duration-300 gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Preview Curriculum Free
          </Button>
          <Button
            data-testid="whycoding-teacher-btn"
            onClick={() => navigate("/teacher-login")}
            className="px-8 py-5 bg-transparent border border-cyber-pink/60 text-cyber-pink hover:bg-cyber-pink/10 hover:shadow-[0_0_20px_rgba(255,0,170,0.4)] font-orbitron text-xs uppercase tracking-widest rounded-none transition-all duration-300 gap-2"
          >
            <GraduationCap className="w-5 h-5" />
            I'm a Teacher
          </Button>
        </section>
      </main>
    </div>
  );
}
