import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Keyboard } from "lucide-react";

/**
 * Interactive Input Collector Component
 * 
 * Simulates interactive input() calls for Python code execution
 * Collects inputs one at a time with prompts, then runs code with all inputs
 */
export default function InteractiveInputCollector({ 
  isOpen, 
  onClose, 
  onSubmitInputs,
  inputCount = 1,
  codePreview = ""
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [collectedInputs, setCollectedInputs] = useState([]);
  const [inputPrompts, setInputPrompts] = useState([]);

  // Extract input() prompts from code
  useEffect(() => {
    if (isOpen && codePreview) {
      const prompts = extractInputPrompts(codePreview);
      setInputPrompts(prompts);
      setCurrentIndex(0);
      setCollectedInputs([]);
      setCurrentInput("");
    }
  }, [isOpen, codePreview]);

  const extractInputPrompts = (code) => {
    // Match input("prompt") or input('prompt')
    const regex = /input\s*\(\s*["']([^"']*)["']\s*\)/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(code)) !== null) {
      matches.push(match[1] || `Input ${matches.length + 1}`);
    }
    
    // If no prompts found, generate generic ones
    if (matches.length === 0) {
      for (let i = 0; i < inputCount; i++) {
        matches.push(`Input ${i + 1}`);
      }
    }
    
    return matches;
  };

  const handleNext = (e) => {
    // Prevent default if it's an event
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (!currentInput.trim() && currentIndex < inputPrompts.length - 1) {
      return; // Don't allow empty input
    }

    const newCollected = [...collectedInputs, currentInput];
    setCollectedInputs(newCollected);
    
    if (currentIndex < inputPrompts.length - 1) {
      // More inputs needed
      setCurrentIndex(currentIndex + 1);
      setCurrentInput("");
    } else {
      // All inputs collected, run the code
      const inputString = newCollected.join('\n');
      onSubmitInputs(inputString);
      onClose();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleNext();
    }
  };

  const getCurrentPrompt = () => {
    if (inputPrompts.length > 0 && currentIndex < inputPrompts.length) {
      return inputPrompts[currentIndex];
    }
    return `Input ${currentIndex + 1}`;
  };

  const handleDialogChange = (open) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600" />
            Interactive Input Mode
          </DialogTitle>
          <DialogDescription>
            Your code needs input. Enter each value one at a time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Step {currentIndex + 1} of {inputPrompts.length}</span>
            <span className="text-xs bg-blue-50 px-2 py-1 rounded">
              {collectedInputs.length} collected
            </span>
          </div>

          {/* Show previous inputs (read-only) */}
          {collectedInputs.length > 0 && (
            <div className="bg-gray-50 p-3 rounded border text-sm space-y-1">
              <p className="font-semibold text-gray-700 mb-2">Previous inputs:</p>
              {collectedInputs.map((input, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-gray-500">#{idx + 1}:</span>
                  <span className="text-gray-900 font-mono">{input}</span>
                </div>
              ))}
            </div>
          )}

          {/* Current input prompt */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {getCurrentPrompt()}
            </label>
            <Input
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your answer here..."
              className="font-mono"
              autoFocus
            />
            <p className="text-xs text-gray-500">
              Press Enter or click Next to continue
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              size="sm"
              disabled={!currentInput.trim() && currentIndex < inputPrompts.length - 1}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {currentIndex < inputPrompts.length - 1 ? "Next →" : "Run Code"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
