import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  RotateCcw,
  Monitor,
  Download,
  Cpu,
  Lightbulb,
  BookOpen,
  HelpCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  FileText,
  Target,
  Users,
  ChevronDown,
  ChevronRight,
  Info
} from "lucide-react";
import Editor from "@monaco-editor/react";
import MicrobitSimulator from "@/components/MicrobitSimulator";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

// Curriculum-aligned teaching content with clickable explanations
const CURRICULUM = {
  "unit1": {
    title: "Unit 1: Getting Started",
    icon: "🚀",
    color: "from-blue-500 to-cyan-500",
    lessons: {
      "lesson1": {
        title: "Lesson 1: What is Micro:bit?",
        type: "quiz",
        description: "Introduction to the BBC Micro:bit - components, features, and capabilities.",
        teachingGuide: [
          { step: "Show the physical Micro:bit and point out each component", tip: "Hold up the Micro:bit. Front: LED matrix, buttons A & B. Back: processor, battery connector, USB port, reset button." },
          { step: "Explain the LED matrix (5x5 = 25 LEDs)", tip: "25 tiny red lights arranged in a grid. Each can be turned on/off or dimmed. Used to display images, text, and animations." },
          { step: "Demonstrate buttons A and B", tip: "A is on the left, B is on the right. Press them to show students how input works. Programs can detect single press, hold, or both buttons together." },
          { step: "Mention built-in sensors: accelerometer, compass, temperature", tip: "Accelerometer = detects tilt and shake. Compass = detects direction. Temperature = measures how hot/cold it is. All built-in, no wiring needed!" },
          { step: "Explain how to connect via USB", tip: "Plug USB cable into computer and Micro:bit. It shows up as a drive called 'MICROBIT'. Drag .hex files to it to upload programs." }
        ],
        quiz: [
          { question: "What is the grid of lights on the front of the Micro:bit called?", options: ["LED Matrix", "Touch Screen", "Solar Panel", "Camera"], correct: 0 },
          { question: "How many LEDs are on the Micro:bit display?", options: ["10", "25", "50", "100"], correct: 1 },
          { question: "What are buttons A and B used for?", options: ["Charging the battery", "User input", "Turning it off", "Taking photos"], correct: 1 },
          { question: "Which sensor detects motion and tilt?", options: ["Thermometer", "Accelerometer", "Barometer", "Microphone"], correct: 1 },
          { question: "How do you connect the Micro:bit to a computer?", options: ["WiFi", "Bluetooth only", "USB cable", "HDMI"], correct: 2 }
        ]
      },
      "lesson2": {
        title: "Lesson 2: Display Heart",
        type: "code",
        description: "Your first program! Display images on the LED screen.",
        teachingGuide: [
          { step: "Open the MicroPython editor", tip: "Go to python.microbit.org in a web browser. Click 'Create' to start a new project. This is where we write code." },
          { step: "Explain 'from microbit import *'", tip: "This line loads all Micro:bit tools. The * means 'everything'. Without this line, nothing will work. Always put it at the top!" },
          { step: "Introduce display.show() function", tip: "display.show() puts something on the LED screen. Put what you want to show inside the parentheses. Can show images, numbers, or single letters." },
          { step: "Show built-in Image.HEART, Image.HAPPY, etc.", tip: "Python has ready-made images! Type Image. and see the list: HEART, HAPPY, SAD, ANGRY, DUCK, HOUSE, and many more. Saves time drawing!" },
          { step: "Demonstrate display.scroll() for text", tip: "scroll() makes text move across the screen. Great for longer messages: display.scroll('Hello World'). Text goes left to right automatically." }
        ],
        demoCode: `from microbit import *

# Show a heart on the LED display
display.show(Image.HEART)`,
        concepts: ["display.show()", "Image.HEART", "import statement"],
        quiz: [
          { question: "What function displays an image on the LEDs?", options: ["print()", "display.show()", "led.on()", "screen.draw()"], correct: 1 },
          { question: "What is Image.HEART?", options: ["A text string", "A built-in image", "A number", "A function"], correct: 1 },
          { question: "Which function scrolls text across the display?", options: ["display.print()", "display.scroll()", "display.write()", "display.move()"], correct: 1 },
          { question: "What must you import to use Micro:bit?", options: ["import microbit", "from microbit import *", "include microbit", "require microbit"], correct: 1 }
        ]
      },
      "lesson3": {
        title: "Lesson 3: Animations",
        type: "code",
        description: "Create animations by displaying images in a loop with delays.",
        teachingGuide: [
          { step: "Explain while True: for infinite loops", tip: "while True: means 'keep doing this forever'. The code inside (indented) repeats non-stop. Used for programs that should keep running." },
          { step: "Introduce sleep() for timing", tip: "sleep(500) pauses for 500 milliseconds (half a second). 1000 = 1 second. Without sleep, animations happen too fast to see!" },
          { step: "Show multiple images in sequence", tip: "Put several display.show() commands one after another. Add sleep() between them. The Micro:bit shows each image in order." },
          { step: "Demonstrate Image.HEART and Image.HEART_SMALL", tip: "HEART is a big heart, HEART_SMALL is smaller. Switching between them creates a 'beating' effect. Great first animation!" },
          { step: "Let students create their own animations", tip: "Challenge: Try HAPPY/SAD, or clock faces (CLOCK12, CLOCK3, CLOCK6, CLOCK9). What other animations can they make?" }
        ],
        demoCode: `from microbit import *

while True:
    display.show(Image.HEART)
    sleep(500)
    display.show(Image.HEART_SMALL)
    sleep(500)`,
        concepts: ["while True:", "sleep()", "animation loop"],
        quiz: [
          { question: "What does 'while True:' do?", options: ["Runs once", "Runs forever", "Stops the program", "Nothing"], correct: 1 },
          { question: "What does sleep(500) do?", options: ["Waits 500 seconds", "Waits 500 milliseconds", "Sleeps forever", "Turns off LEDs"], correct: 1 },
          { question: "What unit does sleep() use?", options: ["Seconds", "Minutes", "Milliseconds", "Hours"], correct: 2 },
          { question: "How do you make an animation faster?", options: ["Use bigger sleep values", "Use smaller sleep values", "Remove the loop", "Add more images"], correct: 1 }
        ]
      }
    }
  },
  "unit2": {
    title: "Unit 2: Buttons & Input",
    icon: "🔘",
    color: "from-green-500 to-emerald-500",
    lessons: {
      "lesson4": {
        title: "Lesson 4: Button Basics",
        type: "code",
        description: "Detect button presses and respond with different actions.",
        teachingGuide: [
          { step: "Explain button_a and button_b objects", tip: "button_a is the left button, button_b is the right button. They're objects in Python that let us check if someone pressed them." },
          { step: "Difference between is_pressed() and was_pressed()", tip: "is_pressed() = Is the button being held RIGHT NOW? Returns True while held. was_pressed() = Was it pressed SINCE last check? Returns True once per click." },
          { step: "Use if statements to check buttons", tip: "if button_a.is_pressed(): runs code only when A is held. The colon and indent are required! Code runs only when condition is True." },
          { step: "Show elif for multiple conditions", tip: "elif = 'else if'. Check another condition if the first was False. if A... elif B... else... Only ONE block runs." },
          { step: "Demonstrate checking both buttons with 'and'", tip: "if button_a.is_pressed() and button_b.is_pressed(): checks if BOTH are pressed at the same time. Great for 'secret' actions!" }
        ],
        demoCode: `from microbit import *

while True:
    if button_a.is_pressed():
        display.show(Image.HAPPY)
    elif button_b.is_pressed():
        display.show(Image.SAD)
    else:
        display.clear()`,
        concepts: ["button_a", "button_b", "is_pressed()", "if/elif/else"],
        quiz: [
          { question: "What checks if button A is currently being held?", options: ["button_a.click()", "button_a.is_pressed()", "button_a.pressed", "a.check()"], correct: 1 },
          { question: "What is the difference between is_pressed() and was_pressed()?", options: ["No difference", "is_pressed checks now, was_pressed checks past", "was_pressed is faster", "is_pressed is broken"], correct: 1 },
          { question: "How do you check if BOTH buttons are pressed?", options: ["button_a or button_b", "button_a + button_b", "button_a.is_pressed() and button_b.is_pressed()", "buttons.both()"], correct: 2 },
          { question: "What keyword handles 'otherwise' in Python?", options: ["otherwise", "else", "default", "other"], correct: 1 }
        ]
      },
      "lesson5": {
        title: "Lesson 5: Button Counter",
        type: "code",
        description: "Create counters and track button presses using variables.",
        teachingGuide: [
          { step: "Introduce variables for storing data", tip: "A variable is a named box that holds a value. count = 0 creates a box named 'count' with 0 inside. The value can change." },
          { step: "Show count = 0 initialization", tip: "We start at 0 before the loop. If we put it inside the loop, it would reset to 0 every time! Put it BEFORE while True:" },
          { step: "Explain count = count + 1", tip: "Take the current value of count, add 1, and store it back. This is how we increment. Can also write: count += 1 (same thing)." },
          { step: "Use was_pressed() for counting clicks", tip: "was_pressed() is better for counting because it only returns True once per click. is_pressed() would count many times while held!" },
          { step: "Add reset functionality with button B", tip: "Check if button B was pressed, then set count = 0. Now students have +1 with A and reset with B. Useful pattern!" }
        ],
        demoCode: `from microbit import *

count = 0

while True:
    if button_a.was_pressed():
        count = count + 1
    if button_b.was_pressed():
        count = 0
    display.show(count)`,
        concepts: ["variables", "counter", "was_pressed()"],
        quiz: [
          { question: "What does 'count = 0' do?", options: ["Displays 0", "Creates a variable with value 0", "Deletes count", "Checks if count is 0"], correct: 1 },
          { question: "How do you add 1 to count?", options: ["count++", "count = count + 1", "add(count, 1)", "count.increase()"], correct: 1 },
          { question: "Why use was_pressed() instead of is_pressed() for counting?", options: ["It's faster", "It counts once per click", "It's newer", "No reason"], correct: 1 },
          { question: "What does count = 0 do after pressing B?", options: ["Adds 0", "Resets the counter", "Does nothing", "Ends program"], correct: 1 }
        ]
      },
      "lesson6": {
        title: "Lesson 6: RPS Game",
        type: "code",
        description: "Create a Rock Paper Scissors game using random numbers and shake detection.",
        teachingGuide: [
          { step: "Import random module", tip: "Add 'import random' at the top. This gives us tools to make random choices. Like rolling dice in code!" },
          { step: "Explain random.randint(1, 3)", tip: "randint(1, 3) picks a random whole number: 1, 2, or 3. Each number can represent rock, paper, or scissors." },
          { step: "Show accelerometer gesture detection", tip: "The accelerometer can detect movements called 'gestures': shake, tilt left, tilt right, face up, face down, freefall, etc." },
          { step: "Use was_gesture('shake')", tip: "accelerometer.was_gesture('shake') returns True if shaken since last check. Perfect for 'shake to play' games!" },
          { step: "Map numbers to R, P, S choices", tip: "Use if/elif: 0='R', 1='P', 2='S'. Or use a list: choices=['R','P','S'] then choices[random_number]." }
        ],
        demoCode: `from microbit import *
import random

while True:
    if accelerometer.was_gesture('shake'):
        choice = random.randint(0, 2)
        if choice == 0:
            display.show('R')
        elif choice == 1:
            display.show('P')
        else:
            display.show('S')`,
        concepts: ["import random", "random.randint()", "was_gesture('shake')"],
        quiz: [
          { question: "How do you get a random number between 1 and 6?", options: ["random(1,6)", "random.randint(1, 6)", "randint(1-6)", "random.number(1,6)"], correct: 1 },
          { question: "What detects when you shake the Micro:bit?", options: ["button_a", "accelerometer", "compass", "display"], correct: 1 },
          { question: "What does 'import random' do?", options: ["Creates random images", "Adds random number tools", "Makes random sounds", "Shuffles the code"], correct: 1 },
          { question: "What gesture name detects shaking?", options: ["move", "shake", "tilt", "vibrate"], correct: 1 }
        ]
      }
    }
  },
  "unit3": {
    title: "Unit 3: Sensors",
    icon: "📡",
    color: "from-orange-500 to-red-500",
    lessons: {
      "lesson7": {
        title: "Lesson 7: Accelerometer",
        type: "code",
        description: "Detect tilt, motion, and gestures using the accelerometer.",
        teachingGuide: [
          { step: "Explain X, Y, Z axes", tip: "X = left/right tilt. Y = forward/backward tilt. Z = up/down (gravity). Hold Micro:bit flat: X=0, Y=0, Z=-1024." },
          { step: "Show accelerometer.get_x(), get_y(), get_z()", tip: "These return numbers from -1023 to 1023. Tilt left = negative X. Tilt right = positive X. Flat = near zero." },
          { step: "Demonstrate tilt values (-1023 to 1023)", tip: "Flat = around 0. Fully tilted = around ±1000. Use thresholds like >200 or <-200 to detect 'definitely tilted'." },
          { step: "Use is_gesture() and was_gesture()", tip: "Built-in gestures: 'shake', 'up', 'down', 'left', 'right', 'face up', 'face down'. Easier than checking raw numbers!" },
          { step: "Create a spirit level or tilt game", tip: "Show different arrows based on tilt direction. Or move a dot on screen by tilting - like a marble maze!" }
        ],
        demoCode: `from microbit import *

while True:
    x = accelerometer.get_x()
    if x < -200:
        display.show('<')
    elif x > 200:
        display.show('>')
    else:
        display.show('-')`,
        concepts: ["accelerometer.get_x()", "tilt values", "gesture detection"],
        quiz: [
          { question: "What does accelerometer.get_x() return?", options: ["A letter", "A tilt value", "An image", "A button state"], correct: 1 },
          { question: "What range do accelerometer values span?", options: ["0 to 100", "-1023 to 1023", "0 to 255", "-10 to 10"], correct: 1 },
          { question: "Which gesture detects shaking?", options: ["'tilt'", "'shake'", "'move'", "'vibrate'"], correct: 1 },
          { question: "What axis detects left/right tilt?", options: ["X axis", "Y axis", "Z axis", "W axis"], correct: 0 }
        ]
      },
      "lesson8": {
        title: "Lesson 8: Step Counter",
        type: "code",
        description: "Build a pedometer using shake detection to count steps.",
        teachingGuide: [
          { step: "Review shake gesture detection", tip: "Each step creates a small 'shake' motion. was_gesture('shake') can detect this. Not perfect, but works for learning!" },
          { step: "Use a variable to count steps", tip: "steps = 0 before the loop. Inside: if shake detected, steps += 1. Same pattern as the button counter!" },
          { step: "Display count on button press", tip: "Don't constantly scroll the number (too slow). Instead: press A to see your count. Use display.scroll(steps)." },
          { step: "Add reset functionality", tip: "Button B sets steps = 0. Show a checkmark or 'YES' image to confirm reset. Same pattern as counter lesson!" },
          { step: "Discuss real-world fitness trackers", tip: "Real devices use more advanced algorithms and additional sensors. But the basic idea is the same - detect motion, count it!" }
        ],
        demoCode: `from microbit import *

steps = 0

while True:
    if accelerometer.was_gesture('shake'):
        steps += 1
    if button_a.was_pressed():
        display.scroll(steps)
    if button_b.was_pressed():
        steps = 0
        display.show(Image.YES)`,
        concepts: ["step counting", "was_gesture()", "fitness tracking"],
        quiz: [
          { question: "What does steps += 1 mean?", options: ["steps = steps + 1", "steps = 1", "steps = steps - 1", "Add steps to 1"], correct: 0 },
          { question: "Why use button_a to show count instead of always displaying?", options: ["Saves battery", "Prevents scrolling constantly", "Both A and B", "Neither"], correct: 2 },
          { question: "How would you estimate distance from steps?", options: ["steps * stride_length", "steps / 100", "steps + distance", "Can't be done"], correct: 0 },
          { question: "What happens when you reset steps to 0?", options: ["Program stops", "Counter starts over", "Display breaks", "Nothing"], correct: 1 }
        ]
      },
      "lesson9": {
        title: "Lesson 9: Compass",
        type: "code",
        description: "Use the built-in compass to find direction and heading.",
        teachingGuide: [
          { step: "Explain compass.calibrate() first", tip: "Must calibrate before use! A game appears - tilt to light up all LEDs. This teaches the compass about its surroundings. Takes 30 seconds." },
          { step: "Show compass.heading() returns 0-359", tip: "Returns degrees like a real compass. 0° = North, 90° = East, 180° = South, 270° = West. Full circle = 360°." },
          { step: "Map heading to N, E, S, W", tip: "Use ranges: 315-45 = N, 45-135 = E, 135-225 = S, 225-315 = W. The 'or' handles the wrap-around at North." },
          { step: "Create a compass arrow display", tip: "Show Image.ARROW_N when pointing North, ARROW_E for East, etc. The arrow 'points' to North as you turn!" },
          { step: "Discuss real navigation uses", tip: "Ships, planes, and phones use digital compasses. Combined with maps and GPS for navigation. Same basic principle!" }
        ],
        demoCode: `from microbit import *

compass.calibrate()

while True:
    heading = compass.heading()
    if heading < 45 or heading > 315:
        display.show('N')
    elif heading < 135:
        display.show('E')
    elif heading < 225:
        display.show('S')
    else:
        display.show('W')`,
        concepts: ["compass.calibrate()", "compass.heading()", "directions"],
        quiz: [
          { question: "Why must you calibrate the compass first?", options: ["To turn it on", "To improve accuracy", "To change language", "Not required"], correct: 1 },
          { question: "What range does compass.heading() return?", options: ["0 to 100", "0 to 359", "-180 to 180", "N, E, S, W"], correct: 1 },
          { question: "What heading is North?", options: ["0 or 360", "90", "180", "270"], correct: 0 },
          { question: "What heading is East?", options: ["0", "90", "180", "270"], correct: 1 }
        ]
      }
    }
  },
  "unit4": {
    title: "Unit 4: External Components",
    icon: "💡",
    color: "from-purple-500 to-pink-500",
    lessons: {
      "lesson10": {
        title: "Lesson 10: External LED",
        type: "code",
        description: "Connect and control external LEDs using GPIO pins.",
        teachingGuide: [
          { step: "Explain digital output (HIGH/LOW)", tip: "Digital = only two states: ON (HIGH/1) or OFF (LOW/0). Like a light switch. 3.3 volts when HIGH, 0 volts when LOW." },
          { step: "Show pin0.write_digital(1) and (0)", tip: "write_digital(1) = turn pin ON (3.3V). write_digital(0) = turn pin OFF (0V). Pin stays in that state until you change it." },
          { step: "Demonstrate LED circuit with resistor", tip: "LED needs a resistor (220Ω) or it burns out! Current flows: Pin → LED → Resistor → GND. Never skip the resistor!" },
          { step: "Create blink pattern", tip: "On, sleep, off, sleep, repeat. Classic first electronics project! Try different sleep times for different blink speeds." },
          { step: "Introduce analog output for brightness", tip: "write_analog(512) = 50% brightness. Range: 0-1023. Creates PWM (flickers super fast). Lets you dim the LED!" }
        ],
        demoCode: `from microbit import *

while True:
    pin0.write_digital(1)  # LED ON
    sleep(500)
    pin0.write_digital(0)  # LED OFF
    sleep(500)`,
        concepts: ["write_digital()", "GPIO pins", "LED circuits"],
        wiring: "Connect LED long leg (+) to Pin 0. Connect short leg (-) through 220Ω resistor to GND.",
        quiz: [
          { question: "What does pin0.write_digital(1) do?", options: ["Reads pin 0", "Sets pin 0 HIGH (on)", "Sets pin 0 LOW (off)", "Deletes pin 0"], correct: 1 },
          { question: "Why do we need a resistor with an LED?", options: ["To make it brighter", "To limit current and protect the LED", "For decoration", "Not needed"], correct: 1 },
          { question: "What does write_analog() do differently?", options: ["Same as digital", "Controls brightness 0-1023", "Only works with buttons", "Reads values"], correct: 1 },
          { question: "What value turns a digital pin off?", options: ["0", "1", "OFF", "LOW"], correct: 0 }
        ]
      },
      "lesson11": {
        title: "Lesson 11: Traffic Light",
        type: "code",
        description: "Build a traffic light using multiple LEDs on different pins.",
        teachingGuide: [
          { step: "Use 3 LEDs on pins 0, 1, 2", tip: "Pin 0 = Red, Pin 1 = Yellow, Pin 2 = Green. Each needs its own resistor! Use the big pins with crocodile clips." },
          { step: "Create red, yellow, green sequence", tip: "Real traffic lights: Red (stop) → Red+Yellow (get ready) → Green (go) → Yellow (slow down) → Red. Or simplified version." },
          { step: "Add timing for realistic behavior", tip: "Red: 3000ms, Yellow: 1000ms, Green: 3000ms. Real lights use longer times but this works for demo!" },
          { step: "Implement pedestrian crossing button", tip: "Press button A = request crossing. After delay, light changes to red for cars. Then back to green. Real crossings work similarly!" },
          { step: "Discuss real traffic light systems", tip: "Real systems have sensors, timers, and computers. They coordinate with nearby lights. Same basic idea, much more complex!" }
        ],
        demoCode: `from microbit import *

# Pin 0 = Red, Pin 1 = Yellow, Pin 2 = Green

while True:
    # Red
    pin0.write_digital(1)
    pin1.write_digital(0)
    pin2.write_digital(0)
    sleep(3000)
    # Yellow
    pin0.write_digital(0)
    pin1.write_digital(1)
    sleep(1000)
    # Green
    pin1.write_digital(0)
    pin2.write_digital(1)
    sleep(3000)
    # Yellow
    pin2.write_digital(0)
    pin1.write_digital(1)
    sleep(1000)`,
        concepts: ["multiple pins", "state machines", "timing"],
        wiring: "Red LED → Pin 0, Yellow LED → Pin 1, Green LED → Pin 2. Each LED needs a 220Ω resistor to GND.",
        quiz: [
          { question: "How many pins do you need for a 3-color traffic light?", options: ["1", "2", "3", "4"], correct: 2 },
          { question: "What order do traffic lights go?", options: ["Green, Yellow, Red", "Red, Yellow, Green, Yellow", "Red, Green, Yellow", "Green, Red, Yellow"], correct: 1 },
          { question: "How long should yellow typically last?", options: ["5 seconds", "1-2 seconds", "10 seconds", "Same as green"], correct: 1 },
          { question: "What's the purpose of the yellow light?", options: ["Decoration", "Warning to prepare to stop/go", "Save electricity", "Nothing"], correct: 1 }
        ]
      },
      "lesson12": {
        title: "Lesson 12: Night Light",
        type: "code",
        description: "Create an automatic night light using a light sensor.",
        teachingGuide: [
          { step: "Explain analog input with read_analog()", tip: "read_analog() reads a voltage and converts to 0-1023. Unlike digital (just 0 or 1), analog gives a range of values." },
          { step: "Show LDR (light dependent resistor) circuit", tip: "LDR = resistance changes with light. Bright = low resistance, Dark = high resistance. Creates a voltage divider with another resistor." },
          { step: "Read values 0-1023 based on brightness", tip: "Bright room = high number (800+). Dark room = low number (under 200). Test YOUR room to find the right threshold!" },
          { step: "Use threshold to trigger LED", tip: "if light < 300: turn on LED. The number 300 is the 'threshold'. Adjust it based on testing in your room!" },
          { step: "Add adjustable sensitivity", tip: "Use buttons to change the threshold. A = increase (less sensitive), B = decrease (more sensitive). Makes it customizable!" }
        ],
        demoCode: `from microbit import *

while True:
    light = pin1.read_analog()
    if light < 300:  # Dark
        pin0.write_digital(1)  # LED on
        display.show(Image.HAPPY)
    else:  # Bright
        pin0.write_digital(0)  # LED off
        display.clear()
    sleep(100)`,
        concepts: ["read_analog()", "light sensor", "threshold"],
        wiring: "LDR: One leg to 3V, other leg to Pin 1. 10kΩ resistor from Pin 1 to GND. LED on Pin 0 with 220Ω to GND.",
        quiz: [
          { question: "What does pin1.read_analog() return?", options: ["True or False", "A value 0-1023", "A string", "An image"], correct: 1 },
          { question: "What is an LDR?", options: ["LED Display Resistor", "Light Dependent Resistor", "Low Data Reader", "Left Direction Reader"], correct: 1 },
          { question: "What happens to the LDR reading when it gets darker?", options: ["Goes up", "Goes down", "Stays same", "Becomes negative"], correct: 1 },
          { question: "What is a threshold in this context?", options: ["A door", "A value that triggers an action", "A type of LED", "A pin number"], correct: 1 }
        ]
      }
    }
  }
};

