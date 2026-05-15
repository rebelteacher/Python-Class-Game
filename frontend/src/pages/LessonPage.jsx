import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import AssignmentPage from "./AssignmentPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LessonPage({ user }) {
  const { assignmentType, chapter, lesson } = useParams();
  const [lessonData, setLessonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const params = new URLSearchParams({
          assignment_type: assignmentType,
          chapter: chapter,
          lesson: lesson,
        });
        const response = await axios.get(`${API}/curriculum/lesson-problems?${params}`, {
          withCredentials: true,
        });
        setLessonData(response.data);
      } catch (err) {
        console.error("Error fetching lesson:", err);
        setError("Failed to load lesson");
        toast.error("Failed to load lesson problems");
      } finally {
        setLoading(false);
      }
    };
    fetchLesson();
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

  return <AssignmentPage user={user} lessonData={lessonData} />;
}
