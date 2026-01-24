import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Play, 
  RotateCcw,
  FastForward,
  Code,
  Blocks,
  Grid
} from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { toast } from "sonner";
import * as Blockly from 'blockly';
import AnimatedTurtle from "@/components/AnimatedTurtle";

// Define turtle-specific blocks
const defineTurtleBlocks = () => {
  // ===== MOTION BLOCKS (Blue - Color 230) =====
  
  // Forward
  Blockly.Blocks['turtle_forward'] = {
    init: function() {
      this.appendValueInput("STEPS")
          .setCheck("Number")
          .appendField("forward");
      this.appendDummyInput()
          .appendField("steps");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Move the turtle forward");
    }
  };

  // Backward
  Blockly.Blocks['turtle_backward'] = {
    init: function() {
      this.appendValueInput("STEPS")
          .setCheck("Number")
          .appendField("backward");
      this.appendDummyInput()
          .appendField("steps");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Move the turtle backward");
    }
  };

  // Turn right
  Blockly.Blocks['turtle_right'] = {
    init: function() {
      this.appendValueInput("DEGREES")
          .setCheck("Number")
          .appendField("turn right");
      this.appendDummyInput()
          .appendField("degrees");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Turn the turtle right (clockwise)");
    }
  };

  // Turn left
  Blockly.Blocks['turtle_left'] = {
    init: function() {
      this.appendValueInput("DEGREES")
          .setCheck("Number")
          .appendField("turn left");
      this.appendDummyInput()
          .appendField("degrees");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Turn the turtle left (counter-clockwise)");
    }
  };

  // Go to position
  Blockly.Blocks['turtle_goto'] = {
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
      this.setTooltip("Move to specific x, y position");
    }
  };

  // Home
  Blockly.Blocks['turtle_home'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("go home");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Return to center (0, 0)");
    }
  };

  // ===== PEN BLOCKS (Green - Color 160) =====

  // Pen down
  Blockly.Blocks['turtle_pendown'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("pen down");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("Start drawing when moving");
    }
  };

  // Pen up
  Blockly.Blocks['turtle_penup'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("pen up");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("Stop drawing when moving");
    }
  };

  // Set color
  Blockly.Blocks['turtle_color'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("set color")
          .appendField(new Blockly.FieldDropdown([
            ["red", "red"],
            ["blue", "blue"],
            ["green", "green"],
            ["yellow", "yellow"],
            ["orange", "orange"],
            ["purple", "purple"],
            ["pink", "pink"],
            ["black", "black"],
            ["white", "white"],
            ["brown", "brown"],
            ["cyan", "cyan"]
          ]), "COLOR");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("Set the pen color");
    }
  };

  // Set pen size
  Blockly.Blocks['turtle_pensize'] = {
    init: function() {
      this.appendValueInput("SIZE")
          .setCheck("Number")
          .appendField("set pen size");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("Set the pen thickness");
    }
  };

  // ===== CONTROL BLOCKS (Orange - Color 20) =====

  // Repeat loop
  Blockly.Blocks['turtle_repeat'] = {
    init: function() {
      this.appendValueInput("TIMES")
          .setCheck("Number")
          .appendField("repeat");
      this.appendDummyInput()
          .appendField("times");
      this.appendStatementInput("DO")
          .appendField("do");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(20);
      this.setTooltip("Repeat the blocks inside a number of times");
    }
  };

  // For loop with counter
  Blockly.Blocks['turtle_for'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("count with")
          .appendField(new Blockly.FieldVariable("i"), "VAR");
      this.appendValueInput("FROM")
          .setCheck("Number")
          .appendField("from");
      this.appendValueInput("TO")
          .setCheck("Number")
          .appendField("to");
      this.appendStatementInput("DO")
          .appendField("do");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(20);
      this.setTooltip("Count with a variable from start to end");
    }
  };

  // While loop
  Blockly.Blocks['turtle_while'] = {
    init: function() {
      this.appendValueInput("CONDITION")
          .setCheck("Boolean")
          .appendField("repeat while");
      this.appendStatementInput("DO")
          .appendField("do");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(20);
      this.setTooltip("Repeat while condition is true");
    }
  };

  // If block
  Blockly.Blocks['turtle_if'] = {
    init: function() {
      this.appendValueInput("CONDITION")
          .setCheck("Boolean")
          .appendField("if");
      this.appendStatementInput("DO")
          .appendField("then");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip("Do something if condition is true");
    }
  };

  // If-else block
  Blockly.Blocks['turtle_if_else'] = {
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
      this.setColour(210);
      this.setTooltip("Do something if condition is true, otherwise do something else");
    }
  };

  // ===== LOGIC BLOCKS (Blue - Color 210) =====

  // Comparison block
  Blockly.Blocks['logic_compare'] = {
    init: function() {
      this.appendValueInput("A")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField(new Blockly.FieldDropdown([
            ["=", "EQ"],
            ["≠", "NEQ"],
            ["<", "LT"],
            ["≤", "LTE"],
            [">", "GT"],
            ["≥", "GTE"]
          ]), "OP");
      this.appendValueInput("B")
          .setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("Compare two values");
    }
  };

  // And/Or block
  Blockly.Blocks['logic_operation'] = {
    init: function() {
      this.appendValueInput("A")
          .setCheck("Boolean");
      this.appendDummyInput()
          .appendField(new Blockly.FieldDropdown([
            ["and", "AND"],
            ["or", "OR"]
          ]), "OP");
      this.appendValueInput("B")
          .setCheck("Boolean");
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("Combine two conditions");
    }
  };

  // Not block
  Blockly.Blocks['logic_not'] = {
    init: function() {
      this.appendValueInput("BOOL")
          .setCheck("Boolean")
          .appendField("not");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("Returns true if input is false");
    }
  };

  // Boolean value
  Blockly.Blocks['logic_boolean'] = {
    init: function() {
      this.appendDummyInput()
          .appendField(new Blockly.FieldDropdown([
            ["true", "TRUE"],
            ["false", "FALSE"]
          ]), "BOOL");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("True or false value");
    }
  };

  // ===== VARIABLE BLOCKS (Red - Color 330) =====

  // Set variable
  Blockly.Blocks['variables_set'] = {
    init: function() {
      this.appendValueInput("VALUE")
          .appendField("set")
          .appendField(new Blockly.FieldVariable("myVar"), "VAR")
          .appendField("to");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
      this.setTooltip("Set a variable to a value");
    }
  };

  // Get variable
  Blockly.Blocks['variables_get'] = {
    init: function() {
      this.appendDummyInput()
          .appendField(new Blockly.FieldVariable("myVar"), "VAR");
      this.setOutput(true, null);
      this.setColour(330);
      this.setTooltip("Get the value of a variable");
    }
  };

  // Change variable by
  Blockly.Blocks['variables_change'] = {
    init: function() {
      this.appendValueInput("DELTA")
          .setCheck("Number")
          .appendField("change")
          .appendField(new Blockly.FieldVariable("myVar"), "VAR")
          .appendField("by");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
      this.setTooltip("Change a variable by an amount");
    }
  };

  // ===== LOOKS BLOCKS (Purple/Magenta - Color 260) =====

  // Say (write text)
  Blockly.Blocks['turtle_say'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("say")
          .appendField(new Blockly.FieldTextInput("Hello!"), "TEXT");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(260);
      this.setTooltip("Display text at turtle's position");
    }
  };

  // Say for seconds (with duration)
  Blockly.Blocks['turtle_say_for'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("say")
          .appendField(new Blockly.FieldTextInput("Hello!"), "TEXT")
          .appendField("for");
      this.appendValueInput("SECONDS")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField("seconds");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(260);
      this.setTooltip("Display text for a number of seconds");
    }
  };

  // Hide turtle
  Blockly.Blocks['turtle_hide'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("hide turtle");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(260);
      this.setTooltip("Hide the turtle sprite");
    }
  };

  // Show turtle
  Blockly.Blocks['turtle_show'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("show turtle");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(260);
      this.setTooltip("Show the turtle sprite");
    }
  };

  // ===== MATH BLOCKS (Purple - Color 290) =====

  // Number input
  Blockly.Blocks['math_number'] = {
    init: function() {
      this.appendDummyInput()
          .appendField(new Blockly.FieldNumber(0), "NUM");
      this.setOutput(true, "Number");
      this.setColour(290);
      this.setTooltip("A number");
    }
  };

  // Math arithmetic
  Blockly.Blocks['math_arithmetic'] = {
    init: function() {
      this.appendValueInput("A")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField(new Blockly.FieldDropdown([
            ["+", "ADD"],
            ["-", "MINUS"],
            ["×", "MULTIPLY"],
            ["÷", "DIVIDE"]
          ]), "OP");
      this.appendValueInput("B")
          .setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setColour(290);
      this.setTooltip("Do math with two numbers");
    }
  };

  // Random number
  Blockly.Blocks['math_random'] = {
    init: function() {
      this.appendValueInput("FROM")
          .setCheck("Number")
          .appendField("random");
      this.appendValueInput("TO")
          .setCheck("Number")
          .appendField("to");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setColour(290);
      this.setTooltip("Pick a random number between two values");
    }
  };
};

