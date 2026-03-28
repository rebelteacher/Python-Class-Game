import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Code, Blocks, Pencil } from "lucide-react";
import { toast } from "sonner";
import * as Blockly from 'blockly';
// Import standard Blockly blocks library (math, logic, loops, etc.)
import 'blockly/blocks';
import Editor from "@monaco-editor/react";
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
    z-index: 100000 !important;
    pointer-events: auto !important;
  }
  .blocklyHtmlInput {
    z-index: 100001 !important;
    pointer-events: auto !important;
  }
  .blocklyDropDownDiv {
    z-index: 100000 !important;
    pointer-events: auto !important;
  }
  /* Force all field elements to be clickable */
  .blocklyEditableText,
  .blocklyField,
  .blocklyFieldRect,
  .blocklyFieldNumber,
  .blocklyFieldTextInput {
    pointer-events: auto !important;
    cursor: pointer !important;
  }
  /* Ensure SVG elements within fields are interactive */
  .blocklyEditableText *,
  .blocklyFieldGroup * {
    pointer-events: auto !important;
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

  // Point in direction (setheading)
  Blockly.Blocks['turtle_setheading'] = {
    init: function() {
      this.appendValueInput("ANGLE")
          .setCheck("Number")
          .appendField("point in direction");
      this.appendDummyInput()
          .appendField(new Blockly.FieldDropdown([
            ["(use number)", ""],
            ["→ right (0°)", "0"],
            ["↑ up (90°)", "90"],
            ["← left (180°)", "180"],
            ["↓ down (270°)", "270"]
          ]), "PRESET");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Point the turtle in a specific direction. 0=right, 90=up, 180=left, 270=down");
    }
  };

  // ===== SENSING BLOCKS (Cyan - Color 180) =====
  
  // X Position reporter block
  Blockly.Blocks['turtle_xposition'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("x position");
      this.setOutput(true, "Number");
      this.setColour(180);
      this.setTooltip("Get the turtle's current x position (horizontal). Center is 0.");
    }
  };
  
  // Y Position reporter block
  Blockly.Blocks['turtle_yposition'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("y position");
      this.setOutput(true, "Number");
      this.setColour(180);
      this.setTooltip("Get the turtle's current y position (vertical). Center is 0.");
    }
  };
  
  // Direction reporter block
  Blockly.Blocks['turtle_direction'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("direction");
      this.setOutput(true, "Number");
      this.setColour(180);
      this.setTooltip("Get the turtle's current direction. 0=right, 90=up, 180=left, 270=down.");
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

  // Draw a dot at current position
  Blockly.Blocks['turtle_dot'] = {
    init: function() {
      this.appendValueInput("SIZE")
          .setCheck("Number")
          .appendField("draw dot size");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("Draw a filled circle (dot) at the turtle's current position");
    }
  };

  // ===== LOOKS BLOCKS (Purple - Color 260) =====

  Blockly.Blocks['turtle_say'] = {
    init: function() {
      this.appendValueInput("MESSAGE")
          .setCheck(["String", "Number"])
          .appendField("say");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(260);
      this.setTooltip("Display text or variable at turtle's position");
    }
  };

  Blockly.Blocks['turtle_say_for'] = {
    init: function() {
      this.appendValueInput("MESSAGE")
          .setCheck(["String", "Number"])
          .appendField("say");
      this.appendDummyInput()
          .appendField("for")
          .appendField(new Blockly.FieldNumber(2, 0.1, 60, 0.1), "SECONDS")
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

  Blockly.Blocks['turtle_bgcolor'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("set background to")
          .appendField(new Blockly.FieldDropdown([
            ["white", "white"],
            ["black", "black"],
            ["lightblue", "lightblue"],
            ["lightgreen", "lightgreen"],
            ["lightyellow", "lightyellow"],
            ["pink", "pink"],
            ["gray", "gray"],
            ["red", "red"],
            ["blue", "blue"],
            ["green", "green"],
            ["yellow", "yellow"],
            ["orange", "orange"],
            ["purple", "purple"],
            ["cyan", "cyan"]
          ]), "COLOR");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(260);
      this.setTooltip("Set the canvas background color");
    }
  };

  // ===== LOOP BLOCKS (Orange - Color 20) =====
  
  Blockly.Blocks['turtle_repeat'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("repeat")
          .appendField(new Blockly.FieldNumber(10, 1, 1000, 1), "TIMES")
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
          .appendField("from")
          .appendField(new Blockly.FieldNumber(1, -1000, 1000, 1), "FROM")
          .appendField("to")
          .appendField(new Blockly.FieldNumber(10, -1000, 1000, 1), "TO");
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

  // ===== EVENT BLOCKS (Yellow - Color 65) =====
  
  Blockly.Blocks['event_start'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("🚩 when program starts");
      this.setNextStatement(true, null);
      this.setColour(65);
      this.setTooltip("Run this code when the program starts");
    }
  };

  Blockly.Blocks['event_key_pressed'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("⌨️ when")
          .appendField(new Blockly.FieldDropdown([
            ["space", "space"],
            ["up arrow", "up"],
            ["down arrow", "down"],
            ["left arrow", "left"],
            ["right arrow", "right"],
            ["a", "a"],
            ["b", "b"],
            ["c", "c"],
            ["d", "d"],
            ["w", "w"],
            ["s", "s"],
            ["any", "any"]
          ]), "KEY")
          .appendField("key pressed");
      this.setNextStatement(true, null);
      this.setColour(65);
      this.setTooltip("Run this code when a key is pressed");
    }
  };

  Blockly.Blocks['event_clicked'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("🖱️ when turtle clicked");
      this.setNextStatement(true, null);
      this.setColour(65);
      this.setTooltip("Run this code when the turtle is clicked");
    }
  };

  Blockly.Blocks['event_mouse_move'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("🖱️ when mouse moves");
      this.setNextStatement(true, null);
      this.setColour(65);
      this.setTooltip("Run this code when the mouse moves");
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
      name: '🚩 Events',
      colour: '65',
      contents: [
        { kind: 'block', type: 'event_start' },
        { kind: 'block', type: 'event_key_pressed' },
        { kind: 'block', type: 'event_clicked' },
        { kind: 'block', type: 'event_mouse_move' }
      ]
    },
    {
      kind: 'category',
      name: '🐢 Motion',
      colour: '230',
      contents: [
        { kind: 'block', type: 'turtle_forward', inputs: { STEPS: { shadow: { type: 'math_number', fields: { NUM: 50 } } } } },
        { kind: 'block', type: 'turtle_backward', inputs: { STEPS: { shadow: { type: 'math_number', fields: { NUM: 50 } } } } },
        { kind: 'block', type: 'turtle_right', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 90 } } } } },
        { kind: 'block', type: 'turtle_left', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 90 } } } } },
        { kind: 'block', type: 'turtle_setheading', inputs: { ANGLE: { shadow: { type: 'math_number', fields: { NUM: 90 } } } } },
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
        { kind: 'block', type: 'turtle_pensize', inputs: { SIZE: { shadow: { type: 'math_number', fields: { NUM: 2 } } } } },
        { kind: 'block', type: 'turtle_dot', inputs: { SIZE: { shadow: { type: 'math_number', fields: { NUM: 20 } } } } }
      ]
    },
    {
      kind: 'category',
      name: '💬 Looks',
      colour: '260',
      contents: [
        { kind: 'block', type: 'turtle_say', inputs: { MESSAGE: { shadow: { type: 'text', fields: { TEXT: 'Hello!' } } } } },
        { kind: 'block', type: 'turtle_say_for', inputs: { MESSAGE: { shadow: { type: 'text', fields: { TEXT: 'Hello!' } } } } },
        { kind: 'block', type: 'turtle_hide' },
        { kind: 'block', type: 'turtle_show' },
        { kind: 'block', type: 'turtle_bgcolor' }
      ]
    },
    {
      kind: 'category',
      name: '👁️ Sensing',
      colour: '180',
      contents: [
        { kind: 'block', type: 'turtle_xposition' },
        { kind: 'block', type: 'turtle_yposition' },
        { kind: 'block', type: 'turtle_direction' }
      ]
    },
    {
      kind: 'category',
      name: '🔄 Loops',
      colour: '120',
      contents: [
        { kind: 'block', type: 'turtle_repeat' },
        { kind: 'block', type: 'turtle_for' },
        { kind: 'block', type: 'turtle_while' }
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
        { kind: 'block', type: 'logic_compare', inputs: {
          A: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
          B: { shadow: { type: 'math_number', fields: { NUM: 0 } } }
        }},
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
  
  // Track event handlers separately
  const eventHandlers = {
    onStart: [],
    onKeyPressed: {},  // key -> [blocks]
    onClicked: [],
    onMouseMove: []
  };
  
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
        const opMap = { ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/', POWER: '**' };
        return `(${a} ${opMap[op] || '+'} ${b})`;
      }
      case 'math_random': {
        const from = getValueCode(block, 'FROM', '1');
        const to = getValueCode(block, 'TO', '10');
        return `random.randint(${from}, ${to})`;
      }
      case 'math_random_int': {
        const from = getValueCode(block, 'FROM', '1');
        const to = getValueCode(block, 'TO', '10');
        return `random.randint(${from}, ${to})`;
      }
      case 'math_random_float': {
        return `random.random()`;
      }
      case 'math_number_property': {
        const numVal = getValueCode(block, 'NUMBER_TO_CHECK', '0');
        const prop = block.getFieldValue('PROPERTY');
        switch (prop) {
          case 'EVEN': return `(${numVal} % 2 == 0)`;
          case 'ODD': return `(${numVal} % 2 != 0)`;
          case 'POSITIVE': return `(${numVal} > 0)`;
          case 'NEGATIVE': return `(${numVal} < 0)`;
          case 'DIVISIBLE_BY': {
            const divisor = getValueCode(block, 'DIVISOR', '1');
            return `(${numVal} % ${divisor} == 0)`;
          }
          default: return `(${numVal} % 2 == 0)`;
        }
      }
      case 'math_modulo': {
        const dividend = getValueCode(block, 'DIVIDEND', '0');
        const divisor = getValueCode(block, 'DIVISOR', '1');
        return `(${dividend} % ${divisor})`;
      }
      case 'text':
        return `"${block.getFieldValue('TEXT') || ''}"`;
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
      case 'turtle_xposition':
        return 't.xcor()';
      case 'turtle_yposition':
        return 't.ycor()';
      case 'turtle_direction':
        return 't.heading()';
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
      case 'turtle_setheading': {
        const preset = block.getFieldValue('PRESET');
        let angle;
        if (preset && preset !== '') {
          angle = preset;
        } else {
          angle = getValueCode(block, 'ANGLE', '0');
        }
        blockCode = `${indent}t.setheading(${angle})\n`;
        break;
      }
      case 'turtle_dot': {
        const size = getValueCode(block, 'SIZE', '20');
        blockCode = `${indent}t.dot(${size})\n`;
        break;
      }
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
        const message = getValueCode(block, 'MESSAGE', '"Hello!"');
        // Check if it's a variable (no quotes) or literal string
        const isVariable = !message.startsWith('"') && !message.startsWith("'") && !/^\d/.test(message);
        if (isVariable) {
          blockCode = `${indent}t.write(${message}, align="center", font=("Arial", 12, "normal"))\n`;
        } else {
          blockCode = `${indent}t.write(${message}, align="center", font=("Arial", 12, "normal"))\n`;
        }
        break;
      }
      case 'turtle_say_for': {
        const message = getValueCode(block, 'MESSAGE', '"Hello!"');
        blockCode = `${indent}t.write(${message}, align="center", font=("Arial", 12, "normal"))\n`;
        break;
      }
      case 'turtle_hide':
        blockCode = `${indent}t.hideturtle()\n`;
        break;
      case 'turtle_show':
        blockCode = `${indent}t.showturtle()\n`;
        break;
      case 'turtle_bgcolor': {
        const color = block.getFieldValue('COLOR') || 'white';
        blockCode = `${indent}turtle.bgcolor("${color}")\n`;
        break;
      }
      case 'turtle_repeat': {
        const times = block.getFieldValue('TIMES') || '4';
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
        const from = block.getFieldValue('FROM') || '1';
        const to = block.getFieldValue('TO') || '10';
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
          const bodyCode = processBlockChain(doBlock, indent + '    ');
          blockCode += bodyCode;
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
      case 'variables_change':
      case 'math_change': {
        const varName = block.getField('VAR')?.getText() || 'x';
        const delta = getValueCode(block, 'DELTA', '1');
        blockCode = `${indent}${varName} = ${varName} + ${delta}\n`;
        break;
      }
      // Event blocks - these are "hat" blocks that mark the start of event handlers
      case 'event_start':
      case 'event_key_pressed':
      case 'event_clicked':
      case 'event_mouse_move':
        // These are handled specially at the top level - no code generated here
        break;
      default:
        break;
    }
    
    return blockCode;
  };
  
  const processBlockChain = (block, indent = '') => {
    let chainCode = "";
    let currentBlock = block;
    let blockCount = 0;
    while (currentBlock) {
      const generatedBlock = processBlock(currentBlock, indent);
      chainCode += generatedBlock;
      currentBlock = currentBlock.getNextBlock();
      blockCount++;
    }
    return chainCode;
  };
  
  // First pass: categorize blocks by their event type
  for (const block of blocks) {
    const blockType = block.type;
    
    if (blockType === 'event_start') {
      // Blocks attached to "when program starts" run at startup
      const nextBlock = block.getNextBlock();
      if (nextBlock) {
        eventHandlers.onStart.push(nextBlock);
      }
    } else if (blockType === 'event_key_pressed') {
      // Blocks attached to "when key pressed" run when that key is pressed
      const key = block.getFieldValue('KEY') || 'space';
      if (!eventHandlers.onKeyPressed[key]) {
        eventHandlers.onKeyPressed[key] = [];
      }
      const nextBlock = block.getNextBlock();
      if (nextBlock) {
        eventHandlers.onKeyPressed[key].push(nextBlock);
      }
    } else if (blockType === 'event_clicked') {
      // Blocks attached to "when clicked" run when turtle is clicked
      const nextBlock = block.getNextBlock();
      if (nextBlock) {
        eventHandlers.onClicked.push(nextBlock);
      }
    } else if (blockType === 'event_mouse_move') {
      // Blocks attached to "when mouse moves"
      const nextBlock = block.getNextBlock();
      if (nextBlock) {
        eventHandlers.onMouseMove.push(nextBlock);
      }
    } else {
      // Regular blocks (not under any event) - run at startup
      eventHandlers.onStart.push(block);
    }
  }
  
  // Generate startup code
  if (eventHandlers.onStart.length > 0) {
    code += "# Startup code\n";
    for (const block of eventHandlers.onStart) {
      code += processBlockChain(block);
    }
    code += "\n";
  }
  
  // Generate key event handler functions
  const keyNames = Object.keys(eventHandlers.onKeyPressed);
  if (keyNames.length > 0) {
    for (const key of keyNames) {
      const handlerBlocks = eventHandlers.onKeyPressed[key];
      const funcName = `on_key_${key.replace(/\s+/g, '_')}`;
      code += `# EVENT: When "${key}" key pressed\n`;
      code += `def ${funcName}():\n`;
      for (const block of handlerBlocks) {
        code += processBlockChain(block, '    ');
      }
      if (handlerBlocks.length === 0) {
        code += "    pass\n";
      }
      code += "\n";
    }
  }
  
  // Generate click event handler
  if (eventHandlers.onClicked.length > 0) {
    code += "# EVENT: When turtle clicked\n";
    code += "def on_turtle_clicked():\n";
    for (const block of eventHandlers.onClicked) {
      code += processBlockChain(block, '    ');
    }
    code += "\n";
  }
  
  // Generate mouse move event handler
  if (eventHandlers.onMouseMove.length > 0) {
    code += "# EVENT: When mouse moves\n";
    code += "def on_mouse_move():\n";
    for (const block of eventHandlers.onMouseMove) {
      code += processBlockChain(block, '    ');
    }
    code += "\n";
  }
  
  
  // Check if we have any actual turtle commands (not just imports)
  const hasCommands = /t\.\w+\(/.test(code);
  if (!hasCommands && blocks.length > 0) {
    console.warn("⚠️ Warning: Blocks found but no turtle commands generated. Make sure to use command blocks like 'forward', 'turn right', etc.");
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
  onRun,
  readOnly = false,
  showPreview = true,
  showCodeToggle = true,
  editableCode = false,
  height = "400px",
  compact = false
}, ref) => {
  const blocklyDivRef = useRef(null);
  const workspaceRef = useRef(null);
  const turtleRef = useRef(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [manualCode, setManualCode] = useState(null); // null = use generatedCode
  const [showCode, setShowCode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const blocksDefinedRef = useRef(false);

  // The active code is manual edits if present, otherwise block-generated
  const activeCode = manualCode !== null ? manualCode : generatedCode;

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getXml: () => {
      if (workspaceRef.current) {
        const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
        return Blockly.Xml.domToText(xml);
      }
      return "";
    },
    getCode: () => manualCode !== null ? manualCode : generatedCode,
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

    // Fix pointer-events for fields inside modals/dialogs
    // Blockly fields need pointer-events: auto to be clickable
    setTimeout(() => {
      const blocklyDiv = blocklyDivRef.current;
      if (blocklyDiv) {
        // Force resize to ensure proper layout
        Blockly.svgResize(workspace);
        
        // Ensure all field elements are clickable
        const fieldElements = blocklyDiv.querySelectorAll('.blocklyEditableText, .blocklyField, .blocklyFieldRect, .blocklyNonEditableText');
        fieldElements.forEach(el => {
          el.style.pointerEvents = 'auto';
        });
      }
    }, 100);

    // Watch for Blockly input appearing and force focus
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              // Check if it's a blocklyHtmlInput
              if (node.classList?.contains('blocklyHtmlInput')) {
                setTimeout(() => {
                  node.focus();
                  node.select();
                }, 10);
              }
              // Or check children
              const input = node.querySelector?.('.blocklyHtmlInput');
              if (input) {
                setTimeout(() => {
                  input.focus();
                  input.select();
                }, 10);
              }
            }
          });
        }
      });
    });
    
    // Start observing the document body for Blockly widget div
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

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
      observer.disconnect(); // Clean up the MutationObserver
      if (workspace) {
        workspace.dispose();
      }
      workspaceRef.current = null;
      injectedRef.current = false;
    };
  }, []);

  const handleRun = useCallback(() => {
    const codeToRun = manualCode !== null ? manualCode : generatedCode;
    console.log("🟢 handleRun called");
    console.log("🟢 codeToRun:", codeToRun?.substring(0, 100));
    console.log("🟢 turtleRef.current:", !!turtleRef.current);
    if (turtleRef.current && codeToRun) {
      setIsRunning(true);
      
      // Check if code has event handlers (look for "def on_key_" or similar patterns)
      const hasEventHandlers = /def on_key_|def on_turtle_clicked|def on_mouse_move/.test(codeToRun);
      
      if (hasEventHandlers) {
        // Use event mode which runs startup code and activates event listeners
        console.log("🟢 Event handlers detected, starting event mode");
        turtleRef.current.startEventMode();
        setIsRunning(false);
        if (onRun) {
          onRun(codeToRun);
        }
      } else {
        // Standard mode - just run the code
        console.log("🟢 Standard mode - calling reset then runInstant");
        turtleRef.current.reset();
        setTimeout(() => {
          console.log("🟢 Calling runInstant now");
          turtleRef.current.runInstant();
          setIsRunning(false);
          // Notify parent that code was run
          console.log("🟢 Run complete");
          if (onRun) {
            onRun(codeToRun);
          }
        }, 100);
      }
    } else {
      console.log("🟢 Cannot run - missing turtleRef or code", { hasTurtleRef: !!turtleRef.current, hasCode: !!codeToRun });
    }
  }, [generatedCode, manualCode, onRun]);

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
              type="button"
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20 text-xs h-6 px-2"
              onClick={() => setShowCode(!showCode)}
            >
              {showCode ? <><Blocks className="w-3 h-3 mr-1" />Blocks</> : <><Code className="w-3 h-3 mr-1" />{editableCode ? "Code" : "Code"}</>}
            </Button>
          )}
          {showPreview && (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 text-xs h-7"
                onClick={handleReset}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-xs h-7"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("🟢 Run button clicked directly");
                  handleRun();
                }}
                disabled={isRunning || !activeCode}
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
          editableCode ? (
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center justify-between bg-gray-800 px-3 py-1 border-b border-gray-700">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Write Python code here
                </span>
                {manualCode !== null && (
                  <button 
                    className="text-xs text-yellow-400 hover:text-yellow-300"
                    onClick={() => { setManualCode(null); }}
                  >
                    Reset to blocks
                  </button>
                )}
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  value={activeCode || "# Type your Python turtle code here\nimport turtle\nt = turtle.Turtle()\n"}
                  onChange={(value) => {
                    setManualCode(value || "");
                    if (onCodeChange) onCodeChange(value || "");
                  }}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    tabSize: 4,
                    insertSpaces: true,
                    automaticLayout: true,
                    padding: { top: 8 },
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-gray-900 p-2 overflow-auto">
              <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">
                {generatedCode || "# No blocks yet - drag blocks to generate code"}
              </pre>
            </div>
          )
        )}

        {/* Turtle preview - only when enabled */}
        {showPreview && (
          <div className="w-[420px] border-l bg-white flex items-center justify-center p-2 flex-shrink-0">
            <AnimatedTurtle
              ref={turtleRef}
              code={activeCode}
              width={compact ? 300 : 400}
              height={compact ? 300 : 400}
              onRun={() => {
                console.log("AnimatedTurtle onRun callback triggered");
                if (onRun) onRun(generatedCode);
              }}
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
