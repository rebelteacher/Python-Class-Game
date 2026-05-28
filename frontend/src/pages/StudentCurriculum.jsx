import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, Unlock, ChevronDown, ChevronRight, Play, Code2, ArrowLeft } from "lucide-react";
import CyberRain from "@/components/CyberRain";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UNIT_ICONS = { block: "puzzle-piece", turtle: "palette", code: "terminal", microbit: "cpu" };
const UNIT_COLORS = {
  block: { border: "border-purple-500/30", hover: "hover:border-purple-500/60", glow: "hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]", text: "text-purple-400", bg: "bg-purple-500/10" },
  turtle: { border: "border-cyber-lime/30", hover: "hover:border-cyber-lime/60", glow: "hover:shadow-[0_0_15px_rgba(57,255,20,0.3)]", text: "text-cyber-lime", bg: "bg-cyber-lime/10" },
  code: { border: "border-blue-500/30", hover: "hover:border-blue-500/60", glow: "hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]", text: "text-blue-400", bg: "bg-blue-500/10" },
  microbit: { border: "border-cyber-cyan/30", hover: "hover:border-cyber-cyan/60", glow: "hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]", text: "text-cyber-cyan", bg: "bg-cyber-cyan/10" },
};

export default function StudentCurriculum({ user }) {
  const navigate = useNavigate();
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState(new Set());

  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const response = await axios.get(`${API}/student/curriculum`, { withCredentials: true });
        setCurriculum(response.data);
        if (response.data.units?.length > 0) {
          setSelectedUnit(response.data.units[0].assignment_type);
        }
      } catch (error) {
        console.error("Error fetching curriculum:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCurriculum();
  }, []);

  const toggleChapter = (name) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg flex items-center justify-center">
        <div className="text-cyber-cyan font-orbitron animate-pulse">Loading curriculum...</div>
      </div>
    );
  }

  const currentUnit = curriculum?.units?.find(u => u.assignment_type === selectedUnit);
  const colors = UNIT_COLORS[selectedUnit] || UNIT_COLORS.block;

  return (
    <div data-testid="student-curriculum" className="min-h-screen bg-cyber-black cyber-grid-bg relative overflow-hidden">
      <CyberRain density={20} speed={0.6} />

      {/* Nav */}
      <nav className="bg-cyber-navy/80 backdrop-blur-xl border-b border-cyber-cyan/20 px-6 py-3 flex items-center justify-between sticky top-0 z-50 relative">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/student/dashboard")} className="text-slate-400 hover:text-cyber-cyan rounded-none gap-1">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Button>
          <div className="h-5 w-px bg-cyber-cyan/20" />
          <h1 className="text-lg font-orbitron text-cyber-cyan uppercase tracking-wider heading-glow-cyan">Curriculum</h1>
        </div>
        <span className="text-sm font-chakra text-slate-400">{user?.name}</span>
      </nav>

      <div className="flex h-[calc(100vh-57px)] relative z-10">
        {/* Unit Sidebar */}
        <div className="w-56 bg-cyber-navy/50 border-r border-cyber-cyan/20 p-3 flex flex-col gap-2 shrink-0">
          {curriculum?.units?.map(unit => {
            const uc = UNIT_COLORS[unit.assignment_type] || UNIT_COLORS.block;
            return (
              <button
                key={unit.assignment_type}
                onClick={() => { setSelectedUnit(unit.assignment_type); setExpandedChapters(new Set()); }}
                className={`text-left px-3 py-3 text-sm font-chakra rounded-none transition-all border ${
                  selectedUnit === unit.assignment_type
                    ? `${uc.bg} ${uc.text} ${uc.border}`
                    : 'text-slate-400 hover:text-white hover:bg-cyber-navy/60 border-transparent'
                }`}
              >
                <div className="font-orbitron text-xs uppercase tracking-wider mb-0.5">{unit.name}</div>
                <div className="text-xs text-slate-500">{unit.chapters.length} chapters</div>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-3xl">
            {currentUnit ? (
              <div className="space-y-3">
                {currentUnit.chapters.map(chapter => (
                  <div key={chapter.name} className={`border ${colors.border} rounded-none`}>
                    {/* Chapter Header */}
                    <button
                      onClick={() => toggleChapter(chapter.name)}
                      className="w-full flex items-center justify-between p-4 bg-cyber-navy/60 hover:bg-cyber-navy/80 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedChapters.has(chapter.name)
                          ? <ChevronDown className={`w-4 h-4 ${colors.text}`} />
                          : <ChevronRight className="w-4 h-4 text-slate-500" />}
                        <span className="font-orbitron text-sm text-white uppercase tracking-wider">{chapter.name}</span>
                      </div>
                      <span className="text-xs text-slate-500 font-chakra">{chapter.lessons.length} lessons</span>
                    </button>

                    {/* Lessons */}
                    {expandedChapters.has(chapter.name) && (
                      <div className="border-t border-cyber-cyan/10 divide-y divide-cyber-cyan/5">
                        {chapter.lessons.map(lesson => (
                          <div
                            key={lesson.lesson_key}
                            className={`flex items-center justify-between px-6 py-3 transition-colors ${
                              lesson.is_unlocked ? 'hover:bg-cyber-navy/30 cursor-pointer' : 'opacity-50'
                            }`}
                            onClick={() => {
                              if (lesson.is_unlocked) {
                                navigate(`/lesson/${currentUnit.assignment_type}/${encodeURIComponent(chapter.name)}/${encodeURIComponent(lesson.name)}`);
                              }
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {lesson.is_unlocked
                                ? <Unlock className={`w-4 h-4 ${colors.text}`} />
                                : <Lock className="w-4 h-4 text-slate-600" />}
                              <div>
                                <span className={`text-sm font-chakra ${lesson.is_unlocked ? 'text-slate-200' : 'text-slate-600'}`}>
                                  {lesson.name}
                                </span>
                                <span className="text-xs text-slate-600 font-fira ml-2">{lesson.problem_count} problems</span>
                              </div>
                            </div>
                            {lesson.is_unlocked && (
                              <Button size="sm" variant="ghost" className={`${colors.text} rounded-none text-xs h-7 px-2 gap-1`}>
                                <Play className="w-3.5 h-3.5" /> Start
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-20 font-chakra">Select a unit to begin</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
