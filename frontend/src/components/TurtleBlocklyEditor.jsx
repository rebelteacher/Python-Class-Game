import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Code, Blocks } from "lucide-react";
import { toast } from "sonner";
import * as Blockly from 'blockly';
import AnimatedTurtle from "@/components/AnimatedTurtle";

// CSS to fix Blockly layout issues
const blocklyStyles = `
  .injectionDiv {
    position: absolute !important;
    width: 100% !important;
    height: 100% !important;
  }
  .blocklySvg {
    width: 100% !important;
    height: 100% !important;
  }
`;

// Define turtle-specific blocks
const defineTurtleBlocks = () => {
  // ===== MOTION BLOCKS (Blue - Color 230) =====
  
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
      this.setTooltip("Turn the turtle clockwise");
    }
  };

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
      this.setTooltip("Turn the turtle counter-clockwise");
    }
  };

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
      this.setTooltip("Move turtle to specific coordinates");
    }
  };

  Blockly.Blocks['turtle_home'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("go home");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Return turtle to center");
    }
  };

  // ===== PEN BLOCKS (Green - Color 160) =====
  
  Blockly.Blocks['turtle_pendown'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("pen down");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("Start drawing");
    }
  };

  Blockly.Blocks['turtle_penup'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("pen up");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("Stop drawing");
    }
  };

  Blockly.Blocks['turtle_color'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("set color to")
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
            ["gray", "gray"],
            ["cyan", "cyan"]
          ]), "COLOR");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("Set the pen color");
    }
  };

  Blockly.Blocks['turtle_pensize'] = {
    init: function() {
      this.appendValueInput("SIZE")
          .setCheck("Number")
          .appendField("set pen size to");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("Set the pen thickness");
    }
  };

  // ===== LOOKS BLOCKS (Purple - Color 260) =====

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

  // ===== LOOP BLOCKS (Orange - Color 20) =====
  
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
      this.setTooltip("Repeat commands a number of times");
    }
  };

  Blockly.Blocks['turtle_for'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("count with")
          .appendField(new Blockly.FieldVariable("i"), "VAR")
          .appendField("from");
      this.appendValueInput("FROM")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField("to");
      this.appendValueInput("TO")
          .setCheck("Number");
      this.appendStatementInput("DO")
          .appendField("do");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(20);
      this.setTooltip("Count with a variable");
    }
  };

  Blockly.Blocks['turtle_while'] = {
    init: function() {
      this.appendValueInput("CONDITION")
          .setCheck("Boolean")
          .appendField("while");
      this.appendStatementInput("DO")
          .appendField("do");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(20);
      this.setTooltip("Repeat while condition is true");
    }
  };

  // ===== CONTROL BLOCKS (Cyan - Color 210) =====

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
      this.setTooltip("Do something if condition is true, else do something else");
    }
  };

  // ===== LOGIC BLOCKS =====

  Blockly.Blocks['logic_compare'] = {
    init: function() {
      this.appendValueInput("A");
      this.appendDummyInput()
          .appendField(new Blockly.FieldDropdown([
            ["=", "EQ"],
            ["≠", "NEQ"],
            ["<", "LT"],
            ["≤", "LTE"],
            [">", "GT"],
            ["≥", "GTE"]
          ]), "OP");
      this.appendValueInput("B");
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("Compare two values");
    }
  };

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

  Blockly.Blocks['logic_not'] = {
    init: function() {
      this.appendValueInput("BOOL")
          .setCheck("Boolean")
          .appendField("not");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("Returns the opposite");
    }
  };

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

  // ===== VARIABLE BLOCKS =====

  Blockly.Blocks['variables_get'] = {
    init: function() {
      this.appendDummyInput()
          .appendField(new Blockly.FieldVariable("item"), "VAR");
      this.setOutput(true, null);
      this.setColour(330);
      this.setTooltip("Get the value of a variable");
    }
  };

  Blockly.Blocks['variables_set'] = {
    init: function() {
      this.appendValueInput("VALUE")
          .appendField("set")
          .appendField(new Blockly.FieldVariable("item"), "VAR")
          .appendField("to");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
      this.setTooltip("Set a variable to a value");
    }
  };

  Blockly.Blocks['variables_change'] = {
    init: function() {
      this.appendValueInput("DELTA")
          .appendField("change")
          .appendField(new Blockly.FieldVariable("item"), "VAR")
          .appendField("by");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
      this.setTooltip("Change a variable by an amount");
    }
  };

  // ===== MATH BLOCKS =====

  Blockly.Blocks['math_number'] = {
    init: function() {
      this.appendDummyInput()
          .appendField(new Blockly.FieldNumber(0), "NUM");
      this.setOutput(true, "Number");
      this.setColour(290);
      this.setTooltip("A number");
    }
  };

  Blockly.Blocks['math_arithmetic'] = {
    init: function() {
      this.appendValueInput("A")
          .setCheck("Number");
      this.appendDummyInput()
          .appendField(new Blockly.FieldDropdown([
            ["+", "ADD"],
            ["-", "SUBTRACT"],
            ["×", "MULTIPLY"],
            ["÷", "DIVIDE"]
          ]), "OP");
      this.appendValueInput("B")
          .setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setColour(290);
      this.setTooltip("Basic math operations");
    }
  };

  Blockly.Blocks['math_random'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("random");
      this.appendValueInput("FROM")
          .setCheck("Number")
          .appendField("from");
      this.appendValueInput("TO")
          .setCheck("Number")
          .appendField("to");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setColour(290);
      this.setTooltip("Generate a random number");
    }
  };
};

