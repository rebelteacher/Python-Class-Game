import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Play, 
  RotateCcw,
  Plus,
  Trash2,
  Sparkles,
  Rocket,
  Star,
  Cat,
  Dog,
  Circle,
  Square,
  Loader2
} from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { toast } from "sonner";
import * as Blockly from 'blockly';
import SpriteCanvas from "@/components/SpriteCanvas";

// Define sprite control blocks
const defineSpriteBlocks = () => {
  // ===== MOTION BLOCKS =====
  
  // Move steps
  Blockly.Blocks['sprite_move'] = {
    init: function() {
      this.appendValueInput("STEPS")
          .setCheck("Number")
          .appendField("move");
      this.appendDummyInput()
          .appendField("steps");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Move the sprite forward");
    }
  };

  // Turn right
  Blockly.Blocks['sprite_turn_right'] = {
    init: function() {
      this.appendValueInput("DEGREES")
          .setCheck("Number")
          .appendField("turn ↻");
      this.appendDummyInput()
          .appendField("degrees");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Turn right by degrees");
    }
  };

  // Turn left
  Blockly.Blocks['sprite_turn_left'] = {
    init: function() {
      this.appendValueInput("DEGREES")
          .setCheck("Number")
          .appendField("turn ↺");
      this.appendDummyInput()
          .appendField("degrees");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Turn left by degrees");
    }
  };

  // Go to position
  Blockly.Blocks['sprite_goto'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("go to x:");
      this.appendValueInput("X")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField("y:");
      this.appendValueInput("Y")
          .setCheck("Number");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Move to specific position");
    }
  };

  // Glide to position
  Blockly.Blocks['sprite_glide'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("glide");
      this.appendValueInput("SECS")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField("secs to x:");
      this.appendValueInput("X")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField("y:");
      this.appendValueInput("Y")
          .setCheck("Number");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Smoothly glide to position");
    }
  };

  // Point in direction
  Blockly.Blocks['sprite_point'] = {
    init: function() {
      this.appendValueInput("DIRECTION")
          .setCheck("Number")
          .appendField("point in direction");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Point in a direction (0=right, 90=up)");
    }
  };

  // Set X
  Blockly.Blocks['sprite_set_x'] = {
    init: function() {
      this.appendValueInput("X")
          .setCheck("Number")
          .appendField("set x to");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
    }
  };

  // Set Y
  Blockly.Blocks['sprite_set_y'] = {
    init: function() {
      this.appendValueInput("Y")
          .setCheck("Number")
          .appendField("set y to");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
    }
  };

  // Change X
  Blockly.Blocks['sprite_change_x'] = {
    init: function() {
      this.appendValueInput("DX")
          .setCheck("Number")
          .appendField("change x by");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
    }
  };

  // Change Y
  Blockly.Blocks['sprite_change_y'] = {
    init: function() {
      this.appendValueInput("DY")
          .setCheck("Number")
          .appendField("change y by");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
    }
  };

  // ===== LOOKS BLOCKS =====

  // Say
  Blockly.Blocks['sprite_say'] = {
    init: function() {
      this.appendValueInput("TEXT")
          .setCheck("String")
          .appendField("say");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip("Display a speech bubble");
    }
  };

  // Say for seconds
  Blockly.Blocks['sprite_say_seconds'] = {
    init: function() {
      this.appendValueInput("TEXT")
          .setCheck("String")
          .appendField("say");
      this.appendDummyInput()
          .appendField("for");
      this.appendValueInput("SECS")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField("seconds");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
    }
  };

  // Show
  Blockly.Blocks['sprite_show'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("show");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
    }
  };

  // Hide
  Blockly.Blocks['sprite_hide'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("hide");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
    }
  };

  // Set size
  Blockly.Blocks['sprite_set_size'] = {
    init: function() {
      this.appendValueInput("SIZE")
          .setCheck("Number")
          .appendField("set size to");
      this.appendDummyInput()
          .appendField("%");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
    }
  };

  // Change size
  Blockly.Blocks['sprite_change_size'] = {
    init: function() {
      this.appendValueInput("CHANGE")
          .setCheck("Number")
          .appendField("change size by");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
    }
  };

  // ===== EVENTS BLOCKS =====

  // When green flag clicked
  Blockly.Blocks['event_start'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("🚩 when started");
      this.setNextStatement(true, null);
      this.setColour(65);
      this.setTooltip("Run when the green flag is clicked");
    }
  };

  // When key pressed
  Blockly.Blocks['event_key_pressed'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("when")
          .appendField(new Blockly.FieldDropdown([
            ["space", "SPACE"],
            ["up arrow", "UP"],
            ["down arrow", "DOWN"],
            ["left arrow", "LEFT"],
            ["right arrow", "RIGHT"],
            ["a", "A"],
            ["w", "W"],
            ["s", "S"],
            ["d", "D"]
          ]), "KEY")
          .appendField("key pressed");
      this.setNextStatement(true, null);
      this.setColour(65);
    }
  };

  // When sprite clicked
  Blockly.Blocks['event_sprite_clicked'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("when this sprite clicked");
      this.setNextStatement(true, null);
      this.setColour(65);
    }
  };

  // ===== CONTROL BLOCKS =====

  // Wait
  Blockly.Blocks['control_wait'] = {
    init: function() {
      this.appendValueInput("SECS")
          .setCheck("Number")
          .appendField("wait");
      this.appendDummyInput()
          .appendField("seconds");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(40);
    }
  };

  // Repeat
  Blockly.Blocks['control_repeat'] = {
    init: function() {
      this.appendValueInput("TIMES")
          .setCheck("Number")
          .appendField("repeat");
      this.appendStatementInput("DO")
          .appendField("do");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(40);
    }
  };

  // Forever
  Blockly.Blocks['control_forever'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("forever");
      this.appendStatementInput("DO");
      this.setPreviousStatement(true, null);
      this.setColour(40);
    }
  };

  // If
  Blockly.Blocks['control_if'] = {
    init: function() {
      this.appendValueInput("CONDITION")
          .setCheck("Boolean")
          .appendField("if");
      this.appendStatementInput("DO")
          .appendField("then");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(40);
    }
  };

  // If-Else
  Blockly.Blocks['control_if_else'] = {
    init: function() {
      this.appendValueInput("CONDITION")
          .setCheck("Boolean")
          .appendField("if");
      this.appendStatementInput("DO")
          .appendField("then");
      this.appendStatementInput("ELSE")
          .appendField("else");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(40);
    }
  };

  // ===== SENSING BLOCKS =====

  // Touching edge
  Blockly.Blocks['sensing_touching_edge'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("touching edge?");
      this.setOutput(true, "Boolean");
      this.setColour(170);
    }
  };

  // X position
  Blockly.Blocks['sensing_x_position'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("x position");
      this.setOutput(true, "Number");
      this.setColour(170);
    }
  };

  // Y position
  Blockly.Blocks['sensing_y_position'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("y position");
      this.setOutput(true, "Number");
      this.setColour(170);
    }
  };

  // Direction
  Blockly.Blocks['sensing_direction'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("direction");
      this.setOutput(true, "Number");
      this.setColour(170);
    }
  };

  // ===== OPERATORS BLOCKS =====

  // Add
  Blockly.Blocks['operator_add'] = {
    init: function() {
      this.appendValueInput("A")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField("+");
      this.appendValueInput("B")
          .setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setColour(120);
    }
  };

  // Subtract
  Blockly.Blocks['operator_subtract'] = {
    init: function() {
      this.appendValueInput("A")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField("-");
      this.appendValueInput("B")
          .setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setColour(120);
    }
  };

  // Multiply
  Blockly.Blocks['operator_multiply'] = {
    init: function() {
      this.appendValueInput("A")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField("×");
      this.appendValueInput("B")
          .setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setColour(120);
    }
  };

  // Divide
  Blockly.Blocks['operator_divide'] = {
    init: function() {
      this.appendValueInput("A")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField("÷");
      this.appendValueInput("B")
          .setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setColour(120);
    }
  };

  // Random
  Blockly.Blocks['operator_random'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("pick random");
      this.appendValueInput("FROM")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField("to");
      this.appendValueInput("TO")
          .setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setColour(120);
    }
  };

  // Less than
  Blockly.Blocks['operator_lt'] = {
    init: function() {
      this.appendValueInput("A")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField("<");
      this.appendValueInput("B")
          .setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
      this.setColour(120);
    }
  };

  // Greater than
  Blockly.Blocks['operator_gt'] = {
    init: function() {
      this.appendValueInput("A")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField(">");
      this.appendValueInput("B")
          .setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
      this.setColour(120);
    }
  };

  // Equals
  Blockly.Blocks['operator_equals'] = {
    init: function() {
      this.appendValueInput("A")
          .setCheck(["Number", "String"]);
      this.appendDummyInput()
          .appendField("=");
      this.appendValueInput("B")
          .setCheck(["Number", "String"]);
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
      this.setColour(120);
    }
  };

  // And
  Blockly.Blocks['operator_and'] = {
    init: function() {
      this.appendValueInput("A")
          .setCheck("Boolean");
      this.appendDummyInput()
          .appendField("and");
      this.appendValueInput("B")
          .setCheck("Boolean");
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
      this.setColour(120);
    }
  };

  // Or
  Blockly.Blocks['operator_or'] = {
    init: function() {
      this.appendValueInput("A")
          .setCheck("Boolean");
      this.appendDummyInput()
          .appendField("or");
      this.appendValueInput("B")
          .setCheck("Boolean");
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
      this.setColour(120);
    }
  };

  // Not
  Blockly.Blocks['operator_not'] = {
    init: function() {
      this.appendValueInput("OPERAND")
          .setCheck("Boolean")
          .appendField("not");
      this.setOutput(true, "Boolean");
      this.setColour(120);
    }
  };

  // ===== VARIABLES BLOCKS =====

  // Set variable
  Blockly.Blocks['variable_set'] = {
    init: function() {
      this.appendValueInput("VALUE")
          .setCheck(null)
          .appendField("set")
          .appendField(new Blockly.FieldTextInput("score"), "VAR")
          .appendField("to");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
    }
  };

  // Change variable
  Blockly.Blocks['variable_change'] = {
    init: function() {
      this.appendValueInput("VALUE")
          .setCheck("Number")
          .appendField("change")
          .appendField(new Blockly.FieldTextInput("score"), "VAR")
          .appendField("by");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
    }
  };

  // Get variable
  Blockly.Blocks['variable_get'] = {
    init: function() {
      this.appendDummyInput()
          .appendField(new Blockly.FieldTextInput("score"), "VAR");
      this.setOutput(true, null);
      this.setColour(330);
    }
  };
};

