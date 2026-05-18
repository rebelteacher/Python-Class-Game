import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Leaderboard({ classroomId, currentUserId }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [classroomId]);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API}/leaderboard/classroom/${classroomId}`, {
        withCredentials: true,
      });
      setLeaderboard(response.data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-slate-400">Loading leaderboard...</div>;
  }

  return (
    <Card data-testid="leaderboard-card" className="bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Classroom Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((student, index) => (
            <div
              key={student.id}
              data-testid={`leaderboard-rank-${index + 1}`}
              className={`flex items-center gap-4 p-4 rounded-lg ${
                student.id === currentUserId
                  ? "bg-indigo-500/20 border-2 border-indigo-400"
                  : "bg-cyber-navy/80"
              } shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg"
                style={{ backgroundColor: student.rank_color + "20", color: student.rank_color }}>
                {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">
                    {student.name}
                    {student.id === currentUserId && (
                      <span className="ml-2 text-sm text-indigo-600">(You)</span>
                    )}
                  </span>
                  <span className="text-xl">{student.rank_icon}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span className="font-medium" style={{ color: student.rank_color }}>
                    {student.rank}
                  </span>
                  <span>•</span>
                  <span>{student.problems_solved || 0} problems solved</span>
                  {student.current_streak > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-orange-600">🔥 {student.current_streak} streak</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-xl" style={{ color: student.rank_color }}>
                  {student.xp || 0} XP
                </div>
                <div className="text-sm text-slate-400">{student.coins || 0} 🪙</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
