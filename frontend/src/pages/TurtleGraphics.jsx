import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import TurtleViewer from "@/components/TurtleViewer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EXAMPLES = {
  square: {
    name: "Square",
    code: `import turtle

# Create a turtle
t = turtle.Turtle()
t.speed(2)

# Draw a square
for i in range(4):
    t.forward(100)
    t.right(90)

t.hideturtle()
`
  },
  circle: {
    name: "Circle",
    code: `import turtle

# Create a turtle
t = turtle.Turtle()
t.speed(3)

# Draw a circle
t.circle(80)

t.hideturtle()
`
  },
  star: {
    name: "Star",
    code: `import turtle

# Create a turtle
t = turtle.Turtle()
t.speed(5)
t.color("gold")

# Draw a star
for i in range(5):
    t.forward(150)
    t.right(144)

t.hideturtle()
`
  },
  spiral: {
    name: "Spiral",
    code: `import turtle

# Create a turtle
t = turtle.Turtle()
t.speed(0)

# Draw a spiral
colors = ['red', 'purple', 'blue', 'green', 'yellow', 'orange']
for i in range(360):
    t.pencolor(colors[i % 6])
    t.width(i / 100 + 1)
    t.forward(i)
    t.left(59)

t.hideturtle()
`
  },
  polygon: {
    name: "Hexagon",
    code: `import turtle

# Create a turtle
t = turtle.Turtle()
t.speed(3)
t.color("blue")

# Draw a hexagon
for i in range(6):
    t.forward(100)
    t.right(60)

t.hideturtle()
`
  },
  flower: {
    name: "Flower",
    code: `import turtle

# Create a turtle
t = turtle.Turtle()
t.speed(0)
t.color("red", "pink")

# Draw a flower
t.begin_fill()
for i in range(36):
    t.circle(50)
    t.left(10)
t.end_fill()

t.hideturtle()
`
  }
};

export default function TurtleGraphics({ user }) {
  const navigate = useNavigate();
  const [selectedExample, setSelectedExample] = useState("square");
  const [code, setCode] = useState(EXAMPLES.square.code);

  const handleExampleChange = (value) => {
    setSelectedExample(value);
    setCode(EXAMPLES[value].code);
  };

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">🐢 Turtle Graphics</h1>
              <p className="text-slate-400">Learn Python with visual programming</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedExample} onValueChange={handleExampleChange}>
              <SelectTrigger className="w-[200px]">
                <BookOpen className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Choose example" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXAMPLES).map(([key, example]) => (
                  <SelectItem key={key} value={key}>
                    {example.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Info Card */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Getting Started with Turtle Graphics</h3>
          <ul className="text-sm text-blue-400 space-y-1">
            <li>• Use <code className="bg-blue-500/20 px-1 rounded">t.forward(distance)</code> to move forward</li>
            <li>• Use <code className="bg-blue-500/20 px-1 rounded">t.right(angle)</code> or <code className="bg-blue-500/20 px-1 rounded">t.left(angle)</code> to turn</li>
            <li>• Use <code className="bg-blue-500/20 px-1 rounded">t.color(color_name)</code> to change color</li>
            <li>• Use <code className="bg-blue-500/20 px-1 rounded">t.circle(radius)</code> to draw circles</li>
            <li>• Try the examples above and modify them to create your own designs!</li>
          </ul>
        </div>

        {/* Turtle Viewer */}
        <div className="h-[600px]">
          <TurtleViewer 
            initialCode={code} 
            onCodeChange={setCode}
          />
        </div>
      </div>
    </div>
  );
}
