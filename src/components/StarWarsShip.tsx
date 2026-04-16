import { useEffect, useRef } from "react";

// Change to a smaller value (e.g. 10_000) to test locally
const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
// const INTERVAL_MS = 8_000; // 8 seconds for testing

const S = 1; // pixels per logical unit

// ── Pixel-art X-Wing. cx/cy is the center of the fuselage.
//    Always drawn facing right; caller mirrors via ctx.scale(-1,1).
// ────────────────────────────────────────────────────────────────────────────
function drawXWing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  elapsed: number,
  alpha: number,
  facingRight: boolean,
) {
  ctx.save();
  ctx.translate(cx, cy);
  if (!facingRight) ctx.scale(-1, 1);
  ctx.globalAlpha = alpha;

  const pulse = 0.65 + 0.35 * Math.sin(elapsed / 90);

  // ── Speed-line trail ─────────────────────────────────────────────────────
  const trailLen = 90 * S;
  const trailRows = [-5 * S, -2.5 * S, 0, 2.5 * S, 5 * S];
  trailRows.forEach((ty, i) => {
    const intensity = i === 2 ? 0.35 : 0.18; // centre line brighter
    const grad = ctx.createLinearGradient(-8 * S - trailLen, 0, -8 * S, 0);
    grad.addColorStop(0, `rgba(180,210,255,0)`);
    grad.addColorStop(1, `rgba(200,220,255,${intensity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(-8 * S - trailLen, ty - S * 0.18, trailLen, S * 0.36);
  });

  // ── Main fuselage ─────────────────────────────────────────────────────────
  ctx.fillStyle = "#cdcdcd";
  ctx.fillRect(-8 * S, -S, 16 * S, 2 * S);

  // Fuselage detail grooves
  ctx.fillStyle = "#888";
  ctx.fillRect(-5 * S, -S * 0.9, 9 * S, S * 0.35);
  ctx.fillRect(-5 * S,  S * 0.55, 9 * S, S * 0.35);

  // ── Cockpit canopy ────────────────────────────────────────────────────────
  ctx.fillStyle = "#4477aa";
  ctx.fillRect(4 * S, -S * 1.6, 3 * S, S * 1.6);

  // ── Nose tip ──────────────────────────────────────────────────────────────
  ctx.fillStyle = "#b0b0b0";
  ctx.fillRect(7 * S, -S * 0.5, 3 * S, S);

  // ── Wing panels (S-foils open, forming an X) ──────────────────────────────
  ctx.fillStyle = "#bebebe";
  // Upper front
  ctx.fillRect(-S, -S * 4, 5 * S, S * 3);
  // Upper rear
  ctx.fillRect(-8 * S, -S * 7, 5 * S, S * 3);
  // Lower front
  ctx.fillRect(-S,  S,      5 * S, S * 3);
  // Lower rear
  ctx.fillRect(-8 * S, S * 4, 5 * S, S * 3);

  // Wing detail stripes
  ctx.fillStyle = "#777";
  ctx.fillRect(-S,     -S * 3.4, 5 * S, S * 0.4);
  ctx.fillRect(-8 * S, -S * 6.4, 5 * S, S * 0.4);
  ctx.fillRect(-S,      S * 3.0, 5 * S, S * 0.4);
  ctx.fillRect(-8 * S,  S * 6.0, 5 * S, S * 0.4);

  // ── Laser cannon barrels (4×) ─────────────────────────────────────────────
  ctx.fillStyle = "#aaa";
  ctx.fillRect(3 * S, -S * 5,   9 * S, S * 0.45); // upper-front
  ctx.fillRect(3 * S,  S * 4.55, 9 * S, S * 0.45); // lower-front
  ctx.fillRect(-4 * S, -S * 8,   9 * S, S * 0.45); // upper-rear
  ctx.fillRect(-4 * S,  S * 7.55, 9 * S, S * 0.45); // lower-rear

  // Cannon tip glow (red)
  ctx.fillStyle = `rgba(255,55,55,${pulse * 0.9})`;
  const t = S * 0.9;
  ctx.fillRect(12 * S - t / 2, -S * 5.22,  t, t);
  ctx.fillRect(12 * S - t / 2,  S * 4.32,  t, t);
  ctx.fillRect( 5 * S - t / 2, -S * 8.22,  t, t);
  ctx.fillRect( 5 * S - t / 2,  S * 7.32,  t, t);

  // ── Engine exhaust glow ───────────────────────────────────────────────────
  const grd = ctx.createRadialGradient(-8 * S, 0, 0, -8 * S, 0, S * 3.2);
  grd.addColorStop(0,   `rgba(160,230,255,${pulse})`);
  grd.addColorStop(0.45, `rgba(80,150,255,${pulse * 0.55})`);
  grd.addColorStop(1,    "rgba(0,0,80,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(-8 * S, 0, S * 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── Component ─────────────────────────────────────────────────────────────────
type ShipState = {
  startX: number;
  y: number;
  facingRight: boolean;
  speed: number;    // px/ms
  startTime: number;
  duration: number;
};

const StarWarsShip = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let ship: ShipState | null = null;
    let nextShipAt = -1;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const spawnShip = (now: number) => {
      const W = canvas.width;
      const H = canvas.height;
      const facingRight = Math.random() < 0.5;
      const speed       = 1.2 + Math.random() * 0.4; // 1200–1600 px/s (very fast)
      const margin      = 15 * S;
      const startX      = facingRight ? -margin : W + margin;
      const y           = H * 0.1 + Math.random() * H * 0.8;
      const duration    = (W + 2 * margin) / speed;
      ship = { startX, y, facingRight, speed, startTime: now, duration };
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (nextShipAt === -1) nextShipAt = time + INTERVAL_MS;

      if (!ship && time >= nextShipAt) spawnShip(time);

      if (ship) {
        const elapsed  = time - ship.startTime;
        const progress = elapsed / ship.duration;

        if (progress >= 1) {
          ship       = null;
          nextShipAt = time + INTERVAL_MS;
        } else {
          const dx    = ship.facingRight ? 1 : -1;
          const x     = ship.startX + dx * ship.speed * elapsed;
          const fadeIn  = Math.min(1, elapsed / 350);
          const fadeOut = progress > 0.85 ? Math.max(0, 1 - (progress - 0.85) / 0.15) : 1;
          const alpha   = fadeIn * fadeOut * 0.95;

          drawXWing(ctx, x, ship.y, elapsed, alpha, ship.facingRight);
        }
      }

      animId = requestAnimationFrame(draw);
    };

    resize();
    animId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[2]"
      aria-hidden="true"
    />
  );
};

export default StarWarsShip;
