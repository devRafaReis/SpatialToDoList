import { useState, useCallback, useRef, useEffect } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Task, TaskStatus, ChecklistItem, COLUMNS } from "@/types/task";
import { useTasks } from "@/hooks/useTasks";
import KanbanColumn from "@/components/KanbanColumn";
import TaskDialog from "@/components/TaskDialog";
import Header from "@/components/Header";
import StarParticles from "@/components/StarParticles";
import StarWarsShip from "@/components/StarWarsShip";
import { useSettings } from "@/store/settingsStore";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const KanbanBoard = () => {
  const { tasksByStatus, addTask, updateTask, deleteTask, deleteAllTasks, moveTask, reorderTasks, moveTaskBetweenColumns } = useTasks();
  const { animationsEnabled } = useSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskId, setNewTaskId] = useState<string | null>(null);
  const [teleportedTaskId, setTeleportedTaskId] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const newTaskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalTasks = Object.values(tasksByStatus).reduce((sum, arr) => sum + arr.length, 0);

  const handleConfirmDeleteAll = () => {
    setDeleteAllOpen(false);
    if (!animationsEnabled) { deleteAllTasks(); return; }
    setIsDeletingAll(true);
  };

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;

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
    [tasksByStatus, reorderTasks, moveTaskBetweenColumns]
  );

  const handleAddTask = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleSave = (title: string, description: string, status?: TaskStatus, priority?: Task["priority"], estimatedHours?: number, estimatedMinutes?: number, startDate?: string, endDate?: string, checklist?: ChecklistItem[]) => {
    if (editingTask) {
      updateTask(editingTask.id, { title, description, priority, estimatedHours, estimatedMinutes, startDate, endDate, checklist });
    } else {
      const id = addTask(title, description, status, priority, estimatedHours, estimatedMinutes, startDate, endDate, checklist);
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
      {animationsEnabled && <StarWarsShip />}
      {isDeletingAll && animationsEnabled && (
        <BoardBlackHoleCanvas onComplete={() => { deleteAllTasks(); setIsDeletingAll(false); }} />
      )}
      <div className="relative z-10 flex flex-1 flex-col">
        <Header onAddTask={handleAddTask} />
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className={isDeletingAll && animationsEnabled ? "board-suck-in" : ""}>
            <div className="mx-auto w-full max-w-screen-2xl grid auto-rows-min grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:p-6">
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={tasksByStatus[col.id]}
                  onEditTask={handleEditTask}
                  onDeleteTask={deleteTask}
                  onMoveTask={(id, status) => {
                    moveTask(id, status, Date.now());
                    setTeleportedTaskId(id);
                    setTimeout(() => setTeleportedTaskId(null), 1200);
                  }}
                  newTaskId={newTaskId}
                  teleportedTaskId={teleportedTaskId}
                />
              ))}
            </div>
            {totalTasks > 0 && (
              <div className="mx-auto w-full max-w-screen-2xl px-4 pb-4 xl:px-6 xl:pb-6 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground/60 hover:text-red-400 hover:bg-red-400/10 gap-1.5 text-xs"
                  onClick={() => setDeleteAllOpen(true)}
                  disabled={isDeletingAll}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete all tasks
                </Button>
              </div>
            )}
          </div>
        </DragDropContext>
        <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editingTask} onSave={handleSave} />
      </div>

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all tasks</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {totalTasks} task{totalTasks !== 1 ? "s" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KanbanBoard;
