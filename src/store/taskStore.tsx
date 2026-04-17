import React, { createContext, useContext, useCallback, useState, useEffect } from "react";
import { Task, TaskPriority, TaskStatus, ChecklistItem, Column } from "@/types/task";
import { taskStorage } from "@/services/taskStorage";

interface TaskContextValue {
  tasks: Task[];
  boards: Column[];
  addTask: (title: string, description: string, status?: TaskStatus, priority?: TaskPriority, estimatedHours?: number, estimatedMinutes?: number, startDate?: string, endDate?: string, checklist?: ChecklistItem[]) => string;
  updateTask: (id: string, updates: Partial<Pick<Task, "title" | "description" | "priority" | "estimatedHours" | "estimatedMinutes" | "startDate" | "endDate" | "checklist">>) => void;
  deleteTask: (id: string) => void;
  deleteAllTasks: () => void;
  moveTask: (taskId: string, newStatus: TaskStatus, newOrder: number) => void;
  reorderTasks: (status: TaskStatus, orderedIds: string[]) => void;
  moveTaskBetweenColumns: (taskId: string, sourceStatus: TaskStatus, destStatus: TaskStatus, destIndex: number, sourceIds: string[], destIds: string[]) => void;
  addBoard: (title: string) => string;
  deleteBoard: (id: string) => void;
  renameBoard: (id: string, title: string) => void;
  reorderBoards: (orderedIds: string[]) => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

export const useTaskContext = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTaskContext must be inside TaskProvider");
  return ctx;
};

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks,  setTasks]  = useState<Task[]>(()   => taskStorage.getTasks());
  const [boards, setBoards] = useState<Column[]>(() => taskStorage.getBoards());

  useEffect(() => { taskStorage.saveTasks(tasks);   }, [tasks]);
  useEffect(() => { taskStorage.saveBoards(boards); }, [boards]);

  // ── Task CRUD ──────────────────────────────────────────────────────────────
  const addTask = useCallback((
    title: string, description: string,
    status?: TaskStatus, priority?: TaskPriority,
    estimatedHours?: number, estimatedMinutes?: number,
    startDate?: string, endDate?: string, checklist?: ChecklistItem[],
  ) => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: crypto.randomUUID(), title, description,
      status: status ?? "todo",
      priority, order: Date.now(), createdAt: now, updatedAt: now,
      estimatedHours, estimatedMinutes, startDate, endDate, checklist,
    };
    setTasks((prev) => [...prev, newTask]);
    return newTask.id;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Pick<Task, "title" | "description" | "priority" | "estimatedHours" | "estimatedMinutes" | "startDate" | "endDate" | "checklist">>) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
  }, []);

  const deleteTask    = useCallback((id: string) => setTasks((prev) => prev.filter((t) => t.id !== id)), []);
  const deleteAllTasks = useCallback(() => setTasks([]), []);

  const moveTask = useCallback((taskId: string, newStatus: TaskStatus, newOrder: number) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus, order: newOrder, updatedAt: new Date().toISOString() } : t));
  }, []);

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
    setTasks((prev) => prev.map((t) => {
      if (t.id === taskId) return { ...t, status: destStatus, order: destIndex, updatedAt: new Date().toISOString() };
      if (t.status === destStatus) { const idx = destIds.indexOf(t.id); return idx >= 0 ? { ...t, order: idx } : t; }
      if (t.status === sourceStatus) { const idx = sourceIds.indexOf(t.id); return idx >= 0 ? { ...t, order: idx } : t; }
      return t;
    }));
  }, []);

  // ── Board CRUD ─────────────────────────────────────────────────────────────
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

  return (
    <TaskContext.Provider value={{
      tasks, boards,
      addTask, updateTask, deleteTask, deleteAllTasks,
      moveTask, reorderTasks, moveTaskBetweenColumns,
      addBoard, deleteBoard, renameBoard, reorderBoards,
    }}>
      {children}
    </TaskContext.Provider>
  );
};
