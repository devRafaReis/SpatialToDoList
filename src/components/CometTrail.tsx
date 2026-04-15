import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
};

interface CometTrailProps {
  active: boolean;
  draggableId: string | null;
}

const CometTrail = ({ active, draggableId }: CometTrailProps) => {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const activeRef      = useRef(active);
  const draggableIdRef = useRef(draggableId);
  const particles      = useRef<Particle[]>([]);
  const animId         = useRef(0);
  const mousePos       = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    activeRef.current      = active;
    draggableIdRef.current = draggableId;
    if (!active) {
      particles.current = [];
      mousePos.current  = null;
    }
  }, [active, draggableId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Track cursor — reliable regardless of DnD internals
    const record = (x: number, y: number) => {
      if (activeRef.current) mousePos.current = { x, y };
    };
    const onMouse   = (e: MouseEvent)   => record(e.clientX, e.clientY);
    const onPointer = (e: PointerEvent) => record(e.clientX, e.clientY);
    window.addEventListener("mousemove",   onMouse,   { capture: true });
    window.addEventListener("pointermove", onPointer, { capture: true });

    // Emit a burst of particles at (x, y)
    const emit = (x: number, y: number) => {
      const count = 2 + Math.floor(Math.random() * 3); // 2–4 per frame
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 1.2;
        particles.current.push({
          x:       x + (Math.random() - 0.5) * 20,
          y:       y + (Math.random() - 0.5) * 20,
          vx:      Math.cos(angle) * speed,
          vy:      Math.sin(angle) * speed - 0.4, // slight upward drift
          life:    40 + Math.random() * 40,
          maxLife: 80,
          size:    1 + Math.random() * 2.5,
          hue:     255 + Math.floor(Math.random() * 50), // purple–blue range
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (activeRef.current) {
        // Try to get position from the dragged DOM element (most accurate)
        let pos: { x: number; y: number } | null = null;

        if (draggableIdRef.current) {
          const el = document.querySelector(
            `[data-rfd-draggable-id="${draggableIdRef.current}"]`
          ) as HTMLElement | null;
          if (el && el.style.position === "fixed") {
            const r = el.getBoundingClientRect();
            pos = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          }
        }

        // Fallback: cursor position
        if (!pos) pos = mousePos.current;

        if (pos) emit(pos.x, pos.y);
      }

      // Animate all particles
      for (const p of particles.current) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life--;

        const ratio = p.life / p.maxLife;

        // Outer soft glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        glow.addColorStop(0,   `hsla(${p.hue}, 90%, 80%, ${ratio * 0.35})`);
        glow.addColorStop(1,   `hsla(${p.hue}, 90%, 70%, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Core bright dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * ratio, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 95%, 88%, ${ratio * 0.9})`;
        ctx.fill();
      }

      particles.current = particles.current.filter((p) => p.life > 0);

      animId.current = requestAnimationFrame(draw);
    };

    animId.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove",   onMouse,   { capture: true });
      window.removeEventListener("pointermove", onPointer, { capture: true });
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 9999 }}
      aria-hidden="true"
    />
  );
};

export default CometTrail;
