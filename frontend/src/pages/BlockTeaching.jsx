import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Play, 
  RotateCcw,
  Monitor,
  Code,
  Maximize2,
  Trash2,
  Copy,
  Terminal
} from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { toast } from "sonner";
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

// Custom block definitions for teaching
const defineCustomBlocks = () => {
  // Print block
  Blockly.Blocks['print_text'] = {
    init: function() {
      this.appendValueInput("TEXT")
          .setCheck(null)
          .appendField("print");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("Print text to the output");
    }
  };

  pythonGenerator.forBlock['print_text'] = function(block, generator) {
    const value = generator.valueToCode(block, 'TEXT', pythonGenerator.ORDER_NONE) || '""';
    return `print(${value})\n`;
  };

  // Input block
  Blockly.Blocks['input_text'] = {
    init: function() {
      this.appendValueInput("PROMPT")
          .setCheck("String")
          .appendField("input");
      this.setOutput(true, "String");
      this.setColour(160);
      this.setTooltip("Get input from user");
    }
  };

  pythonGenerator.forBlock['input_text'] = function(block, generator) {
    const prompt = generator.valueToCode(block, 'PROMPT', pythonGenerator.ORDER_NONE) || '""';
    return [`input(${prompt})`, pythonGenerator.ORDER_FUNCTION_CALL];
  };

  // Wait/Sleep block
  Blockly.Blocks['wait_seconds'] = {
    init: function() {
      this.appendValueInput("SECONDS")
          .setCheck("Number")
          .appendField("wait");
      this.appendDummyInput()
          .appendField("seconds");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("Wait for specified seconds");
    }
  };

  pythonGenerator.forBlock['wait_seconds'] = function(block, generator) {
    const seconds = generator.valueToCode(block, 'SECONDS', pythonGenerator.ORDER_NONE) || '1';
    return `time.sleep(${seconds})\n`;
  };
};

// Toolbox configuration
const TOOLBOX = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "💬 Output",
      colour: "#9966ff",
      contents: [
        {
          kind: "block",
          type: "print_text",
          inputs: {
            TEXT: {
              shadow: {
                type: "text",
                fields: { TEXT: "Hello, World!" }
              }
            }
          }
        },
        {
          kind: "block",
          type: "text"
        },
        {
          kind: "block",
          type: "text_join"
        }
      ]
    },
    {
      kind: "category",
      name: "🔢 Math",
      colour: "#5ba55b",
      contents: [
        { kind: "block", type: "math_number" },
        { kind: "block", type: "math_arithmetic" },
        { kind: "block", type: "math_random_int" }
      ]
    },
    {
      kind: "category",
      name: "📦 Variables",
      colour: "#a55b80",
      custom: "VARIABLE"
    },
    {
      kind: "category",
      name: "🔄 Loops",
      colour: "#5ba580",
      contents: [
        {
          kind: "block",
          type: "controls_repeat_ext",
          inputs: {
            TIMES: {
              shadow: { type: "math_number", fields: { NUM: 4 } }
            }
          }
        },
        { kind: "block", type: "controls_whileUntil" },
        { kind: "block", type: "controls_for" },
        { kind: "block", type: "controls_forEach" }
      ]
    },
    {
      kind: "category",
      name: "❓ Logic",
      colour: "#5b80a5",
      contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "controls_ifelse" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean" }
      ]
    },
    {
      kind: "category",
      name: "📝 Text",
      colour: "#5ba58c",
      contents: [
        { kind: "block", type: "text" },
        { kind: "block", type: "text_join" },
        { kind: "block", type: "text_length" },
        { kind: "block", type: "text_isEmpty" },
        { kind: "block", type: "text_charAt" }
      ]
    },
    {
      kind: "category",
      name: "📋 Lists",
      colour: "#745ba5",
      contents: [
        { kind: "block", type: "lists_create_empty" },
        { kind: "block", type: "lists_create_with" },
        { kind: "block", type: "lists_length" },
        { kind: "block", type: "lists_getIndex" },
        { kind: "block", type: "lists_setIndex" }
      ]
    },
    {
      kind: "category",
      name: "⚙️ Functions",
      colour: "#995ba5",
      custom: "PROCEDURE"
    }
  ]
};

