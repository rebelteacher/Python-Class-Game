import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Code2, Users, BookOpen, CheckCircle, GraduationCap, UserCircle, MessageCircle, Zap, Terminal, Cpu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContactForm from "@/components/ContactForm";
import CyberRain from "@/components/CyberRain";

const REDIRECT_URL = window.location.origin + "/student/dashboard";
const AUTH_BASE_URL = "https://auth.emergentagent.com";
const AUTH_URL = `${AUTH_BASE_URL}/?redirect=${encodeURIComponent(REDIRECT_URL)}`;

export default function LandingPage() {
  const navigate = useNavigate();
  const [contactOpen, setContactOpen] = useState(false);
  
  const handleStudentLogin = () => {
    window.location.href = AUTH_URL;
  };

  const handleTeacherLogin = () => {
    navigate("/teacher-login");
  };

  return (
    <div data-testid="landing-page" className="min-h-screen bg-cyber-black cyber-grid-bg relative overflow-hidden">
      <CyberRain density={40} speed={1.2} />
      {/* Nav */}
      <nav className="px-6 lg:px-12 py-5 flex justify-between items-center backdrop-blur-xl bg-cyber-black/80 border-b border-cyber-cyan/20 sticky top-0 z-50 relative">
        <div className="flex items-center gap-3">
          <Code2 className="w-7 h-7 text-cyber-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
          <span className="text-xl font-orbitron font-bold text-white tracking-wider">
            BYTE<span className="text-cyber-cyan">BATTLES</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setContactOpen(true)} 
            variant="ghost"
            className="gap-2 text-slate-400 hover:text-cyber-cyan hover:bg-cyber-cyan/5 font-chakra"
          >
            <MessageCircle className="w-4 h-4" />
            Contact
          </Button>
          <Button 
            data-testid="nav-teacher-login-btn"
            onClick={handleTeacherLogin} 
            className="gap-2 bg-transparent border border-cyber-cyan/50 text-cyber-cyan hover:bg-cyber-cyan/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] font-orbitron text-xs uppercase tracking-widest rounded-none transition-all duration-300"
          >
            <GraduationCap className="w-4 h-4" />
            Teacher
          </Button>
          <Button 
            data-testid="nav-login-btn" 
            onClick={handleStudentLogin} 
            className="gap-2 bg-cyber-cyan text-cyber-black hover:shadow-[0_0_25px_rgba(0,240,255,0.7)] font-orbitron text-xs uppercase tracking-widest rounded-none border border-cyber-cyan transition-all duration-300 font-bold"
          >
            <UserCircle className="w-4 h-4" />
            Student
          </Button>
        </div>
      </nav>

      <main className="px-6 lg:px-12 relative z-10">
        {/* Hero Section */}
        <section className="py-24 lg:py-32 max-w-5xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px w-12 bg-cyber-cyan/60" />
            <span className="font-orbitron text-xs text-cyber-cyan uppercase tracking-[0.3em]">Coding Education Platform</span>
          </div>
          
          <h1 className="font-chakra font-bold text-white leading-[0.95] mb-8">
            <span className="text-4xl sm:text-5xl lg:text-6xl block heading-glow-cyan">Where Code</span>
            <span className="text-4xl sm:text-5xl lg:text-6xl block mt-2 text-cyber-cyan heading-glow-cyan">Meets Competition</span>
          </h1>
          
          <p className="text-base lg:text-lg text-slate-400 mb-12 max-w-xl font-chakra leading-relaxed">
            The ultimate coding education platform with gamification, team battles, and AI-powered grading. Make learning Python an epic adventure.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              data-testid="hero-teacher-btn"
              onClick={handleTeacherLogin}
              className="px-8 py-5 bg-transparent border border-cyber-pink/60 text-cyber-pink hover:bg-cyber-pink/10 hover:shadow-[0_0_20px_rgba(255,0,170,0.4)] font-orbitron text-xs uppercase tracking-widest rounded-none transition-all duration-300 gap-2"
            >
              <GraduationCap className="w-5 h-5" />
              I&apos;m a Teacher
            </Button>
            <Button 
              data-testid="hero-get-started-btn" 
              onClick={handleStudentLogin} 
              className="px-8 py-5 bg-cyber-cyan text-cyber-black hover:shadow-[0_0_30px_rgba(0,240,255,0.7)] font-orbitron text-xs uppercase tracking-widest rounded-none border border-cyber-cyan transition-all duration-300 font-bold gap-2"
            >
              <Zap className="w-5 h-5" />
              I&apos;m a Student
            </Button>
            <Button
              data-testid="hero-preview-btn"
              onClick={() => navigate("/preview")}
              className="px-8 py-5 bg-transparent border border-cyber-lime/60 text-cyber-lime hover:bg-cyber-lime/10 hover:shadow-[0_0_20px_rgba(163,230,53,0.4)] font-orbitron text-xs uppercase tracking-widest rounded-none transition-all duration-300 gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Preview Curriculum Free
            </Button>
            <Button
              data-testid="hero-trial-btn"
              onClick={() => navigate("/start-trial")}
              className="px-8 py-5 bg-cyber-lime text-cyber-black hover:shadow-[0_0_30px_rgba(163,230,53,0.6)] font-orbitron text-xs uppercase tracking-widest rounded-none border border-cyber-lime transition-all duration-300 font-bold gap-2"
            >
              <Zap className="w-5 h-5" />
              Start 14-Day Trial
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="pb-24 lg:pb-32 grid md:grid-cols-3 gap-6 max-w-5xl">
          <div data-testid="feature-classrooms" className="group bg-cyber-navy/60 backdrop-blur-sm border border-cyber-cyan/20 p-8 hover:border-cyber-cyan/60 hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-all duration-500">
            <div className="w-12 h-12 border border-cyber-cyan/40 flex items-center justify-center mb-5 group-hover:shadow-[0_0_12px_rgba(0,240,255,0.4)] transition-all duration-500">
              <Users className="w-6 h-6 text-cyber-cyan" />
            </div>
            <h3 className="font-orbitron text-sm uppercase tracking-wider text-white mb-3">Easy Classrooms</h3>
            <p className="text-slate-400 font-chakra text-sm leading-relaxed">Create classrooms with unique codes. Students join instantly and start coding.</p>
          </div>

          <div data-testid="feature-assignments" className="group bg-cyber-navy/60 backdrop-blur-sm border border-cyber-pink/20 p-8 hover:border-cyber-pink/60 hover:shadow-[0_0_20px_rgba(255,0,170,0.15)] transition-all duration-500">
            <div className="w-12 h-12 border border-cyber-pink/40 flex items-center justify-center mb-5 group-hover:shadow-[0_0_12px_rgba(255,0,170,0.4)] transition-all duration-500">
              <Terminal className="w-6 h-6 text-cyber-pink" />
            </div>
            <h3 className="font-orbitron text-sm uppercase tracking-wider text-white mb-3">Code Challenges</h3>
            <p className="text-slate-400 font-chakra text-sm leading-relaxed">Create coding challenges with starter code, live preview, and multiple test cases.</p>
          </div>

          <div data-testid="feature-ai-grading" className="group bg-cyber-navy/60 backdrop-blur-sm border border-cyber-lime/20 p-8 hover:border-cyber-lime/60 hover:shadow-[0_0_20px_rgba(57,255,20,0.15)] transition-all duration-500">
            <div className="w-12 h-12 border border-cyber-lime/40 flex items-center justify-center mb-5 group-hover:shadow-[0_0_12px_rgba(57,255,20,0.4)] transition-all duration-500">
              <Cpu className="w-6 h-6 text-cyber-lime" />
            </div>
            <h3 className="font-orbitron text-sm uppercase tracking-wider text-white mb-3">AI Grading</h3>
            <p className="text-slate-400 font-chakra text-sm leading-relaxed">Automatic grading with AI-powered partial credit and detailed feedback.</p>
          </div>
        </section>

        {/* SEO/Content section — long-form copy so search engines and humans
            both understand what ByteBattles is, who it's for, and how it works. */}
        <section data-testid="why-bytebattles-section" className="pb-24 lg:pb-32 max-w-5xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px w-12 bg-cyber-pink/60" />
            <span className="font-orbitron text-xs text-cyber-pink uppercase tracking-[0.3em]">Why ByteBattles</span>
          </div>
          <h2 className="font-chakra font-bold text-white text-3xl sm:text-4xl mb-6 heading-glow-cyan">
            A complete K-12 coding curriculum built by a real teacher
          </h2>
          <div className="grid md:grid-cols-2 gap-10 text-slate-300 font-chakra leading-relaxed">
            <div className="space-y-4 text-base">
              <p>
                ByteBattles is a coding education platform built specifically for middle-school and homeschool
                classrooms. Students progress through a structured curriculum of <strong className="text-cyber-cyan">visual block
                programming</strong>, <strong className="text-cyber-cyan">Python turtle graphics</strong>, and
                <strong className="text-cyber-cyan"> text-based Python</strong> — each lesson scaffolded so beginners
                can succeed and advanced students stay challenged.
              </p>
              <p>
                Every assignment runs in the browser, so there is nothing for your students or your IT department to
                install. Code executes safely on our servers, results are graded automatically against test cases,
                and an AI assistant gives students constructive feedback while you focus on teaching.
              </p>
              <p>
                Teachers get classroom management, per-class lesson locks, test scheduling with late-penalty
                controls, a question bank for multiple-choice quizzes, and detailed reports showing exactly which
                students are stuck and where.
              </p>
            </div>
            <div className="space-y-4 text-base">
              <h3 className="font-orbitron text-sm uppercase tracking-widest text-cyber-cyan mb-2">What students learn</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-cyber-lime shrink-0 mt-1" /><span><strong className="text-white">Unit 1 — Block-Based Coding:</strong> sequencing, loops, variables, conditionals, and decisions using drag-and-drop blocks.</span></li>
                <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-cyber-lime shrink-0 mt-1" /><span><strong className="text-white">Unit 2 — Python Turtle Graphics:</strong> first steps in Python with visual feedback, loops, colors, conditionals, and functions.</span></li>
                <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-cyber-lime shrink-0 mt-1" /><span><strong className="text-white">Unit 3 — Python Text:</strong> print, input, lists, dictionaries, file I/O, and classic beginner projects.</span></li>
                <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-cyber-lime shrink-0 mt-1" /><span><strong className="text-white">Unit 4 — micro:bit:</strong> physical computing with hardware sensors and outputs.</span></li>
              </ul>
              <p className="text-sm pt-2">
                The curriculum is aligned to <strong className="text-white">CSTA K-12 standards</strong> and rated by
                <strong className="text-white"> Depth of Knowledge (DOK)</strong> levels 2–4 so you can see exactly
                which standards each lesson covers when reporting to your school or co-op.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ section — helps long-tail SEO ("is bytebattles free", "what languages", etc.) */}
        <section data-testid="faq-section" className="pb-24 lg:pb-32 max-w-4xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px w-12 bg-cyber-lime/60" />
            <span className="font-orbitron text-xs text-cyber-lime uppercase tracking-[0.3em]">Common Questions</span>
          </div>
          <h2 className="font-chakra font-bold text-white text-3xl sm:text-4xl mb-8 heading-glow-cyan">Frequently asked</h2>
          <div className="space-y-6 text-slate-300 font-chakra text-base leading-relaxed">
            <div>
              <h3 className="text-white font-orbitron text-sm uppercase tracking-wider mb-2">What ages is ByteBattles for?</h3>
              <p>The curriculum is designed for grades 6–9 but works for any beginner from age 10 and up. Younger students typically start in Unit 1 (blocks) and advanced students can jump straight into Python (Unit 3). Self-paced learners of any age are welcome too.</p>
            </div>
            <div>
              <h3 className="text-white font-orbitron text-sm uppercase tracking-wider mb-2">Do students need to install anything?</h3>
              <p>No. ByteBattles runs entirely in the browser — Chrome, Edge, Safari, and Firefox all work. Chromebooks, iPads, Windows, and Mac are all supported. Python code runs on our servers, so students never have to install Python locally.</p>
            </div>
            <div>
              <h3 className="text-white font-orbitron text-sm uppercase tracking-wider mb-2">Is ByteBattles aligned to standards?</h3>
              <p>Yes — every lesson is mapped to the appropriate <strong className="text-white">CSTA K-12 Computer Science Standard</strong> and tagged with a Depth-of-Knowledge level. Teachers can pull a report at any time showing standards coverage for the class.</p>
            </div>
            <div>
              <h3 className="text-white font-orbitron text-sm uppercase tracking-wider mb-2">Can homeschool co-ops use it?</h3>
              <p>Absolutely. Homeschool parents and co-op leaders can create classrooms, invite their kids with a join code, and use ByteBattles as their full computer-science curriculum for the year. The Help button in-app walks teachers through every feature step by step.</p>
            </div>
            <div>
              <h3 className="text-white font-orbitron text-sm uppercase tracking-wider mb-2">How does grading work?</h3>
              <p>Coding problems are graded automatically against hidden test cases. Multiple-choice tests grade instantly. The AI assistant gives students written feedback on what they got right and where they went wrong — without ever giving away the answer.</p>
            </div>
            <div>
              <h3 className="text-white font-orbitron text-sm uppercase tracking-wider mb-2">Is there a free trial?</h3>
              <p>Pilot programs are currently open to schools, homeschool co-ops, and individual teachers. Use the <span className="text-cyber-cyan">Contact</span> button at the top of the page to get in touch about pricing and pilot access.</p>
            </div>
          </div>
        </section>
      </main>

      <ContactForm isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
