import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, FastForward } from "lucide-react";

// Parse Python turtle code into commands
function parseCode(code) {
  const commands = [];
  const lines = code.split('\n');
  
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
    
    // Parse forward/fd
    let match = trimmed.match(/(?:t\.|turtle\.)?(?:forward|fd)\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)/);
    if (match) {
      commands.push({ type: 'forward', value: parseFloat(match[1]), line: lineNum });
      continue;
    }
    
    // Parse backward/bk/back
    match = trimmed.match(/(?:t\.|turtle\.)?(?:backward|bk|back)\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)/);
    if (match) {
      commands.push({ type: 'backward', value: parseFloat(match[1]), line: lineNum });
      continue;
    }
    
    // Parse right/rt
    match = trimmed.match(/(?:t\.|turtle\.)?(?:right|rt)\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)/);
    if (match) {
      commands.push({ type: 'right', value: parseFloat(match[1]), line: lineNum });
      continue;
    }
    
    // Parse left/lt
    match = trimmed.match(/(?:t\.|turtle\.)?(?:left|lt)\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)/);
    if (match) {
      commands.push({ type: 'left', value: parseFloat(match[1]), line: lineNum });
      continue;
    }
    
    // Parse penup/pu/up
    if (trimmed.match(/(?:t\.|turtle\.)?(?:penup|pu|up)\s*\(\s*\)/)) {
      commands.push({ type: 'penup', line: lineNum });
      continue;
    }
    
    // Parse pendown/pd/down
    if (trimmed.match(/(?:t\.|turtle\.)?(?:pendown|pd|down)\s*\(\s*\)/)) {
      commands.push({ type: 'pendown', line: lineNum });
      continue;
    }
    
    // Parse pencolor
    match = trimmed.match(/(?:t\.|turtle\.)?pencolor\s*\(\s*['"](.*?)['"]\s*\)/);
    if (match) {
      commands.push({ type: 'pencolor', value: match[1], line: lineNum });
      continue;
    }
    
    // Parse fillcolor
    match = trimmed.match(/(?:t\.|turtle\.)?fillcolor\s*\(\s*['"](.*?)['"]\s*\)/);
    if (match) {
      commands.push({ type: 'fillcolor', value: match[1], line: lineNum });
      continue;
    }
    
    // Parse begin_fill
    if (trimmed.match(/(?:t\.|turtle\.)?begin_fill\s*\(\s*\)/)) {
      commands.push({ type: 'begin_fill', line: lineNum });
      continue;
    }
    
    // Parse end_fill
    if (trimmed.match(/(?:t\.|turtle\.)?end_fill\s*\(\s*\)/)) {
      commands.push({ type: 'end_fill', line: lineNum });
      continue;
    }
    
    // Parse pensize/width
    match = trimmed.match(/(?:t\.|turtle\.)?(?:pensize|width)\s*\(\s*(\d+(?:\.\d+)?)\s*\)/);
    if (match) {
      commands.push({ type: 'pensize', value: parseFloat(match[1]), line: lineNum });
      continue;
    }
    
    // Parse speed
    match = trimmed.match(/(?:t\.|turtle\.)?speed\s*\(\s*(\d+)\s*\)/);
    if (match) {
      commands.push({ type: 'speed', value: parseInt(match[1]), line: lineNum });
      continue;
    }
    
    // Parse circle
    match = trimmed.match(/(?:t\.|turtle\.)?circle\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)/);
    if (match) {
      commands.push({ type: 'circle', value: parseFloat(match[1]), line: lineNum });
      continue;
    }
    
    // Parse goto/setpos/setposition
    match = trimmed.match(/(?:t\.|turtle\.)?(?:goto|setpos|setposition)\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/);
    if (match) {
      commands.push({ type: 'goto', x: parseFloat(match[1]), y: parseFloat(match[2]), line: lineNum });
      continue;
    }
    
    // Parse setheading/seth
    match = trimmed.match(/(?:t\.|turtle\.)?(?:setheading|seth)\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)/);
    if (match) {
      commands.push({ type: 'setheading', value: parseFloat(match[1]), line: lineNum });
      continue;
    }
    
    // Parse hideturtle/ht
    if (trimmed.match(/(?:t\.|turtle\.)?(?:hideturtle|ht)\s*\(\s*\)/)) {
      commands.push({ type: 'hideturtle', line: lineNum });
      continue;
    }
    
    // Parse showturtle/st
    if (trimmed.match(/(?:t\.|turtle\.)?(?:showturtle|st)\s*\(\s*\)/)) {
      commands.push({ type: 'showturtle', line: lineNum });
      continue;
    }
    
    // Parse for loop - expand it
    match = trimmed.match(/for\s+\w+\s+in\s+range\s*\(\s*(\d+)\s*\)\s*:/);
    if (match) {
      const iterations = parseInt(match[1]);
      const loopIndent = line.search(/\S/);
      const loopCommands = [];
      
      // Collect loop body
      for (let j = lineNum + 1; j < lines.length; j++) {
        const bodyLine = lines[j];
        if (bodyLine.trim() === '') continue;
        const bodyIndent = bodyLine.search(/\S/);
        if (bodyIndent <= loopIndent && bodyLine.trim() !== '') break;
        loopCommands.push({ code: bodyLine.trim(), lineNum: j });
      }
      
      // Expand loop
      for (let i = 0; i < iterations; i++) {
        for (const cmd of loopCommands) {
          const parsed = parseCode(cmd.code);
          for (const p of parsed) {
            p.line = cmd.lineNum;
            commands.push(p);
          }
        }
      }
      continue;
    }
  }
  
  return commands;
}

export default function AnimatedTurtle({ code, onLineHighlight, width = 400, height = 400 }) {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [speed, setSpeed] = useState(5); // 1-10 scale
  const [commands, setCommands] = useState([]);
  
  // Turtle state
  const turtleRef = useRef({
    x: 0,
    y: 0,
    heading: 0, // 0 = East, 90 = North
    penDown: true,
    penColor: 'black',
    fillColor: 'black',
    penSize: 1,
    visible: true,
    filling: false,
    fillPath: []
  });
  
  // Drawing state
  const pathsRef = useRef([]);
  const animationRef = useRef(null);
  
  // Parse code when it changes
  useEffect(() => {
    const parsed = parseCode(code);
    setCommands(parsed);
    resetTurtle();
  }, [code]);
  
  const resetTurtle = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentStep(-1);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    turtleRef.current = {
      x: 0,
      y: 0,
      heading: 0,
      penDown: true,
      penColor: 'black',
      fillColor: 'black',
      penSize: 1,
      visible: true,
      filling: false,
      fillPath: []
    };
    
    pathsRef.current = [];
    drawCanvas();
    if (onLineHighlight) onLineHighlight(-1);
  }, [onLineHighlight]);
  
  // Convert turtle coordinates to canvas coordinates
  const toCanvasCoords = (x, y) => {
    return {
      x: width / 2 + x,
      y: height / 2 - y
    };
  };
  
  // Draw turtle shape
  const drawTurtle = (ctx, x, y, heading) => {
    const pos = toCanvasCoords(x, y);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(-heading * Math.PI / 180 + Math.PI / 2);
    
    // Draw turtle shape
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(-8, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#006400';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
  };
  
  // Draw the canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
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
      drawTurtle(ctx, turtle.x, turtle.y, turtle.heading);
    }
  }, [width, height]);
  
  // Execute a single command with animation
  const executeCommand = useCallback((cmd, animate = true) => {
    const turtle = turtleRef.current;
    
    return new Promise((resolve) => {
      const baseDelay = animate ? (11 - speed) * 50 : 0; // 50ms to 500ms based on speed
      
      switch (cmd.type) {
        case 'forward':
        case 'backward': {
          const distance = cmd.type === 'backward' ? -cmd.value : cmd.value;
          const rad = turtle.heading * Math.PI / 180;
          const dx = distance * Math.cos(rad);
          const dy = distance * Math.sin(rad);
          const newX = turtle.x + dx;
          const newY = turtle.y + dy;
          
          if (turtle.penDown) {
            pathsRef.current.push({
              type: 'line',
              x1: turtle.x,
              y1: turtle.y,
              x2: newX,
              y2: newY,
              color: turtle.penColor,
              width: turtle.penSize
            });
          }
          
          if (turtle.filling) {
            turtle.fillPath.push({ x: newX, y: newY });
          }
          
          turtle.x = newX;
          turtle.y = newY;
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
          resolve();
          break;
          
        case 'fillcolor':
          turtle.fillColor = cmd.value;
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
          // Speed is handled by the animation delay
          resolve();
          break;
          
        case 'circle': {
          const r = cmd.value;
          const steps = Math.abs(r) < 50 ? 36 : 72;
          const angleStep = (r > 0 ? 1 : -1) * 360 / steps;
          const arcLength = 2 * Math.PI * Math.abs(r) / steps;
          
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
                x1: turtle.x,
                y1: turtle.y,
                x2: newX,
                y2: newY,
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
              x1: turtle.x,
              y1: turtle.y,
              x2: cmd.x,
              y2: cmd.y,
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
    setIsPlaying(true);
    setIsPaused(false);
    
    const startStep = currentStep < 0 ? 0 : currentStep;
    
    for (let i = startStep; i < commands.length; i++) {
      // Check if paused or stopped
      if (!isPlaying && !isPaused) {
        break;
      }
      
      const cmd = commands[i];
      setCurrentStep(i);
      if (onLineHighlight) onLineHighlight(cmd.line);
      
      await executeCommand(cmd, true);
    }
    
    setIsPlaying(false);
    if (onLineHighlight) onLineHighlight(-1);
  }, [commands, currentStep, isPlaying, isPaused, executeCommand, onLineHighlight]);
  
  // Run instantly (no animation)
  const runInstant = useCallback(async () => {
    resetTurtle();
    
    for (const cmd of commands) {
      await executeCommand(cmd, false);
    }
  }, [commands, executeCommand, resetTurtle]);
  
  // Initial draw
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);
  
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Canvas */}
      <div className="bg-white rounded-lg shadow-lg p-2">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border border-gray-300 rounded"
        />
      </div>
      
      {/* Controls */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <Button
          size="sm"
          variant="outline"
          onClick={resetTurtle}
          className="bg-gray-700 border-gray-600 hover:bg-gray-600"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          onClick={isPlaying ? () => setIsPaused(true) : play}
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
      
      {/* Status */}
      <div className="text-xs text-gray-500">
        {isPlaying ? `Running step ${currentStep + 1}/${commands.length}` : 
         commands.length > 0 ? `${commands.length} commands ready` : 'No commands parsed'}
      </div>
    </div>
  );
}
