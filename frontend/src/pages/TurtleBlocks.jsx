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

  // ===== NUMBER BLOCKS (Purple - Color 290) =====

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
};

// Generate Python code from blocks
const generatePythonCode = (workspace) => {
  let code = "import turtle\nt = turtle.Turtle()\n\n";
  
  const blocks = workspace.getTopBlocks(true);
  
  const processBlock = (block) => {
    let blockCode = "";
    
    switch (block.type) {
      case 'turtle_forward': {
        const steps = getValueCode(block, 'STEPS', '10');
        blockCode = `t.forward(${steps})\n`;
        break;
      }
      case 'turtle_backward': {
        const steps = getValueCode(block, 'STEPS', '10');
        blockCode = `t.backward(${steps})\n`;
        break;
      }
      case 'turtle_right': {
        const degrees = getValueCode(block, 'DEGREES', '90');
        blockCode = `t.right(${degrees})\n`;
        break;
      }
      case 'turtle_left': {
        const degrees = getValueCode(block, 'DEGREES', '90');
        blockCode = `t.left(${degrees})\n`;
        break;
      }
      case 'turtle_goto': {
        const x = getValueCode(block, 'X', '0');
        const y = getValueCode(block, 'Y', '0');
        blockCode = `t.goto(${x}, ${y})\n`;
        break;
      }
      case 'turtle_home': {
        blockCode = `t.goto(0, 0)\nt.setheading(90)\n`;
        break;
      }
      case 'turtle_pendown': {
        blockCode = `t.pendown()\n`;
        break;
      }
      case 'turtle_penup': {
        blockCode = `t.penup()\n`;
        break;
      }
      case 'turtle_color': {
        const color = block.getFieldValue('COLOR');
        blockCode = `t.color("${color}")\n`;
        break;
      }
      case 'turtle_pensize': {
        const size = getValueCode(block, 'SIZE', '1');
        blockCode = `t.pensize(${size})\n`;
        break;
      }
      case 'turtle_repeat': {
        const times = getValueCode(block, 'TIMES', '4');
        blockCode = `for i in range(${times}):\n`;
        const doBlock = block.getInputTargetBlock('DO');
        if (doBlock) {
          let innerCode = processBlockChain(doBlock);
          // Indent the inner code
          innerCode = innerCode.split('\n').map(line => line ? '    ' + line : '').join('\n');
          blockCode += innerCode + '\n';
        } else {
          blockCode += '    pass\n';
        }
        break;
      }
      default:
        break;
    }
    
    return blockCode;
  };
  
  const getValueCode = (block, inputName, defaultValue) => {
    const targetBlock = block.getInputTargetBlock(inputName);
    if (targetBlock && targetBlock.type === 'math_number') {
      return targetBlock.getFieldValue('NUM');
    }
    return defaultValue;
  };
  
  const processBlockChain = (block) => {
    let chainCode = "";
    let currentBlock = block;
    while (currentBlock) {
      chainCode += processBlock(currentBlock);
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
      name: '🔄 Control',
      colour: '20',
      contents: [
        { kind: 'block', type: 'turtle_repeat', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 4 } } } } }
      ]
    },
    {
      kind: 'category',
      name: '🔢 Numbers',
      colour: '290',
      contents: [
        { kind: 'block', type: 'math_number' }
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
                <CardContent className="p-0 h-full">
                  {showCode ? (
                    <div className="h-full bg-gray-900 text-green-400 font-mono p-4 overflow-auto">
                      <div className="flex items-center gap-2 mb-4 text-gray-400">
                        <Code className="w-4 h-4" />
                        <span className="text-sm">Generated Python Code</span>
                      </div>
                      <pre className="text-sm whitespace-pre-wrap">{generatedCode}</pre>
                    </div>
                  ) : (
                    <div 
                      ref={blocklyDiv} 
                      className="h-full w-full"
                      style={{ minHeight: '500px' }}
                    />
                  )}
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
