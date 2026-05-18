import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Code2, Users, BookOpen, CheckCircle, GraduationCap, UserCircle, MessageCircle, Zap, Terminal, Cpu } from "lucide-react";
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
              I'm a Teacher
            </Button>
            <Button 
              data-testid="hero-get-started-btn" 
              onClick={handleStudentLogin} 
              className="px-8 py-5 bg-cyber-cyan text-cyber-black hover:shadow-[0_0_30px_rgba(0,240,255,0.7)] font-orbitron text-xs uppercase tracking-widest rounded-none border border-cyber-cyan transition-all duration-300 font-bold gap-2"
            >
              <Zap className="w-5 h-5" />
              I'm a Student
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
      </main>

      <ContactForm isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
