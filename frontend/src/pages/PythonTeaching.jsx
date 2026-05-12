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
  Terminal,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";

// Python curriculum lessons - EXACTLY matching PythonCurriculum.jsx structure
const LESSONS = {
  chapter1: {
    title: "Chapter 1: Printing",
    icon: "🖨️",
    color: "from-blue-500 to-indigo-500",
    lessons: [
      {
        id: "1-1",
        name: "Lesson 1: Intro to Print",
        objectives: [
          "Write your first print statement",
          "Understand print() syntax",
          "Display text on screen"
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
        name: "Lesson 2: Numbers",
        objectives: [
          "Print numbers without quotes",
          "Understand integers vs strings",
          "Perform basic calculations in print"
        ],
        demoCode: `# Printing numbers - no quotes needed!
print(42)
print(3.14)

# Numbers vs strings
print("42")  # This is text
print(42)    # This is a number

# Basic math in print
print(5 + 3)
print(10 - 4)`,
        demoSteps: [
          "Show that numbers don't need quotes",
          "Compare print(42) vs print(\"42\")",
          "Demonstrate basic arithmetic",
          "Show that Python calculates before printing"
        ],
        studentActivity: "Print your age, then print your age plus 10",
        commonErrors: [
          "Putting quotes around numbers you want to calculate",
          "Confusing numbers with text that looks like numbers"
        ],
        keyTerms: ["integer", "float", "arithmetic", "expression"]
      },
      {
        id: "1-3",
        name: "Lesson 3: Multi Line Print",
        objectives: [
          "Use multiple print statements",
          "Understand program flow",
          "Create multi-line output"
        ],
        demoCode: `# Multiple print statements execute in order
print("Line 1")
print("Line 2")
print("Line 3")

# Creating a pattern
print("*")
print("**")
print("***")`,
        demoSteps: [
          "Write several print statements",
          "Show they execute top to bottom",
          "Explain sequential execution",
          "Create simple patterns"
        ],
        studentActivity: "Create a simple text pattern using multiple print statements",
        commonErrors: [
          "Expecting all text in one print",
          "Not understanding line-by-line execution"
        ],
        keyTerms: ["sequential", "execution", "multi-line"]
      },
      {
        id: "1-4",
        name: "Lesson 4: Multiple Print Arguments",
        objectives: [
          "Use commas to separate arguments",
          "Understand automatic spacing",
          "Mix text and numbers"
        ],
        demoCode: `# Multiple arguments separated by commas
print("Hello", "World")  # Hello World

# Mixing text and numbers
print("I am", 14, "years old")

# Multiple values
print("Name:", "Alice", "Age:", 14)`,
        demoSteps: [
          "Show comma-separated arguments",
          "Notice the automatic space between items",
          "Mix strings and numbers easily",
          "Compare to concatenation (coming later)"
        ],
        studentActivity: "Print a sentence about yourself using commas to separate parts",
        commonErrors: [
          "Forgetting commas between arguments",
          "Using + when commas work better for mixing types"
        ],
        keyTerms: ["arguments", "separator", "automatic spacing"]
      },
      {
        id: "1-5",
        name: "Lesson 5: Variables",
        objectives: [
          "Store values in variables",
          "Print variable values",
          "Use descriptive variable names"
        ],
        demoCode: `# Creating variables
name = "Alice"
age = 14
grade = 8.5

# Printing variables
print(name)
print(age)

# Variables in print with other text
print("Hello,", name)
print("Age:", age)`,
        demoSteps: [
          "Explain variables as labeled storage boxes",
          "Show variable assignment with =",
          "Create variables with different types",
          "Print variables alone and with text"
        ],
        studentActivity: "Create variables for your name, age, and favorite subject, then print them",
        commonErrors: [
          "Putting quotes around variable names when printing",
          "Forgetting that variable names have no quotes"
        ],
        keyTerms: ["variable", "assignment", "identifier"]
      },
      {
        id: "1-6",
        name: "Lesson 6: New Line Escape",
        objectives: [
          "Use \\n for new lines",
          "Create formatted output",
          "Understand escape sequences"
        ],
        demoCode: `# Using \\n for new lines
print("Hello\\nWorld")
# Output:
# Hello
# World

# Multiple new lines
print("Line 1\\n\\nLine 3")

# In longer text
print("Name: Alice\\nAge: 14\\nGrade: 8")`,
        demoSteps: [
          "Explain escape sequences start with backslash",
          "Show \\n creates a new line",
          "Compare to using multiple print statements",
          "Use in formatted output"
        ],
        studentActivity: "Create an address label with name, street, and city on separate lines using one print",
        commonErrors: [
          "Forgetting the backslash",
          "Using /n instead of \\n"
        ],
        keyTerms: ["escape sequence", "\\n", "newline"]
      },
      {
        id: "1-7",
        name: "Lesson 7: Tab Escape",
        objectives: [
          "Use \\t for tabs",
          "Align output in columns",
          "Format data tables"
        ],
        demoCode: `# Using \\t for tabs
print("Name\\tAge\\tGrade")
print("Alice\\t14\\tA")
print("Bob\\t15\\tB")

# Creating aligned columns
print("Item\\tPrice")
print("Apple\\t$1.00")
print("Banana\\t$0.50")`,
        demoSteps: [
          "Explain \\t creates a tab space",
          "Show how tabs align text in columns",
          "Create a simple table",
          "Combine with \\n for complex formatting"
        ],
        studentActivity: "Create a simple menu with items and prices aligned in columns",
        commonErrors: [
          "Expecting exact spacing (tabs align to fixed positions)",
          "Using spaces instead of tabs for alignment"
        ],
        keyTerms: ["\\t", "tab", "alignment", "columns"]
      },
      {
        id: "1-8",
        name: "Lesson 8: Escape Quotations",
        objectives: [
          "Use \\\\ to escape quotes",
          "Print quotes inside strings",
          "Mix quote styles"
        ],
        demoCode: `# Escaping double quotes
print("She said \\"Hello!\\"")

# Escaping single quotes
print('It\\'s a great day!')

# Alternative: mixing quote styles
print("It's a great day!")
print('She said "Hello!"')`,
        demoSteps: [
          "Explain the problem: quotes end the string",
          "Show backslash escapes the quote",
          "Demonstrate both single and double quote escaping",
          "Show alternative: using opposite quote style"
        ],
        studentActivity: "Print a sentence with dialogue that includes quotation marks",
        commonErrors: [
          "Forgetting to escape quotes",
          "Using the wrong slash direction"
        ],
        keyTerms: ["escape", "quotation marks", "string delimiter"]
      },
      {
        id: "1-9",
        name: "Lesson 9: Triple Quotes",
        objectives: [
          "Use triple quotes for multi-line strings",
          "Preserve formatting",
          "Create text blocks"
        ],
        demoCode: `# Triple quotes preserve formatting
print(\"\"\"
This is line 1
This is line 2
This is line 3
\"\"\")

# Great for poems or formatted text
print(\"\"\"
Roses are red,
Violets are blue,
Python is awesome,
And so are you!
\"\"\")`,
        demoSteps: [
          "Show triple quotes (three double quotes)",
          "Demonstrate multi-line text",
          "Show formatting is preserved exactly",
          "Compare to using \\n"
        ],
        studentActivity: "Create a short poem or ASCII art using triple quotes",
        commonErrors: [
          "Not closing with matching triple quotes",
          "Inconsistent indentation inside triple quotes"
        ],
        keyTerms: ["triple quotes", "multi-line string", "preserve formatting"]
      },
      {
        id: "1-10",
        name: "Lesson 10: end, sep, custom",
        objectives: [
          "Use end parameter",
          "Use sep parameter",
          "Customize print output"
        ],
        demoCode: `# The end parameter - what comes after print
print("Hello", end=" ")
print("World")  # Hello World (on same line)

# The sep parameter - separator between arguments
print("A", "B", "C", sep="-")  # A-B-C
print("A", "B", "C", sep="***")  # A***B***C

# Combining both
print("1", "2", "3", sep=", ", end="!\\n")`,
        demoSteps: [
          "Explain print normally ends with newline",
          "Show end=\" \" keeps same line",
          "Introduce sep to change separator",
          "Combine for custom formatting"
        ],
        studentActivity: "Print a countdown from 5 to 1 all on one line with dashes between",
        commonErrors: [
          "Forgetting quotes around end/sep values",
          "Confusing end and sep purposes"
        ],
        keyTerms: ["end parameter", "sep parameter", "keyword argument"]
      },
      {
        id: "1-11",
        name: "Lesson 11: Concatenation",
        objectives: [
          "Join strings with +",
          "Combine variables and text",
          "Build dynamic messages"
        ],
        demoCode: `# String concatenation with +
greeting = "Hello"
name = "Alice"
message = greeting + ", " + name + "!"
print(message)  # Hello, Alice!

# Building strings piece by piece
first = "Python"
second = "is"
third = "fun"
sentence = first + " " + second + " " + third
print(sentence)`,
        demoSteps: [
          "Explain + joins strings together",
          "Show spaces must be added manually",
          "Combine variables and literal strings",
          "Build complex messages"
        ],
        studentActivity: "Create a greeting message using concatenation with variables",
        commonErrors: [
          "Forgetting spaces between concatenated parts",
          "Trying to concatenate strings and numbers directly"
        ],
        keyTerms: ["concatenation", "join", "combine strings"]
      },
      {
        id: "1-12",
        name: "Lesson 12: f-strings",
        objectives: [
          "Use f-string syntax",
          "Embed variables in strings",
          "Format expressions inline"
        ],
        demoCode: `# f-strings - the modern way
name = "Alice"
age = 14
print(f"Hello, {name}!")
print(f"{name} is {age} years old")

# Expressions inside f-strings
x = 5
print(f"5 + 3 = {5 + 3}")
print(f"{x} squared is {x * x}")`,
        demoSteps: [
          "Explain f before the quote",
          "Show curly braces {} hold variables",
          "Variables are automatically converted",
          "Can include expressions inside {}"
        ],
        studentActivity: "Rewrite previous concatenation examples using f-strings",
        commonErrors: [
          "Forgetting the f before the string",
          "Using () instead of {} for variables"
        ],
        keyTerms: ["f-string", "formatted string", "interpolation"]
      }
    ]
  },
  chapter2: {
    title: "Chapter 2: Variables and Input",
    icon: "📝",
    color: "from-green-500 to-emerald-500",
    lessons: [
      {
        id: "2-1",
        name: "Lesson 1: Intro to Variables",
        objectives: [
          "Understand variable assignment",
          "Use = operator",
          "Store different types of data"
        ],
        demoCode: `# Variables store data
name = "Alice"
age = 14
height = 5.5
is_student = True

# Variables can change
score = 0
score = 10
score = score + 5
print(score)  # 15`,
        demoSteps: [
          "Explain variables as labeled containers",
          "Show = assigns value to variable",
          "Demonstrate different data types",
          "Show variables can be updated"
        ],
        studentActivity: "Create variables for personal information and update one of them",
        commonErrors: [
          "Confusing = with ==",
          "Invalid variable names (spaces, starting with numbers)"
        ],
        keyTerms: ["variable", "assignment", "value", "identifier"]
      },
      {
        id: "2-2",
        name: "Lesson 2: Data Types",
        objectives: [
          "Identify int, str, float, bool",
          "Use type() function",
          "Understand type differences"
        ],
        demoCode: `# Different data types
my_int = 42
my_str = "Hello"
my_float = 3.14
my_bool = True

# Check the type
print(type(my_int))    # <class 'int'>
print(type(my_str))    # <class 'str'>
print(type(my_float))  # <class 'float'>
print(type(my_bool))   # <class 'bool'>`,
        demoSteps: [
          "Introduce the four basic types",
          "Show type() to check a variable's type",
          "Explain why types matter",
          "Compare different types"
        ],
        studentActivity: "Create variables of each type and verify with type()",
        commonErrors: [
          "Confusing str and int (e.g., \"42\" vs 42)",
          "Not recognizing float vs int"
        ],
        keyTerms: ["int", "str", "float", "bool", "type()"]
      },
      {
        id: "2-3",
        name: "Lesson 3: String Conversion",
        objectives: [
          "Convert between types",
          "Use int(), str(), float()",
          "Handle conversion errors"
        ],
        demoCode: `# Converting types
text_num = "42"
real_num = int(text_num)
print(real_num + 8)  # 50

# Number to string
age = 14
message = "I am " + str(age) + " years old"

# To float
price = float("19.99")
print(price * 2)  # 39.98`,
        demoSteps: [
          "Show the problem: can't add strings and numbers",
          "Demonstrate int(), str(), float()",
          "Explain when each conversion is needed",
          "Show conversion errors with invalid input"
        ],
        studentActivity: "Convert between types to fix a broken calculation",
        commonErrors: [
          "Forgetting to convert input for math",
          "Converting non-numeric strings to int"
        ],
        keyTerms: ["type conversion", "int()", "str()", "float()", "casting"]
      },
      {
        id: "2-4",
        name: "Lesson 4: upper, lower, title",
        objectives: [
          "Use .upper() method",
          "Use .lower() method",
          "Use .title() method"
        ],
        demoCode: `# String case methods
text = "hello World"

print(text.upper())  # HELLO WORLD
print(text.lower())  # hello world
print(text.title())  # Hello World

# Useful for comparisons
user_input = "YES"
if user_input.lower() == "yes":
    print("User said yes!")`,
        demoSteps: [
          "Show .upper() converts all to uppercase",
          "Show .lower() converts all to lowercase",
          "Show .title() capitalizes each word",
          "Demonstrate practical use case"
        ],
        studentActivity: "Make a name formatter that shows the name in all three styles",
        commonErrors: [
          "Forgetting parentheses: text.upper vs text.upper()",
          "Expecting the original string to change (it doesn't)"
        ],
        keyTerms: ["method", ".upper()", ".lower()", ".title()"]
      },
      {
        id: "2-5",
        name: "Lesson 5: strip, lstrip, rstrip",
        objectives: [
          "Remove whitespace with strip()",
          "Use lstrip() for left side",
          "Use rstrip() for right side"
        ],
        demoCode: `# Removing whitespace
text = "   Hello World   "

print(text.strip())   # "Hello World"
print(text.lstrip())  # "Hello World   "
print(text.rstrip())  # "   Hello World"

# Useful with user input
name = input("Enter name: ").strip()`,
        demoSteps: [
          "Show whitespace problems in user input",
          "Demonstrate strip() removes both sides",
          "Show lstrip() for left only",
          "Show rstrip() for right only"
        ],
        studentActivity: "Clean up messy user input using strip methods",
        commonErrors: [
          "Confusing l and r (left vs right)",
          "Expecting to remove all spaces (only removes leading/trailing)"
        ],
        keyTerms: [".strip()", ".lstrip()", ".rstrip()", "whitespace"]
      },
      {
        id: "2-6",
        name: "Lesson 6: replace, count, capitalize",
        objectives: [
          "Use .replace() to swap text",
          "Use .count() to find occurrences",
          "Use .capitalize()"
        ],
        demoCode: `# replace(old, new)
text = "Hello World"
print(text.replace("World", "Python"))  # Hello Python

# count(substring)
sentence = "banana"
print(sentence.count("a"))  # 3

# capitalize() - first letter only
name = "aLICE"
print(name.capitalize())  # Alice`,
        demoSteps: [
          "Show replace(old, new) swaps text",
          "Show count() finds how many times",
          "Show capitalize() vs title() difference",
          "Combine methods for text processing"
        ],
        studentActivity: "Replace words in a sentence and count specific letters",
        commonErrors: [
          "Wrong argument order in replace",
          "Expecting replace to modify original string"
        ],
        keyTerms: [".replace()", ".count()", ".capitalize()"]
      },
      {
        id: "2-7",
        name: "Lesson 7: Chaining Methods",
        objectives: [
          "Chain multiple methods together",
          "Understand method order",
          "Create efficient code"
        ],
        demoCode: `# Chaining methods together
text = "   HELLO world   "

# One at a time
result = text.strip()
result = result.lower()
result = result.title()

# Or chain them!
result = text.strip().lower().title()
print(result)  # Hello World

# Practical example
name = input("Enter name: ").strip().title()`,
        demoSteps: [
          "Show method chaining syntax",
          "Explain left-to-right execution",
          "Compare to step-by-step approach",
          "Show practical input cleaning"
        ],
        studentActivity: "Clean and format user input using method chaining",
        commonErrors: [
          "Wrong order (order matters!)",
          "Forgetting parentheses on each method"
        ],
        keyTerms: ["method chaining", "fluent interface"]
      },
      {
        id: "2-8",
        name: "Lesson 8: Input",
        objectives: [
          "Use input() function",
          "Store user responses",
          "Create interactive programs"
        ],
        demoCode: `# Getting user input
name = input("What is your name? ")
print(f"Hello, {name}!")

# Input always returns a string
age = input("How old are you? ")
# Need to convert for math
age = int(age)
next_year = age + 1
print(f"Next year you'll be {next_year}")`,
        demoSteps: [
          "Introduce input() function",
          "Show the prompt appears and waits",
          "Store the response in a variable",
          "EMPHASIZE: input always returns string"
        ],
        studentActivity: "Create a greeting program that asks for name and favorite color",
        commonErrors: [
          "Forgetting to store input in variable",
          "Trying to do math without converting"
        ],
        keyTerms: ["input()", "prompt", "user input", "interactive"]
      }
    ]
  },
  chapter3: {
    title: "Chapter 3: Python Math",
    icon: "🔢",
    color: "from-orange-500 to-red-500",
    lessons: [
      {
        id: "3-1",
        name: "Lesson 1: Variable Math",
        objectives: [
          "Add, subtract, multiply, divide",
          "Use variables in calculations",
          "Store results in variables"
        ],
        demoCode: `# Basic operations
a = 10
b = 3

print(a + b)   # 13 - Addition
print(a - b)   # 7  - Subtraction
print(a * b)   # 30 - Multiplication
print(a / b)   # 3.33... - Division

# Store results
total = a + b
print(total)`,
        demoSteps: [
          "Review basic math operators",
          "Show operations with variables",
          "Store results in new variables",
          "Explain division always gives float"
        ],
        studentActivity: "Calculate area and perimeter of a rectangle using variables",
        commonErrors: [
          "Using x for multiplication (use * instead)",
          "Forgetting order of operations"
        ],
        keyTerms: ["operators", "+", "-", "*", "/", "arithmetic"]
      },
      {
        id: "3-2",
        name: "Lesson 2: Type Conversion",
        objectives: [
          "Convert strings to numbers",
          "Handle input for math",
          "Avoid type errors"
        ],
        demoCode: `# Input is always a string
num1 = input("Enter first number: ")
num2 = input("Enter second number: ")

# Wrong way - concatenates strings
# print(num1 + num2)  # "5" + "3" = "53"

# Right way - convert first
num1 = int(num1)
num2 = int(num2)
print(num1 + num2)  # 5 + 3 = 8

# Or convert inline
num = int(input("Enter a number: "))`,
        demoSteps: [
          "Show the string + string problem",
          "Demonstrate int() conversion",
          "Show float() for decimals",
          "Convert inline for cleaner code"
        ],
        studentActivity: "Create a calculator that adds two user-input numbers",
        commonErrors: [
          "Forgetting conversion",
          "Using int() on decimal input"
        ],
        keyTerms: ["type conversion", "int()", "float()", "TypeError"]
      },
      {
        id: "3-3",
        name: "Lesson 3: String Math",
        objectives: [
          "Multiply strings",
          "Understand string repetition",
          "Combine with numbers"
        ],
        demoCode: `# String multiplication
print("*" * 10)    # **********
print("Ha" * 3)    # HaHaHa
print("-" * 20)    # --------------------

# Useful for formatting
name = "Alice"
print("=" * 20)
print(name.center(20))
print("=" * 20)`,
        demoSteps: [
          "Show string * number repeats the string",
          "Create borders and patterns",
          "Combine with other string methods",
          "Cannot multiply string by string"
        ],
        studentActivity: "Create a formatted text box with a border",
        commonErrors: [
          "Trying to multiply string * string",
          "Expecting string + number to work"
        ],
        keyTerms: ["string repetition", "string multiplication"]
      },
      {
        id: "3-4",
        name: "Lesson 4: Reassignment",
        objectives: [
          "Change variable values",
          "Update based on current value",
          "Track value changes"
        ],
        demoCode: `# Variables can change
score = 0
print(score)  # 0

score = 10
print(score)  # 10

# Update based on current value
score = score + 5
print(score)  # 15

score = score * 2
print(score)  # 30`,
        demoSteps: [
          "Show variable starting value",
          "Assign a completely new value",
          "Update using current value",
          "Trace through changes step by step"
        ],
        studentActivity: "Create a simple game score that increases with each 'round'",
        commonErrors: [
          "Expecting old value to remain",
          "Confusion about x = x + 1 syntax"
        ],
        keyTerms: ["reassignment", "update", "increment"]
      },
      {
        id: "3-5",
        name: "Lesson 5: Augmentation",
        objectives: [
          "Use += operator",
          "Use -=, *=, /= operators",
          "Write shorter code"
        ],
        demoCode: `# Augmented assignment operators
score = 100

score += 10   # Same as: score = score + 10
print(score)  # 110

score -= 20   # Same as: score = score - 20
print(score)  # 90

score *= 2    # Same as: score = score * 2
print(score)  # 180

score //= 3   # Same as: score = score // 3
print(score)  # 60`,
        demoSteps: [
          "Show += as shorthand",
          "Demonstrate all operators",
          "Compare to full assignment",
          "Use in practical examples"
        ],
        studentActivity: "Rewrite previous score examples using augmented operators",
        commonErrors: [
          "Forgetting the = part (+ vs +=)",
          "Wrong operator order (=+ doesn't work)"
        ],
        keyTerms: ["+=", "-=", "*=", "/=", "augmented assignment"]
      },
      {
        id: "3-6",
        name: "Lesson 6: Booleans",
        objectives: [
          "Understand True and False",
          "Use comparison operators",
          "Evaluate boolean expressions"
        ],
        demoCode: `# Boolean values
is_sunny = True
is_raining = False

# Comparison operators return booleans
x = 5
print(x > 3)   # True
print(x < 3)   # False
print(x == 5)  # True
print(x != 5)  # False
print(x >= 5)  # True
print(x <= 4)  # False`,
        demoSteps: [
          "Introduce True and False (capitalized)",
          "Show comparison operators",
          "Explain == vs = difference",
          "Combine for complex checks"
        ],
        studentActivity: "Write expressions to check if a number is within a range",
        commonErrors: [
          "Using = instead of == for comparison",
          "Forgetting to capitalize True/False"
        ],
        keyTerms: ["boolean", "True", "False", "comparison operators", "==", "!="]
      }
    ]
  },
  chapter4: {
    title: "Chapter 4: Conditionals",
    icon: "🔀",
    color: "from-cyan-500 to-blue-500",
    lessons: [
      {
        id: "4-1",
        name: "Lesson 1: if only",
        objectives: [
          "Write basic if statements",
          "Use comparison operators",
          "Understand indentation"
        ],
        demoCode: `# Basic if statement
age = 18

if age >= 18:
    print("You can vote!")

# Multiple statements in if block
score = 85
if score >= 70:
    print("You passed!")
    print("Great job!")`,
        demoSteps: [
          "Introduce if keyword",
          "Show condition and colon",
          "EMPHASIZE indentation (4 spaces)",
          "Code runs only if condition is True"
        ],
        studentActivity: "Check if a number is positive and print a message",
        commonErrors: [
          "Forgetting the colon",
          "Incorrect indentation",
          "Using = instead of =="
        ],
        keyTerms: ["if", "condition", "indentation", "boolean expression"]
      },
      {
        id: "4-1b",
        name: "Lesson 1: if statements",
        objectives: [
          "Understand boolean conditions",
          "Practice with different comparisons",
          "Build confidence with if syntax"
        ],
        demoCode: `# Different conditions
temperature = 75
name = "Alice"
items = 3

if temperature > 80:
    print("It's hot!")

if name == "Alice":
    print("Hello Alice!")

if items > 0:
    print("You have items in your cart")`,
        demoSteps: [
          "Practice multiple if statements",
          "Use different comparison operators",
          "Show string comparisons",
          "Emphasize each if is independent"
        ],
        studentActivity: "Write separate if statements for different conditions",
        commonErrors: [
          "Thinking if statements are connected",
          "Case sensitivity in string comparisons"
        ],
        keyTerms: ["condition", "comparison", "independent statements"]
      },
      {
        id: "4-2",
        name: "Lesson 2: if/else",
        objectives: [
          "Add else clause",
          "Handle two outcomes",
          "Create branching logic"
        ],
        demoCode: `# if/else for two options
temperature = 60

if temperature > 80:
    print("It's hot outside!")
else:
    print("It's not too hot.")

# Another example
password = "secret123"
attempt = input("Enter password: ")

if attempt == password:
    print("Access granted!")
else:
    print("Wrong password!")`,
        demoSteps: [
          "Review if statement",
          "Introduce else as 'otherwise'",
          "Show else has no condition",
          "Only ONE path executes"
        ],
        studentActivity: "Check if a number is even or odd",
        commonErrors: [
          "Putting condition after else",
          "Mismatched indentation",
          "Forgetting colon after else"
        ],
        keyTerms: ["else", "two-way decision", "branch"]
      },
      {
        id: "4-3",
        name: "Lesson 3: if/elif/else",
        objectives: [
          "Use elif for multiple conditions",
          "Check conditions in order",
          "Create grading programs"
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
    print("F - Please see teacher")`,
        demoSteps: [
          "Explain need for more than 2 options",
          "Introduce elif (else if)",
          "EMPHASIZE order matters - first match wins",
          "End with else as catch-all"
        ],
        studentActivity: "Create a grade calculator with letter grades",
        commonErrors: [
          "Wrong order of conditions",
          "Forgetting elif goes between if and else"
        ],
        keyTerms: ["elif", "multi-way decision", "chained conditionals"]
      },
      {
        id: "4-3b",
        name: "Lesson 3: if/elif/else Test",
        objectives: [
          "Practice complex conditionals",
          "Debug conditional logic",
          "Trace through decision trees"
        ],
        demoCode: `# Tracing through conditions
x = 15

# What will print?
if x > 20:
    print("A")
elif x > 10:
    print("B")  # This prints!
elif x > 5:
    print("C")
else:
    print("D")

# Even though x > 10 AND x > 5, only "B" prints!`,
        demoSteps: [
          "Walk through condition by condition",
          "Show first True match wins",
          "Trace with different values",
          "Common quiz-style questions"
        ],
        studentActivity: "Predict output for given inputs, then verify",
        commonErrors: [
          "Thinking all true conditions run",
          "Missing that elif stops after first match"
        ],
        keyTerms: ["trace", "decision tree", "first match"]
      },
      {
        id: "4-4a",
        name: "Lesson 4: if with AND pt 1",
        objectives: [
          "Use 'and' operator",
          "Require multiple conditions",
          "Build complex checks"
        ],
        demoCode: `# Using 'and' - both must be True
age = 16
has_permit = True

if age >= 16 and has_permit:
    print("You can drive!")

# Another example
score = 85
attendance = 90

if score >= 80 and attendance >= 80:
    print("You qualify for the honor roll!")`,
        demoSteps: [
          "Introduce 'and' operator",
          "Both conditions must be True",
          "Show truth table logic",
          "Practical examples"
        ],
        studentActivity: "Check if a student passes (score >= 70 AND attendance >= 80)",
        commonErrors: [
          "Using && instead of 'and'",
          "Forgetting one condition might be False"
        ],
        keyTerms: ["and", "logical operator", "both conditions"]
      },
      {
        id: "4-4b",
        name: "Lesson 4: if with AND pt 2",
        objectives: [
          "Practice AND conditions",
          "Combine multiple checks",
          "Debug AND logic"
        ],
        demoCode: `# Multiple AND conditions
age = 25
has_license = True
is_sober = True

if age >= 21 and has_license and is_sober:
    print("You may drive")

# Checking ranges (common pattern)
temperature = 72

if temperature >= 65 and temperature <= 85:
    print("Nice weather!")`,
        demoSteps: [
          "Chain multiple 'and' conditions",
          "Show range checking pattern",
          "Debug with different values",
          "Preview: chained comparison"
        ],
        studentActivity: "Create a ride eligibility checker with height AND age requirements",
        commonErrors: [
          "One False makes whole thing False",
          "Complicated logic hard to read"
        ],
        keyTerms: ["multiple conditions", "range check", "all True"]
      },
      {
        id: "4-5",
        name: "Lesson 5: if with OR",
        objectives: [
          "Use 'or' operator",
          "Allow alternative conditions",
          "Create flexible checks"
        ],
        demoCode: `# Using 'or' - either can be True
day = "Saturday"

if day == "Saturday" or day == "Sunday":
    print("It's the weekend!")

# Another example
age = 65

if age < 13 or age >= 65:
    print("You get a discount!")`,
        demoSteps: [
          "Introduce 'or' operator",
          "Only ONE needs to be True",
          "Show truth table logic",
          "Practical examples"
        ],
        studentActivity: "Check if someone qualifies for a discount (student OR senior)",
        commonErrors: [
          "Using || instead of 'or'",
          "Confusing 'and' vs 'or' logic"
        ],
        keyTerms: ["or", "either condition", "alternative"]
      },
      {
        id: "4-6",
        name: "Lesson 6: if with AND/OR",
        objectives: [
          "Combine AND and OR",
          "Use parentheses for clarity",
          "Build complex logic"
        ],
        demoCode: `# Combining AND and OR
age = 20
is_student = True
is_senior = False

# Use parentheses for clarity!
if (is_student or is_senior) and age >= 18:
    print("Adult discount available!")

# Without parentheses can be confusing
# Python evaluates: and before or
if is_student or is_senior and age >= 18:
    print("This might not work as expected!")`,
        demoSteps: [
          "Show combining operators",
          "EMPHASIZE using parentheses",
          "Explain precedence: and before or",
          "Keep conditions readable"
        ],
        studentActivity: "Create a complex eligibility checker using both operators",
        commonErrors: [
          "Forgetting parentheses",
          "Confusing operator precedence"
        ],
        keyTerms: ["combined logic", "parentheses", "precedence"]
      },
      {
        id: "4-7",
        name: "Lesson 7: if/elif/else with AND/OR",
        objectives: [
          "Combine all conditional concepts",
          "Create decision trees",
          "Build real-world programs"
        ],
        demoCode: `# Complete example: Movie ticket pricing
age = 25
is_member = True
is_student = False

if age < 12:
    price = 8
elif age >= 65 or is_student:
    price = 10
elif is_member:
    price = 12
else:
    price = 15

print(f"Your ticket price: $" + str(price))`,
        demoSteps: [
          "Walk through complete example",
          "Show real-world application",
          "Discuss order of conditions",
          "Test with different scenarios"
        ],
        studentActivity: "Create a complete pricing calculator with multiple discounts",
        commonErrors: [
          "Wrong condition order",
          "Missing edge cases"
        ],
        keyTerms: ["decision tree", "complete logic", "real-world application"]
      },
      {
        id: "4-8",
        name: "Lesson 8: Chained Comparison",
        objectives: [
          "Use chained comparisons",
          "Check ranges efficiently",
          "Write cleaner code"
        ],
        demoCode: `# Python's special feature: chained comparisons
x = 15

# Instead of this:
if x >= 10 and x <= 20:
    print("x is between 10 and 20")

# You can write this:
if 10 <= x <= 20:
    print("x is between 10 and 20")

# Works with any comparisons
a, b, c = 1, 2, 3
if a < b < c:
    print("a < b < c is True!")`,
        demoSteps: [
          "Show traditional range check",
          "Introduce Python's chained syntax",
          "Explain it's more readable",
          "Show various comparison chains"
        ],
        studentActivity: "Rewrite range checks using chained comparisons",
        commonErrors: [
          "This is Python-specific (other languages don't have this)",
          "Confusing direction of comparisons"
        ],
        keyTerms: ["chained comparison", "range check", "Pythonic"]
      }
    ]
  },
  chapter5: {
    title: "Chapter 5: Lists",
    icon: "📋",
    color: "from-violet-500 to-purple-500",
    lessons: [
      {
        id: "5-1",
        name: "Lesson 1: Intro to Lists",
        objectives: [
          "Create lists with []",
          "Store multiple values",
          "Understand list structure"
        ],
        demoCode: `# Creating lists
fruits = ["apple", "banana", "cherry"]
numbers = [1, 2, 3, 4, 5]
mixed = ["hello", 42, True, 3.14]

# Print entire list
print(fruits)  # ['apple', 'banana', 'cherry']

# Empty list
empty = []`,
        demoSteps: [
          "Explain lists store multiple items",
          "Show square bracket syntax",
          "Demonstrate different types in lists",
          "Show empty list creation"
        ],
        studentActivity: "Create lists for favorite foods, numbers, and mixed items",
        commonErrors: [
          "Using parentheses instead of brackets",
          "Forgetting commas between items"
        ],
        keyTerms: ["list", "collection", "elements", "index"]
      },
      {
        id: "5-2",
        name: "Lesson 2: Get a list element",
        objectives: [
          "Use index notation []",
          "Access by position",
          "Understand zero-indexing"
        ],
        demoCode: `# Accessing list elements
fruits = ["apple", "banana", "cherry", "date"]

print(fruits[0])   # apple (first item)
print(fruits[1])   # banana (second item)
print(fruits[-1])  # date (last item)
print(fruits[-2])  # cherry (second to last)

# Store in variable
first_fruit = fruits[0]`,
        demoSteps: [
          "Explain zero-based indexing",
          "Show positive indices",
          "Introduce negative indices",
          "Show IndexError if out of range"
        ],
        studentActivity: "Access different elements from a list you created",
        commonErrors: [
          "Forgetting index starts at 0",
          "Index out of range errors"
        ],
        keyTerms: ["index", "zero-based", "negative index", "access"]
      },
      {
        id: "5-3",
        name: "Lesson 3: Change a list element",
        objectives: [
          "Modify list items",
          "Assign new values by index",
          "Update list contents"
        ],
        demoCode: `# Changing list elements
fruits = ["apple", "banana", "cherry"]
print(fruits)  # ['apple', 'banana', 'cherry']

# Change an element
fruits[1] = "blueberry"
print(fruits)  # ['apple', 'blueberry', 'cherry']

# Change multiple
fruits[0] = "avocado"
fruits[2] = "coconut"
print(fruits)  # ['avocado', 'blueberry', 'coconut']`,
        demoSteps: [
          "Show original list",
          "Assign new value using index",
          "Print to verify change",
          "Lists are mutable (can change)"
        ],
        studentActivity: "Create a list and update several elements",
        commonErrors: [
          "Using wrong index",
          "Confusing this with accessing (both use [])"
        ],
        keyTerms: ["mutable", "modify", "update", "assignment"]
      },
      {
        id: "5-4",
        name: "Lesson 4: Add elements",
        objectives: [
          "Use append() method",
          "Use insert() method",
          "Grow lists dynamically"
        ],
        demoCode: `# append() adds to end
fruits = ["apple", "banana"]
fruits.append("cherry")
print(fruits)  # ['apple', 'banana', 'cherry']

# insert() adds at specific position
fruits.insert(1, "avocado")
print(fruits)  # ['apple', 'avocado', 'banana', 'cherry']

# insert(0, x) adds to beginning
fruits.insert(0, "apricot")`,
        demoSteps: [
          "Show append() adds to end",
          "Show insert(index, item)",
          "Explain when to use each",
          "Lists can grow dynamically"
        ],
        studentActivity: "Build a shopping list by adding items one at a time",
        commonErrors: [
          "Forgetting append doesn't return new list",
          "Wrong insert index"
        ],
        keyTerms: [".append()", ".insert()", "add", "grow"]
      },
      {
        id: "5-5",
        name: "Lesson 5: Remove elements",
        objectives: [
          "Use remove() method",
          "Use pop() method",
          "Delete by value or index"
        ],
        demoCode: `# remove() by value
fruits = ["apple", "banana", "cherry"]
fruits.remove("banana")
print(fruits)  # ['apple', 'cherry']

# pop() by index (default: last)
fruits = ["apple", "banana", "cherry"]
removed = fruits.pop()    # removes 'cherry'
print(removed)            # cherry
print(fruits)             # ['apple', 'banana']

removed = fruits.pop(0)   # removes 'apple'`,
        demoSteps: [
          "Show remove() finds and removes by value",
          "Show pop() removes by index",
          "pop() returns the removed item",
          "Show errors if item not found"
        ],
        studentActivity: "Remove items from a list using both methods",
        commonErrors: [
          "remove() only removes first occurrence",
          "ValueError if item not in list"
        ],
        keyTerms: [".remove()", ".pop()", "delete", "ValueError"]
      },
      {
        id: "5-6",
        name: "Lesson 6: Sorting",
        objectives: [
          "Use sort() method",
          "Use reverse() method",
          "Organize list data"
        ],
        demoCode: `# sort() arranges in order
numbers = [3, 1, 4, 1, 5, 9, 2, 6]
numbers.sort()
print(numbers)  # [1, 1, 2, 3, 4, 5, 6, 9]

# Alphabetical for strings
names = ["Charlie", "Alice", "Bob"]
names.sort()
print(names)  # ['Alice', 'Bob', 'Charlie']

# reverse() flips the list
numbers.reverse()
print(numbers)  # [9, 6, 5, 4, 3, 2, 1, 1]`,
        demoSteps: [
          "Show sort() for numbers",
          "Show sort() for strings",
          "Demonstrate reverse()",
          "Mention sort(reverse=True)"
        ],
        studentActivity: "Sort a list of scores and display highest to lowest",
        commonErrors: [
          "Can't sort mixed types",
          "sort() modifies original list"
        ],
        keyTerms: [".sort()", ".reverse()", "ascending", "descending"]
      },
      {
        id: "5-7",
        name: "Lesson 7: List Length",
        objectives: [
          "Use len() function",
          "Count list items",
          "Check list size"
        ],
        demoCode: `# len() returns number of items
fruits = ["apple", "banana", "cherry"]
print(len(fruits))  # 3

# Useful in conditions
if len(fruits) > 0:
    print("List is not empty")

# Access last item safely
last_index = len(fruits) - 1
print(fruits[last_index])  # cherry`,
        demoSteps: [
          "Show len() counts items",
          "Use in conditional checks",
          "Calculate last valid index",
          "Compare to empty list check"
        ],
        studentActivity: "Check if a list has at least 5 items before processing",
        commonErrors: [
          "len() is a function, not method",
          "Last index is len()-1, not len()"
        ],
        keyTerms: ["len()", "length", "count", "size"]
      },
      {
        id: "5-8",
        name: "Lesson 8: Count occurrences in lists",
        objectives: [
          "Use count() method",
          "Find duplicates",
          "Analyze list contents"
        ],
        demoCode: `# count() finds how many times
numbers = [1, 2, 2, 3, 2, 4, 2]
print(numbers.count(2))  # 4

# For strings
letters = ['a', 'b', 'a', 'c', 'a']
print(letters.count('a'))  # 3

# Check if item exists
if numbers.count(5) == 0:
    print("5 is not in the list")`,
        demoSteps: [
          "Show count() method",
          "Count duplicates",
          "Use to check existence",
          "Compare to 'in' operator"
        ],
        studentActivity: "Count how many times each grade appears in a list",
        commonErrors: [
          "count() returns 0 if not found (no error)",
          "Case sensitive for strings"
        ],
        keyTerms: [".count()", "occurrences", "frequency", "duplicates"]
      }
    ]
  },
  chapter6: {
    title: "Chapter 6: Loops",
    icon: "🔁",
    color: "from-teal-500 to-green-500",
    lessons: [
      {
        id: "6-1",
        name: "Lesson 1: Intro to loops",
        objectives: [
          "Understand loop concept",
          "Identify repetition patterns",
          "Recognize loop benefits"
        ],
        demoCode: `# Without loops (repetitive)
print("Hello")
print("Hello")
print("Hello")
print("Hello")
print("Hello")

# With a loop (much better!)
for i in range(5):
    print("Hello")`,
        demoSteps: [
          "Show repetitive code problem",
          "Introduce loops as solution",
          "Explain DRY principle (Don't Repeat Yourself)",
          "Preview loop syntax"
        ],
        studentActivity: "Identify repetitive code that could use a loop",
        commonErrors: [
          "Not recognizing repetition patterns",
          "Fear of loop syntax"
        ],
        keyTerms: ["loop", "iteration", "repetition", "DRY"]
      },
      {
        id: "6-2",
        name: "Lesson 2: for + range()",
        objectives: [
          "Use for loop syntax",
          "Use range() function",
          "Control loop iterations"
        ],
        demoCode: `# Basic for loop
for i in range(5):
    print(i)  # 0, 1, 2, 3, 4

# range with start and stop
for i in range(1, 6):
    print(i)  # 1, 2, 3, 4, 5

# range with step
for i in range(0, 10, 2):
    print(i)  # 0, 2, 4, 6, 8

# Countdown
for i in range(5, 0, -1):
    print(i)  # 5, 4, 3, 2, 1`,
        demoSteps: [
          "Show range(stop)",
          "Show range(start, stop)",
          "Show range(start, stop, step)",
          "Negative step for countdown"
        ],
        studentActivity: "Print multiplication table for a number using range",
        commonErrors: [
          "range(5) is 0-4, not 1-5",
          "Stop value is not included"
        ],
        keyTerms: ["for", "range()", "iteration", "step"]
      },
      {
        id: "6-3",
        name: "Lesson 3: while infinite",
        objectives: [
          "Create while True loops",
          "Understand infinite loops",
          "Use break to exit"
        ],
        demoCode: `# Infinite loop (be careful!)
while True:
    answer = input("Type 'quit' to exit: ")
    if answer == "quit":
        break
    print(f"You said: {answer}")

print("Goodbye!")

# Game loop pattern
while True:
    # Game logic here
    play_again = input("Play again? (y/n): ")
    if play_again != "y":
        break`,
        demoSteps: [
          "Explain while True runs forever",
          "Introduce break to exit",
          "Show common patterns",
          "Warn about true infinite loops"
        ],
        studentActivity: "Create a simple chatbot that runs until user says 'bye'",
        commonErrors: [
          "Forgetting break (infinite loop)",
          "break only exits innermost loop"
        ],
        keyTerms: ["while True", "infinite loop", "break"]
      },
      {
        id: "6-4",
        name: "Lesson 4: while conditional",
        objectives: [
          "Use while with conditions",
          "Create countdown loops",
          "Avoid infinite loops"
        ],
        demoCode: `# While with condition
count = 5
while count > 0:
    print(count)
    count -= 1
print("Blast off!")

# User input validation
password = ""
while password != "secret":
    password = input("Enter password: ")
print("Access granted!")`,
        demoSteps: [
          "Show condition-based while",
          "MUST update the condition variable",
          "Trace through iterations",
          "Compare to for loop"
        ],
        studentActivity: "Create a guessing game with limited attempts",
        commonErrors: [
          "Forgetting to update condition variable",
          "Off-by-one errors"
        ],
        keyTerms: ["while", "condition", "counter", "termination"]
      },
      {
        id: "6-5",
        name: "Lesson 5: Nested Loops",
        objectives: [
          "Put loops inside loops",
          "Create grids and patterns",
          "Understand iteration order"
        ],
        demoCode: `# Nested loops
for i in range(3):       # Outer loop
    for j in range(4):   # Inner loop
        print("*", end="")
    print()  # New line after inner loop

# Output:
# ****
# ****
# ****

# Multiplication table
for i in range(1, 4):
    for j in range(1, 4):
        print(f"{i}x{j}={i*j}", end="  ")
    print()`,
        demoSteps: [
          "Show outer loop runs first",
          "Inner loop completes each time",
          "Trace through execution",
          "Create patterns and tables"
        ],
        studentActivity: "Create a multiplication table using nested loops",
        commonErrors: [
          "Confusing i and j",
          "Wrong number of iterations"
        ],
        keyTerms: ["nested", "outer loop", "inner loop", "grid"]
      },
      {
        id: "6-6",
        name: "Lesson 6: Breaking out",
        objectives: [
          "Use break statement",
          "Use continue statement",
          "Control loop flow"
        ],
        demoCode: `# break exits the loop entirely
for i in range(10):
    if i == 5:
        break
    print(i)  # 0, 1, 2, 3, 4

# continue skips to next iteration
for i in range(10):
    if i % 2 == 0:
        continue
    print(i)  # 1, 3, 5, 7, 9 (odd numbers only)`,
        demoSteps: [
          "Show break stops loop completely",
          "Show continue skips current iteration",
          "Explain when to use each",
          "Be careful with nested loops"
        ],
        studentActivity: "Find the first number divisible by 7 in a range",
        commonErrors: [
          "Confusing break and continue",
          "break in nested loop only exits inner loop"
        ],
        keyTerms: ["break", "continue", "control flow", "skip"]
      }
    ]
  },
  chapter7: {
    title: "Chapter 7: Functions",
    icon: "📦",
    color: "from-amber-500 to-orange-500",
    lessons: [
      {
        id: "7-1",
        name: "Lesson 1: Intro to Functions",
        objectives: [
          "Use def keyword",
          "Call functions",
          "Understand function structure"
        ],
        demoCode: `# Defining a function
def greet():
    print("Hello!")
    print("Welcome to Python!")

# Calling the function
greet()
greet()  # Can call multiple times

# Function for repeated task
def draw_line():
    print("-" * 20)

draw_line()
print("My Report")
draw_line()`,
        demoSteps: [
          "Explain functions as reusable code blocks",
          "Show def keyword and naming",
          "Emphasize colon and indentation",
          "Demonstrate calling vs defining"
        ],
        studentActivity: "Create a function that prints a greeting box",
        commonErrors: [
          "Forgetting parentheses when calling",
          "Defining but never calling"
        ],
        keyTerms: ["def", "function", "call", "define", "reusable"]
      },
      {
        id: "7-2",
        name: "Lesson 2: Parameters",
        objectives: [
          "Pass values to functions",
          "Use multiple parameters",
          "Create flexible functions"
        ],
        demoCode: `# Function with parameter
def greet(name):
    print(f"Hello, {name}!")

greet("Alice")
greet("Bob")

# Multiple parameters
def add(a, b):
    result = a + b
    print(f"{a} + {b} = {result}")

add(5, 3)
add(10, 20)`,
        demoSteps: [
          "Explain parameters as inputs",
          "Show single parameter",
          "Show multiple parameters",
          "Arguments vs parameters"
        ],
        studentActivity: "Create a function that takes name and age, prints a message",
        commonErrors: [
          "Wrong number of arguments",
          "Arguments in wrong order"
        ],
        keyTerms: ["parameter", "argument", "pass", "input"]
      },
      {
        id: "7-3",
        name: "Lesson 3: Return",
        objectives: [
          "Use return statement",
          "Get values from functions",
          "Store returned results"
        ],
        demoCode: `# Function that returns a value
def add(a, b):
    return a + b

result = add(5, 3)
print(result)  # 8

# Using return value directly
print(add(10, 20))  # 30

# Return vs print
def square(n):
    return n * n

answer = square(5)
print(f"5 squared is {answer}")`,
        demoSteps: [
          "Explain return sends value back",
          "Store return value in variable",
          "Compare print vs return",
          "Use return value in expressions"
        ],
        studentActivity: "Create a function that calculates and returns circle area",
        commonErrors: [
          "Using print instead of return",
          "Forgetting to store return value"
        ],
        keyTerms: ["return", "return value", "output"]
      },
      {
        id: "7-4",
        name: "Lesson 4: Scope of Variables: Global",
        objectives: [
          "Understand global scope",
          "Use global keyword",
          "Access variables anywhere"
        ],
        demoCode: `# Global variable
score = 0

def add_points(points):
    global score  # Declare we're using global
    score = score + points

print(score)  # 0
add_points(10)
print(score)  # 10
add_points(5)
print(score)  # 15`,
        demoSteps: [
          "Show variable defined outside function",
          "Explain global scope",
          "Use 'global' keyword to modify",
          "Discuss when to use (sparingly)"
        ],
        studentActivity: "Create a game score tracker using global variable",
        commonErrors: [
          "Forgetting 'global' keyword",
          "Overusing global variables"
        ],
        keyTerms: ["global", "scope", "global keyword"]
      },
      {
        id: "7-5",
        name: "Lesson 5: Scope of Variables: Local",
        objectives: [
          "Understand local scope",
          "Variables inside functions",
          "Avoid scope conflicts"
        ],
        demoCode: `# Local variable
def my_function():
    local_var = "I'm local"
    print(local_var)

my_function()
# print(local_var)  # Error! Not accessible

# Local vs global
x = "global"

def show_x():
    x = "local"  # This is a different x
    print(x)  # local

show_x()
print(x)  # global (unchanged)`,
        demoSteps: [
          "Variables inside function are local",
          "Cannot access outside function",
          "Local shadows global",
          "Prefer local variables"
        ],
        studentActivity: "Trace through code with same-named local and global variables",
        commonErrors: [
          "Expecting local vars to exist outside",
          "Confusing local and global with same name"
        ],
        keyTerms: ["local", "scope", "shadowing", "encapsulation"]
      }
    ]
  }
};

export default function PythonTeaching({ user }) {
  const navigate = useNavigate();
  const [selectedChapter, setSelectedChapter] = useState("chapter1");
  const [selectedLesson, setSelectedLesson] = useState(LESSONS.chapter1.lessons[0]);
  const [expandedChapter, setExpandedChapter] = useState("chapter1");

  const copyCode = () => {
    if (selectedLesson?.demoCode) {
      navigator.clipboard.writeText(selectedLesson.demoCode);
      toast.success("Demo code copied!");
    }
  };

  const copyObjectives = () => {
    if (selectedLesson?.objectives) {
      const text = selectedLesson.objectives.join('\n• ');
      navigator.clipboard.writeText('• ' + text);
      toast.success("Objectives copied!");
    }
  };

  // Guard against rendering before state is initialized
  if (!selectedLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/python-curriculum")}
              className="text-white hover:bg-cyber-navy/60/20"
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
            className="bg-cyber-navy/60 text-blue-600 hover:bg-blue-50"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            View Problems
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Chapter & Lesson Navigator */}
          <div className="lg:col-span-1 space-y-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Lessons
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
                {Object.entries(LESSONS).map(([chapterKey, chapter]) => (
                  <div key={chapterKey}>
                    {/* Chapter Header */}
                    <button
                      onClick={() => setExpandedChapter(expandedChapter === chapterKey ? null : chapterKey)}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-cyber-navy/40 transition-colors border-b ${
                        selectedChapter === chapterKey ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{chapter.icon}</span>
                        <span className="font-medium text-sm">{chapter.title}</span>
                      </div>
                      {expandedChapter === chapterKey ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    
                    {/* Lessons List */}
                    {expandedChapter === chapterKey && (
                      <div className="bg-cyber-navy/40">
                        {chapter.lessons.map((lesson) => (
                          <button
                            key={lesson.id}
                            onClick={() => {
                              setSelectedChapter(chapterKey);
                              setSelectedLesson(lesson);
                            }}
                            className={`w-full text-left px-6 py-2 text-sm border-b border-cyber-cyan/10 hover:bg-blue-50 transition-colors ${
                              selectedLesson?.id === lesson.id ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''
                            }`}
                          >
                            {lesson.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Play className="w-4 h-4 text-green-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={copyCode} className="w-full bg-blue-500 hover:bg-blue-600" size="sm">
                  <Terminal className="w-4 h-4 mr-2" />
                  Copy Demo Code
                </Button>
                <Button onClick={copyObjectives} variant="outline" className="w-full" size="sm">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Objectives
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Lesson Header */}
            <Card className={`bg-gradient-to-r ${LESSONS[selectedChapter].color}`}>
              <CardContent className="py-6 text-white">
                <div className="flex items-center gap-2 text-sm opacity-80 mb-1">
                  <span>{LESSONS[selectedChapter].icon}</span>
                  <span>{LESSONS[selectedChapter].title}</span>
                </div>
                <h2 className="text-2xl font-bold">{selectedLesson.name}</h2>
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

            {/* Key Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📚 Key Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedLesson.keyTerms?.map((term, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-mono">
                      {term}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
