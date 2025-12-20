# Problem Library Template

This template helps you create standardized problems for the Python educational platform.

## Problem Categories

Each skill should have **16 problems** organized as follows:
- **4 Class Practice** - Teacher-led practice during lessons
- **4 Paired Programming** - Students work in pairs
- **4 Independent Practice** - Individual work
- **4 Debugging** - Find and fix bugs in code

---

## Turtle Graphics Problem Template

### Unit 1: First Steps with Turtle

#### Problem 1: Class Practice - Forward Movement
```
Title: Move the Turtle Forward
Description: Write code to make the turtle move forward 100 pixels.
Category: Turtle - First Steps
Problem Type: Class Practice
Difficulty: Easy
Unit: Unit 1
Chapter: Turtle Graphics
Lesson: Movement Basics

Starter Code:
import turtle

t = turtle.Turtle()

# Your code here - move forward 100 pixels


t.hideturtle()

Solution Code:
import turtle

t = turtle.Turtle()

t.forward(100)

t.hideturtle()

Test Cases: N/A (Turtle graphics - visual verification)
```

#### Problem 2: Paired Programming - Draw a Line
```
Title: Draw a Colored Line
Description: Work with your partner to draw a red line that is 150 pixels long.
Category: Turtle - First Steps
Problem Type: Paired Programming
Difficulty: Easy
Unit: Unit 1
Chapter: Turtle Graphics
Lesson: Colors and Movement

Starter Code:
import turtle

t = turtle.Turtle()

# Step 1: Change the pen color to red
# Step 2: Move forward 150 pixels


t.hideturtle()

Solution Code:
import turtle

t = turtle.Turtle()

t.pencolor("red")
t.forward(150)

t.hideturtle()
```

#### Problem 3: Independent Practice - Square Attempt
```
Title: Draw One Side of a Square
Description: Draw one side of a square that is 80 pixels long, then turn right 90 degrees.
Category: Turtle - First Steps
Problem Type: Independent Practice
Difficulty: Easy
Unit: Unit 1
Chapter: Turtle Graphics
Lesson: Turning

Starter Code:
import turtle

t = turtle.Turtle()

# Draw one side (80 pixels) and turn right 90 degrees


t.hideturtle()

Solution Code:
import turtle

t = turtle.Turtle()

t.forward(80)
t.right(90)

t.hideturtle()
```

#### Problem 4: Debugging - Fix the Direction
```
Title: Fix the Direction Bug
Description: This code should turn the turtle RIGHT, but it turns LEFT. Find and fix the bug!
Category: Turtle - First Steps
Problem Type: Debugging
Difficulty: Easy
Unit: Unit 1
Chapter: Turtle Graphics
Lesson: Debugging Turns

Starter Code:
import turtle

t = turtle.Turtle()

t.forward(100)
t.left(90)  # BUG: Should turn right, not left!
t.forward(100)

t.hideturtle()

Solution Code:
import turtle

t = turtle.Turtle()

t.forward(100)
t.right(90)  # FIXED: Changed left to right
t.forward(100)

t.hideturtle()
```

---

### Unit 2: Loops

#### Problem 5: Class Practice - Basic Loop
```
Title: Repeat with a Loop
Description: Use a for loop to make the turtle move forward 50 pixels, 4 times.
Category: Turtle - Loops
Problem Type: Class Practice
Difficulty: Medium
Unit: Unit 2
Chapter: Turtle Graphics
Lesson: For Loops

Starter Code:
import turtle

t = turtle.Turtle()

# Use a for loop to repeat 4 times
# Each time: move forward 50 pixels


t.hideturtle()

Solution Code:
import turtle

t = turtle.Turtle()

for i in range(4):
    t.forward(50)

t.hideturtle()
```

#### Problem 6: Debugging - Loop Error
```
Title: Fix the Loop Bug
Description: This code should draw a square, but there's a bug in the loop. Find and fix it!
Category: Turtle - Loops
Problem Type: Debugging
Difficulty: Medium
Unit: Unit 2
Chapter: Turtle Graphics
Lesson: Debugging Loops

Starter Code:
import turtle

t = turtle.Turtle()

# BUG: Something is wrong with this loop
for i in range(3):  # Should be 4 times for a square!
    t.forward(100)
    t.right(90)

t.hideturtle()

Solution Code:
import turtle

t = turtle.Turtle()

for i in range(4):  # FIXED: Changed from 3 to 4
    t.forward(100)
    t.right(90)

t.hideturtle()
```

