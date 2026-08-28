import { useEffect, useState } from "react";
import axios from "axios";
import { Trophy, Crown, Medal, Zap } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RANK_STYLES = {
  1: { ring: "border-yellow-400/60", glow: "shadow-[0_0_18px_rgba(250,204,21,0.35)]", text: "text-yellow-300", Icon: Crown },
  2: { ring: "border-slate-300/50", glow: "shadow-[0_0_12px_rgba(203,213,225,0.25)]", text: "text-slate-200", Icon: Medal },
  3: { ring: "border-amber-600/50", glow: "shadow-[0_0_12px_rgba(217,119,6,0.25)]", text: "text-amber-500", Icon: Medal },
};

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";

export const TopQuizScorers = ({ currentUserId }) => {
  const [scorers, setScorers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await axios.get(`${API}/leaderboard/top-quiz-scorers?days=7&limit=5`, {
          withCredentials: true,
        });
        if (alive) setScorers(res.data?.scorers || []);
      } catch (e) {
        if (alive) setScorers([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return null;

  return (
    <div
      data-testid="top-quiz-scorers"
      className="mb-8 rounded-none border border-cyber-lime/25 bg-cyber-navy/40 px-5 py-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-cyber-lime" />
        <h3 className="font-orbitron uppercase tracking-wider text-cyber-lime text-sm sm:text-base">
          Top Quiz Scorers · This Week
        </h3>
      </div>

      {scorers.length === 0 ? (
        <p className="text-slate-500 font-chakra text-sm" data-testid="top-quiz-scorers-empty">
          No quiz points earned yet this week — ace a quiz to claim the top spot! ⚡
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {scorers.map((s) => {
            const style = RANK_STYLES[s.rank] || {
              ring: "border-cyber-cyan/25",
              glow: "",
              text: "text-cyber-cyan",
              Icon: Zap,
            };
            const { Icon } = style;
            const isMe = s.id === currentUserId;
            return (
              <div
                key={s.id}
                data-testid={`quiz-scorer-${s.rank}`}
                className={`flex items-center gap-3 shrink-0 rounded-none border ${style.ring} ${style.glow} ${
                  isMe ? "bg-cyber-cyan/10" : "bg-cyber-black/40"
                } px-3 py-2 min-w-[190px]`}
              >
                <div className={`flex items-center gap-1 font-orbitron font-bold ${style.text}`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">#{s.rank}</span>
                </div>
                {s.picture ? (
                  <img
                    src={s.picture}
                    alt={s.name}
                    className="w-9 h-9 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-cyber-navy border border-white/10 flex items-center justify-center text-xs font-bold text-cyber-cyan">
                    {initials(s.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate max-w-[90px]">
                    {isMe ? "You" : s.name}
                  </p>
                  <p className="text-xs text-cyber-lime font-orbitron">{s.xp} XP</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TopQuizScorers;
