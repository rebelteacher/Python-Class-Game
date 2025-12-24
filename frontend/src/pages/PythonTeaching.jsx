import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  ExternalLink,
  Play,
  BookOpen,
  Lightbulb,
  Monitor,
  Users,
  Target,
  Copy,
  Code2,
  Terminal
} from "lucide-react";
import { toast } from "sonner";

// Python curriculum lessons aligned with standards
const LESSONS = {
  chapter1: {
    title: "Chapter 1: Python Basics",
    color: "from-blue-500 to-indigo-500",
    lessons: [
      {
        id: "1-1",
        name: "Lesson 1: Hello World",
        objectives: [
          "Write your first Python program",
          "Understand the print() function",
          "Learn about syntax and quotation marks"
        ],
        demoCode: `# Your first Python program!
print("Hello, World!")

# You can print anything in quotes
print("My name is [Teacher Name]")
print("Welcome to Python!")`,
        demoSteps: [
          "Open the Python coding environment",
          "Type: print(\"Hello, World!\")",
          "Explain the print() function - it displays text",
          "Show that text must be in quotation marks",
          "Run the code and show the output"
        ],
        studentActivity: "Have students print their own name and a greeting message",
        commonErrors: [
          "Forgetting quotation marks around text",
          "Using the wrong type of quotes",
          "Misspelling 'print'"
        ],
        keyTerms: ["print()", "string", "syntax", "output"]
      },
      {
        id: "1-2",
        name: "Lesson 2: Variables",
        objectives: [
          "Understand what variables are",
          "Create and name variables",
          "Store different types of data"
        ],
        demoCode: `# Variables are like labeled boxes that store data
name = "Alice"
age = 14
grade = 8.5

# Print the variables
print(name)
print(age)
print(grade)

# You can use variables in print statements
print("Hello, " + name)`,
        demoSteps: [
          "Explain variables as 'storage boxes' with labels",
          "Show how to create a variable: name = \"value\"",
          "Create different types: text (strings), numbers (int), decimals (float)",
          "Print variables to show their values",
          "Show how to combine variables with text"
        ],
        studentActivity: "Create variables for their name, age, and favorite color, then print them",
        commonErrors: [
          "Using spaces in variable names",
          "Starting variable names with numbers",
          "Forgetting the = sign"
        ],
        keyTerms: ["variable", "assignment", "string", "integer", "float"]
      },
      {
        id: "1-3",
        name: "Lesson 3: Input",
        objectives: [
          "Get user input with input()",
          "Store input in variables",
          "Create interactive programs"
        ],
        demoCode: `# Getting input from the user
name = input("What is your name? ")
print("Hello, " + name + "!")

# Getting numbers (need to convert)
age = input("How old are you? ")
print("You are " + age + " years old")`,
        demoSteps: [
          "Introduce input() as a way to ask questions",
          "Show the prompt appears and waits for typing",
          "Store the answer in a variable",
          "Use the variable in a response",
          "Explain that input always returns text"
        ],
        studentActivity: "Create a program that asks for name and favorite food, then prints a response",
        commonErrors: [
          "Forgetting to store input in a variable",
          "Missing the prompt message",
          "Trying to do math with text input"
        ],
        keyTerms: ["input()", "prompt", "user input", "interactive"]
      }
    ]
  },
  chapter2: {
    title: "Chapter 2: Data Types & Math",
    color: "from-green-500 to-emerald-500",
    lessons: [
      {
        id: "2-1",
        name: "Lesson 4: Numbers & Math",
        objectives: [
          "Perform math operations in Python",
          "Understand order of operations",
          "Use different number types"
        ],
        demoCode: `# Basic math operations
print(5 + 3)   # Addition: 8
print(10 - 4)  # Subtraction: 6
print(6 * 7)   # Multiplication: 42
print(20 / 4)  # Division: 5.0

# Order of operations (PEMDAS)
print(2 + 3 * 4)   # = 14 (not 20!)
print((2 + 3) * 4) # = 20

# Using variables in math
price = 10
quantity = 3
total = price * quantity
print(total)`,
        demoSteps: [
          "Show the four basic operations: +, -, *, /",
          "Explain that Python follows PEMDAS",
          "Demonstrate with and without parentheses",
          "Show how to store math results in variables",
          "Introduce // (floor division) and % (modulo)"
        ],
        studentActivity: "Create a simple calculator that computes the area of a rectangle",
        commonErrors: [
          "Using x instead of * for multiplication",
          "Forgetting order of operations",
          "Integer vs float division confusion"
        ],
        keyTerms: ["operators", "PEMDAS", "integer", "float", "modulo"]
      },
      {
        id: "2-2",
        name: "Lesson 5: Strings",
        objectives: [
          "Manipulate text strings",
          "Concatenate strings",
          "Use string methods"
        ],
        demoCode: `# Strings are text in quotes
greeting = "Hello"
name = "World"

# Concatenation (joining strings)
message = greeting + ", " + name + "!"
print(message)

# String methods
text = "python is fun"
print(text.upper())      # PYTHON IS FUN
print(text.capitalize()) # Python is fun
print(len(text))         # 13 (length)`,
        demoSteps: [
          "Review that strings are text in quotes",
          "Show concatenation with + operator",
          "Introduce common string methods: upper(), lower(), capitalize()",
          "Explain len() to get string length",
          "Show how to access individual characters with []"
        ],
        studentActivity: "Create a program that takes a name and prints it in all caps, all lowercase, and with proper capitalization",
        commonErrors: [
          "Forgetting quotes around strings",
          "Trying to add strings and numbers directly",
          "Forgetting parentheses on methods"
        ],
        keyTerms: ["string", "concatenation", "method", "len()"]
      },
      {
        id: "2-3",
        name: "Lesson 6: Type Conversion",
        objectives: [
          "Convert between data types",
          "Handle input as numbers",
          "Avoid type errors"
        ],
        demoCode: `# Converting types
num_string = "42"
num_int = int(num_string)
print(num_int + 8)  # 50

# Getting number input
age = int(input("Enter your age: "))
next_year = age + 1
print("Next year you'll be " + str(next_year))

# Float conversion
price = float("19.99")
print(price * 2)`,
        demoSteps: [
          "Explain why type conversion is needed",
          "Show int() to convert to integer",
          "Show float() to convert to decimal",
          "Show str() to convert to string",
          "Demonstrate converting user input to do math"
        ],
        studentActivity: "Create a program that asks for birth year and calculates current age",
        commonErrors: [
          "Forgetting to convert input for math",
          "Converting non-numeric strings to int",
          "Forgetting str() when combining numbers with text"
        ],
        keyTerms: ["int()", "float()", "str()", "type conversion", "casting"]
      }
    ]
  },
  chapter3: {
    title: "Chapter 3: Conditionals",
    color: "from-purple-500 to-pink-500",
    lessons: [
      {
        id: "3-1",
        name: "Lesson 7: If Statements",
        objectives: [
          "Write conditional statements",
          "Use comparison operators",
          "Understand indentation"
        ],
        demoCode: `# Basic if statement
age = 15

if age >= 13:
    print("You are a teenager!")

# Comparison operators
# == equal to
# != not equal to
# > greater than
# < less than
# >= greater than or equal
# <= less than or equal

score = 85
if score >= 70:
    print("You passed!")`,
        demoSteps: [
          "Introduce the concept of making decisions",
          "Show the if keyword and colon",
          "EMPHASIZE indentation (4 spaces or tab)",
          "Explain comparison operators",
          "Run examples with different values"
        ],
        studentActivity: "Create a program that checks if a number is positive",
        commonErrors: [
          "Forgetting the colon after the condition",
          "Wrong indentation",
          "Using = instead of == for comparison"
        ],
        keyTerms: ["if", "condition", "comparison", "indentation", "boolean"]
      },
      {
        id: "3-2",
        name: "Lesson 8: If-Else",
        objectives: [
          "Handle two possible outcomes",
          "Use else blocks",
          "Create two-way decisions"
        ],
        demoCode: `# If-else for two options
temperature = 75

if temperature > 80:
    print("It's hot outside!")
else:
    print("It's not too hot.")

# Another example
password = input("Enter password: ")
if password == "secret123":
    print("Access granted!")
else:
    print("Wrong password!")`,
        demoSteps: [
          "Review if statements",
          "Introduce else as 'otherwise'",
          "Show that else has no condition",
          "Demonstrate indentation for both blocks",
          "Test with different inputs"
        ],
        studentActivity: "Create a program that checks if a number is even or odd",
        commonErrors: [
          "Putting a condition after else",
          "Mismatched indentation",
          "Forgetting colon after else"
        ],
        keyTerms: ["else", "two-way decision", "branch"]
      },
      {
        id: "3-3",
        name: "Lesson 9: Elif (Multiple Conditions)",
        objectives: [
          "Handle multiple conditions",
          "Use elif statements",
          "Create multi-way decisions"
        ],
        demoCode: `# Multiple conditions with elif
grade = 85

if grade >= 90:
    print("A - Excellent!")
elif grade >= 80:
    print("B - Good job!")
elif grade >= 70:
    print("C - Satisfactory")
elif grade >= 60:
    print("D - Needs improvement")
else:
    print("F - See me after class")`,
        demoSteps: [
          "Explain when we need more than 2 options",
          "Introduce elif (else if)",
          "Show the order matters - first match wins",
          "Walk through with different grade values",
          "End with else as catch-all"
        ],
        studentActivity: "Create a program that gives different messages based on time of day (morning, afternoon, evening, night)",
        commonErrors: [
          "Wrong order of conditions",
          "Forgetting elif goes between if and else",
          "Using multiple if instead of elif"
        ],
        keyTerms: ["elif", "multi-way decision", "chained conditionals"]
      }
    ]
  },
  chapter4: {
    title: "Chapter 4: Loops",
    color: "from-orange-500 to-red-500",
    lessons: [
      {
        id: "4-1",
        name: "Lesson 10: For Loops",
        objectives: [
          "Repeat code a specific number of times",
          "Use range() function",
          "Iterate through sequences"
        ],
        demoCode: `# Basic for loop with range
for i in range(5):
    print("Hello!")

# Using the loop variable
for i in range(1, 6):
    print("Count:", i)

# Looping through a string
for letter in "Python":
    print(letter)`,
        demoSteps: [
          "Explain why loops are useful (avoid repetition)",
          "Introduce for keyword and range()",
          "Show range(5) means 0 to 4",
          "Demonstrate range(start, stop)",
          "Loop through strings and lists"
        ],
        studentActivity: "Create a program that prints a multiplication table for a number",
        commonErrors: [
          "Off-by-one errors with range",
          "Forgetting the colon",
          "Wrong indentation inside loop"
        ],
        keyTerms: ["for", "range()", "iteration", "loop variable"]
      },
      {
        id: "4-2",
        name: "Lesson 11: While Loops",
        objectives: [
          "Create condition-based loops",
          "Know when to use while vs for",
          "Avoid infinite loops"
        ],
        demoCode: `# While loop - repeat while condition is true
count = 1
while count <= 5:
    print(count)
    count = count + 1

# User input loop
password = ""
while password != "secret":
    password = input("Enter password: ")
print("Welcome!")`,
        demoSteps: [
          "Compare while to for loops",
          "Explain 'while condition is true'",
          "EMPHASIZE updating the condition variable",
          "Show what happens without update (infinite loop)",
          "Demonstrate input validation use case"
        ],
        studentActivity: "Create a guessing game that keeps asking until correct",
        commonErrors: [
          "Forgetting to update condition variable",
          "Creating infinite loops",
          "Using while when for is simpler"
        ],
        keyTerms: ["while", "condition", "infinite loop", "counter"]
      },
      {
        id: "4-3",
        name: "Lesson 12: Loop Patterns",
        objectives: [
          "Use accumulators in loops",
          "Build strings in loops",
          "Create counted loops"
        ],
        demoCode: `# Accumulator pattern - sum numbers
total = 0
for i in range(1, 11):
    total = total + i
print("Sum of 1-10:", total)

# Building a string
stars = ""
for i in range(5):
    stars = stars + "*"
print(stars)  # *****

# Counting pattern
count = 0
for char in "hello world":
    if char == "o":
        count = count + 1
print("Number of o's:", count)`,
        demoSteps: [
          "Introduce accumulator pattern",
          "Show summing numbers in a loop",
          "Demonstrate building strings",
          "Show counting with conditions",
          "Explain each pattern's use case"
        ],
        studentActivity: "Create a program that calculates factorial of a number",
        commonErrors: [
          "Not initializing accumulator before loop",
          "Initializing inside the loop",
          "Wrong accumulator operation"
        ],
        keyTerms: ["accumulator", "counter", "pattern", "sum"]
      }
    ]
  },
  chapter5: {
    title: "Chapter 5: Functions",
    color: "from-teal-500 to-cyan-500",
    lessons: [
      {
        id: "5-1",
        name: "Lesson 13: Defining Functions",
        objectives: [
          "Create reusable code blocks",
          "Define and call functions",
          "Understand function structure"
        ],
        demoCode: `# Defining a function
def greet():
    print("Hello!")
    print("Welcome to Python!")

# Calling the function
greet()
greet()  # Can call multiple times

# Function with a purpose
def draw_line():
    print("-" * 20)

draw_line()
print("My Report")
draw_line()`,
        demoSteps: [
          "Explain functions as 'recipes' or 'mini-programs'",
          "Show def keyword and naming",
          "Emphasize the colon and indentation",
          "Demonstrate calling a function",
          "Show reusability - call multiple times"
        ],
        studentActivity: "Create a function that prints a greeting box around text",
        commonErrors: [
          "Forgetting parentheses when calling",
          "Not indenting function body",
          "Defining but never calling"
        ],
        keyTerms: ["def", "function", "call", "define"]
      },
      {
        id: "5-2",
        name: "Lesson 14: Parameters",
        objectives: [
          "Pass data to functions",
          "Use parameters and arguments",
          "Create flexible functions"
        ],
        demoCode: `# Function with parameter
def greet(name):
    print("Hello, " + name + "!")

greet("Alice")
greet("Bob")

# Multiple parameters
def add(a, b):
    result = a + b
    print(result)

add(5, 3)
add(10, 20)`,
        demoSteps: [
          "Explain parameters as 'inputs' to functions",
          "Show single parameter example",
          "Demonstrate multiple parameters",
          "Explain arguments vs parameters",
          "Show how order matters"
        ],
        studentActivity: "Create a function that takes a name and age, then prints a birthday message",
        commonErrors: [
          "Wrong number of arguments",
          "Arguments in wrong order",
          "Confusing parameter names"
        ],
        keyTerms: ["parameter", "argument", "pass"]
      },
      {
        id: "5-3",
        name: "Lesson 15: Return Values",
        objectives: [
          "Return data from functions",
          "Use return statement",
          "Store function results"
        ],
        demoCode: `# Function that returns a value
def add(a, b):
    return a + b

result = add(5, 3)
print(result)  # 8

# Using return value directly
print(add(10, 20))

# Return vs print
def square(n):
    return n * n

answer = square(5)
print("5 squared is", answer)`,
        demoSteps: [
          "Explain difference between print and return",
          "Show return sends value back",
          "Demonstrate storing return value",
          "Show using return value in expressions",
          "Compare function with/without return"
        ],
        studentActivity: "Create a function that calculates and returns the area of a circle",
        commonErrors: [
          "Using print instead of return",
          "Forgetting to store return value",
          "Code after return (never runs)"
        ],
        keyTerms: ["return", "return value", "None"]
      }
    ]
  }
};

