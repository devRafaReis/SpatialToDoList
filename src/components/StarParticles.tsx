import { useEffect, useRef } from "react";

type Comet = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  tailLength: number;
  lineWidth: number;
  headRadius: number;
  maxAlpha: number;
  startTime: number;
  duration: number;
};

// Each slot controls one independent comet lane with its own timing.
type Slot = {
  comet: Comet | null;
  nextAt: number;      // timestamp when next comet should spawn
  minGap: number;      // min ms between comets for this slot
  maxGap: number;      // max ms
  scale: number;       // visual size multiplier (1 = normal, <1 = small)
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

    // ── Slots ────────────────────────────────────────────────────────────────
    // Two "normal" lanes (existing sizes) + three "small" lanes.
    const slots: Slot[] = [
      { comet: null, nextAt: -1, minGap: 26000, maxGap: 40000, scale: 1.00 },
      { comet: null, nextAt: -1, minGap: 32000, maxGap: 50000, scale: 0.90 },
      { comet: null, nextAt: -1, minGap: 10000, maxGap: 18000, scale: 0.55 },
      { comet: null, nextAt: -1, minGap:  8000, maxGap: 14000, scale: 0.42 },
      { comet: null, nextAt: -1, minGap: 12000, maxGap: 20000, scale: 0.48 },
    ];

    // Stagger first-spawn so they don't all appear at once
    const FIRST_OFFSETS = [28000, 38000, 6000, 3000, 14000];

    const spawnComet = (slot: Slot, now: number) => {
      let x: number, y: number;
      if (Math.random() < 0.5) {
        x = Math.random() * canvas.width * 0.85;
        y = -20;
      } else {
        x = -20;
        y = Math.random() * canvas.height * 0.55;
      }

      const angleDeg = 28 + Math.random() * 28;
      const angle    = (Math.PI / 180) * angleDeg;
      const s        = slot.scale;

      // Speed: smaller comets are slightly faster (feel nimbler)
      const baseSpeed  = 0.2 + Math.random() * 0.10;
      const speedBoost = (1 - s) * 0.08; // tiny ones up to +0.08 px/ms

      slot.comet = {
        x, y,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        speed:      baseSpeed + speedBoost,
        tailLength: (80 + Math.random() * 60) * s,
        lineWidth:  Math.max(0.45, 1.2 * s),
        headRadius: Math.max(1.2, 4 * s),
        maxAlpha:   0.50 * (0.55 + s * 0.45),   // smaller = slightly dimmer
        startTime:  now,
        duration:   1800 + Math.random() * 700,
      };
    };

    const drawComet = (comet: Comet, time: number) => {
      const elapsed  = time - comet.startTime;
      const progress = elapsed / comet.duration;
      if (progress >= 1) return false; // signal removal

      const fadeIn  = Math.min(1, progress * 10);
      const fadeOut = progress > 0.70 ? Math.max(0, 1 - (progress - 0.70) / 0.30) : 1;
      const alpha   = fadeIn * fadeOut * comet.maxAlpha;

      const cx = comet.x + comet.dx * comet.speed * elapsed;
      const cy = comet.y + comet.dy * comet.speed * elapsed;
      const tx = cx - comet.dx * comet.tailLength;
      const ty = cy - comet.dy * comet.tailLength;

      ctx.save();

      const tailGrad = ctx.createLinearGradient(tx, ty, cx, cy);
      tailGrad.addColorStop(0,   `hsla(255, 70%, 88%, 0)`);
      tailGrad.addColorStop(0.6, `hsla(255, 70%, 88%, ${alpha * 0.4})`);
      tailGrad.addColorStop(1,   `hsla(255, 70%, 92%, ${alpha})`);

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(cx, cy);
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth   = comet.lineWidth;
      ctx.lineCap     = "round";
      ctx.stroke();

      const headGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, comet.headRadius);
      headGrad.addColorStop(0,   `hsla(270, 100%, 98%, ${alpha * 1.6})`);
      headGrad.addColorStop(0.5, `hsla(260,  80%, 88%, ${alpha * 0.7})`);
      headGrad.addColorStop(1,   `hsla(250,  60%, 75%, 0)`);

      ctx.beginPath();
      ctx.arc(cx, cy, comet.headRadius, 0, Math.PI * 2);
      ctx.fillStyle = headGrad;
      ctx.fill();

      ctx.restore();
      return true; // still alive
    };

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initStars = () => {
      stars.length = 0;
      const count = Math.floor((canvas.width * canvas.height) / 8000);
      for (let i = 0; i < count; i++) {
        stars.push({
          x:       Math.random() * canvas.width,
          y:       Math.random() * canvas.height,
          r:       Math.random() * 1.5 + 0.3,
          opacity: Math.random() * 0.6 + 0.1,
          speed:   Math.random() * 0.3 + 0.05,
          phase:   Math.random() * Math.PI * 2,
        });
      }
    };

    let initialized = false;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Stars
      for (const star of stars) {
        const twinkle = Math.sin(time * 0.001 * star.speed + star.phase) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(260, 40%, 85%, ${star.opacity * twinkle})`;
        ctx.fill();
      }

      // Init slot timers on first frame
      if (!initialized) {
        slots.forEach((slot, i) => {
          slot.nextAt = time + FIRST_OFFSETS[i] + Math.random() * 4000;
        });
        initialized = true;
      }

      // Update each slot
      for (const slot of slots) {
        if (slot.comet) {
          const alive = drawComet(slot.comet, time);
          if (!alive) {
            slot.comet  = null;
            slot.nextAt = time + slot.minGap + Math.random() * (slot.maxGap - slot.minGap);
          }
        } else if (time >= slot.nextAt) {
          spawnComet(slot, time);
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    initStars();
    animationId = requestAnimationFrame(draw);

    const handleResize = () => { resize(); initStars(); };
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
