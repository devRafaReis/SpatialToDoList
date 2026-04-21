import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Droppable, DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { useSettings } from "@/store/settingsContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTranslation } from "@/i18n/translations";
import { ChevronDown, GripVertical, Pencil, Plus, Trash2, Check, X, ArrowUpDown, Archive, EyeOff, Eye, Palette } from "lucide-react";
import { Task, TaskStatus, Column } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TaskCard from "@/components/TaskCard";

const BOARD_COLOR_PALETTE = [
  { id: "violet",  hsl: "265,70%,65%" },
  { id: "sky",     hsl: "200,85%,62%" },
  { id: "emerald", hsl: "158,65%,52%" },
  { id: "amber",   hsl: "38,92%,55%"  },
  { id: "rose",    hsl: "350,75%,62%" },
  { id: "indigo",  hsl: "235,65%,70%" },
  { id: "teal",    hsl: "175,60%,52%" },
  { id: "orange",  hsl: "22,90%,60%"  },
] as const;

// ---------------------------------------------------------------------------
// Column BigBang — burst of particles when a new board is created
// ---------------------------------------------------------------------------
const ColumnBigBangCanvas = () => {
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
    const DURATION = 1050;
    const DECAY = 2.8;

    const particles = Array.from({ length: 80 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 80 + Math.random() * 400,
      endP:  0.40 + Math.random() * 0.60,
      size:  0.9 + Math.random() * 3.0,
      hue:   215 + Math.floor(Math.random() * 115),
    }));

    let animId: number;
    const start = performance.now();

    const draw = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / DURATION);
      ctx.shadowBlur = 0;
      ctx.clearRect(0, 0, W, H);

      if (p < 0.18) {
        const t = p / 0.18;
        const flashA = 1 - t;
        const flashR = 8 + t * cx * 0.9;
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

      const elapsedSec = elapsed / 1000;
      for (const pt of particles) {
        const localP = p / pt.endP;
        if (localP <= 0 || localP >= 1) continue;
        const dist = (pt.speed / DECAY) * (1 - Math.exp(-DECAY * elapsedSec));
        const x = cx + Math.cos(pt.angle) * dist;
        const y = cy + Math.sin(pt.angle) * dist * 0.88;
        const a = Math.max(0, 1 - localP);
        const size = Math.max(0.1, pt.size * (1 - localP * 0.35));
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
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={300}
      aria-hidden="true"
      className="pointer-events-none block"
    />
  );
};

// ---------------------------------------------------------------------------
// Column BlackHole — black hole centered on the board being deleted
// ---------------------------------------------------------------------------
const ColumnBlackHoleCanvas = ({ onComplete }: { onComplete: () => void }) => {
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
    const DURATION = 1400;
    const MAX_R = 62;

    const particles = Array.from({ length: 20 }, (_, i) => ({
      baseAngle: (i / 20) * Math.PI * 2,
      rOffset: (Math.random() - 0.5) * 12,
      alpha: 0.35 + Math.random() * 0.55,
      size: 0.8 + Math.random() * 1.6,
    }));

    const start = performance.now();
    let animId: number;

    const draw = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / DURATION);
      ctx.clearRect(0, 0, W, H);

      let r: number;
      let g: number;
      if (p < 0.20) {
        const t = p / 0.20;
        const e = t * t * (3 - 2 * t);
        r = MAX_R * e; g = e;
      } else if (p < 0.72) {
        r = MAX_R; g = 1;
      } else {
        const t = (p - 0.72) / 0.28;
        const e = t * t * (3 - 2 * t);
        r = MAX_R * (1 - e); g = 1 - e;
      }

      if (r > 0.5) {
        const og = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 3.2);
        og.addColorStop(0,    `hsla(270, 90%, 62%, ${0.38 * g})`);
        og.addColorStop(0.45, `hsla(260, 80%, 50%, ${0.16 * g})`);
        og.addColorStop(1,    `hsla(250, 70%, 40%, 0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = og;
        ctx.fill();

        const rg = ctx.createRadialGradient(cx, cy, r * 0.80, cx, cy, r * 1.75);
        rg.addColorStop(0,    `hsla(278, 100%, 80%, ${0.95 * g})`);
        rg.addColorStop(0.22, `hsla(265, 92%, 66%, ${0.80 * g})`);
        rg.addColorStop(0.60, `hsla(255, 82%, 53%, ${0.38 * g})`);
        rg.addColorStop(1,    `hsla(245, 70%, 42%, 0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.75, 0, Math.PI * 2);
        ctx.fillStyle = rg;
        ctx.fill();

        const orbitR = r * 1.32;
        const spinSpeed = 0.0024;
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

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = "hsl(230, 35%, 2%)";
        ctx.fill();

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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={280}
      className="pointer-events-none block"
      aria-hidden="true"
    />
  );
};

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onArchiveTask: (id: string) => void;
  onMoveTask: (id: string, status: TaskStatus) => void;
  onAddTask: () => void;
  onSortTasks: (sort: "priority" | "date") => void;
  onRenameBoard: (title: string) => void;
  onDeleteBoard: () => void;
  onArchiveBoard: () => void;
  onHideBoard: () => void;
  onSetBoardColor: (color: string | null) => void;
  forceCollapsed?: boolean;
  newTaskId?: string | null;
  teleportedTaskId?: string | null;
  isNew?: boolean;
}

