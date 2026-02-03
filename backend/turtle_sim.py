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
        self._heading = 90  # Degrees (0=right, 90=up, 180=left, 270=down)
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
        # Log the command with all provided arguments
        if extent is not None:
            self.commands_used.append(f"circle({radius}, {extent})")
        else:
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
    
    def pos(self) -> Tuple[float, float]:
        """Alias for position - return current position"""
        return self.position()
    
    def xcor(self) -> float:
        """Return X coordinate"""
        return self.x - self.width/2
    
    def ycor(self) -> float:
        """Return Y coordinate"""
        return self.y - self.height/2
    
    def get_heading(self) -> float:
        """Return current heading in degrees"""
        return self._heading
    
    @property
    def heading(self) -> float:
        """Property to get heading"""
        return self._heading
    
    @heading.setter
    def heading(self, value: float):
        """Property to set heading"""
        self._heading = value
    
    def home(self):
        """Move turtle to origin (0, 0) and set heading to 0"""
        self.commands_used.append("home()")
        
        # Draw line if pen is down
        if self.pen_down:
            start = self._to_canvas_coords(self.x, self.y)
            end = self._to_canvas_coords(self.width/2, self.height/2)
            self.draw.line([start, end], fill=self.pen_color, width=self.pen_width)
            self.lines_drawn += 1
        
        # Reset to center
        self.x = self.width / 2
        self.y = self.height / 2
        self.heading = 90  # 90 degrees = facing up (standard turtle orientation)
        self.positions_visited.append((self.x, self.y))
        self.path_history.append({"x": 0, "y": 0})
    
    def clear(self):
        """Clear the drawing but keep turtle position"""
        self.commands_used.append("clear()")
        # Redraw background
        self.draw.rectangle([0, 0, self.width, self.height], fill=self.bg_color)
        self.lines_drawn = 0
        self.circles_drawn = 0
    
    def clearscreen(self):
        """Clear screen and reset turtle to home"""
        self.commands_used.append("clearscreen()")
        self.clear()
        self.home()
    
    def reset(self):
        """Alias for clearscreen"""
        self.clearscreen()
    
    def stamp(self) -> int:
        """Stamp a copy of the turtle shape at current position, return stamp_id"""
        self.commands_used.append("stamp()")
        
        # Draw turtle shape at current position
        pos = self._to_canvas_coords(self.x, self.y)
        size = 10
        
        # Draw a simple triangle pointing in heading direction
        rad = math.radians(self.heading)
        # Front point
        front_x = pos[0] + size * math.cos(rad)
        front_y = pos[1] - size * math.sin(rad)  # Y is inverted on canvas
        # Back left
        back_left_x = pos[0] + size * 0.7 * math.cos(rad + math.pi * 0.8)
        back_left_y = pos[1] - size * 0.7 * math.sin(rad + math.pi * 0.8)
        # Back right
        back_right_x = pos[0] + size * 0.7 * math.cos(rad - math.pi * 0.8)
        back_right_y = pos[1] - size * 0.7 * math.sin(rad - math.pi * 0.8)
        
        self.draw.polygon(
            [(front_x, front_y), (back_left_x, back_left_y), (back_right_x, back_right_y)],
            fill=self.pen_color,
            outline=self.pen_color
        )
        
        # Return a stamp ID (just use current count)
        stamp_id = len([c for c in self.commands_used if c.startswith("stamp")])
        return stamp_id
    
    def clearstamp(self, stamp_id: int = None):
        """Clear a stamp (not fully implemented - would need to track stamps)"""
        self.commands_used.append(f"clearstamp({stamp_id})")
        # Note: Full implementation would require tracking individual stamps
        pass
    
    def clearstamps(self, n: int = None):
        """Clear all or n stamps"""
        self.commands_used.append(f"clearstamps({n})")
        # Note: Full implementation would require tracking individual stamps
        pass
    
    def write(self, text: str, move: bool = False, align: str = "left", font: tuple = ("Arial", 8, "normal")):
        """Write text at current turtle position"""
        self.commands_used.append(f"write('{text}')")
        
        # Get canvas position
        pos = self._to_canvas_coords(self.x, self.y)
        
        # Try to use a font - Pillow might not have all fonts available
        try:
            from PIL import ImageFont
            font_name, font_size, font_style = font
            # Try to load a truetype font, fall back to default
            try:
                pil_font = ImageFont.truetype("arial.ttf", font_size)
            except:
                pil_font = ImageFont.load_default()
        except:
            pil_font = None
        
        # Draw the text
        # Adjust position based on alignment
        text_x = pos[0]
        text_y = pos[1]
        
        if pil_font:
            self.draw.text((text_x, text_y), str(text), fill=self.pen_color, font=pil_font, anchor="mm" if align == "center" else "lm")
        else:
            self.draw.text((text_x, text_y), str(text), fill=self.pen_color)
    
    def get_image_base64(self) -> str:
        """Return the canvas image as base64 PNG"""
        # Draw the turtle icon on the image before saving
        self._draw_turtle_icon()
        
        buffer = io.BytesIO()
        self.image.save(buffer, format='PNG')
        buffer.seek(0)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    def _draw_turtle_icon(self):
        """Draw a turtle icon at the current position and heading"""
        if not self.is_visible:
            return
            
        # Turtle size
        size = 15
        
        # Get canvas position
        cx, cy = self._to_canvas_coords(self.x, self.y)
        
        # Calculate triangle points for turtle shape (pointing in heading direction)
        import math
        angle_rad = math.radians(self.heading)
        
        # Front point (nose)
        front_x = cx + size * math.cos(angle_rad)
        front_y = cy - size * math.sin(angle_rad)  # Y is inverted in canvas
        
        # Back left point
        back_left_angle = angle_rad + math.radians(140)
        back_left_x = cx + size * 0.7 * math.cos(back_left_angle)
        back_left_y = cy - size * 0.7 * math.sin(back_left_angle)
        
        # Back right point
        back_right_angle = angle_rad - math.radians(140)
        back_right_x = cx + size * 0.7 * math.cos(back_right_angle)
        back_right_y = cy - size * 0.7 * math.sin(back_right_angle)
        
        # Draw filled triangle for turtle
        turtle_points = [
            (front_x, front_y),
            (back_left_x, back_left_y),
            (back_right_x, back_right_y)
        ]
        self.draw.polygon(turtle_points, fill='#228B22', outline='#1a6b1a')
    
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
    
    def pos(self):
        return self.sim.pos()
    
    def xcor(self):
        return self.sim.xcor()
    
    def ycor(self):
        return self.sim.ycor()
    
    def heading(self):
        return self.sim.get_heading()
    
    def home(self):
        self.sim.home()
    
    def clear(self):
        self.sim.clear()
    
    def clearscreen(self):
        self.sim.clearscreen()
    
    def reset(self):
        self.sim.reset()
    
    def stamp(self):
        return self.sim.stamp()
    
    def clearstamp(self, stamp_id=None):
        self.sim.clearstamp(stamp_id)
    
    def clearstamps(self, n=None):
        self.sim.clearstamps(n)
    
    def write(self, text, move=False, align="left", font=("Arial", 8, "normal")):
        self.sim.write(str(text), move, align, font)
    
    # Aliases
    fd = forward
    bk = backward
    back = backward
    rt = right
    lt = left
    pu = penup
    pd = pendown
    up = penup
    down = pendown
    st = showturtle
    ht = hideturtle
    seth = setheading
    setpos = goto
    setposition = goto
