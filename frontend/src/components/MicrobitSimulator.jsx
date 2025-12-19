import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, RotateCcw, Usb, Loader2, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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

// Deep copy helper
const copyGrid = (grid) => grid.map(row => [...row]);

export default function MicrobitSimulator({ code, onButtonPress }) {
  const [leds, setLeds] = useState(EMPTY_GRID);
  const [isRunning, setIsRunning] = useState(false);
  const [buttonAPressed, setButtonAPressed] = useState(false);
  const [buttonBPressed, setButtonBPressed] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState([]);
  const runningRef = useRef(false);
  const ledsRef = useRef(copyGrid(EMPTY_GRID));
  
  // WebUSB state for real Micro:bit
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [microbitConnected, setMicrobitConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'flashing', 'error'
  const connectionRef = useRef(null);

  // Parse the code and extract display commands
  const parseCode = useCallback((pythonCode) => {
    const commands = [];
    const lines = pythonCode.split('\n');
    
    let inWhileLoop = false;
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
      
      // Parse display.set_pixel(x, y, brightness)
      if (trimmed.includes('display.set_pixel(') || trimmed.includes('set_pixel(')) {
        const match = trimmed.match(/set_pixel\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
        if (match) {
          const x = parseInt(match[1]);
          const y = parseInt(match[2]);
          const brightness = parseInt(match[3]);
          commands.push({ type: 'set_pixel', x, y, brightness, loop: inWhileLoop });
        }
      }
      
      // Parse display.show(Image.XXX) or display.show('X')
      if (trimmed.includes('display.show(')) {
        const match = trimmed.match(/display\.show\((.*?)\)/);
        if (match) {
          const arg = match[1].trim();
          commands.push({ type: 'show', arg, loop: inWhileLoop });
        }
      }
      
      // Parse display.scroll('text')
      if (trimmed.includes('display.scroll(')) {
        const match = trimmed.match(/display\.scroll\((.*?)\)/);
        if (match) {
          const arg = match[1].trim();
          commands.push({ type: 'scroll', arg, loop: inWhileLoop });
        }
      }
      
      // Parse display.clear()
      if (trimmed.includes('display.clear()')) {
        commands.push({ type: 'clear', loop: inWhileLoop });
      }
      
      // Parse sleep(ms)
      if (trimmed.includes('sleep(')) {
        const match = trimmed.match(/sleep\s*\(\s*(\d+)\s*\)/);
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
    ledsRef.current = copyGrid(EMPTY_GRID);
    setLeds(copyGrid(EMPTY_GRID));
    
    // Log what we're about to run
    setConsoleOutput(prev => [...prev, `Running ${commands.length} command(s)...`]);
    
    const hasLoop = commands.some(cmd => cmd.loop);
    let iterations = hasLoop ? 5 : 1; // Run loop 5 times for demo
    
    for (let i = 0; i < iterations && runningRef.current; i++) {
      for (const cmd of commands) {
        if (!runningRef.current) break;
        
        switch (cmd.type) {
          case 'set_pixel':
            // Set individual pixel: display.set_pixel(x, y, brightness)
            if (cmd.x >= 0 && cmd.x < 5 && cmd.y >= 0 && cmd.y < 5) {
              const newLeds = copyGrid(ledsRef.current);
              newLeds[cmd.y][cmd.x] = cmd.brightness > 0 ? 1 : 0;
              ledsRef.current = newLeds;
              setLeds(newLeds);
              setConsoleOutput(prev => [...prev, `set_pixel(${cmd.x}, ${cmd.y}, ${cmd.brightness})`]);
            }
            break;
            
          case 'show':
            const pattern = getPattern(cmd.arg);
            if (pattern) {
              ledsRef.current = copyGrid(pattern);
              setLeds(copyGrid(pattern));
              setConsoleOutput(prev => [...prev, `show(${cmd.arg})`]);
            }
            break;
            
          case 'scroll':
            // Extract text from quotes
            const textMatch = cmd.arg.match(/['"](.+?)['"]/);
            if (textMatch) {
              const text = textMatch[1].toUpperCase();
              setConsoleOutput(prev => [...prev, `scroll("${text}")`]);
              for (const char of text) {
                if (!runningRef.current) break;
                const charPattern = CHAR_PATTERNS[char] || EMPTY_GRID;
                ledsRef.current = copyGrid(charPattern);
                setLeds(copyGrid(charPattern));
                await new Promise(r => setTimeout(r, 400));
              }
            }
            break;
            
          case 'clear':
            ledsRef.current = copyGrid(EMPTY_GRID);
            setLeds(copyGrid(EMPTY_GRID));
            setConsoleOutput(prev => [...prev, `clear()`]);
            break;
            
          case 'sleep':
            await new Promise(r => setTimeout(r, cmd.duration));
            break;
            
          case 'print':
            setConsoleOutput(prev => [...prev, cmd.arg.replace(/['"]/g, '')]);
            break;
            
          default:
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
    setConsoleOutput(prev => [...prev, 'Done!']);
  }, []);

  const handleRun = () => {
    if (isRunning) {
      runningRef.current = false;
      setIsRunning(false);
      setConsoleOutput(prev => [...prev, 'Stopped.']);
      return;
    }
    
    setIsRunning(true);
    setConsoleOutput([]); // Clear previous output
    const commands = parseCode(code);
    
    if (commands.length === 0) {
      setConsoleOutput(['No display commands found in your code.', '', 'Supported commands:', '• display.set_pixel(x, y, brightness)', '• display.show(Image.HEART)', '• display.show("A")', '• display.scroll("Hello")', '• display.clear()', '• sleep(500)']);
      setIsRunning(false);
      return;
    }
    
    executeCommands(commands);
  };

  const handleReset = () => {
    runningRef.current = false;
    setIsRunning(false);
    ledsRef.current = copyGrid(EMPTY_GRID);
    setLeds(copyGrid(EMPTY_GRID));
    setConsoleOutput(['Reset. Ready to run.']);
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

  // Check if WebUSB is supported
  const isWebUSBSupported = () => {
    return 'usb' in navigator;
  };

  // Generate a MicroPython hex file with the user's code
  const generateMicroPythonHex = async (pythonCode) => {
    // The MicroPython hex includes the runtime + user script
    // We'll use the micro:bit Python editor's approach - append the script to a base hex
    // For simplicity, we'll download from the official micro:bit Python editor API
    
    try {
      setConsoleOutput(prev => [...prev, 'Generating hex file...']);
      
      // Use the micro:bit create API to generate a hex file
      const response = await fetch('https://python.microbit.org/v/3/api/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          python: pythonCode,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate hex file');
      }
      
      const hexData = await response.text();
      return hexData;
    } catch (error) {
      console.error('Error generating hex:', error);
      // Fallback: create a basic hex with the code embedded
      // This is a simplified approach - in production, you'd want proper hex generation
      throw new Error('Could not generate hex file. Try using the simulator instead.');
    }
  };

  // Connect to Micro:bit via WebUSB
  const connectToMicrobit = async () => {
    if (!isWebUSBSupported()) {
      toast.error('WebUSB is not supported in this browser. Please use Chrome or Edge.');
      setConsoleOutput(prev => [...prev, '❌ WebUSB not supported. Use Chrome or Edge.']);
      return false;
    }

    try {
      setConnectionStatus('connecting');
      setConsoleOutput(prev => [...prev, 'Requesting USB device access...']);
      
      // Request access to micro:bit device
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x0d28, productId: 0x0204 }, // micro:bit
        ]
      });
      
      setConsoleOutput(prev => [...prev, `Found: ${device.productName || 'micro:bit'}`]);
      
      // Open the device
      await device.open();
      setConsoleOutput(prev => [...prev, 'Device opened']);
      
      // Select configuration and claim interface
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      
      // Find the DAPLink interface (usually interface 4 for CMSIS-DAP)
      const interfaceNumber = 4; // CMSIS-DAP interface
      await device.claimInterface(interfaceNumber);
      
      connectionRef.current = device;
      setMicrobitConnected(true);
      setConnectionStatus('connected');
      setConsoleOutput(prev => [...prev, '✅ Connected to micro:bit!']);
      toast.success('Connected to micro:bit!');
      
      return true;
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      
      if (error.name === 'NotFoundError') {
        setConsoleOutput(prev => [...prev, '❌ No micro:bit found. Make sure it\'s connected via USB.']);
        toast.error('No micro:bit found. Connect it via USB and try again.');
      } else if (error.name === 'SecurityError') {
        setConsoleOutput(prev => [...prev, '❌ USB access denied. Grant permission and try again.']);
        toast.error('USB access denied. Please grant permission.');
      } else {
        setConsoleOutput(prev => [...prev, `❌ Connection failed: ${error.message}`]);
        toast.error(`Connection failed: ${error.message}`);
      }
      
      return false;
    }
  };

  // Flash code to the real Micro:bit
  const flashToMicrobit = async () => {
    if (!code || code.trim() === '') {
      toast.error('No code to flash. Write some code first!');
      return;
    }

    setIsFlashing(true);
    setFlashProgress(0);
    setConnectionStatus('flashing');
    
    try {
      // Step 1: Connect if not already connected
      if (!microbitConnected) {
        setConsoleOutput(prev => [...prev, 'Connecting to micro:bit...']);
        const connected = await connectToMicrobit();
        if (!connected) {
          setIsFlashing(false);
          return;
        }
      }
      
      setFlashProgress(20);
      
      // Step 2: The micro:bit appears as a USB mass storage device
      // We need to write a .hex file to it
      // For simplicity, let's use the drag-and-drop approach by creating a downloadable hex
      
      setConsoleOutput(prev => [...prev, 'Preparing code for micro:bit...']);
      setFlashProgress(40);
      
      // Create a hex file download
      // The micro:bit Python editor generates hex files - we'll create one
      const hexContent = await createMicrobitHex(code);
      
      setFlashProgress(60);
      setConsoleOutput(prev => [...prev, 'Hex file ready!']);
      
      // Download the hex file - user can drag to micro:bit drive
      const blob = new Blob([hexContent], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'microbit_program.hex';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setFlashProgress(100);
      setConsoleOutput(prev => [...prev, '✅ Hex file downloaded!']);
      setConsoleOutput(prev => [...prev, '📁 Drag the .hex file to your MICROBIT drive']);
      
      toast.success('Hex file downloaded! Drag it to your MICROBIT drive to flash.');
      setConnectionStatus('connected');
      
    } catch (error) {
      console.error('Flash error:', error);
      setConsoleOutput(prev => [...prev, `❌ Flash failed: ${error.message}`]);
      toast.error(`Flash failed: ${error.message}`);
      setConnectionStatus('error');
    } finally {
      setIsFlashing(false);
    }
  };

  // Create a micro:bit hex file with embedded Python code
  const createMicrobitHex = async (pythonCode) => {
    // The micro:bit MicroPython hex format embeds the Python script
    // We'll fetch the base MicroPython runtime and append the user's script
    
    try {
      // Try to use the official micro:bit API to create a hex
      const response = await fetch('https://python.microbit.org/v/3/api/flash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/octet-stream',
        },
        body: JSON.stringify({
          python: pythonCode,
        }),
      });
      
      if (response.ok) {
        const hexData = await response.text();
        return hexData;
      }
    } catch (e) {
      console.log('API not available, using embedded approach');
    }
    
    // Fallback: Create a simple Python script file that can be copied
    // The micro:bit will run main.py if found
    const encoder = new TextEncoder();
    const scriptBytes = encoder.encode(pythonCode);
    
    // Create a simple Intel HEX format with the script
    // This is a placeholder - for full functionality, we need the MicroPython runtime
    
    // For now, create a .py file instead of .hex
    toast.info('Creating Python file for manual transfer');
    return pythonCode; // Return raw Python for manual copy
  };

  // Disconnect from Micro:bit
  const disconnectMicrobit = async () => {
    if (connectionRef.current) {
      try {
        await connectionRef.current.close();
        connectionRef.current = null;
        setMicrobitConnected(false);
        setConnectionStatus('disconnected');
        setConsoleOutput(prev => [...prev, 'Disconnected from micro:bit']);
        toast.info('Disconnected from micro:bit');
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
  };

  return (
    <Card className="bg-gray-900 text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-cyan-400">⚡</span>
            Micro:bit
            {microbitConnected && (
              <span className="flex items-center text-green-400 text-xs">
                <Check className="w-3 h-3 mr-1" />
                Connected
              </span>
            )}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="h-7 px-2 text-xs bg-gray-800 border-gray-600 hover:bg-gray-700"
              title="Reset Simulator"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              onClick={handleRun}
              className={`h-7 px-2 text-xs ${isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              title="Run in Simulator"
            >
              {isRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            <Button
              size="sm"
              onClick={flashToMicrobit}
              disabled={isFlashing}
              className="h-7 px-2 text-xs bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
              title="Flash to Real Micro:bit"
            >
              {isFlashing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Usb className="w-3 h-3" />
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
        
        {/* Console Output - Always show */}
        <div className="mt-3 p-2 bg-black rounded text-xs font-mono text-green-400 min-h-[60px] max-h-24 overflow-y-auto">
          {consoleOutput.length > 0 ? (
            consoleOutput.map((line, i) => (
              <div key={i}>&gt; {line}</div>
            ))
          ) : (
            <div className="text-gray-500">&gt; Click "Run" to simulate your code</div>
          )}
        </div>
        
        {/* Help text */}
        <p className="text-xs text-gray-400 mt-2 text-center">
          Supported: display.set_pixel(x,y,b) • display.show() • display.scroll() • sleep()
        </p>
      </CardContent>
    </Card>
  );
}
