import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Terminal, ChevronLeft, ChevronRight, Play, RotateCcw,
  CheckCircle, Eye, Code, BookOpen, ArrowRight, ArrowLeft,
  Users, User, Zap
} from "lucide-react";
import { toast } from "sonner";

// Format markdown-like content into styled HTML
const formatLessonContent = (content) => {
  const escapeHtml = (text) => text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let result = content;
  // Fenced code blocks
  result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-[#0A0E17] p-4 rounded border border-[#00F0FF]/20 overflow-x-auto my-4"><code class="text-[#39FF14] font-mono text-sm whitespace-pre-wrap">${escapeHtml(code.trim())}</code></pre>`;
  });
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
  return `<p class="mb-3 text-slate-300 leading-relaxed text-sm">${result}</p>`;
};

// Demo lesson data
const DEMO_LESSON = {
  title: "Lesson 5: Button Counter",
  unit: "Unit 2: Buttons & Input",
  chapter: "Chapter 2",
  instructions: `# Button Counter

## What You'll Learn
In this lesson, you'll learn how to use the **micro:bit buttons** to create an interactive counter program.

### Key Concepts
- Using \`button_a.was_pressed()\` to detect button presses
- **Variables** to store and update values
- The \`while True:\` loop for continuous checking
- Displaying numbers with \`display.show()\`

## How Buttons Work
The micro:bit has two buttons: **A** (left) and **B** (right). You can check if a button was pressed using:

\`\`\`python
if button_a.was_pressed():
    # do something when A is pressed
\`\`\`

## Your Task
Create a program that:
- Starts a counter at **0**
- When **Button A** is pressed, the counter goes **up by 1**
- The current count is shown on the LED display

### Starter Code
Look at the code on the right. Try pressing **Run** to test it in the simulator, then modify it!`,

  starter_code: `from microbit import *

count = 0

while True:
    if button_a.was_pressed():
        count = count + 1
        display.show(count)`,

  problems: [
    {
      id: "cp1",
      phase: "class_practice",
      title: "Count Up with Button A",
      description: "Follow along with the teacher. Make button A count up from 0.",
      starter_code: `from microbit import *

# Create a variable to store the count
count = 0

while True:
    if button_a.was_pressed():
        count = count + 1
        display.show(count)`,
    },
    {
      id: "cp2",
      phase: "class_practice",
      title: "Count Down with Button B",
      description: "Add button B to count down. Don't let it go below 0!",
      starter_code: `from microbit import *

count = 0

while True:
    if button_a.was_pressed():
        count = count + 1
        display.show(count)
    if button_b.was_pressed():
        # Your code here: decrease count
        # Make sure count doesn't go below 0
        pass`,
    },
    {
      id: "pp1",
      phase: "paired",
      title: "Two-Player Score Tracker",
      description: "Work with a partner! Player 1 uses Button A, Player 2 uses Button B. Track both scores.",
      starter_code: `from microbit import *

score_a = 0
score_b = 0

# Your code here:
# - Button A adds to score_a
# - Button B adds to score_b
# - Display the scores`,
    },
    {
      id: "ind1",
      phase: "independent",
      title: "Click Speed Game",
      description: "Create a game: count how many times Button A is pressed in 5 seconds, then show the score.",
      starter_code: `from microbit import *
import time

# Your code here:
# 1. Show "GO!" on the display
# 2. Count button A presses for 5 seconds
# 3. Show the final score`,
    },
    {
      id: "ind2",
      phase: "independent",
      title: "Reset Counter with A+B",
      description: "Build a counter that goes up with A, down with B, and resets to 0 when both A+B are pressed.",
      starter_code: `from microbit import *

count = 0
display.show(count)

# Your code here`,
    },
  ]
};

const PHASE_CONFIG = {
  class_practice: { label: "Class Practice", icon: BookOpen, color: "cyber-cyan", desc: "Teacher-led demonstration" },
  paired: { label: "Paired Programming", icon: Users, color: "cyber-pink", desc: "Work with a partner" },
  independent: { label: "Independent", icon: User, color: "cyber-lime", desc: "Work on your own" },
};

