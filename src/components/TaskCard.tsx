import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal, flushSync } from "react-dom";
import { GripVertical, Pencil, Trash2, ArrowRight, Eye, Clock, CalendarRange, ListChecks, ChevronDown, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Task, TaskStatus, PRIORITIES } from "@/types/task";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Draggable } from "@hello-pangea/dnd";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useSettings } from "@/store/settingsStore";
import { useTaskContext } from "@/store/taskStore";

// ---------------------------------------------------------------------------
// Drag particles — tiny glowing dots rendered inside the card while dragging.
// The canvas lives inside the card element so it moves with it automatically.
// ---------------------------------------------------------------------------
const DragParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    const w = parent?.clientWidth  ?? 300;
    const h = parent?.clientHeight ?? 80;
    canvas.width  = w;
    canvas.height = h;

    type P = {
      x: number; y: number;
      vx: number; vy: number;
      life: number; maxLife: number;
      size: number; hue: number;
    };
    const parts: P[] = [];
    let id: number;

    const tick = () => {
      ctx.clearRect(0, 0, w, h);

      // Emit ~1 particle per frame
      if (Math.random() < 0.7) {
        parts.push({
          x:       6 + Math.random() * (w - 12),
          y:       6 + Math.random() * (h - 12),
          vx:      (Math.random() - 0.5) * 0.4,
          vy:      -(0.2 + Math.random() * 0.5),
          life:    20 + Math.random() * 30,
          maxLife: 50,
          size:    0.6 + Math.random() * 1.4,
          hue:     265 + Math.floor(Math.random() * 55),
        });
      }

      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        const a = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.size * a), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 95%, 88%, ${a * 0.9})`;
        ctx.fill();
      }

      // Remove dead particles (reverse splice to preserve indices)
      let i = parts.length;
      while (i--) { if (parts[i].life <= 0) parts.splice(i, 1); }

      id = requestAnimationFrame(tick);
    };

    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []); // runs once on mount — canvas lives as long as the card is dragging

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    />
  );
};

// ---------------------------------------------------------------------------
// Portal Exit canvas — swirling vortex that sucks the card into it
// ---------------------------------------------------------------------------
const PortalExitCanvas = ({ onComplete }: { onComplete: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calledRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const DURATION = 650;

    type Swirler = {
      angle: number;
      radius: number;
      L: number;        // conserved angular momentum: L = r² * ω
      pullBase: number; // base inward speed px/frame@60fps
      size: number;
      hue: number;
      alpha: number;
    };

    const swirlers: Swirler[] = [];
    let nextSpawn = 0;

    const spawnSwirler = (radiusOverride?: number) => {
      const r = radiusOverride ?? (42 + Math.random() * 58);
      const omega0 = 0.036 + Math.random() * 0.032;
      swirlers.push({
        angle:    Math.random() * Math.PI * 2,
        radius:   r,
        L:        r * r * omega0,
        pullBase: 0.38 + Math.random() * 0.52,
        size:     0.8 + Math.random() * 2.3,
        hue:      168 + Math.floor(Math.random() * 82),
        alpha:    0.55 + Math.random() * 0.42,
      });
    };

    // Initial batch spread across radii so canvas is full from frame 1
    for (let i = 0; i < 24; i++) spawnSwirler(8 + Math.random() * 92);

    const start = performance.now();
    let prev = start;
    let animId: number;

    // endFade window: canvas fades to transparent between p=0.65 and p=0.88.
    // onComplete fires as soon as endFade hits 0, deferred one RAF so the
    // React state update doesn't stutter inside an active animation frame.
    const FADE_START = 0.65;
    const FADE_END   = 0.88;

    const draw = (now: number) => {
      const elapsed = now - start;
      const dt      = Math.min(now - prev, 32);
      prev = now;
      const p = Math.min(1, elapsed / DURATION);

      // Global transparency envelope — everything rendered this frame is
      // multiplied by endFade, guaranteeing the last visible frame is clear.
      const endFade = p >= FADE_END
        ? 0
        : p > FADE_START
          ? 1 - (p - FADE_START) / (FADE_END - FADE_START)
          : 1;

      ctx.clearRect(0, 0, W, H);

      // Stop spawning at FADE_START so no new particle outlives the fade
      if (p < FADE_START && elapsed > nextSpawn) {
        const count = p < 0.25 ? 3 : 2;
        for (let i = 0; i < count; i++) spawnSwirler();
        nextSpawn = elapsed + 50;
      }

      // Inward pull accelerates over time
      const accel = 1 + p * p * 6;

      // ── Swirlers ─────────────────────────────────────────────────────────
      for (let i = swirlers.length - 1; i >= 0; i--) {
        const s = swirlers[i];

        s.radius -= s.pullBase * accel * (dt / 16);
        if (s.radius < 1.5) { swirlers.splice(i, 1); continue; }

        // ω = L / r² — angular momentum conservation
        s.angle += (s.L / (s.radius * s.radius)) * (dt / 16);

        const px = cx + Math.cos(s.angle) * s.radius;
        const py = cy + Math.sin(s.angle) * s.radius * 0.44;

        const centerFade = Math.min(1, (s.radius - 1.5) / 16);
        const a = s.alpha * centerFade * endFade;
        if (a < 0.01) continue;

        const sz = Math.max(0.1, s.size * (0.32 + s.radius / 105));
        ctx.shadowBlur  = sz * 7;
        ctx.shadowColor = `hsla(${s.hue}, 100%, 82%, ${a * 0.72})`;
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 95%, 90%, ${a})`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // ── Vortex core ───────────────────────────────────────────────────────
      // Peaks at p=0.5, fades naturally before FADE_END
      const coreEnv = Math.sin(Math.min(p, FADE_START) / FADE_START * Math.PI) * endFade;
      if (coreEnv > 0.03) {
        const coreR = 3 + coreEnv * 15;
        const grad  = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.5);
        grad.addColorStop(0,    `hsla(185, 100%, 92%, ${coreEnv * 0.88})`);
        grad.addColorStop(0.30, `hsla(200, 95%,  72%, ${coreEnv * 0.50})`);
        grad.addColorStop(0.65, `hsla(220, 85%,  58%, ${coreEnv * 0.18})`);
        grad.addColorStop(1,    `hsla(240, 75%,  45%, 0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, coreR * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, coreR * 1.55, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(185, 100%, 82%, ${coreEnv * 0.75})`;
        ctx.lineWidth   = 1.4 * endFade;
        ctx.stroke();
      }

      // ── Collapse flash ────────────────────────────────────────────────────
      // Peaks at p≈0.72 (mid-way through fade window) and is gone by FADE_END
      const FLASH_START = FADE_START - 0.02; // 0.63
      const FLASH_END   = FADE_END   - 0.02; // 0.86
      if (p > FLASH_START && p < FLASH_END) {
        const t      = (p - FLASH_START) / (FLASH_END - FLASH_START);
        const flashA = Math.sin(t * Math.PI) * 0.88 * endFade;
        if (flashA > 0.01) {
          const flashR = 16 - t * 3;
          const fg     = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, flashR));
          fg.addColorStop(0,    `rgba(190, 255, 255, ${flashA})`);
          fg.addColorStop(0.45, `rgba(90,  190, 235, ${flashA * 0.50})`);
          fg.addColorStop(1,    `rgba(30,  90,  175, 0)`);
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1, flashR * 1.8), 0, Math.PI * 2);
          ctx.fillStyle = fg;
          ctx.fill();
        }
      }

      // ── Completion ────────────────────────────────────────────────────────
      // Fire as soon as the canvas is visually empty (endFade=0), not at DURATION.
      // Call directly (no RAF wrapper) — the caller uses flushSync so React commits
      // the dest card in the same frame, eliminating the blank-frame gap.
      if (endFade <= 0 || p >= 1) {
        if (!calledRef.current) {
          calledRef.current = true;
          onCompleteRef.current();
        }
        return;
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={220}
      aria-hidden="true"
      className="pointer-events-none block"
    />
  );
};

