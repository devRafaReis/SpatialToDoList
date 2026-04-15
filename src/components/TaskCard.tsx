import { useState, useEffect, useRef } from "react";
import { GripVertical, Pencil, Trash2, ArrowRight } from "lucide-react";
import { Task, TaskStatus, COLUMNS, PRIORITIES } from "@/types/task";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    const DURATION = 780;

    type Swirler = {
      angle: number; radius: number;
      spinSpeed: number; pullSpeed: number;
      size: number; hue: number; alpha: number;
    };

    const swirlers: Swirler[] = Array.from({ length: 28 }, (_, i) => ({
      angle: (i / 28) * Math.PI * 2 + Math.random() * 0.4,
      radius: 28 + Math.random() * 55,
      spinSpeed: 0.038 + Math.random() * 0.035,
      pullSpeed: 0.55 + Math.random() * 0.6,
      size: 0.9 + Math.random() * 2.2,
      hue: 168 + Math.floor(Math.random() * 80), // teal → cyan → blue
      alpha: 0.6 + Math.random() * 0.4,
    }));

    const start = performance.now();
    let animId: number;

    const draw = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / DURATION);
      ctx.clearRect(0, 0, W, H);

      // Portal disc glow — peaks early then fades
      const discA = p < 0.35 ? p / 0.35 : 1 - (p - 0.35) / 0.65;
      const discR = 10 + (1 - p) * 52;
      const disc = ctx.createRadialGradient(cx, cy, 0, cx, cy, discR * 2.2);
      disc.addColorStop(0,    `hsla(185, 100%, 80%, ${discA * 0.9})`);
      disc.addColorStop(0.30, `hsla(195, 90%, 65%, ${discA * 0.55})`);
      disc.addColorStop(0.65, `hsla(220, 80%, 55%, ${discA * 0.22})`);
      disc.addColorStop(1,    `hsla(240, 70%, 45%, 0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, discR * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = disc;
      ctx.fill();

      // Spinning outer ring
      const ringR = discR * 1.35;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(185, 100%, 78%, ${discA * 0.85})`;
      ctx.lineWidth = 1.6 * (1 - p * 0.5);
      ctx.stroke();

      // Spiral particles converging to center
      for (const s of swirlers) {
        s.angle += s.spinSpeed;
        s.radius -= s.pullSpeed;
        if (s.radius < 1) continue;
        const px = cx + Math.cos(s.angle) * s.radius;
        const py = cy + Math.sin(s.angle) * s.radius * 0.48;
        const a = s.alpha * (1 - p * 0.7) * (s.radius / 80);
        const size = Math.max(0.1, s.size * (s.radius / 80));

        const glow = ctx.createRadialGradient(px, py, 0, px, py, size * 4);
        glow.addColorStop(0, `hsla(${s.hue}, 100%, 88%, ${a * 0.7})`);
        glow.addColorStop(1, `hsla(${s.hue}, 90%, 65%, 0)`);
        ctx.beginPath();
        ctx.arc(px, py, size * 4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 95%, 92%, ${a})`;
        ctx.fill();
      }

      // Final flash when portal closes
      if (p > 0.85) {
        const flashA = (p - 0.85) / 0.15;
        const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22);
        fg.addColorStop(0,   `rgba(160, 255, 255, ${flashA * 0.9})`);
        fg.addColorStop(0.4, `rgba(60, 180, 220, ${flashA * 0.5})`);
        fg.addColorStop(1,   `rgba(20, 80, 160, 0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.fillStyle = fg;
        ctx.fill();
      }

      if (p >= 1) {
        if (!calledRef.current) { calledRef.current = true; onCompleteRef.current(); }
      } else {
        animId = requestAnimationFrame(draw);
      }
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
      className="pointer-events-none absolute"
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 20 }}
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
    const DURATION = 700;

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
      className="pointer-events-none absolute"
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 30 }}
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
    const DURATION = 1000;

    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      life: number; maxLife: number;
      size: number; hue: number;
    };

    const particles: Particle[] = Array.from({ length: 72 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 5.5;
      const life = 28 + Math.random() * 40;
      return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life, maxLife: life,
        size: 0.8 + Math.random() * 2.5,
        hue: 215 + Math.floor(Math.random() * 115),
      };
    });

    const start = performance.now();
    let animId: number;

    const draw = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / DURATION);
      ctx.clearRect(0, 0, W, H);

      // Bright flash at center (0–20%)
      if (p < 0.20) {
        const t = p / 0.20;
        const flashA = 1 - t;
        const flashR = 6 + t * cx * 0.9;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
        g.addColorStop(0,    `rgba(255, 255, 255, ${flashA})`);
        g.addColorStop(0.15, `rgba(220, 180, 255, ${flashA * 0.9})`);
        g.addColorStop(0.50, `rgba(130, 60, 220, ${flashA * 0.5})`);
        g.addColorStop(1,    `rgba(70, 20, 160, 0)`);
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
          ctx.strokeStyle = `hsla(275, 100%, 85%, ${ringA})`;
          ctx.lineWidth = (2.5 - ri * 0.8) * (1 - t * 0.65);
          ctx.stroke();
        }
      }

      // Burst particles
      for (const pt of particles) {
        if (pt.life <= 0) continue;
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vx *= 0.952;
        pt.vy *= 0.952;
        pt.life--;
        const a = pt.life / pt.maxLife;
        const size = Math.max(0.1, pt.size * Math.sqrt(a));

        // Soft glow
        const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, size * 3.5);
        glow.addColorStop(0, `hsla(${pt.hue}, 95%, 88%, ${a * 0.6})`);
        glow.addColorStop(1, `hsla(${pt.hue}, 90%, 65%, 0)`);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, size * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${pt.hue}, 95%, 92%, ${a})`;
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
      className="pointer-events-none absolute"
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 30 }}
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
      className="pointer-events-none absolute"
      style={{
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 20,
      }}
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTeleporting, setIsTeleporting] = useState(false);
  const [teleportDest, setTeleportDest] = useState<TaskStatus | null>(null);
  const otherColumns = COLUMNS.filter((col) => col.id !== task.status);

  const handleMoveClick = (destStatus: TaskStatus) => {
    setTeleportDest(destStatus);
    setIsTeleporting(true);
  };

  const handlePortalExitComplete = () => {
    if (teleportDest) onMove(task.id, teleportDest);
  };

  const handleConfirmDelete = () => {
    setDeleteOpen(false);
    setIsDeleting(true);
  };

  return (
    <>
      <Draggable draggableId={task.id} index={index} isDragDisabled={isDeleting || isTeleporting}>
        {(provided, snapshot) => (
          // Wrapper owns the DnD ref/props; canvas + card live inside it
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`relative mb-2 ${isDeleting || isTeleporting ? "z-50" : ""}`}
          >
            {isPortalIn && <PortalEntryCanvas />}
            {isNew && <BigBangCanvas />}
            {isDeleting && (
              <BlackHoleCanvas onComplete={() => onDelete(task.id)} />
            )}
            {isTeleporting && (
              <PortalExitCanvas onComplete={handlePortalExitComplete} />
            )}

            <Card
              className={`border-0 relative overflow-hidden ${
                isDeleting
                  ? "card-suck-in"
                  : isTeleporting
                  ? "card-portal-out"
                  : isPortalIn
                  ? "card-portal-in"
                  : isNew
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
              {snapshot.isDragging && <DragParticles />}
              <CardContent className="flex items-start gap-2 p-3">
                <div {...provided.dragHandleProps} className="mt-1 cursor-grab text-accent-foreground/70">
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{task.title}</p>
                  {task.priority && (() => {
                    const p = PRIORITIES.find((pr) => pr.id === task.priority);
                    return p ? (
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${p.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${p.dotClass}`} />
                        {p.label}
                      </span>
                    ) : null;
                  })()}
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-accent-foreground/70 hover:text-primary">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {otherColumns.map((col) => (
                        <DropdownMenuItem key={col.id} onClick={() => handleMoveClick(col.id)}>
                          {col.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-accent-foreground/70 hover:text-primary" onClick={() => onEdit(task)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Draggable>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{task.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskCard;