export default function LessonPageTemplate() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState("lesson"); // "lesson" | "problems"
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [code, setCode] = useState(DEMO_LESSON.starter_code);
  const [previewTab, setPreviewTab] = useState("code"); // "code" | "preview"
  const [output, setOutput] = useState("");

  const lesson = DEMO_LESSON;
  const problems = lesson.problems;
  const currentProblem = problems[currentProblemIndex];

  const handleRun = () => {
    setOutput(`> Running code...\n> Program started.\n> (Simulator output would appear here)`);
    setPreviewTab("preview");
    toast.success("Code executed!");
  };

  const handleReset = () => {
    if (currentView === "lesson") {
      setCode(lesson.starter_code);
    } else {
      setCode(currentProblem.starter_code);
    }
    setOutput("");
    toast.info("Code reset");
  };

  const handleNextProblem = () => {
    if (currentProblemIndex < problems.length - 1) {
      const nextIdx = currentProblemIndex + 1;
      setCurrentProblemIndex(nextIdx);
      setCode(problems[nextIdx].starter_code);
      setOutput("");
      setPreviewTab("code");
    }
  };

  const handlePrevProblem = () => {
    if (currentProblemIndex > 0) {
      const prevIdx = currentProblemIndex - 1;
      setCurrentProblemIndex(prevIdx);
      setCode(problems[prevIdx].starter_code);
      setOutput("");
      setPreviewTab("code");
    }
  };

  const handleStartProblems = () => {
    setCurrentView("problems");
    setCurrentProblemIndex(0);
    setCode(problems[0].starter_code);
    setOutput("");
    setPreviewTab("code");
  };

  const handleBackToLesson = () => {
    setCurrentView("lesson");
    setCode(lesson.starter_code);
    setOutput("");
    setPreviewTab("code");
  };

  // Get current phase info
  const currentPhase = currentView === "problems" ? PHASE_CONFIG[currentProblem.phase] : null;

  return (
    <div data-testid="lesson-page" className="h-screen flex flex-col bg-cyber-black">
      {/* Top Nav Bar */}
      <nav className="flex items-center justify-between px-4 py-2 bg-cyber-navy/90 backdrop-blur-xl border-b border-cyber-cyan/20 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            data-testid="lesson-back-btn"
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-cyber-cyan rounded-none font-chakra gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-cyber-cyan/20" />
          <div>
            <span className="text-xs font-orbitron text-cyber-cyan/60 uppercase tracking-widest">{lesson.unit}</span>
            <h1 className="text-sm font-orbitron text-white uppercase tracking-wider">{lesson.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex border border-cyber-cyan/20 rounded-none overflow-hidden">
            <button
              data-testid="view-lesson-btn"
              onClick={handleBackToLesson}
              className={`px-3 py-1.5 text-xs font-orbitron uppercase tracking-wider transition-colors ${
                currentView === "lesson"
                  ? "bg-cyber-cyan/20 text-cyber-cyan"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 inline mr-1.5" />
              Lesson
            </button>
            <button
              data-testid="view-problems-btn"
              onClick={handleStartProblems}
              className={`px-3 py-1.5 text-xs font-orbitron uppercase tracking-wider transition-colors ${
                currentView === "problems"
                  ? "bg-cyber-pink/20 text-cyber-pink"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Code className="w-3.5 h-3.5 inline mr-1.5" />
              Problems ({problems.length})
            </button>
          </div>

          {/* Problem Navigation (when in problems view) */}
          {currentView === "problems" && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePrevProblem}
                disabled={currentProblemIndex === 0}
                className="text-slate-400 hover:text-white rounded-none h-7 w-7 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-fira text-slate-400">
                {currentProblemIndex + 1}/{problems.length}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNextProblem}
                disabled={currentProblemIndex === problems.length - 1}
                className="text-slate-400 hover:text-white rounded-none h-7 w-7 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Phase Banner (when in problems view) */}
      {currentView === "problems" && currentPhase && (
        <div className={`flex items-center justify-between px-4 py-1.5 border-b shrink-0 ${
          currentProblem.phase === "class_practice" ? "bg-cyber-cyan/5 border-cyber-cyan/20" :
          currentProblem.phase === "paired" ? "bg-cyber-pink/5 border-cyber-pink/20" :
          "bg-cyber-lime/5 border-cyber-lime/20"
        }`}>
          <div className="flex items-center gap-2">
            <currentPhase.icon className={`w-4 h-4 text-${currentPhase.color}`} />
            <span className={`text-xs font-orbitron uppercase tracking-widest text-${currentPhase.color}`}>
              {currentPhase.label}
            </span>
            <span className="text-xs text-slate-500 font-chakra ml-2">{currentPhase.desc}</span>
          </div>
          {/* Problem dots */}
          <div className="flex items-center gap-1.5">
            {problems.map((p, i) => {
              const pc = PHASE_CONFIG[p.phase];
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setCurrentProblemIndex(i);
                    setCode(problems[i].starter_code);
                    setOutput("");
                  }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === currentProblemIndex
                      ? `bg-${pc.color} shadow-[0_0_8px] shadow-${pc.color}/50`
                      : `bg-slate-700 hover:bg-slate-600`
                  }`}
                  title={`${pc.label}: ${p.title}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Instructions / Problem Description */}
        <div className="w-[38%] border-r border-cyber-cyan/20 flex flex-col bg-cyber-navy/30">
          {/* Panel Header */}
          <div className="px-4 py-2.5 border-b border-cyber-cyan/10 flex items-center gap-2 shrink-0">
            <BookOpen className="w-4 h-4 text-cyber-cyan" />
            <span className="text-xs font-orbitron text-cyber-cyan uppercase tracking-widest">
              {currentView === "lesson" ? "Instructions" : currentProblem.title}
            </span>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            <div className="p-5">
              {currentView === "lesson" ? (
                <div
                  className="font-chakra leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatLessonContent(lesson.instructions) }}
                />
              ) : (
                <div className="space-y-4">
                  <div className="font-chakra text-slate-300 leading-relaxed">
                    {currentProblem.description}
                  </div>
                  {currentProblem.phase === "paired" && (
                    <div className="p-3 border border-cyber-pink/30 bg-cyber-pink/5 rounded-none">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-cyber-pink" />
                        <span className="text-xs font-orbitron text-cyber-pink uppercase tracking-wider">Partner Work</span>
                      </div>
                      <p className="text-xs text-slate-400 font-chakra">
                        Work with your partner to solve this problem. Take turns typing and discussing your approach.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* "Start Problems" CTA at bottom of lesson instructions */}
              {currentView === "lesson" && (
                <div className="mt-8 p-4 border border-cyber-cyan/20 bg-cyber-cyan/5">
                  <Button
                    data-testid="start-problems-btn"
                    onClick={handleStartProblems}
                    className="w-full bg-cyber-cyan text-cyber-black font-orbitron text-xs uppercase tracking-widest rounded-none border border-cyber-cyan hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all duration-300 font-bold gap-2 py-5"
                  >
                    Start Problems
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Code Editor + Output */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-cyber-cyan/10 bg-cyber-navy/50 shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyber-lime" />
              <span className="text-xs font-orbitron text-cyber-lime uppercase tracking-widest">Code Editor</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                data-testid="reset-code-btn"
                size="sm"
                variant="ghost"
                onClick={handleReset}
                className="text-slate-400 hover:text-white rounded-none h-7 px-2 text-xs font-chakra gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
              <Button
                data-testid="run-code-btn"
                size="sm"
                onClick={handleRun}
                className="bg-cyber-lime/10 text-cyber-lime border border-cyber-lime/40 hover:bg-cyber-lime/20 hover:shadow-[0_0_10px_rgba(57,255,20,0.3)] rounded-none h-7 px-3 text-xs font-orbitron uppercase tracking-wider gap-1 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                Run
              </Button>
              <Button
                data-testid="submit-code-btn"
                size="sm"
                className="bg-cyber-cyan text-cyber-black border border-cyber-cyan hover:shadow-[0_0_12px_rgba(0,240,255,0.5)] rounded-none h-7 px-3 text-xs font-orbitron uppercase tracking-wider gap-1 font-bold transition-all"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Submit
              </Button>
            </div>
          </div>

          {/* Editor + Preview Split */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Switcher */}
            <div className="flex border-b border-cyber-cyan/10 shrink-0">
              <button
                onClick={() => setPreviewTab("code")}
                className={`px-4 py-1.5 text-xs font-orbitron uppercase tracking-wider transition-colors ${
                  previewTab === "code"
                    ? "text-cyber-lime border-b-2 border-cyber-lime bg-cyber-lime/5"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Code className="w-3.5 h-3.5 inline mr-1.5" />
                Code
              </button>
              <button
                onClick={() => setPreviewTab("preview")}
                className={`px-4 py-1.5 text-xs font-orbitron uppercase tracking-wider transition-colors ${
                  previewTab === "preview"
                    ? "text-cyber-cyan border-b-2 border-cyber-cyan bg-cyber-cyan/5"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Eye className="w-3.5 h-3.5 inline mr-1.5" />
                Output
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
              {previewTab === "code" ? (
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  theme="vs-dark"
                  value={code}
                  onChange={(val) => setCode(val || "")}
                  options={{
                    fontSize: 14,
                    fontFamily: "'Fira Code', monospace",
                    minimap: { enabled: false },
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    padding: { top: 12 },
                    renderLineHighlight: "all",
                    cursorBlinking: "smooth",
                  }}
                />
              ) : (
                <div className="h-full bg-cyber-black p-4 overflow-auto">
                  {output ? (
                    <pre className="font-fira text-sm text-cyber-lime whitespace-pre-wrap">{output}</pre>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <Eye className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="font-chakra text-slate-600 text-sm">
                          Click "Run" to see your output here
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Next Problem button (when in problems view) */}
          {currentView === "problems" && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-cyber-cyan/10 bg-cyber-navy/50 shrink-0">
              <div className="text-xs text-slate-500 font-chakra">
                Problem {currentProblemIndex + 1} of {problems.length}
              </div>
              <div className="flex gap-2">
                {currentProblemIndex < problems.length - 1 ? (
                  <Button
                    data-testid="next-problem-btn"
                    size="sm"
                    onClick={handleNextProblem}
                    className="bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/40 hover:bg-cyber-cyan/20 rounded-none text-xs font-orbitron uppercase tracking-wider gap-1 transition-all"
                  >
                    Next Problem
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    data-testid="lesson-complete-btn"
                    size="sm"
                    className="bg-cyber-lime/10 text-cyber-lime border border-cyber-lime/40 hover:bg-cyber-lime hover:text-cyber-black rounded-none text-xs font-orbitron uppercase tracking-wider gap-1 transition-all"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Complete Lesson
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