// Toolbox configuration
const SPRITE_TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Motion',
      colour: '230',
      contents: [
        { kind: 'block', type: 'sprite_move', inputs: { STEPS: { shadow: { type: 'math_number', fields: { NUM: 10 }}}}},
        { kind: 'block', type: 'sprite_turn_right', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 15 }}}}},
        { kind: 'block', type: 'sprite_turn_left', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 15 }}}}},
        { kind: 'block', type: 'sprite_goto' },
        { kind: 'block', type: 'sprite_glide' },
        { kind: 'block', type: 'sprite_point' },
        { kind: 'block', type: 'sprite_set_x' },
        { kind: 'block', type: 'sprite_set_y' },
        { kind: 'block', type: 'sprite_change_x' },
        { kind: 'block', type: 'sprite_change_y' },
      ]
    },
    {
      kind: 'category',
      name: 'Looks',
      colour: '290',
      contents: [
        { kind: 'block', type: 'sprite_say' },
        { kind: 'block', type: 'sprite_say_seconds' },
        { kind: 'block', type: 'sprite_show' },
        { kind: 'block', type: 'sprite_hide' },
        { kind: 'block', type: 'sprite_set_size' },
        { kind: 'block', type: 'sprite_change_size' },
      ]
    },
    {
      kind: 'category',
      name: 'Events',
      colour: '65',
      contents: [
        { kind: 'block', type: 'event_start' },
        { kind: 'block', type: 'event_key_pressed' },
        { kind: 'block', type: 'event_sprite_clicked' },
      ]
    },
    {
      kind: 'category',
      name: 'Control',
      colour: '40',
      contents: [
        { kind: 'block', type: 'control_wait' },
        { kind: 'block', type: 'control_repeat' },
        { kind: 'block', type: 'control_forever' },
        { kind: 'block', type: 'control_if' },
        { kind: 'block', type: 'control_if_else' },
      ]
    },
    {
      kind: 'category',
      name: 'Sensing',
      colour: '170',
      contents: [
        { kind: 'block', type: 'sensing_touching_edge' },
        { kind: 'block', type: 'sensing_x_position' },
        { kind: 'block', type: 'sensing_y_position' },
        { kind: 'block', type: 'sensing_direction' },
      ]
    },
    {
      kind: 'category',
      name: 'Operators',
      colour: '120',
      contents: [
        { kind: 'block', type: 'operator_add' },
        { kind: 'block', type: 'operator_subtract' },
        { kind: 'block', type: 'operator_multiply' },
        { kind: 'block', type: 'operator_divide' },
        { kind: 'block', type: 'operator_random' },
        { kind: 'sep', gap: '8' },
        { kind: 'block', type: 'operator_lt' },
        { kind: 'block', type: 'operator_equals' },
        { kind: 'block', type: 'operator_gt' },
        { kind: 'sep', gap: '8' },
        { kind: 'block', type: 'operator_and' },
        { kind: 'block', type: 'operator_or' },
        { kind: 'block', type: 'operator_not' },
      ]
    },
    {
      kind: 'category',
      name: 'Variables',
      colour: '330',
      contents: [
        { kind: 'block', type: 'variable_set' },
        { kind: 'block', type: 'variable_change' },
        { kind: 'block', type: 'variable_get' },
      ]
    },
    {
      kind: 'category',
      name: 'Math',
      colour: '230',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
      ]
    },
    {
      kind: 'category',
      name: 'Text',
      colour: '160',
      contents: [
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_join' },
      ]
    },
  ]
};

