export default function RankBadge({ rank, xp, size = "normal" }) {
  const rankData = {
    "Rookie": { icon: "🟤", color: "#6B7280", nextXp: 500 },
    "Bronze Coder": { icon: "🥉", color: "#CD7F32", nextXp: 1000 },
    "Silver Coder": { icon: "🥈", color: "#C0C0C0", nextXp: 2000 },
    "Gold Coder": { icon: "🥇", color: "#FFD700", nextXp: 3500 },
    "Platinum Coder": { icon: "💎", color: "#E5E4E2", nextXp: 5500 },
    "Diamond Coder": { icon: "💠", color: "#00CED1", nextXp: 8000 },
    "Elite Coder": { icon: "⭐", color: "#9333EA", nextXp: 12000 },
    "Master Coder": { icon: "🔥", color: "#DC2626", nextXp: 18000 },
    "Legend": { icon: "👑", color: "#FBBF24", nextXp: 999999 },
  };

  const data = rankData[rank] || rankData["Rookie"];
  const progress = (xp / data.nextXp) * 100;

  if (size === "small") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl">{data.icon}</span>
        <span className="font-semibold" style={{ color: data.color }}>
          {rank}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-cyber-navy/80 rounded-xl p-6 shadow-lg border-2" style={{ borderColor: data.color }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-5xl">{data.icon}</span>
          <div>
            <h3 className="text-2xl font-bold" style={{ color: data.color }}>
              {rank}
            </h3>
            <p className="text-sm text-slate-400">{xp} XP</p>
          </div>
        </div>
      </div>
      {rank !== "Legend" && (
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Progress to next rank</span>
            <span>{data.nextXp - xp} XP needed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: data.color }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
