import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Target, Square, Circle, Undo, Download, Upload } from "lucide-react";

// Preset maze templates
const PRESET_MAZES = {
  simple: {
    name: "Simple Maze",
    walls: [
      [-150, 150, 150, 150],   // Top
      [-150, -150, 150, -150], // Bottom
      [-150, 150, -150, -150], // Left
      [150, 150, 150, -150],   // Right
      [-50, 150, -50, 50],     // Internal wall 1
      [50, -150, 50, -50],     // Internal wall 2
    ],
    goals: [{ x: 100, y: -100, radius: 20, label: "🏁" }],
    startPosition: { x: -100, y: 100 }
  },
  spiral: {
    name: "Spiral Maze",
    walls: [
      [-180, 180, 180, 180],   // Outer top
      [-180, -180, 180, -180], // Outer bottom
      [-180, 180, -180, -180], // Outer left
      [180, 180, 180, -60],    // Outer right partial
      [-120, 120, 120, 120],   // Ring 1 top
      [-120, -120, 120, -120], // Ring 1 bottom
      [-120, 120, -120, -60],  // Ring 1 left
      [120, 60, 120, -120],    // Ring 1 right partial
      [-60, 60, 60, 60],       // Ring 2 top
      [-60, -60, 0, -60],      // Ring 2 bottom partial
    ],
    goals: [{ x: 0, y: 0, radius: 25, label: "🏁" }],
    startPosition: { x: -150, y: 150 }
  },
  race: {
    name: "Race Track",
    track: [
      { x: -150, y: 0 },
      { x: -100, y: 100 },
      { x: 0, y: 120 },
      { x: 100, y: 100 },
      { x: 150, y: 0 },
      { x: 100, y: -100 },
      { x: 0, y: -120 },
      { x: -100, y: -100 },
    ],
    closedTrack: true,
    trackWidth: 50,
    trackColor: "#555",
    goals: [
      { x: -150, y: 0, radius: 15, label: "1" },
      { x: 150, y: 0, radius: 15, label: "2" },
    ],
    checkpoints: [
      { x: 0, y: 120, radius: 10 },
      { x: 0, y: -120, radius: 10 },
    ]
  }
};