// Generate Python code from blocks
const generatePythonCode = (workspace) => {
  let code = "import turtle\nimport random\nt = turtle.Turtle()\n\n";
  
  const blocks = workspace.getTopBlocks(true);
  const usedVariables = new Set();
  
  // Get value code recursively handles nested blocks
  const getValueCode = (block, inputName, defaultValue) => {
    const targetBlock = block.getInputTargetBlock(inputName);
    if (!targetBlock) return defaultValue;
    
    switch (targetBlock.type) {
      case 'math_number':
        return targetBlock.getFieldValue('NUM');
      case 'variables_get':
        return targetBlock.getField('VAR').getText();
      case 'math_arithmetic': {
        const a = getValueCode(targetBlock, 'A', '0');
        const b = getValueCode(targetBlock, 'B', '0');
        const op = targetBlock.getFieldValue('OP');
        const opMap = { ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/' };
        return `(${a} ${opMap[op]} ${b})`;
      }
      case 'math_random': {
        const from = getValueCode(targetBlock, 'FROM', '1');
        const to = getValueCode(targetBlock, 'TO', '10');
        return `random.randint(${from}, ${to})`;
      }
      case 'logic_compare': {
        const a = getValueCode(targetBlock, 'A', '0');
        const b = getValueCode(targetBlock, 'B', '0');
        const op = targetBlock.getFieldValue('OP');
        const opMap = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
        return `(${a} ${opMap[op]} ${b})`;
      }
      case 'logic_operation': {
        const a = getValueCode(targetBlock, 'A', 'True');
        const b = getValueCode(targetBlock, 'B', 'True');
        const op = targetBlock.getFieldValue('OP').toLowerCase();
        return `(${a} ${op} ${b})`;
      }
      case 'logic_not': {
        const bool = getValueCode(targetBlock, 'BOOL', 'True');
        return `(not ${bool})`;
      }
      case 'logic_boolean': {
        return targetBlock.getFieldValue('BOOL') === 'TRUE' ? 'True' : 'False';
      }
      default:
        return defaultValue;
    }
  };
  
  const processBlock = (block, indent = '') => {
    let blockCode = "";
    
    switch (block.type) {
      case 'turtle_forward': {
        const steps = getValueCode(block, 'STEPS', '10');
        blockCode = `${indent}t.forward(${steps})\n`;
        break;
      }
      case 'turtle_backward': {
        const steps = getValueCode(block, 'STEPS', '10');
        blockCode = `${indent}t.backward(${steps})\n`;
        break;
      }
      case 'turtle_right': {
        const degrees = getValueCode(block, 'DEGREES', '90');
        blockCode = `${indent}t.right(${degrees})\n`;
        break;
      }
      case 'turtle_left': {
        const degrees = getValueCode(block, 'DEGREES', '90');
        blockCode = `${indent}t.left(${degrees})\n`;
        break;
      }
      case 'turtle_goto': {
        const x = getValueCode(block, 'X', '0');
        const y = getValueCode(block, 'Y', '0');
        blockCode = `${indent}t.goto(${x}, ${y})\n`;
        break;
      }
      case 'turtle_home': {
        blockCode = `${indent}t.goto(0, 0)\n${indent}t.setheading(90)\n`;
        break;
      }
      case 'turtle_pendown': {
        blockCode = `${indent}t.pendown()\n`;
        break;
      }
      case 'turtle_penup': {
        blockCode = `${indent}t.penup()\n`;
        break;
      }
      case 'turtle_color': {
        const color = block.getFieldValue('COLOR');
        blockCode = `${indent}t.color("${color}")\n`;
        break;
      }
      case 'turtle_pensize': {
        const size = getValueCode(block, 'SIZE', '1');
        blockCode = `${indent}t.pensize(${size})\n`;
        break;
      }
      case 'turtle_repeat': {
        const times = getValueCode(block, 'TIMES', '4');
        blockCode = `${indent}for i in range(${times}):\n`;
        const doBlock = block.getInputTargetBlock('DO');
        if (doBlock) {
          blockCode += processBlockChain(doBlock, indent + '    ');
        } else {
          blockCode += `${indent}    pass\n`;
        }
        break;
      }
      case 'turtle_for': {
        const varName = block.getField('VAR').getText();
        const from = getValueCode(block, 'FROM', '0');
        const to = getValueCode(block, 'TO', '10');
        blockCode = `${indent}for ${varName} in range(${from}, ${to} + 1):\n`;
        const doBlock = block.getInputTargetBlock('DO');
        if (doBlock) {
          blockCode += processBlockChain(doBlock, indent + '    ');
        } else {
          blockCode += `${indent}    pass\n`;
        }
        break;
      }
      case 'turtle_while': {
        const condition = getValueCode(block, 'CONDITION', 'True');
        blockCode = `${indent}while ${condition}:\n`;
        const doBlock = block.getInputTargetBlock('DO');
        if (doBlock) {
          blockCode += processBlockChain(doBlock, indent + '    ');
        } else {
          blockCode += `${indent}    pass\n`;
        }
        break;
      }
      case 'turtle_if': {
        const condition = getValueCode(block, 'CONDITION', 'True');
        blockCode = `${indent}if ${condition}:\n`;
        const doBlock = block.getInputTargetBlock('DO');
        if (doBlock) {
          blockCode += processBlockChain(doBlock, indent + '    ');
        } else {
          blockCode += `${indent}    pass\n`;
        }
        break;
      }
      case 'turtle_if_else': {
        const condition = getValueCode(block, 'CONDITION', 'True');
        blockCode = `${indent}if ${condition}:\n`;
        const doBlock = block.getInputTargetBlock('DO');
        if (doBlock) {
          blockCode += processBlockChain(doBlock, indent + '    ');
        } else {
          blockCode += `${indent}    pass\n`;
        }
        blockCode += `${indent}else:\n`;
        const elseBlock = block.getInputTargetBlock('ELSE');
        if (elseBlock) {
          blockCode += processBlockChain(elseBlock, indent + '    ');
        } else {
          blockCode += `${indent}    pass\n`;
        }
        break;
      }
      case 'variables_set': {
        const varName = block.getField('VAR').getText();
        const value = getValueCode(block, 'VALUE', '0');
        usedVariables.add(varName);
        blockCode = `${indent}${varName} = ${value}\n`;
        break;
      }
      case 'variables_change': {
        const varName = block.getField('VAR').getText();
        const delta = getValueCode(block, 'DELTA', '1');
        blockCode = `${indent}${varName} = ${varName} + ${delta}\n`;
        break;
      }
      case 'turtle_say': {
        const text = block.getFieldValue('TEXT');
        blockCode = `${indent}t.write("${text}", align="center", font=("Arial", 12, "normal"))\n`;
        break;
      }
      case 'turtle_say_for': {
        const text = block.getFieldValue('TEXT');
        const seconds = getValueCode(block, 'SECONDS', '2');
        // In turtle, we just write - duration is visual concept
        blockCode = `${indent}t.write("${text}", align="center", font=("Arial", 12, "normal"))\n`;
        break;
      }
      case 'turtle_hide': {
        blockCode = `${indent}t.hideturtle()\n`;
        break;
      }
      case 'turtle_show': {
        blockCode = `${indent}t.showturtle()\n`;
        break;
      }
      default:
        break;
    }
    
    return blockCode;
  };
  
  const processBlockChain = (block, indent = '') => {
    let chainCode = "";
    let currentBlock = block;
    while (currentBlock) {
      chainCode += processBlock(currentBlock, indent);
      currentBlock = currentBlock.getNextBlock();
    }
    return chainCode;
  };
  
  for (const block of blocks) {
    code += processBlockChain(block);
  }
  
  return code;
};

// Toolbox configuration with categories
const TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: '🐢 Motion',
      colour: '230',
      contents: [
        { kind: 'block', type: 'turtle_forward', inputs: { STEPS: { shadow: { type: 'math_number', fields: { NUM: 50 } } } } },
        { kind: 'block', type: 'turtle_backward', inputs: { STEPS: { shadow: { type: 'math_number', fields: { NUM: 50 } } } } },
        { kind: 'block', type: 'turtle_right', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 90 } } } } },
        { kind: 'block', type: 'turtle_left', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 90 } } } } },
        { kind: 'block', type: 'turtle_goto', inputs: { 
          X: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
          Y: { shadow: { type: 'math_number', fields: { NUM: 0 } } }
        } },
        { kind: 'block', type: 'turtle_home' }
      ]
    },
    {
      kind: 'category',
      name: '🖊️ Pen',
      colour: '160',
      contents: [
        { kind: 'block', type: 'turtle_pendown' },
        { kind: 'block', type: 'turtle_penup' },
        { kind: 'block', type: 'turtle_color' },
        { kind: 'block', type: 'turtle_pensize', inputs: { SIZE: { shadow: { type: 'math_number', fields: { NUM: 2 } } } } }
      ]
    },
    {
      kind: 'category',
      name: '🔄 Loops',
      colour: '20',
      contents: [
        { kind: 'block', type: 'turtle_repeat', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 4 } } } } },
        { kind: 'block', type: 'turtle_for', inputs: { 
          FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
          TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } }
        } },
        { kind: 'block', type: 'turtle_while' }
      ]
    },
    {
      kind: 'category',
      name: '🔀 Control',
      colour: '210',
      contents: [
        { kind: 'block', type: 'turtle_if' },
        { kind: 'block', type: 'turtle_if_else' }
      ]
    },
    {
      kind: 'category',
      name: '⚖️ Logic',
      colour: '210',
      contents: [
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_not' },
        { kind: 'block', type: 'logic_boolean' }
      ]
    },
    {
      kind: 'category',
      name: '📦 Variables',
      colour: '330',
      custom: 'VARIABLE'
    },
    {
      kind: 'category',
      name: '🔢 Math',
      colour: '290',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
        { kind: 'block', type: 'math_random', inputs: { 
          FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
          TO: { shadow: { type: 'math_number', fields: { NUM: 100 } } }
        } }
      ]
    }
  ]
};

