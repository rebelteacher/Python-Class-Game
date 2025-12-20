import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Trophy, Brain, Sparkles, ChevronRight } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SkillQuizPopup({ 
  isOpen, 
  onClose, 
  skillCategory, 
  assignmentId, 
  classroomId,
  onQuizComplete 
}) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  useEffect(() => {
    if (isOpen && skillCategory && assignmentId) {
      fetchQuiz();
    }
  }, [isOpen, skillCategory, assignmentId]);

  const fetchQuiz = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/skill-quiz/${encodeURIComponent(skillCategory)}`,
        { 
          params: { assignment_id: assignmentId },
          withCredentials: true 
        }
      );
      
      if (response.data.already_completed) {
        setAlreadyCompleted(true);
        setResults({
          score: response.data.score,
          correct_count: response.data.correct_count,
          total_questions: response.data.total_questions
        });
      } else if (response.data.questions && response.data.questions.length > 0) {
        setQuestions(response.data.questions);
      } else {
        toast.info("No quiz available for this skill yet");
        onClose();
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      toast.error("Failed to load quiz");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    // Check if all questions answered
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      toast.warning(`Please answer all questions (${unanswered.length} remaining)`);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/skill-quiz/submit`,
        {
          skill_category: skillCategory,
          assignment_id: assignmentId,
          classroom_id: classroomId || "",
          answers: answers
        },
        { withCredentials: true }
      );
      
      setResults(response.data);
      setSubmitted(true);
      
      if (onQuizComplete) {
        onQuizComplete(response.data);
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  // Results view
  if (submitted || alreadyCompleted) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Quiz Results
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            {/* Score Display */}
            <div className="text-center mb-6">
              <div className={`text-6xl font-bold mb-2 ${
                results?.score >= 80 ? 'text-green-500' :
                results?.score >= 60 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {results?.score?.toFixed(0)}%
              </div>
              <p className="text-gray-600">
                {results?.correct_count} out of {results?.total_questions} correct
              </p>
              
              {results?.score >= 80 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-medium">Excellent work!</span>
                </div>
              )}
              {results?.score >= 60 && results?.score < 80 && (
                <div className="mt-4 text-yellow-600 font-medium">
                  Good job! Keep practicing!
                </div>
              )}
              {results?.score < 60 && (
                <div className="mt-4 text-gray-600">
                  Review the concepts and try again next time!
                </div>
              )}
            </div>

            {/* Detailed Results */}
            {results?.results && (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {results.results.map((r, idx) => (
                  <Card key={r.question_id} className={`${
                    r.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {r.is_correct ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm mb-1">Q{idx + 1}: {r.question_text}</p>
                          <p className="text-sm">
                            <span className="text-gray-500">Your answer:</span>{" "}
                            <span className={r.is_correct ? "text-green-600" : "text-red-600"}>
                              {r.student_answer || "Not answered"}
                            </span>
                          </p>
                          {!r.is_correct && (
                            <p className="text-sm">
                              <span className="text-gray-500">Correct answer:</span>{" "}
                              <span className="text-green-600 font-medium">{r.correct_answer}</span>
                            </p>
                          )}
                          {r.explanation && (
                            <p className="text-xs text-gray-500 mt-1 italic">{r.explanation}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className="ml-3 text-gray-600">Loading quiz...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Quiz taking view
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Skill Quiz: {skillCategory}
          </DialogTitle>
          <DialogDescription>
            Test your understanding of the concepts you just learned!
          </DialogDescription>
        </DialogHeader>

        {currentQuestion && (
          <div className="py-4">
            {/* Progress */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-sm text-gray-500">
                {answeredCount} / {questions.length} answered
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              />
            </div>

            {/* Question */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-1">{currentQuestion.question_text}</h3>
              {currentQuestion.concept_tags && currentQuestion.concept_tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {currentQuestion.concept_tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Choices */}
            <RadioGroup 
              value={answers[currentQuestion.id] || ""} 
              onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
              className="space-y-3"
            >
              {[
                { value: "A", text: currentQuestion.choice_a },
                { value: "B", text: currentQuestion.choice_b },
                { value: "C", text: currentQuestion.choice_c },
                { value: "D", text: currentQuestion.choice_d }
              ].map((choice) => (
                <div 
                  key={choice.value} 
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-purple-50 ${
                    answers[currentQuestion.id] === choice.value 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200'
                  }`}
                  onClick={() => handleAnswerSelect(currentQuestion.id, choice.value)}
                >
                  <RadioGroupItem value={choice.value} id={`choice-${choice.value}`} />
                  <Label 
                    htmlFor={`choice-${choice.value}`} 
                    className="flex-1 cursor-pointer font-normal"
                  >
                    <span className="font-semibold mr-2">{choice.value}.</span>
                    {choice.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          
          <div className="flex gap-1">
            {questions.map((_, idx) => (
              <button
                key={idx}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                  idx === currentIndex 
                    ? 'bg-purple-500 text-white' 
                    : answers[questions[idx]?.id]
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
                onClick={() => setCurrentIndex(idx)}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {currentIndex < questions.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700"
              disabled={answeredCount < questions.length}
            >
              Submit Quiz
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
