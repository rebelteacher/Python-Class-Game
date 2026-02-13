import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, FastForward, Grid } from "lucide-react";

// Simple expression evaluator for variables
function evaluateExpression(expr, variables) {
  if (expr === null || expr === undefined) return null;
  expr = String(expr).trim();
  
  // Check for list indexing: varName[index] (e.g., colors[i], colors[0])
  const listIndexMatch = expr.match(/^(\w+)\[([^\]]+)\]$/);
  if (listIndexMatch) {
    const listName = listIndexMatch[1];
    const indexExpr = listIndexMatch[2];
    const list = variables[listName];
    
    if (Array.isArray(list)) {
      // Evaluate the index (could be a number or variable like 'i')
      const index = evaluateExpression(indexExpr, variables);
      if (index !== null && index >= 0 && index < list.length) {
        return list[Math.floor(index)];
      }
    }
    return null;
  }
  
  // Check if it's a direct variable reference
  if (variables.hasOwnProperty(expr)) {
    return variables[expr];
  }
  
  // Replace variable names with their values for math expressions
  let evaluated = expr;
  for (const [name, value] of Object.entries(variables)) {
    if (typeof value === 'number') {
      evaluated = evaluated.replace(new RegExp(`\\b${name}\\b`, 'g'), value);
    }
  }
  
  // Try to evaluate simple math expressions
  try {
    // Only allow numbers, operators, parentheses, and spaces (including modulo %)
    if (/^[\d\s+\-*/().%]+$/.test(evaluated)) {
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

// Parse a Python list literal: ["red", "blue", "green"]
function parseListLiteral(str) {
  str = str.trim();
  if (!str.startsWith('[') || !str.endsWith(']')) return null;
  
  const inner = str.slice(1, -1).trim();
  if (inner === '') return [];
  
  // Match items (strings with quotes or numbers)
  const items = [];
  const regex = /(['"])(.*?)\1|(-?\d+\.?\d*)/g;
  let match;
  while ((match = regex.exec(inner)) !== null) {
    if (match[2] !== undefined) {
      // String item
      items.push(match[2]);
    } else if (match[3] !== undefined) {
      // Number item
      items.push(parseFloat(match[3]));
    }
  }
  return items;
}

// Parse event handlers from generated code
// Returns: { keyHandlers: { 'space': [...commands], 'up': [...] }, clickHandler: [...], mouseMoveHandler: [...] }
function parseEventHandlers(code) {
  const handlers = {
    keyHandlers: {},
    clickHandler: [],
    mouseMoveHandler: []
  };
  
  if (!code) return handlers;
  
  const lines = code.split('\n');
  let i = 0;
  
  console.log("🔍 parseEventHandlers scanning", lines.length, "lines");
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Look for event handler function definitions
    // Pattern: def on_key_space(): or def on_key_up(): etc.
    const keyMatch = trimmed.match(/^def\s+on_key_(\w+)\s*\(\s*\)\s*:/);
    if (keyMatch) {
      const key = keyMatch[1].replace(/_/g, ' ').trim();
      console.log("🔍 Found key handler:", key);
      const funcBody = extractFunctionBody(lines, i);
      console.log("🔍 Function body:", funcBody.substring(0, 100));
      const parsedCommands = parseCode(funcBody);
      console.log("🔍 Parsed", parsedCommands.length, "commands for", key);
      handlers.keyHandlers[key] = parsedCommands;
      // Skip past function body
      i = skipFunctionBody(lines, i);
      continue;
    }
    
    // Pattern: def on_turtle_clicked():
    const clickMatch = trimmed.match(/^def\s+on_turtle_clicked\s*\(\s*\)\s*:/);
    if (clickMatch) {
      const funcBody = extractFunctionBody(lines, i);
      handlers.clickHandler = parseCode(funcBody);
      i = skipFunctionBody(lines, i);
      continue;
    }
    
    // Pattern: def on_mouse_move():
    const mouseMatch = trimmed.match(/^def\s+on_mouse_move\s*\(\s*\)\s*:/);
    if (mouseMatch) {
      const funcBody = extractFunctionBody(lines, i);
      handlers.mouseMoveHandler = parseCode(funcBody);
      i = skipFunctionBody(lines, i);
      continue;
    }
    
    i++;
  }
  
  console.log("🔍 parseEventHandlers result:", Object.keys(handlers.keyHandlers));
  return handlers;
}

// Extract function body (indented lines after def)
function extractFunctionBody(lines, defLineIndex) {
  const bodyLines = [];
  const defIndent = lines[defLineIndex].search(/\S/);
  
  for (let j = defLineIndex + 1; j < lines.length; j++) {
    const line = lines[j];
    if (line.trim() === '') {
      bodyLines.push('');
      continue;
    }
    const lineIndent = line.search(/\S/);
    if (lineIndent <= defIndent) break;
    // Remove one level of indentation
    bodyLines.push(line.substring(defIndent + 4));
  }
  
  return bodyLines.join('\n');
}

// Skip past function body and return new index
function skipFunctionBody(lines, defLineIndex) {
  const defIndent = lines[defLineIndex].search(/\S/);
  
  for (let j = defLineIndex + 1; j < lines.length; j++) {
    const line = lines[j];
    if (line.trim() === '') continue;
    const lineIndent = line.search(/\S/);
    if (lineIndent <= defIndent) return j;
  }
  
  return lines.length;
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
    
    // Skip function definitions (event handlers) - they'll be parsed separately
    if (trimmed.startsWith('def ')) {
      // Find the end of this function by looking for next non-indented line
      const funcIndent = line.search(/\S/);
      let lastFuncLine = lineNum;
      for (let j = lineNum + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        if (nextLine.trim() === '') {
          lastFuncLine = j;
          continue;
        }
        const nextIndent = nextLine.search(/\S/);
        if (nextIndent <= funcIndent) {
          // Found a line with same or less indentation - function ends before this
          lineNum = j - 1;
          break;
        }
        // This line is part of the function
        lastFuncLine = j;
        // If we're at the last line, set lineNum to skip past it
        if (j === lines.length - 1) {
          lineNum = j;
        }
      }
      // If loop ended without finding end of function, skip to last line we saw
      if (lineNum < lastFuncLine) {
        lineNum = lastFuncLine;
      }
      continue;
    }
    
    // Parse variable assignments (e.g., sides = 6, angle = 360 / sides, colors = ["red", "blue"])
    let match = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (match && !trimmed.includes('turtle') && !trimmed.includes('Turtle')) {
      const varName = match[1];
      const varExpr = match[2].trim();
      
      // Try to parse as a list first
      const listValue = parseListLiteral(varExpr);
      if (listValue !== null) {
        variables[varName] = listValue;
        continue;
      }
      
      // Try as a number or expression
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
    
    // Helper to get color value (string literal, variable, or list index)
    const getColorValue = (str) => {
      if (!str) return null;
      str = str.trim();
      
      // Check for string literal with quotes
      const quotedMatch = str.match(/^['"](.+)['"]$/);
      if (quotedMatch) {
        return quotedMatch[1];
      }
      
      // Try as variable or list index (e.g., colors[i], myColor)
      const value = evaluateExpression(str, variables);
      console.log(`🎨 getColorValue("${str}") with variables:`, Object.keys(variables), `=> ${value}`);
      if (value !== null && typeof value === 'string') {
        return value;
      }
      
      return null;
    };
    
    // Parse color() - changes both pen and turtle color (with variable support)
    match = trimmed.match(new RegExp(`${turtlePrefix}color\\s*\\(\\s*([^,)]+)(?:\\s*,\\s*([^)]+))?\\s*\\)`));
    if (match) {
      const penColor = getColorValue(match[1]);
      const fillColor = match[2] ? getColorValue(match[2]) : penColor;
      if (penColor) {
        commands.push({ type: 'color', penColor, fillColor: fillColor || penColor, line: lineNum });
      }
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
    
    // Parse pencolor with variable support (e.g., pencolor("red"), pencolor(colors[i]), pencolor(myColor))
    match = trimmed.match(new RegExp(`${turtlePrefix}pencolor\\s*\\(\\s*([^)]+)\\s*\\)`));
    if (match) {
      const colorValue = getColorValue(match[1]);
      if (colorValue) {
        commands.push({ type: 'pencolor', value: colorValue, line: lineNum });
      }
      continue;
    }
    
    // Parse fillcolor with variable support
    match = trimmed.match(new RegExp(`${turtlePrefix}fillcolor\\s*\\(\\s*([^)]+)\\s*\\)`));
    if (match) {
      const colorValue = getColorValue(match[1]);
      if (colorValue) {
        commands.push({ type: 'fillcolor', value: colorValue, line: lineNum });
      }
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
    
    // Parse home command - t.home() - returns turtle to origin (0, 0) and resets heading
    if (trimmed.match(new RegExp(`${turtlePrefix}home\\s*\\(\\s*\\)`))) {
      commands.push({ type: 'home', line: lineNum });
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
    
    // Parse write command - t.write("text", ...) - extracts just the text content
    match = trimmed.match(new RegExp(`${turtlePrefix}write\\s*\\(\\s*["']([^"']*?)["']`));
    if (match) {
      commands.push({ type: 'write', args: [match[1]], line: lineNum });
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
        let lastBodyLine = lineNum;
        
        // Collect loop body lines
        for (let j = lineNum + 1; j < lines.length; j++) {
          const bodyLine = lines[j];
          if (bodyLine.trim() === '') {
            lastBodyLine = j;
            continue;
          }
          const bodyIndent = bodyLine.search(/\S/);
          if (bodyIndent <= loopIndent && bodyLine.trim() !== '') break;
          loopBody.push({ code: bodyLine.trim(), lineNum: j });
          lastBodyLine = j;
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
        
        // Skip past the loop body lines so they aren't parsed again
        lineNum = lastBodyLine;
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
  texts: [],  // Array of {text, x, y, color} for write command
  name: 't' // Default name
});

const AnimatedTurtle = forwardRef(function AnimatedTurtle({ 
  code, 
  onLineHighlight,
  onRun, 
  width = 600, 
  height = 600,
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
  onComplete = null,
  enableEvents = true  // Enable keyboard/mouse event listeners
}, ref) {
  const canvasRef = useRef(null);
  const bgCanvasRef = useRef(null);  // Separate canvas for background
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [speed, setSpeed] = useState(5);
  const [collisionCount, setCollisionCount] = useState(0);
  const [goalsReached, setGoalsReached] = useState(new Set());
  const [pathLength, setPathLength] = useState(0);
  const [showGrid, setShowGrid] = useState(false); // Grid toggle state
  const [mouseCoords, setMouseCoords] = useState(null); // For hover coordinate display
  
  const turtleRef = useRef(getInitialTurtleState());
  const pathsRef = useRef([]);
  const playingRef = useRef(false);
  const eventHandlersRef = useRef({ keyHandlers: {}, clickHandler: [], mouseMoveHandler: [] });
  const [eventModeActive, setEventModeActive] = useState(false);  // Track if event mode is running
  
  // Parse code into commands (memoized) and extract turtle name/color
  const { commands, turtleName, turtleColor, eventHandlers } = useMemo(() => {
    console.log("📝 Parsing code:", code?.substring(0, 100));
    const result = parseCode(code);
    const handlers = parseEventHandlers(code);
    
    console.log("📝 Parsed commands:", result.length);
    console.log("📝 Parsed event handlers:", {
      keyHandlers: Object.keys(handlers.keyHandlers),
      clickHandler: handlers.clickHandler.length,
      mouseMoveHandler: handlers.mouseMoveHandler.length
    });
    
    // Detect turtle variable name from code
    const nameMatch = code.match(/(\w+)\s*=\s*turtle\.Turtle\(\)|(\w+)\s*=\s*Turtle\(\)/);
    const name = nameMatch ? (nameMatch[1] || nameMatch[2]) : 't';
    
    // Detect turtle color from code (color() call)
    const colorMatch = code.match(/(?:\w+\.)?color\s*\(\s*['"]([\w#]+)['"]\s*\)/);
    const color = colorMatch ? colorMatch[1] : '#228B22';
    
    return { commands: result, turtleName: name, turtleColor: color, eventHandlers: handlers };
  }, [code]);
  
  // Store event handlers in ref for use in event listeners
  useEffect(() => {
    eventHandlersRef.current = eventHandlers;
  }, [eventHandlers]);
  
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
    
    // Draw all written texts
    const turtle = turtleRef.current;
    if (turtle.texts && turtle.texts.length > 0) {
      for (const textItem of turtle.texts) {
        const pos = toCanvasCoords(textItem.x, textItem.y);
        ctx.save();
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = textItem.color || 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(textItem.text, pos.x, pos.y - 20);  // Offset above turtle position
        ctx.restore();
      }
    }
    
    // Draw turtle if visible
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
        
        case 'home':
          // Move turtle to origin (0, 0) and reset heading to 90 (facing up)
          if (turtle.penDown) {
            pathsRef.current.push({
              type: 'line',
              x1: turtle.x, y1: turtle.y,
              x2: 0, y2: 0,
              color: turtle.penColor,
              width: turtle.penSize
            });
          }
          turtle.x = 0;
          turtle.y = 0;
          turtle.heading = 90; // Reset to facing up
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
          
        case 'write': {
          // Store text at turtle's current position so it persists on canvas
          const text = cmd.args?.[0] || '';
          if (!turtle.texts) turtle.texts = [];
          turtle.texts.push({
            text: text,
            x: turtle.x,
            y: turtle.y,
            color: turtle.penColor
          });
          drawCanvas();
          resolve();
          break;
        }
          
        default:
          resolve();
      }
    });
  }, [speed, drawCanvas]);
  
  // Play animation
  const play = useCallback(async () => {
    // Always reset turtle to starting position before playing
    resetTurtle();
    await new Promise(r => setTimeout(r, 50)); // Let reset complete
    
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
    
    // After playing, check if there are event handlers and activate event mode
    const hasEventHandlers = 
      Object.keys(eventHandlers.keyHandlers).length > 0 ||
      eventHandlers.clickHandler.length > 0 ||
      eventHandlers.mouseMoveHandler.length > 0;
    
    if (hasEventHandlers) {
      console.log("🚀 play: Activating event mode after playback");
      eventHandlersRef.current = eventHandlers;
      setEventModeActive(true);
    }
    
    // Notify parent that code was run
    if (onRun) onRun();
  }, [commands, executeCommand, onLineHighlight, resetTurtle, onRun, eventHandlers]);
  
  // Run instantly (no animation) - also activates event mode if handlers exist
  const runInstant = useCallback(async () => {
    resetTurtle();
    await new Promise(r => setTimeout(r, 50)); // Let reset complete
    
    // Run startup commands
    for (const cmd of commands) {
      await executeCommand(cmd, false);
    }
    
    // Check if there are event handlers and activate event mode
    const hasEventHandlers = 
      Object.keys(eventHandlers.keyHandlers).length > 0 ||
      eventHandlers.clickHandler.length > 0 ||
      eventHandlers.mouseMoveHandler.length > 0;
    
    if (hasEventHandlers) {
      console.log("🚀 runInstant: Activating event mode");
      eventHandlersRef.current = eventHandlers;
      setEventModeActive(true);
    }
    
    // Notify parent that code was run
    if (onRun) onRun();
  }, [commands, executeCommand, resetTurtle, onRun, eventHandlers]);
  
  // Stop animation
  const stop = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    setEventModeActive(false);
    if (onLineHighlight) onLineHighlight(-1);
  }, [onLineHighlight]);
  
  // Execute event handler commands (for key/click events)
  const executeEventHandler = useCallback(async (handlerCommands) => {
    if (!handlerCommands || handlerCommands.length === 0) return;
    
    for (const cmd of handlerCommands) {
      await executeCommand(cmd, false);  // Execute instantly for responsiveness
    }
    drawCanvas();
  }, [executeCommand, drawCanvas]);
  
  // Start event mode - runs startup code and activates event listeners
  const startEventMode = useCallback(async () => {
    console.log("🚀 startEventMode called");
    console.log("🚀 eventHandlers:", JSON.stringify({
      keyHandlers: Object.keys(eventHandlers.keyHandlers),
      keyHandlerCommands: Object.fromEntries(
        Object.entries(eventHandlers.keyHandlers).map(([k, v]) => [k, v.length])
      )
    }));
    
    // Reset first
    resetTurtle();
    await new Promise(r => setTimeout(r, 50));
    
    // Run startup/main code
    console.log("🚀 Running", commands.length, "startup commands");
    for (const cmd of commands) {
      await executeCommand(cmd, false);
    }
    
    // Use eventHandlers directly (from useMemo) - not the ref which may be stale
    const hasEventHandlers = 
      Object.keys(eventHandlers.keyHandlers).length > 0 ||
      eventHandlers.clickHandler.length > 0 ||
      eventHandlers.mouseMoveHandler.length > 0;
    
    console.log("🚀 Has event handlers:", hasEventHandlers);
    
    if (hasEventHandlers) {
      // Update the ref synchronously before activating event mode
      eventHandlersRef.current = eventHandlers;
      setEventModeActive(true);
      console.log("✅ Event mode ACTIVATED");
    }
    
    if (onRun) onRun();
  }, [commands, executeCommand, resetTurtle, onRun, eventHandlers]);
  
  // Keyboard event handler
  useEffect(() => {
    console.log("⌨️ Keyboard effect - enableEvents:", enableEvents, "eventModeActive:", eventModeActive);
    if (!enableEvents || !eventModeActive) return;
    
    console.log("⌨️ Keyboard listener ATTACHED");
    console.log("⌨️ Available handlers:", Object.keys(eventHandlersRef.current.keyHandlers));
    
    const handleKeyDown = (e) => {
      const handlers = eventHandlersRef.current.keyHandlers;
      console.log("🔑 Key pressed:", e.code, "handlers:", Object.keys(handlers));
      
      if (!handlers || Object.keys(handlers).length === 0) return;
      
      // Map key codes to handler keys
      let key = null;
      switch (e.code) {
        case 'Space': key = 'space'; break;
        case 'ArrowUp': key = 'up'; break;
        case 'ArrowDown': key = 'down'; break;
        case 'ArrowLeft': key = 'left'; break;
        case 'ArrowRight': key = 'right'; break;
        default:
          // For letter keys
          if (e.key.length === 1) {
            key = e.key.toLowerCase();
          }
      }
      
      console.log("🔑 Mapped to:", key);
      
      // Check for 'any' key handler
      if (handlers['any']) {
        e.preventDefault();
        executeEventHandler(handlers['any']);
      }
      
      // Check for specific key handler
      if (key && handlers[key]) {
        console.log("✅ Found handler for", key, "with", handlers[key].length, "commands");
        e.preventDefault();
        executeEventHandler(handlers[key]);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      console.log("⌨️ Keyboard listener REMOVED");
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableEvents, eventModeActive, executeEventHandler]);
  
  // Canvas click handler for "when turtle clicked" events
  const handleCanvasClick = useCallback((e) => {
    if (!eventModeActive) return;
    
    const handlers = eventHandlersRef.current;
    if (!handlers.clickHandler || handlers.clickHandler.length === 0) return;
    
    // Check if click is near turtle position
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    
    // Convert to turtle coordinates
    const clickX = canvasX - width / 2;
    const clickY = height / 2 - canvasY;
    
    // Check if click is within ~30 pixels of turtle
    const turtle = turtleRef.current;
    const dist = Math.sqrt((clickX - turtle.x) ** 2 + (clickY - turtle.y) ** 2);
    
    if (dist < 30) {
      executeEventHandler(handlers.clickHandler);
    }
  }, [eventModeActive, executeEventHandler, width, height]);
  
  // Handle mouse move for coordinate display
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Get canvas coordinates
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    
    // Convert to turtle coordinates (origin at center, Y inverted)
    const turtleX = Math.round(canvasX - width / 2);
    const turtleY = Math.round(height / 2 - canvasY);
    
    setMouseCoords({ x: turtleX, y: turtleY });
  }, [width, height]);
  
  const handleMouseLeave = useCallback(() => {
    setMouseCoords(null);
  }, []);
  
  // Expose methods via ref for external control
  useImperativeHandle(ref, () => ({
    play,
    stop,
    reset: resetTurtle,
    runInstant,
    startEventMode,
    isEventModeActive: () => eventModeActive
  }), [play, stop, resetTurtle, runInstant, startEventMode, eventModeActive]);
  
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white rounded-lg shadow-lg p-2 relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border border-gray-300 rounded cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleCanvasClick}
          tabIndex={0}
        />
        {/* Coordinate display overlay */}
        {mouseCoords && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-mono">
            ({mouseCoords.x}, {mouseCoords.y})
          </div>
        )}
        {/* Event mode indicator */}
        {eventModeActive && (
          <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-bold animate-pulse">
            ⌨️ Events Active
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3 w-full max-w-md">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            resetTurtle();
          }}
          className="bg-gray-700 border-gray-600 hover:bg-gray-600"
          title="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        
        <Button
          type="button"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            isPlaying ? stop() : play();
          }}
          className={isPlaying ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            runInstant();
          }}
          className="bg-gray-700 border-gray-600 hover:bg-gray-600"
          title="Run instantly"
        >
          <FastForward className="w-4 h-4" />
        </Button>
        
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setShowGrid(!showGrid);
            // Trigger redraw
            setTimeout(() => drawCanvas(), 50);
          }}
          className={`${showGrid ? 'bg-blue-600 border-blue-500' : 'bg-gray-700 border-gray-600'} hover:bg-gray-600`}
          title={showGrid ? "Hide grid" : "Show grid"}
        >
          <Grid className="w-4 h-4" />
        </Button>
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
});

export default AnimatedTurtle;
