import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Clock, CheckCircle, AlertCircle } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TestTaking({ user }) {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [testData, setTestData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    startTest();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [testId]);

  useEffect(() => {
    // Start countdown timer if time limit exists
    if (testData && testData.time_limit_minutes > 0 && !submitted) {
      const totalSeconds = testData.time_limit_minutes * 60;
      setTimeRemaining(totalSeconds);

      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - auto submit
            clearInterval(timerRef.current);
            handleSubmit(true); // Auto-submit flag
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [testData, submitted]);

  const startTest = async () => {
    try {
      console.log("Starting test:", testId);
      const response = await axios.get(`${API}/mc-tests/${testId}/start`, {
        withCredentials: true
      });
      
      console.log("Test response:", response.data);
      
      if (!response.data || !response.data.questions) {
        throw new Error("Invalid test data received");
      }
      
      setAttemptId(response.data.attempt_id);
      setTestData({
        title: response.data.test_title || "Test",
        description: response.data.test_description || "",
        time_limit_minutes: response.data.time_limit_minutes || 0,
        num_questions: response.data.num_questions || 0
      });
      setQuestions(response.data.questions || []);
      
      // Initialize answers object
      const initialAnswers = {};
      (response.data.questions || []).forEach(q => {
        initialAnswers[q.id] = "";
      });
      setAnswers(initialAnswers);
    } catch (error) {
      console.error("Error starting test:", error);
      if (error.response?.status === 404) {
        toast.error("Test not found. It may have been deleted or the link is incorrect.");
      } else if (error.response?.status === 400 && error.response?.data?.detail?.includes("already completed")) {
        toast.error("You have already completed this test");
      } else if (error.response?.status === 403) {
        toast.error("Only students can take tests. Teachers should use Test Reports to view results.");
      } else if (error.response?.status === 401) {
        toast.error("Please log in to take this test");
      } else {
        toast.error(error.response?.data?.detail || "Failed to start test");
      }
      // Don't navigate automatically - let the error state handle it
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit) {
      const unanswered = questions.filter(q => !answers[q.id]);
      if (unanswered.length > 0) {
        const confirm = window.confirm(
          `You have ${unanswered.length} unanswered question(s). Submit anyway?`
        );
        if (!confirm) return;
      }
    }

    console.log("🔍 Submitting answers:", answers);
    setSubmitting(true);

    try {
      const response = await axios.post(
        `${API}/mc-tests/${testId}/submit`,
        { 
          test_id: testId,
          answers: answers 
        },
        { withCredentials: true }
      );
      
      console.log("✅ Submission response:", response.data);
      setScore(response.data.score);
      setSubmitted(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (autoSubmit) {
        toast.info("Time's up! Test submitted automatically.");
      } else {
        toast.success("Test submitted successfully!");
      }
    } catch (error) {
      console.error("Error submitting test:", error);
      toast.error("Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (!timeRemaining || timeRemaining > 300) return "text-gray-700";
    if (timeRemaining > 60) return "text-yellow-600";
    return "text-red-600 font-bold";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <p className="text-lg">Loading test...</p>
      </div>
    );
  }

  // Handle case where test data failed to load
  if (!testData || !questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Unable to load test</p>
            <p className="text-gray-600 mb-4">The test may have been deleted or there was an error loading it.</p>
            <Button 
              onClick={() => navigate("/student/dashboard")}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted && score !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="container mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">{testData.title}</h1>
          </div>
        </nav>

        <main className="container mx-auto px-6 py-20">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                {score >= 70 ? (
                  <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
                ) : (
                  <AlertCircle className="w-20 h-20 text-yellow-500 mx-auto" />
                )}
              </div>
              <CardTitle className="text-3xl">Test Completed!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div>
                <p className="text-gray-600 mb-2">Your Score</p>
                <p className={`text-6xl font-bold ${score >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {score}%
                </p>
              </div>
              
              <div className="pt-6 border-t">
                <p className="text-gray-600 mb-4">
                  {score >= 90 ? "Excellent work! 🎉" :
                   score >= 80 ? "Great job! 👏" :
                   score >= 70 ? "Good effort! 👍" :
                   score >= 60 ? "Keep practicing! 📚" :
                   "Review the material and try again! 💪"}
                </p>
                <Button 
                  onClick={() => navigate("/student/dashboard")}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{testData.title}</h1>
            {testData.description && (
              <p className="text-sm text-gray-600">{testData.description}</p>
            )}
          </div>
          
          {timeRemaining !== null && testData.time_limit_minutes > 0 && (
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${getTimeColor()}`} />
              <span className={`text-xl font-mono ${getTimeColor()}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Instructions:</strong> Select one answer for each question. 
              {testData.time_limit_minutes > 0 && ` You have ${testData.time_limit_minutes} minutes to complete this test.`}
              {" "}You will only see your final score after submission (no answer review).
            </p>
          </div>

          {questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Question {index + 1} of {questions.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-900 mb-4 text-base font-medium">{question.question_text}</p>
                
                <RadioGroup 
                  value={answers[question.id]} 
                  onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
                >
                  {question.choices.map((choiceText, idx) => (
                    <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                      <RadioGroupItem 
                        value={idx.toString()} 
                        id={`${question.id}-${idx}`}
                      />
                      <Label 
                        htmlFor={`${question.id}-${idx}`}
                        className="flex-1 cursor-pointer text-base"
                      >
                        {choiceText}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}

          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-700 mb-1">
                    {Object.values(answers).filter(a => a).length} of {questions.length} answered
                  </p>
                  <p className="text-xs text-gray-500">
                    Make sure to answer all questions before submitting
                  </p>
                </div>
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-6"
                >
                  {submitting ? "Submitting..." : "Submit Test"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
