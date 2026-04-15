import { useEffect, useRef } from "react";

// Change this to a smaller value (e.g. 10_000) to test locally
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
// const INTERVAL_MS = 10_000; // 10 segundos para testar
const S = 3; // pixels per logical unit — pop-tart ~33×21 px

// ── Rainbow colours (RGB tuples) ────────────────────────────────────────────
const RAINBOW: [number, number, number][] = [
  [255, 50,  50 ],  // red
  [255, 165, 30 ],  // orange
  [255, 240, 40 ],  // yellow
  [50,  215, 50 ],  // green
  [50,  120, 255],  // blue
  [175, 50,  255],  // violet
];

function rc(r: number, g: number, b: number, a: number) {
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

// ── Pixel-art Nyan Cat drawn in local coords (always faces right).
//    Caller applies ctx.scale(-1,1) when the cat faces left.
//    cx=0,cy=0 is the CENTER of the pop-tart body.
// ────────────────────────────────────────────────────────────────────────────
function drawNyanCat(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  elapsed: number,
  alpha: number,
  facingRight: boolean,
) {
  ctx.save();
  ctx.translate(cx, cy);
  if (!facingRight) ctx.scale(-1, 1); // mirror for left-facing
  ctx.globalAlpha = alpha;

  const frame   = Math.floor(elapsed / 120) % 2;       // 2-frame bob at ~8 fps
  const bob     = frame === 0 ? 0 : 0.5 * S;           // vertical bob offset

  // ── Rainbow trail ──────────────────────────────────────────────────────────
  // 6 stripes spanning exactly the pop-tart height, fading to transparent far end
  const trailLen  = 50 * S;
  const ptLeft    = -5.5 * S;  // left edge of pop-tart
  const stripeH   = (7 * S) / 6;

  RAINBOW.forEach(([r, g, b], i) => {
    const sy = -3.5 * S + i * stripeH + bob;
    const grad = ctx.createLinearGradient(ptLeft - trailLen, 0, ptLeft, 0);
    grad.addColorStop(0,    rc(r, g, b, 0));
    grad.addColorStop(0.3,  rc(r, g, b, 0.65));
    grad.addColorStop(1,    rc(r, g, b, 1));
    ctx.fillStyle = grad;
    ctx.fillRect(ptLeft - trailLen, sy, trailLen, stripeH);
  });

  // ── Pop-tart outer crust ───────────────────────────────────────────────────
  ctx.fillStyle = "#c97a5c";
  ctx.fillRect(-5.5 * S, -3.5 * S + bob, 11 * S, 7 * S);

  // ── Pop-tart inner icing ───────────────────────────────────────────────────
  ctx.fillStyle = "#ffb7c5";
  ctx.fillRect(-4.5 * S, -2.5 * S + bob, 9 * S, 5 * S);

  // ── Frosting dots (2 rows × 3 cols) ───────────────────────────────────────
  const dotColors = ["#ff6b9d", "#ffda44", "#5cdf9c"];
  const dotCols   = [-3 * S, 0, 3 * S];
  const dotRows   = [-1.3 * S, 1.3 * S];
  dotCols.forEach((dx, ci) => {
    dotRows.forEach((dy) => {
      ctx.fillStyle = dotColors[ci % dotColors.length];
      ctx.fillRect(dx - 0.75 * S, dy + bob - 0.75 * S, 1.5 * S, 1.5 * S);
    });
  });

  // ── Four legs (alternating bob) ────────────────────────────────────────────
  ctx.fillStyle = "#aaaaaa";
  const legBaseY = 3.5 * S + bob;
  ([-3.5 * S, -1.3 * S, 1.3 * S, 3.5 * S] as number[]).forEach((lx, i) => {
    const legBob = (i % 2 === 0) === (frame === 0) ? 0 : S;
    ctx.fillRect(lx - 0.75 * S, legBaseY + legBob, 1.5 * S, 2.5 * S);
  });

  // ── Cat head (right of pop-tart, slightly up) ──────────────────────────────
  const hx = 5.5 * S;
  const hy = -7 * S + bob;
  const hw = 8 * S;
  const hh = 7 * S;

  ctx.fillStyle = "#aaaaaa";
  ctx.fillRect(hx, hy, hw, hh);

  // ── Ears ───────────────────────────────────────────────────────────────────
  ctx.fillStyle = "#aaaaaa";
  // left ear
  ctx.beginPath();
  ctx.moveTo(hx + S,       hy);
  ctx.lineTo(hx + 1.5 * S, hy - 2.5 * S);
  ctx.lineTo(hx + 3 * S,   hy);
  ctx.closePath();
  ctx.fill();
  // right ear
  ctx.beginPath();
  ctx.moveTo(hx + 5 * S,   hy);
  ctx.lineTo(hx + 6.5 * S, hy - 2.5 * S);
  ctx.lineTo(hx + 7 * S,   hy);
  ctx.closePath();
  ctx.fill();

  // inner ear pink
  ctx.fillStyle = "#ffaabb";
  ctx.beginPath();
  ctx.moveTo(hx + 1.3 * S, hy - 0.2 * S);
  ctx.lineTo(hx + 1.8 * S, hy - 1.8 * S);
  ctx.lineTo(hx + 2.7 * S, hy - 0.2 * S);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + 5.3 * S, hy - 0.2 * S);
  ctx.lineTo(hx + 6.2 * S, hy - 1.8 * S);
  ctx.lineTo(hx + 6.7 * S, hy - 0.2 * S);
  ctx.closePath();
  ctx.fill();

  // ── Eyes ───────────────────────────────────────────────────────────────────
  ctx.fillStyle = "#111111";
  ctx.fillRect(hx + 1.5 * S, hy + 1.5 * S, 1.5 * S, 1.5 * S);
  ctx.fillRect(hx + 5 * S,   hy + 1.5 * S, 1.5 * S, 1.5 * S);

  // ── Mouth (tiny pixel W) ───────────────────────────────────────────────────
  ctx.fillStyle = "#111111";
  ctx.fillRect(hx + 1.5 * S, hy + 4.8 * S, 0.9 * S, 0.9 * S);
  ctx.fillRect(hx + 3 * S,   hy + 4.2 * S, 0.9 * S, 0.9 * S);
  ctx.fillRect(hx + 4.5 * S, hy + 4.8 * S, 0.9 * S, 0.9 * S);

  // ── Cheek blushes ──────────────────────────────────────────────────────────
  ctx.fillStyle = "#ff9ab5";
  ctx.globalAlpha = alpha * 0.5;
  ctx.beginPath();
  ctx.arc(hx + 0.8 * S, hy + 4.5 * S, 1.3 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx + 7.2 * S, hy + 4.5 * S, 1.3 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;

  // ── Whiskers ───────────────────────────────────────────────────────────────
  ctx.strokeStyle = "#777777";
  ctx.lineWidth    = 0.5 * S;
  ctx.globalAlpha  = alpha * 0.6;
  ctx.beginPath();
  ctx.moveTo(hx,        hy + 3 * S); ctx.lineTo(hx - 3 * S,      hy + 2 * S);
  ctx.moveTo(hx,        hy + 4 * S); ctx.lineTo(hx - 3 * S,      hy + 5 * S);
  ctx.moveTo(hx + hw,   hy + 3 * S); ctx.lineTo(hx + hw + 3 * S, hy + 2 * S);
  ctx.moveTo(hx + hw,   hy + 4 * S); ctx.lineTo(hx + hw + 3 * S, hy + 5 * S);
  ctx.stroke();

  ctx.restore(); // also restores globalAlpha and transform
}

// ── Component ────────────────────────────────────────────────────────────────
type NyanState = {
  startX: number;
  startY: number;
  dx: number;       // normalized direction x
  dy: number;       // normalized direction y
  speed: number;    // px/ms
  startTime: number;
  duration: number; // ms until considered off-screen
  facingRight: boolean;
};

const NyanCatEasterEgg = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let nyan: NyanState | null  = null;
    let nextNyanAt               = -1;   // set on first frame

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const spawnNyan = (now: number) => {
      const W = canvas.width;
      const H = canvas.height;

      const facingRight  = Math.random() < 0.5;
      const speed        = 0.07 + Math.random() * 0.04; // 70–110 px/s

      // Slight angle (±25°) so it "wanders" rather than flying straight
      const angle        = (Math.random() - 0.5) * (Math.PI / 3.6);
      const dxBase       = Math.cos(angle);
      const dyBase       = Math.sin(angle) * (Math.random() < 0.5 ? 1 : -1);

      const dx           = facingRight ? dxBase  : -dxBase;
      const dy           = dyBase;

      // Start position: off the correct edge, random vertical slice
      const margin       = 30 * S;
      const startX       = facingRight ? -margin : W + margin;
      const startY       = H * 0.12 + Math.random() * H * 0.76;

      // Duration: enough time to cross the full screen at current speed
      const duration     = (W + 2 * margin) / speed;

      nyan = { startX, startY, dx, dy, speed, startTime: now, duration, facingRight };
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Schedule first appearance 5 minutes after page load
      if (nextNyanAt === -1) nextNyanAt = time + INTERVAL_MS;

      if (!nyan && time >= nextNyanAt) spawnNyan(time);

      if (nyan) {
        const elapsed  = time - nyan.startTime;
        const progress = elapsed / nyan.duration;

        if (progress >= 1) {
          nyan       = null;
          nextNyanAt = time + INTERVAL_MS;
        } else {
          const x = nyan.startX + nyan.dx * nyan.speed * elapsed;
          const y = nyan.startY + nyan.dy * nyan.speed * elapsed;

          // Fade in during first 900ms, fade out in last 12% of travel
          const fadeIn  = Math.min(1, elapsed / 900);
          const fadeOut = progress > 0.88 ? Math.max(0, 1 - (progress - 0.88) / 0.12) : 1;
          const alpha   = fadeIn * fadeOut * 0.88;

          drawNyanCat(ctx, x, y, elapsed, alpha, nyan.facingRight);
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
      className="pointer-events-none fixed inset-0 z-[1]"
      aria-hidden="true"
    />
  );
};

export default NyanCatEasterEgg;
