import React, { createContext, useContext, useCallback, useState, useEffect, useRef, useMemo } from "react";
import { addDays, addWeeks, addMonths, parseISO, format, getDay } from "date-fns";
import { Task, TaskPriority, TaskStatus, ChecklistItem, Column, DEFAULT_COLUMNS, Recurrence, RecurrenceType } from "@/types/task";
import { createWorkspaceStorage } from "@/services/taskStorage";
import {
  fetchTasks,
  fetchBoards,
  upsertTasks,
  syncBoards,
  deleteTaskRemote,
  deleteAllTasksRemote,
} from "@/services/supabaseStorage";

function shiftDate(dateStr: string, type: RecurrenceType, interval?: number): string {
  const d = parseISO(dateStr);
  if (type === "daily") return format(addDays(d, 1), "yyyy-MM-dd");
  if (type === "daily-weekdays") {
    let next = addDays(d, 1);
    while (getDay(next) === 0 || getDay(next) === 6) next = addDays(next, 1);
    return format(next, "yyyy-MM-dd");
  }
  if (type === "every-n-days") return format(addDays(d, interval ?? 2), "yyyy-MM-dd");
  if (type === "weekly") return format(addWeeks(d, 1), "yyyy-MM-dd");
  return format(addMonths(d, 1), "yyyy-MM-dd");
}

function buildNextOccurrence(task: Task, firstBoardId: string): Task | null {
  const rec = task.recurrence!;
  if (rec.limit !== undefined && rec.limit <= 0) return null;
  const now = new Date().toISOString();
  return {
    ...task,
    id: crypto.randomUUID(),
    status: firstBoardId,
    order: Math.floor(Date.now() / 1000) + 1,
    createdAt: now,
    updatedAt: now,
    startDate: task.startDate ? shiftDate(task.startDate, rec.type, rec.interval) : undefined,
    endDate:   task.endDate   ? shiftDate(task.endDate,   rec.type, rec.interval) : undefined,
    checklist: task.checklist?.map((i) => ({ ...i, done: false })),
    recurrence: { ...rec, limit: rec.limit !== undefined ? rec.limit - 1 : undefined },
  };
}

interface TaskContextValue {
  tasks: Task[];
  boards: Column[];
  cloudLoading: boolean;
  syncStatus: "idle" | "syncing" | "error";
  syncError: string | null;
  forceSyncNow: () => Promise<void>;
  addTask: (title: string, description: string, status?: TaskStatus, priority?: TaskPriority, estimatedHours?: number, estimatedMinutes?: number, startDate?: string, startTime?: string, endDate?: string, endTime?: string, checklist?: ChecklistItem[], recurrence?: Recurrence) => string;
  updateTask: (id: string, updates: Partial<Pick<Task, "title" | "description" | "priority" | "estimatedHours" | "estimatedMinutes" | "startDate" | "startTime" | "endDate" | "endTime" | "checklist" | "recurrence" | "reminderDismissed">>) => void;
  deleteTask: (id: string) => void;
  deleteAllTasks: () => void;
  moveTask: (taskId: string, newStatus: TaskStatus, newOrder: number) => void;
  reorderTasks: (status: TaskStatus, orderedIds: string[]) => void;
  moveTaskBetweenColumns: (taskId: string, sourceStatus: TaskStatus, destStatus: TaskStatus, destIndex: number, sourceIds: string[], destIds: string[]) => void;
  addBoard: (title: string) => string;
  deleteBoard: (id: string) => void;
  renameBoard: (id: string, title: string) => void;
  reorderBoards: (orderedIds: string[]) => void;
  resetAll: () => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

export const useTaskContext = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTaskContext must be inside TaskProvider");
  return ctx;
};

