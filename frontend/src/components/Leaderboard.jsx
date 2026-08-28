import { useEffect, useState } from "react";
import axios from "axios";
import { Trophy, Crown, Medal, Award } from "lucide-react";
import { toast } from "sonner";
import BeastBadge from "./BeastBadge";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BADGE_STYLES = [
  { bg: "bg-yellow-500/20", border: "border-yellow-500/50", text: "text-yellow-400", glow: "shadow-[0_0_12px_rgba(234,179,8,0.4)]", icon: Crown, label: "1st" },
  { bg: "bg-slate-400/20", border: "border-slate-400/50", text: "text-slate-300", glow: "shadow-[0_0_10px_rgba(148,163,184,0.3)]", icon: Medal, label: "2nd" },
  { bg: "bg-orange-600/20", border: "border-orange-600/50", text: "text-orange-400", glow: "shadow-[0_0_10px_rgba(234,88,12,0.3)]", icon: Award, label: "3rd" },
];

function RankColumn({ title, top3, color, subtitle, secondaryTitle }) {
  const colorMap = {
    cyan: { header: "bg-cyber-cyan/10 border-cyber-cyan/30 text-cyber-cyan", headerGlow: "shadow-[0_0_10px_rgba(0,240,255,0.2)]" },
    pink: { header: "bg-cyber-pink/10 border-cyber-pink/30 text-cyber-pink", headerGlow: "shadow-[0_0_10px_rgba(255,0,170,0.2)]" },
    lime: { header: "bg-cyber-lime/10 border-cyber-lime/30 text-cyber-lime", headerGlow: "shadow-[0_0_10px_rgba(57,255,20,0.2)]" },
    amber: { header: "bg-amber-500/10 border-amber-500/30 text-amber-400", headerGlow: "shadow-[0_0_10px_rgba(245,158,11,0.25)]" },
  };
  const c = colorMap[color] || colorMap.cyan;

  return (
    <div className="flex-1 min-w-0">
      <div className={`text-center py-2 px-3 border rounded-none font-orbitron text-xs uppercase tracking-widest mb-3 ${c.header} ${c.headerGlow}`}>
        <div className="leading-tight">{title}</div>
        {secondaryTitle && (
          <div className="text-[9px] opacity-60 tracking-widest mt-0.5">{secondaryTitle}</div>
        )}
        {subtitle && (
          <div className="text-[10px] normal-case font-chakra tracking-normal opacity-70 mt-0.5 truncate">
            {subtitle}
          </div>
        )}
      </div>
      <div className="space-y-2">
        {top3.map((student, i) => {
          const badge = BADGE_STYLES[i];
          const BadgeIcon = badge.icon;
          return (
            <div
              key={i}
              data-testid={`rank-${color}-${i + 1}`}
              className={`flex items-center gap-2 p-2 border rounded-none ${badge.bg} ${badge.border} ${badge.glow} transition-all`}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-none border ${badge.border} ${badge.bg}`}>
                <BadgeIcon className={`w-4 h-4 ${badge.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-chakra text-white truncate flex items-center gap-1.5">
                  <span className="truncate">{student.name}</span>
                  {student.id && <BeastBadge studentId={student.id} showLabel={false} />}
                </p>
                <p className={`text-xs font-fira ${badge.text}`}>{student.xp} XP</p>
              </div>
              <span className={`text-xs font-orbitron ${badge.text}`}>{badge.label}</span>
            </div>
          );
        })}
        {top3.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4 font-chakra">No data yet</p>
        )}
      </div>
    </div>
  );
}

