import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  RotateCcw,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from "lucide-react";
import Editor from "@monaco-editor/react";
import AnimatedTurtle from "@/components/AnimatedTurtle";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

// Teaching examples with detailed code explanations
const TEACHING_EXAMPLES = {
  basics: {
    title: "🐢 First Steps",
    lessons: [
      {
        id: "name_turtle",
        title: "Name Your Turtle!",
        description: "You can give your turtle any name you like! Change 't' to your name or a fun name like 'bob' or 'sally'.",
        code: `import turtle
#import turtle: loads the turtle graphics library so we can draw

bob = turtle.Turtle()
#bob = turtle.Turtle(): creates a new turtle and names it 'bob'
#you can use any name you want - try 'sally', 'speedy', or your own name!

bob.color("purple")
#bob.color("purple"): changes the turtle's color
#try: "red", "blue", "green", "orange", "pink"

bob.forward(100)
#bob.forward(100): move bob forward 100 pixels (dots on screen)

bob.right(90)
#bob.right(90): turn bob 90 degrees to the right (clockwise)

bob.forward(50)
#bob.forward(50): move bob forward 50 more pixels`,
        concepts: ["naming variables", "color()", "personalization"]
      },
      {
        id: "forward",
        title: "Moving Forward",
        description: "The turtle starts in the center, facing right. forward(100) moves it 100 pixels.",
        code: `import turtle
#import turtle: this line MUST be first - it loads the drawing tools

t = turtle.Turtle()
#t = turtle.Turtle(): creates your turtle, we call it 't' for short
#the turtle starts in the middle of the screen, facing right →

t.forward(100)
#t.forward(100): tells the turtle to walk forward 100 pixels
#pixels are tiny dots on your screen - 100 pixels is about 1 inch
#try changing 100 to 50 or 200 to see different distances!

t.hideturtle()
#t.hideturtle(): hides the turtle arrow at the end (optional)`,
        concepts: ["forward()", "distance in pixels"]
      },
      {
        id: "backward",
        title: "Moving Backward",
        description: "backward() moves the turtle in the opposite direction without turning.",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
#t = turtle.Turtle(): creates your turtle

t.forward(100)
#t.forward(100): move forward 100 pixels first

t.backward(50)
#t.backward(50): move backward 50 pixels
#the turtle goes backwards WITHOUT turning around
#it still faces the same direction, just moves in reverse
#like walking backwards!

t.hideturtle()`,
        concepts: ["backward()", "relative movement"]
      },
      {
        id: "turning",
        title: "Turning Right & Left",
        description: "right(90) turns 90 degrees clockwise. left(90) turns counter-clockwise.",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
#t = turtle.Turtle(): creates your turtle

t.forward(100)
#t.forward(100): first, move forward 100 pixels

t.right(90)
#t.right(90): turn RIGHT 90 degrees (clockwise, like a clock)
#90 degrees is a "right angle" - like the corner of a square
#the turtle is now facing DOWN instead of RIGHT

t.forward(100)
#t.forward(100): now move forward again
#since we turned, "forward" is now DOWN

t.left(90)
#t.left(90): turn LEFT 90 degrees (counter-clockwise)
#now the turtle faces RIGHT again

t.forward(50)
#t.forward(50): move forward (to the right) 50 pixels

t.hideturtle()`,
        concepts: ["right()", "left()", "degrees"]
      },
      {
        id: "square",
        title: "Drawing a Square",
        description: "Combine forward and turn to draw a square. Each corner is a 90° turn.",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
#t = turtle.Turtle(): creates your turtle

#A square has 4 equal sides and 4 corners
#Each corner is a 90 degree turn (right angle)

t.forward(100)
#Side 1: move forward 100 pixels (draws the bottom)
t.right(90)
#Turn 1: turn right 90 degrees

t.forward(100)
#Side 2: move forward 100 pixels (draws the right side)
t.right(90)
#Turn 2: turn right 90 degrees

t.forward(100)
#Side 3: move forward 100 pixels (draws the top)
t.right(90)
#Turn 3: turn right 90 degrees

t.forward(100)
#Side 4: move forward 100 pixels (draws the left side)
#The square is complete! We made 4 turns of 90° = 360° total

t.hideturtle()`,
        concepts: ["combining commands", "closed shapes"]
      }
    ]
  },
  loops: {
    title: "🔁 Loops",
    lessons: [
      {
        id: "for_basic",
        title: "For Loop Basics",
        description: "for i in range(4) repeats code 4 times. Perfect for shapes!",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
#t = turtle.Turtle(): creates your turtle

#This is much better than repeating!
#the for loop meaning: for iteration(repeats) in range(number of times to repeat)
#do this: move forward 100 pixels then turn right 90 degrees.

for i in range(4):
#for i in range(4): repeat the indented code 4 times
#i is a counter: 0, 1, 2, 3 (4 numbers starting from 0)
#range(4) means "do this 4 times"

    t.forward(100)
    #t.forward(100): move forward 100 pixels
    
    t.right(90)
    #t.right(90): turn right 90 degrees

#The loop draws all 4 sides of the square automatically!
#Much easier than writing forward and right 4 times each!

t.hideturtle()`,
        concepts: ["for loop", "range()", "repetition"]
      },
      {
        id: "triangle",
        title: "Triangle with Loop",
        description: "Triangle has 3 sides. The turning angle is 360÷3 = 120°",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
#t = turtle.Turtle(): creates your turtle

#Triangle math:
#A triangle has 3 sides
#The turtle needs to turn a total of 360 degrees to complete the shape
#So each turn = 360 ÷ 3 = 120 degrees

for i in range(3):
#for i in range(3): repeat 3 times (because triangle has 3 sides)

    t.forward(100)
    #t.forward(100): draw one side of the triangle (100 pixels long)
    
    t.left(120)
    #t.left(120): turn left 120 degrees
    #Why 120? Because 360 ÷ 3 = 120!

#The loop automatically draws all 3 sides!

t.hideturtle()`,
        concepts: ["angle calculation", "360 / sides"]
      },
      {
        id: "polygon",
        title: "Any Polygon",
        description: "Use a variable for sides and calculate the angle: 360 / sides",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
#t = turtle.Turtle(): creates your turtle

sides = 6
#sides = 6: this variable stores how many sides we want
#try changing to 3 (triangle), 5 (pentagon), 8 (octagon)!

angle = 360 / sides
#angle = 360 / sides: calculates the turn angle
#for 6 sides: 360 ÷ 6 = 60 degrees per turn
#for 5 sides: 360 ÷ 5 = 72 degrees per turn
#for 8 sides: 360 ÷ 8 = 45 degrees per turn

for i in range(sides):
#for i in range(sides): repeat once for each side

    t.forward(50)
    #t.forward(50): draw one side (50 pixels)
    
    t.right(angle)
    #t.right(angle): turn by our calculated angle

#This code can draw ANY regular polygon - just change 'sides'!

t.hideturtle()`,
        concepts: ["variables in loops", "formula: 360/n"]
      },
      {
        id: "spiral",
        title: "Spiral Pattern",
        description: "Increase the distance each time to create a spiral effect.",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
#t = turtle.Turtle(): creates your turtle

t.speed(0)
#t.speed(0): makes the turtle draw instantly (fastest speed)
#speeds: 0=fastest, 1=slowest, 10=fast

for i in range(50):
#for i in range(50): repeat 50 times
#i will be: 0, 1, 2, 3, 4... up to 49

    t.forward(i * 5)
    #t.forward(i * 5): move forward i × 5 pixels
    #when i=0: forward 0 pixels
    #when i=1: forward 5 pixels
    #when i=2: forward 10 pixels
    #when i=10: forward 50 pixels
    #The distance gets bigger each time - that's what makes the spiral!
    
    t.right(90)
    #t.right(90): turn right 90 degrees each time

#The spiral grows because each line is longer than the last!

t.hideturtle()`,
        concepts: ["changing values", "i * multiplier"]
      }
    ]
  },
  colors: {
    title: "🎨 Colors",
    lessons: [
      {
        id: "pencolor",
        title: "Pen Color",
        description: "pencolor() changes the line color. Use color names like 'red', 'blue'.",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
#t = turtle.Turtle(): creates your turtle

t.pencolor('red')
#t.pencolor('red'): sets the pen (line) color to red
#common colors: 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black'

t.forward(100)
#t.forward(100): draw a RED line (100 pixels)

t.right(90)
#t.right(90): turn right 90 degrees

t.pencolor('blue')
#t.pencolor('blue'): change the pen color to blue
#from now on, lines will be blue

t.forward(100)
#t.forward(100): draw a BLUE line (100 pixels)

t.right(90)

t.pencolor('green')
#t.pencolor('green'): change to green

t.forward(100)
#t.forward(100): draw a GREEN line

t.hideturtle()`,
        concepts: ["pencolor()", "color names"]
      },
      {
        id: "fillcolor",
        title: "Fill Shapes",
        description: "Use begin_fill() before and end_fill() after to fill a shape.",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
#t = turtle.Turtle(): creates your turtle

t.fillcolor('yellow')
#t.fillcolor('yellow'): sets what color to fill shapes with
#this doesn't fill yet - just sets the color for later

t.begin_fill()
#t.begin_fill(): START recording the shape to fill
#everything drawn after this will be part of the filled shape

for i in range(4):
#for i in range(4): draw a square (4 sides)

    t.forward(100)
    #t.forward(100): draw one side
    
    t.right(90)
    #t.right(90): turn for the next side

t.end_fill()
#t.end_fill(): STOP recording and fill the shape with yellow
#the shape gets filled only when you call end_fill()!

t.hideturtle()`,
        concepts: ["fillcolor()", "begin_fill()", "end_fill()"]
      },
      {
        id: "rainbow",
        title: "Rainbow Colors",
        description: "Use a list of colors and cycle through them with % operator.",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
t.speed(0)
#t.speed(0): fastest drawing speed

colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']
#colors = [...]: a LIST of 6 colors
#lists hold multiple items in order: colors[0]='red', colors[1]='orange', etc.

for i in range(36):
#for i in range(36): repeat 36 times

    t.pencolor(colors[i % 6])
    #t.pencolor(colors[i % 6]): pick a color from the list
    #% is "modulo" - gives the remainder after division
    #i % 6 cycles through 0,1,2,3,4,5,0,1,2,3,4,5...
    #so colors repeat: red,orange,yellow,green,blue,purple,red,orange...
    
    t.forward(i * 5)
    #t.forward(i * 5): spiral effect - each line is longer
    
    t.right(60)
    #t.right(60): turn 60 degrees (makes a hexagon pattern)

t.hideturtle()`,
        concepts: ["color list", "% modulo", "cycling"]
      },
      {
        id: "pensize",
        title: "Pen Size",
        description: "pensize() changes line thickness. Higher number = thicker line.",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
#t = turtle.Turtle(): creates your turtle

#pensize() controls how thick the line is
#default is 1 (thin line)
#higher numbers = thicker lines

for i in range(1, 6):
#for i in range(1, 6): i goes 1, 2, 3, 4, 5
#range(1, 6) starts at 1 and stops BEFORE 6

    t.pensize(i * 2)
    #t.pensize(i * 2): set pen thickness
    #when i=1: pensize(2) - thin
    #when i=2: pensize(4) - medium
    #when i=5: pensize(10) - thick!
    
    t.forward(50)
    #t.forward(50): draw a line with current thickness
    
    t.right(90)
    #t.right(90): turn for next side

t.hideturtle()`,
        concepts: ["pensize()", "line thickness"]
      }
    ]
  },
  conditionals: {
    title: "🔀 Conditionals",
    lessons: [
      {
        id: "if_basic",
        title: "If Statement",
        description: "if checks a condition. Only runs the indented code if True.",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
t.speed(0)
#t.speed(0): fastest speed to draw quickly

for i in range(360):
#for i in range(360): loop 360 times to draw a circle

    if t.xcor() > 0:
    #if t.xcor() > 0: check if turtle's X position is positive
    #xcor() = x coordinate = horizontal position
    #positive x means the RIGHT side of the screen
    #this condition is True when turtle is on the right half
    
        t.pencolor('red')
        #t.pencolor('red'): if on right side, use red
        #this line ONLY runs when the if condition is True
    
    t.forward(1)
    #t.forward(1): move forward 1 pixel
    
    t.right(1)
    #t.right(1): turn right 1 degree
    #going around in a circle!

t.hideturtle()`,
        concepts: ["if statement", "condition", "xcor()"]
      },
      {
        id: "if_else",
        title: "If-Else",
        description: "else runs when the if condition is False.",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
t.speed(0)

for i in range(360):
#for i in range(360): loop to draw a circle

    if t.ycor() > 0:
    #if t.ycor() > 0: check if turtle's Y position is positive
    #ycor() = y coordinate = vertical position
    #positive y means the TOP half of the screen
    
        t.pencolor('blue')
        #t.pencolor('blue'): if in top half, use blue
        
    else:
    #else: this runs when the if condition is False
    #meaning: when the turtle is NOT in the top half
    
        t.pencolor('red')
        #t.pencolor('red'): if in bottom half, use red
    
    t.forward(1)
    t.right(1)

#Result: top half of circle is blue, bottom half is red!

t.hideturtle()`,
        concepts: ["if-else", "alternative path"]
      },
      {
        id: "elif",
        title: "Multiple Conditions (elif)",
        description: "elif checks additional conditions after if.",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
t.speed(0)
t.pensize(3)
#t.pensize(3): thicker line so we can see colors better

for i in range(360):
#for i in range(360): loop 360 times for a full circle

    if i < 90:
    #if i < 90: first quarter (0-89)
        t.pencolor('red')
        
    elif i < 180:
    #elif i < 180: second quarter (90-179)
    #elif means "else if" - only checks if previous condition was False
        t.pencolor('green')
        
    elif i < 270:
    #elif i < 270: third quarter (180-269)
        t.pencolor('blue')
        
    else:
    #else: everything else (270-359)
    #catches the fourth quarter
        t.pencolor('purple')
    
    t.forward(1)
    t.right(1)

#Result: circle divided into 4 colored sections!

t.hideturtle()`,
        concepts: ["elif", "multiple conditions"]
      },
      {
        id: "modulo",
        title: "Alternating with %",
        description: "i % 2 == 0 checks if i is even. Great for alternating patterns!",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
t.speed(0)

for i in range(12):
#for i in range(12): draw 12 squares in a row

    if i % 2 == 0:
    #if i % 2 == 0: check if i is EVEN
    #% is modulo - gives remainder after division
    #i % 2 = 0 means i divides evenly by 2 (even number)
    #0, 2, 4, 6, 8, 10 are even → fill them black
    
        t.fillcolor('black')
        t.begin_fill()
        #start filling this square
    
    for j in range(4):
    #for j in range(4): draw a square (4 sides)
        t.forward(40)
        t.right(90)
    
    if i % 2 == 0:
    #if i % 2 == 0: only end fill for even squares
        t.end_fill()
    
    t.penup()
    #t.penup(): lift pen to move without drawing
    
    t.forward(50)
    #t.forward(50): move to next square position
    
    t.pendown()
    #t.pendown(): put pen back down to draw

#Result: alternating filled/empty squares like a checkerboard row!

t.hideturtle()`,
        concepts: ["% modulo", "even/odd check"]
      }
    ]
  },
  functions: {
    title: "📦 Functions",
    lessons: [
      {
        id: "def_basic",
        title: "Defining Functions",
        description: "def creates a reusable block of code. Call it by name().",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
#t = turtle.Turtle(): creates your turtle

def draw_square():
#def draw_square(): creates a new function named 'draw_square'
#def means "define" - we're defining what this function does
#the code inside (indented) is what happens when you call it

    for i in range(4):
        t.forward(50)
        t.right(90)
    #this code draws a square - but it doesn't run yet!
    #it only runs when we CALL the function

#Now let's USE (call) our function:

draw_square()
#draw_square(): CALLS the function - runs the code inside
#this draws the first square

t.penup()
#t.penup(): lift pen to move without drawing

t.forward(70)
#t.forward(70): move to a new position

t.pendown()
#t.pendown(): put pen back down

draw_square()
#draw_square(): call the function again - draws another square!
#functions are reusable - call them as many times as you want

t.hideturtle()`,
        concepts: ["def", "function definition", "calling functions"]
      },
      {
        id: "parameters",
        title: "Parameters",
        description: "Parameters make functions flexible. Pass values when calling.",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()

def draw_square(size):
#def draw_square(size): function with a PARAMETER called 'size'
#parameters are like blanks that you fill in when calling
#'size' will be whatever number you pass in

    for i in range(4):
        t.forward(size)
        #t.forward(size): move forward by the size parameter
        #this makes the function flexible!
        
        t.right(90)

#Now we can make different sized squares!

draw_square(30)
#draw_square(30): calls function with size=30 (small square)

t.penup()
t.forward(50)
t.pendown()

draw_square(60)
#draw_square(60): calls function with size=60 (medium square)

t.penup()
t.forward(80)
t.pendown()

draw_square(90)
#draw_square(90): calls function with size=90 (large square)

#Same function, different sizes - that's the power of parameters!

t.hideturtle()`,
        concepts: ["parameters", "arguments", "flexibility"]
      },
      {
        id: "multi_params",
        title: "Multiple Parameters",
        description: "Functions can have multiple parameters separated by commas.",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()

def draw_square(size, color):
#def draw_square(size, color): TWO parameters!
#size controls how big, color controls what color
#separate multiple parameters with commas

    t.fillcolor(color)
    #t.fillcolor(color): use the color parameter
    
    t.begin_fill()
    
    for i in range(4):
        t.forward(size)
        #t.forward(size): use the size parameter
        t.right(90)
    
    t.end_fill()

#Now we can control BOTH size and color:

draw_square(50, 'red')
#draw_square(50, 'red'): size=50, color='red'

t.penup()
t.forward(70)
t.pendown()

draw_square(50, 'blue')
#draw_square(50, 'blue'): same size, different color

t.penup()
t.forward(70)
t.pendown()

draw_square(50, 'green')
#draw_square(50, 'green'): another color

#Same function creates red, blue, and green squares!

t.hideturtle()`,
        concepts: ["multiple parameters", "customization"]
      },
      {
        id: "composition",
        title: "Function Composition",
        description: "Functions can call other functions to build complex drawings.",
        code: `import turtle
#import turtle: loads the turtle graphics library

t = turtle.Turtle()
t.speed(0)

def draw_square(size):
#def draw_square(size): a simple function that draws a square
    for i in range(4):
        t.forward(size)
        t.right(90)

def draw_flower():
#def draw_flower(): a function that uses draw_square!
#this is called "composition" - building with smaller pieces

    for i in range(6):
    #for i in range(6): repeat 6 times for 6 petals
    
        draw_square(50)
        #draw_square(50): call our square function!
        #this draws one "petal" of the flower
        
        t.right(60)
        #t.right(60): turn 60 degrees before next petal
        #360 ÷ 6 = 60 degrees between each petal

#Call the flower function:
draw_flower()
#draw_flower(): draws a flower made of 6 rotated squares

#The flower function calls the square function 6 times!
#This is how you build complex drawings from simple pieces.

t.hideturtle()`,
        concepts: ["composition", "building blocks"]
      }
    ]
  }
};

