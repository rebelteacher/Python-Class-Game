import { useEffect, useRef } from "react";

export default function CyberRain({ density = 35, speed = 1 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = [
      { r: 0, g: 240, b: 255 },   // cyan
      { r: 255, g: 0, b: 170 },    // pink
      { r: 57, g: 255, b: 20 },    // lime
    ];

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < density; i++) {
        particlesRef.current.push(createParticle(canvas, colors, true));
      }
    };

    const createParticle = (cvs, cols, randomY) => {
      const color = cols[Math.floor(Math.random() * cols.length)];
      const size = Math.random() * 4 + 2;
      const isSquare = Math.random() > 0.5;
      return {
        x: Math.random() * cvs.width,
        y: randomY ? Math.random() * cvs.height : -10,
        size,
        speed: (Math.random() * 1.5 + 0.5) * speed,
        color,
        alpha: Math.random() * 0.4 + 0.1,
        isSquare,
        trail: [],
        trailLength: Math.floor(Math.random() * 12 + 6),
      };
    };

    initParticles();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        // Store trail position
        p.trail.push({ x: p.x, y: p.y, alpha: p.alpha });
        if (p.trail.length > p.trailLength) {
          p.trail.shift();
        }

        // Draw trail
        for (let i = 0; i < p.trail.length; i++) {
          const t = p.trail[i];
          const fadeRatio = i / p.trail.length;
          const trailAlpha = t.alpha * fadeRatio * 0.5;
          ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${trailAlpha})`;
          const trailSize = p.size * fadeRatio;
          if (p.isSquare) {
            ctx.fillRect(t.x - trailSize / 2, t.y - trailSize / 2, trailSize, trailSize);
          } else {
            ctx.beginPath();
            ctx.arc(t.x, t.y, trailSize / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw particle with glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha})`;
        ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha})`;
        if (p.isSquare) {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Move
        p.y += p.speed;
        p.x += Math.sin(p.y * 0.01) * 0.3; // subtle sway

        // Reset when off-screen
        if (p.y > canvas.height + 20) {
          Object.assign(p, createParticle(canvas, colors, false));
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [density, speed]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
