import { useEffect, useState } from "react";
import axios from "axios";
import { Trophy } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Module-level cache — one fetch per page-load, shared across every BeastBadge
// instance so lists (Leaderboard / TeacherPanel / Gradebook) don't spam the API.
let beastPromise = null;
let cachedBeastId = null;
let cachedBeastName = "";
let cachedFetchedAt = 0;
const CACHE_MS = 5 * 60 * 1000; // 5 minutes

async function fetchBeast() {
  const now = Date.now();
  if (cachedFetchedAt && now - cachedFetchedAt < CACHE_MS) {
    return { id: cachedBeastId, name: cachedBeastName };
  }
  if (!beastPromise) {
    beastPromise = axios
      .get(`${API}/leaderboard/beast`, { withCredentials: true })
      .then((res) => {
        cachedBeastId = res.data?.beast?.id || null;
        cachedBeastName = res.data?.beast?.name || "";
        cachedFetchedAt = Date.now();
        return { id: cachedBeastId, name: cachedBeastName };
      })
      .catch(() => {
        cachedFetchedAt = Date.now(); // avoid retry storms on error
        return { id: null, name: "" };
      })
      .finally(() => {
        beastPromise = null;
      });
  }
  return beastPromise;
}

/**
 * useBeast() — hook that returns {id, name} of the current reigning beast.
 * Uses the shared module cache so every consumer reads from a single fetch.
 */
export function useBeast() {
  const [beast, setBeast] = useState({ id: cachedBeastId, name: cachedBeastName });
  useEffect(() => {
    let alive = true;
    fetchBeast().then((r) => {
      if (alive) setBeast(r);
    });
    return () => { alive = false; };
  }, []);
  return beast;
}

/**
 * <BeastBadge studentId="uuid" [size="sm"|"md"] />
 * Renders a small "Reigning Beast" pill next to the student's name if that
 * student is currently ranked #1 across the platform by year-scoped XP.
 * Renders nothing (empty fragment) otherwise, so it's safe to sprinkle
 * everywhere without layout impact.
 */
export default function BeastBadge({ studentId, size = "sm", showLabel = true }) {
  const [beastId, setBeastId] = useState(cachedBeastId);
  const [beastName, setBeastName] = useState(cachedBeastName);

  useEffect(() => {
    let alive = true;
    fetchBeast().then((r) => {
      if (!alive) return;
      setBeastId(r.id);
      setBeastName(r.name);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!studentId || studentId !== beastId) return null;

  const iconSize = size === "md" ? "w-4 h-4" : "w-3 h-3";
  const textSize = size === "md" ? "text-xs" : "text-[10px]";

  return (
    <span
      title={`${beastName || "Reigning Beast"} — #1 across all ByteBattles right now`}
      data-testid={`beast-badge-${studentId}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 border border-cyber-lime/60 bg-cyber-lime/10 text-cyber-lime rounded-none font-orbitron ${textSize} uppercase tracking-wider shadow-[0_0_8px_rgba(57,255,20,0.35)] align-middle`}
    >
      <Trophy className={iconSize} />
      {showLabel && <span>Reigning Beast</span>}
    </span>
  );
}
