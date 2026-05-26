import { useEffect, useState } from "react";
import axios from "axios";
import { Trophy, Crown, Medal, Award } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BADGE_STYLES = [
  { bg: "bg-yellow-500/20", border: "border-yellow-500/50", text: "text-yellow-400", glow: "shadow-[0_0_12px_rgba(234,179,8,0.4)]", icon: Crown, label: "1st" },
  { bg: "bg-slate-400/20", border: "border-slate-400/50", text: "text-slate-300", glow: "shadow-[0_0_10px_rgba(148,163,184,0.3)]", icon: Medal, label: "2nd" },
  { bg: "bg-orange-600/20", border: "border-orange-600/50", text: "text-orange-400", glow: "shadow-[0_0_10px_rgba(234,88,12,0.3)]", icon: Award, label: "3rd" },
];

function RankColumn({ title, top3, color }) {
  const colorMap = {
    cyan: { header: "bg-cyber-cyan/10 border-cyber-cyan/30 text-cyber-cyan", headerGlow: "shadow-[0_0_10px_rgba(0,240,255,0.2)]" },
    pink: { header: "bg-cyber-pink/10 border-cyber-pink/30 text-cyber-pink", headerGlow: "shadow-[0_0_10px_rgba(255,0,170,0.2)]" },
    lime: { header: "bg-cyber-lime/10 border-cyber-lime/30 text-cyber-lime", headerGlow: "shadow-[0_0_10px_rgba(57,255,20,0.2)]" },
  };
  const c = colorMap[color] || colorMap.cyan;

  return (
    <div className="flex-1">
      <div className={`text-center py-2 px-3 border rounded-none font-orbitron text-xs uppercase tracking-widest mb-3 ${c.header} ${c.headerGlow}`}>
        {title}
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
                <p className="text-sm font-chakra text-white truncate">{student.name}</p>
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

  useEffect(() => {
    if (!currentUserId) return;
    const fetchRanks = async () => {
      try {
        const response = await axios.get(`${API}/leaderboard/ranks/${currentUserId}`, {
          withCredentials: true,
        });
        setData(response.data);
      } catch (error) {
        console.error("Error fetching leaderboard ranks:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRanks();
  }, [currentUserId]);

  if (loading) {
    return <div className="text-center py-8 text-slate-500 font-chakra">Loading leaderboard...</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-slate-500 font-chakra">Leaderboard unavailable</div>;
  }

  return (
    <div data-testid="leaderboard-card" className="space-y-6">
      {/* Your Ranks Row */}
      <div className="bg-cyber-navy/60 border border-cyber-cyan/20 p-4 rounded-none">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-500 font-orbitron uppercase tracking-wider mb-1">Name</p>
            <p className="text-sm font-chakra text-white font-semibold">{data.student_name}</p>
          </div>
          <div>
            <p className="text-xs text-cyber-cyan font-orbitron uppercase tracking-wider mb-1">Class Rank</p>
            <p className="text-lg font-orbitron text-cyber-cyan heading-glow-cyan font-bold">{data.class_rank}</p>
          </div>
          <div>
            <p className="text-xs text-cyber-pink font-orbitron uppercase tracking-wider mb-1">Teacher Rank</p>
            <p className="text-lg font-orbitron text-cyber-pink heading-glow-pink font-bold">{data.teacher_rank}</p>
          </div>
          <div>
            <p className="text-xs text-cyber-lime font-orbitron uppercase tracking-wider mb-1">Overall Rank</p>
            <p className="text-lg font-orbitron text-cyber-lime heading-glow-lime font-bold">{data.overall_rank}</p>
          </div>
        </div>
      </div>

      {/* Top 3 Columns */}
      <div className="flex gap-4">
        <RankColumn title="Class Rank" top3={data.class_top3} color="cyan" />
        <RankColumn title="Teacher Rank" top3={data.teacher_top3} color="pink" />
        <RankColumn title="Overall Rank" top3={data.overall_top3} color="lime" />
      </div>
    </div>
  );
}
