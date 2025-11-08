import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Medal, Award, TrendingUp, Users, Calendar, ArrowLeft, Crown, Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function CompetitionView() {
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchCompetition();
    // Auto-refresh standings every 30 seconds if competition is active
    const interval = setInterval(() => {
      if (competition?.status === 'active') {
        fetchCompetition();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [competitionId]);

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

  const fetchCompetition = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/competitions/${competitionId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCompetition(data);
      }
    } catch (error) {
      console.error('Error fetching competition:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      upcoming: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.upcoming}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-600" />;
    return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <p className="text-gray-600">Loading competition...</p>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <Card className="p-8">
          <p className="text-gray-600 mb-4">Competition not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </Card>
      </div>
    );
  }

  const standings = competition.live_standings || [];
  const winner = standings.length > 0 ? standings[0] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            onClick={() => navigate(user?.role === 'teacher' ? '/teacher/competitions' : '/student/dashboard')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                {competition.title}
              </h1>
              <p className="text-gray-600 mb-4">{competition.description}</p>
            </div>
            {getStatusBadge(competition.status)}
          </div>
        </div>

        {/* Competition Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Competition Period</p>
                  <p className="font-semibold">{new Date(competition.start_date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">to {new Date(competition.end_date).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-pink-600" />
                <div>
                  <p className="text-sm text-gray-600">Participating Classes</p>
                  <p className="font-semibold">{competition.classrooms?.length || 0}</p>
                  <p className="text-sm text-gray-500">{competition.classrooms?.map(c => c.name).join(', ')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Min Problems Required</p>
                  <p className="font-semibold text-2xl">{competition.min_problems_required}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Winner Banner (if completed) */}
        {competition.status === 'completed' && winner && (
          <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300">
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-4">
                <Trophy className="w-12 h-12 text-yellow-600" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">CHAMPION</p>
                  <p className="text-2xl font-bold text-yellow-900">{winner.classroom_name}</p>
                  <p className="text-sm text-yellow-700">
                    {winner.avg_problems_per_student} avg problems/student • {winner.avg_xp_per_student} avg XP/student
                  </p>
                  <p className="text-xs text-yellow-600">
                    ({winner.num_students} students • {winner.problems_solved} total problems • {winner.xp_gained} total XP)
                  </p>
                </div>
                <Trophy className="w-12 h-12 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Standings */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">
                {competition.status === 'active' ? '🔴 Live Standings' : 'Final Standings'}
              </CardTitle>
              {competition.status === 'active' && (
                <span className="text-sm text-gray-500">Auto-updates every 30s</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {standings.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No submissions yet. Get coding!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {standings.map((standing, idx) => (
                  <Card 
                    key={standing.classroom_id}
                    className={`border-2 ${
                      standing.rank === 1 ? 'border-yellow-400 bg-yellow-50' : 
                      standing.rank === 2 ? 'border-gray-400 bg-gray-50' :
                      standing.rank === 3 ? 'border-orange-400 bg-orange-50' :
                      'border-gray-200'
                    }`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-12 flex justify-center">
                          {getRankIcon(standing.rank)}
                        </div>

                        {/* Classroom Name */}
                        <div className="flex-1">
                          <h3 className="text-xl font-bold">{standing.classroom_name}</h3>
                          <p className="text-sm text-gray-600">
                            {standing.eligible_students} eligible student{standing.eligible_students !== 1 ? 's' : ''}
                          </p>
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-2 gap-8 text-center">
                          <div>
                            <p className="text-2xl font-bold text-purple-600">{standing.avg_problems_per_student}</p>
                            <p className="text-xs text-gray-600">Avg Problems/Student</p>
                            <p className="text-xs text-gray-400">({standing.problems_solved} total)</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-pink-600">{standing.avg_xp_per_student}</p>
                            <p className="text-xs text-gray-600">Avg XP/Student</p>
                            <p className="text-xs text-gray-400">({standing.xp_gained} total)</p>
                          </div>
                        </div>
                      </div>

                      {/* Class Captain and MVC */}
                      {(standing.captain || standing.mvc) && (
                        <div className="mt-4 pt-4 border-t grid md:grid-cols-2 gap-4">
                          {standing.captain && (
                            <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg">
                              <Crown className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="text-xs font-semibold text-blue-800">CLASS CAPTAIN</p>
                                <p className="text-sm font-bold text-blue-900">{standing.captain.student_name}</p>
                                <p className="text-xs text-blue-700">{standing.captain.problems_solved} problems</p>
                              </div>
                            </div>
                          )}
                          {standing.mvc && (
                            <div className="flex items-center gap-2 bg-purple-50 p-3 rounded-lg">
                              <Star className="w-5 h-5 text-purple-600" />
                              <div>
                                <p className="text-xs font-semibold text-purple-800">MVC (Most Valuable Coder)</p>
                                <p className="text-sm font-bold text-purple-900">{standing.mvc.student_name}</p>
                                <p className="text-xs text-purple-700">{standing.mvc.xp_gained} XP</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Student Progress Details */}
                      {standing.student_progress && standing.student_progress.length > 0 && (
                        <details className="mt-4 pt-4 border-t">
                          <summary className="cursor-pointer font-semibold text-sm text-gray-700 hover:text-gray-900">
                            View Student Progress ({standing.eligible_students}/{standing.num_students} eligible)
                          </summary>
                          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                            {standing.student_progress.map((student) => (
                              <div 
                                key={student.student_id} 
                                className={`flex items-center justify-between p-2 rounded ${
                                  student.is_eligible ? 'bg-green-50' : 'bg-gray-50'
                                }`}
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {student.student_name}
                                    {student.is_eligible && (
                                      <span className="ml-2 text-xs text-green-600 font-semibold">✓ Eligible</span>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${
                                          student.is_eligible ? 'bg-green-500' : 'bg-orange-400'
                                        }`}
                                        style={{ width: `${student.progress_percent}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-gray-600">{student.progress_percent}%</span>
                                  </div>
                                </div>
                                <div className="ml-4 text-right">
                                  <p className="text-sm font-semibold">{student.problems_solved} problems</p>
                                  <p className="text-xs text-gray-500">{student.xp_gained} XP</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CompetitionView;
