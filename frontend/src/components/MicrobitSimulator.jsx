import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, RotateCcw, Usb, Loader2, Check, AlertCircle, Zap } from "lucide-react";
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
  // Alias for HAPPY
  HAPPY_FACE: [
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
  // Alias for SAD
  SAD_FACE: [
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
  ],
  // Clock faces (12 positions)
  CLOCK12: [
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0]
  ],
  CLOCK1: [
    [0,0,0,1,1],
    [0,0,0,1,0],
    [0,0,1,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0]
  ],
  CLOCK2: [
    [0,0,0,0,0],
    [0,0,0,1,1],
    [0,0,1,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0]
  ],
  CLOCK3: [
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,1,1,1],
    [0,0,0,0,0],
    [0,0,0,0,0]
  ],
  CLOCK4: [
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,1,0,0],
    [0,0,0,1,1],
    [0,0,0,0,0]
  ],
  CLOCK5: [
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,1,0,0],
    [0,0,0,1,0],
    [0,0,0,1,1]
  ],
  CLOCK6: [
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0]
  ],
  CLOCK7: [
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,1,0,0],
    [0,1,0,0,0],
    [1,1,0,0,0]
  ],
  CLOCK8: [
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,1,0,0],
    [1,1,0,0,0],
    [0,0,0,0,0]
  ],
  CLOCK9: [
    [0,0,0,0,0],
    [0,0,0,0,0],
    [1,1,1,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0]
  ],
  CLOCK10: [
    [0,0,0,0,0],
    [1,1,0,0,0],
    [0,0,1,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0]
  ],
  CLOCK11: [
    [1,1,0,0,0],
    [0,1,0,0,0],
    [0,0,1,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0]
  ],
  // Additional standard images
  ARROW_NE: [
    [0,0,1,1,1],
    [0,0,0,1,1],
    [0,0,1,0,1],
    [0,1,0,0,0],
    [1,0,0,0,0]
  ],
  ARROW_SE: [
    [1,0,0,0,0],
    [0,1,0,0,0],
    [0,0,1,0,1],
    [0,0,0,1,1],
    [0,0,1,1,1]
  ],
  ARROW_SW: [
    [0,0,0,0,1],
    [0,0,0,1,0],
    [1,0,1,0,0],
    [1,1,0,0,0],
    [1,1,1,0,0]
  ],
  ARROW_NW: [
    [1,1,1,0,0],
    [1,1,0,0,0],
    [1,0,1,0,0],
    [0,0,0,1,0],
    [0,0,0,0,1]
  ],
  TRIANGLE: [
    [0,0,0,0,0],
    [0,0,1,0,0],
    [0,1,0,1,0],
    [1,1,1,1,1],
    [0,0,0,0,0]
  ],
  DIAMOND: [
    [0,0,1,0,0],
    [0,1,0,1,0],
    [1,0,0,0,1],
    [0,1,0,1,0],
    [0,0,1,0,0]
  ],
  DIAMOND_SMALL: [
    [0,0,0,0,0],
    [0,0,1,0,0],
    [0,1,0,1,0],
    [0,0,1,0,0],
    [0,0,0,0,0]
  ],
  SQUARE: [
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1]
  ],
  SQUARE_SMALL: [
    [0,0,0,0,0],
    [0,1,1,1,0],
    [0,1,0,1,0],
    [0,1,1,1,0],
    [0,0,0,0,0]
  ],
  STICKFIGURE: [
    [0,0,1,0,0],
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,1,0,1,0],
    [1,0,0,0,1]
  ],
  GHOST: [
    [0,1,1,1,0],
    [1,0,1,0,1],
    [1,1,1,1,1],
    [1,1,1,1,1],
    [1,0,1,0,1]
  ],
  PACMAN: [
    [0,1,1,1,1],
    [1,1,1,1,0],
    [1,1,1,0,0],
    [1,1,1,1,0],
    [0,1,1,1,1]
  ],
  MUSIC_CROTCHET: [
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [1,1,1,0,0],
    [1,1,1,0,0]
  ],
  MUSIC_QUAVER: [
    [0,0,1,0,0],
    [0,0,1,1,0],
    [0,0,1,0,1],
    [1,1,1,0,0],
    [1,1,1,0,0]
  ],
  PITCHFORK: [
    [1,0,1,0,1],
    [1,0,1,0,1],
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,0,1,0,0]
  ],
  XMAS: [
    [0,0,1,0,0],
    [0,1,1,1,0],
    [0,0,1,0,0],
    [0,1,1,1,0],
    [1,1,1,1,1]
  ],
  TSHIRT: [
    [1,1,0,1,1],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [0,1,1,1,0],
    [0,1,1,1,0]
  ],
  BUTTERFLY: [
    [1,1,0,1,1],
    [1,1,1,1,1],
    [0,0,1,0,0],
    [1,1,1,1,1],
    [1,1,0,1,1]
  ],
  SCISSORS: [
    [1,1,0,0,1],
    [1,1,0,1,0],
    [0,0,1,0,0],
    [1,1,0,1,0],
    [1,1,0,0,1]
  ],
  ROLLERSKATE: [
    [0,0,0,1,1],
    [0,0,0,1,1],
    [1,1,1,1,1],
    [1,1,1,1,1],
    [0,1,0,1,0]
  ],
  COW: [
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [0,0,1,0,0]
  ],
  SILLY: [
    [1,0,0,0,1],
    [0,0,0,0,0],
    [1,1,1,1,1],
    [0,0,0,1,0],
    [0,0,0,1,0]
  ],
  FABULOUS: [
    [1,1,1,1,1],
    [1,1,0,1,1],
    [0,0,0,0,0],
    [0,1,0,1,0],
    [0,1,1,1,0]
  ],
  MEH: [
    [0,1,0,1,0],
    [0,0,0,0,0],
    [0,0,0,1,0],
    [0,0,1,0,0],
    [0,1,0,0,0]
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
  const buttonARef = useRef(false);
  const buttonBRef = useRef(false);
  
  // WebUSB state for real Micro:bit
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [microbitConnected, setMicrobitConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'flashing', 'error'
  const connectionRef = useRef(null);

  // Parse the code and extract display commands
  const parseCode = useCallback((pythonCode, buttonAState = false, buttonBState = false) => {
    const commands = [];
    const lines = pythonCode.split('\n');
    
    let inWhileLoop = false;
    let indentLevel = 0;
    let inButtonABlock = false;
    let inButtonBBlock = false;
    let inElseBlock = false;
    let buttonBlockIndent = 0;
    
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
      
      // Check current indentation
      const currentIndent = line.search(/\S/);
      
      // Check if we're exiting the while loop
      if (inWhileLoop && currentIndent <= indentLevel && trimmed !== '') {
        inWhileLoop = false;
      }
      
      // Check if we're exiting button blocks
      if ((inButtonABlock || inButtonBBlock || inElseBlock) && currentIndent <= buttonBlockIndent && trimmed !== '') {
        inButtonABlock = false;
        inButtonBBlock = false;
        inElseBlock = false;
      }
      
      // Detect button_a.is_pressed() condition
      if (trimmed.includes('button_a.is_pressed()') || trimmed.includes('button_a.was_pressed()')) {
        inButtonABlock = true;
        inButtonBBlock = false;
        inElseBlock = false;
        buttonBlockIndent = currentIndent;
        continue;
      }
      
      // Detect button_b.is_pressed() condition
      if (trimmed.includes('button_b.is_pressed()') || trimmed.includes('button_b.was_pressed()')) {
        inButtonBBlock = true;
        inButtonABlock = false;
        inElseBlock = false;
        buttonBlockIndent = currentIndent;
        continue;
      }
      
      // Detect else block
      if (trimmed === 'else:' || trimmed.startsWith('else:')) {
        inElseBlock = true;
        inButtonABlock = false;
        inButtonBBlock = false;
        continue;
      }
      
      // Detect elif block (treat like else for now)
      if (trimmed.startsWith('elif')) {
        if (trimmed.includes('button_a')) {
          inButtonABlock = true;
          inButtonBBlock = false;
          inElseBlock = false;
        } else if (trimmed.includes('button_b')) {
          inButtonBBlock = true;
          inButtonABlock = false;
          inElseBlock = false;
        }
        continue;
      }
      
      // Skip commands if we're in a button block that doesn't match current button state
      if (inButtonABlock && !buttonAState) continue;
      if (inButtonBBlock && !buttonBState) continue;
      if (inElseBlock && (buttonAState || buttonBState)) continue;
      
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
              newLeds[cmd.y][cmd.x] = cmd.brightness;
              ledsRef.current = newLeds;
              setLeds(newLeds);
              setConsoleOutput(prev => [...prev, `set_pixel(${cmd.x}, ${cmd.y}, ${cmd.brightness})`]);
            }
            break;
            
          case 'show':
            const pattern = getPattern(cmd.arg);
            if (pattern) {
              // Map binary patterns (0/1) to full brightness (0/9)
              const brightPattern = pattern.map(row => row.map(v => v > 0 ? 9 : 0));
              ledsRef.current = brightPattern;
              setLeds(copyGrid(brightPattern));
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
                const brightChar = charPattern.map(row => row.map(v => v > 0 ? 9 : 0));
                ledsRef.current = brightChar;
                setLeds(copyGrid(brightChar));
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
    buttonARef.current = false;
    buttonBRef.current = false;
    const commands = parseCode(code, false, false);
    
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
    buttonARef.current = false;
    buttonBRef.current = false;
    ledsRef.current = copyGrid(EMPTY_GRID);
    setLeds(copyGrid(EMPTY_GRID));
    setConsoleOutput(['Reset. Ready to run.']);
  };

  const handleButtonA = () => {
    setButtonAPressed(true);
    buttonARef.current = true;
    
    // Parse and execute code with button A pressed
    setConsoleOutput(prev => [...prev, 'Button A pressed!']);
    const commands = parseCode(code, true, false);
    if (commands.length > 0) {
      executeCommands(commands);
    }
    
    setTimeout(() => {
      setButtonAPressed(false);
      buttonARef.current = false;
    }, 200);
    
    if (onButtonPress) onButtonPress('A');
  };

  const handleButtonB = () => {
    setButtonBPressed(true);
    buttonBRef.current = true;
    
    // Parse and execute code with button B pressed
    setConsoleOutput(prev => [...prev, 'Button B pressed!']);
    const commands = parseCode(code, false, true);
    if (commands.length > 0) {
      executeCommands(commands);
    }
    
    setTimeout(() => {
      setButtonBPressed(false);
      buttonBRef.current = false;
    }, 200);
    
    if (onButtonPress) onButtonPress('B');
  };

  // Check if WebUSB is supported
  const isWebUSBSupported = () => {
    return 'usb' in navigator;
  };

  // One-click flash to micro:bit via WebUSB
  const flashToDevice = async () => {
    if (!code || code.trim() === '') {
      toast.error('No code to flash. Write some code first!');
      return;
    }

    if (!isWebUSBSupported()) {
      toast.error('WebUSB not supported. Use Chrome or Edge browser.');
      return;
    }

    setIsFlashing(true);
    setFlashProgress(0);
    setConnectionStatus('flashing');

    try {
      // Step 1: Fetch base MicroPython V2 firmware from public folder
      setConsoleOutput(prev => [...prev, '> Fetching MicroPython firmware...']);
      setFlashProgress(5);
      const firmwareResp = await fetch('/micropython-v2.hex');
      if (!firmwareResp.ok) throw new Error('Failed to load MicroPython firmware');
      const firmwareHex = await firmwareResp.text();
      setFlashProgress(15);

      // Step 2: Embed user code as main.py into the firmware filesystem
      setConsoleOutput(prev => [...prev, '> Embedding code into firmware...']);
      const { MicropythonFsHex } = await import('@microbit/microbit-fs');
      const fsHex = new MicropythonFsHex(firmwareHex);
      fsHex.write('main.py', code);
      const v2HexWithCode = fsHex.getIntelHex();
      setFlashProgress(30);

      // Step 3: Create Universal Hex format (V1 stub + V2 with code)
      setConsoleOutput(prev => [...prev, '> Creating universal hex...']);
      const { createUniversalHex, microbitBoardId } = await import('@microbit/microbit-universal-hex');
      const v1Stub = ':020000040000FA\n:0400000500000000F7\n:00000001FF';
      const universalHex = createUniversalHex([
        { hex: v1Stub, boardId: microbitBoardId.V1 },
        { hex: v2HexWithCode, boardId: microbitBoardId.V2 }
      ]);
      setFlashProgress(40);

      // Step 4: Connect to micro:bit via WebUSB
      setConsoleOutput(prev => [...prev, '> Connecting to micro:bit via USB...']);
      const { createWebUSBConnection, createUniversalHexFlashDataSource } = await import('@microbit/microbit-connection');
      const usb = createWebUSBConnection();
      const status = await usb.connect();
      if (status !== 'CONNECTED') throw new Error('Could not connect to micro:bit. Status: ' + status);

      setFlashProgress(50);
      setConsoleOutput(prev => [...prev, '> Connected! Flashing code...']);
      connectionRef.current = usb;
      setMicrobitConnected(true);

      // Step 5: Flash the universal hex to the device
      await usb.flash(
        createUniversalHexFlashDataSource(universalHex),
        {
          partial: false,
          progress: (pct) => {
            if (pct !== undefined) {
              setFlashProgress(50 + Math.round(pct * 0.5));
            }
          },
        }
      );

      setFlashProgress(100);
      setConnectionStatus('connected');
      setConsoleOutput(prev => [...prev, '> Done! Your code is running on the micro:bit.']);
      toast.success('Code flashed to micro:bit!');
    } catch (error) {
      console.error('Flash error:', error);
      setConnectionStatus('error');
      if (error.name === 'NotFoundError' || error.code === 'no-device-selected') {
        setConsoleOutput(prev => [...prev, '> No micro:bit selected. Plug it in via USB and try again.']);
        toast.error('No micro:bit found. Plug it in and try again.');
      } else {
        setConsoleOutput(prev => [...prev, `> Error: ${error.message}`]);
        toast.error(error.message);
      }
    } finally {
      setIsFlashing(false);
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
              type="button"
              onClick={handleReset}
              className="h-7 px-2 text-xs bg-gray-800 border-gray-600 hover:bg-gray-700"
              title="Reset Simulator"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={handleRun}
              className={`h-7 px-2 text-xs ${isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              title="Run in Simulator"
            >
              {isRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={flashToDevice}
              disabled={isFlashing}
              className="h-7 px-2 text-xs bg-cyan-600 hover:bg-cyan-700"
              title="Flash to micro:bit via USB"
            >
              {isFlashing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
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
              type="button"
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
                  row.map((led, colIndex) => {
                    const brightness = Math.min(9, Math.max(0, led));
                    const opacity = brightness / 9;
                    const glowSize = Math.round(2 + opacity * 6);
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className="w-4 h-4 rounded-sm transition-all duration-100"
                        style={brightness > 0 ? {
                          backgroundColor: `rgba(239, 68, 68, ${0.2 + opacity * 0.8})`,
                          boxShadow: `0 0 ${glowSize}px rgba(239, 68, 68, ${opacity * 0.8})`,
                        } : {
                          backgroundColor: 'rgb(69, 10, 10)',
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>
            
            {/* Button B */}
            <button
              type="button"
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
        <div className="mt-3 p-2 bg-black rounded text-xs font-mono text-green-400 min-h-[50px] max-h-20 overflow-y-auto">
          {consoleOutput.length > 0 ? (
            consoleOutput.map((line, i) => (
              <div key={i}>&gt; {line}</div>
            ))
          ) : (
            <div className="text-gray-500">&gt; <span className="text-green-400">▶</span> Test here • <span className="text-cyan-400">⇌</span> Flash to real device</div>
          )}
        </div>
        
        {/* Help text and download option */}
        <div className="text-xs text-gray-400 mt-2 space-y-1">
          <p className="text-center">
            <span className="text-green-400">▶ Simulate</span> tests code here • 
            <span className="text-cyan-400 ml-1">⚡ Flash</span> sends to device via USB
          </p>
          {flashProgress > 0 && flashProgress < 100 && (
            <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
              <div className="bg-cyan-500 h-1.5 rounded-full transition-all" style={{ width: `${flashProgress}%` }} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
