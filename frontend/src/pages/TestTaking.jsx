import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Clock, CheckCircle, AlertCircle, Lock, Zap } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Block type definitions for rendering visual blocks in quiz choices
const BLOCK_TYPES = {
  'forward': { label: 'move forward __ steps', color: '#4C97FF' },
  'backward': { label: 'move backward __ steps', color: '#4C97FF' },
  'right': { label: 'turn right __ degrees', color: '#4C97FF' },
  'left': { label: 'turn left __ degrees', color: '#4C97FF' },
  'goto': { label: 'go to x: __ y: __', color: '#4C97FF' },
  'home': { label: 'go home', color: '#4C97FF' },
  'setheading': { label: 'setheading __', color: '#4C97FF' },
  'pendown': { label: 'pen down', color: '#0fBD8C' },
  'penup': { label: 'pen up', color: '#0fBD8C' },
  'pencolor': { label: 'set pen color to __', color: '#0fBD8C' },
  'color': { label: 'set color to __', color: '#0fBD8C' },
  'pensize': { label: 'set pen size to __', color: '#0fBD8C' },
  'fillcolor': { label: 'set fill color to __', color: '#0fBD8C' },
  'begin_fill': { label: 'begin fill', color: '#0fBD8C' },
  'end_fill': { label: 'end fill', color: '#0fBD8C' },
  'say': { label: 'say __', color: '#9966FF' },
  'say_for': { label: 'say __ for __ seconds', color: '#9966FF' },
  'hide': { label: 'hide turtle', color: '#9966FF' },
  'show': { label: 'show turtle', color: '#9966FF' },
  'bgcolor': { label: 'set background to __', color: '#9966FF' },
  'dot': { label: 'stamp dot size __', color: '#9966FF' },
  'xposition': { label: 'x position', color: '#5CB1D6' },
  'yposition': { label: 'y position', color: '#5CB1D6' },
  'direction': { label: 'heading', color: '#5CB1D6' },
  'event_start': { label: 'when program starts', color: '#FFBF00' },
  'event_key': { label: 'when __ key pressed', color: '#FFBF00' },
  'event_clicked': { label: 'when sprite clicked', color: '#FFBF00' },
  'event_mouse': { label: 'when mouse moves', color: '#FFBF00' },
  'repeat': { label: 'repeat __ times', color: '#40BF4A' },
  'for_loop': { label: 'count with __ from __ to __ by __', color: '#40BF4A' },
  'while_block': { label: 'while __', color: '#40BF4A' },
  'if_block': { label: 'if __ then', color: '#FFAB19' },
  'if_else': { label: 'if __ then ... else ...', color: '#FFAB19' },
  'compare_gt': { label: '__ > __', color: '#5CA65C' },
  'compare_lt': { label: '__ < __', color: '#5CA65C' },
  'compare_eq': { label: '__ = __', color: '#5CA65C' },
  'compare_gte': { label: '__ >= __', color: '#5CA65C' },
  'compare_lte': { label: '__ <= __', color: '#5CA65C' },
  'compare_neq': { label: '__ != __', color: '#5CA65C' },
  'logic_and': { label: '__ and __', color: '#5CA65C' },
  'logic_or': { label: '__ or __', color: '#5CA65C' },
  'logic_not': { label: 'not __', color: '#5CA65C' },
  'logic_true': { label: 'true', color: '#5CA65C' },
  'logic_false': { label: 'false', color: '#5CA65C' },
  'is_even': { label: '__ is even', color: '#5CA65C' },
  'is_odd': { label: '__ is odd', color: '#5CA65C' },
  'set_variable': { label: 'set __ to __', color: '#FF8C1A' },
  'change_variable': { label: 'change __ by __', color: '#FF8C1A' },
  'variable_get': { label: '__', color: '#FF8C1A' },
  'math_number': { label: '__', color: '#59C059' },
  'random_int': { label: 'random integer from __ to __', color: '#59C059' },
  'random_float': { label: 'random fraction', color: '#59C059' },
  'math_add': { label: '__ + __', color: '#59C059' },
  'math_subtract': { label: '__ - __', color: '#59C059' },
  'math_multiply': { label: '__ x __', color: '#59C059' },
  'math_divide': { label: '__ / __', color: '#59C059' },
  'math_power': { label: '__ ^ __', color: '#59C059' },
  'math_modulo': { label: '__ mod __', color: '#59C059' },
  'math_round': { label: 'round __', color: '#59C059' },
  'math_abs': { label: 'absolute of __', color: '#59C059' },
  'math_constrain': { label: 'constrain __ low __ high __', color: '#59C059' },
  'text_value': { label: '" __ "', color: '#CF63CF' },
  'text_join': { label: 'join __ __', color: '#CF63CF' },
  'text_length': { label: 'length of __', color: '#CF63CF' },
  'text_isEmpty': { label: '__ is empty', color: '#CF63CF' },
  'text_print': { label: 'print __', color: '#CF63CF' },
  'list_create': { label: 'create list with __', color: '#745BA5' },
  'list_repeat': { label: 'create list with __ repeated __ times', color: '#745BA5' },
  'list_length': { label: 'length of __', color: '#745BA5' },
  'list_isEmpty': { label: '__ is empty', color: '#745BA5' },
  'list_getIndex': { label: 'in list __ get item # __', color: '#745BA5' },
  'list_setIndex': { label: 'in list __ set item # __ to __', color: '#745BA5' },
};

