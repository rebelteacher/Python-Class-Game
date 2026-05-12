import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Clock, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function ChallengeArena() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [challenge, setChallenge] = useState(null);
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    fetchChallenge();
  }, [challengeId]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const fetchChallenge = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/challenges/${challengeId}/start`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setChallenge(data.challenge);
        setProblem(data.problem);
        setCode(data.problem.starter_code || '');
        startTimeRef.current = Date.now();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.detail || "Failed to load challenge",
          variant: "destructive"
        });
        navigate('/student');
      }
    } catch (error) {
      console.error('Error fetching challenge:', error);
      toast({
        title: "Error",
        description: "Failed to load challenge",
        variant: "destructive"
      });
      navigate('/student');
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const completionTime = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 300;

    try {
      const response = await fetch(`${BACKEND_URL}/api/challenges/${challengeId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code,
          time: completionTime
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
        
        // Wait a moment then navigate to results
        setTimeout(() => {
          navigate(`/student/challenge/${challengeId}/results`);
        }, 2000);
      } else {
        toast({
          title: "Submission failed",
          description: "Please try again",
          variant: "destructive"
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      toast({
        title: "Error",
        description: "Failed to submit solution",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft > 180) return 'text-green-600';
    if (timeLeft > 60) return 'text-yellow-600';
    return 'text-red-600 animate-pulse';
  };

  if (!challenge || !problem) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg flex items-center justify-center">
        <p className="text-gray-600">Loading challenge...</p>
      </div>
    );
  }

  if (results) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Zap className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Submitted!</h2>
            <p className="text-gray-600 mb-4">
              Score: {results.score}% ({results.passed_tests}/{results.total_tests} tests passed)
            </p>
            <p className="text-sm text-gray-500">Loading results...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/student/dashboard')}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                {challenge.challenger_name} vs {challenge.challenged_name}
              </h1>
              <p className="text-sm opacity-90">{problem.title}</p>
            </div>
          </div>
          
          <div className={`text-3xl font-bold flex items-center gap-2 ${getTimerColor()}`}>
            <Clock className="w-8 h-8" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 grid md:grid-cols-2 gap-6">
        {/* Problem Description */}
        <Card>
          <CardHeader>
            <CardTitle>Problem Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{problem.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Code Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Your Solution</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono text-sm min-h-[400px]"
              placeholder="Write your code here..."
              disabled={isSubmitting}
            />
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || timeLeft === 0}
              className="w-full mt-4 bg-gradient-to-r from-orange-600 to-red-600"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Solution'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ChallengeArena;