// Toolbox configuration
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
      name: '💬 Looks',
      colour: '260',
      contents: [
        { kind: 'block', type: 'turtle_say' },
        { kind: 'block', type: 'turtle_say_for', inputs: { SECONDS: { shadow: { type: 'math_number', fields: { NUM: 2 } } } } },
        { kind: 'block', type: 'turtle_hide' },
        { kind: 'block', type: 'turtle_show' }
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
      contents: [
        { kind: 'block', type: 'variables_get' },
        { kind: 'block', type: 'variables_set' },
        { kind: 'block', type: 'variables_change' }
      ]
    },
    {
      kind: 'category',
      name: '🔢 Math',
      colour: '290',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
        { kind: 'block', type: 'math_random' }
      ]
    }
  ]
};

// Convert blocks to Python code
const generatePythonCode = (workspace) => {
  if (!workspace) return "";
  
  const blocks = workspace.getTopBlocks(true);
  if (blocks.length === 0) return "";
  
  let code = "import turtle\nimport random\nt = turtle.Turtle()\n\n";
  
  const getValueCode = (block, inputName, defaultVal) => {
    const input = block.getInput(inputName);
    if (!input || !input.connection || !input.connection.targetBlock()) {
      return defaultVal;
    }
    const targetBlock = input.connection.targetBlock();
    return processValueBlock(targetBlock);
  };
  
  const processValueBlock = (block) => {
    if (!block) return "0";
    
    switch (block.type) {
      case 'math_number':
        return block.getFieldValue('NUM')?.toString() || "0";
      case 'math_arithmetic': {
        const a = getValueCode(block, 'A', '0');
        const b = getValueCode(block, 'B', '0');
        const op = block.getFieldValue('OP');
        const opMap = { ADD: '+', SUBTRACT: '-', MULTIPLY: '*', DIVIDE: '/' };
        return `(${a} ${opMap[op] || '+'} ${b})`;
      }
      case 'math_random': {
        const from = getValueCode(block, 'FROM', '1');
        const to = getValueCode(block, 'TO', '10');
        return `random.randint(${from}, ${to})`;
      }
      case 'variables_get':
        return block.getField('VAR')?.getText() || 'x';
      case 'logic_compare': {
        const a = getValueCode(block, 'A', '0');
        const b = getValueCode(block, 'B', '0');
        const op = block.getFieldValue('OP');
        const opMap = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
        return `${a} ${opMap[op] || '=='} ${b}`;
      }
      case 'logic_operation': {
        const a = getValueCode(block, 'A', 'True');
        const b = getValueCode(block, 'B', 'True');
        const op = block.getFieldValue('OP');
        return `${a} ${op.toLowerCase()} ${b}`;
      }
      case 'logic_not': {
        const val = getValueCode(block, 'BOOL', 'True');
        return `not ${val}`;
      }
      case 'logic_boolean':
        return block.getFieldValue('BOOL') === 'TRUE' ? 'True' : 'False';
      default:
        return "0";
    }
  };
  
  const processBlock = (block, indent = '') => {
    if (!block) return "";
    let blockCode = "";
    
    switch (block.type) {
      case 'turtle_forward': {
        const steps = getValueCode(block, 'STEPS', '50');
        blockCode = `${indent}t.forward(${steps})\n`;
        break;
      }
      case 'turtle_backward': {
        const steps = getValueCode(block, 'STEPS', '50');
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
      case 'turtle_home':
        blockCode = `${indent}t.home()\n`;
        break;
      case 'turtle_pendown':
        blockCode = `${indent}t.pendown()\n`;
        break;
      case 'turtle_penup':
        blockCode = `${indent}t.penup()\n`;
        break;
      case 'turtle_color': {
        const color = block.getFieldValue('COLOR') || 'red';
        blockCode = `${indent}t.color("${color}")\n`;
        break;
      }
      case 'turtle_pensize': {
        const size = getValueCode(block, 'SIZE', '2');
        blockCode = `${indent}t.pensize(${size})\n`;
        break;
      }
      case 'turtle_say': {
        const text = block.getFieldValue('TEXT');
        blockCode = `${indent}t.write("${text}", align="center", font=("Arial", 12, "normal"))\n`;
        break;
      }
      case 'turtle_say_for': {
        const text = block.getFieldValue('TEXT');
        blockCode = `${indent}t.write("${text}", align="center", font=("Arial", 12, "normal"))\n`;
        break;
      }
      case 'turtle_hide':
        blockCode = `${indent}t.hideturtle()\n`;
        break;
      case 'turtle_show':
        blockCode = `${indent}t.showturtle()\n`;
        break;
      case 'turtle_repeat': {
        const times = getValueCode(block, 'TIMES', '4');
        blockCode = `${indent}for _ in range(${times}):\n`;
        const doBlock = block.getInputTargetBlock('DO');
        if (doBlock) {
          blockCode += processBlockChain(doBlock, indent + '    ');
        } else {
          blockCode += `${indent}    pass\n`;
        }
        break;
      }
      case 'turtle_for': {
        const varName = block.getField('VAR')?.getText() || 'i';
        const from = getValueCode(block, 'FROM', '1');
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
        const varName = block.getField('VAR')?.getText() || 'x';
        const value = getValueCode(block, 'VALUE', '0');
        blockCode = `${indent}${varName} = ${value}\n`;
        break;
      }
      case 'variables_change': {
        const varName = block.getField('VAR')?.getText() || 'x';
        const delta = getValueCode(block, 'DELTA', '1');
        blockCode = `${indent}${varName} = ${varName} + ${delta}\n`;
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

/**
 * TurtleBlocklyEditor - A reusable Blockly editor for turtle programming
 * Can be used in both teacher problem creation and student assignment views
 */
const TurtleBlocklyEditor = forwardRef(({
  initialXml = "",
  onCodeChange,
  onXmlChange,
  readOnly = false,
  showPreview = true,
  showCodeToggle = true,
  height = "400px",
  compact = false
}, ref) => {
  const blocklyDivRef = useRef(null);
  const workspaceRef = useRef(null);
  const turtleRef = useRef(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const blocksDefinedRef = useRef(false);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getXml: () => {
      if (workspaceRef.current) {
        const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
        return Blockly.Xml.domToText(xml);
      }
      return "";
    },
    getCode: () => generatedCode,
    setXml: (xml) => {
      if (workspaceRef.current && xml) {
        try {
          workspaceRef.current.clear();
          const dom = Blockly.utils.xml.textToDom(xml);
          Blockly.Xml.domToWorkspace(dom, workspaceRef.current);
        } catch (e) {
          console.error("Error loading blocks:", e);
        }
      }
    },
    clear: () => {
      if (workspaceRef.current) {
        workspaceRef.current.clear();
      }
    },
    run: () => {
      if (turtleRef.current) {
        turtleRef.current.runInstant();
      }
    },
    reset: () => {
      if (turtleRef.current) {
        turtleRef.current.reset();
      }
    }
  }));

  // Initialize Blockly - use a flag to prevent double injection
  const injectedRef = useRef(false);
  
  useEffect(() => {
    // Prevent double injection (especially in React Strict Mode)
    if (!blocklyDivRef.current || injectedRef.current) return;
    
    // Mark as injected immediately
    injectedRef.current = true;
    
    // Clear any existing Blockly content first
    blocklyDivRef.current.innerHTML = '';
    
    // Define blocks only once
    if (!blocksDefinedRef.current) {
      defineTurtleBlocks();
      blocksDefinedRef.current = true;
    }

    // Create workspace with simplified configuration
    const workspace = Blockly.inject(blocklyDivRef.current, {
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
        startScale: compact ? 0.8 : 1.0,
        maxScale: 2,
        minScale: 0.3,
        scaleSpeed: 1.2
      },
      trashcan: true,
      scrollbars: {
        horizontal: true,
        vertical: true
      },
      sounds: false,
      renderer: 'zelos',
      readOnly: readOnly
    });

    workspaceRef.current = workspace;

    // Load initial XML if provided
    if (initialXml) {
      try {
        const dom = Blockly.utils.xml.textToDom(initialXml);
        Blockly.Xml.domToWorkspace(dom, workspace);
      } catch (e) {
        console.error("Error loading initial blocks:", e);
      }
    }

    // Listen for changes
    const handleChange = () => {
      const code = generatePythonCode(workspace);
      setGeneratedCode(code);
      
      if (onCodeChange) {
        onCodeChange(code);
      }
      
      if (onXmlChange) {
        const xml = Blockly.Xml.workspaceToDom(workspace);
        onXmlChange(Blockly.Xml.domToText(xml));
      }
    };

    workspace.addChangeListener(handleChange);

    // Auto-close flyout when a block is dragged to workspace
    workspace.addChangeListener((event) => {
      if (event.type === Blockly.Events.BLOCK_CREATE) {
        // Close the flyout after a short delay to let the block settle
        setTimeout(() => {
          const toolbox = workspace.getToolbox();
          if (toolbox) {
            toolbox.clearSelection();
          }
        }, 50);
      }
    });

    // Initial code generation
    handleChange();

    // Resize workspace after mount to fix layout
    setTimeout(() => {
      Blockly.svgResize(workspace);
    }, 100);

    // Resize on window resize
    const handleResize = () => {
      Blockly.svgResize(workspace);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (workspace) {
        workspace.dispose();
      }
      workspaceRef.current = null;
      injectedRef.current = false;
    };
  }, []);

  const handleRun = useCallback(() => {
    if (turtleRef.current && generatedCode) {
      setIsRunning(true);
      turtleRef.current.reset();
      setTimeout(() => {
        turtleRef.current.runInstant();
        setIsRunning(false);
      }, 100);
    }
  }, [generatedCode]);

  const handleReset = useCallback(() => {
    if (turtleRef.current) {
      turtleRef.current.reset();
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Inject Blockly CSS fixes */}
      <style>{blocklyStyles}</style>
      
      {/* Toolbar - Compact */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2 py-1.5 rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Blocks className="w-4 h-4" />
          <span className="font-bold text-sm">Turtle Blocks</span>
        </div>
        <div className="flex items-center gap-1.5">
          {showCodeToggle && (
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20 text-xs h-6 px-2"
              onClick={() => setShowCode(!showCode)}
            >
              <Code className="w-3 h-3 mr-1" />
              {showCode ? "Blocks" : "Code"}
            </Button>
          )}
          {showPreview && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 text-xs h-7"
                onClick={handleReset}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-xs h-7"
                onClick={handleRun}
                disabled={isRunning || !generatedCode}
              >
                <Play className="w-3 h-3 mr-1" />
                Run
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main content - Blockly workspace takes full space */}
      <div className="flex-1 flex border border-t-0 rounded-b-lg min-h-0 bg-white" style={{ height }}>
        {/* Blockly workspace - takes up all available space */}
        <div 
          className="flex-1 relative min-w-0"
          style={{ display: showCode ? 'none' : 'block' }}
        >
          <div 
            ref={blocklyDivRef} 
            className="absolute inset-0"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        
        {showCode && (
          <div className="flex-1 bg-gray-900 p-2 overflow-auto">
            <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">
              {generatedCode || "# No blocks yet - drag blocks to generate code"}
            </pre>
          </div>
        )}

        {/* Turtle preview - only when enabled */}
        {showPreview && (
          <div className="w-56 border-l bg-white flex items-center justify-center p-1 flex-shrink-0">
            <AnimatedTurtle
              ref={turtleRef}
              code={generatedCode}
              width={compact ? 180 : 200}
              height={compact ? 180 : 200}
            />
          </div>
        )}
      </div>
    </div>
  );
});

TurtleBlocklyEditor.displayName = 'TurtleBlocklyEditor';

export default TurtleBlocklyEditor;
export { generatePythonCode, TOOLBOX };
