import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Play, 
  RotateCcw,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Cpu,
  Lightbulb,
  BookOpen,
  HelpCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  FileText,
  Target,
  Users
} from "lucide-react";
import Editor from "@monaco-editor/react";
import MicrobitSimulator from "@/components/MicrobitSimulator";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

// Curriculum-aligned teaching content matching the seeded problems
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
          "Show the physical Micro:bit and point out each component",
          "Explain the LED matrix (5x5 = 25 LEDs)",
          "Demonstrate buttons A and B",
          "Mention built-in sensors: accelerometer, compass, temperature",
          "Explain how to connect via USB"
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
          "Open the MicroPython editor",
          "Explain 'from microbit import *'",
          "Introduce display.show() function",
          "Show built-in Image.HEART, Image.HAPPY, etc.",
          "Demonstrate display.scroll() for text"
        ],
        demoCode: `from microbit import *

# Show a heart on the LED display
display.show(Image.HEART)`,
        concepts: ["display.show()", "Image.HEART", "import statement"],
        quiz: [
          { question: "What function displays an image on the LEDs?", options: ["print()", "display.show()", "led.on()", "screen.draw()"], correct: 1 },
          { question: "What is Image.HEART?", options: ["A text string", "A built-in image", "A number", "A function"], correct: 1 },
          { question: "What does 'from microbit import *' do?", options: ["Deletes code", "Imports Micro:bit tools", "Prints text", "Stops the program"], correct: 1 },
          { question: "Which function scrolls text across the display?", options: ["display.print()", "display.scroll()", "display.write()", "display.move()"], correct: 1 }
        ]
      },
      "lesson3": {
        title: "Lesson 3: Animations",
        type: "code",
        description: "Create animations by displaying images in a loop with delays.",
        teachingGuide: [
          "Explain while True: for infinite loops",
          "Introduce sleep() for timing",
          "Show multiple images in sequence",
          "Demonstrate Image.HEART and Image.HEART_SMALL",
          "Let students create their own animations"
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
          "Explain button_a and button_b objects",
          "Difference between is_pressed() and was_pressed()",
          "Use if statements to check buttons",
          "Show elif for multiple conditions",
          "Demonstrate checking both buttons with 'and'"
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
          { question: "How do you check if BOTH buttons are pressed?", options: ["button_a or button_b", "button_a + button_b", "button_a and button_b", "buttons.both()"], correct: 2 },
          { question: "What keyword handles 'otherwise' in Python?", options: ["otherwise", "else", "default", "other"], correct: 1 }
        ]
      },
      "lesson5": {
        title: "Lesson 5: Button Counter",
        type: "code",
        description: "Create counters and track button presses using variables.",
        teachingGuide: [
          "Introduce variables for storing data",
          "Show count = 0 initialization",
          "Explain count = count + 1",
          "Use was_pressed() for counting clicks",
          "Add reset functionality with button B"
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
          "Import random module",
          "Explain random.randint(1, 3)",
          "Show accelerometer gesture detection",
          "Use was_gesture('shake')",
          "Map numbers to R, P, S choices"
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
          { question: "What does random.choice(['R','P','S']) do?", options: ["Picks a random item from the list", "Sorts the list", "Counts the items", "Removes an item"], correct: 0 }
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
          "Explain X, Y, Z axes",
          "Show accelerometer.get_x(), get_y(), get_z()",
          "Demonstrate tilt values (-1023 to 1023)",
          "Use is_gesture() and was_gesture()",
          "Create a spirit level or tilt game"
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
          { question: "What axis detects forward/backward tilt?", options: ["X axis", "Y axis", "Z axis", "W axis"], correct: 1 }
        ]
      },
      "lesson8": {
        title: "Lesson 8: Step Counter",
        type: "code",
        description: "Build a pedometer using shake detection to count steps.",
        teachingGuide: [
          "Review shake gesture detection",
          "Use a variable to count steps",
          "Display count on button press",
          "Add reset functionality",
          "Discuss real-world fitness trackers"
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
          "Explain compass.calibrate() first",
          "Show compass.heading() returns 0-359",
          "Map heading to N, E, S, W",
          "Create a compass arrow display",
          "Discuss real navigation uses"
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
          "Explain digital output (HIGH/LOW)",
          "Show pin0.write_digital(1) and (0)",
          "Demonstrate LED circuit with resistor",
          "Create blink pattern",
          "Introduce analog output for brightness"
        ],
        demoCode: `from microbit import *

while True:
    pin0.write_digital(1)  # LED ON
    sleep(500)
    pin0.write_digital(0)  # LED OFF
    sleep(500)`,
        concepts: ["write_digital()", "GPIO pins", "LED circuits"],
        wiring: "Connect LED long leg to Pin 0, short leg through 220Ω resistor to GND",
        quiz: [
          { question: "What does pin0.write_digital(1) do?", options: ["Reads pin 0", "Sets pin 0 HIGH (on)", "Sets pin 0 LOW (off)", "Deletes pin 0"], correct: 1 },
          { question: "Why do we need a resistor with an LED?", options: ["To make it brighter", "To limit current and protect the LED", "For decoration", "Not needed"], correct: 1 },
          { question: "What does write_analog() do differently?", options: ["Same as digital", "Controls brightness 0-1023", "Only works with buttons", "Reads values"], correct: 1 },
          { question: "Which pin connections are available?", options: ["Only pin 0", "Pins 0, 1, 2, 3V, GND", "Pins A and B", "No pins"], correct: 1 }
        ]
      },
      "lesson11": {
        title: "Lesson 11: Traffic Light",
        type: "code",
        description: "Build a traffic light using multiple LEDs on different pins.",
        teachingGuide: [
          "Use 3 LEDs on pins 0, 1, 2",
          "Create red, yellow, green sequence",
          "Add timing for realistic behavior",
          "Implement pedestrian crossing button",
          "Discuss real traffic light systems"
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
        wiring: "Red LED → Pin 0, Yellow LED → Pin 1, Green LED → Pin 2 (each with 220Ω resistor to GND)",
        quiz: [
          { question: "How many pins do you need for a 3-color traffic light?", options: ["1", "2", "3", "4"], correct: 2 },
          { question: "What order do traffic lights go?", options: ["Green, Yellow, Red", "Red, Yellow, Green", "Red, Green, Yellow", "Green, Red, Yellow"], correct: 1 },
          { question: "How long should yellow typically last?", options: ["5 seconds", "1-2 seconds", "10 seconds", "Same as green"], correct: 1 },
          { question: "What's the purpose of the yellow light?", options: ["Decoration", "Warning to prepare to stop/go", "Save electricity", "Nothing"], correct: 1 }
        ]
      },
      "lesson12": {
        title: "Lesson 12: Night Light",
        type: "code",
        description: "Create an automatic night light using a light sensor.",
        teachingGuide: [
          "Explain analog input with read_analog()",
          "Show LDR (light dependent resistor) circuit",
          "Read values 0-1023 based on brightness",
          "Use threshold to trigger LED",
          "Add adjustable sensitivity"
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
        wiring: "LDR between 3V and Pin 1, 10kΩ resistor between Pin 1 and GND. LED on Pin 0.",
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

export default function MicrobitTeaching({ user }) {
  const navigate = useNavigate();
  const [selectedUnit, setSelectedUnit] = useState("unit1");
  const [selectedLesson, setSelectedLesson] = useState("lesson1");
  const [code, setCode] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    <div className={`min-h-screen bg-gray-900 text-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${currentUnit?.color || 'from-cyan-600 to-blue-600'} py-3 px-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/microbit")}
              className="text-white hover:bg-white/20"
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
              <SelectTrigger className="w-48 bg-white/10 border-white/30 text-white">
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
              <SelectTrigger className="w-52 bg-white/10 border-white/30 text-white">
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
              className="bg-white/20 hover:bg-white/30"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open Editor
            </Button>

            <Button
              onClick={() => navigate("/library?type=microbit")}
              size="sm"
              className="bg-white/20 hover:bg-white/30"
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
                    Teaching Steps:
                  </h4>
                  <ol className="space-y-2">
                    {currentLesson?.teachingGuide?.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-300">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
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
                <CardDescription className="text-gray-400">
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
                        
                        let bgColor = "bg-gray-800 hover:bg-gray-700";
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
                        <span className="text-gray-400 ml-2">
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
                      <p className="text-gray-400">
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