export default function TurtleTeaching({ user }) {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState("basics");
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [code, setCode] = useState("");
  const [highlightedLine, setHighlightedLine] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);

  const currentTopic = TEACHING_EXAMPLES[selectedTopic];
  const currentLesson = currentTopic.lessons[currentLessonIndex];
  const lessonCode = currentLesson?.code || "";

  // Reset code when lesson changes
  useEffect(() => {
    setCode(lessonCode);
    setHighlightedLine(-1);
  }, [lessonCode]);

  // Handle line highlighting from AnimatedTurtle
  const handleLineHighlight = useCallback((lineNum) => {
    setHighlightedLine(lineNum);
    
    if (editorRef.current && lineNum >= 0) {
      const editor = editorRef.current;
      const monaco = window.monaco;
      
      // Clear previous decorations
      if (decorationsRef.current.length > 0) {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      }
      
      // Add new highlight (lineNum is 0-indexed, Monaco is 1-indexed)
      const monacoLine = lineNum + 1;
      decorationsRef.current = editor.deltaDecorations([], [
        {
          range: new monaco.Range(monacoLine, 1, monacoLine, 1),
          options: {
            isWholeLine: true,
            className: 'highlighted-line',
            glyphMarginClassName: 'highlighted-glyph'
          }
        }
      ]);
      
      // Scroll to the line
      editor.revealLineInCenter(monacoLine);
    } else if (editorRef.current && lineNum < 0) {
      // Clear highlights when done
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
  }, []);

  const resetCode = () => {
    setCode(currentLesson.code);
    setHighlightedLine(-1);
    if (editorRef.current && decorationsRef.current.length > 0) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
  };

  const nextLesson = () => {
    if (currentLessonIndex < currentTopic.lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  const prevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Add CSS for line highlighting
    const style = document.createElement('style');
    style.textContent = `
      .highlighted-line {
        background-color: rgba(34, 197, 94, 0.3) !important;
        border-left: 3px solid #22c55e !important;
      }
      .highlighted-glyph {
        background-color: #22c55e;
        margin-left: 3px;
      }
    `;
    document.head.appendChild(style);
  };

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-500 py-3 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/turtle")}
              className="text-white hover:bg-cyber-navy/60/20"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              <span className="font-bold">Teaching Mode</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Topic Selector */}
            <Select 
              value={selectedTopic} 
              onValueChange={(value) => {
                setSelectedTopic(value);
                setCurrentLessonIndex(0);
              }}
            >
              <SelectTrigger className="w-40 bg-cyber-navy/60/10 border-white/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TEACHING_EXAMPLES).map(([key, topic]) => (
                  <SelectItem key={key} value={key}>{topic.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Lesson Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevLesson}
                disabled={currentLessonIndex === 0}
                className="text-white hover:bg-cyber-navy/60/20 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm min-w-[60px] text-center">
                {currentLessonIndex + 1} / {currentTopic.lessons.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextLesson}
                disabled={currentLessonIndex === currentTopic.lessons.length - 1}
                className="text-white hover:bg-cyber-navy/60/20 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-white hover:bg-cyber-navy/60/20"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Lesson Title */}
      <div className="bg-gray-800 px-6 py-3 border-b border-gray-700">
        <h2 className="text-xl font-bold text-green-400">{currentLesson.title}</h2>
        <p className="text-gray-300 text-sm mt-1">{currentLesson.description}</p>
        <div className="flex gap-2 mt-2">
          {currentLesson.concepts.map((concept, i) => (
            <span key={i} className="px-2 py-1 bg-green-900/50 text-green-300 rounded text-xs font-mono">
              {concept}
            </span>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-[calc(100vh-150px)]">
        {/* Code Editor Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
              <span className="text-sm text-slate-500">Code with Explanations</span>
              <Button
                onClick={resetCode}
                size="sm"
                variant="outline"
                className="bg-gray-700 border-gray-600 hover:bg-gray-600"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
                value={code}
                onChange={setCode}
                onMount={handleEditorMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: "on",
                  glyphMargin: true,
                }}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-gray-700 hover:bg-green-500 transition-colors" />

        {/* Turtle Canvas Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full bg-cyber-navy/60 flex items-center justify-center">
            <AnimatedTurtle 
              code={code} 
              onLineHighlight={handleLineHighlight}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
