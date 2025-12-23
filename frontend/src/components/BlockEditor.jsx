import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Pause } from "lucide-react";
import * as Blockly from 'blockly';

// Define sprite control blocks
const defineSpriteBlocks = () => {
  // Only define if not already defined
  if (Blockly.Blocks['sprite_move']) return;

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
    }
  };

  // Say
  Blockly.Blocks['sprite_say'] = {
    init: function() {
      this.appendValueInput("TEXT")
          .setCheck("String")
          .appendField("say");
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

  // When started (event)
  Blockly.Blocks['event_start'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("🚩 when started");
      this.setNextStatement(true, null);
      this.setColour(65);
    }
  };

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
          .appendField("times");
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

  // Variable set
  Blockly.Blocks['variable_set'] = {
    init: function() {
      this.appendValueInput("VALUE")
          .setCheck(null)
          .appendField("set")
          .appendField(new Blockly.FieldTextInput("myVar"), "VAR")
          .appendField("to");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
    }
  };

  // Variable change
  Blockly.Blocks['variable_change'] = {
    init: function() {
      this.appendValueInput("VALUE")
          .setCheck("Number")
          .appendField("change")
          .appendField(new Blockly.FieldTextInput("myVar"), "VAR")
          .appendField("by");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
    }
  };

  // Operators
  Blockly.Blocks['operator_add'] = {
    init: function() {
      this.appendValueInput("A").setCheck("Number");
      this.appendDummyInput().appendField("+");
      this.appendValueInput("B").setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setColour(120);
    }
  };

  Blockly.Blocks['operator_lt'] = {
    init: function() {
      this.appendValueInput("A").setCheck("Number");
      this.appendDummyInput().appendField("<");
      this.appendValueInput("B").setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
      this.setColour(120);
    }
  };

  Blockly.Blocks['operator_gt'] = {
    init: function() {
      this.appendValueInput("A").setCheck("Number");
      this.appendDummyInput().appendField(">");
      this.appendValueInput("B").setCheck("Number");
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
      this.setColour(120);
    }
  };
};

// Toolbox configuration
const TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: '🎬 Events',
      colour: '65',
      contents: [
        { kind: 'block', type: 'event_start' },
      ]
    },
    {
      kind: 'category',
      name: '🚀 Motion',
      colour: '230',
      contents: [
        { kind: 'block', type: 'sprite_move', inputs: { STEPS: { shadow: { type: 'math_number', fields: { NUM: 10 }}}}},
        { kind: 'block', type: 'sprite_turn_right', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 15 }}}}},
        { kind: 'block', type: 'sprite_turn_left', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 15 }}}}},
        { kind: 'block', type: 'sprite_goto' },
      ]
    },
    {
      kind: 'category',
      name: '👀 Looks',
      colour: '290',
      contents: [
        { kind: 'block', type: 'sprite_say' },
        { kind: 'block', type: 'sprite_show' },
        { kind: 'block', type: 'sprite_hide' },
        { kind: 'block', type: 'sprite_set_size' },
      ]
    },
    {
      kind: 'category',
      name: '🔄 Control',
      colour: '40',
      contents: [
        { kind: 'block', type: 'control_wait' },
        { kind: 'block', type: 'control_repeat' },
        { kind: 'block', type: 'control_forever' },
        { kind: 'block', type: 'control_if' },
      ]
    },
    {
      kind: 'category',
      name: '📊 Variables',
      colour: '330',
      contents: [
        { kind: 'block', type: 'variable_set' },
        { kind: 'block', type: 'variable_change' },
      ]
    },
    {
      kind: 'category',
      name: '🔢 Math',
      colour: '230',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'operator_add' },
        { kind: 'block', type: 'operator_lt' },
        { kind: 'block', type: 'operator_gt' },
      ]
    },
    {
      kind: 'category',
      name: '💬 Text',
      colour: '160',
      contents: [
        { kind: 'block', type: 'text' },
      ]
    },
  ]
};

