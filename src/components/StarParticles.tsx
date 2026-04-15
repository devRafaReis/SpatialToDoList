import { useEffect, useRef } from "react";

type Comet = {
  x: number;
  y: number;
  dx: number;       // normalized direction x
  dy: number;       // normalized direction y
  speed: number;    // px/ms
  tailLength: number;
  startTime: number;
  duration: number;
};

const StarParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const stars: { x: number; y: number; r: number; opacity: number; speed: number; phase: number }[] = [];

    let activeComet: Comet | null = null;
    let nextCometAt = -1;

    const spawnComet = (now: number) => {
      let x: number, y: number;
      if (Math.random() < 0.5) {
        // Top edge
        x = Math.random() * canvas.width * 0.85;
        y = -20;
      } else {
        // Left edge, upper half
        x = -20;
        y = Math.random() * canvas.height * 0.55;
      }

      const angleDeg = 28 + Math.random() * 28; // 28°–56° from horizontal
      const angle = (Math.PI / 180) * angleDeg;

      activeComet = {
        x,
        y,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        speed: 0.2 + Math.random() * 0.1,       // 200–300 px/s
        tailLength: 80 + Math.random() * 60,     // 80–140 px tail
        startTime: now,
        duration: 1800 + Math.random() * 700,    // 1.8–2.5 s
      };
    };

    const drawComet = (time: number) => {
      if (!activeComet) return;

      const elapsed = time - activeComet.startTime;
      const progress = elapsed / activeComet.duration;

      if (progress >= 1) {
        activeComet = null;
        nextCometAt = time + 25000 + Math.random() * 12000; // next: 25–37 s
        return;
      }

      // Opacity envelope: fade in quickly, linger, fade out in last 30%
      const fadeIn  = Math.min(1, progress * 10);
      const fadeOut = progress > 0.70 ? Math.max(0, 1 - (progress - 0.70) / 0.30) : 1;
      const alpha   = fadeIn * fadeOut * 0.50; // max ~50% → subtle

      const cx = activeComet.x + activeComet.dx * activeComet.speed * elapsed;
      const cy = activeComet.y + activeComet.dy * activeComet.speed * elapsed;
      const tailX = cx - activeComet.dx * activeComet.tailLength;
      const tailY = cy - activeComet.dy * activeComet.tailLength;

      ctx.save();

      // Tail — gradient from transparent (back) to bright (head)
      const tailGrad = ctx.createLinearGradient(tailX, tailY, cx, cy);
      tailGrad.addColorStop(0, `hsla(255, 70%, 88%, 0)`);
      tailGrad.addColorStop(0.6, `hsla(255, 70%, 88%, ${alpha * 0.4})`);
      tailGrad.addColorStop(1, `hsla(255, 70%, 92%, ${alpha})`);

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(cx, cy);
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      ctx.stroke();

      // Head glow — small radial gradient
      const headGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 4);
      headGrad.addColorStop(0,   `hsla(270, 100%, 98%, ${alpha * 1.6})`);
      headGrad.addColorStop(0.5, `hsla(260, 80%,  88%, ${alpha * 0.7})`);
      headGrad.addColorStop(1,   `hsla(250, 60%,  75%, 0)`);

      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = headGrad;
      ctx.fill();

      ctx.restore();
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initStars = () => {
      stars.length = 0;
      const count = Math.floor((canvas.width * canvas.height) / 8000);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.5 + 0.3,
          opacity: Math.random() * 0.6 + 0.1,
          speed: Math.random() * 0.3 + 0.05,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const star of stars) {
        const twinkle = Math.sin(time * 0.001 * star.speed + star.phase) * 0.3 + 0.7;
        const alpha = star.opacity * twinkle;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(260, 40%, 85%, ${alpha})`;
        ctx.fill();
      }

      // Initialize schedule on first frame
      if (nextCometAt === -1) {
        nextCometAt = time + 28000 + Math.random() * 8000; // first: 28–36 s
      }

      if (!activeComet && time >= nextCometAt) {
        spawnComet(time);
      }

      drawComet(time);

      animationId = requestAnimationFrame(draw);
    };

    resize();
    initStars();
    animationId = requestAnimationFrame(draw);

    const handleResize = () => {
      resize();
      initStars();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  );
};

export default StarParticles;