export default function Leaderboard({ classroomId, currentUserId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null); // { role, school } — for the "Set school" prompt
  const isClassroomMode = !!classroomId;

  useEffect(() => {
    if (isClassroomMode ? !classroomId : !currentUserId) return;
    const fetchRanks = async () => {
      try {
        const endpoint = isClassroomMode
          ? `${API}/leaderboard/classroom/${classroomId}/ranks`
          : `${API}/leaderboard/ranks/${currentUserId}`;
        const [ranksRes, meRes] = await Promise.all([
          axios.get(endpoint, { withCredentials: true }),
          axios.get(`${API}/auth/me`, { withCredentials: true }).catch(() => null),
        ]);
        setData(ranksRes.data);
        if (meRes) setViewer({ role: meRes.data.role, school: meRes.data.school || "", district: meRes.data.district || "" });
      } catch (error) {
        console.error("Error fetching leaderboard ranks:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRanks();
  }, [classroomId, currentUserId]);

  const handleSetSchool = async () => {
    const school = window.prompt(
      "Enter your school name (this groups your class into the School Rank leaderboard):",
      viewer?.school || ""
    );
    if (school === null) return;
    const trimmed = school.trim();
    if (!trimmed) {
      toast.error("School name cannot be empty");
      return;
    }
    try {
      await axios.post(
        `${API}/auth/update-school`,
        { school: trimmed },
        { withCredentials: true }
      );
      toast.success(`School set to "${trimmed}" — reloading rankings…`);
      // Refetch ranks so the new school shows up
      const endpoint = isClassroomMode
        ? `${API}/leaderboard/classroom/${classroomId}/ranks`
        : `${API}/leaderboard/ranks/${currentUserId}`;
      const res = await axios.get(endpoint, { withCredentials: true });
      setData(res.data);
      setViewer((v) => ({ ...v, school: trimmed }));
    } catch (error) {
      console.error("Update school failed:", error);
      toast.error(error.response?.data?.detail || "Could not update school");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500 font-chakra">Loading leaderboard...</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-slate-500 font-chakra">Leaderboard unavailable</div>;
  }

  return (
    <div data-testid="leaderboard-card" className="space-y-6">
      {/* School year context */}
      <div className="flex items-center justify-end gap-3">
        {isClassroomMode && !data.school_name && viewer?.role === "teacher" && (
          <button
            type="button"
            onClick={handleSetSchool}
            data-testid="set-school-btn"
            className="text-[11px] text-amber-500/90 hover:text-amber-300 underline font-chakra"
          >
            Set your school →
          </button>
        )}
        {data.school_year_start && (
          <p className="text-[11px] text-slate-500 font-chakra text-right">
            Ranked on XP earned since {new Date(data.school_year_start).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </p>
        )}
      </div>

      {/* Your Ranks Row — only in personal (student) mode */}
      {!isClassroomMode && (
      <div className="bg-cyber-navy/60 border border-cyber-cyan/20 p-4 rounded-none">
        <div className="grid grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-500 font-orbitron uppercase tracking-wider mb-1">Name</p>
            <p className="text-sm font-chakra text-white font-semibold flex items-center justify-center gap-1.5" data-testid="leaderboard-my-name">
              <span className="truncate">{data.student_name}</span>
              <BeastBadge studentId={currentUserId} showLabel={false} />
            </p>
            <p className="text-[11px] text-slate-500 font-fira mt-0.5" data-testid="leaderboard-my-xp">{data.student_xp} XP</p>
          </div>
          <div>
            <p className="text-xs text-cyber-cyan font-orbitron uppercase tracking-wider mb-1">Class Rank</p>
            <p className="text-lg font-orbitron text-cyber-cyan heading-glow-cyan font-bold" data-testid="my-class-rank">{data.class_rank}</p>
          </div>
          <div>
            <p className="text-xs text-cyber-pink font-orbitron uppercase tracking-wider mb-1">Teacher Rank</p>
            <p className="text-lg font-orbitron text-cyber-pink heading-glow-pink font-bold" data-testid="my-teacher-rank">{data.teacher_rank}</p>
          </div>
          <div>
            <p className="text-xs text-amber-400 font-orbitron uppercase tracking-wider mb-1">School Rank</p>
            <p className="text-lg font-orbitron text-amber-400 font-bold" data-testid="my-school-rank">{data.school_rank}</p>
            {data.school_name ? (
              <p className="text-[10px] text-slate-500 font-chakra mt-0.5 truncate">{data.school_name}</p>
            ) : viewer?.role === "teacher" ? (
              <button
                type="button"
                onClick={handleSetSchool}
                data-testid="set-school-btn"
                className="text-[10px] text-amber-500/80 hover:text-amber-300 underline font-chakra mt-0.5"
              >
                Set your school →
              </button>
            ) : (
              <p className="text-[10px] text-slate-600 font-chakra mt-0.5">School not set</p>
            )}
          </div>
          <div>
            <p className="text-xs text-cyber-lime font-orbitron uppercase tracking-wider mb-1 leading-tight">
              ByteBattles Beasts
              <span className="block text-[9px] text-cyber-lime/60 tracking-widest mt-0.5">Overall</span>
            </p>
            <p className="text-lg font-orbitron text-cyber-lime heading-glow-lime font-bold" data-testid="my-overall-rank">{data.overall_rank}</p>
            <p className="text-[10px] text-slate-500 font-chakra mt-0.5">of {data.total_students} active</p>
          </div>
        </div>
      </div>
      )}

      {/* Top 3 Columns */}
      <div className="flex gap-3 flex-wrap md:flex-nowrap">
        <RankColumn title="Class Rank" subtitle={data.class_name} top3={data.class_top3} color="cyan" />
        <RankColumn title="Teacher Rank" subtitle={data.teacher_name} top3={data.teacher_top3} color="pink" />
        <RankColumn title="School Rank" subtitle={data.school_name || "School not set"} top3={data.school_top3} color="amber" />
        <RankColumn title="ByteBattles Beasts" secondaryTitle="Overall" subtitle="Platform-wide" top3={data.overall_top3} color="lime" />
      </div>
    </div>
  );
}