export default function MazeBuilder({ 
  width = 400, 
  height = 400,
  initialData = null,
  onChange = null 
}) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("wall"); // "wall", "goal", "checkpoint", "erase"
  const [walls, setWalls] = useState(initialData?.walls || []);
  const [goals, setGoals] = useState(initialData?.goals || []);
  const [checkpoints, setCheckpoints] = useState(initialData?.checkpoints || []);
  const [backgroundType, setBackgroundType] = useState(initialData?.backgroundType || "maze");
  const [backgroundColor, setBackgroundColor] = useState(initialData?.backgroundColor || "#f0f9ff");
  const [wallColor, setWallColor] = useState("#1e3a5f");
  const [wallWidth, setWallWidth] = useState(6);
  const [goalRadius, setGoalRadius] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [history, setHistory] = useState([]);

  // Convert canvas coordinates to turtle coordinates
  const toTurtleCoords = useCallback((canvasX, canvasY) => ({
    x: canvasX - width / 2,
    y: height / 2 - canvasY
  }), [width, height]);

  // Convert turtle coordinates to canvas coordinates
  const toCanvasCoords = useCallback((x, y) => ({
    x: width / 2 + x,
    y: height / 2 - y
  }), [width, height]);

  // Draw the canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    const gridSize = 20;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Axes
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    
    // Draw walls
    ctx.strokeStyle = wallColor;
    ctx.lineWidth = wallWidth;
    ctx.lineCap = 'round';
    for (const wall of walls) {
      const [x1, y1, x2, y2] = wall;
      const start = toCanvasCoords(x1, y1);
      const end = toCanvasCoords(x2, y2);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
    
    // Draw checkpoints
    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      const pos = toCanvasCoords(cp.x, cp.y);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, cp.radius || 10, 0, Math.PI * 2);
      ctx.fillStyle = '#60a5fa';
      ctx.fill();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Draw goals
    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      const pos = toCanvasCoords(goal.x, goal.y);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, goal.radius || goalRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(goal.label || `${i + 1}`, pos.x, pos.y);
    }
    
    // Draw current line being drawn
    if (isDrawing && startPoint && tool === "wall") {
      ctx.strokeStyle = wallColor;
      ctx.lineWidth = wallWidth;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      const start = toCanvasCoords(startPoint.x, startPoint.y);
      ctx.moveTo(start.x, start.y);
      // This would need current mouse position, but for simplicity we'll handle in mouse events
      ctx.setLineDash([]);
    }
    
    // Origin marker (turtle start position)
    const origin = toCanvasCoords(0, 0);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y - 10);
    ctx.lineTo(origin.x + 8, origin.y + 8);
    ctx.lineTo(origin.x - 8, origin.y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('START', origin.x, origin.y + 20);
    
  }, [walls, goals, checkpoints, backgroundColor, wallColor, wallWidth, goalRadius, width, height, toCanvasCoords, isDrawing, startPoint, tool]);

  // Handle mouse events
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const turtleCoords = toTurtleCoords(canvasX, canvasY);
    
    // Snap to grid
    const snapX = Math.round(turtleCoords.x / 10) * 10;
    const snapY = Math.round(turtleCoords.y / 10) * 10;
    
    if (tool === "wall") {
      setIsDrawing(true);
      setStartPoint({ x: snapX, y: snapY });
    } else if (tool === "goal") {
      saveHistory();
      setGoals([...goals, { x: snapX, y: snapY, radius: goalRadius, label: `${goals.length + 1}` }]);
    } else if (tool === "checkpoint") {
      saveHistory();
      setCheckpoints([...checkpoints, { x: snapX, y: snapY, radius: 10 }]);
    } else if (tool === "erase") {
      // Find and remove nearest element
      eraseAt(snapX, snapY);
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing || tool !== "wall") return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const turtleCoords = toTurtleCoords(canvasX, canvasY);
    
    // Snap to grid
    const snapX = Math.round(turtleCoords.x / 10) * 10;
    const snapY = Math.round(turtleCoords.y / 10) * 10;
    
    if (startPoint && (startPoint.x !== snapX || startPoint.y !== snapY)) {
      saveHistory();
      setWalls([...walls, [startPoint.x, startPoint.y, snapX, snapY]]);
    }
    
    setIsDrawing(false);
    setStartPoint(null);
  };

  const eraseAt = (x, y) => {
    const threshold = 20;
    
    // Check goals
    const goalIndex = goals.findIndex(g => 
      Math.sqrt((g.x - x) ** 2 + (g.y - y) ** 2) < threshold
    );
    if (goalIndex >= 0) {
      saveHistory();
      setGoals(goals.filter((_, i) => i !== goalIndex));
      return;
    }
    
    // Check checkpoints
    const cpIndex = checkpoints.findIndex(cp => 
      Math.sqrt((cp.x - x) ** 2 + (cp.y - y) ** 2) < threshold
    );
    if (cpIndex >= 0) {
      saveHistory();
      setCheckpoints(checkpoints.filter((_, i) => i !== cpIndex));
      return;
    }
    
    // Check walls (distance to line segment)
    const wallIndex = walls.findIndex(([x1, y1, x2, y2]) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      let t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lenSq));
      const closestX = x1 + t * dx;
      const closestY = y1 + t * dy;
      const dist = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);
      return dist < threshold;
    });
    if (wallIndex >= 0) {
      saveHistory();
      setWalls(walls.filter((_, i) => i !== wallIndex));
    }
  };

  const saveHistory = () => {
    setHistory([...history, { walls: [...walls], goals: [...goals], checkpoints: [...checkpoints] }]);
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setWalls(prev.walls);
    setGoals(prev.goals);
    setCheckpoints(prev.checkpoints);
    setHistory(history.slice(0, -1));
  };

  const clearAll = () => {
    saveHistory();
    setWalls([]);
    setGoals([]);
    setCheckpoints([]);
  };

  const loadPreset = (presetKey) => {
    const preset = PRESET_MAZES[presetKey];
    if (!preset) return;
    
    saveHistory();
    setWalls(preset.walls || []);
    setGoals(preset.goals || []);
    setCheckpoints(preset.checkpoints || []);
    if (preset.track) {
      setBackgroundType("raceway");
    } else {
      setBackgroundType("maze");
    }
  };

  const exportData = () => {
    const data = {
      backgroundType,
      backgroundColor,
      walls,
      goals,
      checkpoints,
      wallColor,
      wallWidth
    };
    return data;
  };

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      onChange(exportData());
    }
  }, [walls, goals, checkpoints, backgroundType, backgroundColor, wallColor, wallWidth]);

  // Redraw when data changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-100 rounded-lg">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={tool === "wall" ? "default" : "outline"}
            onClick={() => setTool("wall")}
            title="Draw Wall"
          >
            <Square className="w-4 h-4 mr-1" />
            Wall
          </Button>
          <Button
            size="sm"
            variant={tool === "goal" ? "default" : "outline"}
            onClick={() => setTool("goal")}
            title="Place Goal"
            className={tool === "goal" ? "bg-yellow-600" : ""}
          >
            <Target className="w-4 h-4 mr-1" />
            Goal
          </Button>
          <Button
            size="sm"
            variant={tool === "checkpoint" ? "default" : "outline"}
            onClick={() => setTool("checkpoint")}
            title="Place Checkpoint"
            className={tool === "checkpoint" ? "bg-blue-600" : ""}
          >
            <Circle className="w-4 h-4 mr-1" />
            Checkpoint
          </Button>
          <Button
            size="sm"
            variant={tool === "erase" ? "default" : "outline"}
            onClick={() => setTool("erase")}
            title="Erase"
            className={tool === "erase" ? "bg-red-600" : ""}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Erase
          </Button>
        </div>
        
        <div className="h-6 w-px bg-gray-300" />
        
        <Button size="sm" variant="outline" onClick={undo} disabled={history.length === 0}>
          <Undo className="w-4 h-4 mr-1" />
          Undo
        </Button>
        
        <Button size="sm" variant="outline" onClick={clearAll}>
          Clear All
        </Button>
        
        <div className="h-6 w-px bg-gray-300" />
        
        <Select value="" onValueChange={loadPreset}>
          <SelectTrigger className="w-36 h-8">
            <SelectValue placeholder="Load Preset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="simple">Simple Maze</SelectItem>
            <SelectItem value="spiral">Spiral Maze</SelectItem>
            <SelectItem value="race">Race Track</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Canvas */}
      <div className="flex gap-4">
        <div className="bg-white rounded-lg shadow p-2">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="border border-gray-300 rounded cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setIsDrawing(false);
              setStartPoint(null);
            }}
          />
        </div>
        
        {/* Settings Panel */}
        <div className="w-48 space-y-4">
          <div>
            <Label className="text-sm">Wall Color</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="color"
                value={wallColor}
                onChange={(e) => setWallColor(e.target.value)}
                className="w-12 h-8 p-1"
              />
              <Input
                value={wallColor}
                onChange={(e) => setWallColor(e.target.value)}
                className="flex-1 h-8 text-xs"
              />
            </div>
          </div>
          
          <div>
            <Label className="text-sm">Wall Width: {wallWidth}px</Label>
            <input
              type="range"
              min="2"
              max="20"
              value={wallWidth}
              onChange={(e) => setWallWidth(parseInt(e.target.value))}
              className="w-full mt-1"
            />
          </div>
          
          <div>
            <Label className="text-sm">Goal Radius: {goalRadius}px</Label>
            <input
              type="range"
              min="10"
              max="40"
              value={goalRadius}
              onChange={(e) => setGoalRadius(parseInt(e.target.value))}
              className="w-full mt-1"
            />
          </div>
          
          <div>
            <Label className="text-sm">Background</Label>
            <Input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="w-full h-8 mt-1"
            />
          </div>
          
          <div className="pt-4 border-t text-xs text-gray-500">
            <p><strong>Stats:</strong></p>
            <p>Walls: {walls.length}</p>
            <p>Goals: {goals.length}</p>
            <p>Checkpoints: {checkpoints.length}</p>
          </div>
          
          <div className="pt-2 text-xs text-gray-400">
            <p><strong>Tip:</strong> Click and drag to draw walls. Click to place goals/checkpoints.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
