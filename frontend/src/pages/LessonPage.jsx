import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import AssignmentPage from "./AssignmentPage";
import { Button } from "@/components/ui/button";
import { FileQuestion, Lock, CheckCircle2, ChevronRight } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LessonPage({ user }) {
  const { assignmentType, chapter, lesson } = useParams();
  const navigate = useNavigate();
  const [lessonData, setLessonData] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const params = new URLSearchParams({ assignment_type: assignmentType, chapter, lesson });
        const [lessonRes, placementRes] = await Promise.all([
          axios.get(`${API}/curriculum/lesson-problems?${params}`, { withCredentials: true }),
          axios.get(`${API}/curriculum/test-placements`, {
            params: { assignment_type: assignmentType, chapter, lesson },
            withCredentials: true,
          }),
        ]);
        setLessonData(lessonRes.data);
        setPlacements(placementRes.data.placements || []);
      } catch (err) {
        console.error("Error fetching lesson:", err);
        setError("Failed to load lesson");
        toast.error("Failed to load lesson problems");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [assignmentType, chapter, lesson]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg flex items-center justify-center">
        <div className="text-cyber-cyan font-orbitron animate-pulse">Loading lesson...</div>
      </div>
    );
  }

  if (error || !lessonData) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-cyber-red font-orbitron mb-2">Error</div>
          <p className="text-slate-400 font-chakra">{error || "Lesson not found"}</p>
        </div>
      </div>
    );
  }

  const lessonQuiz = placements.find(p => p.placement_type === "lesson_quiz");
  const allProblemsCompleted = (lessonData.problems || []).length > 0 && (lessonData.problems || []).every(p => p.is_completed);
  // For students only — teachers always see ungated by progress (backend returns unlocked_by_progress=true for them)
  const isStudent = user?.role === "student";
  const canTakeQuiz = lessonQuiz && lessonQuiz.is_available && (!isStudent || allProblemsCompleted || lessonQuiz.unlocked_by_teacher);

  const goToQuiz = () => {
    if (!lessonQuiz) return;
    const path = lessonQuiz.test_type === "coding" ? `/coding-test/${lessonQuiz.test_id}` : `/test/${lessonQuiz.test_id}`;
    navigate(path);
  };

  return (
    <>
      {lessonQuiz && (
        <div className="bg-cyber-black border-b border-cyber-magenta/30">
          <div
            data-testid="lesson-quiz-banner"
            className={`max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 ${canTakeQuiz ? "bg-cyber-magenta/10" : "bg-cyber-navy/40"}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {canTakeQuiz ? (
                <CheckCircle2 className="w-5 h-5 text-cyber-magenta shrink-0" />
              ) : (
                <Lock className="w-5 h-5 text-slate-500 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-[10px] font-orbitron uppercase tracking-[0.2em] text-cyber-magenta">Lesson Quiz</div>
                <div className="text-sm text-white truncate">
                  {lessonQuiz.title}
                  <span className="text-xs text-slate-400 ml-2">
                    {lessonQuiz.num_questions} questions
                    {lessonQuiz.test_type === "mc" && lessonQuiz.pool_size ? ` · randomized from ${lessonQuiz.pool_size}` : ""}
                  </span>
                </div>
              </div>
            </div>
            {canTakeQuiz ? (
              <Button
                data-testid="take-lesson-quiz-btn"
                onClick={goToQuiz}
                className="bg-cyber-magenta text-white hover:shadow-[0_0_15px_rgba(255,0,200,0.6)] font-orbitron uppercase tracking-widest text-xs rounded-none gap-1 shrink-0"
              >
                Take Quiz
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <span data-testid="quiz-locked-hint" className="text-xs font-chakra text-slate-500 shrink-0">
                <FileQuestion className="w-3.5 h-3.5 inline mr-1" />
                Complete all lesson problems to unlock
              </span>
            )}
          </div>
        </div>
      )}
      <AssignmentPage user={user} lessonData={lessonData} />
    </>
  );
}
