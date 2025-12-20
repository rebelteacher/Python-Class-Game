import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Play, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Terminal,
  BookOpen,
  Code,
  Lightbulb
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Python teaching lessons organized by topic
const PYTHON_LESSONS = {
  output: {
    title: "Output & Print",
    icon: "🖨️",
    lessons: [
      {
        title: "Your First Program",
        description: "Learn to use the print() function to display text on the screen.",
        concepts: ["print()", "strings", "quotation marks"],
        code: `# Your First Python Program
# The print() function displays text on the screen

print("Hello, World!")

# You can print any text inside quotes
print("Welcome to Python!")
print("Let's learn to code!")`,
        explanation: "The print() function is how Python displays output. Put your text inside parentheses and quotation marks."
      },
      {
        title: "Multiple Print Statements",
        description: "Print multiple lines by using multiple print() statements.",
        concepts: ["multiple prints", "program flow", "line by line"],
        code: `# Multiple Print Statements
# Python runs code from top to bottom

print("Line 1: Hello")
print("Line 2: How are you?")
print("Line 3: Goodbye!")

# Each print() creates a new line
print("First")
print("Second")
print("Third")`,
        explanation: "Each print() statement creates a new line. Python runs code from top to bottom, one line at a time."
      },
      {
        title: "Blank Lines & Formatting",
        description: "Use empty print() to create spacing in your output.",
        concepts: ["empty print()", "formatting", "readability"],
        code: `# Creating Blank Lines
print("Section 1")
print("This is important info")
print()  # Empty print creates a blank line
print("Section 2")
print("More information here")
print()
print()  # Two blank lines
print("The End!")`,
        explanation: "An empty print() with no text inside creates a blank line. This helps organize your output."
      },
      {
        title: "Special Characters",
        description: "Use escape characters for special formatting.",
        concepts: ["\\n newline", "\\t tab", "escape characters"],
        code: `# Special Characters in Strings

# \\n creates a new line INSIDE a string
print("Hello\\nWorld")

# \\t creates a tab (indent)
print("Name:\\tAlice")
print("Age:\\t12")

# Combine them
print("Item 1\\n\\tSub-item A\\n\\tSub-item B")`,
        explanation: "Escape characters start with backslash (\\). \\n means 'new line' and \\t means 'tab'."
      }
    ]
  },
  strings: {
    title: "Strings & Text",
    icon: "📝",
    lessons: [
      {
        title: "String Basics",
        description: "Strings are text data in Python, created with quotes.",
        concepts: ["strings", "single quotes", "double quotes"],
        code: `# String Basics
# Strings are text enclosed in quotes

# Single quotes work
print('Hello with single quotes')

# Double quotes work too
print("Hello with double quotes")

# Store strings in variables
name = "Alice"
greeting = 'Hello'

print(greeting)
print(name)`,
        explanation: "Strings can use single quotes (') or double quotes (\"). Both work the same way."
      },
      {
        title: "String Concatenation",
        description: "Join strings together using the + operator.",
        concepts: ["concatenation", "+ operator", "joining strings"],
        code: `# String Concatenation (Joining Strings)
# Use + to combine strings together

first_name = "Alice"
last_name = "Smith"

# Join strings with +
full_name = first_name + " " + last_name
print(full_name)

# Build messages
greeting = "Hello, " + first_name + "!"
print(greeting)

# Multiple concatenations
message = "My name is " + first_name + " " + last_name + "."
print(message)`,
        explanation: "The + operator joins strings together. Remember to add spaces where needed!"
      },
      {
        title: "Print with Multiple Arguments",
        description: "Pass multiple items to print(), separated by commas.",
        concepts: ["multiple arguments", "automatic spacing", "commas"],
        code: `# Print with Multiple Arguments
# Separate items with commas - Python adds spaces automatically!

name = "Bob"
age = 12

# Multiple items separated by commas
print("Name:", name)
print("Age:", age)

# Mix strings and variables
print("Hello,", name, "you are", age, "years old")

# Numbers work too
x = 5
y = 10
print("Sum of", x, "and", y, "is", x + y)`,
        explanation: "When you use commas in print(), Python automatically adds spaces between items."
      },
      {
        title: "The sep Parameter",
        description: "Customize what goes between items with sep.",
        concepts: ["sep parameter", "custom separator", "formatting"],
        code: `# The sep Parameter
# sep controls what goes BETWEEN items

# Default separator is a space
print("A", "B", "C")

# Custom separator: dash
print("A", "B", "C", sep="-")

# Custom separator: arrow
print("Start", "Middle", "End", sep=" -> ")

# No separator
print("A", "B", "C", sep="")

# Newline separator
print("Line 1", "Line 2", "Line 3", sep="\\n")`,
        explanation: "The sep parameter changes what appears between items. Default is a space."
      },
      {
        title: "The end Parameter",
        description: "Control what happens at the end of print().",
        concepts: ["end parameter", "same line", "no newline"],
        code: `# The end Parameter
# end controls what happens AFTER the print

# Default end is newline (\\n)
print("Line 1")
print("Line 2")

print("---")

# Custom end: stay on same line
print("Hello ", end="")
print("World!")

# Custom end: add something specific
print("Loading", end="...")
print("Done!")

# Create a countdown
print("3", end=" ")
print("2", end=" ")
print("1", end=" ")
print("GO!")`,
        explanation: "The end parameter controls what comes after the printed text. Default is a new line."
      }
    ]
  },
  variables: {
    title: "Variables & Math",
    icon: "🔢",
    lessons: [
      {
        title: "Creating Variables",
        description: "Variables store data that you can use later.",
        concepts: ["variables", "assignment", "naming"],
        code: `# Creating Variables
# Variables are like labeled boxes that store data

# Create a variable with =
name = "Alice"
age = 12
grade = 7

# Use variables in print
print(name)
print(age)
print(grade)

# Variables can change
score = 0
print("Starting score:", score)
score = 10
print("New score:", score)`,
        explanation: "Variables store values. Use = to assign a value. Choose descriptive names!"
      },
      {
        title: "Math Operations",
        description: "Python can do math with numbers and variables.",
        concepts: ["+", "-", "*", "/", "math"],
        code: `# Math Operations

# Addition
print(5 + 3)

# Subtraction
print(10 - 4)

# Multiplication
print(6 * 7)

# Division
print(20 / 4)

# Using variables
a = 10
b = 3
print("a + b =", a + b)
print("a - b =", a - b)
print("a * b =", a * b)
print("a / b =", a / b)`,
        explanation: "Use + for add, - for subtract, * for multiply, / for divide."
      },
      {
        title: "More Math Operators",
        description: "Learn floor division, modulo, and exponents.",
        concepts: ["//", "%", "**", "floor division", "modulo"],
        code: `# More Math Operators

# Floor division // (rounds down)
print("17 // 5 =", 17 // 5)  # Result: 3

# Modulo % (remainder)
print("17 % 5 =", 17 % 5)   # Result: 2

# Exponent ** (power)
print("2 ** 3 =", 2 ** 3)   # Result: 8 (2*2*2)
print("5 ** 2 =", 5 ** 2)   # Result: 25 (5*5)

# Practical example: Is a number even or odd?
number = 7
remainder = number % 2
print(number, "divided by 2 has remainder", remainder)
# If remainder is 0, it's even. If 1, it's odd.`,
        explanation: "// gives whole number division, % gives the remainder, ** is for exponents (powers)."
      },
      {
        title: "Order of Operations",
        description: "Python follows math order: PEMDAS.",
        concepts: ["PEMDAS", "parentheses", "order"],
        code: `# Order of Operations (PEMDAS)
# Parentheses, Exponents, Multiply/Divide, Add/Subtract

# Without parentheses
result1 = 2 + 3 * 4
print("2 + 3 * 4 =", result1)  # 14 (multiply first)

# With parentheses
result2 = (2 + 3) * 4
print("(2 + 3) * 4 =", result2)  # 20 (parentheses first)

# Complex example
a = 10
b = 2
c = 3
result = a + b * c
print("10 + 2 * 3 =", result)

result = (a + b) * c
print("(10 + 2) * 3 =", result)`,
        explanation: "Use parentheses to control the order. Python follows standard math rules (PEMDAS)."
      }
    ]
  },
  input: {
    title: "User Input",
    icon: "⌨️",
    lessons: [
      {
        title: "Getting Input",
        description: "Use input() to get information from the user.",
        concepts: ["input()", "user input", "prompts"],
        code: `# Getting User Input
# input() waits for the user to type something

# Simple input
name = input("What is your name? ")
print("Hello,", name)

# More inputs
color = input("What is your favorite color? ")
print("Cool!", color, "is a great color!")

# The prompt is optional
print("Enter something:")
response = input()
print("You entered:", response)`,
        explanation: "input() pauses the program and waits for the user to type. The text in parentheses is the prompt."
      },
      {
        title: "Input is Always a String",
        description: "Everything from input() is text, even numbers.",
        concepts: ["string input", "type", "data types"],
        code: `# Input is Always a String!
# Even if the user types a number, it's stored as text

age_text = input("How old are you? ")
print("You entered:", age_text)
print("Type:", type(age_text))

# This won't work for math!
# print(age_text + 5)  # Error! Can't add string and number

# You need to convert it first
age_number = int(age_text)
print("In 5 years you'll be:", age_number + 5)`,
        explanation: "input() always returns a string. Use int() to convert to a number for math."
      },
      {
        title: "Converting Input",
        description: "Convert input to numbers using int() or float().",
        concepts: ["int()", "float()", "type conversion"],
        code: `# Converting Input to Numbers

# For whole numbers, use int()
age = int(input("Enter your age: "))
print("Next year you'll be", age + 1)

# For decimal numbers, use float()
price = float(input("Enter the price: $"))
tax = price * 0.08
total = price + tax
print("Total with tax: $", total)

# Calculator example
num1 = int(input("Enter first number: "))
num2 = int(input("Enter second number: "))
print("Sum:", num1 + num2)
print("Product:", num1 * num2)`,
        explanation: "int() converts to whole numbers, float() converts to decimal numbers."
      }
    ]
  },
  conditionals: {
    title: "Conditionals",
    icon: "🔀",
    lessons: [
      {
        title: "If Statements",
        description: "Make decisions in your code with if.",
        concepts: ["if", "condition", "indentation"],
        code: `# If Statements
# Run code only when a condition is True

age = 15

if age >= 13:
    print("You are a teenager!")
    print("Welcome to the teen club!")

# Comparison operators:
# == equals
# != not equals
# > greater than
# < less than
# >= greater than or equal
# <= less than or equal

score = 85
if score >= 70:
    print("You passed!")`,
        explanation: "Code inside an if block runs only when the condition is True. Notice the indentation!"
      },
      {
        title: "If-Else",
        description: "Handle both True and False cases.",
        concepts: ["if", "else", "two paths"],
        code: `# If-Else Statements
# else runs when the if condition is False

temperature = 30

if temperature >= 32:
    print("It's above freezing")
    print("No ice today!")
else:
    print("It's below freezing")
    print("Watch out for ice!")

# Another example
password = "secret123"
guess = input("Enter password: ")

if guess == password:
    print("Access granted!")
else:
    print("Wrong password!")`,
        explanation: "else provides an alternative path when the if condition is False."
      },
      {
        title: "Elif - Multiple Conditions",
        description: "Check multiple conditions with elif.",
        concepts: ["elif", "multiple conditions", "grading"],
        code: `# Elif - Multiple Conditions
# Check several conditions in order

score = 85

if score >= 90:
    print("Grade: A")
elif score >= 80:
    print("Grade: B")
elif score >= 70:
    print("Grade: C")
elif score >= 60:
    print("Grade: D")
else:
    print("Grade: F")

# Temperature example
temp = 75
if temp >= 90:
    print("It's hot!")
elif temp >= 70:
    print("It's nice out!")
elif temp >= 50:
    print("It's cool")
else:
    print("It's cold!")`,
        explanation: "elif lets you check multiple conditions. Python checks them in order and runs the first True one."
      },
      {
        title: "Logical Operators",
        description: "Combine conditions with and, or, not.",
        concepts: ["and", "or", "not", "compound conditions"],
        code: `# Logical Operators

age = 15
has_permission = True

# and - both must be True
if age >= 13 and has_permission:
    print("You can join!")

# or - at least one must be True
day = "Saturday"
if day == "Saturday" or day == "Sunday":
    print("It's the weekend!")

# not - reverses True/False
is_raining = False
if not is_raining:
    print("Let's go outside!")

# Combining them
score = 85
attempts = 2
if score >= 80 and attempts <= 3:
    print("Great job on your", attempts, "attempt(s)!")`,
        explanation: "and requires both conditions True, or requires at least one, not reverses the condition."
      }
    ]
  },
  loops: {
    title: "Loops",
    icon: "🔁",
    lessons: [
      {
        title: "For Loops",
        description: "Repeat code a specific number of times.",
        concepts: ["for", "range()", "iteration"],
        code: `# For Loops
# Repeat code a specific number of times

# Basic for loop
for i in range(5):
    print("Hello!", i)

print("---")

# Count from 1 to 5
for num in range(1, 6):
    print(num)

print("---")

# Practical example: Countdown
print("Countdown:")
for i in range(5, 0, -1):
    print(i)
print("Blast off!")`,
        explanation: "for loops repeat code. range(5) gives numbers 0,1,2,3,4. range(1,6) gives 1,2,3,4,5."
      },
      {
        title: "While Loops",
        description: "Repeat while a condition is True.",
        concepts: ["while", "condition", "infinite loops"],
        code: `# While Loops
# Keep going while condition is True

count = 0
while count < 5:
    print("Count is:", count)
    count = count + 1  # Don't forget this!

print("Done!")

# Countdown with while
print("---")
num = 3
while num > 0:
    print(num)
    num = num - 1
print("Go!")

# Sum numbers
total = 0
n = 1
while n <= 5:
    total = total + n
    n = n + 1
print("Sum of 1-5:", total)`,
        explanation: "while loops run as long as the condition is True. Make sure to update your variable!"
      },
      {
        title: "Loop with Lists",
        description: "Loop through items in a list.",
        concepts: ["for in list", "iteration", "each item"],
        code: `# Looping Through Lists

fruits = ["apple", "banana", "cherry"]

# Loop through each item
for fruit in fruits:
    print("I like", fruit)

print("---")

# Numbers in a list
scores = [85, 92, 78, 95, 88]
for score in scores:
    print("Score:", score)

# Calculate total
total = 0
for score in scores:
    total = total + score
print("Total:", total)
print("Average:", total / len(scores))`,
        explanation: "for item in list gives you each item one at a time. The variable name (like 'fruit') is your choice."
      }
    ]
  }
};

