import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Plus, Trash2 } from "lucide-react";

// Sprite Canvas Component - Displays and animates sprites based on block commands
const SpriteCanvas = forwardRef(({ 
  width = 480, 
  height = 360, 
  backgroundColor = "#87CEEB",
  onSpriteClick,
  initialSprites = []
}, ref) => {
  const canvasRef = useRef(null);
  const [sprites, setSprites] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSprite, setSelectedSprite] = useState(null);
  const animationRef = useRef(null);
  const commandQueueRef = useRef([]);

  // Initialize default sprite
  useEffect(() => {
    if (initialSprites.length > 0) {
      setSprites(initialSprites);
    } else {
      // Default sprite (rocket for space theme)
      setSprites([{
        id: "sprite-1",
        name: "Rocket",
        x: width / 2,
        y: height / 2,
        direction: 0, // 0 = right, 90 = up, 180 = left, 270 = down
        size: 50,
        visible: true,
        costume: "🚀",
        color: "#3B82F6",
        type: "emoji",
        penDown: false,
        penColor: "#000000",
        penSize: 2,
        sayText: "",
        sayTimeout: null
      }]);
    }
  }, [initialSprites, width, height]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    runCommands: (commands) => executeCommands(commands),
    stop: () => stopExecution(),
    reset: () => resetCanvas(),
    addSprite: (sprite) => addSprite(sprite),
    removeSprite: (id) => removeSprite(id),
    getSprites: () => sprites,
    setSelectedSprite: (id) => setSelectedSprite(id)
  }));

  // Draw the canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear and draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid (optional, helps with positioning)
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw sprites
    sprites.forEach(sprite => {
      if (!sprite.visible) return;
      
      ctx.save();
      ctx.translate(sprite.x, sprite.y);
      ctx.rotate((sprite.direction - 90) * Math.PI / 180); // Adjust so 0 = right
      
      if (sprite.type === "emoji") {
        ctx.font = `${sprite.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sprite.costume, 0, 0);
      } else if (sprite.type === "shape") {
        ctx.fillStyle = sprite.color;
        ctx.beginPath();
        ctx.arc(0, 0, sprite.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (sprite.type === "image" && sprite.imageData) {
        // Draw custom image
        const img = new Image();
        img.src = sprite.imageData;
        ctx.drawImage(img, -sprite.size/2, -sprite.size/2, sprite.size, sprite.size);
      }
      
      ctx.restore();
      
      // Draw selection indicator
      if (selectedSprite === sprite.id) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(sprite.x - sprite.size/2 - 5, sprite.y - sprite.size/2 - 5, 
                       sprite.size + 10, sprite.size + 10);
        ctx.setLineDash([]);
      }
      
      // Draw say bubble
      if (sprite.sayText) {
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        const textWidth = ctx.measureText(sprite.sayText).width;
        const bubbleWidth = Math.max(textWidth + 20, 60);
        const bubbleHeight = 30;
        const bubbleX = sprite.x - bubbleWidth / 2;
        const bubbleY = sprite.y - sprite.size / 2 - bubbleHeight - 10;
        
        // Draw bubble
        ctx.beginPath();
        ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 10);
        ctx.fill();
        ctx.stroke();
        
        // Draw text
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(sprite.sayText, sprite.x, bubbleY + bubbleHeight / 2 + 5);
      }
    });
  }, [sprites, selectedSprite, backgroundColor, width, height]);

  // Redraw when sprites change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Execute commands
  const executeCommands = async (commands) => {
    setIsRunning(true);
    commandQueueRef.current = [...commands];
    
    for (const cmd of commands) {
      if (!isRunning) break;
      await executeCommand(cmd);
      await sleep(50); // Small delay between commands
    }
    
    setIsRunning(false);
  };

  const executeCommand = async (cmd) => {
    const spriteId = cmd.spriteId || sprites[0]?.id;
    
    setSprites(prev => prev.map(sprite => {
      if (sprite.id !== spriteId) return sprite;
      
      switch (cmd.type) {
        case 'move':
          const radians = (sprite.direction - 90) * Math.PI / 180;
          return {
            ...sprite,
            x: sprite.x + cmd.value * Math.cos(radians),
            y: sprite.y + cmd.value * Math.sin(radians)
          };
        
        case 'turn_right':
          return { ...sprite, direction: (sprite.direction + cmd.value) % 360 };
        
        case 'turn_left':
          return { ...sprite, direction: (sprite.direction - cmd.value + 360) % 360 };
        
        case 'goto':
          return { ...sprite, x: cmd.x, y: cmd.y };
        
        case 'set_x':
          return { ...sprite, x: cmd.value };
        
        case 'set_y':
          return { ...sprite, y: cmd.value };
        
        case 'point_direction':
          return { ...sprite, direction: cmd.value };
        
        case 'change_size':
          return { ...sprite, size: Math.max(10, sprite.size + cmd.value) };
        
        case 'set_size':
          return { ...sprite, size: Math.max(10, cmd.value) };
        
        case 'show':
          return { ...sprite, visible: true };
        
        case 'hide':
          return { ...sprite, visible: false };
        
        case 'set_costume':
          return { ...sprite, costume: cmd.value };
        
        case 'say':
          return { ...sprite, sayText: cmd.value };
        
        case 'say_clear':
          return { ...sprite, sayText: "" };
        
        default:
          return sprite;
      }
    }));
    
    // Handle glide (smooth movement)
    if (cmd.type === 'glide') {
      await glideSprite(spriteId, cmd.x, cmd.y, cmd.duration || 1);
    }
  };

  const glideSprite = async (spriteId, targetX, targetY, duration) => {
    const sprite = sprites.find(s => s.id === spriteId);
    if (!sprite) return;
    
    const startX = sprite.x;
    const startY = sprite.y;
    const steps = duration * 60; // 60fps
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const newX = startX + (targetX - startX) * progress;
      const newY = startY + (targetY - startY) * progress;
      
      setSprites(prev => prev.map(s => 
        s.id === spriteId ? { ...s, x: newX, y: newY } : s
      ));
      
      await sleep(1000 / 60);
    }
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const stopExecution = () => {
    setIsRunning(false);
    commandQueueRef.current = [];
  };

  const resetCanvas = () => {
    stopExecution();
    setSprites([{
      id: "sprite-1",
      name: "Rocket",
      x: width / 2,
      y: height / 2,
      direction: 0,
      size: 50,
      visible: true,
      costume: "🚀",
      color: "#3B82F6",
      type: "emoji",
      penDown: false,
      penColor: "#000000",
      penSize: 2,
      sayText: ""
    }]);
  };

  const addSprite = (spriteConfig) => {
    const newSprite = {
      id: `sprite-${Date.now()}`,
      name: spriteConfig.name || "Sprite",
      x: spriteConfig.x || width / 2,
      y: spriteConfig.y || height / 2,
      direction: 0,
      size: spriteConfig.size || 50,
      visible: true,
      costume: spriteConfig.costume || spriteConfig.emoji || "⭐",
      color: spriteConfig.color || "#3B82F6",
      type: spriteConfig.type || "emoji",
      imageData: spriteConfig.imageData,
      penDown: false,
      penColor: "#000000",
      penSize: 2,
      sayText: ""
    };
    setSprites(prev => [...prev, newSprite]);
    return newSprite.id;
  };

  const removeSprite = (id) => {
    setSprites(prev => prev.filter(s => s.id !== id));
    if (selectedSprite === id) {
      setSelectedSprite(null);
    }
  };

  // Handle canvas click for sprite selection
  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicked on a sprite
    const clickedSprite = sprites.find(sprite => {
      const dx = x - sprite.x;
      const dy = y - sprite.y;
      return Math.sqrt(dx*dx + dy*dy) < sprite.size / 2;
    });
    
    if (clickedSprite) {
      setSelectedSprite(clickedSprite.id);
      onSpriteClick?.(clickedSprite);
    } else {
      setSelectedSprite(null);
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        className="border border-gray-300 rounded-lg cursor-pointer"
        style={{ backgroundColor }}
      />
      
      {/* Controls overlay */}
      <div className="absolute top-2 right-2 flex gap-1">
        {isRunning ? (
          <Button size="sm" variant="destructive" onClick={stopExecution}>
            <Pause className="w-4 h-4" />
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={resetCanvas}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Sprite list */}
      <div className="absolute bottom-2 left-2 flex gap-1 bg-white/80 rounded p-1">
        {sprites.map(sprite => (
          <div
            key={sprite.id}
            onClick={() => setSelectedSprite(sprite.id)}
            className={`w-10 h-10 flex items-center justify-center border-2 rounded cursor-pointer ${
              selectedSprite === sprite.id ? 'border-yellow-400' : 'border-gray-300'
            }`}
          >
            {sprite.type === "emoji" ? sprite.costume : (
              <div 
                className="w-6 h-6 rounded-full" 
                style={{ backgroundColor: sprite.color }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

SpriteCanvas.displayName = "SpriteCanvas";

export default SpriteCanvas;