const BlockRenderer = ({ blockType, customText }) => {
  const block = BLOCK_TYPES[blockType];
  if (!block) return <span>{customText || blockType}</span>;
  const label = customText || block.label;
  const color = block.color;
  const parts = label.split(/(__)/);
  return (
    <span
      className="inline-flex items-center relative"
      style={{ 
        backgroundColor: color,
        borderRadius: '4px',
        padding: '5px 10px',
        color: 'white',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSize: '13px',
        fontWeight: 600,
        letterSpacing: '0.3px',
        boxShadow: `0 2px 0 0 ${color}99`,
        marginTop: '5px',
        marginBottom: '5px',
      }}
    >
      <span style={{
        position: 'absolute', top: '-4px', left: '14px',
        width: '12px', height: '4px', backgroundColor: color,
        borderRadius: '2px 2px 0 0',
      }} />
      <span style={{
        position: 'absolute', bottom: '-4px', left: '14px',
        width: '12px', height: '4px', backgroundColor: color,
        borderRadius: '0 0 2px 2px',
      }} />
      {parts.map((part, i) => 
        part === '__' ? (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: '26px', height: '20px', padding: '0 8px', margin: '0 3px',
            backgroundColor: 'white', color: '#555', borderRadius: '10px',
            fontSize: '11px', fontWeight: 700,
          }}>{'  '}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

// Helper function to render text with line breaks — module-scoped so both the
// module-level `renderChoice` above and the component below can use it. If this
// lives INSIDE the component, `renderChoice` (defined outside) hits a
// ReferenceError the moment a non-block choice needs to be rendered. That
// exact bug caused the "Something went wrong please refresh to continue"
// error on Question 2 of the Unit 1 Lesson 1 quiz.
const renderTextWithLineBreaks = (text) => {
  if (!text && text !== 0) return null;
  const asStr = String(text);
  const lines = asStr.split('\n');
  return lines.map((line, index) => (
    <span key={index}>
      {line}
      {index < lines.length - 1 && <br />}
    </span>
  ));
};

const renderChoice = (text) => {
  if (!text && text !== 0) return null;
  const asStr = String(text);
  try {
    const blockMatch = asStr.match(/^\[block:(\w+)\](.*)$/);
    if (blockMatch) {
      return <BlockRenderer blockType={blockMatch[1]} customText={blockMatch[2].trim() || undefined} />;
    }
  } catch {
    // fall through to text rendering
  }
  return renderTextWithLineBreaks(asStr);
};

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
  const [xpEarned, setXpEarned] = useState(0);  const [questionResults, setQuestionResults] = useState([]);
  const [showAnswers, setShowAnswers] = useState(true);
  const [resultsReleased, setResultsReleased] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
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
      
      // Safely set state with defensive checks
      const data = response.data || {};
      setScore(typeof data.score === 'number' ? data.score : 0);
      setQuestionResults(Array.isArray(data.question_results) ? data.question_results : []);
      setShowAnswers(data.show_answers !== false);
      setResultsReleased(data.results_released !== false);
      setTotalQuestions(data.total_questions || questions.length);
      setCorrectCount(data.correct_count || 0);
      setXpEarned(typeof data.xp_earned === 'number' ? data.xp_earned : 0);
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
    if (!timeRemaining || timeRemaining > 300) return "text-slate-300";
    if (timeRemaining > 60) return "text-yellow-400";
    return "text-red-600 font-bold";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg flex items-center justify-center">
        <p className="text-lg">Loading test...</p>
      </div>
    );
  }

  // Handle case where test data failed to load
  if (!testData || !questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-white mb-2">Unable to load test</p>
            <p className="text-slate-400 mb-4">The test may have been deleted or there was an error loading it.</p>
            <Button 
              onClick={() => navigate("/student/dashboard")}
              className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold"
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
      <div className="min-h-screen bg-cyber-black cyber-grid-bg">
        <nav className="bg-cyber-navy/80 backdrop-blur-xl border-b border-cyber-cyan/20">
          <div className="container mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold text-white">{testData?.title || "Test"}</h1>
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
                <p className="text-slate-400 mb-2">Your Score</p>
                <p className={`text-6xl font-bold ${score >= 70 ? 'text-green-600' : 'text-yellow-400'}`}>
                  {typeof score === 'number' ? score.toFixed(1) : score}%
                </p>
                <p className="text-slate-500 mt-2">
                  {correctCount} correct out of {totalQuestions || questions.length} questions
                </p>
              </div>

              {xpEarned > 0 && (
                <div
                  data-testid="quiz-xp-earned"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyber-lime/10 border border-cyber-lime/40 text-cyber-lime font-orbitron font-bold shadow-[0_0_18px_rgba(57,255,20,0.25)]"
                >
                  <Zap className="w-5 h-5" />
                  +{xpEarned} XP earned!
                </div>
              )}
              
              <div className="pt-6 border-t">
                <p className="text-slate-400 mb-4">
                  {score >= 90 ? "Excellent work! 🎉" :
                   score >= 80 ? "Great job! 👏" :
                   score >= 70 ? "Good effort! 👍" :
                   score >= 60 ? "Keep practicing! 📚" :
                   "Review the material and try again! 💪"}
                </p>
                <Button 
                  onClick={() => navigate("/student/dashboard")}
                  className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Show message when results are not released yet */}
          {!resultsReleased && (
            <Card className="max-w-4xl mx-auto bg-yellow-500/100/10 border-yellow-500/30">
              <CardContent className="py-8 text-center">
                <Lock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-yellow-400 mb-2">Results Pending Release</h3>
                <p className="text-yellow-400">
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
                <p className="text-slate-400">
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
                          ? 'bg-green-500/10 border-green-500/30' 
                          : 'bg-red-500/10 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          result.is_correct ? 'bg-green-500/100' : 'bg-red-500/100'
                        }`}>
                          {result.is_correct ? '✓' : '✗'}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-white mb-2">
                            Q{idx + 1}: {renderTextWithLineBreaks(result.question_text || '')}
                          </p>
                          
                          {result.choices && typeof result.choices === 'object' && (
                            <div className="space-y-1 text-sm">
                              {Object.entries(result.choices).map(([letter, text]) => (
                                <div 
                                  key={letter}
                                  className={`p-2 rounded ${
                                    letter === result.correct_answer 
                                      ? 'bg-green-200 text-green-400 font-medium' 
                                      : letter === result.student_answer && !result.is_correct
                                      ? 'bg-red-200 text-red-400 line-through'
                                      : 'bg-white'
                                  }`}
                                >
                                  {letter}. {renderChoice(text || '')}
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
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      {/* Header with timer */}
      <nav className="bg-cyber-navy/80 backdrop-blur-xl border-b border-cyber-cyan/20 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-2xl font-bold text-white">{testData.title}</h1>
              {testData.description && (
                <p className="text-sm text-slate-400">{testData.description}</p>
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
            <div className="flex justify-between text-sm text-slate-400">
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
                <div className="text-white mb-6 text-base font-medium whitespace-pre-line">
                  {renderTextWithLineBreaks(currentQuestion.question_text)}
                </div>
                
                <RadioGroup 
                  value={answers[currentQuestion.id]} 
                  onValueChange={(value) => setAnswers({ ...answers, [currentQuestion.id]: value })}
                >
                  {(currentQuestion.choices || []).map((choiceText, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center space-x-3 p-4 rounded-lg transition-colors border-2 cursor-pointer
                        ${answers[currentQuestion.id] === idx.toString() 
                          ? 'border-indigo-500 bg-indigo-500/10' 
                          : 'border-cyber-cyan/10 hover:bg-cyber-navy/40 hover:border-cyber-cyan/15'}`}
                    >
                      <RadioGroupItem 
                        value={idx.toString()} 
                        id={`${currentQuestion.id}-${idx}`}
                      />
                      <Label 
                        htmlFor={`${currentQuestion.id}-${idx}`}
                        className="flex-1 cursor-pointer text-base whitespace-pre-line"
                      >
                        {renderChoice(choiceText)}
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
                      ? 'bg-cyber-cyan text-cyber-black' 
                      : answers[q.id] 
                        ? 'bg-green-500/100' 
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
                className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold gap-2"
              >
                {submitting ? "Submitting..." : "Submit Test"}
                <CheckCircle className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Summary card at bottom */}
          <Card className="mt-6 bg-cyber-navy/40 border-cyber-cyan/10">
            <CardContent className="p-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">
                  {answeredCount === questions.length 
                    ? "✓ All questions answered!" 
                    : `${questions.length - answeredCount} question${questions.length - answeredCount !== 1 ? 's' : ''} remaining`}
                </span>
                {answeredCount === questions.length && currentQuestionIndex !== questions.length - 1 && (
                  <Button
                    onClick={() => setCurrentQuestionIndex(questions.length - 1)}
                    variant="link"
                    className="text-cyber-cyan p-0"
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
