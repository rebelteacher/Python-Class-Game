import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { resetCodeWithConfirm } from "../utils/resetCode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Play, Send, CheckCircle, XCircle, Code2, Lightbulb, X, BookOpen, Cpu, RotateCcw, ExternalLink, Blocks, Pencil, Save, Trash2, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import InteractiveInputCollector from "@/components/InteractiveInputCollector";
import LessonModal from "@/components/LessonModal";
import LessonPopup from "@/components/LessonPopup";
import MicrobitSimulator from "@/components/MicrobitSimulator";
import SkillQuizPopup from "@/components/SkillQuizPopup";
import AnimatedTurtle from "@/components/AnimatedTurtle";
import MazeLeaderboard from "@/components/MazeLeaderboard";
import BlockEditor from "@/components/BlockEditor";
import SpriteCanvas from "@/components/SpriteCanvas";
import TeacherPanel from "@/components/TeacherPanel";
import TurtleBlocklyEditor from "@/components/TurtleBlocklyEditor";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Format markdown-like content into styled HTML for lesson instructions
const formatLessonMarkdown = (content) => {
  if (!content) return "";
  const escapeHtml = (text) => text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let result = content;
  // Fenced code blocks
  result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-[#0A0E17] p-4 rounded border border-[#00F0FF]/20 overflow-x-auto my-4"><code class="text-[#39FF14] font-mono text-sm whitespace-pre-wrap">${escapeHtml(code.trim())}</code></pre>`;
  });

  // Markdown pipe-tables (GFM). Detect a header row followed by a separator row with dashes.
  // Capture: | col | col | ... \n |---|---|... \n (rows)+
  result = result.replace(
    /(^|\n)[ \t]*\|(.+?)\|[ \t]*\n[ \t]*\|[ \t]*[-: ]+\|[ \t]*[-:|]+[ \t]*\|?[ \t]*\n((?:[ \t]*\|.*\|[ \t]*\n?)+)/g,
    (match, leading, headerInner, bodyRaw) => {
      const splitRow = (row) => row.replace(/^[ \t]*\|/, '').replace(/\|[ \t]*$/, '').split('|').map(c => c.trim());
      const headers = splitRow(headerInner);
      const bodyRows = bodyRaw.trim().split('\n').map(splitRow);
      const thead = `<thead><tr>${headers.map(h => `<th class="border border-[#00F0FF]/30 px-3 py-2 text-left text-[#00F0FF] font-orbitron text-xs uppercase tracking-wider bg-[#0F172A] whitespace-nowrap">${escapeHtml(h)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${bodyRows.map(row =>
        `<tr>${row.map(cell => `<td class="border border-[#00F0FF]/15 px-3 py-2 text-slate-300 text-sm font-mono whitespace-nowrap">${escapeHtml(cell)}</td>`).join('')}</tr>`
      ).join('')}</tbody>`;
      return `${leading}<div class="overflow-x-auto my-4 border border-[#00F0FF]/20 rounded"><table class="border-collapse min-w-full w-auto">${thead}${tbody}</table></div>`;
    }
  );

  // Inline code
  result = result.replace(/`([^`]+)`/g, (_, code) => {
    return `<code class="bg-[#0F172A] px-1.5 py-0.5 rounded text-[#39FF14] font-mono text-sm border border-[#39FF14]/20">${escapeHtml(code)}</code>`;
  });
  // Markdown formatting
  result = result
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-[#FF00AA] mb-2 mt-5 font-orbitron tracking-wider" style="text-shadow: 0 0 8px rgba(255,0,170,0.5), 0 0 20px rgba(255,0,170,0.2)">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-[#FF00AA] mb-3 mt-6 font-orbitron tracking-wider" style="text-shadow: 0 0 10px rgba(255,0,170,0.6), 0 0 25px rgba(255,0,170,0.3)">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold text-[#00F0FF] mb-3 font-orbitron tracking-wider" style="text-shadow: 0 0 10px rgba(0,240,255,0.6), 0 0 25px rgba(0,240,255,0.3)">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#00F0FF] font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-[#FF00AA]">$1</em>')
    .replace(/^- (.*$)/gim, '<li class="ml-3 text-slate-300 mb-1.5 flex items-start gap-2 text-sm"><span class="text-[#00F0FF] mt-0.5 text-xs">&#9656;</span><span>$1</span></li>')
    .replace(/\n\n/g, '</p><p class="mb-3 text-slate-300 leading-relaxed text-sm">')
    .replace(/\n/g, '<br>');

  // Strip wrapping <p>/<br> that the loose newlines insert immediately around tables
  result = result
    .replace(/<p[^>]*>(\s|<br>)*(<table)/g, '$2')
    .replace(/(<\/table>)(\s|<br>)*<\/p>/g, '$1')
    .replace(/<br>\s*(<table)/g, '$1')
    .replace(/(<\/table>)\s*<br>/g, '$1');

  return `<p class="mb-3 text-slate-300 leading-relaxed text-sm">${result}</p>`;
};



export default function AssignmentPage({ user, lessonData }) {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const classroomIdFromNav = location.state?.classroomId; // Get classroom_id if passed from navigation
  const effectiveAssignmentId = lessonData ? lessonData.id : assignmentId;
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [savedCodePerProblem, setSavedCodePerProblem] = useState({}); // Save code for each problem
  const [savedXmlPerProblem, setSavedXmlPerProblem] = useState({}); // Save block XML for each problem
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [hasRunPerProblem, setHasRunPerProblem] = useState({}); // Track run status per problem
  const [problemStatuses, setProblemStatuses] = useState({}); // Track completion status (score) per problem
  const [problemsFinal, setProblemsFinal] = useState({}); // Track which problems are marked as done/final
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [darkMode, setDarkMode] = useState(false); // Dark mode toggle
  const [markingFinal, setMarkingFinal] = useState(false);
  
  // Lesson instructions state
  const [lessonInstructions, setLessonInstructions] = useState("");
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [lessonView, setLessonView] = useState("instruction"); // "instruction" | "practice"
  // Collapsed state for the lesson intro card. Auto-expanded on Problem 1,
  // auto-collapsed on Problem 2+, and the student can toggle any time.
  const [lessonIntroExpanded, setLessonIntroExpanded] = useState(true);
  useEffect(() => {
    // Reset expand/collapse when the student moves between problems.
    setLessonIntroExpanded(currentProblemIndex === 0);
  }, [currentProblemIndex]);
  // Whole-panel show/hide toggle so teachers (or students) can maximize
  // the code editor when they don't need to re-read the instructions.
  const [showInstructionsPanel, setShowInstructionsPanel] = useState(true);
  const [testInput, setTestInput] = useState(""); // For input() functions
  const [showInteractiveDialog, setShowInteractiveDialog] = useState(false); // Interactive input mode
  
  // Hint system state
  const [hintStatus, setHintStatus] = useState({ hints_used: 0, hints_remaining: 2, hint1_used: false, hint2_used: false });
  const [loadingHint, setLoadingHint] = useState(false);
  const [currentHint, setCurrentHint] = useState(null);
  const [showHintDialog, setShowHintDialog] = useState(false);
  
  // Lesson state
  const [lesson, setLesson] = useState(null);
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [loadingLesson, setLoadingLesson] = useState(false);
  
  // Turtle graphics state
  const [turtleImage, setTurtleImage] = useState("");
  const [useLiveTurtle, setUseLiveTurtle] = useState(true); // Use AnimatedTurtle instead of static image
  const [mazeStartTime, setMazeStartTime] = useState(null); // Track time for maze challenges
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState(-1); // For code highlighting during animation
  const codeEditorRef = useRef(null); // Reference to Monaco editor instance
  const decorationsRef = useRef([]); // Store decoration IDs for removal
  const turtleRef = useRef(null); // Reference to AnimatedTurtle for block assignments
  
  // Block-based programming state
  const blockEditorRef = useRef(null);
  const spriteCanvasRef = useRef(null);
  const turtleBlocksRef = useRef(null);  // Ref for Turtle Blocks AnimatedTurtle
  const [blockXml, setBlockXml] = useState("");
  const [isBlockRunning, setIsBlockRunning] = useState(false);
  const [blockCode, setBlockCode] = useState("");  // Generated Python code from blocks
  
  // Lesson popup state - track which problems user has acknowledged
  const [showLessonPopup, setShowLessonPopup] = useState(false);
  const [acknowledgedLessons, setAcknowledgedLessons] = useState(new Set());
  
  // Proctor code for unlocking done problems (kept for teacher override)
  const [showProctorDialog, setShowProctorDialog] = useState(false);
  const [proctorCode, setProctorCode] = useState("");
  const [unlockingProblem, setUnlockingProblem] = useState(false);
  
  // Skill quiz state
  const [showSkillQuiz, setShowSkillQuiz] = useState(false);
  const [quizSkillCategory, setQuizSkillCategory] = useState("");

  // Get current problem's ID
  const getCurrentProblemId = () => {
    if (assignment && assignment.problems && assignment.problems[currentProblemIndex]) {
      return assignment.problems[currentProblemIndex].id;
    }
    return assignmentId; // Fallback for old single-problem structure
  };

  useEffect(() => {
    // Fetch assignment data
    fetchAssignment();
    
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('editorDarkMode');
    if (savedDarkMode === 'true') {
      setDarkMode(true);
    }
    
    // Load saved code from localStorage
    const savedCodeData = localStorage.getItem(`saved_code_${effectiveAssignmentId}`);
    if (savedCodeData) {
      try {
        const parsedData = JSON.parse(savedCodeData);
        setSavedCodePerProblem(parsedData);
      } catch (e) {
        console.error("Error loading saved code:", e);
      }
    }
    
    // Load saved block XML from localStorage (for block-type assignments)
    const savedXmlData = localStorage.getItem(`saved_xml_${effectiveAssignmentId}`);
    if (savedXmlData) {
      try {
        const parsedXml = JSON.parse(savedXmlData);
        setSavedXmlPerProblem(parsedXml);
      } catch (e) {
        console.error("Error loading saved block XML:", e);
      }
    }
  }, [effectiveAssignmentId]);
  
  // Fetch submissions whenever assignment or navigation changes
  useEffect(() => {
    if (assignment) {
      fetchSubmissions();
    }
  }, [assignment, classroomIdFromNav]);

  useEffect(() => {
    // Load saved code when switching problems or when savedCodePerProblem updates
    if (assignment && assignment.problems && assignment.problems[currentProblemIndex]) {
      const currentProblemId = getCurrentProblemId();
      const currentProblem = assignment.problems[currentProblemIndex];
      
      // If problem is marked as final/done, load the submitted code
      if (problemsFinal[currentProblemId] && submissions.length > 0) {
        const problemSubmissions = submissions.filter(sub => sub.problem_id === currentProblemId);
        if (problemSubmissions.length > 0) {
          // Get the final submission (last one with is_final flag)
          const finalSubmission = problemSubmissions.find(sub => sub.is_final) || 
                                  problemSubmissions[problemSubmissions.length - 1];
          if (finalSubmission && finalSubmission.code) {
            setCode(finalSubmission.code);
            setOutput(""); // Clear output when loading saved submission
            return;
          }
        }
      }
      
      // Otherwise, check for saved code in localStorage
      const savedCode = savedCodePerProblem[currentProblemId];
      
      if (savedCode && savedCode.trim() !== "" && savedCode !== currentProblem.starter_code) {
        // Load saved code
        setCode(savedCode);
      } else {
        // Load starter code
        setCode(currentProblem.starter_code || "# Write your code here\n");
      }
      
      setOutput("");
    }
  }, [currentProblemIndex, assignment, savedCodePerProblem, problemsFinal, submissions]);
  
  // Check for lesson materials popup when problem changes
  useEffect(() => {
    if (!assignment?.problems?.[currentProblemIndex]) return;
    
    const currentProblem = assignment.problems[currentProblemIndex];
    const problemId = currentProblem.id;
    
    // Only show popup if:
    // 1. Problem has lesson_materials with content
    // 2. User hasn't already acknowledged this problem's lesson
    // 3. User is a student (teachers don't need to see it)
    if (
      currentProblem.lesson_materials?.length > 0 &&
      !acknowledgedLessons.has(problemId) &&
      user?.role !== 'teacher'
    ) {
      setShowLessonPopup(true);
    }
  }, [currentProblemIndex, assignment, acknowledgedLessons, user?.role]);
  
  // Handle lesson popup acknowledgment
  const handleLessonAcknowledged = () => {
    const problemId = getCurrentProblemId();
    setAcknowledgedLessons(prev => new Set([...prev, problemId]));
    setShowLessonPopup(false);
  };
  
  // Auto-save code to localStorage (debounced to prevent flickering)
  useEffect(() => {
    if (!assignment || !code) return;
    
    const currentProblemId = getCurrentProblemId();
    if (!currentProblemId) return;
    
    // Debounce: wait 1 second after typing stops before saving
    const timeoutId = setTimeout(() => {
      // Save to state
      setSavedCodePerProblem(prev => {
        const newState = {
          ...prev,
          [currentProblemId]: code
        };
        
        // Also save to localStorage for persistence across refreshes
        localStorage.setItem(`saved_code_${effectiveAssignmentId}`, JSON.stringify(newState));
        
        return newState;
      });
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [code, assignment, assignmentId]);

  // Handle code line highlighting in Monaco editor
  useEffect(() => {
    const editor = codeEditorRef.current;
    if (!editor) return;
    
    // Clear previous decorations
    if (decorationsRef.current.length > 0) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }
    
    // Add new decoration if we have a valid line
    if (highlightedLine >= 0) {
      decorationsRef.current = editor.deltaDecorations([], [
        {
          range: {
            startLineNumber: highlightedLine + 1, // Monaco uses 1-based line numbers
            startColumn: 1,
            endLineNumber: highlightedLine + 1,
            endColumn: 1000
          },
          options: {
            isWholeLine: true,
            className: 'highlighted-line',
            glyphMarginClassName: 'highlighted-line-glyph'
          }
        }
      ]);
      
      // Scroll to the highlighted line
      editor.revealLineInCenter(highlightedLine + 1);
    }
  }, [highlightedLine]);

  const hasRun = hasRunPerProblem[getCurrentProblemId()] || false;

  const fetchAssignment = async () => {
    try {
      // If lessonData is provided (auto-assign), use it directly
      if (lessonData) {
        setAssignment(lessonData);
        setLessonInstructions(lessonData.instructions || "");
        // Start on the first Class Practice problem for instruction view
        const starterCode = lessonData.problems?.[0]?.starter_code || "# Write your code here\n";
        setCode(starterCode);
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${API}/assignments/${assignmentId}`, {
        withCredentials: true,
      });
      console.log("Assignment data:", response.data); // Debug log
      setAssignment(response.data);
      
      // Handle both old (direct starter_code) and new (problems array) structure
      const starterCode = response.data.starter_code || 
                         (response.data.problems && response.data.problems[0]?.starter_code) ||
                         "# Write your code here\n";
      setCode(starterCode);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      toast.error("Failed to load assignment");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      // If we have a classroom_id from navigation, pass it to filter submissions
      const url = classroomIdFromNav 
        ? `${API}/submissions/assignment/${effectiveAssignmentId}?classroom_id=${classroomIdFromNav}`
        : `${API}/submissions/assignment/${effectiveAssignmentId}`;
      
      const response = await axios.get(url, {
        withCredentials: true,
      });
      setSubmissions(response.data);
      
      // Calculate status PER PROBLEM for students (no lives tracking - unlimited attempts)
      if (user.role === "student" && assignment && assignment.problems) {
        const statusMap = {};
        const finalMap = {};
        
        // Initialize all problems with no status
        assignment.problems.forEach(problem => {
          statusMap[problem.id] = null; // null = not attempted
          finalMap[problem.id] = false;
        });
        
        // Update based on submissions
        response.data.forEach(submission => {
          const problemId = submission.problem_id;
          
          // Track best score for this problem
          const currentBestScore = statusMap[problemId];
          const newScore = submission.score || 0;
          if (currentBestScore === null || newScore > currentBestScore) {
            statusMap[problemId] = newScore;
          }
          
          // Track if marked as final
          if (submission.is_final) {
            finalMap[problemId] = true;
          }
        });
        
        setProblemStatuses(statusMap);
        setProblemsFinal(finalMap);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const handleSaveInstructions = async () => {
    if (!assignment?.is_lesson) return;
    setSavingInstructions(true);
    try {
      await axios.put(`${API}/curriculum/lesson-instructions`, {
        assignment_type: assignment.assignment_type,
        chapter: assignment.chapter,
        lesson: assignment.lesson,
        instructions: instructionsDraft,
      }, { withCredentials: true });
      setLessonInstructions(instructionsDraft);
      setEditingInstructions(false);
      toast.success("Instructions saved!");
    } catch (err) {
      console.error("Error saving instructions:", err);
      toast.error("Failed to save instructions");
    } finally {
      setSavingInstructions(false);
    }
  };

  const handleRemoveProblemFromLesson = async (problemId, problemTitle) => {
    if (!assignment?.is_lesson) return;
    if (!window.confirm(`Remove "${problemTitle}" from this lesson? The problem will still exist in the library.`)) return;
    
    try {
      await axios.post(`${API}/curriculum/remove-problem-from-lesson`, {
        problem_id: problemId,
      }, { withCredentials: true });
      
      // Remove from local state
      const updatedProblems = assignment.problems.filter(p => p.id !== problemId);
      const updatedProblemIds = assignment.problem_ids.filter(id => id !== problemId);
      setAssignment({ ...assignment, problems: updatedProblems, problem_ids: updatedProblemIds });
      
      // Adjust currentProblemIndex if needed
      if (currentProblemIndex >= updatedProblems.length) {
        setCurrentProblemIndex(Math.max(0, updatedProblems.length - 1));
      }
      
      toast.success(`Removed "${problemTitle}" from lesson`);
    } catch (err) {
      console.error("Error removing problem:", err);
      toast.error("Failed to remove problem");
    }
  };




  const handleRunCode = async (providedInput = null) => {
    // Get current problem
    const currentProblem = assignment?.problems?.[currentProblemIndex];
    const isTurtle = currentProblem?.assignment_type === "turtle";
    const isMicrobit = currentProblem?.assignment_type === "microbit";
    
    // For Micro:bit assignments, don't run on backend - use the visual simulator only
    if (isMicrobit) {
      // Mark as run so submit button becomes enabled
      const currentProblemId = getCurrentProblemId();
      setHasRunPerProblem(prev => ({
        ...prev,
        [currentProblemId]: true
      }));
      
      // Show a helpful message
      setOutput("✅ Use the Virtual Micro:bit simulator above to test your code!\n\nClick the 'Run' button on the simulator to see your code in action.\n\nNote: The simulator shows LED display commands. For full functionality (sensors, buttons, pins), flash your code to a real Micro:bit.");
      return;
    }
    
    // Check if code contains input() calls and no input provided yet (skip for turtle)
    if (!isTurtle) {
      const hasInputCalls = /input\s*\(/i.test(code);
      if (hasInputCalls && !testInput && providedInput === null) {
        // Always show interactive dialog for student to enter input
        setShowInteractiveDialog(true);
        return;
      }
    }

    setRunning(true);
    setOutput("");
    setTurtleImage(""); // Clear previous turtle image
    
    // Mark current problem as run
    const currentProblemId = getCurrentProblemId();
    setHasRunPerProblem(prev => ({
      ...prev,
      [currentProblemId]: true
    }));
    
    try {
      if (isTurtle) {
        // Execute turtle graphics code
        const response = await axios.post(
          `${API}/code/execute-turtle`,
          {
            code: code,
            test_input: "",
          },
          { withCredentials: true }
        );
        
        if (response.data.success && response.data.image_data) {
          setTurtleImage(response.data.image_data);
          setOutput(response.data.output || "✅ Turtle graphics executed successfully!");
        } else {
          setOutput("❌ Error: " + (response.data.error || "Failed to generate turtle graphics"));
        }
      } else {
        // Regular code execution
        const inputToUse = providedInput !== null ? providedInput : testInput;
        const response = await axios.post(
          `${API}/code/execute`,
          {
            code: code,
            test_input: inputToUse,
          },
          { withCredentials: true }
        );
        setOutput(response.data.output || response.data.error || "No output");
      }
    } catch (error) {
      console.error("Error running code:", error);
      const errorMsg = error.response?.status === 502 
        ? "Server timeout - your code might have an infinite loop or is taking too long. Please check your code and try again."
        : error.response?.data?.error || error.message || "Failed to run code";
      setOutput("❌ Error: " + errorMsg);
      toast.error("Code execution failed");
    } finally {
      setRunning(false);
    }
  };

  const handleInteractiveInputSubmit = (collectedInputs) => {
    handleRunCode(collectedInputs);
  };

  const handleViewLesson = async () => {
    setLoadingLesson(true);
    try {
      const currentProblemId = getCurrentProblemId();
      const response = await axios.get(
        `${API}/lessons/${assignmentId}?problem_id=${currentProblemId}`,
        { withCredentials: true }
      );
      
      if (response.data.exists === false) {
        toast.info("No lesson available yet for this assignment. Check back later!");
        return;
      }
      
      setLesson(response.data);
      setShowLessonDialog(true);
    } catch (error) {
      console.error("Error fetching lesson:", error);
      toast.error("Failed to load lesson");
    } finally {
      setLoadingLesson(false);
    }
  };

  const handleSubmit = async () => {
    // Get current problem
    const currentProblem = assignment.problems?.[currentProblemIndex];
    const isBlockType = currentProblem?.assignment_type === "block";
    
    console.log("handleSubmit called");
    console.log("hasRun:", hasRun);
    console.log("hasRunPerProblem:", hasRunPerProblem);
    console.log("getCurrentProblemId():", getCurrentProblemId());
    console.log("code length:", code?.length);
    
    // Block assignments now use code (like turtle), so require run and code
    if (!hasRun) {
      toast.error("Please run your code first before submitting!");
      return;
    }

    if (!code.trim()) {
      toast.error("Please write some code before submitting");
      return;
    }

    // Get current problem ID
    const problemId = assignment.problems && assignment.problems[currentProblemIndex] 
      ? assignment.problems[currentProblemIndex].id 
      : assignmentId;
    
    // Check if marked as final/done
    if (problemsFinal[problemId]) {
      toast.error("This problem is marked as done. You cannot submit again!");
      return;
    }

    setSubmitting(true);
    try {
      // Build submission payload
      const submissionData = {
        assignment_id: effectiveAssignmentId,
        problem_id: problemId,
        code: code || "",
      };
      
      const response = await axios.post(
        `${API}/submissions`,
        submissionData,
        { withCredentials: true }
      );
      
      const isPassing = response.data.score >= 70;
      const xpEarned = response.data.xp_earned || 0;
      const coinsEarned = response.data.coins_earned || 0;
      const rankUp = response.data.rank_up;
      const newRank = response.data.new_rank;
      
      // Update status for THIS problem (best score)
      setProblemStatuses(prev => {
        const currentBest = prev[problemId] || 0;
        return {
          ...prev,
          [problemId]: Math.max(currentBest, response.data.score)
        };
      });
      
      if (rankUp) {
        toast.success(`🎉 RANK UP! You're now a ${newRank}!`, { duration: 5000 });
      }
      
      if (isPassing) {
        toast.success(
          `✅ Great job! Score: ${response.data.score.toFixed(1)}% | +${xpEarned} XP | +${coinsEarned} 🪙`,
          { duration: 4000 }
        );
      } else {
        toast.warning(`Score: ${response.data.score.toFixed(1)}% - Keep trying! You can submit unlimited times until you click Done.`);
      }
      
      // Reset run status for current problem after submission
      setHasRunPerProblem(prev => ({
        ...prev,
        [problemId]: false
      }));
      fetchSubmissions();
    } catch (error) {
      console.error("Error submitting assignment:", error);
      if (error.response?.status === 403) {
        toast.error(error.response.data.detail || "Submission not allowed");
      } else {
        toast.error("Failed to submit assignment");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkFinal = async () => {
    const problemId = getCurrentProblemId();
    
    // Get the most recent submission for this problem
    const problemSubmissions = submissions.filter(sub => sub.problem_id === problemId);
    if (problemSubmissions.length === 0) {
      toast.error("You must submit at least once before marking as done");
      return;
    }
    
    // Get best score for this problem
    const bestScore = problemStatuses[problemId] || 0;
    
    // Confirmation dialog
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to submit this assignment as DONE?\n\n` +
      `Your current best score: ${bestScore.toFixed(0)}%\n\n` +
      `After clicking OK:\n` +
      `• This problem will be marked as COMPLETED\n` +
      `• You will NOT be able to submit again\n` +
      `• Only your teacher can unlock it with a proctor code\n\n` +
      `Click OK to confirm, or Cancel to keep working.`
    );
    
    if (!confirmed) return;
    
    // Get latest submission
    const latestSubmission = problemSubmissions[problemSubmissions.length - 1];
    
    setMarkingFinal(true);
    try {
      await axios.post(
        `${API}/submissions/${latestSubmission.id}/mark-final`,
        {},
        { withCredentials: true }
      );
      
      // Update local state
      setProblemsFinal(prev => ({
        ...prev,
        [problemId]: true
      }));
      
      toast.success("Problem submitted as done! It will now appear in your Completed assignments.");
      
      // Check if this was the last problem - trigger skill quiz
      if (assignment && assignment.problems) {
        const totalProblems = assignment.problems.length;
        const updatedFinalMap = { ...problemsFinal, [problemId]: true };
        const completedCount = Object.values(updatedFinalMap).filter(Boolean).length;
        
        // If all problems are done, show the skill quiz
        if (completedCount === totalProblems && totalProblems > 0) {
          // Use the assignment's category as the skill category
          const skillCategory = assignment.category || assignment.problems[0]?.category || "General";
          setQuizSkillCategory(skillCategory);
          setShowSkillQuiz(true);
        }
      }
    } catch (error) {
      console.error("Error marking final:", error);
      toast.error(error.response?.data?.detail || "Failed to mark as done");
    } finally {
      setMarkingFinal(false);
    }
  };
  
  const handleUnlockProblem = async () => {
    if (!proctorCode.trim()) {
      toast.error("Please enter the proctor code");
      return;
    }
    
    const problemId = getCurrentProblemId();
    setUnlockingProblem(true);
    
    try {
      // Verify proctor code with backend
      await axios.post(
        `${API}/assignments/${assignmentId}/unlock-problem`,
        {
          problem_id: problemId,
          proctor_code: proctorCode
        },
        { withCredentials: true }
      );
      
      // Update local state to unlock
      setProblemsFinal(prev => ({
        ...prev,
        [problemId]: false
      }));
      
      setShowProctorDialog(false);
      setProctorCode("");
      toast.success("Problem unlocked! You can now submit again.");
    } catch (error) {
      console.error("Error unlocking problem:", error);
      toast.error(error.response?.data?.detail || "Invalid proctor code");
    } finally {
      setUnlockingProblem(false);
    }
  };


  // Fetch hint status when assignment loads
  useEffect(() => {
    if (assignment && user?.role === "student") {
      fetchHintStatus();
    }
  }, [assignment]);

  const fetchHintStatus = async () => {
    try {
      const response = await axios.get(`${API}/hint-status/${assignmentId}`, {
        withCredentials: true
      });
      setHintStatus(response.data);
    } catch (error) {
      console.error("Error fetching hint status:", error);
    }
  };

  const handleRequestHint = async (hintLevel) => {
    if (!code.trim()) {
      toast.error("Please write some code first before requesting a hint!");
      return;
    }
    
    if (loadingHint) {
      return; // Prevent duplicate requests
    }

    const coinCost = hintLevel === 1 ? 50 : 100;
    
    setLoadingHint(true);
    try {
      console.log("Requesting hint level:", hintLevel);
      const response = await axios.post(
        `${API}/get-hint`,
        {
          assignment_id: effectiveAssignmentId,
          problem_id: getCurrentProblemId(),
          code: code,
          hint_level: hintLevel
        },
        { withCredentials: true }
      );

      console.log("Hint response:", response.data);

      if (response.data && response.data.hint) {
        setCurrentHint({
          text: response.data.hint,
          level: hintLevel,
          coins_spent: response.data.coins_spent
        });
        
        // Update hint status first
        setHintStatus({
          hints_used: response.data.hints_used,
          hints_remaining: response.data.hints_remaining,
          hint1_used: hintLevel === 1 ? true : hintStatus.hint1_used,
          hint2_used: hintLevel === 2 ? true : hintStatus.hint2_used
        });
        
        // Then show the dialog
        setTimeout(() => {
          setShowHintDialog(true);
          console.log("Dialog should be showing now");
        }, 100);
        
        toast.success(`Hint received! ${coinCost} coins spent. ${response.data.remaining_coins} coins remaining.`);
      } else {
        toast.error("Hint received but was empty");
      }
      
    } catch (error) {
      console.error("Error requesting hint:", error);
      const errorMsg = error.response?.data?.detail || "Failed to get hint";
      toast.error(errorMsg);
      
      // Refresh hint status in case something changed
      fetchHintStatus();
    } finally {
      setLoadingHint(false);
    }
  };


  if (loading) {
    return (
      <div data-testid="assignment-loading" className="min-h-screen flex items-center justify-center bg-cyber-black cyber-grid-bg">
        <div className="text-xl text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-black cyber-grid-bg">
        <div className="text-xl text-slate-400">Assignment not found</div>
      </div>
    );
  }

  const isTeacher = user.role === "teacher";
  const latestSubmission = submissions.length > 0 ? submissions[submissions.length - 1] : null;

  return (
    <div data-testid="assignment-page" className="min-h-screen bg-cyber-black cyber-grid-bg">
      <nav className="bg-cyber-navy/80 backdrop-blur-xl border-b border-cyber-cyan/20">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button 
              data-testid="back-to-dashboard-btn" 
              onClick={() => {
                const dashboardPath = user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
                // Use replace to force a fresh load of the dashboard
                navigate(dashboardPath, { replace: true, state: { refresh: Date.now() } });
              }} 
              variant="ghost" 
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <Code2 className="w-7 h-7 text-cyber-cyan" />
              <span className="text-xl font-bold text-white">{assignment.title}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Multi-Problem Navigation */}
      {assignment.problems && assignment.problems.length > 1 && (
        <div className="bg-cyber-navy/60 border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">
                Problem {currentProblemIndex + 1} of {assignment.problems.length}
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-400">
                  Progress: {Object.values(problemsFinal).filter(isDone => isDone).length}/{assignment.problems.length} done
                </div>
                {user.role === "student" && (
                  <div className="text-sm font-semibold">
                    Final Grade: {(() => {
                      const scores = assignment.problems.map(p => problemStatuses[p.id] || 0);
                      const totalProblems = assignment.problems.length;
                      const averageScore = totalProblems > 0 
                        ? scores.reduce((sum, score) => sum + score, 0) / totalProblems 
                        : 0;
                      const gradeColor = averageScore >= 90 ? "text-green-600" :
                                        averageScore >= 70 ? "text-yellow-400" :
                                        averageScore > 0 ? "text-orange-600" : "text-slate-500";
                      return <span className={gradeColor}>{averageScore.toFixed(1)}%</span>;
                    })()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {assignment.problems.map((problem, index) => {
                const problemScore = problemStatuses[problem.id];
                const isFinal = problemsFinal[problem.id];
                
                // Determine color based on score
                let colorClass = 'bg-cyber-navy/30 text-slate-300 hover:bg-slate-800'; // Not attempted
                if (problemScore !== null && problemScore !== undefined) {
                  if (problemScore === 100) {
                    colorClass = 'bg-green-500/100 text-white hover:bg-green-600'; // Perfect
                  } else if (problemScore >= 70) {
                    colorClass = 'bg-yellow-400 text-white hover:bg-yellow-500/100'; // Passing
                  } else {
                    colorClass = 'bg-red-400 text-white hover:bg-red-500/100'; // Failed
                  }
                }
                
                // Mark as done/final
                if (isFinal) {
                  colorClass = 'bg-blue-500/100 text-white hover:bg-blue-600';
                }
                
                // Current problem highlight
                if (currentProblemIndex === index) {
                  colorClass = 'bg-cyber-cyan text-cyber-black text-white border-2 border-indigo-800';
                }
                
                return (
                  <div key={problem.id} className="relative inline-flex group">
                    <button
                      onClick={() => setCurrentProblemIndex(index)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${colorClass} ${
                        assignment?.is_lesson && user?.is_admin ? 'pr-8' : ''
                      }`}
                    >
                      {problemScore === 100 && '✓ '}
                      {isFinal && problemScore !== 100 && '✔ '}
                      {index + 1}. {problem.title}
                      {problemScore !== null && problemScore !== undefined && (
                        <span className="ml-1 text-xs">({problemScore.toFixed(0)}%)</span>
                      )}
                      {problem.problem_type && (
                        <span className="block text-[10px] font-normal opacity-70 mt-0.5 normal-case">
                          {problem.problem_type}
                        </span>
                      )}
                    </button>
                    {assignment?.is_lesson && user?.is_admin && user?.email === 'astapp@spanola.net' && (
                      <button
                        data-testid={`remove-problem-${problem.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveProblemFromLesson(problem.id, problem.title);
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-cyber-red text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:shadow-[0_0_8px_rgba(255,51,102,0.5)] z-10"
                        title="Remove from lesson"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-6 py-6">
        <div style={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
        <PanelGroup direction="horizontal" style={{ height: '100%' }}>
          {/* Collapsed strip — click to re-open the Instructions panel */}
          {!showInstructionsPanel && (
            <button
              type="button"
              data-testid="show-instructions-panel-btn"
              onClick={() => setShowInstructionsPanel(true)}
              className="h-full w-8 shrink-0 flex flex-col items-center justify-center gap-3 border-r border-cyber-cyan/20 bg-cyber-navy/40 hover:bg-cyber-navy/70 transition-colors group"
              title="Show Instructions"
            >
              <ChevronRight className="w-4 h-4 text-cyber-cyan group-hover:translate-x-0.5 transition-transform" />
              <span
                className="text-[10px] font-orbitron uppercase tracking-widest text-cyber-cyan"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                Instructions
              </span>
            </button>
          )}
          {/* Left Side: Instructions & Test Cases - Compact for more coding space */}
          {showInstructionsPanel && (
          <Panel defaultSize={20} minSize={15} maxSize={60}>
            <div className="space-y-4 pr-2 h-full overflow-y-auto pl-0">
              <Card data-testid="assignment-instructions" className="ml-0 rounded-l-none border-l-0">
                <CardHeader className="pb-2 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Instructions</CardTitle>
                    <button
                      type="button"
                      data-testid="hide-instructions-panel-btn"
                      onClick={() => setShowInstructionsPanel(false)}
                      className="p-1 rounded hover:bg-cyber-navy/60 text-slate-400 hover:text-cyber-cyan transition-colors"
                      title="Hide Instructions panel (click the strip on the left to re-open)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {/* Edit instructions - only accessible from Admin Lesson Manager */}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-3">
                  {/* Lesson instructions editing mode */}
                  {assignment?.is_lesson && editingInstructions ? (
                    <div className="space-y-2">
                      <Textarea
                        data-testid="lesson-instructions-editor"
                        value={instructionsDraft}
                        onChange={(e) => setInstructionsDraft(e.target.value)}
                        placeholder="Write lesson instructions here using markdown...&#10;&#10;# Heading&#10;## Subheading&#10;**bold text**&#10;- bullet point&#10;`inline code`&#10;```python&#10;code block&#10;```"
                        className="min-h-[300px] bg-cyber-black/50 border-cyber-cyan/30 text-white font-fira text-sm rounded-none resize-y"
                      />
                      <div className="flex gap-2">
                        <Button
                          data-testid="save-instructions-btn"
                          size="sm"
                          onClick={handleSaveInstructions}
                          disabled={savingInstructions}
                          className="bg-cyber-cyan text-cyber-black font-orbitron text-xs uppercase tracking-widest rounded-none font-bold gap-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {savingInstructions ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingInstructions(false)}
                          className="text-slate-400 rounded-none text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Lesson Instructions — shared context, collapsible.
                          Auto-expanded on Problem 1, collapsed on Problem 2+.
                          Student can toggle any time. Only appears when both
                          the assignment is a lesson AND instructions exist. */}
                      {assignment?.is_lesson && lessonInstructions && (
                        <div
                          data-testid="lesson-intro-collapsible"
                          className={`mb-4 border border-cyber-cyan/30 bg-cyber-navy/20 rounded-none ${lessonIntroExpanded ? '' : 'pb-0'}`}
                        >
                          <button
                            type="button"
                            data-testid="lesson-intro-toggle"
                            onClick={() => setLessonIntroExpanded((v) => !v)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-cyber-navy/40 transition-colors"
                          >
                            {lessonIntroExpanded ? (
                              <ChevronDown className="w-4 h-4 text-cyber-cyan shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-cyber-cyan shrink-0" />
                            )}
                            <BookOpen className="w-4 h-4 text-cyber-cyan shrink-0" />
                            <span className="text-xs font-orbitron text-cyber-cyan uppercase tracking-widest">
                              Lesson Intro
                            </span>
                            {!lessonIntroExpanded && (
                              <span className="text-xs text-slate-400 ml-auto italic">click to expand</span>
                            )}
                          </button>
                          {lessonIntroExpanded && (
                            <div
                              className="px-4 pb-4 pt-1 text-sm leading-relaxed font-chakra lesson-instructions-content border-t border-cyber-cyan/10"
                              dangerouslySetInnerHTML={{ __html: formatLessonMarkdown(lessonInstructions) }}
                            />
                          )}
                        </div>
                      )}

                      {/* Problem-specific description — always visible */}
                      <div
                        className="text-sm leading-relaxed font-chakra lesson-instructions-content"
                        dangerouslySetInnerHTML={{ __html: formatLessonMarkdown(
                          (assignment.problems && assignment.problems[currentProblemIndex]?.description) || assignment.description || "No description provided."
                        ) }}
                      />
                    </>
                  )}
                  
                  {/* Resources Link - Show for students and teachers */}
                  {assignment.problems?.[currentProblemIndex]?.resources_link && (() => {
                    // Extract URL from iframe embed code if someone pasted embed code instead of URL
                    let resourceUrl = assignment.problems[currentProblemIndex].resources_link;
                    
                    // Check if it contains iframe embed code
                    if (resourceUrl.includes('<iframe') || resourceUrl.includes('&lt;iframe')) {
                      // Try to extract src from iframe
                      const srcMatch = resourceUrl.match(/src=["']([^"']+)["']/i);
                      if (srcMatch && srcMatch[1]) {
                        resourceUrl = srcMatch[1];
                      }
                    }
                    
                    // Clean up any HTML entities
                    resourceUrl = resourceUrl.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                    
                    // Make sure it starts with http/https
                    if (!resourceUrl.startsWith('http://') && !resourceUrl.startsWith('https://')) {
                      resourceUrl = 'https://' + resourceUrl;
                    }
                    
                    return (
                      <div className="mt-4 pt-4 border-t">
                        <a
                          href={resourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 transition-colors"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span className="font-medium">View Resources</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    );
                  })()}
                  
                  {/* Lesson Materials Indicator */}
                  {assignment.problems?.[currentProblemIndex]?.lesson_materials?.length > 0 && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLessonPopup(true)}
                        className="gap-2 text-purple-400 border-purple-300 hover:bg-purple-500/10"
                      >
                        📚 Review Lesson Materials
                      </Button>
                    </div>
                  )}
                  
                  {/* Teacher Solution Button */}
                  {user.role === "teacher" && (
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={() => {
                          const problem = assignment.problems ? assignment.problems[currentProblemIndex] : assignment;
                          if (problem.solution_code) {
                            if (code === problem.solution_code) {
                              // Hide solution - load starter code
                              setCode(problem.starter_code || "# Write your code here\n");
                              toast.info("Solution hidden");
                            } else {
                              // Show solution
                              setCode(problem.solution_code);
                              toast.success("Solution code loaded!");
                            }
                          } else {
                            toast.info("No solution code available for this problem");
                          }
                        }}
                        variant="outline"
                        className="w-full gap-2 border-green-600 text-green-400 hover:bg-green-500/10"
                        size="sm"
                      >
                        <Code2 className="w-4 h-4" />
                        {(() => {
                          const problem = assignment.problems ? assignment.problems[currentProblemIndex] : assignment;
                          return code === problem?.solution_code ? "Hide Solution" : "Show Solution Code";
                        })()}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Micro:bit Specific Content */}
              {(() => {
                const currentProblem = assignment.problems?.[currentProblemIndex];
                const isMicrobit = currentProblem?.assignment_type === "microbit";
                
                if (!isMicrobit) return null;
                
                return (
                  <>
                    {/* Learning Objectives */}
                    {currentProblem.learning_objectives?.length > 0 && (
                      <Card className="border-cyan-200 bg-cyan-500/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            🎯 Learning Objectives
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {currentProblem.learning_objectives.map((obj, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                                <span>{obj}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Materials Needed */}
                    {currentProblem.materials_needed?.length > 0 && (
                      <Card className="border-yellow-500/30 bg-yellow-500/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            🔧 Materials Needed
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {currentProblem.materials_needed.map((mat, i) => (
                              <span 
                                key={i} 
                                className="px-2 py-1 bg-cyber-navy/60 border border-yellow-300 rounded-full text-xs font-medium"
                              >
                                {mat}
                              </span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Wiring Instructions */}
                    {currentProblem.wiring_instructions && (
                      <Card className="border-orange-500/30 bg-orange-500/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            ⚡ Wiring Instructions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-sm whitespace-pre-wrap font-sans text-slate-300">
                            {currentProblem.wiring_instructions}
                          </pre>
                        </CardContent>
                      </Card>
                    )}
                  </>
                );
              })()}

              {/* Expected Output - Text or Turtle Image */}
              {(() => {
                const currentProblem = assignment.problems?.[currentProblemIndex];
                const isTurtle = currentProblem?.assignment_type === "turtle" || 
                                 currentProblem?.unit_type === "turtle" ||
                                 assignment.assignment_type === "turtle" ||
                                 assignment.unit_type === "turtle";
                const hasExpectedOutput = assignment.expected_output || currentProblem?.expected_output;
                const hasExpectedImage = currentProblem?.expected_turtle_image || 
                                         assignment.expected_turtle_image ||
                                         currentProblem?.expected_image ||
                                         assignment.expected_image;
                
                if (isTurtle && hasExpectedImage) {
                  return (
                    <Card data-testid="expected-output-card" className="border-2 border-green-500/30 bg-green-500/10">
                      <CardHeader>
                        <CardTitle className="text-lg">🎯 Expected Output</CardTitle>
                        <CardDescription>Your turtle graphics should look like this</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-center">
                          <img 
                            src={`data:image/png;base64,${hasExpectedImage}`}
                            alt="Expected turtle output"
                            className="border-2 border-green-300 rounded max-w-full h-auto"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                } else if (isTurtle && !hasExpectedImage) {
                  // Show message when turtle problem has no expected image
                  return (
                    <Card data-testid="expected-output-card" className="border-2 border-yellow-500/30 bg-yellow-500/10">
                      <CardHeader>
                        <CardTitle className="text-lg">🎯 Expected Output</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-yellow-400 text-sm">
                          Follow the instructions and test cases to create your turtle drawing.
                        </p>
                      </CardContent>
                    </Card>
                  );
                } else if (!isTurtle && hasExpectedOutput) {
                  return (
                    <Card data-testid="expected-output-card" className="border-2 border-green-500/30 bg-green-500/10">
                      <CardHeader>
                        <CardTitle className="text-lg">Expected Output</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="p-3 bg-cyber-navy/60 rounded border border-green-300 text-slate-200 text-sm font-mono whitespace-pre-wrap">
                          {assignment.expected_output || currentProblem.expected_output}
                        </pre>
                      </CardContent>
                    </Card>
                  );
                }
                return null;
              })()}

              <Card data-testid="test-cases-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    📋 Test Cases
                    <span className="text-sm font-normal text-slate-500">
                      ({(() => {
                        const problem = assignment.problems ? assignment.problems[currentProblemIndex] : assignment;
                        const testCases = problem?.test_cases || [];
                        return testCases.length;
                      })()} tests)
                    </span>
                  </CardTitle>
                  <CardDescription>Your code will be graded against ALL these test cases</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Test Cases Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-indigo-500/10">
                          <th className="border border-cyber-cyan/10 px-3 py-2 text-left font-semibold text-indigo-400">#</th>
                          <th className="border border-cyber-cyan/10 px-3 py-2 text-left font-semibold text-indigo-400">Test Name</th>
                          <th className="border border-cyber-cyan/10 px-3 py-2 text-left font-semibold text-indigo-400">Input</th>
                          <th className="border border-cyber-cyan/10 px-3 py-2 text-left font-semibold text-indigo-400">Expected Output</th>
                          <th className="border border-cyber-cyan/10 px-3 py-2 text-center font-semibold text-indigo-400">Points</th>
                          {latestSubmission && <th className="border border-cyber-cyan/10 px-3 py-2 text-center font-semibold text-indigo-400">Status</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const problem = assignment.problems ? assignment.problems[currentProblemIndex] : assignment;
                          const testCases = problem?.test_cases || [];
                          const pointsPerTest = testCases.length > 0 ? Math.round(100 / testCases.length) : 0;
                          
                          // Get test results from latest submission to show pass/fail
                          const testResults = latestSubmission?.test_results || [];
                          
                          return testCases.map((testCase, index) => {
                            // Find matching result by description or index
                            const result = testResults.find(r => 
                              r.description === testCase.description || 
                              r.description === (testCase.description || `Test ${index + 1}`) ||
                              r.test_id === `pattern_${index}`
                            );
                            
                            return (
                            <tr key={testCase.id || index} className={index % 2 === 0 ? 'bg-cyber-navy/60' : 'bg-cyber-navy/40'}>
                              <td className="border border-cyber-cyan/10 px-3 py-2 text-center font-medium text-slate-400">
                                {index + 1}
                              </td>
                              <td className="border border-cyber-cyan/10 px-3 py-2 font-medium text-white">
                                {testCase.description || `Test ${index + 1}`}
                              </td>
                              <td className="border border-cyber-cyan/10 px-3 py-2">
                                <pre className="whitespace-pre-wrap font-mono text-xs bg-blue-500/10 p-2 rounded text-blue-400 max-w-xs overflow-x-auto">
                                  {(testCase.input_data || testCase.input || "(no input)").split('\\n').join('\n')}
                                </pre>
                              </td>
                              <td className="border border-cyber-cyan/10 px-3 py-2">
                                <pre className="whitespace-pre-wrap font-mono text-xs bg-green-500/10 p-2 rounded text-green-400 max-w-xs overflow-x-auto">
                                  {(testCase.expected_output || "").split('\\n').join('\n')}
                                </pre>
                              </td>
                              <td className="border border-cyber-cyan/10 px-3 py-2 text-center">
                                <span className="inline-flex items-center justify-center px-2 py-1 bg-amber-100 text-amber-800 rounded-full font-semibold text-xs">
                                  {testCase.points || pointsPerTest} pts
                                </span>
                              </td>
                              {latestSubmission && (
                                <td className="border border-cyber-cyan/10 px-3 py-2 text-center">
                                  {result ? (
                                    result.passed ? (
                                      <span className="inline-flex items-center justify-center px-2 py-1 bg-green-500/20 text-green-400 rounded-full font-semibold text-xs">
                                        ✓ Pass
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center px-2 py-1 bg-red-500/20 text-red-400 rounded-full font-semibold text-xs">
                                        ✗ Fail
                                      </span>
                                    )
                                  ) : (
                                    <span className="inline-flex items-center justify-center px-2 py-1 bg-cyber-navy/30 text-slate-500 rounded-full font-semibold text-xs">
                                      —
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          )});
                        })()}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Helpful tip for students */}
                  <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-xs text-yellow-400">
                      <strong>💡 Tip:</strong> Your output must match the expected output <strong>exactly</strong> (including spaces, capitalization, and punctuation). 
                      Run your code first to see what your program outputs!
                    </p>
                  </div>
                </CardContent>
              </Card>

              {latestSubmission && (
                <Card data-testid="latest-submission-card" className="border-2 border-indigo-200 bg-indigo-500/10">
                  <CardHeader>
                    <CardTitle className="text-lg">Latest Submission</CardTitle>
                    <CardDescription>
                      Score: <span className="font-bold text-cyber-cyan">{latestSubmission.score.toFixed(1)}%</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3">
                      <div className="font-semibold text-sm text-white mb-2">Feedback:</div>
                      <p className="text-sm text-slate-300">{latestSubmission.feedback}</p>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-white mb-2">Test Results:</div>
                      <div className="space-y-2">
                        {latestSubmission.test_results?.map((result, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            {result.passed ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={result.passed ? "text-green-400" : "text-red-400"}>
                              {result.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </Panel>
          )}

          {/* Resize Handle — only render when the panel is showing */}
          {showInstructionsPanel && (
            <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-cyber-cyan/100 transition-colors cursor-col-resize mx-2" />
          )}

          {/* Right Side: Code Editor & Output */}
          <Panel defaultSize={80} minSize={60}>
            <div className="pl-2 pr-0 h-full">
            {!isTeacher ? (
              /* Check if this is a block assignment - use simplified full-width layout */
              assignment.problems?.[currentProblemIndex]?.assignment_type === "block" ? (
                /* Block-Based Layout - TurtleBlocklyEditor takes full space with inline preview */
                <div className="h-full flex flex-col pr-0" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                  {/* Compact header with score and submit */}
                  <div className="flex items-center justify-between bg-cyber-navy/60 border-b px-3 py-2 flex-shrink-0 rounded-tr-none">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-300">🧩 Block Coding</span>
                      {(() => {
                        const currentProblemId = getCurrentProblemId();
                        const bestScore = problemStatuses[currentProblemId];
                        const isFinal = problemsFinal[currentProblemId];
                        
                        if (isFinal) {
                          return <span className="text-sm text-blue-600 font-medium">✔ Done ({bestScore?.toFixed(0) || 0}%)</span>;
                        }
                        if (bestScore !== null && bestScore !== undefined) {
                          return <span className={`text-sm font-medium ${bestScore >= 70 ? 'text-green-600' : 'text-orange-600'}`}>Best: {bestScore.toFixed(0)}%</span>;
                        }
                        return null;
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        data-testid="submit-code-btn"
                        onClick={() => handleSubmit()}
                        disabled={submitting || problemsFinal[getCurrentProblemId()]}
                        size="sm"
                        className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold"
                      >
                        {submitting ? "Submitting..." : problemsFinal[getCurrentProblemId()] ? "✓ Submitted" : "Submit"}
                      </Button>
                      {!problemsFinal[getCurrentProblemId()] && (
                        <Button
                          data-testid="done-btn"
                          onClick={() => handleMarkFinal()}
                          disabled={submitting}
                          size="sm"
                          variant="outline"
                          className="border-green-600 text-green-400 hover:bg-green-500/10"
                        >
                          Done
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* TurtleBlocklyEditor takes remaining space */}
                  <div className="flex-1 min-h-0 p-0">
                    <TurtleBlocklyEditor
                      key={`block-editor-${currentProblemIndex}-${assignment.problems[currentProblemIndex]?.id || 'new'}`}
                      ref={turtleBlocksRef}
                      initialXml={
                        // Priority: 1. Saved XML from localStorage, 2. Starter blocks from problem
                        savedXmlPerProblem[getCurrentProblemId()] || 
                        assignment.problems[currentProblemIndex]?.starter_blocks_xml || 
                        ""
                      }
                      onCodeChange={(newCode) => {
                        setCode(newCode);
                        setHasRunPerProblem(prev => ({
                          ...prev,
                          [getCurrentProblemId()]: false
                        }));
                      }}
                      onXmlChange={(newXml) => {
                        // Auto-save XML to localStorage when blocks change
                        const problemId = getCurrentProblemId();
                        setSavedXmlPerProblem(prev => {
                          const newState = {
                            ...prev,
                            [problemId]: newXml
                          };
                          // Save to localStorage for persistence
                          localStorage.setItem(`saved_xml_${effectiveAssignmentId}`, JSON.stringify(newState));
                          return newState;
                        });
                      }}
                      onRun={() => {
                        console.log("onRun callback received in AssignmentPage");
                        console.log("Setting hasRun for problem:", getCurrentProblemId());
                        setHasRunPerProblem(prev => {
                          const newState = {
                            ...prev,
                            [getCurrentProblemId()]: true
                          };
                          console.log("New hasRunPerProblem state:", newState);
                          return newState;
                        });
                      }}
                      readOnly={problemsFinal[getCurrentProblemId()]}
                      showPreview={true}
                      showCodeToggle={true}
                      editableCode={/chapter\s*5/i.test(assignment.problems?.[currentProblemIndex]?.chapter || '')}
                      height="100%"
                    />
                  </div>
                </div>
              ) : (
              /* Non-block assignments - use the original two-panel layout */
              <PanelGroup direction="horizontal" style={{ height: '100%' }}>
                {/* Code Editor - Left - Give more space to blocks */}
                <Panel defaultSize={55} minSize={40}>
                <div className="h-full overflow-y-auto">
                <Card data-testid="code-editor-card">
                  <CardHeader>
                    <CardTitle className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span>Code Editor</span>
                        <div className="flex items-center gap-3">
                          {/* Dark Mode Toggle */}
                          <Button
                            onClick={() => {
                              const newMode = !darkMode;
                              setDarkMode(newMode);
                              localStorage.setItem('editorDarkMode', newMode);
                            }}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            {darkMode ? '☀️ Light' : '🌙 Dark'}
                          </Button>
                          
                          {/* Show current best score for this problem */}
                          {(() => {
                            const currentProblemId = getCurrentProblemId();
                            const bestScore = problemStatuses[currentProblemId];
                            const isFinal = problemsFinal[currentProblemId];
                            
                            if (isFinal) {
                              return (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-blue-600 font-semibold">✔ Submitted as Done ({bestScore?.toFixed(0) || 0}%)</span>
                                </div>
                              );
                            }
                            
                            if (bestScore !== null && bestScore !== undefined) {
                              return (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-slate-400">Best Score:</span>
                                  <span className={`font-semibold ${bestScore >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
                                    {bestScore.toFixed(0)}%
                                  </span>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="text-sm text-slate-500">
                                <span>Unlimited attempts</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          data-testid="student-clear-code-btn"
                          onClick={() => {
                            const cp = assignment?.problems?.[currentProblemIndex];
                            resetCodeWithConfirm({ starterCode: cp?.starter_code || "", setCode, currentCode: code });
                          }}
                          disabled={running || submitting || problemsFinal[getCurrentProblemId()]}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          title="Clear code / reset to starter"
                        >
                          <Trash2 className="w-4 h-4" />
                          Clear
                        </Button>
                        <Button 
                          data-testid="run-code-btn" 
                          onClick={() => handleRunCode()} 
                          disabled={running}
                          variant="outline" 
                          size="sm"
                          className="gap-2 flex-1"
                        >
                          <Play className="w-4 h-4" />
                          {running ? "Running..." : "Run"}
                        </Button>
                        <Button 
                          data-testid="submit-code-btn" 
                          onClick={handleSubmit} 
                          disabled={submitting || !hasRun || problemsFinal[getCurrentProblemId()]}
                          className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold gap-2 flex-1"
                          size="sm"
                        >
                          <Send className="w-4 h-4" />
                          {submitting ? "Submitting..." : problemsFinal[getCurrentProblemId()] ? "Done" : !hasRun ? "Run First" : "Submit"}
                        </Button>
                      </div>
                      {!hasRun && !problemsFinal[getCurrentProblemId()] && (
                        <p className="text-xs text-amber-600">⚠️ You must run your code before submitting</p>
                      )}

                      {/* Hint and Mark as Done Buttons Row */}
                      {user.role === "student" && !problemsFinal[getCurrentProblemId()] && submissions.filter(s => s.problem_id === getCurrentProblemId()).length > 0 && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          {/* Hint Buttons */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleRequestHint(1)}
                              disabled={loadingHint || hintStatus.hint1_used || hintStatus.hints_remaining === 0}
                              variant="outline"
                              className="flex-1 border-yellow-400 text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-50"
                              size="sm"
                            >
                              <Lightbulb className="w-4 h-4 mr-1" />
                              {hintStatus.hint1_used ? "Hint 1 Used" : "Hint 1 (50🪙)"}
                            </Button>
                            <Button
                              onClick={() => handleRequestHint(2)}
                              disabled={loadingHint || !hintStatus.hint1_used || hintStatus.hint2_used || hintStatus.hints_remaining === 0}
                              variant="outline"
                              className="flex-1 border-orange-400 text-orange-400 hover:bg-orange-500/10 disabled:opacity-50"
                              size="sm"
                            >
                              <Lightbulb className="w-4 h-4 mr-1" />
                              {hintStatus.hint2_used ? "Hint 2 Used" : "Hint 2 (100🪙)"}
                            </Button>
                            <Button
                              onClick={handleMarkFinal}
                              disabled={markingFinal}
                              variant="outline"
                              className="flex-1 border-green-500 text-green-400 hover:bg-green-500/10"
                              size="sm"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {markingFinal ? "..." : "Submit as Done"}
                            </Button>
                          </div>
                          <div className="text-xs text-center space-y-1 mt-2">
                            <p className="text-orange-600 font-medium">
                              ⚠️ Click &quot;Submit as Done&quot; only when you&apos;re finished!
                            </p>
                            <p className="text-slate-400">
                              💡 {hintStatus.hints_remaining}/2 hints remaining for this assignment
                            </p>
                            <p className="text-slate-500">
                              💰 Try reading the feedback first to save coins!
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {problemsFinal[getCurrentProblemId()] && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                            <div className="flex items-center justify-center gap-2 text-green-400 font-semibold mb-2">
                              <CheckCircle className="w-5 h-5" />
                              This problem is marked as done!
                            </div>
                            <p className="text-sm text-green-600 text-center mb-3">
                              You&apos;re viewing your final submitted code. You can reference it anytime, but cannot submit changes.
                            </p>
                            <div className="flex justify-center">
                              <Button
                                onClick={() => setShowProctorDialog(true)}
                                variant="outline"
                                size="sm"
                                className="border-orange-400 text-orange-400 hover:bg-orange-500/10"
                              >
                                🔓 Accidentally clicked Done? Unlock with Proctor Code
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Problem Navigation Buttons */}
                      {assignment.problems && assignment.problems.length > 1 && (
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          <Button
                            onClick={() => setCurrentProblemIndex(Math.max(0, currentProblemIndex - 1))}
                            disabled={currentProblemIndex === 0}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            ← Previous
                          </Button>
                          <Button
                            onClick={() => setCurrentProblemIndex(Math.min(assignment.problems.length - 1, currentProblemIndex + 1))}
                            disabled={currentProblemIndex === assignment.problems.length - 1}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Next →
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Regular Code Editor - Block assignments are handled above */}
                    <Editor
                      height="600px"
                      defaultLanguage="python"
                      value={code}
                      onChange={(value) => !problemsFinal[getCurrentProblemId()] && setCode(value || "")}
                      theme={darkMode ? "vs-dark" : "vs-light"}
                      onMount={(editor) => {
                        codeEditorRef.current = editor;
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: "on",
                        wrappingIndent: "indent",
                        readOnly: problemsFinal[getCurrentProblemId()],
                      }}
                    />
                  </CardContent>
                </Card>
                </div>
              </Panel>

              {/* Resize Handle */}
              <PanelResizeHandle className="w-1.5 bg-slate-800 hover:bg-cyber-cyan/100 transition-colors cursor-col-resize mx-1" />

              {/* Output - Right - Compact for more coding space */}
              <Panel defaultSize={45} minSize={25}>
                <Card data-testid="output-card" className="h-full flex flex-col">
                  <CardHeader className="pb-1 pt-2 flex-shrink-0 px-3">
                    <CardTitle className="text-base">
                      {assignment.problems?.[currentProblemIndex]?.assignment_type === "turtle" 
                        ? "🐢 Your Turtle Output" 
                        : assignment.problems?.[currentProblemIndex]?.assignment_type === "microbit"
                          ? "⚡ Virtual Micro:bit"
                          : "Output"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto min-h-0 p-2">
                    {/* Block assignments have their own layout above - this is for other types */}
                    {assignment.problems?.[currentProblemIndex]?.assignment_type === "microbit" ? (
                      <div className="h-full flex flex-col gap-3">
                        {/* Micro:bit Simulator */}
                        <MicrobitSimulator 
                          code={code} 
                          onButtonPress={(button) => {
                            toast.info(`Button ${button} pressed!`);
                          }}
                        />
                        
                        {/* Console output below simulator */}
                        {output && (
                          <div className="mt-2">
                            <div className="text-sm font-semibold text-slate-300 mb-1">Console Output:</div>
                            <pre className="p-3 bg-gray-900 text-green-400 rounded-lg font-mono text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {output}
                            </pre>
                          </div>
                        )}
                        
                        {/* Helpful note */}
                        <div className="p-3 bg-cyan-500/10 border border-cyan-200 rounded-lg text-xs text-cyan-800">
                          <strong>💡 Note:</strong> This is a visual simulator for testing display commands. 
                          For full functionality (sensors, pins), flash your code to a real Micro:bit!
                        </div>
                      </div>
                    ) : assignment.problems?.[currentProblemIndex]?.assignment_type === "turtle" ? (
                      <div className="h-full flex flex-col gap-3">
                        {/* Check if this problem has maze/background settings */}
                        {(() => {
                          const currentProblem = assignment.problems?.[currentProblemIndex];
                          const hasMaze = currentProblem?.background_type && currentProblem.background_type !== "none";
                          
                          if (hasMaze || useLiveTurtle) {
                            return (
                              <div className="flex flex-col gap-3">
                                {/* Live Turtle Canvas with Maze */}
                                <div className="bg-cyber-navy/60 rounded-lg shadow p-2">
                                  <AnimatedTurtle
                                    code={code}
                                    width={600}
                                    height={600}
                                    backgroundType={currentProblem?.background_type || "none"}
                                    backgroundColor={currentProblem?.background_color || "#ffffff"}
                                    backgroundImage={currentProblem?.background_image}
                                    mazeData={currentProblem?.maze_data}
                                    goals={currentProblem?.goals || []}
                                    checkpoints={currentProblem?.checkpoints || []}
                                    collisionEnabled={currentProblem?.collision_enabled || false}
                                    challengeMode={currentProblem?.challenge_mode || false}
                                    onLineHighlight={(lineNum) => setHighlightedLine(lineNum)}
                                    onGoalReached={(index, goal) => {
                                      toast.success(`🎯 Goal ${index + 1} reached!`);
                                    }}
                                    onCollision={() => {
                                      toast.error("💥 Wall collision!");
                                    }}
                                    onComplete={async (stats) => {
                                      // If challenge mode, submit the attempt
                                      if (currentProblem?.challenge_mode) {
                                        const completionTime = mazeStartTime 
                                          ? (Date.now() - mazeStartTime) / 1000 
                                          : stats.pathLength / 100; // Estimate if no start time
                                        
                                        try {
                                          await axios.post(`${API}/maze/attempt`, {
                                            problem_id: currentProblem.id,
                                            completed: true,
                                            completion_time: completionTime,
                                            code_lines: code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length,
                                            path_length: stats.pathLength,
                                            goals_reached: stats.goalsReached,
                                            total_goals: stats.totalGoals,
                                            collisions: stats.collisions,
                                            code: code
                                          }, { withCredentials: true });
                                          
                                          toast.success(`🏆 Challenge completed! Time: ${completionTime.toFixed(1)}s`);
                                        } catch (err) {
                                          console.error("Failed to submit maze attempt:", err);
                                        }
                                      } else {
                                        toast.success(`✅ All goals reached! Distance: ${stats.pathLength.toFixed(0)}px`);
                                      }
                                    }}
                                  />
                                </div>
                                
                                {/* Challenge Mode Extras */}
                                {currentProblem?.challenge_mode && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setMazeStartTime(Date.now());
                                        toast.info("⏱️ Timer started! Navigate to all goals.");
                                      }}
                                    >
                                      ⏱️ Start Timer
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setShowLeaderboard(true)}
                                    >
                                      🏆 Leaderboard
                                    </Button>
                                  </div>
                                )}
                                
                                {/* Toggle for static vs live preview */}
                                {!hasMaze && (
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <input
                                      type="checkbox"
                                      id="useLiveTurtle"
                                      checked={useLiveTurtle}
                                      onChange={(e) => setUseLiveTurtle(e.target.checked)}
                                      className="rounded"
                                    />
                                    <label htmlFor="useLiveTurtle">Use live animated preview</label>
                                  </div>
                                )}
                              </div>
                            );
                          } else {
                            // Fallback to static image for non-maze problems
                            return turtleImage ? (
                              <div className="flex justify-center items-center bg-cyber-navy/60 p-4 rounded border-2 border-cyber-cyan/10">
                                <img 
                                  src={`data:image/png;base64,${turtleImage}`}
                                  alt="Turtle output"
                                  className="max-w-full h-auto"
                                  style={{ maxHeight: "500px" }}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-64 bg-cyber-navy/40 rounded border-2 border-dashed border-cyber-cyan/15 text-slate-500">
                                <div className="text-center">
                                  <div className="text-4xl mb-2">🐢</div>
                                  <div>Run your turtle code to see the output here...</div>
                                </div>
                              </div>
                            );
                          }
                        })()}
                        {output && (
                          <div className="mt-2">
                            <div className="text-sm font-semibold text-slate-300 mb-1">Console Output:</div>
                            <pre className="p-3 bg-gray-900 text-green-400 rounded-lg font-mono text-xs whitespace-pre-wrap">
                              {output}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <pre className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm whitespace-pre-wrap h-full">
                        {output || "Run your code to see output here..."}
                      </pre>
                    )}
                  </CardContent>
                </Card>
              </Panel>
              </PanelGroup>
              )
            ) : (
              // Teacher Demo/Sandbox Mode - Interactive coding without submissions
              assignment.problems?.[currentProblemIndex]?.assignment_type === "block" ? (
                /* Block-Based Teacher Mode - Same editor as students */
                <div className="h-full flex flex-col pr-0" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                  {/* Compact header */}
                  <div className="flex items-center justify-between bg-cyber-navy/60 border-b px-3 py-2 flex-shrink-0">
                    <span className="font-semibold text-slate-300 font-orbitron text-sm uppercase tracking-wider">Block Coding</span>
                  </div>

                  {/* TurtleBlocklyEditor with inline AnimatedTurtle */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <TurtleBlocklyEditor
                      key={`teacher-block-editor-${currentProblemIndex}-${assignment.problems[currentProblemIndex]?.id || 'new'}`}
                      ref={turtleBlocksRef}
                      onCodeChange={(pythonCode, xml) => {
                        setCode(pythonCode);
                        setBlockCode(pythonCode);
                        if (xml) {
                          setBlockXml(xml);
                          const currentProblemId = getCurrentProblemId();
                          const newState = { ...savedXmlPerProblem, [currentProblemId]: xml };
                          setSavedXmlPerProblem(newState);
                          localStorage.setItem(`saved_xml_${effectiveAssignmentId}`, JSON.stringify(newState));
                        }
                      }}
                      initialXml={savedXmlPerProblem[getCurrentProblemId()] || ""}
                      showMonacoEditor={false}
                    />
                  </div>
                </div>
              ) : (
              <PanelGroup direction="horizontal" style={{ height: '100%' }}>
                {/* Code Editor - Left */}
                <Panel defaultSize={50} minSize={30}>
                <div className="h-full overflow-y-auto">
                <Card data-testid="teacher-sandbox-card">
                  <CardHeader>
                    <CardTitle className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span>Live Demo / Sandbox</span>
                        <div className="flex items-center gap-3">
                          {/* Dark Mode Toggle */}
                          <Button
                            onClick={() => {
                              const newMode = !darkMode;
                              setDarkMode(newMode);
                              localStorage.setItem(`darkMode_${effectiveAssignmentId}`, newMode);
                            }}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            {darkMode ? '☀️ Light' : '🌙 Dark'}
                          </Button>
                          
                          <span className="text-sm text-green-600 font-semibold">
                            🎓 Teacher Mode
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          data-testid="clear-code-btn"
                          onClick={() => {
                            const cp = assignment?.problems?.[currentProblemIndex];
                            resetCodeWithConfirm({ starterCode: cp?.starter_code || "", setCode, currentCode: code });
                          }}
                          disabled={running || problemsFinal[getCurrentProblemId()]}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          title="Clear code / reset to starter"
                        >
                          <Trash2 className="w-4 h-4" />
                          Clear
                        </Button>
                        <Button 
                          data-testid="teacher-run-code-btn" 
                          onClick={() => handleRunCode()} 
                          disabled={running}
                          variant="outline" 
                          size="sm"
                          className="gap-2 flex-1"
                        >
                          <Play className="w-4 h-4" />
                          {running ? "Running..." : "Run Code"}
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Editor
                      height="600px"
                      defaultLanguage="python"
                      value={code}
                      onChange={(value) => !problemsFinal[getCurrentProblemId()] && setCode(value || "")}
                      theme={darkMode ? "vs-dark" : "light"}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: "on",
                        wrappingIndent: "indent",
                        readOnly: problemsFinal[getCurrentProblemId()],
                      }}
                    />
                  </CardContent>
                </Card>
                </div>
                </Panel>

                <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-cyber-cyan/100 transition-colors cursor-col-resize mx-2" />

                {/* Output - Right - Full Space */}
                <Panel defaultSize={50} minSize={30}>
                  <Card className="h-full flex flex-col">
                    <CardHeader className="pb-2 pt-3 flex-shrink-0">
                      <CardTitle className="flex justify-between items-center">
                        <span>
                          {assignment.problems?.[currentProblemIndex]?.assignment_type === "turtle" 
                            ? "🐢 Turtle Output" 
                            : assignment.problems?.[currentProblemIndex]?.assignment_type === "microbit"
                              ? "⚡ Virtual Micro:bit"
                              : "Output"}
                        </span>
                        <span className="text-xs text-slate-500 font-normal">Demo mode - not graded</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {assignment.problems?.[currentProblemIndex]?.assignment_type === "turtle" 
                          ? "Your turtle graphics will appear here" 
                          : assignment.problems?.[currentProblemIndex]?.assignment_type === "microbit"
                            ? "Test your code on the virtual Micro:bit simulator"
                            : "Code with input() will show interactive dialog automatically"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto min-h-0 p-4">
                      {assignment.problems?.[currentProblemIndex]?.assignment_type === "microbit" ? (
                        <div className="h-full flex flex-col gap-3">
                          {/* Micro:bit Simulator for Teacher Demo Mode */}
                          <MicrobitSimulator 
                            code={code} 
                            onButtonPress={(button) => {
                              toast.info(`Button ${button} pressed!`);
                            }}
                          />
                          
                          {/* Console output below simulator */}
                          {output && (
                            <div className="mt-2">
                              <div className="text-sm font-semibold text-slate-300 mb-1">Console Output:</div>
                              <pre className={`p-3 ${darkMode ? 'bg-gray-900 text-green-400' : 'bg-cyber-navy/30 text-white'} rounded-lg font-mono text-xs whitespace-pre-wrap max-h-32 overflow-y-auto`}>
                                {output}
                              </pre>
                            </div>
                          )}
                          
                          {/* Helpful note */}
                          <div className="p-3 bg-cyan-500/10 border border-cyan-200 rounded-lg text-xs text-cyan-800">
                            <strong>💡 Note:</strong> This is a visual simulator for testing display commands. 
                            For full functionality (sensors, pins), flash your code to a real Micro:bit!
                          </div>
                        </div>
                      ) : assignment.problems?.[currentProblemIndex]?.assignment_type === "turtle" ? (
                        <div className="h-full flex flex-col gap-3">
                          {/* Live turtle canvas — teacher demo mode. Same component
                              students use, so Play / Step / Reset / speed all work
                              here and let the teacher walk the class through the
                              code one command at a time. */}
                          <div className="bg-cyber-navy/60 rounded-lg shadow p-2">
                            <AnimatedTurtle
                              code={code}
                              width={600}
                              height={600}
                              backgroundColor={assignment.problems?.[currentProblemIndex]?.background_color || "#ffffff"}
                              onLineHighlight={(lineNum) => setHighlightedLine(lineNum)}
                            />
                          </div>
                          {output && (
                            <div className="mt-2">
                              <div className="text-sm font-semibold text-slate-300 mb-1">Console Output:</div>
                              <pre className={`p-3 ${darkMode ? 'bg-gray-900 text-green-400' : 'bg-cyber-navy/30 text-white'} rounded-lg font-mono text-xs whitespace-pre-wrap`}>
                                {output}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <pre className={`p-4 ${darkMode ? 'bg-gray-900 text-green-400' : 'bg-cyber-navy/30 text-white'} rounded-lg font-mono text-sm whitespace-pre-wrap h-full`}>
                          {output || "Run your code to see output here..."}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                </Panel>
              </PanelGroup>
              )
            )}

            {isTeacher && submissions.length > 0 && (
              <Card data-testid="teacher-submissions-card">
              <CardHeader>
                <CardTitle>Student Submissions</CardTitle>
                <CardDescription>{submissions.length} submission(s)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-auto">
                  {submissions.map((sub, index) => {
                    const isTurtleSubmission = sub.turtle_image && sub.turtle_image.length > 0;
                    return (
                      <div key={sub.id} data-testid={`submission-${index}`} className="p-3 bg-cyber-navy/40 rounded-lg border border-cyber-cyan/10">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-sm">{sub.student_name}</div>
                          <div className="text-sm font-bold text-cyber-cyan">{sub.score.toFixed(1)}%</div>
                        </div>
                        <div className="text-xs text-slate-400 mb-2">{sub.feedback}</div>
                        
                        {/* Show turtle image if this is a turtle submission */}
                        {isTurtleSubmission && (
                          <div className="mt-3">
                            <div className="text-xs font-semibold text-slate-300 mb-1">Student&apos;s Turtle Graphics:</div>
                            <div className="flex justify-center bg-cyber-navy/60 p-2 rounded border">
                              <img 
                                src={`data:image/png;base64,${sub.turtle_image}`}
                                alt="Student turtle output"
                                className="max-w-full h-auto"
                                style={{ maxHeight: "200px" }}
                              />
                            </div>
                            {sub.turtle_tracking_data && (
                              <div className="mt-2 text-xs text-slate-400 bg-cyber-navy/60 p-2 rounded">
                                <div className="font-semibold mb-1">📊 Tracking Data:</div>
                                <div className="grid grid-cols-2 gap-1">
                                  <span>Lines: {sub.turtle_tracking_data.lines_drawn}</span>
                                  <span>Circles: {sub.turtle_tracking_data.circles_drawn}</span>
                                  <span>Distance: {sub.turtle_tracking_data.total_distance?.toFixed(0)}</span>
                                  <span>Colors: {sub.turtle_tracking_data.colors_used?.join(", ")}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          </div>
          </Panel>
        </PanelGroup>
        </div>
      </main>

      {/* Teacher Panel - Only show for teachers */}
      {isTeacher && assignment?.problems && (
        <TeacherPanel
          assignmentId={assignmentId}
          classroomId={classroomIdFromNav}
          currentProblemIndex={currentProblemIndex}
          problems={assignment.problems}
        />
      )}

      {/* Hint Dialog */}
      <Dialog open={showHintDialog} onOpenChange={setShowHintDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Hint {currentHint?.level} - {currentHint?.coins_spent} Coins Spent
            </DialogTitle>
            <DialogDescription>
              Here&apos;s a hint to help you solve this problem. Remember to read the feedback too!
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 my-4">
            <p className="text-slate-200 whitespace-pre-wrap">{currentHint?.text}</p>
          </div>
          <div className="flex justify-between items-center text-sm text-slate-400">
            <span>💡 {hintStatus.hints_remaining} hints remaining for this assignment</span>
            <Button onClick={() => setShowHintDialog(false)} size="sm">
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Interactive Input Dialog */}
      <InteractiveInputCollector
        isOpen={showInteractiveDialog}
        onClose={() => setShowInteractiveDialog(false)}
        onSubmitInputs={handleInteractiveInputSubmit}
        codePreview={code}
      />

      {/* Lesson Modal */}
      <LessonModal
        isOpen={showLessonDialog}
        onClose={() => setShowLessonDialog(false)}
        lesson={lesson}
      />
      
      {/* Proctor Code Dialog for Unlocking Done Problems */}
      <Dialog open={showProctorDialog} onOpenChange={setShowProctorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔓 Unlock Problem</DialogTitle>
            <DialogDescription>
              Enter the proctor code to unlock this problem and submit again
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="proctorCode">Proctor Code</Label>
              <Input
                id="proctorCode"
                type="text"
                placeholder="Enter 6-digit code"
                value={proctorCode}
                onChange={(e) => setProctorCode(e.target.value)}
                className="mt-2"
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUnlockProblem}
                disabled={unlockingProblem || !proctorCode.trim()}
                className="flex-1"
              >
                {unlockingProblem ? "Verifying..." : "Unlock Problem"}
              </Button>
              <Button
                onClick={() => {
                  setShowProctorDialog(false);
                  setProctorCode("");
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Skill Quiz Popup - triggered after completing all problems */}
      <SkillQuizPopup
        isOpen={showSkillQuiz}
        onClose={() => setShowSkillQuiz(false)}
        skillCategory={quizSkillCategory}
        assignmentId={assignmentId}
        classroomId={classroomIdFromNav || ""}
        onQuizComplete={(results) => {
          toast.success(`Quiz completed! Score: ${results.score?.toFixed(0)}%`);
        }}
      />
      
      {/* Maze Leaderboard Dialog */}
      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🏆 Maze Challenge Leaderboard
            </DialogTitle>
            <DialogDescription>
              See who completed this maze fastest and most efficiently
            </DialogDescription>
          </DialogHeader>
          <MazeLeaderboard 
            problemId={getCurrentProblemId()} 
            classroomId={classroomIdFromNav}
            currentUserId={user?.id}
            compact={true}
          />
        </DialogContent>
      </Dialog>
      
      {/* Lesson Materials Popup - Shows for problems with instructional content */}
      <LessonPopup
        open={showLessonPopup}
        onClose={handleLessonAcknowledged}
        lessonTitle={assignment?.problems?.[currentProblemIndex]?.title || "Before You Begin..."}
        materials={assignment?.problems?.[currentProblemIndex]?.lesson_materials || []}
      />
    </div>
  );
}
