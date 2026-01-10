import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, FastForward } from "lucide-react";

// Simple expression evaluator for variables
function evaluateExpression(expr, variables) {
  // Replace variable names with their values
  let evaluated = expr;
  for (const [name, value] of Object.entries(variables)) {
    evaluated = evaluated.replace(new RegExp(`\\b${name}\\b`, 'g'), value);
  }
  
  // Try to evaluate simple math expressions
  try {
    // Only allow numbers, operators, parentheses, and spaces
    if (/^[\d\s+\-*/().]+$/.test(evaluated)) {
      const fn = new Function(`return ${evaluated}`);
      return fn();
    }
  } catch (e) {
    // Fall through
  }
  
  // Try parsing as number
  const num = parseFloat(evaluated);
  if (!isNaN(num)) return num;
  
  return null;
}

// Parse Python turtle code into commands
function parseCode(code, parentVars = {}) {
  const commands = [];
  const lines = code.split('\n');
  const variables = { ...parentVars };
  
  // Detect turtle variable name (e.g., bob = turtle.Turtle())
  const turtleNameMatch = code.match(/(\w+)\s*=\s*(?:turtle\.)?Turtle\(\)/);
  const turtleName = turtleNameMatch ? turtleNameMatch[1] : 't';
  
  // Create regex pattern that matches the turtle name, 't.', or 'turtle.'
  const turtlePrefix = `(?:${turtleName}\\.|t\\.|turtle\\.)?`;
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const trimmed = line.trim();
    
    // Skip comments, empty lines, imports
    if (trimmed.startsWith('#') || trimmed === '' || trimmed.startsWith('import') || trimmed.startsWith('from')) {
      continue;
    }
    
    // Skip variable assignments that create turtle
    if (trimmed.includes('= turtle.Turtle()') || trimmed.includes('= Turtle()')) {
      continue;
    }
    
    // Parse variable assignments (e.g., sides = 6, angle = 360 / sides)
    let match = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (match && !trimmed.includes('turtle') && !trimmed.includes('Turtle')) {
      const varName = match[1];
      const varExpr = match[2];
      const value = evaluateExpression(varExpr, variables);
      if (value !== null) {
        variables[varName] = value;
      }
      continue;
    }
    
    // Helper to get numeric value (either literal or variable)
    const getNumericValue = (str) => {
      if (!str) return null;
      str = str.trim();
      // Try as number first
      const num = parseFloat(str);
      if (!isNaN(num)) return num;
      // Try as variable or expression
      return evaluateExpression(str, variables);
    };
    
    // Parse color() - changes both pen and turtle color
    match = trimmed.match(new RegExp(`${turtlePrefix}color\\s*\\(\\s*['"](\\w+|#[0-9a-fA-F]{6})['"](\\s*,\\s*['"](\\w+|#[0-9a-fA-F]{6})['"])?\\s*\\)`));
    if (match) {
      const penColor = match[1];
      const fillColor = match[3] || match[1];
      commands.push({ type: 'color', penColor, fillColor, line: lineNum });
      continue;
    }
    
    // Parse forward/fd with variable support
    match = trimmed.match(new RegExp(`${turtlePrefix}(?:forward|fd)\\s*\\(\\s*([^)]+)\\s*\\)`));
    if (match) {
      const value = getNumericValue(match[1]);
      if (value !== null) {
        commands.push({ type: 'forward', value, line: lineNum });
      }
      continue;
    }
    
    // Parse backward/bk/back with variable support
    match = trimmed.match(new RegExp(`${turtlePrefix}(?:backward|bk|back)\\s*\\(\\s*([^)]+)\\s*\\)`));
    if (match) {
      const value = getNumericValue(match[1]);
      if (value !== null) {
        commands.push({ type: 'backward', value, line: lineNum });
      }
      continue;
    }
    
    // Parse right/rt with variable support
    match = trimmed.match(new RegExp(`${turtlePrefix}(?:right|rt)\\s*\\(\\s*([^)]+)\\s*\\)`));
    if (match) {
      const value = getNumericValue(match[1]);
      if (value !== null) {
        commands.push({ type: 'right', value, line: lineNum });
      }
      continue;
    }
    
    // Parse left/lt with variable support
    match = trimmed.match(new RegExp(`${turtlePrefix}(?:left|lt)\\s*\\(\\s*([^)]+)\\s*\\)`));
    if (match) {
      const value = getNumericValue(match[1]);
      if (value !== null) {
        commands.push({ type: 'left', value, line: lineNum });
      }
      continue;
    }
    
    // Parse penup/pu/up
    if (trimmed.match(new RegExp(`${turtlePrefix}(?:penup|pu|up)\\s*\\(\\s*\\)`))) {
      commands.push({ type: 'penup', line: lineNum });
      continue;
    }
    
    // Parse pendown/pd/down
    if (trimmed.match(new RegExp(`${turtlePrefix}(?:pendown|pd|down)\\s*\\(\\s*\\)`))) {
      commands.push({ type: 'pendown', line: lineNum });
      continue;
    }
    
    // Parse pencolor
    match = trimmed.match(new RegExp(`${turtlePrefix}pencolor\\s*\\(\\s*['"](.*?)['"]\s*\\)`));
    if (match) {
      commands.push({ type: 'pencolor', value: match[1], line: lineNum });
      continue;
    }
    
    // Parse fillcolor
    match = trimmed.match(new RegExp(`${turtlePrefix}fillcolor\\s*\\(\\s*['"](.*?)['"]\s*\\)`));
    if (match) {
      commands.push({ type: 'fillcolor', value: match[1], line: lineNum });
      continue;
    }
    
    // Parse begin_fill
    if (trimmed.match(new RegExp(`${turtlePrefix}begin_fill\\s*\\(\\s*\\)`))) {
      commands.push({ type: 'begin_fill', line: lineNum });
      continue;
    }
    
    // Parse end_fill
    if (trimmed.match(new RegExp(`${turtlePrefix}end_fill\\s*\\(\\s*\\)`))) {
      commands.push({ type: 'end_fill', line: lineNum });
      continue;
    }
    
    // Parse pensize/width with variable support
    match = trimmed.match(new RegExp(`${turtlePrefix}(?:pensize|width)\\s*\\(\\s*([^)]+)\\s*\\)`));
    if (match) {
      const value = getNumericValue(match[1]);
      if (value !== null) {
        commands.push({ type: 'pensize', value, line: lineNum });
      }
      continue;
    }
    
    // Parse speed with variable support
    match = trimmed.match(new RegExp(`${turtlePrefix}speed\\s*\\(\\s*([^)]+)\\s*\\)`));
    if (match) {
      const value = getNumericValue(match[1]);
      if (value !== null) {
        commands.push({ type: 'speed', value: Math.floor(value), line: lineNum });
      }
      continue;
    }
    
    // Parse circle with variable support (supports radius and optional extent)
    match = trimmed.match(new RegExp(`${turtlePrefix}circle\\s*\\(\\s*([^,)]+)(?:\\s*,\\s*([^,)]+))?(?:\\s*,\\s*([^)]+))?\\s*\\)`));
    if (match) {
      const radius = getNumericValue(match[1]);
      const extent = match[2] ? getNumericValue(match[2]) : 360; // Default to full circle
      if (radius !== null) {
        commands.push({ type: 'circle', value: radius, extent: extent || 360, line: lineNum });
      }
      continue;
    }
    
    // Parse goto/setpos/setposition with variable support
    match = trimmed.match(new RegExp(`${turtlePrefix}(?:goto|setpos|setposition)\\s*\\(\\s*([^,]+)\\s*,\\s*([^)]+)\\s*\\)`));
    if (match) {
      const x = getNumericValue(match[1]);
      const y = getNumericValue(match[2]);
      if (x !== null && y !== null) {
        commands.push({ type: 'goto', x, y, line: lineNum });
      }
      continue;
    }
    
    // Parse setheading/seth with variable support
    match = trimmed.match(new RegExp(`${turtlePrefix}(?:setheading|seth)\\s*\\(\\s*([^)]+)\\s*\\)`));
    if (match) {
      const value = getNumericValue(match[1]);
      if (value !== null) {
        commands.push({ type: 'setheading', value, line: lineNum });
      }
      continue;
    }
    
    // Parse hideturtle/ht
    if (trimmed.match(new RegExp(`${turtlePrefix}(?:hideturtle|ht)\\s*\\(\\s*\\)`))) {
      commands.push({ type: 'hideturtle', line: lineNum });
      continue;
    }
    
    // Parse showturtle/st
    if (trimmed.match(new RegExp(`${turtlePrefix}(?:showturtle|st)\\s*\\(\\s*\\)`))) {
      commands.push({ type: 'showturtle', line: lineNum });
      continue;
    }
    
    // Parse for loop with variable or literal support
    match = trimmed.match(/for\s+(\w+)\s+in\s+range\s*\(\s*([^)]+)\s*\)\s*:/);
    if (match) {
      const loopVar = match[1];
      const rangeExpr = match[2];
      const iterations = getNumericValue(rangeExpr);
      
      if (iterations !== null && iterations > 0) {
        const loopIndent = line.search(/\S/);
        const loopBody = [];
        
        // Collect loop body lines
        for (let j = lineNum + 1; j < lines.length; j++) {
          const bodyLine = lines[j];
          if (bodyLine.trim() === '') continue;
          const bodyIndent = bodyLine.search(/\S/);
          if (bodyIndent <= loopIndent && bodyLine.trim() !== '') break;
          loopBody.push({ code: bodyLine.trim(), lineNum: j });
        }
        
        // Expand loop - execute body for each iteration
        for (let i = 0; i < iterations; i++) {
          const loopVars = { ...variables, [loopVar]: i };
          for (const bodyCmd of loopBody) {
            const parsed = parseCode(bodyCmd.code, loopVars);
            for (const p of parsed) {
              p.line = bodyCmd.lineNum;
              commands.push(p);
            }
          }
        }
      }
      continue;
    }
  }
  
  return commands;
}

