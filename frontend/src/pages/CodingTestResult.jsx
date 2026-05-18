import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, MessageSquare, Clock } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CodingTestResult({ user }) {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [testId]);

  const fetchResult = async () => {
    try {
      const response = await axios.get(`${API}/coding-tests/${testId}/result`, {
        withCredentials: true
      });
      setResult(response.data);
    } catch (error) {
      console.error("Error fetching result:", error);
      toast.error(error.response?.data?.detail || "Failed to load result");
      navigate("/my-tests");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-400";
    return "text-red-600";
  };

  const getScoreMessage = (score) => {
    if (score >= 90) return "Excellent! 🎉";
    if (score >= 70) return "Great job! 👏";
    if (score >= 50) return "Good effort! 👍";
    return "Keep practicing! 💪";
  };

  const formatTime = (seconds) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-slate-400">Loading result...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate("/my-tests")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Tests
        </Button>

        {/* Overall Score Card */}
        <Card className="mb-6 border-2">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                result.overall_score >= 70 ? 'bg-green-500/20' : 'bg-cyber-navy/30'
              }`}>
                <Trophy className={`w-16 h-16 ${
                  result.overall_score >= 70 ? 'text-green-600' : 'text-slate-500'
                }`} />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold">
              <span className={getScoreColor(result.overall_score)}>
                {Math.round(result.overall_score)}%
              </span>
            </CardTitle>
            <CardDescription className="text-xl mt-2">
              {getScoreMessage(result.overall_score)}
            </CardDescription>
            <p className="text-sm text-slate-400 mt-2">
              {result.total_problems} {result.total_problems === 1 ? 'Problem' : 'Problems'} Completed
            </p>
          </CardHeader>
        </Card>

        {/* Individual Problem Results */}
        <div className="space-y-4 mb-6">
          <h2 className="text-2xl font-bold text-white">Problem Results</h2>
          {result.submissions?.map((submission, index) => (
            <Card key={submission.problem_id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    Problem {index + 1}
                  </span>
                  <span className={`text-2xl font-bold ${getScoreColor(submission.score)}`}>
                    {Math.round(submission.score)}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-500/10 p-4 rounded-lg mb-3">
                  <p className="text-slate-200 whitespace-pre-wrap">{submission.feedback}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Time: {formatTime(submission.time_taken_seconds)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Submitted: {new Date(submission.submitted_at).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Note Card */}
        <Card>
          <CardContent className="pt-6">

            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">📝 Note</h4>
              <p className="text-sm text-yellow-400">
                Your code has been submitted and evaluated. For security reasons, you cannot view or edit your submitted code.
                If you have questions about the feedback, please reach out to your instructor.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Performance Tips */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tips for Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Review the problem description and make sure you understand all requirements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Test your code with different inputs before submitting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Pay attention to edge cases and error handling</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Practice similar problems to strengthen your coding skills</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
