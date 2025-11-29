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
    if (score >= 50) return "text-yellow-600";
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-600">Loading result...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate("/my-tests")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Tests
        </Button>

        {/* Score Card */}
        <Card className="mb-6 border-2">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                result.score >= 70 ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Trophy className={`w-16 h-16 ${
                  result.score >= 70 ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold">
              <span className={getScoreColor(result.score)}>
                {Math.round(result.score)}%
              </span>
            </CardTitle>
            <CardDescription className="text-xl mt-2">
              {getScoreMessage(result.score)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Time: {formatTime(result.time_taken_seconds)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Submitted: {new Date(result.submitted_at).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Instructor Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-800 whitespace-pre-wrap">{result.feedback}</p>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">📝 Note</h4>
              <p className="text-sm text-yellow-800">
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
            <ul className="space-y-2 text-sm text-gray-700">
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
