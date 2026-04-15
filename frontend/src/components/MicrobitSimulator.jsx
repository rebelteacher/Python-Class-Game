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
    setConsoleOutput([]);
    
    try {
      setConsoleOutput(prev => [...prev, '🔧 Preparing your code...']);
      setFlashProgress(20);
      
      // Clean up the code - remove any problematic characters
      let cleanCode = code.trim();
      
      // Ensure the code has the microbit import if using display functions
      if (!cleanCode.includes('from microbit import') && !cleanCode.includes('import microbit')) {
        if (cleanCode.includes('display.') || cleanCode.includes('Image.') || cleanCode.includes('button_')) {
          cleanCode = 'from microbit import *\n\n' + cleanCode;
          setConsoleOutput(prev => [...prev, '📝 Added microbit import']);
        }
      }
      
      setFlashProgress(40);
      setConsoleOutput(prev => [...prev, '📦 Creating Python file...']);
      
      // Create a .py file for the user to copy to the micro:bit
      // The micro:bit will run main.py when it starts
      const blob = new Blob([cleanCode], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'main.py';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setFlashProgress(70);
      setConsoleOutput(prev => [...prev, '✅ Downloaded: main.py']);
      
      setFlashProgress(100);
      setConsoleOutput(prev => [...prev, '']);
      setConsoleOutput(prev => [...prev, '📋 Next steps:']);
      setConsoleOutput(prev => [...prev, '1. Connect micro:bit via USB']);
      setConsoleOutput(prev => [...prev, '2. Open MICROBIT drive']);
      setConsoleOutput(prev => [...prev, '3. Copy main.py to the drive']);
      setConsoleOutput(prev => [...prev, '4. Press reset button']);
      
      toast.success(
        <div>
          <strong>main.py downloaded!</strong>
          <p className="text-sm mt-1">Copy it to your MICROBIT drive to run on device.</p>
        </div>,
        { duration: 5000 }
      );
      
      setConnectionStatus('connected');
      
    } catch (error) {
      console.error('Flash error:', error);
      setConsoleOutput(prev => [...prev, `❌ Error: ${error.message}`]);
      toast.error(`Failed: ${error.message}`);
      setConnectionStatus('error');
    } finally {
      setIsFlashing(false);
    }
  };

  // Open the official micro:bit Python editor with the current code
  const openInMicrobitEditor = () => {
    // Download the code as a .py file
    const blob = new Blob([code || ''], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Open the micro:bit Python editor in a new tab
    window.open('https://python.microbit.org/v/3', '_blank');
    
    toast.info('Your code was downloaded as main.py — drag it into the micro:bit editor that just opened!', { duration: 6000 });
  };

  // Create a micro:bit hex file with embedded Python code
  // Uses the universal hex format that works with both micro:bit V1 and V2
  const createMicrobitHex = async (pythonCode) => {
    // MicroPython for micro:bit embeds Python code directly in the hex file
    // The script is stored starting at a specific address with a magic marker
    
    // Convert Python code to bytes
    const encoder = new TextEncoder();
    const scriptBytes = encoder.encode(pythonCode);
    
    // Create the script region with micro:bit MicroPython format
    // Magic header: MP (MicroPython script marker)
    const scriptHeader = new Uint8Array([
      0x4D, 0x50, // "MP" magic
      (scriptBytes.length >> 8) & 0xFF, // Length high byte  
      scriptBytes.length & 0xFF, // Length low byte
    ]);
    
    // Combine header and script
    const fullScript = new Uint8Array(scriptHeader.length + scriptBytes.length);
    fullScript.set(scriptHeader, 0);
    fullScript.set(scriptBytes, scriptHeader.length);
    
    // For a complete solution, we would need the MicroPython runtime hex
    // For now, return the Python code for the user to use with the official editor
    // or copy to the micro:bit as main.py
    
    return pythonCode;
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
              onClick={openInMicrobitEditor}
              className="h-7 px-2 text-xs bg-cyan-600 hover:bg-cyan-700"
              title="Flash to Real Micro:bit (opens official editor)"
            >
              <Usb className="w-3 h-3" />
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
            <span className="text-cyan-400 ml-1">⇌ Flash</span> opens editor to send to device
          </p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={flashToMicrobit}
              className="text-gray-500 hover:text-gray-300 underline text-xs"
            >
              Or download main.py for manual transfer
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
