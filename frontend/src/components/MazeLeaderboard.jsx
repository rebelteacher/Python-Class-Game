import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Clock, Code, Target } from "lucide-react";

export default function MazeLeaderboard({ problemId, classroomId = null }) {
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [problemId, classroomId]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      let url = `${process.env.REACT_APP_BACKEND_URL}/api/maze/leaderboard/${problemId}`;
      if (classroomId) {
        url += `?classroom_id=${classroomId}`;
      }
      
      const response = await fetch(url, {
        credentials: "include"
      });
      
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      
      const data = await response.json();
      setLeaderboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(0);
    return `${mins}m ${secs}s`;
  };

  const getMedalEmoji = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}.`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Loading leaderboard...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-red-500">
          Error: {error}
        </CardContent>
      </Card>
    );
  }

  if (!leaderboard || leaderboard.total_completions === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No completions yet!</p>
          <p className="text-sm">Be the first to complete this challenge!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Leaderboard
          <span className="text-sm font-normal text-gray-500">
            ({leaderboard.total_completions} completions)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="time" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="time" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Fastest
            </TabsTrigger>
            <TabsTrigger value="efficiency" className="text-xs">
              <Code className="w-3 h-3 mr-1" />
              Efficient
            </TabsTrigger>
            <TabsTrigger value="accuracy" className="text-xs">
              <Target className="w-3 h-3 mr-1" />
              Accurate
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="time" className="mt-2">
            <div className="space-y-2">
              {leaderboard.by_time.map((entry, i) => (
                <div 
                  key={entry.id || i} 
                  className={`flex items-center justify-between p-2 rounded ${
                    i === 0 ? 'bg-yellow-50 border border-yellow-200' :
                    i === 1 ? 'bg-gray-100' :
                    i === 2 ? 'bg-orange-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-center">{getMedalEmoji(i)}</span>
                    <span className="font-medium">{entry.student_name}</span>
                  </div>
                  <span className="text-sm font-mono text-blue-600">
                    {formatTime(entry.completion_time)}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="efficiency" className="mt-2">
            <div className="space-y-2">
              {leaderboard.by_efficiency.map((entry, i) => (
                <div 
                  key={entry.id || i} 
                  className={`flex items-center justify-between p-2 rounded ${
                    i === 0 ? 'bg-purple-50 border border-purple-200' :
                    i === 1 ? 'bg-gray-100' :
                    i === 2 ? 'bg-purple-50/50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-center">{getMedalEmoji(i)}</span>
                    <span className="font-medium">{entry.student_name}</span>
                  </div>
                  <span className="text-sm font-mono text-purple-600">
                    {entry.code_lines} lines
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="accuracy" className="mt-2">
            <div className="space-y-2">
              {leaderboard.by_accuracy.map((entry, i) => (
                <div 
                  key={entry.id || i} 
                  className={`flex items-center justify-between p-2 rounded ${
                    i === 0 ? 'bg-green-50 border border-green-200' :
                    i === 1 ? 'bg-gray-100' :
                    i === 2 ? 'bg-green-50/50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-center">{getMedalEmoji(i)}</span>
                    <span className="font-medium">{entry.student_name}</span>
                  </div>
                  <span className="text-sm font-mono text-green-600">
                    {entry.path_accuracy.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
