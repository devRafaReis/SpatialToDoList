import React, { useCallback, useState, useEffect, useMemo } from "react";
import { Task, TaskPriority, TaskStatus, ChecklistItem, Column, DEFAULT_COLUMNS, Recurrence } from "@/types/task";
import { createWorkspaceStorage } from "@/services/taskStorage";
import {
  fetchTasks,
  fetchBoards,
  syncTasks,
  syncBoards,
  deleteAllTasksRemote,
} from "@/services/supabaseStorage";
import { TaskContext } from "@/store/taskContext";
import { buildNextOccurrence } from "@/lib/recurrenceUtils";
import { mergeCloudAndLocalTasks } from "@/lib/taskMerge";


export const TaskProvider: React.FC<{ workspaceId: string; workspaceName?: string; userId?: string; children: React.ReactNode }> = ({ workspaceId, workspaceName, userId, children }) => {
  const storage = useMemo(() => createWorkspaceStorage(workspaceId), [workspaceId]);
  const [tasks,  setTasks]  = useState<Task[]>(()   => storage.getTasks());
  const [boards, setBoards] = useState<Column[]>(() => storage.getBoards());
  const [cloudLoading, setCloudLoading] = useState(!!userId);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

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
        // "First login" = cloud has neither boards nor tasks yet.
        // If boards already exist in cloud, this user has synced before —
        // cloud is authoritative even if tasks are empty (intentional delete).
        if (cloudBoards.length > 0) {
          setBoards(cloudBoards);
          storage.saveBoards(cloudBoards);
        }
        // isFirstLogin: local boards stay as-is; debounced effect syncs them after cloudLoadDone=true.
        // Direct syncBoards call here would race with that debounce and cause 409 conflicts.

        // Returning user (cloudBoards > 0): cloud is fully authoritative — do NOT merge local tasks.
        // Local-only tasks on a returning user's device are likely contamination from a previous
        // user's localStorage on the same device. Merging them would cause ON CONFLICT(id) upsert
        // to try to update another user's rows, violating RLS (403).
        // First-time user (cloudBoards === 0): merge preserves guest tasks created before login.
        const merged = cloudBoards.length > 0
          ? cloudTasks
          : mergeCloudAndLocalTasks(cloudTasks, storage.getTasks());
        if (merged.length > 0) {
          setTasks(merged);
          storage.saveTasks(merged);
        } else {
          setTasks([]);
          storage.saveTasks([]);
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
    const timer = setTimeout(async () => {
      setSyncStatus("syncing");
      setSyncError(null);
      try {
        await syncTasks(userId, workspaceId, tasks, workspaceName);
        setSyncStatus("idle");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setSyncError(msg);
        setSyncStatus("error");
        console.error("Cloud task sync failed:", e);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [tasks, userId, workspaceId, workspaceName, cloudLoadDone]);

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
      await syncBoards(userId, workspaceId, boards);
      await syncTasks(userId, workspaceId, tasks, workspaceName);
      setSyncStatus("idle");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSyncError(msg);
      setSyncStatus("error");
      console.error("Force sync failed:", e);
    }
  }, [userId, workspaceId, workspaceName, boards, tasks]);

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
  }, []);

  const deleteAllTasks = useCallback(() => {
    setTasks([]);
  }, []);

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
    if (boards.length <= 1) return;
    const remaining = boards.filter((b) => b.id !== id);
    const fallbackId = remaining[0].id;
    setBoards(remaining);
    setTasks((prev) => prev.map((t) => t.status === id ? { ...t, status: fallbackId, updatedAt: new Date().toISOString() } : t));
  }, [boards]);

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

  // ── Archive ───────────────────────────────────────────────────────────────
  const archiveTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, archived: true, updatedAt: new Date().toISOString() } : t));
  }, []);

  const unarchiveTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, archived: false, updatedAt: new Date().toISOString() } : t));
  }, []);

  const archiveBoard = useCallback((id: string) => {
    setBoards((prev) => prev.map((b) => b.id === id ? { ...b, archived: true } : b));
  }, []);

  const unarchiveBoard = useCallback((id: string) => {
    setBoards((prev) => prev.map((b) => b.id === id ? { ...b, archived: false } : b));
  }, []);

  const deleteArchivedBoard = useCallback((id: string) => {
    setBoards((prev) => prev.filter((b) => b.id !== id));
    setTasks((prev) => prev.filter((t) => t.status !== id));
  }, []);

  // ── Hide ──────────────────────────────────────────────────────────────────
  const hideTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, hidden: true, updatedAt: new Date().toISOString() } : t));
  }, []);

  const unhideTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, hidden: false, updatedAt: new Date().toISOString() } : t));
  }, []);

  const hideBoard = useCallback((id: string) => {
    setBoards((prev) => prev.map((b) => b.id === id ? { ...b, hidden: true } : b));
  }, []);

  const unhideBoard = useCallback((id: string) => {
    setBoards((prev) => prev.map((b) => b.id === id ? { ...b, hidden: false } : b));
  }, []);

  const setBoardColor = useCallback((id: string, color: string | null) => {
    setBoards((prev) => prev.map((b) => b.id === id ? { ...b, color: color ?? undefined } : b));
  }, []);

  return (
    <TaskContext.Provider value={{
      tasks, boards, cloudLoading, syncStatus, syncError, forceSyncNow,
      addTask, updateTask, deleteTask, deleteAllTasks,
      moveTask, reorderTasks, moveTaskBetweenColumns,
      addBoard, deleteBoard, renameBoard, reorderBoards, resetAll,
      archiveTask, unarchiveTask, archiveBoard, unarchiveBoard, deleteArchivedBoard,
      hideTask, unhideTask, hideBoard, unhideBoard, setBoardColor,
    }}>
      {children}
    </TaskContext.Provider>
  );
};
