"""
Pillow-based Turtle Graphics Simulator
Pure Python implementation - no tkinter required
Tracks all commands for auto-grading
"""

from PIL import Image, ImageDraw
import math
from typing import List, Tuple, Optional, Dict, Any
import io
import base64


class TurtleSim:
    """Simulates turtle graphics using Pillow for drawing"""
    
    def __init__(self, width: int = 600, height: int = 600, bg_color: str = "white"):
        self.width = width
        self.height = height
        self.bg_color = bg_color
        
        # Create image and drawing context
        self.image = Image.new('RGB', (width, height), bg_color)
        self.draw = ImageDraw.Draw(self.image)
        
        # Turtle state
        self.x = width / 2  # Center X
        self.y = height / 2  # Center Y
        self.heading = 90  # Degrees (0=right, 90=up, 180=left, 270=down)
        self.pen_down = True
        self.pen_color = "black"
        self.pen_width = 2
        self._speed = 3
        self.is_visible = True
        
        # Tracking data for auto-grading
        self.commands_used = []
        self.positions_visited = [(self.x, self.y)]
        self.path_history = [{"x": 0, "y": 0}]  # Track turtle coordinates for maze goal checking
        self.lines_drawn = 0
        self.circles_drawn = 0
        self.total_distance = 0
        self.colors_used = {self.pen_color}
        
    def _to_canvas_coords(self, x: float, y: float) -> Tuple[int, int]:
        """Convert turtle coordinates to canvas coordinates"""
        # Turtle: (0,0) at center, Y-up
        # Canvas: (0,0) at top-left, Y-down
        canvas_x = int(x)
        canvas_y = int(self.height - y)
        return (canvas_x, canvas_y)
    
    def forward(self, distance: float):
        """Move turtle forward by distance"""
        self.commands_used.append(f"forward({distance})")
        
        # Calculate new position
        rad = math.radians(self.heading)
        new_x = self.x + distance * math.cos(rad)
        new_y = self.y + distance * math.sin(rad)
        
        # Draw line if pen is down
        if self.pen_down:
            start = self._to_canvas_coords(self.x, self.y)
            end = self._to_canvas_coords(new_x, new_y)
            self.draw.line([start, end], fill=self.pen_color, width=self.pen_width)
            self.lines_drawn += 1
        
        # Update position
        self.x = new_x
        self.y = new_y
        self.positions_visited.append((self.x, self.y))
        # Track in turtle coordinates (0,0 at center, Y-up)
        # Internal coords: Y increases when turtle moves up (heading=90)
        turtle_x = self.x - self.width / 2
        turtle_y = self.y - self.height / 2
        self.path_history.append({"x": round(turtle_x, 2), "y": round(turtle_y, 2)})
        self.total_distance += abs(distance)
    
    def backward(self, distance: float):
        """Move turtle backward by distance"""
        self.commands_used.append(f"backward({distance})")
        self.forward(-distance)
    
    def right(self, angle: float):
        """Turn turtle right by angle degrees"""
        self.commands_used.append(f"right({angle})")
        self.heading = (self.heading - angle) % 360
    
    def left(self, angle: float):
        """Turn turtle left by angle degrees"""
        self.commands_used.append(f"left({angle})")
        self.heading = (self.heading + angle) % 360
    
    def goto(self, x: float, y: float):
        """Move turtle to absolute position"""
        self.commands_used.append(f"goto({x}, {y})")
        
        # Draw line if pen is down
        if self.pen_down:
            start = self._to_canvas_coords(self.x, self.y)
            end = self._to_canvas_coords(x + self.width/2, y + self.height/2)
            self.draw.line([start, end], fill=self.pen_color, width=self.pen_width)
            self.lines_drawn += 1
        
        self.x = x + self.width / 2
        self.y = y + self.height / 2
        self.positions_visited.append((self.x, self.y))
        # Track in turtle coordinates for maze goal checking
        self.path_history.append({"x": round(x, 2), "y": round(y, 2)})
    
    def setx(self, x: float):
        """Set turtle's X coordinate"""
        self.goto(x, self.y - self.height/2)
    
    def sety(self, y: float):
        """Set turtle's Y coordinate"""
        self.goto(self.x - self.width/2, y)
    
    def setheading(self, angle: float):
        """Set turtle's heading to angle degrees"""
        self.commands_used.append(f"setheading({angle})")
        self.heading = angle % 360
    
    def circle(self, radius: float, extent: Optional[float] = None, steps: Optional[int] = None):
        """Draw a circle with given radius"""
        self.commands_used.append(f"circle({radius})")
        self.circles_drawn += 1
        
        if extent is None:
            extent = 360
        if steps is None:
            steps = max(int(abs(radius) / 2), 20)
        
        # Calculate step angle
        step_angle = extent / steps
        step_length = 2 * math.pi * abs(radius) * abs(extent) / (360 * steps)
        
        # Draw circle as polygon
        for _ in range(steps):
            self.forward(step_length)
            self.left(step_angle if radius > 0 else -step_angle)
    
    def dot(self, size: Optional[int] = None, color: Optional[str] = None):
        """Draw a dot at current position"""
        self.commands_used.append(f"dot({size})")
        
        if size is None:
            size = max(self.pen_width + 4, 2 * self.pen_width)
        if color is None:
            color = self.pen_color
        
        pos = self._to_canvas_coords(self.x, self.y)
        self.draw.ellipse(
            [pos[0] - size//2, pos[1] - size//2, pos[0] + size//2, pos[1] + size//2],
            fill=color
        )
    
    def penup(self):
        """Lift pen - stop drawing"""
        self.commands_used.append("penup()")
        self.pen_down = False
    
    def pendown(self):
        """Put pen down - start drawing"""
        self.commands_used.append("pendown()")
        self.pen_down = True
    
    def pensize(self, width: int):
        """Set pen width"""
        self.commands_used.append(f"pensize({width})")
        self.pen_width = max(1, int(width))
    
    def pencolor(self, color: str):
        """Set pen color"""
        self.commands_used.append(f"pencolor('{color}')")
        self.pen_color = color
        self.colors_used.add(color)
    
    def color(self, *args):
        """Set pen color (and fill color if two args)"""
        if len(args) == 1:
            self.pencolor(args[0])
        elif len(args) == 2:
            self.pencolor(args[0])
            # Fill color would go here
    
    def speed(self, speed: int):
        """Set turtle speed (ignored in simulation)"""
        self.commands_used.append(f"speed({speed})")
        self._speed = speed
    
    def hideturtle(self):
        """Hide the turtle"""
        self.commands_used.append("hideturtle()")
        self.is_visible = False
    
    def showturtle(self):
        """Show the turtle"""
        self.commands_used.append("showturtle()")
        self.is_visible = True
    
    def begin_fill(self):
        """Begin filling shape (not fully implemented)"""
        self.commands_used.append("begin_fill()")
    
    def end_fill(self):
        """End filling shape (not fully implemented)"""
        self.commands_used.append("end_fill()")
    
    def width(self, width: int):
        """Alias for pensize"""
        self.pensize(width)
    
    def position(self) -> Tuple[float, float]:
        """Return current position"""
        return (self.x - self.width/2, self.y - self.height/2)
    
    def xcor(self) -> float:
        """Return X coordinate"""
        return self.x - self.width/2
    
    def ycor(self) -> float:
        """Return Y coordinate"""
        return self.y - self.height/2
    
    def get_image_base64(self) -> str:
        """Return the canvas image as base64 PNG"""
        buffer = io.BytesIO()
        self.image.save(buffer, format='PNG')
        buffer.seek(0)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    def get_tracking_data(self) -> Dict[str, Any]:
        """Return tracking data for auto-grading"""
        # Calculate turtle coordinates (0,0 at center)
        turtle_x = self.x - self.width / 2
        turtle_y = self.y - self.height / 2
        return {
            "total_commands": len(self.commands_used),
            "unique_commands": len(set(cmd.split('(')[0] for cmd in self.commands_used)),
            "lines_drawn": self.lines_drawn,
            "circles_drawn": self.circles_drawn,
            "total_distance": round(self.total_distance, 2),
            "positions_count": len(self.positions_visited),
            "colors_used": list(self.colors_used),
            "final_position": {
                "x": round(turtle_x, 2),
                "y": round(turtle_y, 2)
            },
            "final_heading": round(self.heading, 2),
            "path_history": self.path_history  # For maze goal checking
        }


class Screen:
    """Mock Screen class for compatibility"""
    
    def __init__(self, turtle_sim: TurtleSim):
        self.turtle_sim = turtle_sim
    
    def setup(self, width: int = 600, height: int = 600):
        """Setup screen size"""
        pass
    
    def bgcolor(self, color: str):
        """Set background color"""
        pass
    
    def update(self):
        """Update screen (no-op in simulation)"""
        pass
    
    def bye(self):
        """Close screen (no-op in simulation)"""
        pass


class Turtle:
    """Main Turtle class that wraps TurtleSim"""
    
    def __init__(self, turtle_sim: Optional[TurtleSim] = None):
        if turtle_sim is None:
            turtle_sim = TurtleSim()
        self.sim = turtle_sim
    
    def forward(self, distance: float):
        self.sim.forward(distance)
    
    def backward(self, distance: float):
        self.sim.backward(distance)
    
    def right(self, angle: float):
        self.sim.right(angle)
    
    def left(self, angle: float):
        self.sim.left(angle)
    
    def goto(self, x: float, y: float = None):
        if y is None and hasattr(x, '__iter__'):
            x, y = x
        self.sim.goto(x, y)
    
    def setx(self, x: float):
        self.sim.setx(x)
    
    def sety(self, y: float):
        self.sim.sety(y)
    
    def setheading(self, angle: float):
        self.sim.setheading(angle)
    
    def circle(self, radius: float, extent: float = None, steps: int = None):
        self.sim.circle(radius, extent, steps)
    
    def dot(self, size: int = None, color: str = None):
        self.sim.dot(size, color)
    
    def penup(self):
        self.sim.penup()
    
    def pendown(self):
        self.sim.pendown()
    
    def pensize(self, width: int):
        self.sim.pensize(width)
    
    def pencolor(self, color: str):
        self.sim.pencolor(color)
    
    def color(self, *args):
        self.sim.color(*args)
    
    def speed(self, speed: int):
        self.sim.speed(speed)
    
    def hideturtle(self):
        self.sim.hideturtle()
    
    def showturtle(self):
        self.sim.showturtle()
    
    def begin_fill(self):
        self.sim.begin_fill()
    
    def end_fill(self):
        self.sim.end_fill()
    
    def width(self, width: int):
        self.sim.width(width)
    
    def position(self):
        return self.sim.position()
    
    def xcor(self):
        return self.sim.xcor()
    
    def ycor(self):
        return self.sim.ycor()
    
    # Aliases
    fd = forward
    bk = backward
    back = backward
    rt = right
    lt = left
    pu = penup
    pd = pendown
    st = showturtle
    ht = hideturtle