// Block Editor Component for student assignments
const BlockEditor = forwardRef(({ 
  initialXml = '',
  onBlocksChange,
  onRun,
  width = '100%',
  height = 400
}, ref) => {
  const blocklyDiv = useRef(null);
  const workspaceRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize Blockly
  useEffect(() => {
    if (!blocklyDiv.current || workspaceRef.current) return;
    
    // Define custom blocks
    defineSpriteBlocks();
    
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
        minScale: 0.5,
        scaleSpeed: 1.2
      },
      trashcan: true,
      sounds: false,
    });

    // Add default starter block
    if (!initialXml) {
      const xml = `
        <xml>
          <block type="event_start" x="50" y="50">
          </block>
        </xml>
      `;
      Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspaceRef.current);
    } else {
      try {
        Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(initialXml), workspaceRef.current);
      } catch (e) {
        console.error("Error loading initial XML:", e);
      }
    }

    // Listen for changes
    workspaceRef.current.addChangeListener(() => {
      if (onBlocksChange) {
        const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
        const xmlText = Blockly.Xml.domToText(xml);
        onBlocksChange(xmlText);
      }
    });

    setIsReady(true);

    return () => {
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      }
    };
  }, [initialXml, onBlocksChange]);

  // Convert blocks to executable commands
  const blocksToCommands = useCallback(() => {
    if (!workspaceRef.current) return [];
    
    const commands = [];
    const topBlocks = workspaceRef.current.getTopBlocks(true);
    
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
        case 'sprite_say':
          cmds.push({ type: 'say', value: getBlockValue(block, 'TEXT', 'Hello!') });
          break;
        case 'control_wait':
          cmds.push({ type: 'wait', duration: getBlockValue(block, 'SECS', 1) * 1000 });
          break;
        default:
          break;
      }
    };

    const processBlock = (block) => {
      if (!block) return;
      
      const type = block.type;
      
      switch (type) {
        case 'event_start':
          processBlock(block.getNextBlock());
          break;
          
        case 'sprite_move':
          commands.push({ type: 'move', value: getBlockValue(block, 'STEPS', 10) });
          break;
          
        case 'sprite_turn_right':
          commands.push({ type: 'turn_right', value: getBlockValue(block, 'DEGREES', 15) });
          break;
          
        case 'sprite_turn_left':
          commands.push({ type: 'turn_left', value: getBlockValue(block, 'DEGREES', 15) });
          break;
          
        case 'sprite_goto':
          commands.push({ 
            type: 'goto', 
            x: getBlockValue(block, 'X', 0), 
            y: getBlockValue(block, 'Y', 0) 
          });
          break;
          
        case 'sprite_say':
          commands.push({ type: 'say', value: getBlockValue(block, 'TEXT', 'Hello!') });
          break;
          
        case 'sprite_show':
          commands.push({ type: 'show' });
          break;
          
        case 'sprite_hide':
          commands.push({ type: 'hide' });
          break;
          
        case 'sprite_set_size':
          commands.push({ type: 'set_size', value: getBlockValue(block, 'SIZE', 100) / 2 });
          break;
          
        case 'control_wait':
          commands.push({ type: 'wait', duration: getBlockValue(block, 'SECS', 1) * 1000 });
          break;
          
        case 'control_repeat':
          const times = getBlockValue(block, 'TIMES', 10);
          const repeatCommands = [];
          let doBlock = block.getInputTargetBlock('DO');
          while (doBlock) {
            processBlockForCommands(doBlock, repeatCommands);
            doBlock = doBlock.getNextBlock();
          }
          for (let i = 0; i < times; i++) {
            commands.push(...repeatCommands);
          }
          break;
        default:
          break;
      }
      
      // Process next block in sequence
      if (block.getNextBlock()) {
        processBlock(block.getNextBlock());
      }
    };

    // Process all top-level blocks
    for (const block of topBlocks) {
      processBlock(block);
    }

    return commands;
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getXml: () => {
      if (!workspaceRef.current) return '';
      const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
      return Blockly.Xml.domToText(xml);
    },
    setXml: (xmlText) => {
      if (!workspaceRef.current || !xmlText) return;
      workspaceRef.current.clear();
      Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xmlText), workspaceRef.current);
    },
    getCommands: blocksToCommands,
    clear: () => {
      if (workspaceRef.current) {
        workspaceRef.current.clear();
      }
    }
  }), [blocksToCommands]);

  return (
    <div className="w-full h-full">
      <div 
        ref={blocklyDiv} 
        style={{ width, height: typeof height === 'number' ? `${height}px` : height }}
        className="border rounded-lg"
      />
    </div>
  );
});

BlockEditor.displayName = "BlockEditor";

export default BlockEditor;
