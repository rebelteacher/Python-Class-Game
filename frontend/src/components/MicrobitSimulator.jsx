import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, RotateCcw } from "lucide-react";

// Predefined Micro:bit images (5x5 LED patterns)
const MICROBIT_IMAGES = {
  HEART: [
    [0,1,0,1,0],
    [1,1,1,1,1],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [0,0,1,0,0]
  ],
  HEART_SMALL: [
    [0,0,0,0,0],
    [0,1,0,1,0],
    [0,1,1,1,0],
    [0,0,1,0,0],
    [0,0,0,0,0]
  ],
  HAPPY: [
    [0,0,0,0,0],
    [0,1,0,1,0],
    [0,0,0,0,0],
    [1,0,0,0,1],
    [0,1,1,1,0]
  ],
  SAD: [
    [0,0,0,0,0],
    [0,1,0,1,0],
    [0,0,0,0,0],
    [0,1,1,1,0],
    [1,0,0,0,1]
  ],
  ANGRY: [
    [1,0,0,0,1],
    [0,1,0,1,0],
    [0,0,0,0,0],
    [1,1,1,1,1],
    [1,0,1,0,1]
  ],
  CONFUSED: [
    [0,0,0,0,0],
    [0,1,0,1,0],
    [0,0,0,0,0],
    [0,1,0,1,0],
    [1,0,1,0,1]
  ],
  ASLEEP: [
    [0,0,0,0,0],
    [1,1,0,1,1],
    [0,0,0,0,0],
    [0,1,1,1,0],
    [0,0,0,0,0]
  ],
  SURPRISED: [
    [0,1,0,1,0],
    [0,0,0,0,0],
    [0,0,1,0,0],
    [0,1,0,1,0],
    [0,0,1,0,0]
  ],
  YES: [
    [0,0,0,0,0],
    [0,0,0,0,1],
    [0,0,0,1,0],
    [1,0,1,0,0],
    [0,1,0,0,0]
  ],
  NO: [
    [1,0,0,0,1],
    [0,1,0,1,0],
    [0,0,1,0,0],
    [0,1,0,1,0],
    [1,0,0,0,1]
  ],
  ARROW_N: [
    [0,0,1,0,0],
    [0,1,1,1,0],
    [1,0,1,0,1],
    [0,0,1,0,0],
    [0,0,1,0,0]
  ],
  ARROW_S: [
    [0,0,1,0,0],
    [0,0,1,0,0],
    [1,0,1,0,1],
    [0,1,1,1,0],
    [0,0,1,0,0]
  ],
  ARROW_E: [
    [0,0,1,0,0],
    [0,0,0,1,0],
    [1,1,1,1,1],
    [0,0,0,1,0],
    [0,0,1,0,0]
  ],
  ARROW_W: [
    [0,0,1,0,0],
    [0,1,0,0,0],
    [1,1,1,1,1],
    [0,1,0,0,0],
    [0,0,1,0,0]
  ],
  DUCK: [
    [0,1,1,0,0],
    [1,1,1,0,0],
    [0,1,1,1,1],
    [0,1,1,1,0],
    [0,0,0,0,0]
  ],
  HOUSE: [
    [0,0,1,0,0],
    [0,1,1,1,0],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [0,1,0,1,0]
  ],
  SKULL: [
    [0,1,1,1,0],
    [1,0,1,0,1],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [0,1,1,1,0]
  ],
  UMBRELLA: [
    [0,1,1,1,0],
    [1,1,1,1,1],
    [0,0,1,0,0],
    [1,0,1,0,0],
    [0,1,1,0,0]
  ],
  SNAKE: [
    [1,1,0,0,0],
    [1,1,0,1,1],
    [0,1,0,1,0],
    [0,1,1,1,0],
    [0,0,0,0,0]
  ],
  RABBIT: [
    [1,0,1,0,0],
    [1,0,1,0,0],
    [1,1,1,1,0],
    [1,1,0,1,0],
    [1,1,1,1,0]
  ],
  GIRAFFE: [
    [1,1,0,0,0],
    [0,1,0,0,0],
    [0,1,0,0,0],
    [0,1,1,1,0],
    [0,1,0,1,0]
  ],
  SWORD: [
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,1,1,1,0],
    [0,0,1,0,0]
  ],
  TARGET: [
    [0,0,1,0,0],
    [0,1,1,1,0],
    [1,1,0,1,1],
    [0,1,1,1,0],
    [0,0,1,0,0]
  ]
};

