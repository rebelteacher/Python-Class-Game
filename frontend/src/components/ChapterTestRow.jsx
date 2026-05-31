import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { FileQuestion, Lock, CheckCircle2, ChevronRight } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Renders a single chapter-test row at the end of a chapter's lesson list.
 * Fetches placements scoped to (assignmentType, chapter) and shows the chapter_test if attached.
 * Auto-hides when nothing is attached.
 */
export default function ChapterTestRow({ assignmentType, chapter, user }) {
  const navigate = useNavigate();
  const [placement, setPlacement] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchPlacement = async () => {
      try {
        const res = await axios.get(`${API}/curriculum/test-placements`, {
          params: { assignment_type: assignmentType, chapter },
          withCredentials: true,
        });
        if (cancelled) return;
        const chapterTest = (res.data.placements || []).find(p => p.placement_type === "chapter_test");
        setPlacement(chapterTest || null);
      } catch (error) {
        console.error("Error loading chapter-test placement:", error);
      }
    };
    fetchPlacement();
    return () => { cancelled = true; };
  }, [assignmentType, chapter]);

  if (!placement) return null;

  const canTake = placement.is_available;
  const isStudent = user?.role === "student";
  const goToTest = () => {
    const path = placement.test_type === "coding"
      ? `/coding-test/${placement.test_id}`
      : `/test/${placement.test_id}`;
    navigate(path);
  };

  return (
    <div
      data-testid={`chapter-test-row-${chapter}`}
      className={`mt-3 border rounded-none p-4 transition-all ${canTake
        ? "border-cyber-magenta/50 bg-cyber-magenta/10 hover:shadow-[0_0_15px_rgba(255,0,200,0.3)]"
        : "border-slate-700 bg-cyber-navy/40 opacity-70"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {canTake ? (
            <CheckCircle2 className="w-6 h-6 text-cyber-magenta shrink-0" />
          ) : (
            <Lock className="w-6 h-6 text-slate-500 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-[10px] font-orbitron uppercase tracking-[0.2em] text-cyber-magenta">
              Chapter Test
            </div>
            <div className="text-sm text-white truncate">
              {placement.title}
              <span className="text-xs text-slate-400 ml-2">
                {placement.num_questions} questions
                {placement.test_type === "mc" && placement.pool_size ? ` · randomized from ${placement.pool_size}` : ""}
                {placement.time_limit_minutes > 0 ? ` · ${placement.time_limit_minutes}m` : ""}
              </span>
            </div>
          </div>
        </div>
        {canTake ? (
          <Button
            data-testid={`take-chapter-test-${chapter}`}
            onClick={goToTest}
            className="bg-cyber-magenta text-white hover:shadow-[0_0_15px_rgba(255,0,200,0.6)] font-orbitron uppercase tracking-widest text-xs rounded-none gap-1 shrink-0"
          >
            <FileQuestion className="w-4 h-4" />
            Take Test
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <span className="text-xs font-chakra text-slate-500 shrink-0">
            <Lock className="w-3.5 h-3.5 inline mr-1" />
            {isStudent ? "Complete all lessons to unlock" : "Locked until teacher unlocks or progress is met"}
          </span>
        )}
      </div>
    </div>
  );
}