const KanbanColumn = ({
  column, tasks, dragHandleProps,
  onEditTask, onDeleteTask, onArchiveTask, onMoveTask,
  onAddTask, onSortTasks, onRenameBoard, onDeleteBoard, onArchiveBoard, onHideBoard, onSetBoardColor, forceCollapsed,
  newTaskId, teleportedTaskId, isNew,
}: KanbanColumnProps) => {
  const { boardLayout, animationsEnabled, privacyMode } = useSettings();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const isHorizontal = !isMobile && boardLayout === "vertical";
  const [collapsed, setCollapsed]         = useState(false);
  const [isRenaming, setIsRenaming]       = useState(false);
  const [editTitle, setEditTitle]         = useState(column.title);
  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [isBoardDeleting, setIsBoardDeleting] = useState(false);
  const [boardAnimPos, setBoardAnimPos]   = useState<{ x: number; y: number } | null>(null);
  const [entryAnimPos, setEntryAnimPos]   = useState<{ x: number; y: number } | null>(null);
  const inputRef                          = useRef<HTMLInputElement>(null);
  const colRef                            = useRef<HTMLDivElement>(null);

  useEffect(() => { setEditTitle(column.title); }, [column.title]);
  useEffect(() => { if (isRenaming) inputRef.current?.focus(); }, [isRenaming]);
  useEffect(() => { if (forceCollapsed !== undefined) setCollapsed(forceCollapsed); }, [forceCollapsed]);

  // Expand collapsed board when a task is created inside it so the animation is visible.
  useEffect(() => {
    if (newTaskId && collapsed && tasks.some((t) => t.id === newTaskId)) {
      setCollapsed(false);
    }
  }, [newTaskId]);

  const getBoardCenter = () => {
    const el = colRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  // BigBang when a new board is created — no dialog involved so capture
  // immediately, but delay 210ms to sync with card-big-bang-in animation-delay.
  useLayoutEffect(() => {
    if (!isNew || !animationsEnabled) return;
    colRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const id = setTimeout(() => {
      requestAnimationFrame(() => {
        const pos = getBoardCenter();
        if (pos) setEntryAnimPos(pos);
      });
    }, 210);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew]);

  const commitRename = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== column.title) onRenameBoard(trimmed);
    else setEditTitle(column.title);
    setIsRenaming(false);
  };

  const cancelRename = () => {
    setEditTitle(column.title);
    setIsRenaming(false);
  };

  const handleDeleteConfirm = () => {
    setDeleteOpen(false);
    if (!animationsEnabled) { onDeleteBoard(); return; }
    // Wait for AlertDialog close animation and Radix scrollbar-compensation
    // removal, then capture position and start the BlackHole animation.
    setTimeout(() => {
      setBoardAnimPos(getBoardCenter());
      setIsBoardDeleting(true);
    }, 220);
  };

  return (
    <>
      <div
        ref={colRef}
        className={`flex flex-col rounded-lg glass-column overflow-hidden ${
          isNew && animationsEnabled ? "card-big-bang-in" : ""
        } ${isBoardDeleting && animationsEnabled ? "card-suck-in" : ""} ${
          column.hidden ? "opacity-60 border border-dashed border-border/60" : ""
        }`}
        style={column.color ? { borderTop: `3px solid hsl(${column.color})` } : undefined}
      >
        {/* Board header */}
        <div
          className="group/header flex items-center gap-2 px-3 py-2.5 border-b border-border/20"
          style={column.color ? { backgroundColor: `hsla(${column.color},0.08)` } : undefined}
        >
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Title — editable */}
          {isRenaming ? (
            <div className="flex flex-1 items-center gap-1.5 min-w-0">
              <input
                ref={inputRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") cancelRename();
                }}
                onBlur={commitRename}
                maxLength={20}
                className="flex-1 min-w-0 bg-transparent border-b border-primary/60 text-sm font-semibold text-foreground outline-none py-0.5"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={commitRename} className="rounded p-0.5 text-primary hover:text-primary/80 hover:bg-primary/15 transition-colors shrink-0" aria-label={t("confirm")}>
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t("confirm")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={cancelRename} className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0" aria-label={t("cancel")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t("cancel")}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <h2
              className="flex-1 min-w-0 text-sm font-semibold text-foreground truncate cursor-default select-none"
              onDoubleClick={() => setIsRenaming(true)}
            >
              <span className={`transition-[filter] duration-150 ${privacyMode ? "blur-sm group-hover/header:blur-none" : ""}`}>{column.title}</span>
            </h2>
          )}

          {column.hidden && (
            <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-muted/60 text-muted-foreground/70 border border-border/30 shrink-0">
              <EyeOff className="h-2.5 w-2.5" />
              {t("hiddenBadge")}
            </span>
          )}
          <Badge variant="secondary" className="text-xs shrink-0">{tasks.length}</Badge>

          {!isRenaming && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 text-muted-foreground/50 hover:text-primary shrink-0"
                  onClick={onAddTask}
                  aria-label={t("addTask")}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("addTask")}</TooltipContent>
            </Tooltip>
          )}

          {!isRenaming && (
            <div className="flex items-center gap-0.5 shrink-0">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground" aria-label={t("sortTasks")}>
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{t("sortTasks")}</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSortTasks("priority")}>
                    {t("sortByPriority")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSortTasks("date")}>
                    {t("sortByDate")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground"
                    onClick={() => setCollapsed((c) => !c)}
                    aria-label={collapsed ? t("expand") : t("collapse")}
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{collapsed ? t("expand") : t("collapse")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground"
                    onClick={() => setIsRenaming(true)}
                    aria-label={t("rename")}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("rename")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className={`h-6 w-6 ${column.hidden ? "text-primary" : "text-muted-foreground/50 hover:text-primary"}`}
                    onClick={onHideBoard}
                    aria-label={column.hidden ? t("unhideBoard") : t("hideBoard")}
                  >
                    {column.hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{column.hidden ? t("unhideBoard") : t("hideBoard")}</TooltipContent>
              </Tooltip>
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6 shrink-0"
                        aria-label={t("boardColor")}
                        style={column.color ? { color: `hsl(${column.color})` } : undefined}
                      >
                        <Palette className={`h-3 w-3 ${column.color ? "" : "text-muted-foreground/50 hover:text-muted-foreground"}`} />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{t("boardColor")}</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-auto p-2" align="end">
                  <div className="flex items-center gap-1.5">
                    {/* No color option */}
                    <button
                      onClick={() => onSetBoardColor(null)}
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 ${!column.color ? "border-foreground/60" : "border-border/40"}`}
                      title={t("colorNone")}
                      aria-label={t("colorNone")}
                    >
                      <X className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                    {BOARD_COLOR_PALETTE.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => onSetBoardColor(c.hsl)}
                        className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${column.color === c.hsl ? "border-foreground/80 scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: `hsl(${c.hsl})` }}
                        title={c.id}
                        aria-label={c.id}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground/50 hover:text-amber-400"
                    onClick={onArchiveBoard}
                    aria-label={t("archiveBoard")}
                  >
                    <Archive className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("archiveBoard")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground/50 hover:text-red-400"
                    onClick={() => setDeleteOpen(true)}
                    aria-label={t("deleteBoard")}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("deleteBoard")}</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Tasks */}
        {collapsed && <div className="h-1" />}
        {!collapsed && <Droppable droppableId={column.id} type="TASK" direction={isHorizontal ? "horizontal" : "vertical"}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-2 transition-colors ${snapshot.isDraggingOver ? "bg-accent/30" : ""} ${
                isHorizontal
                  ? "flex flex-row gap-2 overflow-x-auto min-h-[140px]"
                  : "flex flex-col gap-2 min-h-[80px]"
              }`}
            >
              {tasks.map((task, index) => (
                isHorizontal ? (
                  <div key={task.id} className="shrink-0 w-64">
                    <TaskCard
                      task={task}
                      index={index}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onArchive={onArchiveTask}
                      onMove={onMoveTask}
                      isNew={task.id === newTaskId}
                      isPortalIn={task.id === teleportedTaskId}
                    />
                  </div>
                ) : (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onArchive={onArchiveTask}
                    onMove={onMoveTask}
                    isNew={task.id === newTaskId}
                    isPortalIn={task.id === teleportedTaskId}
                  />
                )
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>}
      </div>

      {/* BigBang portal when board is created */}
      {isNew && animationsEnabled && entryAnimPos && createPortal(
        <div style={{ position: "fixed", left: entryAnimPos.x - 250, top: entryAnimPos.y - 150, pointerEvents: "none", zIndex: 200 }}>
          <ColumnBigBangCanvas />
        </div>,
        document.body
      )}

      {/* BlackHole portal when board is deleted */}
      {isBoardDeleting && animationsEnabled && boardAnimPos && createPortal(
        <div style={{ position: "fixed", left: boardAnimPos.x - 200, top: boardAnimPos.y - 140, pointerEvents: "none", zIndex: 200 }}>
          <ColumnBlackHoleCanvas onComplete={onDeleteBoard} />
        </div>,
        document.body
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteBoardTitle", { name: column.title })}</AlertDialogTitle>
            <AlertDialogDescription>
              {tasks.length > 0
                ? t("deleteBoardDescWithTasks", { count: tasks.length, s: tasks.length !== 1 ? "s" : "" })
                : t("deleteBoardDescEmpty")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default KanbanColumn;