export default function TurtleBlocks({ user }) {
  const navigate = useNavigate();
  const blocklyDiv = useRef(null);
  const workspaceRef = useRef(null);
  const [generatedCode, setGeneratedCode] = useState("import turtle\nt = turtle.Turtle()\n\n# Drag blocks to create code!");
  const [showCode, setShowCode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const turtleRef = useRef(null);

  // Initialize Blockly
  useEffect(() => {
    if (!blocklyDiv.current || workspaceRef.current) return;

    // Define blocks first
    defineTurtleBlocks();

    // Create workspace
    workspaceRef.current = Blockly.inject(blocklyDiv.current, {
      toolbox: TOOLBOX,
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
        maxScale: 2,
        minScale: 0.3,
        scaleSpeed: 1.2
      },
      trashcan: true,
      scrollbars: true,
      sounds: false,
      renderer: 'zelos' // Modern rounded blocks
    });

    // Update code when blocks change
    workspaceRef.current.addChangeListener(() => {
      const code = generatePythonCode(workspaceRef.current);
      setGeneratedCode(code);
    });

    // Add some starter blocks
    const xml = `
      <xml>
        <block type="turtle_repeat" x="50" y="50">
          <value name="TIMES">
            <shadow type="math_number">
              <field name="NUM">4</field>
            </shadow>
          </value>
          <statement name="DO">
            <block type="turtle_forward">
              <value name="STEPS">
                <shadow type="math_number">
                  <field name="NUM">100</field>
                </shadow>
              </value>
              <next>
                <block type="turtle_right">
                  <value name="DEGREES">
                    <shadow type="math_number">
                      <field name="NUM">90</field>
                    </shadow>
                  </value>
                </block>
              </next>
            </block>
          </statement>
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

  const handleRun = useCallback(() => {
    if (turtleRef.current) {
      turtleRef.current.runInstant();
    }
  }, []);

  const handleReset = useCallback(() => {
    if (turtleRef.current) {
      turtleRef.current.reset();
    }
  }, []);

  const handleClearBlocks = useCallback(() => {
    if (workspaceRef.current) {
      workspaceRef.current.clear();
      setGeneratedCode("import turtle\nt = turtle.Turtle()\n\n# Drag blocks to create code!");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-200 sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/blocks-curriculum")}
                className="hover:bg-purple-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Curriculum
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🐢</span>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Turtle Blocks
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Show Code Toggle */}
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border">
                <Blocks className="w-4 h-4 text-purple-600" />
                <Switch
                  id="show-code"
                  checked={showCode}
                  onCheckedChange={setShowCode}
                />
                <Code className="w-4 h-4 text-blue-600" />
                <Label htmlFor="show-code" className="text-sm font-medium cursor-pointer">
                  {showCode ? "Code" : "Blocks"}
                </Label>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearBlocks}
                  className="bg-white"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="bg-white"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleRun}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Run
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-65px)]">
        <ResizablePanelGroup direction="horizontal">
          {/* Block Editor / Code View */}
          <ResizablePanel defaultSize={55} minSize={30}>
            <div className="h-full p-4">
              <Card className="h-full overflow-hidden shadow-lg border-2 border-purple-200">
                <CardContent className="p-0 h-full relative">
                  {/* Code View */}
                  <div 
                    className={`h-full bg-gray-900 text-green-400 font-mono p-4 overflow-auto absolute inset-0 ${showCode ? 'block' : 'hidden'}`}
                  >
                    <div className="flex items-center gap-2 mb-4 text-gray-400">
                      <Code className="w-4 h-4" />
                      <span className="text-sm">Generated Python Code</span>
                    </div>
                    <pre className="text-sm whitespace-pre-wrap">{generatedCode}</pre>
                  </div>
                  {/* Block Editor */}
                  <div 
                    ref={blocklyDiv} 
                    className={`h-full w-full ${showCode ? 'invisible' : 'visible'}`}
                    style={{ minHeight: '500px' }}
                  />
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-purple-200 hover:bg-purple-300" />

          {/* Turtle Canvas */}
          <ResizablePanel defaultSize={45} minSize={30}>
            <div className="h-full p-4">
              <Card className="h-full overflow-hidden shadow-lg border-2 border-blue-200">
                <CardContent className="p-4 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🐢</span>
                      <span className="font-semibold text-gray-700">Turtle Canvas</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowGrid(!showGrid)}
                      className={showGrid ? "bg-blue-100" : ""}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center bg-white rounded-lg border-2 border-gray-200">
                    <AnimatedTurtle
                      ref={turtleRef}
                      code={generatedCode}
                      width={500}
                      height={500}
                      backgroundType="none"
                      backgroundColor="#ffffff"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