// Sprite library
const SPRITE_LIBRARY = {
  space: [
    { id: "rocket", name: "Rocket", emoji: "🚀" },
    { id: "alien", name: "Alien", emoji: "👽" },
    { id: "ufo", name: "UFO", emoji: "🛸" },
    { id: "planet", name: "Planet", emoji: "🪐" },
    { id: "star", name: "Star", emoji: "⭐" },
    { id: "asteroid", name: "Asteroid", emoji: "☄️" },
    { id: "astronaut", name: "Astronaut", emoji: "👨‍🚀" },
    { id: "moon", name: "Moon", emoji: "🌙" },
  ],
  animals: [
    { id: "cat", name: "Cat", emoji: "🐱" },
    { id: "dog", name: "Dog", emoji: "🐕" },
    { id: "bird", name: "Bird", emoji: "🐦" },
    { id: "fish", name: "Fish", emoji: "🐠" },
    { id: "butterfly", name: "Butterfly", emoji: "🦋" },
    { id: "bee", name: "Bee", emoji: "🐝" },
  ],
  characters: [
    { id: "robot", name: "Robot", emoji: "🤖" },
    { id: "wizard", name: "Wizard", emoji: "🧙" },
    { id: "ninja", name: "Ninja", emoji: "🥷" },
    { id: "superhero", name: "Superhero", emoji: "🦸" },
    { id: "ghost", name: "Ghost", emoji: "👻" },
  ],
  objects: [
    { id: "ball", name: "Ball", emoji: "⚽" },
    { id: "heart", name: "Heart", emoji: "❤️" },
    { id: "gem", name: "Gem", emoji: "💎" },
    { id: "coin", name: "Coin", emoji: "🪙" },
    { id: "treasure", name: "Treasure", emoji: "💰" },
  ],
  shapes: [
    { id: "circle-red", name: "Red Circle", type: "shape", color: "#EF4444" },
    { id: "circle-blue", name: "Blue Circle", type: "shape", color: "#3B82F6" },
    { id: "square-green", name: "Green Square", type: "shape", color: "#22C55E" },
  ]
};