// Lesson presets for teaching
const LESSON_PRESETS = {
  hello: {
    name: "Hello World",
    description: "Your first program - print a message!",
    blocks: `<xml><block type="print_text" x="50" y="50"><value name="TEXT"><shadow type="text"><field name="TEXT">Hello, World!</field></shadow></value></block></xml>`
  },
  variables: {
    name: "Using Variables",
    description: "Store and use data with variables",
    blocks: `<xml>
      <variables><variable>name</variable><variable>age</variable></variables>
      <block type="variables_set" x="50" y="50"><field name="VAR">name</field><value name="VALUE"><block type="text"><field name="TEXT">Alice</field></block></value><next>
      <block type="variables_set"><field name="VAR">age</field><value name="VALUE"><block type="math_number"><field name="NUM">15</field></block></value><next>
      <block type="print_text"><value name="TEXT"><block type="variables_get"><field name="VAR">name</field></block></value><next>
      <block type="print_text"><value name="TEXT"><block type="variables_get"><field name="VAR">age</field></block></value></block></next></block></next></block></next></block>
    </xml>`
  },
  loop: {
    name: "Repeat Loop",
    description: "Make code run multiple times",
    blocks: `<xml><block type="controls_repeat_ext" x="50" y="50"><value name="TIMES"><shadow type="math_number"><field name="NUM">5</field></shadow></value><statement name="DO"><block type="print_text"><value name="TEXT"><shadow type="text"><field name="TEXT">Hello!</field></shadow></value></block></statement></block></xml>`
  },
  conditional: {
    name: "If-Else Decision",
    description: "Make your program choose",
    blocks: `<xml>
      <variables><variable>score</variable></variables>
      <block type="variables_set" x="50" y="50"><field name="VAR">score</field><value name="VALUE"><block type="math_number"><field name="NUM">85</field></block></value><next>
      <block type="controls_ifelse"><value name="IF0"><block type="logic_compare"><field name="OP">GTE</field><value name="A"><block type="variables_get"><field name="VAR">score</field></block></value><value name="B"><block type="math_number"><field name="NUM">70</field></block></value></block></value><statement name="DO0"><block type="print_text"><value name="TEXT"><shadow type="text"><field name="TEXT">You passed!</field></shadow></value></block></statement><statement name="ELSE"><block type="print_text"><value name="TEXT"><shadow type="text"><field name="TEXT">Keep trying!</field></shadow></value></block></statement></block></next></block>
    </xml>`
  },
  counting: {
    name: "Counting Loop",
    description: "Use a for loop to count",
    blocks: `<xml><block type="controls_for" x="50" y="50"><field name="VAR">i</field><value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value><value name="TO"><shadow type="math_number"><field name="NUM">10</field></shadow></value><value name="BY"><shadow type="math_number"><field name="NUM">1</field></shadow></value><statement name="DO"><block type="print_text"><value name="TEXT"><block type="variables_get"><field name="VAR">i</field></block></value></block></statement></block></xml>`
  },
  math: {
    name: "Math Operations",
    description: "Do calculations with blocks",
    blocks: `<xml>
      <variables><variable>result</variable></variables>
      <block type="variables_set" x="50" y="50"><field name="VAR">result</field><value name="VALUE"><block type="math_arithmetic"><field name="OP">ADD</field><value name="A"><shadow type="math_number"><field name="NUM">10</field></shadow></value><value name="B"><shadow type="math_number"><field name="NUM">5</field></shadow></value></block></value><next>
      <block type="print_text"><value name="TEXT"><block type="variables_get"><field name="VAR">result</field></block></value></block></next></block>
    </xml>`
  },
  blank: {
    name: "Empty Canvas",
    description: "Start from scratch!",
    blocks: `<xml></xml>`
  }
};