// Clickable teaching tip component
function TeachingTip({ index, step, tip }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left flex items-start gap-3 p-2 rounded-lg hover:bg-gray-700/50 transition-colors group"
      >
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center text-sm font-bold">
          {index + 1}
        </span>
        <span className="flex-1 text-gray-200 group-hover:text-white">{step}</span>
        <span className="text-cyan-400 opacity-70 group-hover:opacity-100">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <Info className="w-4 h-4" />}
        </span>
      </button>
      {isOpen && (
        <div className="ml-10 mt-1 p-3 bg-cyan-900/30 border-l-2 border-cyan-500 rounded-r-lg text-sm text-cyan-100">
          {tip}
        </div>
      )}
    </div>
  );
}

export default function MicrobitTeaching({ user }) {
  const navigate = useNavigate();
  const [selectedUnit, setSelectedUnit] = useState("unit1");
  const [selectedLesson, setSelectedLesson] = useState("lesson1");
  const [code, setCode] = useState("");
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("teach");
  const editorRef = useRef(null);

  const currentUnit = CURRICULUM[selectedUnit];
  const currentLesson = currentUnit?.lessons[selectedLesson];

  // Initialize code when lesson changes
  useEffect(() => {
    if (currentLesson?.demoCode) {
      setCode(currentLesson.demoCode);
    }
    setShowQuiz(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
  }, [selectedUnit, selectedLesson]);

  const resetCode = () => {
    if (currentLesson?.demoCode) {
      setCode(currentLesson.demoCode);
    }
  };

  const handleQuizAnswer = (qIndex, aIndex) => {
    if (!quizSubmitted) {
      setQuizAnswers({ ...quizAnswers, [qIndex]: aIndex });
    }
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const getQuizScore = () => {
    if (!currentLesson?.quiz) return 0;
    let correct = 0;
    currentLesson.quiz.forEach((q, i) => {
      if (quizAnswers[i] === q.correct) correct++;
    });
    return correct;
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openMicrobitEditor = () => {
    window.open('https://python.microbit.org/v/3', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className={`bg-gradient-to-r ${currentUnit?.color || 'from-cyan-600 to-blue-600'} py-3 px-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/microbit")}
              className="text-white hover:bg-cyber-navy/60/20"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              <span className="font-bold">Teaching Mode</span>
              <span className="opacity-80">| {currentUnit?.icon} {currentUnit?.title}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Unit Selector */}
            <Select value={selectedUnit} onValueChange={(v) => { 
              setSelectedUnit(v); 
              const firstLesson = Object.keys(CURRICULUM[v].lessons)[0];
              setSelectedLesson(firstLesson);
            }}>
              <SelectTrigger className="w-48 bg-cyber-navy/60/10 border-white/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CURRICULUM).map(([key, unit]) => (
                  <SelectItem key={key} value={key}>{unit.icon} {unit.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Lesson Selector */}
            <Select value={selectedLesson} onValueChange={setSelectedLesson}>
              <SelectTrigger className="w-52 bg-cyber-navy/60/10 border-white/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(currentUnit?.lessons || {}).map(([key, lesson]) => (
                  <SelectItem key={key} value={key}>{lesson.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              onClick={openMicrobitEditor}
              size="sm"
              className="bg-cyber-navy/60/20 hover:bg-cyber-navy/60/30"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open Editor
            </Button>

            <Button
              onClick={() => navigate("/library?type=microbit")}
              size="sm"
              className="bg-cyber-navy/60/20 hover:bg-cyber-navy/60/30"
            >
              <FileText className="w-4 h-4 mr-1" />
              View Problems
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="teach" className="data-[state=active]:bg-cyan-600">
              <BookOpen className="w-4 h-4 mr-2" />
              Teaching Guide
            </TabsTrigger>
            <TabsTrigger value="code" className="data-[state=active]:bg-cyan-600">
              <Cpu className="w-4 h-4 mr-2" />
              Demo Code
            </TabsTrigger>
            <TabsTrigger value="quiz" className="data-[state=active]:bg-cyan-600">
              <HelpCircle className="w-4 h-4 mr-2" />
              Quiz ({currentLesson?.quiz?.length || 0} questions)
            </TabsTrigger>
          </TabsList>

          {/* Teaching Guide Tab */}
          <TabsContent value="teach" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lesson Overview */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    {currentLesson?.title}
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    {currentLesson?.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    Teaching Steps
                    <span className="text-xs text-slate-500 font-normal">(click for tips)</span>
                  </h4>
                  <div className="space-y-1">
                    {currentLesson?.teachingGuide?.map((item, i) => (
                      <TeachingTip 
                        key={i} 
                        index={i} 
                        step={typeof item === 'string' ? item : item.step} 
                        tip={typeof item === 'string' ? 'No additional information.' : item.tip} 
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Concepts & Wiring */}
              <div className="space-y-4">
                {currentLesson?.concepts && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-green-400 text-lg">Key Concepts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {currentLesson.concepts.map((concept, i) => (
                          <span key={i} className="px-3 py-1 bg-green-900/50 text-green-300 rounded-full text-sm font-mono">
                            {concept}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {currentLesson?.wiring && (
                  <Card className="bg-gray-800 border-gray-700 border-l-4 border-l-yellow-500">
                    <CardHeader>
                      <CardTitle className="text-yellow-400 text-lg">⚡ Wiring Instructions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300">{currentLesson.wiring}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Student Activity */}
                <Card className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border-cyan-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Student Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-gray-200">
                    Have students complete the practice problems for this lesson. 
                    <Button 
                      onClick={() => navigate("/library?type=microbit")}
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full border-cyan-500 text-cyan-300 hover:bg-cyan-900"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View & Assign Problems
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Demo Code Tab */}
          <TabsContent value="code">
            <ResizablePanelGroup direction="horizontal" className="min-h-[500px] rounded-lg border border-gray-700">
              {/* Code Editor */}
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full flex flex-col bg-gray-800">
                  <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                    <span className="font-medium text-cyan-400">Demo Code</span>
                    <div className="flex gap-2">
                      <Button onClick={resetCode} size="sm" variant="outline" className="bg-gray-700 border-gray-600">
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Reset
                      </Button>
                      <Button onClick={downloadCode} size="sm" variant="outline" className="bg-gray-700 border-gray-600">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <Editor
                      height="100%"
                      defaultLanguage="python"
                      theme="vs-dark"
                      value={code}
                      onChange={setCode}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: "on",
                      }}
                    />
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-gray-700" />

              {/* Simulator */}
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full flex flex-col bg-gray-950">
                  <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                    <span className="font-medium text-cyan-400 flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      Micro:bit Simulator
                    </span>
                    <Button onClick={openMicrobitEditor} size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Run in Editor
                    </Button>
                  </div>
                  <div className="flex-1 flex items-center justify-center p-4">
                    <MicrobitSimulator code={code} />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quiz">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  {currentLesson?.title} - Quiz
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Use these questions to check student understanding. {currentLesson?.quiz?.length || 0} questions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentLesson?.quiz?.map((q, qIndex) => (
                  <div key={qIndex} className="p-4 bg-gray-900 rounded-lg">
                    <p className="font-medium text-white mb-3">
                      {qIndex + 1}. {q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((option, oIndex) => {
                        const isSelected = quizAnswers[qIndex] === oIndex;
                        const isCorrect = oIndex === q.correct;
                        const showResult = quizSubmitted;
                        
                        let bgColor = "bg-gray-800 hover:bg-gray-700 border-gray-600";
                        if (showResult) {
                          if (isCorrect) bgColor = "bg-green-900/50 border-green-500";
                          else if (isSelected && !isCorrect) bgColor = "bg-red-900/50 border-red-500";
                        } else if (isSelected) {
                          bgColor = "bg-cyan-900/50 border-cyan-500";
                        }
                        
                        return (
                          <button
                            key={oIndex}
                            onClick={() => handleQuizAnswer(qIndex, oIndex)}
                            className={`w-full text-left p-3 rounded border ${bgColor} transition-colors flex items-center gap-3`}
                            disabled={quizSubmitted}
                          >
                            <span className="w-6 h-6 rounded-full border flex items-center justify-center text-sm">
                              {String.fromCharCode(65 + oIndex)}
                            </span>
                            <span className="flex-1">{option}</span>
                            {showResult && isCorrect && <CheckCircle className="w-5 h-5 text-green-400" />}
                            {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  {quizSubmitted ? (
                    <>
                      <div className="text-lg">
                        Score: <span className="text-cyan-400 font-bold">{getQuizScore()}/{currentLesson?.quiz?.length || 0}</span>
                        <span className="text-slate-500 ml-2">
                          ({Math.round((getQuizScore() / (currentLesson?.quiz?.length || 1)) * 100)}%)
                        </span>
                      </div>
                      <Button onClick={resetQuiz} className="bg-cyan-600 hover:bg-cyan-700">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-500">
                        Answered: {Object.keys(quizAnswers).length}/{currentLesson?.quiz?.length || 0}
                      </p>
                      <Button 
                        onClick={submitQuiz} 
                        className="bg-cyan-600 hover:bg-cyan-700"
                        disabled={Object.keys(quizAnswers).length !== (currentLesson?.quiz?.length || 0)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submit Quiz
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