export default function BlockSpriteEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const blocklyDiv = useRef(null);
  const workspaceRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [sprites, setSprites] = useState([]);
  const [selectedSpriteId, setSelectedSpriteId] = useState(null);
  const [showAddSprite, setShowAddSprite] = useState(false);
  const [showGenerateSprite, setShowGenerateSprite] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [customSprites, setCustomSprites] = useState([]);

  // Fetch custom sprites from backend
  useEffect(() => {
    const fetchCustomSprites = async () => {
      try {
        // Small delay to allow session to be established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/sprites`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          // Transform backend data to match expected format
          const transformed = data.map(sprite => ({
            id: sprite.id,
            name: sprite.name || sprite.prompt?.substring(0, 30) || 'Custom Sprite',
            imageData: sprite.image_data,
            prompt: sprite.prompt,
            style: sprite.style,
            type: 'image'
          }));
          setCustomSprites(transformed);
          console.log('Loaded custom sprites:', transformed.length);
        }
      } catch (error) {
        console.error('Error fetching custom sprites:', error);
      }
    };
    fetchCustomSprites();
  }, []);

  // Initialize Blockly
  useEffect(() => {
    if (!blocklyDiv.current || workspaceRef.current) return;
    
    // Define custom blocks
    defineSpriteBlocks();
    
    // Create workspace
    workspaceRef.current = Blockly.inject(blocklyDiv.current, {
      toolbox: SPRITE_TOOLBOX,
      grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.9,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2
      },
      trashcan: true,
      sounds: false,
    });

    // Add starter block
    const xml = `
      <xml>
        <block type="event_start" x="50" y="50">
          <next>
            <block type="sprite_move">
              <value name="STEPS">
                <shadow type="math_number">
                  <field name="NUM">50</field>
                </shadow>
              </value>
            </block>
          </next>
        </block>
      </xml>
    `;
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspaceRef.current);

    return () => {
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      }
    };
  }, []);

  // Convert blocks to sprite commands
  const blocksToCommands = useCallback(() => {
    if (!workspaceRef.current) return [];
    
    const commands = [];
    const topBlocks = workspaceRef.current.getTopBlocks(true);
    
    const processBlock = (block) => {
      if (!block) return;
      
      const type = block.type;
      
      switch (type) {
        case 'event_start':
          // Process next blocks
          processBlock(block.getNextBlock());
          break;
          
        case 'sprite_move':
          const steps = getBlockValue(block, 'STEPS', 10);
          commands.push({ type: 'move', value: steps });
          break;
          
        case 'sprite_turn_right':
          const rightDeg = getBlockValue(block, 'DEGREES', 15);
          commands.push({ type: 'turn_right', value: rightDeg });
          break;
          
        case 'sprite_turn_left':
          const leftDeg = getBlockValue(block, 'DEGREES', 15);
          commands.push({ type: 'turn_left', value: leftDeg });
          break;
          
        case 'sprite_goto':
          const gotoX = getBlockValue(block, 'X', 0);
          const gotoY = getBlockValue(block, 'Y', 0);
          commands.push({ type: 'goto', x: gotoX, y: gotoY });
          break;
          
        case 'sprite_glide':
          const glideX = getBlockValue(block, 'X', 0);
          const glideY = getBlockValue(block, 'Y', 0);
          const glideSecs = getBlockValue(block, 'SECS', 1);
          commands.push({ type: 'glide', x: glideX, y: glideY, duration: glideSecs });
          break;
          
        case 'sprite_point':
          const dir = getBlockValue(block, 'DIRECTION', 0);
          commands.push({ type: 'point_direction', value: dir });
          break;
          
        case 'sprite_set_x':
          const setX = getBlockValue(block, 'X', 0);
          commands.push({ type: 'set_x', value: setX });
          break;
          
        case 'sprite_set_y':
          const setY = getBlockValue(block, 'Y', 0);
          commands.push({ type: 'set_y', value: setY });
          break;
          
        case 'sprite_say':
          const sayText = getBlockValue(block, 'TEXT', 'Hello!');
          commands.push({ type: 'say', value: sayText });
          break;
          
        case 'sprite_show':
          commands.push({ type: 'show' });
          break;
          
        case 'sprite_hide':
          commands.push({ type: 'hide' });
          break;
          
        case 'sprite_set_size':
          const size = getBlockValue(block, 'SIZE', 100);
          commands.push({ type: 'set_size', value: size / 2 });
          break;
          
        case 'sprite_change_size':
          const sizeChange = getBlockValue(block, 'CHANGE', 10);
          commands.push({ type: 'change_size', value: sizeChange / 2 });
          break;
          
        case 'control_wait':
          const waitSecs = getBlockValue(block, 'SECS', 1);
          commands.push({ type: 'wait', duration: waitSecs * 1000 });
          break;
          
        case 'control_repeat':
          const times = getBlockValue(block, 'TIMES', 10);
          const repeatCommands = [];
          let doBlock = block.getInputTargetBlock('DO');
          while (doBlock) {
            const innerCmds = [];
            processBlockForCommands(doBlock, innerCmds);
            repeatCommands.push(...innerCmds);
            doBlock = doBlock.getNextBlock();
          }
          for (let i = 0; i < times; i++) {
            commands.push(...repeatCommands);
          }
          break;
      }
      
      // Process next block in sequence
      if (block.getNextBlock()) {
        processBlock(block.getNextBlock());
      }
    };

    const processBlockForCommands = (block, cmds) => {
      if (!block) return;
      const type = block.type;
      switch (type) {
        case 'sprite_move':
          cmds.push({ type: 'move', value: getBlockValue(block, 'STEPS', 10) });
          break;
        case 'sprite_turn_right':
          cmds.push({ type: 'turn_right', value: getBlockValue(block, 'DEGREES', 15) });
          break;
        case 'sprite_turn_left':
          cmds.push({ type: 'turn_left', value: getBlockValue(block, 'DEGREES', 15) });
          break;
        // Add more as needed
      }
    };

    const getBlockValue = (block, inputName, defaultValue) => {
      const input = block.getInput(inputName);
      if (!input) return defaultValue;
      
      const targetBlock = input.connection?.targetBlock();
      if (!targetBlock) return defaultValue;
      
      if (targetBlock.type === 'math_number') {
        return parseFloat(targetBlock.getFieldValue('NUM')) || defaultValue;
      }
      if (targetBlock.type === 'text') {
        return targetBlock.getFieldValue('TEXT') || defaultValue;
      }
      
      return defaultValue;
    };

    // Process all top-level blocks
    for (const block of topBlocks) {
      processBlock(block);
    }

    return commands;
  }, []);

  // Run the program
  const runProgram = useCallback(() => {
    const commands = blocksToCommands();
    if (commands.length === 0) {
      toast.error("No commands to run! Add some blocks first.");
      return;
    }
    
    setIsRunning(true);
    canvasRef.current?.runCommands(commands);
    
    // Calculate approximate duration
    const duration = commands.reduce((acc, cmd) => {
      if (cmd.type === 'wait') return acc + cmd.duration;
      if (cmd.type === 'glide') return acc + (cmd.duration * 1000);
      return acc + 50;
    }, 0);
    
    setTimeout(() => setIsRunning(false), duration + 500);
  }, [blocksToCommands]);

  // Reset canvas
  const resetCanvas = useCallback(() => {
    setIsRunning(false);
    canvasRef.current?.reset();
  }, []);

  // Add sprite from library
  const addSpriteFromLibrary = (spriteData) => {
    const newSprite = canvasRef.current?.addSprite({
      name: spriteData.name,
      costume: spriteData.emoji,
      type: spriteData.type || "emoji",
      color: spriteData.color,
      x: 240 + Math.random() * 100 - 50,
      y: 180 + Math.random() * 100 - 50
    });
    
    if (newSprite) {
      toast.success(`Added ${spriteData.name}!`);
      setShowAddSprite(false);
    }
  };

  // Generate custom sprite with AI
  const generateCustomSprite = async () => {
    if (!generatePrompt.trim()) {
      toast.error("Please enter a description for your sprite");
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/sprites/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: generatePrompt,
          style: "cartoon"
        })
      });
      
      if (!response.ok) throw new Error("Failed to generate sprite");
      
      const data = await response.json();
      
      // Add to custom sprites
      const newCustomSprite = {
        id: data.sprite_id,
        name: generatePrompt.slice(0, 20),
        imageData: data.image_data,
        type: "image"
      };
      setCustomSprites(prev => [...prev, newCustomSprite]);
      
      // Add to canvas
      canvasRef.current?.addSprite({
        name: generatePrompt.slice(0, 20),
        imageData: data.image_data,
        type: "image",
        size: 60
      });
      
      toast.success("Sprite generated!");
      setShowGenerateSprite(false);
      setGeneratePrompt("");
    } catch (error) {
      toast.error("Failed to generate sprite: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-cyber-navy/40">
      {/* Header */}
      <div className="bg-cyber-navy/60 border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-lg font-bold text-cyber-cyan">
            🧩 Block-Based Sprite Editor
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={runProgram} 
            disabled={isRunning}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? "Running..." : "Run"}
          </Button>
          <Button variant="outline" onClick={resetCanvas}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Blockly Editor */}
          <ResizablePanel defaultSize={55} minSize={40}>
            <div ref={blocklyDiv} className="w-full h-full" />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Sprite Stage */}
          <ResizablePanel defaultSize={45} minSize={30}>
            <div className="h-full flex flex-col p-4 bg-cyber-navy/30">
              {/* Canvas */}
              <div className="flex-shrink-0 mb-4">
                <SpriteCanvas
                  ref={canvasRef}
                  width={480}
                  height={360}
                  backgroundColor="#1a1a2e"
                  onSpriteClick={(sprite) => setSelectedSpriteId(sprite.id)}
                />
              </div>
              
              {/* Sprite Panel */}
              <Card className="flex-1 overflow-auto">
                <CardHeader className="py-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Sprites</CardTitle>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setShowAddSprite(true)}>
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowGenerateSprite(true)}>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Generate
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-4 gap-2">
                    {canvasRef.current?.getSprites?.()?.map(sprite => (
                      <div
                        key={sprite.id}
                        onClick={() => setSelectedSpriteId(sprite.id)}
                        className={`p-2 border rounded-lg cursor-pointer text-center ${
                          selectedSpriteId === sprite.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-cyber-cyan/10'
                        }`}
                      >
                        <div className="text-2xl mb-1">
                          {sprite.type === "emoji" ? sprite.costume : "🖼️"}
                        </div>
                        <div className="text-xs truncate">{sprite.name}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Add Sprite Dialog */}
      <Dialog open={showAddSprite} onOpenChange={setShowAddSprite}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Sprite from Library</DialogTitle>
            <DialogDescription>Choose a sprite to add to your project</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="space">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="space">🚀 Space</TabsTrigger>
              <TabsTrigger value="animals">🐱 Animals</TabsTrigger>
              <TabsTrigger value="characters">🤖 Characters</TabsTrigger>
              <TabsTrigger value="objects">⚽ Objects</TabsTrigger>
              <TabsTrigger value="custom">✨ Custom</TabsTrigger>
            </TabsList>
            
            {Object.entries(SPRITE_LIBRARY).map(([category, sprites]) => (
              <TabsContent key={category} value={category}>
                <div className="grid grid-cols-4 gap-3 p-4">
                  {sprites.map(sprite => (
                    <Button
                      key={sprite.id}
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center"
                      onClick={() => addSpriteFromLibrary(sprite)}
                    >
                      <span className="text-3xl mb-1">
                        {sprite.emoji || (
                          <div 
                            className="w-8 h-8 rounded-full" 
                            style={{ backgroundColor: sprite.color }}
                          />
                        )}
                      </span>
                      <span className="text-xs">{sprite.name}</span>
                    </Button>
                  ))}
                </div>
              </TabsContent>
            ))}
            
            <TabsContent value="custom">
              <div className="p-4">
                {customSprites.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No custom sprites yet</p>
                    <Button 
                      className="mt-4"
                      onClick={() => {
                        setShowAddSprite(false);
                        setShowGenerateSprite(true);
                      }}
                    >
                      Generate Your First Sprite
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {customSprites.map(sprite => (
                      <Button
                        key={sprite.id}
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center"
                        onClick={() => addSpriteFromLibrary(sprite)}
                      >
                        <img 
                          src={sprite.imageData} 
                          alt={sprite.name}
                          className="w-12 h-12 object-contain"
                        />
                        <span className="text-xs truncate w-full">{sprite.name}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Generate Sprite Dialog */}
      <Dialog open={showGenerateSprite} onOpenChange={setShowGenerateSprite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Generate Custom Sprite with AI
            </DialogTitle>
            <DialogDescription>
              Describe what you want your sprite to look like
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="prompt">Sprite Description</Label>
              <Input
                id="prompt"
                placeholder="e.g., a friendly blue robot with antenna"
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Tip: Be specific! Include colors, style, and character traits.
              </p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Quick ideas:</span>
              {["space warrior", "cute dragon", "fast spaceship", "treasure chest", "magic crystal"].map(idea => (
                <Button
                  key={idea}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setGeneratePrompt(idea)}
                >
                  {idea}
                </Button>
              ))}
            </div>
            
            <Button 
              onClick={generateCustomSprite}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating... (this may take a minute)
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Sprite
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