export default function BlockTeaching({ user }) {
  const navigate = useNavigate();
  const blocklyRef = useRef(null);
  const workspaceRef = useRef(null);
  const [pythonCode, setPythonCode] = useState("# Your Python code will appear here\n# Start adding blocks!");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("hello");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize Blockly workspace
  useEffect(() => {
    if (blocklyRef.current && !workspaceRef.current) {
      defineCustomBlocks();
      
      workspaceRef.current = Blockly.inject(blocklyRef.current, {
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
          startScale: 1.0,
          maxScale: 3,
          minScale: 0.3,
          scaleSpeed: 1.2
        },
        trashcan: true,
        move: {
          scrollbars: true,
          drag: true,
          wheel: true
        }
      });

      // Update Python code when blocks change
      workspaceRef.current.addChangeListener(() => {
        try {
          const code = pythonGenerator.workspaceToCode(workspaceRef.current);
          setPythonCode(code || "# No blocks yet - drag some from the toolbox!");
        } catch (e) {
          console.error("Code generation error:", e);
        }
      });

      // Load default preset
      loadPreset("hello");
    }

    return () => {
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      }
    };
  }, []);

  const loadPreset = useCallback((presetKey) => {
    if (!workspaceRef.current) return;
    
    const preset = LESSON_PRESETS[presetKey];
    if (preset) {
      workspaceRef.current.clear();
      try {
        const xml = Blockly.utils.xml.textToDom(preset.blocks);
        Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
        setSelectedPreset(presetKey);
        setOutput("");
      } catch (e) {
        console.error("Error loading preset:", e);
      }
    }
  }, []);

  const clearWorkspace = () => {
    if (workspaceRef.current) {
      workspaceRef.current.clear();
      setOutput("");
      setPythonCode("# Workspace cleared - start building!");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pythonCode);
    toast.success("Python code copied!");
  };

  // Simple Python interpreter for basic operations
  const runCode = useCallback(() => {
    setIsRunning(true);
    setOutput("");
    
    let outputLines = [];
    let variables = {};

    try {
      // Simple line-by-line interpretation
      const lines = pythonCode.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Handle print statements
        const printMatch = trimmed.match(/^print\((.+)\)$/);
        if (printMatch) {
          let value = printMatch[1];
          // Replace variable references
          for (const [varName, varValue] of Object.entries(variables)) {
            value = value.replace(new RegExp(`\\b${varName}\\b`, 'g'), JSON.stringify(varValue));
          }
          // Remove quotes for string literals
          value = value.replace(/^["']|["']$/g, '');
          try {
            // Try to evaluate expressions
            const result = eval(value);
            outputLines.push(String(result));
          } catch {
            outputLines.push(value);
          }
          continue;
        }

        // Handle variable assignments
        const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
        if (assignMatch) {
          const varName = assignMatch[1];
          let varValue = assignMatch[2];
          // Replace variable references in the value
          for (const [name, val] of Object.entries(variables)) {
            varValue = varValue.replace(new RegExp(`\\b${name}\\b`, 'g'), JSON.stringify(val));
          }
          try {
            variables[varName] = eval(varValue);
          } catch {
            variables[varName] = varValue.replace(/^["']|["']$/g, '');
          }
          continue;
        }

        // Handle for loops (simplified)
        const forMatch = trimmed.match(/^for\s+(\w+)\s+in\s+range\((\d+)(?:,\s*(\d+))?\):$/);
        if (forMatch) {
          // This is simplified - just note we found a loop
          outputLines.push(`[Loop detected - use a real Python interpreter for full execution]`);
          continue;
        }
      }

      if (outputLines.length === 0) {
        outputLines.push("[No output - try adding a print block!]");
      }

      setOutput(outputLines.join('\n'));
    } catch (error) {
      setOutput(`Error: ${error.message}\n\n[Note: This is a simplified interpreter. For full Python, use the Turtle or regular coding pages!]`);
    } finally {
      setIsRunning(false);
    }
  }, [pythonCode]);

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 py-3 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/blocks-curriculum")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              <span className="font-bold">Block Editor</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedPreset} onValueChange={loadPreset}>
              <SelectTrigger className="w-48 bg-white/10 border-white/30 text-white">
                <SelectValue placeholder="Load Example" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LESSON_PRESETS).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={clearWorkspace}
              className="text-white hover:bg-white/20"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-white hover:bg-white/20"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Lesson description bar */}
      <div className="bg-purple-900/50 px-6 py-2 text-sm">
        <span className="text-purple-300 font-medium">{LESSON_PRESETS[selectedPreset]?.name}:</span>
        <span className="text-purple-200 ml-2">{LESSON_PRESETS[selectedPreset]?.description}</span>
      </div>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-100px)]">
        {/* Left: Blockly Workspace */}
        <ResizablePanel defaultSize={55} minSize={40}>
          <div className="h-full flex flex-col">
            <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
              <span className="text-sm text-gray-300 flex items-center gap-2">
                🧱 Drag blocks from the toolbox on the left
              </span>
            </div>
            <div ref={blocklyRef} className="flex-1" style={{ minHeight: '400px' }} />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-gray-700" />

        {/* Right: Code & Output */}
        <ResizablePanel defaultSize={45} minSize={30}>
          <div className="h-full flex flex-col">
            {/* Python Code Section */}
            <div className="flex-1 flex flex-col border-b border-gray-700">
              <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm text-green-400 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Python Code (auto-generated)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyCode}
                  className="text-gray-400 hover:text-white h-7"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-gray-950">
                <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                  {pythonCode}
                </pre>
              </div>
            </div>

            {/* Output Section */}
            <div className="h-48 flex flex-col">
              <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm text-yellow-400 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Output
                </span>
                <Button
                  onClick={runCode}
                  disabled={isRunning}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 h-7"
                >
                  <Play className="w-3 h-3 mr-1" />
                  {isRunning ? "Running..." : "Run"}
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-black font-mono text-sm">
                {output ? (
                  <pre className="text-yellow-300 whitespace-pre-wrap">{output}</pre>
                ) : (
                  <span className="text-gray-500">Click "Run" to see output...</span>
                )}
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
