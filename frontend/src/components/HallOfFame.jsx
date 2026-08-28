import { useEffect, useState } from "react";
import axios from "axios";
import { Crown, Sparkles } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";

export const HallOfFame = ({ currentUserId }) => {
  const [champions, setChampions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await axios.get(`${API}/leaderboard/hall-of-fame?limit=12`, {
          withCredentials: true,
        });
        if (alive) setChampions(res.data?.champions || []);
      } catch (e) {
        if (alive) setChampions([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Hide entirely until the first champion is crowned (keeps the dashboard clean pre-season)
  if (loading || champions.length === 0) return null;

  return (
    <div
      data-testid="hall-of-fame"
      className="mb-8 rounded-none border border-yellow-400/25 bg-cyber-navy/40 px-5 py-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Crown className="w-5 h-5 text-yellow-300" />
        <h3 className="font-orbitron uppercase tracking-wider text-yellow-300 text-sm sm:text-base">
          Hall of Fame · Past Champions
        </h3>
        <Sparkles className="w-4 h-4 text-yellow-300/70" />
      </div>

      <div className="space-y-2">
        {champions.map((c, idx) => {
          const isMe = c.champion_id === currentUserId;
          const isLatest = idx === 0;
          return (
            <div
              key={c.week_start}
              data-testid={`hof-row-${idx}`}
              className={`flex items-center gap-3 rounded-none border px-3 py-2 ${
                isLatest
                  ? "border-yellow-400/50 bg-yellow-400/10 shadow-[0_0_14px_rgba(250,204,21,0.2)]"
                  : "border-white/5 bg-cyber-black/40"
              }`}
            >
              <span className="w-20 shrink-0 text-xs font-chakra text-slate-400">
                {c.week_label}
              </span>
              {c.champion_picture ? (
                <img
                  src={c.champion_picture}
                  alt={c.champion_name}
                  className="w-8 h-8 rounded-full object-cover border border-yellow-400/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-cyber-navy border border-yellow-400/30 flex items-center justify-center text-xs font-bold text-yellow-300">
                  {initials(c.champion_name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">
                  {isMe ? "You" : c.champion_name}
                  {isLatest && (
                    <span className="ml-2 text-[10px] font-orbitron uppercase text-yellow-300/90">
                      Reigning
                    </span>
                  )}
                </p>
              </div>
              {c.champion_weeks > 1 && (
                <span
                  title={`${c.champion_weeks}× weekly champion`}
                  className="inline-flex items-center gap-0.5 rounded-full bg-yellow-400/10 border border-yellow-400/40 px-1.5 py-0.5 text-[10px] font-orbitron font-bold text-yellow-300"
                >
                  <Crown className="w-3 h-3" />
                  {c.champion_weeks}×
                </span>
              )}
              <span className="shrink-0 text-xs text-cyber-lime font-orbitron">{c.xp} XP</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HallOfFame;