export default function PythonTeaching({ user }) {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState("output");
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const topics = Object.keys(PYTHON_LESSONS);
  const currentTopic = PYTHON_LESSONS[selectedTopic];
  const lessons = currentTopic?.lessons || [];
  const currentLesson = lessons[currentLessonIndex];

  useEffect(() => {
    if (currentLesson) {
      setCode(currentLesson.code);
      setOutput("");
    }
  }, [selectedTopic, currentLessonIndex]);

  const handleRunCode = async () => {
    setIsRunning(true);
    try {
      const response = await axios.post(
        `${API}/code/execute`,
        { code },
        { withCredentials: true }
      );
      setOutput(response.data.output || response.data.error || "No output");
    } catch (error) {
      setOutput(error.response?.data?.detail || "Error running code");
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    if (currentLesson) {
      setCode(currentLesson.code);
      setOutput("");
    }
  };

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const handleNextLesson = () => {
    if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  const handleTopicChange = (topic) => {
    setSelectedTopic(topic);
    setCurrentLessonIndex(0);
  };

  return (
    <div className={`min-h-screen bg-gray-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/python-curriculum")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              <span className="font-bold">Python Teaching Mode</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Topic Selector */}
            <Select value={selectedTopic} onValueChange={handleTopicChange}>
              <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {topics.map(topic => (
                  <SelectItem key={topic} value={topic}>
                    {PYTHON_LESSONS[topic].icon} {PYTHON_LESSONS[topic].title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Lesson Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevLesson}
                disabled={currentLessonIndex === 0}
                className="text-white hover:bg-white/20"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                {currentLessonIndex + 1} / {lessons.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextLesson}
                disabled={currentLessonIndex === lessons.length - 1}
                className="text-white hover:bg-white/20"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Lesson Info Bar */}
      {currentLesson && (
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">{currentLesson.title}</h2>
              <p className="text-gray-400 text-sm mt-1">{currentLesson.description}</p>
            </div>
            <div className="flex gap-2">
              {currentLesson.concepts.map((concept, i) => (
                <span 
                  key={i} 
                  className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-mono"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <PanelGroup direction="horizontal" className="h-[calc(100vh-140px)]">
        {/* Code Editor Panel */}
        <Panel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-gray-900">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Code className="w-4 h-4" />
                <span>Code Editor</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-1" />
                  {isRunning ? "Running..." : "Run"}
                </Button>
              </div>
            </div>
            
            {/* Monaco Editor */}
            <div className="flex-1">
              <Editor
                height="100%"
                language="python"
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: "on"
                }}
              />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors" />

        {/* Output & Explanation Panel */}
        <Panel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-gray-900">
            {/* Output Section */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700 text-gray-400 text-sm">
                <Terminal className="w-4 h-4" />
                <span>Output</span>
              </div>
              <div className="flex-1 bg-black p-4 font-mono text-sm overflow-auto">
                {output ? (
                  <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>
                ) : (
                  <span className="text-gray-500">Run your code to see output here...</span>
                )}
              </div>
            </div>

            {/* Explanation Section */}
            {currentLesson && (
              <div className="border-t border-gray-700">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-400 text-sm">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <span>Key Concept</span>
                </div>
                <div className="p-4 bg-gray-800/50">
                  <p className="text-gray-300 text-sm">{currentLesson.explanation}</p>
                </div>
              </div>
            )}

            {/* Quick Reference */}
            <div className="border-t border-gray-700">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-400 text-sm">
                <BookOpen className="w-4 h-4" />
                <span>Quick Reference</span>
              </div>
              <div className="p-4 bg-gray-800/50 text-xs font-mono text-gray-400 grid grid-cols-2 gap-2">
                <div><span className="text-blue-400">print()</span> - Display output</div>
                <div><span className="text-blue-400">input()</span> - Get user input</div>
                <div><span className="text-blue-400">int()</span> - Convert to integer</div>
                <div><span className="text-blue-400">str()</span> - Convert to string</div>
                <div><span className="text-blue-400">len()</span> - Get length</div>
                <div><span className="text-blue-400">range()</span> - Number sequence</div>
              </div>
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
