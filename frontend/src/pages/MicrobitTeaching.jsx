import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Play, 
  RotateCcw,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from "lucide-react";
import Editor from "@monaco-editor/react";
import MicrobitSimulator from "@/components/MicrobitSimulator";

// Teaching examples for Micro:bit
const MICROBIT_TEACHING = {
  basics: {
    title: "⚡ First Steps",
    lessons: [
      {
        id: "hello",
        title: "Hello World - Scroll Text",
        description: "display.scroll() scrolls text across the LED screen.",
        code: `from microbit import *

display.scroll("Hello!")`,
        concepts: ["display.scroll()", "text output"]
      },
      {
        id: "images",
        title: "Showing Images",
        description: "display.show() displays built-in images like HEART, HAPPY, SAD.",
        code: `from microbit import *

display.show(Image.HEART)`,
        concepts: ["display.show()", "Image.HEART", "built-in images"]
      },
      {
        id: "animation",
        title: "Simple Animation",
        description: "Use sleep() to pause between images for animation.",
        code: `from microbit import *

while True:
    display.show(Image.HEART)
    sleep(500)
    display.show(Image.HEART_SMALL)
    sleep(500)`,
        concepts: ["sleep()", "animation", "while True"]
      },
      {
        id: "pixels",
        title: "Individual Pixels",
        description: "set_pixel(x, y, brightness) controls one LED. x,y from 0-4, brightness 0-9.",
        code: `from microbit import *

display.clear()
display.set_pixel(2, 2, 9)  # Center pixel, full brightness
display.set_pixel(0, 0, 5)  # Top-left, half brightness
display.set_pixel(4, 4, 9)  # Bottom-right`,
        concepts: ["set_pixel()", "coordinates", "brightness"]
      }
    ]
  },
  buttons: {
    title: "🔘 Buttons",
    lessons: [
      {
        id: "button_a",
        title: "Button A Press",
        description: "button_a.is_pressed() returns True while button A is held down.",
        code: `from microbit import *

while True:
    if button_a.is_pressed():
        display.show(Image.HAPPY)
    else:
        display.clear()`,
        concepts: ["button_a", "is_pressed()", "if statement"]
      },
      {
        id: "both_buttons",
        title: "Both Buttons",
        description: "Check both buttons to respond differently to each.",
        code: `from microbit import *

while True:
    if button_a.is_pressed():
        display.show(Image.HAPPY)
    elif button_b.is_pressed():
        display.show(Image.SAD)
    else:
        display.show(Image.ASLEEP)`,
        concepts: ["button_b", "elif", "multiple conditions"]
      },
      {
        id: "was_pressed",
        title: "Counting Presses",
        description: "was_pressed() returns True once per press. Great for counting!",
        code: `from microbit import *

count = 0

while True:
    if button_a.was_pressed():
        count = count + 1
        display.show(count)`,
        concepts: ["was_pressed()", "counting", "variables"]
      },
      {
        id: "both_at_once",
        title: "Both Buttons Together",
        description: "Check if both buttons are pressed at the same time with 'and'.",
        code: `from microbit import *

while True:
    if button_a.is_pressed() and button_b.is_pressed():
        display.show(Image.SURPRISED)
    elif button_a.is_pressed():
        display.show("A")
    elif button_b.is_pressed():
        display.show("B")
    else:
        display.clear()`,
        concepts: ["and operator", "combined conditions"]
      }
    ]
  },
  sensors: {
    title: "📡 Sensors",
    lessons: [
      {
        id: "shake",
        title: "Shake Detection",
        description: "The accelerometer detects when you shake the micro:bit.",
        code: `from microbit import *

while True:
    if accelerometer.is_gesture("shake"):
        display.show(Image.SURPRISED)
        sleep(500)
    else:
        display.show(Image.HAPPY)`,
        concepts: ["accelerometer", "is_gesture()", "shake"]
      },
      {
        id: "tilt",
        title: "Tilt Direction",
        description: "Detect which way the micro:bit is tilted: left, right, up, down.",
        code: `from microbit import *

while True:
    if accelerometer.is_gesture("left"):
        display.show(Image.ARROW_W)
    elif accelerometer.is_gesture("right"):
        display.show(Image.ARROW_E)
    elif accelerometer.is_gesture("up"):
        display.show(Image.ARROW_N)
    elif accelerometer.is_gesture("down"):
        display.show(Image.ARROW_S)`,
        concepts: ["tilt detection", "ARROW images"]
      },
      {
        id: "temperature",
        title: "Temperature Sensor",
        description: "temperature() returns the temperature in Celsius.",
        code: `from microbit import *

while True:
    temp = temperature()
    display.scroll(str(temp) + "C")
    sleep(2000)`,
        concepts: ["temperature()", "str()", "concatenation"]
      },
      {
        id: "light",
        title: "Light Sensor",
        description: "read_light_level() returns 0-255 based on ambient light.",
        code: `from microbit import *

while True:
    light = display.read_light_level()
    if light < 50:
        display.show(Image.HEART)
    else:
        display.clear()
    sleep(100)`,
        concepts: ["read_light_level()", "threshold"]
      }
    ]
  },
  loops: {
    title: "🔁 Loops",
    lessons: [
      {
        id: "for_basic",
        title: "For Loop - LED Row",
        description: "Use a for loop to light up LEDs in sequence.",
        code: `from microbit import *

for i in range(5):
    display.set_pixel(i, 0, 9)
    sleep(200)`,
        concepts: ["for loop", "range()", "sequence"]
      },
      {
        id: "nested",
        title: "Nested Loops - Fill Screen",
        description: "Nested loops to fill the entire 5x5 display.",
        code: `from microbit import *

for y in range(5):
    for x in range(5):
        display.set_pixel(x, y, 9)
        sleep(50)`,
        concepts: ["nested loops", "x and y", "grid"]
      },
      {
        id: "animation_loop",
        title: "Animation with Loop",
        description: "Loop through a list of images for animation.",
        code: `from microbit import *

faces = [Image.HAPPY, Image.SMILE, Image.SAD, Image.CONFUSED]

while True:
    for face in faces:
        display.show(face)
        sleep(500)`,
        concepts: ["list of images", "for-in loop"]
      },
      {
        id: "countdown",
        title: "Countdown Timer",
        description: "Count down from 5 to 0, then show a message.",
        code: `from microbit import *

for i in range(5, 0, -1):
    display.show(i)
    sleep(1000)

display.scroll("GO!")`,
        concepts: ["range(start, stop, step)", "countdown"]
      }
    ]
  },
  projects: {
    title: "🏆 Projects",
    lessons: [
      {
        id: "dice",
        title: "Digital Dice",
        description: "Shake to roll a random number 1-6.",
        code: `from microbit import *
import random

while True:
    if accelerometer.is_gesture("shake"):
        number = random.randint(1, 6)
        display.show(number)
        sleep(1000)`,
        concepts: ["random.randint()", "dice game"]
      },
      {
        id: "rock_paper",
        title: "Rock Paper Scissors",
        description: "Shake to pick rock, paper, or scissors randomly.",
        code: `from microbit import *
import random

rock = Image("00000:09990:09990:09990:00000")
paper = Image("99999:99999:99999:99999:99999")
scissors = Image("90009:09090:00900:09090:90009")

while True:
    if accelerometer.is_gesture("shake"):
        choice = random.choice([rock, paper, scissors])
        display.show(choice)
        sleep(1000)`,
        concepts: ["random.choice()", "custom images"]
      },
      {
        id: "step_counter",
        title: "Step Counter",
        description: "Count steps and show total when button A pressed.",
        code: `from microbit import *

steps = 0

while True:
    if accelerometer.was_gesture("shake"):
        steps = steps + 1
    if button_a.was_pressed():
        display.scroll(steps)
    if button_b.was_pressed():
        steps = 0
        display.show(Image.YES)`,
        concepts: ["state tracking", "reset feature"]
      },
      {
        id: "nightlight",
        title: "Auto Nightlight",
        description: "Automatically turn on LEDs when it gets dark.",
        code: `from microbit import *

while True:
    light = display.read_light_level()
    if light < 30:
        display.show(Image.HEART)
    else:
        display.clear()
    sleep(200)`,
        concepts: ["automatic response", "threshold"]
      }
    ]
  }
};

