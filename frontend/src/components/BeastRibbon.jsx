import { Trophy, Flame } from "lucide-react";
import { useBeast } from "./BeastBadge";

/**
 * <BeastRibbon studentId={id} />
 * Full-width glowing "REIGNING BEAST" banner that only renders when the given
 * student is currently #1 across the platform by year-scoped XP. Meant to be
 * dropped into a student's dashboard header so they can see their crown.
 */
export default function BeastRibbon({ studentId }) {
  const beast = useBeast();
  if (!studentId || studentId !== beast.id) return null;

  return (
    <div
      data-testid="beast-ribbon"
      className="w-full bg-gradient-to-r from-cyber-lime/25 via-yellow-400/20 to-cyber-lime/25 border-y-2 border-cyber-lime shadow-[0_0_25px_rgba(57,255,20,0.55)] relative overflow-hidden"
    >
      {/* animated shine strip */}
      <div className="absolute inset-y-0 -inset-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[beast-shine_4s_linear_infinite]" />

      <div className="container mx-auto px-6 py-4 relative flex items-center justify-center gap-4 flex-wrap">
        <Flame className="w-8 h-8 text-cyber-lime drop-shadow-[0_0_10px_rgba(57,255,20,0.9)] animate-pulse" />
        <div className="text-center">
          <div className="font-orbitron uppercase tracking-[0.4em] text-cyber-lime text-2xl md:text-3xl heading-glow-lime font-bold">
            Reigning Beast
          </div>
          <div className="font-chakra text-white/90 text-sm md:text-base mt-1">
            You are the #1 ByteBattles Beast right now — keep grinding to hold your crown.
          </div>
        </div>
        <Trophy className="w-8 h-8 text-cyber-lime drop-shadow-[0_0_10px_rgba(57,255,20,0.9)] animate-pulse" />
      </div>

      {/* keyframes injected inline so we don't need a tailwind config change */}
      <style>{`
        @keyframes beast-shine {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(50%); }
        }
      `}</style>
    </div>
  );
}
