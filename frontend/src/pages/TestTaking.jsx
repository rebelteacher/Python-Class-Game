import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Clock, CheckCircle, AlertCircle, Lock } from "lucide-react";

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
  const [questionResults, setQuestionResults] = useState([]);
  const [showAnswers, setShowAnswers] = useState(true);
  const [resultsReleased, setResultsReleased] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const timerRef = useRef(null);

  // Helper function to render text with line breaks - MUST be defined before any early returns
  const renderTextWithLineBreaks = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

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
      
      // Safely set state with defensive checks
      const data = response.data || {};
      setScore(typeof data.score === 'number' ? data.score : 0);
      setQuestionResults(Array.isArray(data.question_results) ? data.question_results : []);
      setShowAnswers(data.show_answers !== false);
      setResultsReleased(data.results_released !== false);
      setTotalQuestions(data.total_questions || questions.length);
      setCorrectCount(data.correct_count || 0);
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
      const errorMessage = error.response?.data?.detail || "Failed to submit test";
      toast.error(errorMessage);
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
    const missedQuestions = Array.isArray(questionResults) 
      ? questionResults.filter(q => q && !q.is_correct) 
      : [];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="container mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">{testData?.title || "Test"}</h1>
          </div>
        </nav>

        <main className="container mx-auto px-6 py-10">
          <Card className="max-w-4xl mx-auto mb-6">
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
                  {typeof score === 'number' ? score.toFixed(1) : score}%
                </p>
                <p className="text-gray-500 mt-2">
                  {correctCount} correct out of {totalQuestions || questions.length} questions
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

          {/* Show message when results are not released yet */}
          {!resultsReleased && (
            <Card className="max-w-4xl mx-auto bg-yellow-50 border-yellow-200">
              <CardContent className="py-8 text-center">
                <Lock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Results Pending Release</h3>
                <p className="text-yellow-700">
                  Your teacher has not released the test results yet. 
                  Check back later to see which questions you missed.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Show Question Review if answers are visible and results are released */}
          {showAnswers && resultsReleased && Array.isArray(questionResults) && questionResults.length > 0 && (
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="text-xl">Question Review</CardTitle>
                <p className="text-gray-600">
                  {missedQuestions.length > 0 
                    ? `You missed ${missedQuestions.length} question${missedQuestions.length > 1 ? 's' : ''}. Review below:`
                    : "Perfect score! All questions answered correctly."}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {questionResults.map((result, idx) => {
                  if (!result) return null;
                  return (
                    <div 
                      key={result.question_id || idx} 
                      className={`p-4 rounded-lg border-2 ${
                        result.is_correct 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          result.is_correct ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {result.is_correct ? '✓' : '✗'}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-2">
                            Q{idx + 1}: {renderTextWithLineBreaks(result.question_text || '')}
                          </p>
                          
                          {result.choices && typeof result.choices === 'object' && (
                            <div className="space-y-1 text-sm">
                              {Object.entries(result.choices).map(([letter, text]) => (
                                <div 
                                  key={letter}
                                  className={`p-2 rounded ${
                                    letter === result.correct_answer 
                                      ? 'bg-green-200 text-green-800 font-medium' 
                                      : letter === result.student_answer && !result.is_correct
                                      ? 'bg-red-200 text-red-800 line-through'
                                      : 'bg-white'
                                  }`}
                                >
                                  {letter}. {renderTextWithLineBreaks(text || '')}
                                  {letter === result.correct_answer && (
                                    <span className="ml-2 text-green-600">✓ Correct Answer</span>
                                  )}
                                  {letter === result.student_answer && !result.is_correct && (
                                    <span className="ml-2 text-red-600">✗ Your Answer</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }

  // Get current question
  const currentQuestion = questions[currentQuestionIndex];
  const progressPercent = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.values(answers).filter(a => a !== "").length;

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header with timer */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-3">
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
          
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>{answeredCount} of {questions.length} answered</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        <div className="max-w-3xl mx-auto">
          {/* Current Question */}
          {currentQuestion && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Question {currentQuestionIndex + 1}</span>
                  {answers[currentQuestion.id] && (
                    <span className="text-sm font-normal text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Answered
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Question text with line break support */}
                <div className="text-gray-900 mb-6 text-base font-medium whitespace-pre-line">
                  {renderTextWithLineBreaks(currentQuestion.question_text)}
                </div>
                
                <RadioGroup 
                  value={answers[currentQuestion.id]} 
                  onValueChange={(value) => setAnswers({ ...answers, [currentQuestion.id]: value })}
                >
                  {currentQuestion.choices.map((choiceText, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center space-x-3 p-4 rounded-lg transition-colors border-2 cursor-pointer
                        ${answers[currentQuestion.id] === idx.toString() 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
                    >
                      <RadioGroupItem 
                        value={idx.toString()} 
                        id={`${currentQuestion.id}-${idx}`}
                      />
                      <Label 
                        htmlFor={`${currentQuestion.id}-${idx}`}
                        className="flex-1 cursor-pointer text-base whitespace-pre-line"
                      >
                        {renderTextWithLineBreaks(choiceText)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between items-center">
            <Button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              variant="outline"
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>

            {/* Question dots indicator */}
            <div className="flex gap-1 flex-wrap justify-center max-w-md">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    idx === currentQuestionIndex 
                      ? 'bg-indigo-600' 
                      : answers[q.id] 
                        ? 'bg-green-500' 
                        : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  title={`Question ${idx + 1}${answers[q.id] ? ' (answered)' : ''}`}
                />
              ))}
            </div>

            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                {submitting ? "Submitting..." : "Submit Test"}
                <CheckCircle className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Summary card at bottom */}
          <Card className="mt-6 bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  {answeredCount === questions.length 
                    ? "✓ All questions answered!" 
                    : `${questions.length - answeredCount} question${questions.length - answeredCount !== 1 ? 's' : ''} remaining`}
                </span>
                {answeredCount === questions.length && currentQuestionIndex !== questions.length - 1 && (
                  <Button
                    onClick={() => setCurrentQuestionIndex(questions.length - 1)}
                    variant="link"
                    className="text-indigo-600 p-0"
                  >
                    Go to Submit →
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