export default function MicrobitTeaching({ user }) {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState("basics");
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [code, setCode] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentTopic = MICROBIT_TEACHING[selectedTopic];
  const currentLesson = currentTopic.lessons[currentLessonIndex];

  useEffect(() => {
    if (currentLesson) {
      setCode(currentLesson.code);
    }
  }, [selectedTopic, currentLessonIndex]);

  const resetCode = () => {
    setCode(currentLesson.code);
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

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 py-3 px-6">
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
              <span className="text-cyan-200">| {currentTopic.title}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedTopic} onValueChange={(v) => { setSelectedTopic(v); setCurrentLessonIndex(0); }}>
              <SelectTrigger className="w-40 bg-white/10 border-white/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MICROBIT_TEACHING).map(([key, topic]) => (
                  <SelectItem key={key} value={key}>{topic.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
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

      {/* Main Content */}
      <div className="flex h-[calc(100vh-52px)]">
        {/* Left: Code Editor */}
        <div className="w-1/2 flex flex-col border-r border-gray-700">
          {/* Lesson Info */}
          <div className="p-4 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-cyan-400">{currentLesson.title}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>{currentLessonIndex + 1} / {currentTopic.lessons.length}</span>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-2">{currentLesson.description}</p>
            <div className="flex gap-2 flex-wrap">
              {currentLesson.concepts.map((concept, i) => (
                <span key={i} className="px-2 py-0.5 bg-cyan-900/50 text-cyan-300 rounded text-xs">
                  {concept}
                </span>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={setCode}
              options={{
                minimap: { enabled: false },
                fontSize: 16,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>

          {/* Controls */}
          <div className="p-3 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                onClick={prevLesson}
                disabled={currentLessonIndex === 0}
                variant="outline"
                size="sm"
                className="bg-gray-700 border-gray-600"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                onClick={nextLesson}
                disabled={currentLessonIndex === currentTopic.lessons.length - 1}
                variant="outline"
                size="sm"
                className="bg-gray-700 border-gray-600"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <Button
              onClick={resetCode}
              variant="outline"
              size="sm"
              className="bg-gray-700 border-gray-600"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Right: Micro:bit Simulator */}
        <div className="w-1/2 flex flex-col bg-gray-950 p-4">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-md">
              <MicrobitSimulator code={code} />
            </div>
          </div>

          {/* Quick Reference */}
          <div className="p-4 bg-gray-800 rounded-lg mt-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Quick Reference</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-gray-500">
                <code className="text-cyan-400">display.show()</code> - show image
              </div>
              <div className="text-gray-500">
                <code className="text-cyan-400">display.scroll()</code> - scroll text
              </div>
              <div className="text-gray-500">
                <code className="text-cyan-400">button_a.is_pressed()</code> - check A
              </div>
              <div className="text-gray-500">
                <code className="text-cyan-400">button_b.is_pressed()</code> - check B
              </div>
              <div className="text-gray-500">
                <code className="text-cyan-400">sleep(ms)</code> - wait milliseconds
              </div>
              <div className="text-gray-500">
                <code className="text-cyan-400">set_pixel(x,y,b)</code> - set LED
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
