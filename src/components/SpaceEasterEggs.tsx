import { useEffect, useRef } from "react";

type EffectType = "supernova" | "ufo" | "nebula" | "xwing";

// ── Timing ────────────────────────────────────────────────────────────────────
const TEST_MODE  = false;       // ← mude para false em produção
const MIN_GAP_MS = TEST_MODE ? 3_000  : 60_000;
const MAX_GAP_MS = TEST_MODE ? 6_000  : 180_000;

const SUPERNOVA_DURATION = 3200;
const NEBULA_DURATION    = 7000;

// ── X-Wing ────────────────────────────────────────────────────────────────────
const S = 1;

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

  const trailLen  = 90 * S;
  const trailRows = [-5 * S, -2.5 * S, 0, 2.5 * S, 5 * S];
  trailRows.forEach((ty, i) => {
    const intensity = i === 2 ? 0.35 : 0.18;
    const grad = ctx.createLinearGradient(-8 * S - trailLen, 0, -8 * S, 0);
    grad.addColorStop(0, `rgba(180,210,255,0)`);
    grad.addColorStop(1, `rgba(200,220,255,${intensity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(-8 * S - trailLen, ty - S * 0.18, trailLen, S * 0.36);
  });

  ctx.fillStyle = "#cdcdcd";
  ctx.fillRect(-8 * S, -S, 16 * S, 2 * S);
  ctx.fillStyle = "#888";
  ctx.fillRect(-5 * S, -S * 0.9, 9 * S, S * 0.35);
  ctx.fillRect(-5 * S,  S * 0.55, 9 * S, S * 0.35);
  ctx.fillStyle = "#4477aa";
  ctx.fillRect(4 * S, -S * 1.6, 3 * S, S * 1.6);
  ctx.fillStyle = "#b0b0b0";
  ctx.fillRect(7 * S, -S * 0.5, 3 * S, S);
  ctx.fillStyle = "#bebebe";
  ctx.fillRect(-S, -S * 4, 5 * S, S * 3);
  ctx.fillRect(-8 * S, -S * 7, 5 * S, S * 3);
  ctx.fillRect(-S,  S,      5 * S, S * 3);
  ctx.fillRect(-8 * S, S * 4, 5 * S, S * 3);
  ctx.fillStyle = "#777";
  ctx.fillRect(-S,     -S * 3.4, 5 * S, S * 0.4);
  ctx.fillRect(-8 * S, -S * 6.4, 5 * S, S * 0.4);
  ctx.fillRect(-S,      S * 3.0, 5 * S, S * 0.4);
  ctx.fillRect(-8 * S,  S * 6.0, 5 * S, S * 0.4);
  ctx.fillStyle = "#aaa";
  ctx.fillRect(3 * S, -S * 5,    9 * S, S * 0.45);
  ctx.fillRect(3 * S,  S * 4.55, 9 * S, S * 0.45);
  ctx.fillRect(-4 * S, -S * 8,   9 * S, S * 0.45);
  ctx.fillRect(-4 * S,  S * 7.55, 9 * S, S * 0.45);
  ctx.fillStyle = `rgba(255,55,55,${pulse * 0.9})`;
  const t = S * 0.9;
  ctx.fillRect(12 * S - t / 2, -S * 5.22, t, t);
  ctx.fillRect(12 * S - t / 2,  S * 4.32, t, t);
  ctx.fillRect( 5 * S - t / 2, -S * 8.22, t, t);
  ctx.fillRect( 5 * S - t / 2,  S * 7.32, t, t);
  const grd = ctx.createRadialGradient(-8 * S, 0, 0, -8 * S, 0, S * 3.2);
  grd.addColorStop(0,    `rgba(160,230,255,${pulse})`);
  grd.addColorStop(0.45, `rgba(80,150,255,${pulse * 0.55})`);
  grd.addColorStop(1,    "rgba(0,0,80,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(-8 * S, 0, S * 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── UFO ───────────────────────────────────────────────────────────────────────
const UFO_SCALE      = 0.22; // ← ajuste o tamanho do disco voador
const SUPERNOVA_SCALE = 0.22; // ← ajuste o tamanho da supernova

function drawUFO(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  elapsed: number,
  alpha: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(UFO_SCALE, UFO_SCALE);

  const beamPulse = Math.max(0, Math.sin(elapsed / 480));
  if (beamPulse > 0) {
    const bg = ctx.createLinearGradient(0, 14, 0, 64);
    bg.addColorStop(0, `rgba(140,255,140,${alpha * beamPulse * 0.22})`);
    bg.addColorStop(1, `rgba(80,255,80,0)`);
    ctx.beginPath();
    ctx.moveTo(-10, 14); ctx.lineTo(10, 14);
    ctx.lineTo(28, 64);  ctx.lineTo(-28, 64);
    ctx.closePath();
    ctx.fillStyle = bg;
    ctx.fill();
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.ellipse(0, 8, 38, 12, 0, 0, Math.PI * 2);
  const bodyG = ctx.createLinearGradient(0, -4, 0, 20);
  bodyG.addColorStop(0, "#c8d4e8");
  bodyG.addColorStop(0.5, "#8898b8");
  bodyG.addColorStop(1, "#506080");
  ctx.fillStyle = bodyG;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 3, 38, 6, 0, 0, Math.PI);
  ctx.strokeStyle = "rgba(220,238,255,0.40)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.ellipse(0, -1, 19, 12, 0, Math.PI, Math.PI * 2);
  const domeG = ctx.createRadialGradient(-4, -6, 1, 0, -2, 21);
  domeG.addColorStop(0, "rgba(200,232,255,0.92)");
  domeG.addColorStop(0.55, "rgba(80,148,228,0.72)");
  domeG.addColorStop(1, "rgba(36,76,164,0.32)");
  ctx.fillStyle = domeG;
  ctx.fill();
  ctx.strokeStyle = "rgba(160,212,255,0.32)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();

  const lightRGB: [number, number, number][] = [
    [255, 80, 80], [80, 255, 80], [80, 110, 255],
    [255, 255, 70], [255, 80, 220], [70, 255, 240], [255, 170, 60],
  ];
  lightRGB.forEach(([r, g, b], i) => {
    const angle = (i / lightRGB.length) * Math.PI * 2 + elapsed * 0.0028;
    const lx = Math.cos(angle) * 29;
    const ly = 8 + Math.sin(angle) * 5;
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.005 + i * 0.9);
    ctx.save();
    ctx.globalAlpha = alpha * pulse;
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 6);
    lg.addColorStop(0, `rgba(${r},${g},${b},0.75)`);
    lg.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.beginPath(); ctx.arc(lx, ly, 6, 0, Math.PI * 2);
    ctx.fillStyle = lg; ctx.fill();
    ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fill();
    ctx.restore();
  });

  ctx.restore();
}

// ── Supernova ─────────────────────────────────────────────────────────────────
function drawSupernova(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  elapsed: number,
) {
  const p = Math.min(1, elapsed / SUPERNOVA_DURATION);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(SUPERNOVA_SCALE, SUPERNOVA_SCALE);
  ctx.translate(-cx, -cy);

  // Fase 1 — Flash central (0–9%): branco puro com blend aditivo
  if (p < 0.09) {
    const t  = p / 0.09;
    const fr = 2 + t * 28;
    const fa = Math.pow(1 - t, 0.6) * 0.92;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, fr * 2.2);
    fg.addColorStop(0,    `rgba(255,255,255,${fa})`);
    fg.addColorStop(0.18, `rgba(255,245,180,${fa * 0.85})`);
    fg.addColorStop(0.55, `rgba(255,150,50,${fa * 0.40})`);
    fg.addColorStop(1,    `rgba(255,60,5,0)`);
    ctx.beginPath();
    ctx.arc(cx, cy, fr * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.restore();
  }

  // Fase 2 — Shell expansivo colorido (5–88%)
  if (p > 0.05 && p < 0.90) {
    const sp    = Math.max(0, Math.min(1, (p - 0.05) / 0.83));
    const shellR = 6 + sp * 68;
    const fade  = p > 0.62 ? Math.max(0, 1 - (p - 0.62) / 0.38) : 1;
    const hue   = 18 + sp * 22;       // laranja → amarelo conforme expande
    const lit   = 88 - sp * 28;       // clareia no início, escurece no fim
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const shellG = ctx.createRadialGradient(cx, cy, shellR * 0.65, cx, cy, shellR * 1.35);
    shellG.addColorStop(0,    `hsla(${hue + 25},100%,98%,0)`);
    shellG.addColorStop(0.35, `hsla(${hue + 12},100%,${lit}%,${0.62 * fade})`);
    shellG.addColorStop(0.62, `hsla(${hue},     100%,${lit - 12}%,${0.46 * fade})`);
    shellG.addColorStop(1,    `hsla(${hue - 15},80%,50%,0)`);
    ctx.beginPath();
    ctx.arc(cx, cy, shellR * 1.35, 0, Math.PI * 2);
    ctx.fillStyle = shellG;
    ctx.fill();
    ctx.restore();
  }

  // Fase 3 — Raios radiais / spikes (3–48%)
  if (p > 0.03 && p < 0.48) {
    const sp     = Math.min(1, (p - 0.03) / 0.45);
    const spikeA = (1 - sp) * 0.70;
    const inner  = sp * 7;
    const outer  = inner + sp * 40;
    ctx.save();
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * inner;
      const y1 = cy + Math.sin(angle) * inner;
      const x2 = cx + Math.cos(angle) * outer;
      const y2 = cy + Math.sin(angle) * outer;
      const hue = 25 + (i % 5) * 16;
      const sg = ctx.createLinearGradient(x1, y1, x2, y2);
      sg.addColorStop(0, `hsla(${hue},100%,95%,${spikeA})`);
      sg.addColorStop(1, `hsla(${hue + 20},90%,70%,0)`);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = sg;
      ctx.lineWidth   = Math.max(0.3, 1.6 * (1 - sp));
      ctx.stroke();
    }
    ctx.restore();
  }

  // Fase 4 — 48 partículas com trail (5–96%)
  if (p > 0.05 && p < 0.96) {
    const pp = Math.min(1, (p - 0.05) / 0.88);
    for (let i = 0; i < 48; i++) {
      // "random" determinístico por índice
      const baseAngle  = (i / 48) * Math.PI * 2;
      const jitter     = ((i * 7 + 3) % 11) / 11 * 0.38 - 0.19;
      const angle      = baseAngle + jitter;
      const speedMult  = 0.50 + ((i * 13 + 5) % 17) / 17 * 0.90;
      const maxDist    = 40 + ((i * 11 + 7) % 13) * 4.5;
      const dist       = pp * speedMult * maxDist;
      const trailStart = Math.max(0, dist - 6 - pp * 14);
      const pFade      = p > 0.54 ? Math.max(0, 1 - (p - 0.54) / 0.46) : 1;
      const pA         = (1 - pp * 0.62) * pFade * 0.88;
      if (pA < 0.01) continue;
      const hue = 14 + (i % 8) * 18;
      const px  = cx + Math.cos(angle) * dist;
      const py  = cy + Math.sin(angle) * dist;
      const tx  = cx + Math.cos(angle) * trailStart;
      const ty  = cy + Math.sin(angle) * trailStart;
      // Trail
      const tg = ctx.createLinearGradient(tx, ty, px, py);
      tg.addColorStop(0, `hsla(${hue},100%,82%,0)`);
      tg.addColorStop(1, `hsla(${hue},100%,92%,${pA * 0.65})`);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(px, py);
      ctx.strokeStyle = tg;
      ctx.lineWidth   = 0.7 + (i % 3) * 0.35;
      ctx.stroke();
      // Cabeça
      ctx.beginPath();
      ctx.arc(px, py, 1.1 + (i % 4) * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue},100%,94%,${pA})`;
      ctx.fill();
    }
  }

  // Fase 5 — Glowing remnant (42–100%)
  if (p > 0.42) {
    const rp   = (p - 0.42) / 0.58;
    const remR = 18 + rp * 30;
    const remA = Math.sin(rp * Math.PI) * 0.22;
    if (remA > 0.004) {
      const rg = ctx.createRadialGradient(cx, cy, remR * 0.5, cx, cy, remR * 1.7);
      rg.addColorStop(0,   `rgba(255,110,20,0)`);
      rg.addColorStop(0.5, `rgba(255,85,10,${remA})`);
      rg.addColorStop(1,   `rgba(200,35,5,0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, remR * 1.7, 0, Math.PI * 2);
      ctx.fillStyle = rg;
      ctx.fill();
    }
  }

  ctx.restore();
}

// ── Nebula ────────────────────────────────────────────────────────────────────
type NebulaBlob = { dx: number; dy: number; rx: number; ry: number; hue: number; phase: number };

function makeNebulaBlobs(): NebulaBlob[] {
  return Array.from({ length: 4 + Math.floor(Math.random() * 3) }, (_, i) => ({
    dx: (Math.random() - 0.5) * 90,    dy: (Math.random() - 0.5) * 55,
    rx: 36 + Math.random() * 42,       ry: 24 + Math.random() * 30,
    hue: 195 + Math.floor(Math.random() * 165),
    phase: (i / 6) * Math.PI * 2 + Math.random(),
  }));
}

function drawNebula(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  elapsed: number, alpha: number,
  blobs: NebulaBlob[],
) {
  for (const blob of blobs) {
    const pulse = 0.68 + 0.32 * Math.sin(elapsed * 0.0009 + blob.phase);
    const blobA = alpha * 0.20 * pulse;
    if (blobA < 0.005) continue;
    const bx = cx + blob.dx + Math.sin(elapsed * 0.00028 + blob.phase) * 7;
    const by = cy + blob.dy + Math.cos(elapsed * 0.00035 + blob.phase) * 5;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(blob.phase * 0.18 + elapsed * 0.00004);
    ctx.scale(1, blob.ry / blob.rx);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, blob.rx);
    grad.addColorStop(0,   `hsla(${blob.hue},72%,72%,${blobA})`);
    grad.addColorStop(0.5, `hsla(${blob.hue + 20},62%,60%,${blobA * 0.5})`);
    grad.addColorStop(1,   `hsla(${blob.hue + 40},52%,50%,0)`);
    ctx.beginPath();
    ctx.arc(0, 0, blob.rx, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }
}

// ── Effect types ──────────────────────────────────────────────────────────────
type BaseEff   = { type: EffectType; startTime: number; x: number; y: number };
type UFOEff    = BaseEff & { type: "ufo";      startX: number; facingRight: boolean; speed: number; duration: number };
type NovaEff   = BaseEff & { type: "supernova" };
type NebEff    = BaseEff & { type: "nebula";   blobs: NebulaBlob[] };
type XWingEff  = BaseEff & { type: "xwing";    startX: number; facingRight: boolean; speed: number; duration: number };
type AnyEff    = UFOEff | NovaEff | NebEff | XWingEff;

const effectDuration = (e: AnyEff) => {
  if (e.type === "supernova") return SUPERNOVA_DURATION;
  if (e.type === "nebula")    return NEBULA_DURATION;
  return e.duration; // ufo e xwing calculam a própria duração
};

// ── Component ─────────────────────────────────────────────────────────────────
const SpaceEasterEggs = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let effect: AnyEff | null       = null;
    let nextAt                      = -1;
    let lastType: EffectType | null = null;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };

    const pickType = (): EffectType => {
      const all: EffectType[] = ["supernova", "ufo", "nebula", "xwing"];
      const pool = lastType ? all.filter((t) => t !== lastType) : all;
      return pool[Math.floor(Math.random() * pool.length)];
    };

    const spawnFlyby = (type: "ufo" | "xwing", now: number): UFOEff | XWingEff => {
      const W           = canvas.width;
      const H           = canvas.height;
      const facingRight = Math.random() < 0.5;
      const margin      = 80;
      const startX      = facingRight ? -margin : W + margin;
      const y           = H * 0.06 + Math.random() * H * 0.42;
      const speed       = type === "xwing"
        ? 1.2 + Math.random() * 0.4   // X-Wing: rápido (px/ms)
        : 0.095 + Math.random() * 0.055; // UFO: lento
      const duration    = (W + 2 * margin) / speed;
      return { type, startTime: now, x: 0, y, startX, facingRight, speed, duration };
    };

    const spawnEffect = (now: number) => {
      const W    = canvas.width;
      const H    = canvas.height;
      const type = pickType();
      lastType   = type;

      if (type === "ufo" || type === "xwing") {
        effect = spawnFlyby(type, now);
      } else if (type === "supernova") {
        const m = 110;
        effect  = { type: "supernova", startTime: now, x: m + Math.random() * (W - 2 * m), y: m + Math.random() * (H * 0.68) };
      } else {
        const m = 130;
        effect  = { type: "nebula", startTime: now, x: m + Math.random() * (W - 2 * m), y: m + Math.random() * (H - 2 * m), blobs: makeNebulaBlobs() };
      }
    };

    const nextGap = () => MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS);

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (nextAt === -1) nextAt = time + nextGap();
      if (!effect && time >= nextAt) spawnEffect(time);

      if (effect) {
        const elapsed  = time - effect.startTime;
        const duration = effectDuration(effect);
        const progress = elapsed / duration;

        if (progress >= 1) {
          effect = null;
          nextAt = time + nextGap();
        } else if (effect.type === "supernova") {
          drawSupernova(ctx, effect.x, effect.y, elapsed);
        } else if (effect.type === "nebula") {
          const fadeIn  = Math.min(1, progress / 0.10);
          const fadeOut = progress > 0.86 ? Math.max(0, 1 - (progress - 0.86) / 0.14) : 1;
          drawNebula(ctx, effect.x, effect.y, elapsed, fadeIn * fadeOut, effect.blobs);
        } else {
          const fadeIn  = Math.min(1, elapsed / 380);
          const fadeOut = progress > 0.86 ? Math.max(0, 1 - (progress - 0.86) / 0.14) : 1;
          const alpha   = fadeIn * fadeOut * 0.95;
          const dx      = effect.facingRight ? 1 : -1;
          const x       = effect.startX + dx * effect.speed * elapsed;
          if (effect.type === "xwing") {
            drawXWing(ctx, x, effect.y, elapsed, alpha, effect.facingRight);
          } else {
            drawUFO(ctx, x, effect.y, elapsed, alpha);
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    resize();
    animId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[2]" aria-hidden="true" />;
};

export default SpaceEasterEggs;