// Initial turtle state
const getInitialTurtleState = () => ({
  x: 0,
  y: 0,
  heading: 90,  // Match Python turtle default (90 = UP)
  penDown: true,
  penColor: 'black',
  fillColor: 'black',
  turtleColor: '#228B22', // Default green turtle
  penSize: 1,
  visible: true,
  filling: false,
  fillPath: [],
  name: 't' // Default name
});

export default function AnimatedTurtle({ 
  code, 
  onLineHighlight, 
  width = 400, 
  height = 400,
  // Maze/Background props
  backgroundType = "none",  // "none", "maze", "raceway", "grid", "custom"
  backgroundColor = "#ffffff",
  backgroundImage = "",
  mazeData = null,  // {walls: [[x1,y1,x2,y2], ...], wallColor: "#000"}
  goals = [],  // [{x, y, radius, label, color}]
  checkpoints = [],
  collisionEnabled = false,
  challengeMode = false,
  onGoalReached = null,
  onCollision = null,
  onComplete = null
}) {
  const canvasRef = useRef(null);
  const bgCanvasRef = useRef(null);  // Separate canvas for background
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [speed, setSpeed] = useState(5);
  const [collisionCount, setCollisionCount] = useState(0);
  const [goalsReached, setGoalsReached] = useState(new Set());
  const [pathLength, setPathLength] = useState(0);
  const [showGrid, setShowGrid] = useState(false); // Grid toggle state
  
  const turtleRef = useRef(getInitialTurtleState());
  const pathsRef = useRef([]);
  const playingRef = useRef(false);
  
  // Parse code into commands (memoized) and extract turtle name/color
  const { commands, turtleName, turtleColor } = useMemo(() => {
    const result = parseCode(code);
    
    // Detect turtle variable name from code
    const nameMatch = code.match(/(\w+)\s*=\s*turtle\.Turtle\(\)|(\w+)\s*=\s*Turtle\(\)/);
    const name = nameMatch ? (nameMatch[1] || nameMatch[2]) : 't';
    
    // Detect turtle color from code (color() call)
    const colorMatch = code.match(/(?:\w+\.)?color\s*\(\s*['"]([\w#]+)['"]\s*\)/);
    const color = colorMatch ? colorMatch[1] : '#228B22';
    
    return { commands: result, turtleName: name, turtleColor: color };
  }, [code]);
  
  // Convert turtle coordinates to canvas coordinates
  const toCanvasCoords = useCallback((x, y) => ({
    x: width / 2 + x,
    y: height / 2 - y
  }), [width, height]);
  
  // Draw a cute turtle shape!
  const drawTurtle = useCallback((ctx, x, y, heading, color) => {
    const pos = toCanvasCoords(x, y);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(-heading * Math.PI / 180 + Math.PI / 2);
    
    const turtleCol = color || turtleColor;
    
    // Darken color for outline
    const darkenColor = (col) => {
      if (col.startsWith('#')) {
        const r = Math.max(0, parseInt(col.slice(1, 3), 16) - 40);
        const g = Math.max(0, parseInt(col.slice(3, 5), 16) - 40);
        const b = Math.max(0, parseInt(col.slice(5, 7), 16) - 40);
        return `rgb(${r},${g},${b})`;
      }
      return col;
    };
    
    const outlineColor = darkenColor(turtleCol);
    
    // Draw legs (4 little ovals)
    ctx.fillStyle = turtleCol;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    
    // Front left leg
    ctx.beginPath();
    ctx.ellipse(-10, -6, 4, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Front right leg
    ctx.beginPath();
    ctx.ellipse(10, -6, 4, 6, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Back left leg
    ctx.beginPath();
    ctx.ellipse(-10, 6, 4, 6, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Back right leg
    ctx.beginPath();
    ctx.ellipse(10, 6, 4, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw tail
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(-3, 20);
    ctx.lineTo(3, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw shell (main body - oval)
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Shell pattern (hexagon-ish pattern)
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, -5);
    ctx.lineTo(8, 5);
    ctx.lineTo(0, 10);
    ctx.lineTo(-8, 5);
    ctx.lineTo(-8, -5);
    ctx.closePath();
    ctx.stroke();
    
    // Inner hexagon
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(4, -2.5);
    ctx.lineTo(4, 2.5);
    ctx.lineTo(0, 5);
    ctx.lineTo(-4, 2.5);
    ctx.lineTo(-4, -2.5);
    ctx.closePath();
    ctx.stroke();
    
    // Draw head
    ctx.fillStyle = turtleCol;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, -20, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(-2.5, -21, 2, 0, Math.PI * 2);
    ctx.arc(2.5, -21, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(-2.5, -21.5, 1, 0, Math.PI * 2);
    ctx.arc(2.5, -21.5, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Smile
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, -18, 2.5, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    ctx.restore();
  }, [toCanvasCoords, turtleColor]);

  // Draw grid background
  const drawGrid = useCallback((ctx) => {
    const gridSize = 20;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw axes (thicker)
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    // X axis
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    // Y axis
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
  }, [width, height]);

  // Draw maze walls
  const drawMaze = useCallback((ctx) => {
    if (!mazeData || !mazeData.walls) return;
    
    ctx.strokeStyle = mazeData.wallColor || '#333';
    ctx.lineWidth = mazeData.wallWidth || 4;
    ctx.lineCap = 'round';
    
    for (const wall of mazeData.walls) {
      const [x1, y1, x2, y2] = wall;
      const start = toCanvasCoords(x1, y1);
      const end = toCanvasCoords(x2, y2);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  }, [mazeData, toCanvasCoords]);

  // Draw raceway/track
  const drawRaceway = useCallback((ctx) => {
    if (!mazeData || !mazeData.track) return;
    
    // Draw track outline
    ctx.strokeStyle = mazeData.trackColor || '#666';
    ctx.lineWidth = mazeData.trackWidth || 40;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const track = mazeData.track;
    if (track.length < 2) return;
    
    ctx.beginPath();
    const first = toCanvasCoords(track[0].x, track[0].y);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < track.length; i++) {
      const pt = toCanvasCoords(track[i].x, track[i].y);
      ctx.lineTo(pt.x, pt.y);
    }
    if (mazeData.closedTrack) {
      ctx.closePath();
    }
    ctx.stroke();
    
    // Draw center line (dashed)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < track.length; i++) {
      const pt = toCanvasCoords(track[i].x, track[i].y);
      ctx.lineTo(pt.x, pt.y);
    }
    if (mazeData.closedTrack) {
      ctx.closePath();
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }, [mazeData, toCanvasCoords]);

  // Draw goals/checkpoints
  const drawGoals = useCallback((ctx) => {
    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      const pos = toCanvasCoords(goal.x, goal.y);
      const radius = goal.radius || 15;
      const isReached = goalsReached.has(i);
      
      // Draw goal circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      
      if (isReached) {
        ctx.fillStyle = '#4ade80';  // Green for reached
        ctx.fill();
        ctx.strokeStyle = '#22c55e';
      } else {
        ctx.fillStyle = goal.color || '#fbbf24';  // Yellow/gold default
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
      }
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw label or number
      ctx.fillStyle = '#000';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(goal.label || `${i + 1}`, pos.x, pos.y);
    }
    
    // Draw checkpoints (smaller, optional)
    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      const pos = toCanvasCoords(cp.x, cp.y);
      const radius = cp.radius || 8;
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = cp.required ? '#60a5fa' : '#94a3b8';
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [goals, checkpoints, goalsReached, toCanvasCoords]);

  // Check collision with maze walls
  const checkCollision = useCallback((x, y) => {
    if (!collisionEnabled || !mazeData || !mazeData.walls) return false;
    
    const collisionRadius = 5;  // How close to wall counts as collision
    
    for (const wall of mazeData.walls) {
      const [x1, y1, x2, y2] = wall;
      
      // Calculate distance from point to line segment
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      
      let t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lenSq));
      const closestX = x1 + t * dx;
      const closestY = y1 + t * dy;
      
      const distSq = (x - closestX) ** 2 + (y - closestY) ** 2;
      if (distSq < collisionRadius ** 2) {
        return true;
      }
    }
    return false;
  }, [collisionEnabled, mazeData]);

  // Check if turtle reached a goal
  const checkGoals = useCallback((x, y) => {
    for (let i = 0; i < goals.length; i++) {
      if (goalsReached.has(i)) continue;
      
      const goal = goals[i];
      const dist = Math.sqrt((x - goal.x) ** 2 + (y - goal.y) ** 2);
      const radius = goal.radius || 15;
      
      if (dist < radius) {
        setGoalsReached(prev => new Set([...prev, i]));
        if (onGoalReached) {
          onGoalReached(i, goal);
        }
        
        // Check if all goals reached
        if (goalsReached.size + 1 === goals.length && onComplete) {
          onComplete({
            goalsReached: goals.length,
            totalGoals: goals.length,
            pathLength,
            collisions: collisionCount
          });
        }
      }
    }
  }, [goals, goalsReached, onGoalReached, onComplete, pathLength, collisionCount]);
  
  // Draw the canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Draw background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid if enabled (user toggle or background type)
    if (showGrid || backgroundType === 'grid') {
      drawGrid(ctx);
    }
    
    // Draw background based on type
    if (backgroundType === 'maze') {
      drawMaze(ctx);
    } else if (backgroundType === 'raceway') {
      drawRaceway(ctx);
    }
    
    // Draw goals and checkpoints
    if (goals.length > 0 || checkpoints.length > 0) {
      drawGoals(ctx);
    }
    
    // Draw all paths
    for (const path of pathsRef.current) {
      if (path.type === 'line') {
        const start = toCanvasCoords(path.x1, path.y1);
        const end = toCanvasCoords(path.x2, path.y2);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width;
        ctx.lineCap = 'round';
        ctx.stroke();
      } else if (path.type === 'fill') {
        ctx.fillStyle = path.color;
        ctx.beginPath();
        const first = toCanvasCoords(path.points[0].x, path.points[0].y);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < path.points.length; i++) {
          const pt = toCanvasCoords(path.points[i].x, path.points[i].y);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
    
    // Draw turtle if visible
    const turtle = turtleRef.current;
    if (turtle.visible) {
      drawTurtle(ctx, turtle.x, turtle.y, turtle.heading, turtle.turtleColor);
    }
  }, [width, height, toCanvasCoords, drawTurtle, backgroundColor, backgroundType, drawGrid, drawMaze, drawRaceway, drawGoals, goals, checkpoints, showGrid]);
  
  // Reset turtle
  const resetTurtle = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    setCurrentStep(-1);
    setGoalsReached(new Set());
    setCollisionCount(0);
    setPathLength(0);
    
    turtleRef.current = getInitialTurtleState();
    pathsRef.current = [];
    drawCanvas();
    if (onLineHighlight) onLineHighlight(-1);
  }, [drawCanvas, onLineHighlight]);
  
  // Initial draw
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);
  
  // Execute a single command with animation
  const executeCommand = useCallback((cmd, animate = true) => {
    const turtle = turtleRef.current;
    
    return new Promise((resolve) => {
      const baseDelay = animate ? (11 - speed) * 50 : 0;
      
      switch (cmd.type) {
        case 'forward':
        case 'backward': {
          const distance = cmd.type === 'backward' ? -cmd.value : cmd.value;
          const rad = turtle.heading * Math.PI / 180;
          const dx = distance * Math.cos(rad);
          const dy = distance * Math.sin(rad);
          const newX = turtle.x + dx;
          const newY = turtle.y + dy;
          
          // Check for collision before moving
          if (collisionEnabled && checkCollision(newX, newY)) {
            setCollisionCount(prev => prev + 1);
            if (onCollision) {
              onCollision({ x: newX, y: newY });
            }
            // Flash the canvas red briefly
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
              ctx.fillRect(0, 0, width, height);
              setTimeout(() => drawCanvas(), 200);
            }
            setTimeout(resolve, baseDelay);
            break;
          }
          
          if (turtle.penDown) {
            pathsRef.current.push({
              type: 'line',
              x1: turtle.x, y1: turtle.y,
              x2: newX, y2: newY,
              color: turtle.penColor,
              width: turtle.penSize
            });
          }
          
          if (turtle.filling) {
            turtle.fillPath.push({ x: newX, y: newY });
          }
          
          // Update path length
          setPathLength(prev => prev + Math.abs(distance));
          
          turtle.x = newX;
          turtle.y = newY;
          
          // Check if turtle reached any goals
          checkGoals(newX, newY);
          
          drawCanvas();
          setTimeout(resolve, baseDelay);
          break;
        }
        
        case 'right':
          turtle.heading -= cmd.value;
          drawCanvas();
          setTimeout(resolve, baseDelay / 2);
          break;
          
        case 'left':
          turtle.heading += cmd.value;
          drawCanvas();
          setTimeout(resolve, baseDelay / 2);
          break;
          
        case 'penup':
          turtle.penDown = false;
          resolve();
          break;
          
        case 'pendown':
          turtle.penDown = true;
          resolve();
          break;
          
        case 'pencolor':
          turtle.penColor = cmd.value;
          turtle.turtleColor = cmd.value; // Also change turtle color
          drawCanvas();
          resolve();
          break;
          
        case 'fillcolor':
          turtle.fillColor = cmd.value;
          resolve();
          break;
          
        case 'color':
          turtle.penColor = cmd.penColor;
          turtle.fillColor = cmd.fillColor;
          turtle.turtleColor = cmd.penColor; // Change turtle body color
          drawCanvas();
          resolve();
          break;
          
        case 'begin_fill':
          turtle.filling = true;
          turtle.fillPath = [{ x: turtle.x, y: turtle.y }];
          resolve();
          break;
          
        case 'end_fill':
          if (turtle.filling && turtle.fillPath.length > 2) {
            pathsRef.current.push({
              type: 'fill',
              points: [...turtle.fillPath],
              color: turtle.fillColor
            });
            drawCanvas();
          }
          turtle.filling = false;
          turtle.fillPath = [];
          resolve();
          break;
          
        case 'pensize':
          turtle.penSize = cmd.value;
          resolve();
          break;
          
        case 'speed':
          resolve();
          break;
          
        case 'circle': {
          const r = cmd.value;
          const extent = cmd.extent || 360; // Use extent from command, default to 360
          const fullCircleSteps = Math.abs(r) < 50 ? 36 : 72;
          const steps = Math.round(fullCircleSteps * Math.abs(extent) / 360); // Proportional steps
          const angleStep = (r > 0 ? 1 : -1) * extent / steps;
          const arcLength = 2 * Math.PI * Math.abs(r) * Math.abs(extent) / 360 / steps;
          
          const drawCircleStep = (step) => {
            if (step >= steps) {
              resolve();
              return;
            }
            
            turtle.heading += angleStep;
            const rad = turtle.heading * Math.PI / 180;
            const dx = arcLength * Math.cos(rad);
            const dy = arcLength * Math.sin(rad);
            const newX = turtle.x + dx;
            const newY = turtle.y + dy;
            
            if (turtle.penDown) {
              pathsRef.current.push({
                type: 'line',
                x1: turtle.x, y1: turtle.y,
                x2: newX, y2: newY,
                color: turtle.penColor,
                width: turtle.penSize
              });
            }
            
            turtle.x = newX;
            turtle.y = newY;
            drawCanvas();
            
            setTimeout(() => drawCircleStep(step + 1), baseDelay / 10);
          };
          
          drawCircleStep(0);
          break;
        }
          
        case 'goto':
          if (turtle.penDown) {
            pathsRef.current.push({
              type: 'line',
              x1: turtle.x, y1: turtle.y,
              x2: cmd.x, y2: cmd.y,
              color: turtle.penColor,
              width: turtle.penSize
            });
          }
          turtle.x = cmd.x;
          turtle.y = cmd.y;
          drawCanvas();
          setTimeout(resolve, baseDelay);
          break;
          
        case 'setheading':
          turtle.heading = cmd.value;
          drawCanvas();
          setTimeout(resolve, baseDelay / 2);
          break;
          
        case 'hideturtle':
          turtle.visible = false;
          drawCanvas();
          resolve();
          break;
          
        case 'showturtle':
          turtle.visible = true;
          drawCanvas();
          resolve();
          break;
          
        default:
          resolve();
      }
    });
  }, [speed, drawCanvas]);
  
  // Play animation
  const play = useCallback(async () => {
    playingRef.current = true;
    setIsPlaying(true);
    
    for (let i = 0; i < commands.length; i++) {
      if (!playingRef.current) break;
      
      const cmd = commands[i];
      setCurrentStep(i);
      if (onLineHighlight) onLineHighlight(cmd.line);
      
      await executeCommand(cmd, true);
    }
    
    playingRef.current = false;
    setIsPlaying(false);
    if (onLineHighlight) onLineHighlight(-1);
  }, [commands, executeCommand, onLineHighlight]);
  
  // Run instantly (no animation)
  const runInstant = useCallback(async () => {
    resetTurtle();
    await new Promise(r => setTimeout(r, 50)); // Let reset complete
    
    for (const cmd of commands) {
      await executeCommand(cmd, false);
    }
  }, [commands, executeCommand, resetTurtle]);
  
  // Stop animation
  const stop = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    if (onLineHighlight) onLineHighlight(-1);
  }, [onLineHighlight]);
  
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white rounded-lg shadow-lg p-2">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border border-gray-300 rounded"
        />
      </div>
      
      <div className="flex items-center gap-3 w-full max-w-md">
        <Button
          size="sm"
          variant="outline"
          onClick={resetTurtle}
          className="bg-gray-700 border-gray-600 hover:bg-gray-600"
          title="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          onClick={isPlaying ? stop : play}
          className={isPlaying ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={runInstant}
          className="bg-gray-700 border-gray-600 hover:bg-gray-600"
          title="Run instantly"
        >
          <FastForward className="w-4 h-4" />
        </Button>
        
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-gray-400">Speed:</span>
          <Slider
            value={[speed]}
            onValueChange={([v]) => setSpeed(v)}
            min={1}
            max={10}
            step={1}
            className="w-24"
          />
          <span className="text-xs text-gray-400 w-4">{speed}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span 
          className="px-2 py-1 rounded font-mono"
          style={{ backgroundColor: turtleColor, color: 'white', textShadow: '0 0 2px black' }}
        >
          🐢 {turtleName}
        </span>
        <span>
          {isPlaying ? `Running step ${currentStep + 1}/${commands.length}` : 
           commands.length > 0 ? `${commands.length} commands ready` : 'No commands parsed'}
        </span>
      </div>
      
      {/* Challenge Mode Stats */}
      {challengeMode && (
        <div className="flex items-center gap-4 text-sm bg-gray-100 rounded-lg px-4 py-2">
          <div className="flex items-center gap-1">
            <span className="text-yellow-600">🎯</span>
            <span>{goalsReached.size}/{goals.length} Goals</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-blue-600">📏</span>
            <span>{pathLength.toFixed(0)} px traveled</span>
          </div>
          {collisionEnabled && (
            <div className="flex items-center gap-1">
              <span className="text-red-600">💥</span>
              <span>{collisionCount} collisions</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="text-purple-600">📝</span>
            <span>{code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length} lines</span>
          </div>
        </div>
      )}
    </div>
  );
}
