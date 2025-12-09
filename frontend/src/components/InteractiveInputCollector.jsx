import { useState, useEffect, useCallback } from "react";
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
  const [inputValues, setInputValues] = useState([]);
  const [inputPrompts, setInputPrompts] = useState([]);

  const extractInputPrompts = (code) => {
    // Match input("prompt") or input('prompt')
    const regex = /input\s*\(\s*["']([^"']*)["']\s*\)/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(code)) !== null) {
      matches.push(match[1] || `Input ${matches.length + 1}`);
    }
    
    // If no prompts found, generate generic ones based on input count
    if (matches.length === 0) {
      for (let i = 0; i < inputCount; i++) {
        matches.push(`Input ${i + 1}`);
      }
    }
    
    return matches;
  };

  // Extract input() prompts from code
  useEffect(() => {
    if (isOpen && codePreview) {
      const prompts = extractInputPrompts(codePreview);
      setInputPrompts(prompts);
      // Initialize empty values for each prompt
      setInputValues(new Array(prompts.length).fill(""));
    }
  }, [isOpen, codePreview, extractInputPrompts]);

  const handleInputChange = (index, value) => {
    const newValues = [...inputValues];
    newValues[index] = value;
    setInputValues(newValues);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Join all inputs with newlines
    const inputString = inputValues.join('\n');
    onSubmitInputs(inputString);
    onClose();
    
    // Reset for next time
    setInputValues([]);
  };

  const handleDialogChange = (open) => {
    if (!open) {
      onClose();
      setInputValues([]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Interactive Input Mode
          </DialogTitle>
          <DialogDescription>
            Enter values for all {inputPrompts.length} input() call{inputPrompts.length !== 1 ? 's' : ''} in your code
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Show all input prompts with input boxes */}
          {inputPrompts.map((prompt, index) => (
            <div key={index} className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">
                  #{index + 1}
                </span>
                {prompt || `Input ${index + 1}`}
              </label>
              <Input
                value={inputValues[index] || ""}
                onChange={(e) => handleInputChange(index, e.target.value)}
                placeholder="Type your answer here..."
                className="font-mono"
                autoFocus={index === 0}
              />
            </div>
          ))}

          {/* Action buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Run with These Inputs
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