export const TaskProvider: React.FC<{ workspaceId: string; userId?: string; children: React.ReactNode }> = ({ workspaceId, userId, children }) => {
  const storage = useMemo(() => createWorkspaceStorage(workspaceId), [workspaceId]);
  const [tasks,  setTasks]  = useState<Task[]>(()   => storage.getTasks());
  const [boards, setBoards] = useState<Column[]>(() => storage.getBoards());
  const [cloudLoading, setCloudLoading] = useState(!!userId);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  // Tracks task IDs deleted while logged in so cloud sync can remove them
  const pendingDeletesRef = useRef<Set<string>>(new Set());
  // True after the initial cloud load finishes (success or error). Using state
  // so that effects with it in their deps re-run when the load completes.
  const [cloudLoadDone, setCloudLoadDone] = useState(!userId);

  // ── Cloud load on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setCloudLoadDone(true);
      setCloudLoading(false);
      return;
    }
    setCloudLoading(true);
    setCloudLoadDone(false);
    Promise.all([fetchTasks(userId, workspaceId), fetchBoards(userId, workspaceId)])
      .then(([cloudTasks, cloudBoards]) => {
        if (cloudBoards.length > 0) {
          setBoards(cloudBoards);
          storage.saveBoards(cloudBoards);
        } else {
          syncBoards(userId, workspaceId, storage.getBoards()).catch(console.error);
        }

        if (cloudTasks.length > 0) {
          // Merge: cloud is source of truth; add any local-only tasks not yet synced
          const cloudIds = new Set(cloudTasks.map((t) => t.id));
          const localOnly = storage.getTasks().filter((t) => !cloudIds.has(t.id));
          const merged = [...cloudTasks, ...localOnly];
          setTasks(merged);
          storage.saveTasks(merged);
          if (localOnly.length > 0) upsertTasks(userId, workspaceId, localOnly).catch(console.error);
        } else {
          const localTasks = storage.getTasks();
          if (localTasks.length > 0) upsertTasks(userId, workspaceId, localTasks).catch(console.error);
        }
      })
      .catch(console.error)
      .finally(() => {
        // Always mark load as done — even on error — so the debounced syncs can fire.
        setCloudLoadDone(true);
        setCloudLoading(false);
      });
  }, [userId, workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist to localStorage ───────────────────────────────────────────────
  useEffect(() => { storage.saveTasks(tasks);   }, [tasks,  storage]);
  useEffect(() => { storage.saveBoards(boards); }, [boards, storage]);

  // ── Debounced sync tasks → Supabase ───────────────────────────────────────
  useEffect(() => {
    if (!userId || !cloudLoadDone) return;
    const deletes = [...pendingDeletesRef.current];
    pendingDeletesRef.current.clear();

    const timer = setTimeout(async () => {
      setSyncStatus("syncing");
      setSyncError(null);
      try {
        await Promise.all(deletes.map((id) => deleteTaskRemote(id)));
        if (tasks.length > 0) await upsertTasks(userId, workspaceId, tasks);
        setSyncStatus("idle");
      } catch (e) {
        deletes.forEach((id) => pendingDeletesRef.current.add(id));
        const msg = e instanceof Error ? e.message : String(e);
        setSyncError(msg);
        setSyncStatus("error");
        console.error("Cloud task sync failed:", e);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      deletes.forEach((id) => pendingDeletesRef.current.add(id));
    };
  }, [tasks, userId, workspaceId, cloudLoadDone]);

  // ── Debounced sync boards → Supabase ─────────────────────────────────────
  useEffect(() => {
    if (!userId || !cloudLoadDone) return;
    const timer = setTimeout(() => {
      syncBoards(userId, workspaceId, boards).catch(console.error);
    }, 600);
    return () => clearTimeout(timer);
  }, [boards, userId, workspaceId, cloudLoadDone]);

  // ── Manual sync ──────────────────────────────────────────────────────────
  const forceSyncNow = useCallback(async () => {
    if (!userId) return;
    setSyncStatus("syncing");
    setSyncError(null);
    try {
      const deletes = [...pendingDeletesRef.current];
      pendingDeletesRef.current.clear();
      await Promise.all(deletes.map((id) => deleteTaskRemote(id)));
      await syncBoards(userId, workspaceId, boards);
      if (tasks.length > 0) await upsertTasks(userId, workspaceId, tasks);
      setSyncStatus("idle");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSyncError(msg);
      setSyncStatus("error");
      console.error("Force sync failed:", e);
    }
  }, [userId, workspaceId, boards, tasks]);

  // ── Task CRUD ─────────────────────────────────────────────────────────────
  const addTask = useCallback((
    title: string, description: string,
    status?: TaskStatus, priority?: TaskPriority,
    estimatedHours?: number, estimatedMinutes?: number,
    startDate?: string, startTime?: string, endDate?: string, endTime?: string,
    checklist?: ChecklistItem[], recurrence?: Recurrence,
  ) => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: crypto.randomUUID(), title, description,
      status: status ?? "todo",
      priority, order: Math.floor(Date.now() / 1000), createdAt: now, updatedAt: now,
      estimatedHours, estimatedMinutes, startDate, startTime, endDate, endTime, checklist, recurrence,
    };
    setTasks((prev) => [...prev, newTask]);
    return newTask.id;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Pick<Task, "title" | "description" | "priority" | "estimatedHours" | "estimatedMinutes" | "startDate" | "startTime" | "endDate" | "endTime" | "checklist" | "recurrence" | "reminderDismissed">>) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (userId) pendingDeletesRef.current.add(id);
  }, [userId]);

  const deleteAllTasks = useCallback(() => {
    setTasks((prev) => {
      if (userId) prev.forEach((t) => pendingDeletesRef.current.add(t.id));
      return [];
    });
  }, [userId]);

  const moveTask = useCallback((taskId: string, newStatus: TaskStatus, newOrder: number) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      const isLastBoard = boards.length > 0 && boards[boards.length - 1].id === newStatus;
      const shouldRecur = isLastBoard && task?.recurrence?.enabled;
      const updated = prev.map((t) => t.id === taskId ? { ...t, status: newStatus, order: newOrder, updatedAt: new Date().toISOString(), reminderDismissed: true } : t);
      if (!shouldRecur) return updated;
      const next = buildNextOccurrence(task!, boards[0].id);
      return next ? [...updated, next] : updated;
    });
  }, [boards]);

  const reorderTasks = useCallback((status: TaskStatus, orderedIds: string[]) => {
    setTasks((prev) => prev.map((t) => {
      if (t.status !== status) return t;
      const idx = orderedIds.indexOf(t.id);
      return idx >= 0 ? { ...t, order: idx } : t;
    }));
  }, []);

  const moveTaskBetweenColumns = useCallback((
    taskId: string, sourceStatus: TaskStatus, destStatus: TaskStatus,
    destIndex: number, sourceIds: string[], destIds: string[],
  ) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      const isLastBoard = boards.length > 0 && boards[boards.length - 1].id === destStatus;
      const shouldRecur = isLastBoard && task?.recurrence?.enabled;
      const updated = prev.map((t) => {
        if (t.id === taskId) return { ...t, status: destStatus, order: destIndex, updatedAt: new Date().toISOString(), reminderDismissed: true };
        if (t.status === destStatus) { const idx = destIds.indexOf(t.id); return idx >= 0 ? { ...t, order: idx } : t; }
        if (t.status === sourceStatus) { const idx = sourceIds.indexOf(t.id); return idx >= 0 ? { ...t, order: idx } : t; }
        return t;
      });
      if (!shouldRecur) return updated;
      const next = buildNextOccurrence(task!, boards[0].id);
      return next ? [...updated, next] : updated;
    });
  }, [boards]);

  // ── Board CRUD ────────────────────────────────────────────────────────────
  const addBoard = useCallback((title: string) => {
    const id = `board-${crypto.randomUUID().slice(0, 8)}`;
    setBoards((prev) => [...prev, { id, title }]);
    return id;
  }, []);

  const deleteBoard = useCallback((id: string) => {
    setBoards((prev) => {
      if (prev.length <= 1) return prev;
      const remaining = prev.filter((b) => b.id !== id);
      const fallbackId = remaining[0].id;
      setTasks((ts) => ts.map((t) => t.status === id ? { ...t, status: fallbackId, updatedAt: new Date().toISOString() } : t));
      return remaining;
    });
  }, []);

  const renameBoard = useCallback((id: string, title: string) => {
    setBoards((prev) => prev.map((b) => b.id === id ? { ...b, title } : b));
  }, []);

  const reorderBoards = useCallback((orderedIds: string[]) => {
    setBoards((prev) => orderedIds.map((id) => prev.find((b) => b.id === id)!).filter(Boolean));
  }, []);

  const resetAll = useCallback(() => {
    if (userId) {
      deleteAllTasksRemote(userId, workspaceId).catch(console.error);
      syncBoards(userId, workspaceId, DEFAULT_COLUMNS).catch(console.error);
    }
    setBoards(DEFAULT_COLUMNS);
    setTasks([]);
  }, [userId, workspaceId]);

  return (
    <TaskContext.Provider value={{
      tasks, boards, cloudLoading, syncStatus, syncError, forceSyncNow,
      addTask, updateTask, deleteTask, deleteAllTasks,
      moveTask, reorderTasks, moveTaskBetweenColumns,
      addBoard, deleteBoard, renameBoard, reorderBoards, resetAll,
    }}>
      {children}
    </TaskContext.Provider>
  );
};