// ---------------------------------------------------------------------------
// Portal Entry canvas — portal opens and particles scatter outward
// ---------------------------------------------------------------------------
const PortalEntryCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const DURATION = 520;

    type Scatterer = {
      angle: number; radius: number;
      speed: number; size: number; hue: number;
    };

    const scatterers: Scatterer[] = Array.from({ length: 32 }, () => {
      const angle = Math.random() * Math.PI * 2;
      return {
        angle,
        radius: 2 + Math.random() * 8,
        speed: 2.2 + Math.random() * 4.5,
        size: 0.7 + Math.random() * 2.0,
        hue: 168 + Math.floor(Math.random() * 80),
      };
    });

    const start = performance.now();
    let animId: number;

    const draw = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / DURATION);
      ctx.clearRect(0, 0, W, H);

      // Portal disc — expands then fades
      const discPhase = p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75;
      const discR = p * 58;
      const disc = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, discR * 2));
      disc.addColorStop(0,    `hsla(185, 100%, 80%, ${discPhase * 0.85})`);
      disc.addColorStop(0.35, `hsla(200, 90%, 65%, ${discPhase * 0.45})`);
      disc.addColorStop(1,    `hsla(225, 75%, 50%, 0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, discR * 2), 0, Math.PI * 2);
      ctx.fillStyle = disc;
      ctx.fill();

      // Expanding ring
      if (discR > 1) {
        ctx.beginPath();
        ctx.arc(cx, cy, discR * 1.3, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(185, 100%, 82%, ${discPhase * 0.9})`;
        ctx.lineWidth = 2.2 * (1 - p);
        ctx.stroke();
      }

      // Scattering particles
      for (const s of scatterers) {
        s.radius += s.speed * 0.85;
        const px = cx + Math.cos(s.angle) * s.radius;
        const py = cy + Math.sin(s.angle) * s.radius * 0.55;
        const a = (1 - p) * 0.9;
        if (a <= 0) continue;

        const glow = ctx.createRadialGradient(px, py, 0, px, py, s.size * 3.5);
        glow.addColorStop(0, `hsla(${s.hue}, 100%, 88%, ${a * 0.65})`);
        glow.addColorStop(1, `hsla(${s.hue}, 90%, 65%, 0)`);
        ctx.beginPath();
        ctx.arc(px, py, s.size * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.1, s.size * (1 - p * 0.4)), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 95%, 92%, ${a})`;
        ctx.fill();
      }

      if (p < 1) animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={380}
      height={220}
      aria-hidden="true"
      className="pointer-events-none block"
    />
  );
};

// ---------------------------------------------------------------------------
// Big Bang canvas — bursts of particles when a new card is created
// ---------------------------------------------------------------------------
const BigBangCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const DURATION = 950;
    // Friction decay rate equivalent to multiplying velocity by 0.952 each frame at 60fps
    const DECAY = 2.95; // per second

    type Particle = {
      angle: number;
      speed: number;  // px/s
      endP: number;   // progress (0..1) at which particle fully fades
      size: number;
      hue: number;
    };

    // Pre-generate particles with time-based parameters
    const particles: Particle[] = Array.from({ length: 55 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 72 + Math.random() * 330, // px/s (equivalent to original 1.2–6.7 px/frame at 60fps)
      endP:  0.40 + Math.random() * 0.60,
      size:  0.8 + Math.random() * 2.5,
      hue:   215 + Math.floor(Math.random() * 115),
    }));

    let animId: number;

    // No internal delay needed — the parent captures entryPos only after the
    // TaskDialog has fully closed (~210ms), so this canvas mounts at the right
    // moment and can start drawing on the first frame.
    const start = performance.now();

    const draw = (now: number) => {
        const elapsed = now - start;
        const p = Math.min(1, elapsed / DURATION);

        // Reset shadow state at start of each frame
        ctx.shadowBlur = 0;
        ctx.clearRect(0, 0, W, H);

        // Bright flash at center (0–18%)
        if (p < 0.18) {
          const t = p / 0.18;
          const flashA = 1 - t;
          const flashR = 6 + t * cx * 0.9;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
          g.addColorStop(0,    `rgba(255,255,255,${flashA})`);
          g.addColorStop(0.15, `rgba(220,180,255,${flashA * 0.9})`);
          g.addColorStop(0.50, `rgba(130,60,220,${flashA * 0.5})`);
          g.addColorStop(1,    `rgba(70,20,160,0)`);
          ctx.beginPath();
          ctx.arc(cx, cy, flashR, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }

        // Two expanding shockwave rings
        for (let ri = 0; ri < 2; ri++) {
          const rp = p - ri * 0.08;
          if (rp > 0 && rp < 0.70) {
            const t = rp / 0.70;
            const ringR = t * Math.max(W, H) * 0.62;
            const ringA = (1 - t) * (ri === 0 ? 0.75 : 0.45);
            ctx.beginPath();
            ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(275,100%,85%,${ringA})`;
            ctx.lineWidth = (2.5 - ri * 0.8) * (1 - t * 0.65);
            ctx.stroke();
          }
        }

        // Time-based burst particles — position derived from elapsed time, not frame count
        const elapsedSec = elapsed / 1000;
        for (const pt of particles) {
          const localP = p / pt.endP;
          if (localP <= 0 || localP >= 1) continue;

          // Decelerated distance: integral of v0*e^(-DECAY*t) = (v0/DECAY)*(1 - e^(-DECAY*t))
          const dist = (pt.speed / DECAY) * (1 - Math.exp(-DECAY * elapsedSec));
          const x = cx + Math.cos(pt.angle) * dist;
          const y = cy + Math.sin(pt.angle) * dist * 0.88;

          const a = Math.max(0, 1 - localP);
          const size = Math.max(0.1, pt.size * (1 - localP * 0.35));

          // Use shadowBlur for glow — one draw call per particle instead of createRadialGradient
          ctx.shadowBlur = size * 9;
          ctx.shadowColor = `hsla(${pt.hue},90%,78%,${a * 0.75})`;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${pt.hue},95%,92%,${a})`;
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        if (p < 1) animId = requestAnimationFrame(draw);
      };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={380}
      height={220}
      aria-hidden="true"
      className="pointer-events-none block"
    />
  );
};

// ---------------------------------------------------------------------------
// Black hole canvas — mounts when a card is being deleted
// ---------------------------------------------------------------------------
const BlackHoleCanvas = ({ onComplete }: { onComplete: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calledRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const DURATION = 1200; // ms — total black hole lifetime
    const MAX_R = 46;      // event horizon radius at peak (px)

    // Pre-generate orbital particle props so they don't flicker
    const particles = Array.from({ length: 16 }, (_, i) => ({
      baseAngle: (i / 16) * Math.PI * 2,
      rOffset: (Math.random() - 0.5) * 10,
      alpha: 0.35 + Math.random() * 0.55,
      size: 0.7 + Math.random() * 1.3,
    }));

    const start = performance.now();
    let animId: number;

    const draw = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / DURATION);

      ctx.clearRect(0, 0, W, H);

      // ── Phase curve ──────────────────────────────────────────────────────
      // 0–20 %: black hole opens  (smoothstep ease-in)
      // 20–72 %: peak              (full size while card is sucked in)
      // 72–100 %: closes           (smoothstep ease-out)
      let r: number;
      let g: number; // glow intensity 0-1

      if (p < 0.20) {
        const t = p / 0.20;
        const e = t * t * (3 - 2 * t); // smoothstep
        r = MAX_R * e;
        g = e;
      } else if (p < 0.72) {
        r = MAX_R;
        g = 1;
      } else {
        const t = (p - 0.72) / 0.28;
        const e = t * t * (3 - 2 * t);
        r = MAX_R * (1 - e);
        g = 1 - e;
      }

      if (r > 0.5) {
        // ── Outer ambient glow ──────────────────────────────────────────────
        const og = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 3.2);
        og.addColorStop(0,   `hsla(270, 90%, 62%, ${0.38 * g})`);
        og.addColorStop(0.45, `hsla(260, 80%, 50%, ${0.16 * g})`);
        og.addColorStop(1,   `hsla(250, 70%, 40%, 0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = og;
        ctx.fill();

        // ── Accretion disk ring ─────────────────────────────────────────────
        const rg = ctx.createRadialGradient(cx, cy, r * 0.80, cx, cy, r * 1.75);
        rg.addColorStop(0,    `hsla(278, 100%, 80%, ${0.95 * g})`);
        rg.addColorStop(0.22, `hsla(265, 92%, 66%, ${0.80 * g})`);
        rg.addColorStop(0.60, `hsla(255, 82%, 53%, ${0.38 * g})`);
        rg.addColorStop(1,    `hsla(245, 70%, 42%, 0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.75, 0, Math.PI * 2);
        ctx.fillStyle = rg;
        ctx.fill();

        // ── Orbiting particles (perspective-flattened ellipse) ──────────────
        const orbitR = r * 1.32;
        const spinSpeed = 0.0024; // rad/ms
        particles.forEach((pt) => {
          const a = pt.baseAngle + elapsed * spinSpeed;
          const pr = orbitR + pt.rOffset;
          const px = cx + Math.cos(a) * pr;
          const py = cy + Math.sin(a) * pr * 0.38; // flatten → disk perspective
          ctx.beginPath();
          ctx.arc(px, py, pt.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(282, 100%, 88%, ${pt.alpha * g})`;
          ctx.fill();
        });

        // ── Event horizon (dark filled circle) ─────────────────────────────
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = "hsl(230, 35%, 2%)";
        ctx.fill();

        // ── Bright photon-sphere edge ───────────────────────────────────────
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(283, 100%, 88%, ${0.90 * g})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      if (p >= 1) {
        if (!calledRef.current) {
          calledRef.current = true;
          onCompleteRef.current();
        }
      } else {
        animId = requestAnimationFrame(draw);
      }
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []); // runs once on mount — intentional

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={220}
      className="pointer-events-none block"
      aria-hidden="true"
    />
  );
};

