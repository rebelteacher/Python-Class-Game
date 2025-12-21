import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Clock, Code, Target } from "lucide-react";

// Leaderboard row component - defined outside to avoid nested component warning
function LeaderboardRow({ entry, index, colorScheme, compact, currentUserId, getMedalEmoji }) {
  const isCurrentUser = currentUserId && entry.user_id === currentUserId;
  
  const getBgColor = (scheme, i) => {
    const colors = {
      yellow: i === 0 ? 'bg-yellow-50 border border-yellow-200' : i === 1 ? 'bg-gray-50' : i === 2 ? 'bg-orange-50/50' : 'bg-white',
      purple: i === 0 ? 'bg-purple-50 border border-purple-200' : i === 1 ? 'bg-gray-50' : i === 2 ? 'bg-purple-50/50' : 'bg-white',
      green: i === 0 ? 'bg-green-50 border border-green-200' : i === 1 ? 'bg-gray-50' : i === 2 ? 'bg-green-50/50' : 'bg-white',
    };
    return colors[scheme] || 'bg-white';
  };
  
  return (
    <div 
      className={`flex items-center justify-between ${compact ? 'p-1.5 text-sm' : 'p-2'} rounded ${getBgColor(colorScheme, index)} ${isCurrentUser ? 'ring-2 ring-indigo-400' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className={`${compact ? 'w-5 text-xs' : 'w-6'} text-center font-medium`}>{getMedalEmoji(index)}</span>
        <span className={`font-medium ${compact ? 'text-xs' : ''} truncate max-w-[120px]`}>
          {entry.student_name}
          {isCurrentUser && <span className="ml-1 text-indigo-600">(You)</span>}
        </span>
      </div>
      {entry.value}
    </div>
  );
}

export default function MazeLeaderboard({ problemId, classroomId = null, currentUserId = null, compact = false }) {
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
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
  }, [problemId, classroomId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

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
    return `#${index + 1}`;
  };

  if (loading) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} text-center text-gray-500`}>
        Loading leaderboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} text-center text-red-500`}>
        Error: {error}
      </div>
    );
  }

  if (!leaderboard || leaderboard.total_completions === 0) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} text-center text-gray-500`}>
        <Trophy className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} mx-auto mb-2 text-gray-300`} />
        <p className="font-medium">No completions yet!</p>
        <p className="text-sm">Be the first to complete this challenge!</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'max-w-sm' : 'max-w-md'}>
      <div className={`flex items-center gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
        <Trophy className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-yellow-500`} />
        <span className={`font-semibold ${compact ? 'text-sm' : ''}`}>Maze Leaderboard</span>
        <span className={`${compact ? 'text-xs' : 'text-sm'} text-gray-500`}>
          ({leaderboard.total_completions} completions)
        </span>
      </div>
      
      <Tabs defaultValue="time" className="w-full">
        <TabsList className={`grid w-full grid-cols-3 ${compact ? 'h-8' : ''}`}>
          <TabsTrigger value="time" className={compact ? 'text-xs py-1' : 'text-xs'}>
            <Clock className="w-3 h-3 mr-1" />
            Fastest
          </TabsTrigger>
          <TabsTrigger value="efficiency" className={compact ? 'text-xs py-1' : 'text-xs'}>
            <Code className="w-3 h-3 mr-1" />
            Efficient
          </TabsTrigger>
          <TabsTrigger value="accuracy" className={compact ? 'text-xs py-1' : 'text-xs'}>
            <Target className="w-3 h-3 mr-1" />
            Accurate
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="time" className={compact ? 'mt-1.5' : 'mt-2'}>
          <div className={compact ? 'space-y-1' : 'space-y-2'}>
            {leaderboard.by_time.slice(0, compact ? 5 : 10).map((entry, i) => (
              <LeaderboardRow
                key={entry.id || i}
                entry={{
                  ...entry,
                  value: <span className={`${compact ? 'text-xs' : 'text-sm'} font-mono text-blue-600`}>{formatTime(entry.completion_time)}</span>
                }}
                index={i}
                colorScheme="yellow"
                compact={compact}
                currentUserId={currentUserId}
                getMedalEmoji={getMedalEmoji}
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="efficiency" className={compact ? 'mt-1.5' : 'mt-2'}>
          <div className={compact ? 'space-y-1' : 'space-y-2'}>
            {leaderboard.by_efficiency.slice(0, compact ? 5 : 10).map((entry, i) => (
              <LeaderboardRow
                key={entry.id || i}
                entry={{
                  ...entry,
                  value: <span className={`${compact ? 'text-xs' : 'text-sm'} font-mono text-purple-600`}>{entry.code_lines} lines</span>
                }}
                index={i}
                colorScheme="purple"
                compact={compact}
                currentUserId={currentUserId}
                getMedalEmoji={getMedalEmoji}
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="accuracy" className={compact ? 'mt-1.5' : 'mt-2'}>
          <div className={compact ? 'space-y-1' : 'space-y-2'}>
            {leaderboard.by_accuracy.slice(0, compact ? 5 : 10).map((entry, i) => (
              <LeaderboardRow
                key={entry.id || i}
                entry={{
                  ...entry,
                  value: <span className={`${compact ? 'text-xs' : 'text-sm'} font-mono text-green-600`}>{entry.path_accuracy?.toFixed(1) || 0}%</span>
                }}
                index={i}
                colorScheme="green"
                compact={compact}
                currentUserId={currentUserId}
                getMedalEmoji={getMedalEmoji}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
