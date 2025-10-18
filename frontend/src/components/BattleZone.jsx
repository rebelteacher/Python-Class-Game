import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Swords, Trophy, Clock, Target } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function BattleZone({ classroomId, isTeacher }) {
  const [battles, setBattles] = useState([]);
  const [availableClassrooms, setAvailableClassrooms] = useState([]);
  const [selectedOpponent, setSelectedOpponent] = useState("");
  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBattles();
    if (isTeacher) {
      fetchAvailableClassrooms();
    }
  }, [classroomId]);

  const fetchBattles = async () => {
    try {
      const response = await axios.get(`${API}/battles/classroom/${classroomId}`, {
        withCredentials: true,
      });
      setBattles(response.data);
    } catch (error) {
      console.error("Error fetching battles:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableClassrooms = async () => {
    try {
      const response = await axios.get(`${API}/classrooms/available-for-battle`, {
        withCredentials: true,
      });
      setAvailableClassrooms(response.data);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
    }
  };

  const handleChallenge = async () => {
    if (!selectedOpponent) {
      toast.error("Please select a classroom to challenge");
      return;
    }

    try {
      await axios.post(
        `${API}/battles/challenge`,
        { opponent_classroom_id: selectedOpponent },
        { withCredentials: true }
      );
      toast.success("Battle challenge sent! ⚔️");
      setChallengeDialogOpen(false);
      setSelectedOpponent("");
      fetchBattles();
    } catch (error) {
      console.error("Error creating battle:", error);
      toast.error(error.response?.data?.detail || "Failed to create battle");
    }
  };

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-600">Loading battles...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Swords className="w-6 h-6 text-red-600" />
          Team Battles
        </h2>
        {isTeacher && (
          <Dialog open={challengeDialogOpen} onOpenChange={setChallengeDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700 gap-2" data-testid="challenge-classroom-btn">
                <Swords className="w-4 h-4" />
                Challenge Classroom
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="challenge-dialog">
              <DialogHeader>
                <DialogTitle>Challenge Another Classroom</DialogTitle>
                <DialogDescription>
                  Start a 7-day XP battle! Winning team gets +200 coins per student + Champion Team badge 🏆
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Opponent Classroom</label>
                  <Select value={selectedOpponent} onValueChange={setSelectedOpponent}>
                    <SelectTrigger data-testid="opponent-select">
                      <SelectValue placeholder="Choose a classroom..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClassrooms.map((classroom) => (
                        <SelectItem key={classroom.id} value={classroom.id}>
                          {classroom.name} (Teacher: {classroom.teacher_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleChallenge} 
                  className="w-full bg-red-600 hover:bg-red-700"
                  data-testid="send-challenge-btn"
                >
                  Send Challenge
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {battles.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Swords className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No battles yet</h3>
            <p className="text-gray-500">
              {isTeacher ? "Challenge another classroom to start a battle!" : "Your teacher will start battles soon!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {battles.map((battle) => {
            const isChallenger = battle.challenger_classroom_id === classroomId;
            const ourTeam = isChallenger ? battle.challenger_classroom_name : battle.opponent_classroom_name;
            const theirTeam = isChallenger ? battle.opponent_classroom_name : battle.challenger_classroom_name;
            const ourScore = isChallenger ? battle.challenger_score : battle.opponent_score;
            const theirScore = isChallenger ? battle.opponent_score : battle.challenger_score;
            const isWinner = battle.status === "completed" && 
              ((isChallenger && battle.winner_id === battle.challenger_classroom_id) ||
               (!isChallenger && battle.winner_id === battle.opponent_classroom_id));

            return (
              <Card 
                key={battle.id} 
                data-testid={`battle-${battle.id}`}
                className={`${battle.status === "active" ? "border-2 border-red-500" : ""} ${isWinner ? "bg-yellow-50 border-2 border-yellow-400" : ""}`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {battle.status === "active" && <span className="animate-pulse">🔥</span>}
                      {battle.status === "completed" && (isWinner ? "🏆" : "😢")}
                      {ourTeam} vs {theirTeam}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm">
                      {battle.status === "active" ? (
                        <>
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span className="font-semibold text-orange-600">
                            {getTimeRemaining(battle.end_date)}
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold text-gray-600">
                          Battle Ended
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-center flex-1">
                        <div className="text-sm text-gray-600 mb-1">{ourTeam}</div>
                        <div className="text-3xl font-bold text-indigo-600">{ourScore}</div>
                        <div className="text-xs text-gray-500">Avg XP/student</div>
                        <div className="text-xs text-gray-400 mt-1">
                          ({isChallenger ? battle.challenger_student_count : battle.opponent_student_count} students)
                        </div>
                      </div>
                      
                      <div className="px-6">
                        <Target className="w-8 h-8 text-gray-400" />
                      </div>
                      
                      <div className="text-center flex-1">
                        <div className="text-sm text-gray-600 mb-1">{theirTeam}</div>
                        <div className="text-3xl font-bold text-red-600">{theirScore}</div>
                        <div className="text-xs text-gray-500">Avg XP/student</div>
                        <div className="text-xs text-gray-400 mt-1">
                          ({isChallenger ? battle.opponent_student_count : battle.challenger_student_count} students)
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 h-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${(ourScore / (ourScore + theirScore || 1)) * 100}%` }}
                      />
                      <div
                        className="absolute right-0 h-full bg-red-600 transition-all duration-500"
                        style={{ width: `${(theirScore / (ourScore + theirScore || 1)) * 100}%` }}
                      />
                    </div>

                    {battle.status === "completed" && (
                      <div className={`text-center py-3 rounded-lg ${isWinner ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"}`}>
                        <div className="font-bold text-lg">
                          {isWinner ? "🎉 VICTORY! You won +200 coins + Champion Team badge!" : "Keep training for the next battle!"}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