// ---------------------------------------------------------------------------
// TaskCard
// ---------------------------------------------------------------------------
interface TaskCardProps {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, status: TaskStatus) => void;
  isNew?: boolean;
  isPortalIn?: boolean;
}

const TaskCard = ({ task, index, onEdit, onDelete, onMove, isNew, isPortalIn }: TaskCardProps) => {
  const { animationsEnabled, checklistExpandedByDefault } = useSettings();
  const { updateTask, boards } = useTaskContext();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [checklistExpanded, setChecklistExpanded] = useState(() => checklistExpandedByDefault);
  useEffect(() => { setChecklistExpanded(checklistExpandedByDefault); }, [checklistExpandedByDefault]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTeleporting, setIsTeleporting] = useState(false);
  const [teleportDest, setTeleportDest] = useState<TaskStatus | null>(null);
  const [exitPos, setExitPos] = useState<{ x: number; y: number } | null>(null);
  const [entryPos, setEntryPos] = useState<{ x: number; y: number } | null>(null);
  // cardRef sits on the absolute inset-0 overlay; its parentElement is the
  // in-flow Draggable wrapper — used for reliable getBoundingClientRect.
  const cardRef = useRef<HTMLDivElement>(null);
  const otherColumns = boards.filter((col) => col.id !== task.status);

  const getCardCenter = () => {
    const el = cardRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  // Portal-in (card moved from another column) — no dialog is involved, so we
  // can capture the position immediately after the browser paints.
  useLayoutEffect(() => {
    if (!isPortalIn || !animationsEnabled) return;
    (cardRef.current?.parentElement ?? cardRef.current)?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
    const id = requestAnimationFrame(() => {
      const pos = getCardCenter();
      if (pos) setEntryPos(pos);
    });
    return () => cancelAnimationFrame(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPortalIn]);

  // New task (created from TaskDialog) — the dialog's close animation runs for
  // ~200ms while Radix still holds scrollbar-compensation padding-right on the
  // body. Delaying the capture by 210ms ensures we read the card's final
  // viewport position. BigBangCanvas removes its matching internal delay so the
  // animation starts the moment entryPos is ready.
  useLayoutEffect(() => {
    if (!isNew || !animationsEnabled) return;
    (cardRef.current?.parentElement ?? cardRef.current)?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
    const id = setTimeout(() => {
      requestAnimationFrame(() => {
        const pos = getCardCenter();
        if (pos) setEntryPos(pos);
      });
    }, 210);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew]);

  const toggleChecklistItem = (itemId: string) => {
    const updated = (task.checklist ?? []).map((i) =>
      i.id === itemId ? { ...i, done: !i.done } : i
    );
    updateTask(task.id, { checklist: updated });
  };

  const handleMoveClick = (destStatus: TaskStatus) => {
    if (!animationsEnabled) {
      onMove(task.id, destStatus);
      return;
    }
    setExitPos(getCardCenter());
    setTeleportDest(destStatus);
    setIsTeleporting(true);
  };

  const handlePortalExitComplete = () => {
    if (teleportDest) flushSync(() => onMove(task.id, teleportDest));
  };

  const handleDeleteClick = () => setDeleteOpen(true);

  const handleConfirmDelete = () => {
    setDeleteOpen(false);
    if (!animationsEnabled) {
      onDelete(task.id);
      return;
    }
    // Wait for AlertDialog close animation (~200ms) and Radix scrollbar-
    // compensation removal before capturing position and starting animation.
    setTimeout(() => {
      setExitPos(getCardCenter());
      setIsDeleting(true);
    }, 220);
  };

  return (
    <>
      <Draggable draggableId={task.id} index={index} isDragDisabled={isDeleting || isTeleporting}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`relative mb-2 ${isDeleting || isTeleporting ? "z-50" : ""}`}
          >
            <div ref={cardRef} className="absolute inset-0 pointer-events-none" />
            {isPortalIn && animationsEnabled && entryPos && createPortal(
              <div style={{ position: "fixed", left: entryPos.x - 190, top: entryPos.y - 110, pointerEvents: "none", zIndex: 200 }}>
                <PortalEntryCanvas />
              </div>,
              document.body
            )}
            {isNew && animationsEnabled && entryPos && createPortal(
              <div style={{ position: "fixed", left: entryPos.x - 190, top: entryPos.y - 110, pointerEvents: "none", zIndex: 200 }}>
                <BigBangCanvas />
              </div>,
              document.body
            )}
            {isDeleting && animationsEnabled && exitPos && createPortal(
              <div style={{ position: "fixed", left: exitPos.x - 150, top: exitPos.y - 110, pointerEvents: "none", zIndex: 200 }}>
                <BlackHoleCanvas onComplete={() => onDelete(task.id)} />
              </div>,
              document.body
            )}
            {isTeleporting && animationsEnabled && exitPos && createPortal(
              <div style={{ position: "fixed", left: exitPos.x - 150, top: exitPos.y - 110, pointerEvents: "none", zIndex: 200 }}>
                <PortalExitCanvas onComplete={handlePortalExitComplete} />
              </div>,
              document.body
            )}

            <Card
              className={`border-0 relative overflow-hidden ${
                isDeleting && animationsEnabled
                  ? "card-suck-in"
                  : isTeleporting && animationsEnabled
                  ? "card-portal-out"
                  : isPortalIn && animationsEnabled
                  ? "card-portal-in"
                  : isNew && animationsEnabled
                  ? "card-big-bang-in"
                  : `transition-all duration-200 ${
                      snapshot.isDragging
                        ? "glass-drag scale-[1.02] z-50"
                        : "glass hover:shadow-md hover:shadow-primary/10"
                    }`
              }`}
              style={snapshot.isDragging && !isDeleting ? {
                boxShadow: "0 0 0 2px hsla(265,60%,72%,0.5), 0 0 18px hsla(265,85%,75%,0.65), 0 0 45px hsla(265,80%,65%,0.3)"
              } : undefined}
            >
              {snapshot.isDragging && animationsEnabled && <DragParticles />}
              <CardContent className="flex items-start gap-2 p-3">
                <div {...provided.dragHandleProps} className="mt-1 cursor-grab text-accent-foreground/70">
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 h-[88px] overflow-hidden">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className={`font-medium text-sm text-foreground leading-snug cursor-default ${
                        task.description ? "line-clamp-1" : "line-clamp-2"
                      }`}>{task.title}</p>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-72 break-words text-xs leading-snug">
                      {task.title}
                    </TooltipContent>
                  </Tooltip>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {task.priority && (() => {
                      const p = PRIORITIES.find((pr) => pr.id === task.priority);
                      return p ? (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${p.badgeClass}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${p.dotClass}`} />
                          {p.label}
                        </span>
                      ) : null;
                    })()}
                    {task.recurrence && (() => {
                      const label: Record<string, string> = { daily: "daily", "daily-weekdays": "Mon–Fri", weekly: "weekly", monthly: "monthly" };
                      const limitStr = task.recurrence.limit !== undefined ? ` · ${task.recurrence.limit}×` : "";
                      return (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                          task.recurrence.enabled
                            ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                            : "bg-muted/30 text-muted-foreground border-border/30 opacity-60"
                        }`}>
                          <RefreshCw className="h-2 w-2" />
                          {(label[task.recurrence.type] ?? task.recurrence.type) + limitStr}
                        </span>
                      );
                    })()}
                  </div>
                  {task.description && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 cursor-default">{task.description}</p>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-72 break-words text-xs leading-snug">
                        {task.description.length > 180
                          ? <>{task.description.slice(0, 180)}… <span className="text-muted-foreground/60 italic">Open card to read more.</span></>
                          : task.description}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-accent-foreground/70 hover:text-primary" onClick={() => setViewOpen(true)} aria-label="View">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View</TooltipContent>
                  </Tooltip>
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-accent-foreground/70 hover:text-primary" aria-label="Move">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Move</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end">
                      {otherColumns.map((col) => (
                        <DropdownMenuItem key={col.id} onClick={() => handleMoveClick(col.id)}>
                          {col.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-accent-foreground/70 hover:text-primary" onClick={() => onEdit(task)} aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={handleDeleteClick} aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>

              {/* Inline checklist */}
              {task.checklist && task.checklist.length > 0 && (() => {
                const doneCount = task.checklist.filter((i) => i.done).length;
                const pct = (doneCount / task.checklist.length) * 100;
                return (
                  <div className="border-t border-border/20">
                    <button
                      onClick={() => setChecklistExpanded((v) => !v)}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-accent/20 transition-colors"
                    >
                      <ListChecks className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {doneCount}/{task.checklist.length}
                      </span>
                      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden mx-0.5">
                        <div
                          className="h-full rounded-full bg-primary/70 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <ChevronDown className={`h-3 w-3 text-muted-foreground/50 transition-transform duration-200 ${checklistExpanded ? "rotate-180" : ""}`} />
                    </button>
                    {checklistExpanded && (
                      <div className="px-3 pb-2 space-y-1.5">
                        {task.checklist.map((item) => (
                          <div key={item.id} className="flex items-start gap-2">
                            <Checkbox
                              id={`cl-${task.id}-${item.id}`}
                              checked={item.done}
                              onCheckedChange={() => toggleChecklistItem(item.id)}
                              className="h-3.5 w-3.5 mt-0.5 shrink-0"
                            />
                            <label
                              htmlFor={`cl-${task.id}-${item.id}`}
                              className={`text-xs cursor-pointer leading-snug select-none ${
                                item.done ? "line-through text-muted-foreground/50" : "text-foreground"
                              }`}
                            >
                              {item.text}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Planning footer — always rendered for uniform card height */}
              {(() => {
                const hasTime    = task.estimatedHours != null || task.estimatedMinutes != null;
                const hasDate    = !!(task.startDate || task.endDate);
                const hasPlanning = hasTime || hasDate;
                const footer = (
                  <div className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1.5 min-h-[27px] cursor-default ${hasPlanning ? "border-t border-border/20" : ""}`}>
                    {hasTime && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5 shrink-0" />
                        {task.estimatedHours ? `${task.estimatedHours}h` : ""}
                        {task.estimatedMinutes ? ` ${task.estimatedMinutes}m` : ""}
                      </span>
                    )}
                    {hasDate && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CalendarRange className="h-2.5 w-2.5 shrink-0" />
                        {task.startDate ? format(parseISO(task.startDate), "MMM d") : "—"}
                        {" → "}
                        {task.endDate ? format(parseISO(task.endDate), "MMM d") : "—"}
                      </span>
                    )}
                  </div>
                );
                if (!hasPlanning) return footer;
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>{footer}</TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs space-y-1">
                      {hasTime && (
                        <p className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          {[task.estimatedHours && `${task.estimatedHours}h`, task.estimatedMinutes && `${task.estimatedMinutes}m`].filter(Boolean).join(" ")}
                          <span className="text-muted-foreground/70">estimated</span>
                        </p>
                      )}
                      {hasDate && (
                        <p className="flex items-center gap-1.5">
                          <CalendarRange className="h-3 w-3 shrink-0" />
                          {task.startDate ? format(parseISO(task.startDate), "MMM d, yyyy") : "—"}
                          {" → "}
                          {task.endDate ? format(parseISO(task.endDate), "MMM d, yyyy") : "—"}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })()}

            </Card>
          </div>
        )}
      </Draggable>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task</AlertDialogTitle>
            <AlertDialogDescription className="break-all">
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg md:max-w-xl rounded-lg flex flex-col" style={{ maxHeight: "min(90dvh, 520px)" }}>
          <DialogHeader className="space-y-2 shrink-0">
            <DialogTitle className="text-base leading-snug break-all pr-6">
              {task.title}
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const col = boards.find((c) => c.id === task.status);
                return col ? (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {col.title}
                  </span>
                ) : null;
              })()}
              {task.priority && (() => {
                const p = PRIORITIES.find((pr) => pr.id === task.priority);
                return p ? (
                  <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${p.badgeClass}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${p.dotClass}`} />
                    {p.label}
                  </span>
                ) : null;
              })()}
            </div>
          </DialogHeader>
          <DialogDescription asChild>
            <div className="scrollbar-galaxy mt-1 space-y-3 overflow-y-auto overflow-x-hidden pr-1 flex-1 min-h-0">
              {/* Description */}
              <div className="overflow-x-hidden rounded-md">
                {task.description ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-all leading-relaxed">
                    {task.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground/50 italic">No description.</p>
                )}
              </div>

              {/* Recurrence section */}
              {task.recurrence && (() => {
                const typeLabel: Record<string, string> = { daily: "Daily (every day)", "daily-weekdays": "Daily (Mon–Fri)", weekly: "Weekly", monthly: "Monthly" };
                const limitLabel = task.recurrence.limit !== undefined
                  ? `${task.recurrence.limit} repetition${task.recurrence.limit !== 1 ? "s" : ""} left`
                  : "Forever";
                return (
                  <div className="space-y-1.5 rounded-md border border-border/40 bg-muted/20 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Recurrence
                      <span className={`ml-auto text-[10px] ${task.recurrence.enabled ? "text-sky-400" : "text-muted-foreground/50"}`}>
                        {task.recurrence.enabled ? "enabled" : "disabled"}
                      </span>
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{typeLabel[task.recurrence.type] ?? task.recurrence.type}</span>
                      <span className="text-xs text-muted-foreground">{limitLabel}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Planning section — always visible below description */}
              {(task.estimatedHours != null || task.estimatedMinutes != null || task.startDate || task.endDate) && (
                <div className="space-y-2 rounded-md border border-border/40 bg-muted/20 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <CalendarRange className="h-3.5 w-3.5" />
                    Planning
                  </p>
                  {(task.estimatedHours != null || task.estimatedMinutes != null) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-foreground">
                        {[
                          task.estimatedHours ? `${task.estimatedHours}h` : null,
                          task.estimatedMinutes ? `${task.estimatedMinutes}m` : null,
                        ].filter(Boolean).join(" ")}
                      </span>
                      <span className="text-muted-foreground text-xs">estimated</span>
                    </div>
                  )}
                  {(task.startDate || task.endDate) && (
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarRange className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-foreground">
                        {task.startDate ? format(parseISO(task.startDate), "MMM d, yyyy") : "—"}
                        {" → "}
                        {task.endDate ? format(parseISO(task.endDate), "MMM d, yyyy") : "—"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Checklist section */}
              {task.checklist && task.checklist.length > 0 && (
                <div className="space-y-2 rounded-md border border-border/40 bg-muted/20 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <ListChecks className="h-3.5 w-3.5" />
                    Checklist
                    <span className="ml-auto text-[10px]">
                      {task.checklist.filter((i) => i.done).length}/{task.checklist.length}
                    </span>
                  </p>
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all duration-300"
                      style={{ width: `${(task.checklist.filter((i) => i.done).length / task.checklist.length) * 100}%` }}
                    />
                  </div>
                  <ul className="space-y-2 pt-0.5">
                    {task.checklist.map((item) => (
                      <li key={item.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`view-cl-${item.id}`}
                          checked={item.done}
                          onCheckedChange={() => toggleChecklistItem(item.id)}
                          className="shrink-0"
                        />
                        <label
                          htmlFor={`view-cl-${item.id}`}
                          className={`flex-1 min-w-0 cursor-pointer break-words text-sm ${item.done ? "line-through text-muted-foreground/50" : "text-foreground"}`}
                        >
                          {item.text}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskCard;