export default function PythonTeaching({ user }) {
  const navigate = useNavigate();
  const [selectedChapter, setSelectedChapter] = useState("chapter1");
  const [selectedLesson, setSelectedLesson] = useState(LESSONS.chapter1.lessons[0]);

  const copyCode = () => {
    navigator.clipboard.writeText(selectedLesson.demoCode);
    toast.success("Demo code copied!");
  };

  const copyObjectives = () => {
    const text = selectedLesson.objectives.join('\n• ');
    navigator.clipboard.writeText('• ' + text);
    toast.success("Objectives copied!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/python-curriculum")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Curriculum
            </Button>
            <div className="flex items-center gap-2">
              <Code2 className="w-6 h-6" />
              <span className="text-xl font-bold">Python Teaching Mode</span>
            </div>
          </div>
          
          <Button
            onClick={() => navigate("/library?type=text")}
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            View Problems
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Chapter Tabs */}
        <Tabs value={selectedChapter} onValueChange={(v) => {
          setSelectedChapter(v);
          setSelectedLesson(LESSONS[v].lessons[0]);
        }}>
          <TabsList className="w-full flex flex-wrap h-auto gap-2 bg-transparent mb-6">
            {Object.entries(LESSONS).map(([key, chapter]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className={`flex-1 min-w-[120px] py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:${chapter.color} data-[state=active]:text-white`}
              >
                {chapter.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(LESSONS).map(([chapterKey, chapter]) => (
            <TabsContent key={chapterKey} value={chapterKey}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Sidebar - Lesson Selector & Quick Actions */}
                <div className="lg:col-span-1 space-y-4">
                  {/* Lessons */}
                  <Card>
                    <CardHeader className={`bg-gradient-to-r ${chapter.color} text-white rounded-t-lg`}>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Lessons
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {chapter.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLesson(lesson)}
                          className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${
                            selectedLesson.id === lesson.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                          }`}
                        >
                          <div className="font-medium">{lesson.name}</div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Play className="w-5 h-5 text-green-600" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button onClick={copyCode} className="w-full bg-blue-500 hover:bg-blue-600">
                        <Terminal className="w-4 h-4 mr-2" />
                        Copy Demo Code
                      </Button>
                      <Button onClick={() => navigate("/library?type=text")} variant="outline" className="w-full">
                        <BookOpen className="w-4 h-4 mr-2" />
                        View Problems
                      </Button>
                      <Button onClick={copyObjectives} variant="outline" className="w-full">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Objectives
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Key Terms */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">📚 Key Terms</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedLesson.keyTerms?.map((term, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono">
                            {term}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Lesson Header */}
                  <Card className={`bg-gradient-to-r ${chapter.color}`}>
                    <CardContent className="py-6 text-white">
                      <h2 className="text-2xl font-bold mb-2">{selectedLesson.name}</h2>
                      <p className="opacity-90">Python Text Programming • {chapter.title}</p>
                    </CardContent>
                  </Card>

                  {/* Learning Objectives */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        Learning Objectives
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedLesson.objectives.map((obj, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-500 mt-1">✓</span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Demo Code */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-5 h-5 text-green-600" />
                          Demo Code
                        </div>
                        <Button size="sm" variant="outline" onClick={copyCode}>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                      </CardTitle>
                      <CardDescription>Copy this code to demonstrate to students</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                        {selectedLesson.demoCode}
                      </pre>
                    </CardContent>
                  </Card>

                  {/* Demo Steps */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-purple-600" />
                        Teacher Demo Steps
                      </CardTitle>
                      <CardDescription>Follow these steps while screen sharing</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-3">
                        {selectedLesson.demoSteps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>

                  {/* Student Activity */}
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-600" />
                        Student Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                        <p className="text-lg">{selectedLesson.studentActivity}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Common Errors */}
                  <Card className="border-2 border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-700">
                        ⚠️ Common Student Errors
                      </CardTitle>
                      <CardDescription>Watch out for these mistakes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedLesson.commonErrors?.map((error, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-red-700">
                            <span className="text-red-500">✗</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
