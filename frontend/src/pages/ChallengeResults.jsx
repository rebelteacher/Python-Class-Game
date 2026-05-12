import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Medal, Clock, Zap, Home } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function ChallengeResults() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchResults();
  }, [challengeId]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchResults = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/challenges/${challengeId}/results`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setChallenge(data);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !challenge || !user) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg flex items-center justify-center">
        <p className="text-gray-600">Loading results...</p>
      </div>
    );
  }

  const isWinner = challenge.winner_id === user.id;
  const userScore = user.id === challenge.challenger_id ? challenge.challenger_score : challenge.challenged_score;
  const opponentScore = user.id === challenge.challenger_id ? challenge.challenged_score : challenge.challenger_score;
  const opponentName = user.id === challenge.challenger_id ? challenge.challenged_name : challenge.challenger_name;
  const userTime = user.id === challenge.challenger_id ? challenge.challenger_time : challenge.challenged_time;
  const opponentTime = user.id === challenge.challenger_id ? challenge.challenged_time : challenge.challenger_time;

  const bothCompleted = challenge.challenger_score !== null && challenge.challenged_score !== null;

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg p-8">
      <div className="max-w-4xl mx-auto">
        {/* Winner Banner */}
        {bothCompleted && (
          <Card className={`mb-8 ${isWinner ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300 border-2' : 'bg-gray-50 border-gray-300 border-2'}`}>
            <CardContent className="py-8">
              <div className="text-center">
                {isWinner ? (
                  <>
                    <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-4xl font-bold text-yellow-900 mb-2">🎉 VICTORY! 🎉</h1>
                    <p className="text-xl text-yellow-700">You defeated {opponentName}!</p>
                  </>
                ) : (
                  <>
                    <Medal className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                    <h1 className="text-4xl font-bold text-gray-700 mb-2">Defeated</h1>
                    <p className="text-xl text-gray-600">{opponentName} won this time!</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scores Comparison */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className={isWinner && bothCompleted ? 'border-2 border-yellow-400 bg-yellow-50' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{user.name} (You)</span>
                {isWinner && bothCompleted && <Trophy className="w-6 h-6 text-yellow-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Score:</span>
                  <span className="text-3xl font-bold text-green-600">{userScore}%</span>
                </div>
                {userTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Time:
                    </span>
                    <span className="text-lg font-semibold">{Math.round(userTime)}s</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={!isWinner && bothCompleted ? 'border-2 border-yellow-400 bg-yellow-50' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{opponentName}</span>
                {!isWinner && bothCompleted && <Trophy className="w-6 h-6 text-yellow-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Score:</span>
                  {opponentScore !== null ? (
                    <span className="text-3xl font-bold text-blue-600">{opponentScore}%</span>
                  ) : (
                    <span className="text-lg text-gray-400">Pending...</span>
                  )}
                </div>
                {opponentTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Time:
                    </span>
                    <span className="text-lg font-semibold">{Math.round(opponentTime)}s</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Message */}
        {!bothCompleted && (
          <Card className="mb-8 bg-blue-50 border-blue-200">
            <CardContent className="py-6 text-center">
              <Zap className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <p className="text-lg text-blue-900 font-semibold">
                Waiting for {opponentName} to complete the challenge...
              </p>
              <p className="text-sm text-blue-700 mt-2">
                Check back later to see the final results!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => navigate('/student/dashboard')}
            className="bg-gradient-to-r from-orange-600 to-red-600"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ChallengeResults;
