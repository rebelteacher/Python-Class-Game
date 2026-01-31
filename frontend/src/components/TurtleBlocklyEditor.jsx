import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Code, Blocks } from "lucide-react";
import { toast } from "sonner";
import * as Blockly from 'blockly';
// Import standard Blockly blocks library (math, logic, loops, etc.)
import 'blockly/blocks';
import AnimatedTurtle from "@/components/AnimatedTurtle";

// CSS to fix Blockly layout issues and hide flyout scrollbar
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
  /* Hide only the flyout scrollbar, not workspace scrollbars */
  .blocklyFlyout .blocklyScrollbarVertical,
  .blocklyFlyout .blocklyScrollbarHorizontal {
    display: none !important;
  }
  .blocklyFlyoutScrollbar {
    display: none !important;
  }
  /* Ensure Blockly widget div is visible and interactive */
  .blocklyWidgetDiv {
    z-index: 10000 !important;
  }
  .blocklyHtmlInput {
    z-index: 10001 !important;
    pointer-events: auto !important;
  }
  .blocklyDropDownDiv {
    z-index: 10000 !important;
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

  // NOTE: Standard Blockly blocks (logic_*, math_*, variables_*, etc.) 
  // are now imported from 'blockly/blocks' - no need to redefine them here
};

// Toolbox configuration
// Full Category Toolbox with all Blockly features
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
      colour: '120',
      contents: [
        { kind: 'block', type: 'turtle_repeat', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 4 } } } } },
        { kind: 'block', type: 'turtle_for', inputs: { 
          FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
          TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } }
        } },
        { kind: 'block', type: 'turtle_while' },
        { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'controls_whileUntil' },
        { kind: 'block', type: 'controls_for', inputs: {
          FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
          TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } },
          BY: { shadow: { type: 'math_number', fields: { NUM: 1 } } }
        }},
        { kind: 'block', type: 'controls_forEach' },
        { kind: 'block', type: 'controls_flow_statements' }
      ]
    },
    {
      kind: 'category',
      name: '🔀 Control',
      colour: '210',
      contents: [
        { kind: 'block', type: 'turtle_if' },
        { kind: 'block', type: 'turtle_if_else' },
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'controls_ifelse' }
      ]
    },
    {
      kind: 'category',
      name: '⚖️ Logic',
      colour: '210',
      contents: [
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_negate' },
        { kind: 'block', type: 'logic_boolean' },
        { kind: 'block', type: 'logic_null' },
        { kind: 'block', type: 'logic_ternary' }
      ]
    },
    {
      kind: 'category',
      name: '🔢 Math',
      colour: '230',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
        { kind: 'block', type: 'math_single' },
        { kind: 'block', type: 'math_trig' },
        { kind: 'block', type: 'math_constant' },
        { kind: 'block', type: 'math_number_property' },
        { kind: 'block', type: 'math_round' },
        { kind: 'block', type: 'math_on_list' },
        { kind: 'block', type: 'math_modulo' },
        { kind: 'block', type: 'math_constrain', inputs: {
          LOW: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
          HIGH: { shadow: { type: 'math_number', fields: { NUM: 100 } } }
        }},
        { kind: 'block', type: 'math_random_int', inputs: {
          FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
          TO: { shadow: { type: 'math_number', fields: { NUM: 100 } } }
        }},
        { kind: 'block', type: 'math_random_float' }
      ]
    },
    {
      kind: 'category',
      name: '📝 Text',
      colour: '160',
      contents: [
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_join' },
        { kind: 'block', type: 'text_append', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: '' } } } } },
        { kind: 'block', type: 'text_length' },
        { kind: 'block', type: 'text_isEmpty' },
        { kind: 'block', type: 'text_indexOf', inputs: { 
          VALUE: { block: { type: 'variables_get' } },
          FIND: { shadow: { type: 'text', fields: { TEXT: 'abc' } } }
        }},
        { kind: 'block', type: 'text_charAt', inputs: {
          VALUE: { block: { type: 'variables_get' } }
        }},
        { kind: 'block', type: 'text_getSubstring', inputs: {
          STRING: { block: { type: 'variables_get' } }
        }},
        { kind: 'block', type: 'text_changeCase' },
        { kind: 'block', type: 'text_trim' },
        { kind: 'block', type: 'text_print' },
        { kind: 'block', type: 'text_prompt_ext', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: 'Enter text:' } } } } }
      ]
    },
    {
      kind: 'category',
      name: '📋 Lists',
      colour: '260',
      contents: [
        { kind: 'block', type: 'lists_create_with' },
        { kind: 'block', type: 'lists_create_with', extraState: { itemCount: 0 } },
        { kind: 'block', type: 'lists_repeat', inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 5 } } } } },
        { kind: 'block', type: 'lists_length' },
        { kind: 'block', type: 'lists_isEmpty' },
        { kind: 'block', type: 'lists_indexOf', inputs: { VALUE: { block: { type: 'variables_get' } } } },
        { kind: 'block', type: 'lists_getIndex', inputs: { VALUE: { block: { type: 'variables_get' } } } },
        { kind: 'block', type: 'lists_setIndex', inputs: { LIST: { block: { type: 'variables_get' } } } },
        { kind: 'block', type: 'lists_getSublist', inputs: { LIST: { block: { type: 'variables_get' } } } },
        { kind: 'block', type: 'lists_split', inputs: { DELIM: { shadow: { type: 'text', fields: { TEXT: ',' } } } } },
        { kind: 'block', type: 'lists_sort' },
        { kind: 'block', type: 'lists_reverse' }
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
      name: '🔧 Functions',
      colour: '290',
      custom: 'PROCEDURE'
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

    // Create workspace - standard vertical layout
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
        startScale: compact ? 0.6 : 0.75,
        maxScale: 2,
        minScale: 0.3,
        scaleSpeed: 1.2
      },
      trashcan: true,
      scrollbars: true,
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
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2 py-1.5 flex-shrink-0">
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
      <div className="flex-1 flex border border-t-0 min-h-0 bg-white" style={{ height }}>
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
          <div className="w-80 border-l bg-white flex items-center justify-center p-2 flex-shrink-0">
            <AnimatedTurtle
              ref={turtleRef}
              code={generatedCode}
              width={compact ? 260 : 300}
              height={compact ? 260 : 300}
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