---

## Micro:bit Problem Template

### Unit 1: LED Display

#### Problem 1: Class Practice - Show Heart
```
Title: Display a Heart
Description: Make the micro:bit display a heart image.
Category: Micro:bit - LED Display
Problem Type: Class Practice
Difficulty: Easy
Unit: Unit 1
Chapter: Micro:bit
Lesson: Images
Assignment Type: microbit

Starter Code:
from microbit import *

# Your code here - show a heart


Solution Code:
from microbit import *

display.show(Image.HEART)


Learning Objectives:
- Understand how to display images
- Learn the display.show() function
- Recognize built-in images

Materials Needed:
- Micro:bit
- USB cable
- Computer
```

#### Problem 2: Debugging - Image Not Showing
```
Title: Fix the Display Bug
Description: The code should show a happy face, but nothing appears. Find and fix the bug!
Category: Micro:bit - LED Display
Problem Type: Debugging
Difficulty: Easy
Unit: Unit 1
Chapter: Micro:bit
Lesson: Debugging Display

Starter Code:
from microbit import *

# BUG: The image name is wrong
display.show(Image.HAPY)  # Spelling error!


Solution Code:
from microbit import *

display.show(Image.HAPPY)  # FIXED: Correct spelling
```

---

## Quiz Question Template

Each skill should have **3-5 quiz questions** that test understanding of the concepts.

### Quiz Question Format:
```
Skill Category: [e.g., "Turtle - First Steps"]
Question Text: [The question]
Choice A: [First option]
Choice B: [Second option]
Choice C: [Third option]
Choice D: [Fourth option]
Correct Answer: [A, B, C, or D]
Explanation: [Why the correct answer is right]
Concept Tags: [comma-separated tags]
```

### Example Quiz Questions for Turtle - First Steps:

**Question 1:**
```
Skill Category: Turtle - First Steps
Question Text: What does the forward(100) command do in turtle graphics?
Choice A: Moves the turtle backward 100 pixels
Choice B: Moves the turtle forward 100 pixels
Choice C: Turns the turtle 100 degrees
Choice D: Changes the turtle size to 100
Correct Answer: B
Explanation: The forward() command moves the turtle in the direction it is facing. The number in parentheses specifies the distance in pixels.
Concept Tags: forward(), movement, pixels
```

**Question 2:**
```
Skill Category: Turtle - First Steps
Question Text: Which command turns the turtle 90 degrees to the right?
Choice A: turn(90)
Choice B: rotate(90)
Choice C: right(90)
Choice D: clockwise(90)
Correct Answer: C
Explanation: right() turns the turtle clockwise by the specified number of degrees.
Concept Tags: right(), turning, degrees
```

---

## How to Add Problems

### Via the Web Interface:
1. Go to **Library** from the Teacher Dashboard
2. Click **Add to Library** button
3. Select the appropriate **Assignment Type** (Code, Turtle, or Micro:bit)
4. Fill in all fields following the templates above
5. Set the **Problem Type** (Class Practice, Paired Programming, Independent Practice, or Debugging)

### Via the Skill Quiz Manager:
1. Go to **Skill Quiz** from the Teacher Dashboard
2. Click **Add Question** button
3. Select the **Skill Category**
4. Enter the question and all four choices
5. Select the **Correct Answer**
6. Add an **Explanation** (shown after students answer)
7. Add **Concept Tags** for organization

---

## Curriculum Structure

### Turtle Graphics Curriculum
| Unit | Topics | Problems Required |
|------|--------|------------------|
| Unit 1 | First Steps | 16 problems |
| Unit 2 | Loops | 16 problems |
| Unit 3 | Colors & Pen | 16 problems |
| Unit 4 | Conditionals | 16 problems |
| Unit 5 | Functions | 16 problems |

### Micro:bit Curriculum
| Unit | Topics | Problems Required |
|------|--------|------------------|
| Unit 1 | LED Display | 16 problems |
| Unit 2 | Buttons & Input | 16 problems |
| Unit 3 | Sensors | 16 problems |
| Unit 4 | External Components | 16 problems |

### Block-Based Curriculum
| Unit | Topics | Problems Required |
|------|--------|------------------|
| Unit 1 | Output & Print | 16 problems |
| Unit 2 | Variables | 16 problems |
| Unit 3 | Loops | 16 problems |
| Unit 4 | Conditionals | 16 problems |
