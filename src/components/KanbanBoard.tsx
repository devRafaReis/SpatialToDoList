import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Task, TaskStatus, ChecklistItem, TaskFilter, EMPTY_FILTER } from "@/types/task";
import { useTasks } from "@/hooks/useTasks";
import KanbanColumn from "@/components/KanbanColumn";
import TaskDialog from "@/components/TaskDialog";
import Header from "@/components/Header";
import StarParticles from "@/components/StarParticles";
import SpaceEasterEggs from "@/components/SpaceEasterEggs";
import { useSettings } from "@/store/settingsContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTranslation } from "@/i18n/translations";
import { Plus, RotateCcw, Trash2, Columns, EyeOff, Eye, Search, X, ChevronsUp, ChevronsDown } from "lucide-react";
import FilterPopover from "@/components/FilterPopover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Board-level black hole — covers the full viewport, much larger than the
// per-card version. Calls onComplete when the animation finishes.
// ---------------------------------------------------------------------------
const BoardBlackHoleCanvas = ({ onComplete }: { onComplete: () => void }) => {
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
    const DURATION = 1900;
    const MAX_R = Math.min(W, H) * 0.28;

    const particles = Array.from({ length: 32 }, (_, i) => ({
      baseAngle: (i / 32) * Math.PI * 2,
      rOffset: (Math.random() - 0.5) * MAX_R * 0.25,
      alpha: 0.35 + Math.random() * 0.55,
      size: 1.2 + Math.random() * 2.8,
    }));

    const start = performance.now();
    let animId: number;

    const draw = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / DURATION);
      ctx.clearRect(0, 0, W, H);

      let r: number;
      let g: number;
      if (p < 0.18) {
        const t = p / 0.18;
        const e = t * t * (3 - 2 * t);
        r = MAX_R * e; g = e;
      } else if (p < 0.70) {
        r = MAX_R; g = 1;
      } else {
        const t = (p - 0.70) / 0.30;
        const e = t * t * (3 - 2 * t);
        r = MAX_R * (1 - e); g = 1 - e;
      }

      if (r > 0.5) {
        // Outer ambient glow
        const og = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 3.5);
        og.addColorStop(0,    `hsla(270, 90%, 62%, ${0.40 * g})`);
        og.addColorStop(0.45, `hsla(260, 80%, 50%, ${0.18 * g})`);
        og.addColorStop(1,    `hsla(250, 70%, 40%, 0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = og;
        ctx.fill();

        // Accretion disk
        const rg = ctx.createRadialGradient(cx, cy, r * 0.80, cx, cy, r * 1.80);
        rg.addColorStop(0,    `hsla(278, 100%, 80%, ${0.95 * g})`);
        rg.addColorStop(0.22, `hsla(265, 92%, 66%, ${0.80 * g})`);
        rg.addColorStop(0.60, `hsla(255, 82%, 53%, ${0.38 * g})`);
        rg.addColorStop(1,    `hsla(245, 70%, 42%, 0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.80, 0, Math.PI * 2);
        ctx.fillStyle = rg;
        ctx.fill();

        // Orbital particles
        const orbitR = r * 1.35;
        const spinSpeed = 0.0020;
        particles.forEach((pt) => {
          const a = pt.baseAngle + elapsed * spinSpeed;
          const pr = orbitR + pt.rOffset;
          const px = cx + Math.cos(a) * pr;
          const py = cy + Math.sin(a) * pr * 0.38;
          ctx.beginPath();
          ctx.arc(px, py, pt.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(282, 100%, 88%, ${pt.alpha * g})`;
          ctx.fill();
        });

        // Event horizon
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = "hsl(230, 35%, 2%)";
        ctx.fill();

        // Photon sphere edge
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(283, 100%, 88%, ${0.90 * g})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      if (p >= 1) {
        if (!calledRef.current) {
          calledRef.current = true;
          requestAnimationFrame(() => onCompleteRef.current());
        }
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
      width={window.innerWidth}
      height={window.innerHeight}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 100 }}
    />
  );
};

const BoardBigBangCanvas = ({ onComplete }: { onComplete: () => void }) => {
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
    const DURATION = 1600;
    const DECAY = 2.5;

    const particles = Array.from({ length: 140 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 200 + Math.random() * 700,
      endP: 0.38 + Math.random() * 0.62,
      size: 1.5 + Math.random() * 4,
      hue: 215 + Math.floor(Math.random() * 115),
    }));

    const start = performance.now();
    let animId: number;

    const draw = (now: number) => {
      const elapsed = Math.max(0, now - start);
      const p = Math.min(1, elapsed / DURATION);
      ctx.shadowBlur = 0;
      ctx.clearRect(0, 0, W, H);

      // Central flash
      if (p < 0.16) {
        const t = p / 0.16;
        const flashA = 1 - t;
        const flashR = Math.max(1, 20 + t * Math.max(W, H) * 0.65);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
        g.addColorStop(0,    `rgba(255,255,255,${flashA})`);
        g.addColorStop(0.10, `rgba(220,180,255,${flashA * 0.95})`);
        g.addColorStop(0.42, `rgba(130,60,220,${flashA * 0.55})`);
        g.addColorStop(1,    `rgba(70,20,160,0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, flashR, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      // Expanding shockwave rings
      for (let ri = 0; ri < 3; ri++) {
        const rp = p - ri * 0.07;
        if (rp > 0 && rp < 0.82) {
          const t = rp / 0.82;
          const ringR = t * Math.max(W, H) * 0.78;
          const ringA = (1 - t) * [0.80, 0.50, 0.28][ri];
          ctx.beginPath();
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(275,100%,85%,${ringA})`;
          ctx.lineWidth = (3.5 - ri * 0.9) * (1 - t * 0.7);
          ctx.stroke();
        }
      }

      // Burst particles
      const elapsedSec = elapsed / 1000;
      for (const pt of particles) {
        const localP = p / pt.endP;
        if (localP <= 0 || localP >= 1) continue;
        const dist = (pt.speed / DECAY) * (1 - Math.exp(-DECAY * elapsedSec));
        const x = cx + Math.cos(pt.angle) * dist;
        const y = cy + Math.sin(pt.angle) * dist;
        const a = Math.max(0, 1 - localP);
        const sz = Math.max(0.1, pt.size * (1 - localP * 0.4));
        ctx.shadowBlur = sz * 9;
        ctx.shadowColor = `hsla(${pt.hue},90%,78%,${a * 0.75})`;
        ctx.beginPath();
        ctx.arc(x, y, sz, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${pt.hue},95%,92%,${a})`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      if (p >= 1) {
        if (!calledRef.current) {
          calledRef.current = true;
          requestAnimationFrame(() => onCompleteRef.current());
        }
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
      width={window.innerWidth}
      height={window.innerHeight}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 100 }}
    />
  );
};

const BoardDragParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    const w = parent?.clientWidth  ?? 600;
    const h = parent?.clientHeight ?? 120;
    canvas.width  = w;
    canvas.height = h;

    type P = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number };
    const parts: P[] = [];
    let id: number;

    const tick = () => {
      ctx.clearRect(0, 0, w, h);

      if (Math.random() < 0.85) {
        parts.push({
          x:       8 + Math.random() * (w - 16),
          y:       8 + Math.random() * (h - 16),
          vx:      (Math.random() - 0.5) * 0.5,
          vy:      -(0.3 + Math.random() * 0.7),
          life:    22 + Math.random() * 28,
          maxLife: 50,
          size:    0.7 + Math.random() * 1.6,
          hue:     265 + Math.floor(Math.random() * 55),
        });
      }

      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.life--;
        const a = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.size * a), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 95%, 88%, ${a * 0.85})`;
        ctx.fill();
      }

      let i = parts.length;
      while (i--) { if (parts[i].life <= 0) parts.splice(i, 1); }

      id = requestAnimationFrame(tick);
    };

    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-lg"
    />
  );
};

const KanbanBoard = () => {
  const { tasks, tasksByStatus, boards, addTask, updateTask, deleteTask, archiveTask, deleteAllTasks, moveTask, reorderTasks, moveTaskBetweenColumns, addBoard, deleteBoard, renameBoard, reorderBoards, resetAll, archiveBoard, hideBoard, unhideBoard, setBoardColor } = useTasks();
  const { animationsEnabled, boardLayout, setBoardLayout } = useSettings();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const effectiveLayout = isMobile ? "vertical" : boardLayout;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultTaskStatus, setDefaultTaskStatus] = useState<string | undefined>(undefined);
  const [newTaskId, setNewTaskId] = useState<string | null>(null);
  const [teleportedTaskId, setTeleportedTaskId] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>(EMPTY_FILTER);
  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [addBoardDialogOpen, setAddBoardDialogOpen] = useState(false);
  const [newBoardTitleTop, setNewBoardTitleTop] = useState("");
  const [newBoardId, setNewBoardId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [allCollapsed, setAllCollapsed] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const newTaskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newBoardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingRemovalIds, setPendingRemovalIds] = useState<string[]>([]);
  type PendingRemoval = { task: Task; timerId: ReturnType<typeof setTimeout>; toastId: string | number; type: "delete" | "archive" };
  const pendingRemovalsRef = useRef<Map<string, PendingRemoval>>(new Map());

  useEffect(() => {
    const ref = pendingRemovalsRef.current;
    return () => { ref.forEach(({ timerId }) => clearTimeout(timerId)); };
  }, []);

  const handleUndoRemoval = useCallback((id: string) => {
    const entry = pendingRemovalsRef.current.get(id);
    if (!entry) return;
    clearTimeout(entry.timerId);
    toast.dismiss(entry.toastId);
    pendingRemovalsRef.current.delete(id);
    setPendingRemovalIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const handleDeleteTask = useCallback((id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setPendingRemovalIds((prev) => [...prev, id]);
    const timerId = setTimeout(() => {
      deleteTask(id);
      pendingRemovalsRef.current.delete(id);
      setPendingRemovalIds((prev) => prev.filter((x) => x !== id));
    }, 5000);
    const toastId = toast(t("taskDeleted"), {
      duration: 5100,
      action: { label: t("undo"), onClick: () => handleUndoRemoval(id) },
    });
    pendingRemovalsRef.current.set(id, { task, timerId, toastId, type: "delete" });
  }, [tasks, deleteTask, t, handleUndoRemoval]);

  const handleArchiveTask = useCallback((id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setPendingRemovalIds((prev) => [...prev, id]);
    const timerId = setTimeout(() => {
      archiveTask(id);
      pendingRemovalsRef.current.delete(id);
      setPendingRemovalIds((prev) => prev.filter((x) => x !== id));
    }, 5000);
    const toastId = toast(t("taskArchived"), {
      duration: 5100,
      action: { label: t("undo"), onClick: () => handleUndoRemoval(id) },
    });
    pendingRemovalsRef.current.set(id, { task, timerId, toastId, type: "archive" });
  }, [tasks, archiveTask, t, handleUndoRemoval]);

  const visibleBoards = useMemo(() => {
    const base = filter.boards.length > 0 ? boards.filter((b) => filter.boards.includes(b.id)) : boards;
    return showHidden ? base : base.filter((b) => !b.hidden);
  }, [boards, filter.boards, showHidden]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredTasksByStatus = useMemo(() => {
    const hasFilter =
      filter.priorities.length > 0 ||
      filter.startDateFrom || filter.startDateTo ||
      filter.endDateFrom   || filter.endDateTo;
    const out: Record<string, Task[]> = {};
    for (const [status, tasks] of Object.entries(tasksByStatus)) {
      out[status] = tasks.filter((t) => {
        if (pendingRemovalIds.includes(t.id)) return false;
        if (!showHidden && t.hidden) return false;
        if (normalizedSearch && !t.title.toLowerCase().includes(normalizedSearch) && !t.description.toLowerCase().includes(normalizedSearch)) return false;
        if (!hasFilter) return true;
        if (filter.priorities.length > 0 && (!t.priority || !filter.priorities.includes(t.priority as never))) return false;
        if (filter.startDateFrom && (!t.startDate || t.startDate < filter.startDateFrom)) return false;
        if (filter.startDateTo   && (!t.startDate || t.startDate > filter.startDateTo))   return false;
        if (filter.endDateFrom   && (!t.endDate   || t.endDate   < filter.endDateFrom))   return false;
        if (filter.endDateTo     && (!t.endDate   || t.endDate   > filter.endDateTo))     return false;
        return true;
      });
    }
    return out;
  }, [tasksByStatus, filter, showHidden, normalizedSearch, pendingRemovalIds]);

  const totalTasks = Object.values(tasksByStatus).reduce((sum, arr) => sum + arr.length, 0);

  const handleAddBoard = () => {
    const trimmed = newBoardTitle.trim();
    if (!trimmed) return;
    const id = addBoard(trimmed);
    setNewBoardTitle("");
    setAddingBoard(false);
    if (newBoardTimerRef.current) clearTimeout(newBoardTimerRef.current);
    setNewBoardId(id);
    newBoardTimerRef.current = setTimeout(() => {
      setNewBoardId(null);
      newBoardTimerRef.current = null;
    }, 1500);
  };

  const handleAddBoardTop = () => {
    const trimmed = newBoardTitleTop.trim();
    if (!trimmed) return;
    const id = addBoard(trimmed);
    setNewBoardTitleTop("");
    setAddBoardDialogOpen(false);
    if (newBoardTimerRef.current) clearTimeout(newBoardTimerRef.current);
    setNewBoardId(id);
    newBoardTimerRef.current = setTimeout(() => {
      setNewBoardId(null);
      newBoardTimerRef.current = null;
    }, 1500);
  };

  const handleConfirmDeleteAll = () => {
    setDeleteAllOpen(false);
    if (!animationsEnabled) { deleteAllTasks(); return; }
    setIsDeletingAll(true);
  };

  const handleConfirmReset = () => {
    setResetOpen(false);
    if (!animationsEnabled) { resetAll(); setBoardLayout("horizontal"); return; }
    setIsResetting(true);
  };

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId, type } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;

      if (type === "BOARD") {
        const orderedIds = boards.map((b) => b.id);
        orderedIds.splice(source.index, 1);
        orderedIds.splice(destination.index, 0, draggableId);
        reorderBoards(orderedIds);
        return;
      }

      const destStatus   = destination.droppableId as TaskStatus;
      const sourceStatus = source.droppableId as TaskStatus;

      if (sourceStatus === destStatus) {
        const ids = tasksByStatus[destStatus].map((t) => t.id);
        ids.splice(source.index, 1);
        ids.splice(destination.index, 0, draggableId);
        reorderTasks(destStatus, ids);
      } else {
        const sourceIds = tasksByStatus[sourceStatus]
          .filter((t) => t.id !== draggableId)
          .map((t) => t.id);
        const destIds = [...tasksByStatus[destStatus].map((t) => t.id)];
        destIds.splice(destination.index, 0, draggableId);
        moveTaskBetweenColumns(draggableId, sourceStatus, destStatus, destination.index, sourceIds, destIds);
      }
    },
    [boards, tasksByStatus, reorderTasks, moveTaskBetweenColumns, reorderBoards]
  );

  const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

  const handleSortTasks = (columnId: string, sort: "priority" | "date") => {
    const tasks = tasksByStatus[columnId] ?? [];
    const sorted = [...tasks].sort((a, b) => {
      if (sort === "priority") {
        const pa = PRIORITY_ORDER[a.priority ?? ""] ?? 4;
        const pb = PRIORITY_ORDER[b.priority ?? ""] ?? 4;
        return pa - pb;
      }
      // sort by startDate asc, no date at end
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      const cmp = a.startDate.localeCompare(b.startDate);
      if (cmp !== 0) return cmp;
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });
    reorderTasks(columnId, sorted.map((t) => t.id));
  };

  const handleAddTask = (status?: string) => {
    setEditingTask(null);
    setDefaultTaskStatus(status);
    setDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleSave = (title: string, description: string, status?: TaskStatus, priority?: Task["priority"], estimatedHours?: number, estimatedMinutes?: number, startDate?: string, startTime?: string, endDate?: string, endTime?: string, checklist?: ChecklistItem[], recurrence?: Task["recurrence"]) => {
    if (editingTask) {
      updateTask(editingTask.id, { title, description, priority, estimatedHours, estimatedMinutes, startDate, startTime, endDate, endTime, checklist, recurrence });
    } else {
      const id = addTask(title, description, status, priority, estimatedHours, estimatedMinutes, startDate, startTime, endDate, endTime, checklist, recurrence);
      if (newTaskTimerRef.current) clearTimeout(newTaskTimerRef.current);
      setNewTaskId(id);
      newTaskTimerRef.current = setTimeout(() => {
        setNewTaskId(null);
        newTaskTimerRef.current = null;
      }, 1200);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      {animationsEnabled && <StarParticles />}
      {animationsEnabled && <SpaceEasterEggs />}
      {isDeletingAll && animationsEnabled && (
        <BoardBlackHoleCanvas onComplete={() => { deleteAllTasks(); setIsDeletingAll(false); }} />
      )}
      {isResetting && animationsEnabled && (
        <BoardBigBangCanvas onComplete={() => { resetAll(); setBoardLayout("horizontal"); setIsResetting(false); }} />
      )}
      <div className="relative z-10 flex flex-1 flex-col">
        <Header />

        {/* Workspace toolbar */}
        <div className="relative z-10 border-b border-border/20 glass px-3 py-2 sm:px-4 flex items-center gap-2">
          {/* Mobile search overlay — takes the full toolbar row when active */}
          {isMobile && (searchOpen || searchQuery) ? (
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex flex-1 items-center">
                <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="h-8 w-full rounded-md border border-border/40 bg-muted/30 pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/60 focus:bg-muted/50 transition-colors"
                />
              </div>
              <button
                onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("cancel")}
              </button>
            </div>
          ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FilterPopover filter={filter} onChange={setFilter} boards={boards} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHidden((v) => !v)}
              className={`h-8 gap-1.5 text-xs ${showHidden ? "text-primary bg-primary/10" : "text-muted-foreground/70"}`}
              aria-label={t("showHidden")}
            >
              {showHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{t("showHidden")}</span>
            </Button>
            {/* Mobile: icon only; Desktop: full input */}
            {isMobile ? (
              <button
                onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 30); }}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
                aria-label={t("searchPlaceholder")}
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="h-8 w-44 rounded-md border border-border/40 bg-muted/30 pl-7 pr-6 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/60 focus:bg-muted/50 transition-colors"
                />
                {searchQuery && (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1.5 flex items-center justify-center rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
            <Button size="sm" onClick={() => handleAddTask()} className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span className="sm:hidden">{t("newTaskShort")}</span>
              <span className="hidden sm:inline">{t("newTask")}</span>
            </Button>
            <div className="h-4 w-px bg-border/40 hidden sm:block" />
            <Button variant="ghost" size="sm" onClick={() => setAddBoardDialogOpen(true)} className="h-8 gap-1.5 text-muted-foreground/70 text-xs">
              <Columns className="h-3.5 w-3.5" />
              <span className="sm:hidden">{t("addBoardShort")}</span>
              <span className="hidden sm:inline">{t("addBoard")}</span>
            </Button>
          </div>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAllCollapsed((v) => v === true ? false : true)}
              className={`h-8 gap-1.5 text-xs ${allCollapsed === true ? "text-primary bg-primary/10" : "text-muted-foreground/60"}`}
              aria-label={allCollapsed === true ? t("expandAll") : t("collapseAll")}
            >
              {allCollapsed === true
                ? <ChevronsDown className="h-3.5 w-3.5" />
                : <ChevronsUp className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{allCollapsed === true ? t("expandAll") : t("collapseAll")}</span>
            </Button>
            {totalTasks > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex h-8 text-muted-foreground/60 hover:text-red-400 hover:bg-red-400/10 gap-1.5 text-xs"
                onClick={() => setDeleteAllOpen(true)}
                disabled={isDeletingAll || isResetting}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("deleteAllTasks")}</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex h-8 text-muted-foreground/60 hover:text-amber-400 hover:bg-amber-400/10 gap-1.5 text-xs"
              onClick={() => setResetOpen(true)}
              disabled={isDeletingAll || isResetting}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("resetToDefault")}</span>
            </Button>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className={isDeletingAll && animationsEnabled ? "board-suck-in" : ""}>
            <Droppable
              droppableId="board-list"
              type="BOARD"
              direction={effectiveLayout === "horizontal" ? "horizontal" : "vertical"}
            >
              {(boardProvided) => (
                <div
                  ref={boardProvided.innerRef}
                  {...boardProvided.droppableProps}
                  className={`mx-auto w-full max-w-screen-2xl gap-4 p-3 md:p-4 xl:p-6 ${
                    effectiveLayout === "horizontal"
                      ? "flex flex-row overflow-x-auto"
                      : "flex flex-col"
                  }`}
                >
                  {visibleBoards.map((board, boardIndex) => (
                    <Draggable key={board.id} draggableId={board.id} index={boardIndex}>
                      {(boardDrag, boardSnap) => (
                        <div
                          ref={boardDrag.innerRef}
                          {...boardDrag.draggableProps}
                          className={`relative ${effectiveLayout === "horizontal" ? "flex-1 min-w-72 max-w-[calc(33.333%-11px)]" : ""}`}
                          style={{
                            ...boardDrag.draggableProps.style,
                            ...(boardSnap.isDragging ? {
                              boxShadow: "0 0 0 2px hsla(265,60%,72%,0.5), 0 0 24px hsla(265,85%,75%,0.55), 0 0 60px hsla(265,80%,65%,0.25)",
                              borderRadius: "0.5rem",
                              opacity: 0.95,
                            } : {}),
                          }}
                        >
                          {boardSnap.isDragging && animationsEnabled && <BoardDragParticles />}
                          <KanbanColumn
                            column={board}
                            tasks={filteredTasksByStatus[board.id] ?? []}
                            dragHandleProps={boardDrag.dragHandleProps}
                            onEditTask={handleEditTask}
                            onDeleteTask={handleDeleteTask}
                            onArchiveTask={handleArchiveTask}
                            onMoveTask={(id, status) => {
                              moveTask(id, status, Date.now());
                              setTeleportedTaskId(id);
                              setTimeout(() => setTeleportedTaskId(null), 1200);
                            }}
                            onAddTask={() => handleAddTask(board.id)}
                            onSortTasks={(sort) => handleSortTasks(board.id, sort)}
                            onRenameBoard={(title) => renameBoard(board.id, title)}
                            onDeleteBoard={() => deleteBoard(board.id)}
                            onArchiveBoard={() => archiveBoard(board.id)}
                            onHideBoard={() => board.hidden ? unhideBoard(board.id) : hideBoard(board.id)}
                            onSetBoardColor={(color) => setBoardColor(board.id, color)}
                            forceCollapsed={allCollapsed ?? undefined}
                            newTaskId={newTaskId}
                            teleportedTaskId={teleportedTaskId}
                            isNew={board.id === newBoardId}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {boardProvided.placeholder}
                </div>
              )}
            </Droppable>

            <div className="mx-auto w-full max-w-screen-2xl px-3 pb-3 md:px-4 md:pb-4 xl:px-6 xl:pb-6 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {addingBoard ? (
                  <>
                    <Input
                      autoFocus
                      placeholder={t("boardNamePlaceholder")}
                      value={newBoardTitle}
                      onChange={(e) => setNewBoardTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddBoard();
                        if (e.key === "Escape") { setAddingBoard(false); setNewBoardTitle(""); }
                      }}
                      maxLength={20}
                      className="h-8 w-36 sm:w-48 text-sm"
                    />
                    <Button size="sm" onClick={handleAddBoard} disabled={!newBoardTitle.trim()} className="h-8">{t("add")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingBoard(false); setNewBoardTitle(""); }} className="h-8">{t("cancel")}</Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setAddingBoard(true)} className="gap-1.5 text-muted-foreground/70 text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    {t("addBoard")}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {totalTasks > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground/60 hover:text-red-400 hover:bg-red-400/10 gap-1.5 text-xs"
                    onClick={() => setDeleteAllOpen(true)}
                    disabled={isDeletingAll || isResetting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("deleteAllTasks")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground/60 hover:text-amber-400 hover:bg-amber-400/10 gap-1.5 text-xs"
                  onClick={() => setResetOpen(true)}
                  disabled={isDeletingAll || isResetting}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("resetToDefault")}
                </Button>
              </div>
            </div>
          </div>
        </DragDropContext>
        <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editingTask} defaultStatus={defaultTaskStatus} onSave={handleSave} />
      </div>

      <Dialog open={addBoardDialogOpen} onOpenChange={(open) => { setAddBoardDialogOpen(open); if (!open) setNewBoardTitleTop(""); }}>
        <DialogContent className="w-[90vw] max-w-sm rounded-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("newBoard")}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder={t("boardNamePlaceholder")}
            value={newBoardTitleTop}
            onChange={(e) => setNewBoardTitleTop(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddBoardTop();
              if (e.key === "Escape") { setAddBoardDialogOpen(false); setNewBoardTitleTop(""); }
            }}
            maxLength={20}
            className="mt-1"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => { setAddBoardDialogOpen(false); setNewBoardTitleTop(""); }}>{t("cancel")}</Button>
            <Button onClick={handleAddBoardTop} disabled={!newBoardTitleTop.trim()}>{t("add")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAllTasks")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteAllTasksDesc", { count: totalTasks, s: totalTasks !== 1 ? "s" : "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("deleteAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("resetToDefaultTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("resetToDefaultDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("reset")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KanbanBoard;