// Character patterns for letters and numbers
const CHAR_PATTERNS = {
  'A': [[0,1,1,1,0],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  'B': [[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0]],
  'C': [[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,1]],
  'D': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
  'E': [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,1,1,1,1]],
  'F': [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0]],
  'G': [[0,1,1,1,0],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[0,1,1,1,0]],
  'H': [[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  'I': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
  'J': [[0,0,1,1,1],[0,0,0,1,0],[0,0,0,1,0],[1,0,0,1,0],[0,1,1,0,0]],
  'K': [[1,0,0,0,1],[1,0,0,1,0],[1,1,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  'L': [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  'M': [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'N': [[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1]],
  'O': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'P': [[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0]],
  'Q': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,1,0],[0,1,1,0,1]],
  'R': [[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,1,0],[1,0,0,0,1]],
  'S': [[0,1,1,1,1],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]],
  'T': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  'U': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'V': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
  'W': [[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
  'X': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]],
  'Y': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  'Z': [[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],
  '0': [[0,1,1,1,0],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[0,1,1,1,0]],
  '1': [[0,0,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],
  '2': [[0,1,1,1,0],[1,0,0,0,1],[0,0,1,1,0],[0,1,0,0,0],[1,1,1,1,1]],
  '3': [[1,1,1,1,0],[0,0,0,0,1],[0,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]],
  '4': [[1,0,0,1,0],[1,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,0,1,0]],
  '5': [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]],
  '6': [[0,1,1,1,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[0,1,1,1,0]],
  '7': [[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0]],
  '8': [[0,1,1,1,0],[1,0,0,0,1],[0,1,1,1,0],[1,0,0,0,1],[0,1,1,1,0]],
  '9': [[0,1,1,1,0],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,1,1,1,0]],
  ' ': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  '!': [[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,1,0,0]],
  '?': [[0,1,1,1,0],[1,0,0,0,1],[0,0,1,1,0],[0,0,0,0,0],[0,0,1,0,0]],
  '-': [[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0]],
  '<': [[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0]],
  '>': [[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0]],
};

// Empty 5x5 grid
const EMPTY_GRID = [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]];

export default function MicrobitSimulator({ code, onButtonPress }) {
  const [leds, setLeds] = useState(EMPTY_GRID);
  const [isRunning, setIsRunning] = useState(false);
  const [buttonAPressed, setButtonAPressed] = useState(false);
  const [buttonBPressed, setButtonBPressed] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState([]);
  const runningRef = useRef(false);
  const commandQueueRef = useRef([]);

  // Parse the code and extract display commands
  const parseCode = useCallback((pythonCode) => {
    const commands = [];
    const lines = pythonCode.split('\n');
    
    let inWhileLoop = false;
    let whileLoopCommands = [];
    let indentLevel = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '') continue;
      
      // Detect while True loop
      if (trimmed.includes('while True:') || trimmed.includes('while true:')) {
        inWhileLoop = true;
        indentLevel = line.search(/\S/);
        continue;
      }
      
      // Check if we're inside the while loop
      const currentIndent = line.search(/\S/);
      if (inWhileLoop && currentIndent <= indentLevel && trimmed !== '') {
        inWhileLoop = false;
      }
      
      // Parse display commands
      if (trimmed.includes('display.show(')) {
        const match = trimmed.match(/display\.show\((.*?)\)/);
        if (match) {
          const arg = match[1].trim();
          commands.push({ type: 'show', arg, loop: inWhileLoop });
        }
      }
      
      if (trimmed.includes('display.scroll(')) {
        const match = trimmed.match(/display\.scroll\((.*?)\)/);
        if (match) {
          const arg = match[1].trim();
          commands.push({ type: 'scroll', arg, loop: inWhileLoop });
        }
      }
      
      if (trimmed.includes('display.clear()')) {
        commands.push({ type: 'clear', loop: inWhileLoop });
      }
      
      if (trimmed.includes('sleep(')) {
        const match = trimmed.match(/sleep\((\d+)\)/);
        if (match) {
          commands.push({ type: 'sleep', duration: parseInt(match[1]), loop: inWhileLoop });
        }
      }
      
      if (trimmed.includes('print(')) {
        const match = trimmed.match(/print\((.*?)\)/);
        if (match) {
          commands.push({ type: 'print', arg: match[1], loop: inWhileLoop });
        }
      }
    }
    
    return commands;
  }, []);

  // Get LED pattern for a value
  const getPattern = (value) => {
    // Check for Image.NAME pattern
    const imageMatch = value.match(/Image\.(\w+)/);
    if (imageMatch) {
      const imageName = imageMatch[1];
      if (MICROBIT_IMAGES[imageName]) {
        return MICROBIT_IMAGES[imageName];
      }
    }
    
    // Check for string literal
    const stringMatch = value.match(/['"](.)['"]/);
    if (stringMatch) {
      const char = stringMatch[1].toUpperCase();
      if (CHAR_PATTERNS[char]) {
        return CHAR_PATTERNS[char];
      }
    }
    
    // Check for number
    const numMatch = value.match(/^(\d)$/);
    if (numMatch) {
      const char = numMatch[1];
      if (CHAR_PATTERNS[char]) {
        return CHAR_PATTERNS[char];
      }
    }
    
    // Check for variable that might be a number
    if (!isNaN(parseInt(value))) {
      const char = String(Math.abs(parseInt(value)) % 10);
      if (CHAR_PATTERNS[char]) {
        return CHAR_PATTERNS[char];
      }
    }
    
    return null;
  };

  // Execute commands
  const executeCommands = useCallback(async (commands) => {
    runningRef.current = true;
    setConsoleOutput([]);
    
    const hasLoop = commands.some(cmd => cmd.loop);
    let iterations = hasLoop ? 5 : 1; // Run loop 5 times for demo
    
    for (let i = 0; i < iterations && runningRef.current; i++) {
      for (const cmd of commands) {
        if (!runningRef.current) break;
        
        switch (cmd.type) {
          case 'show':
            const pattern = getPattern(cmd.arg);
            if (pattern) {
              setLeds([...pattern]);
            }
            break;
            
          case 'scroll':
            // Extract text from quotes
            const textMatch = cmd.arg.match(/['"](.+?)['"]/);
            if (textMatch) {
              const text = textMatch[1].toUpperCase();
              for (const char of text) {
                if (!runningRef.current) break;
                const charPattern = CHAR_PATTERNS[char] || EMPTY_GRID;
                setLeds([...charPattern]);
                await new Promise(r => setTimeout(r, 400));
              }
            }
            break;
            
          case 'clear':
            setLeds([...EMPTY_GRID]);
            break;
            
          case 'sleep':
            await new Promise(r => setTimeout(r, cmd.duration));
            break;
            
          case 'print':
            setConsoleOutput(prev => [...prev, cmd.arg.replace(/['"]/g, '')]);
            break;
        }
        
        // Small delay between commands
        if (cmd.type !== 'sleep') {
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }
    
    runningRef.current = false;
    setIsRunning(false);
  }, []);

  const handleRun = () => {
    if (isRunning) {
      runningRef.current = false;
      setIsRunning(false);
      return;
    }
    
    setIsRunning(true);
    const commands = parseCode(code);
    executeCommands(commands);
  };

  const handleReset = () => {
    runningRef.current = false;
    setIsRunning(false);
    setLeds([...EMPTY_GRID]);
    setConsoleOutput([]);
  };

  const handleButtonA = () => {
    setButtonAPressed(true);
    setTimeout(() => setButtonAPressed(false), 200);
    if (onButtonPress) onButtonPress('A');
  };

  const handleButtonB = () => {
    setButtonBPressed(true);
    setTimeout(() => setButtonBPressed(false), 200);
    if (onButtonPress) onButtonPress('B');
  };

  return (
    <Card className="bg-gray-900 text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-cyan-400">⚡</span>
            Virtual Micro:bit
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="h-7 px-2 text-xs bg-gray-800 border-gray-600 hover:bg-gray-700"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleRun}
              className={`h-7 px-3 text-xs ${isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isRunning ? (
                <>
                  <Square className="w-3 h-3 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Run
                </>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Micro:bit Board */}
        <div className="flex justify-center">
          <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-4 border-2 border-gray-700 shadow-lg" style={{ width: '200px' }}>
            {/* Top edge connector */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-3 h-2 bg-yellow-600 rounded-b" />
              ))}
            </div>
            
            {/* Button A */}
            <button
              onClick={handleButtonA}
              className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full border-2 transition-all ${
                buttonAPressed 
                  ? 'bg-gray-500 border-gray-400 scale-95' 
                  : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
              }`}
            >
              <span className="text-xs font-bold text-gray-300">A</span>
            </button>
            
            {/* LED Matrix */}
            <div className="flex justify-center">
              <div className="grid grid-cols-5 gap-1 p-2 bg-black rounded-lg">
                {leds.map((row, rowIndex) =>
                  row.map((led, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`w-4 h-4 rounded-sm transition-all duration-100 ${
                        led > 0 
                          ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' 
                          : 'bg-red-950'
                      }`}
                    />
                  ))
                )}
              </div>
            </div>
            
            {/* Button B */}
            <button
              onClick={handleButtonB}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full border-2 transition-all ${
                buttonBPressed 
                  ? 'bg-gray-500 border-gray-400 scale-95' 
                  : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
              }`}
            >
              <span className="text-xs font-bold text-gray-300">B</span>
            </button>
            
            {/* Bottom edge connector */}
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex gap-2">
              <div className="w-4 h-3 bg-yellow-600 rounded-t text-center text-[6px] text-gray-900 font-bold">0</div>
              <div className="w-4 h-3 bg-yellow-600 rounded-t text-center text-[6px] text-gray-900 font-bold">1</div>
              <div className="w-4 h-3 bg-yellow-600 rounded-t text-center text-[6px] text-gray-900 font-bold">2</div>
              <div className="w-6 h-3 bg-yellow-600 rounded-t text-center text-[6px] text-gray-900 font-bold">3V</div>
              <div className="w-6 h-3 bg-yellow-600 rounded-t text-center text-[6px] text-gray-900 font-bold">GND</div>
            </div>
            
            {/* USB port indicator */}
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-gray-600 rounded" />
            
            {/* Micro:bit logo */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-[8px] text-gray-500 font-bold">
              micro:bit
            </div>
          </div>
        </div>
        
        {/* Console Output */}
        {consoleOutput.length > 0 && (
          <div className="mt-3 p-2 bg-black rounded text-xs font-mono text-green-400 max-h-16 overflow-y-auto">
            {consoleOutput.map((line, i) => (
              <div key={i}>&gt; {line}</div>
            ))}
          </div>
        )}
        
        {/* Help text */}
        <p className="text-xs text-gray-400 mt-3 text-center">
          Click Run to simulate your code • Click A/B buttons to test input
        </p>
      </CardContent>
    </Card>
  );
}
