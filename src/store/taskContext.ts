import { createContext, useContext } from "react";
import type { Task, TaskPriority, TaskStatus, ChecklistItem, Column, Recurrence } from "@/types/task";

export interface TaskContextValue {
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
  archiveTask: (id: string) => void;
  unarchiveTask: (id: string) => void;
  archiveBoard: (id: string) => void;
  unarchiveBoard: (id: string) => void;
  deleteArchivedBoard: (id: string) => void;
  hideTask: (id: string) => void;
  unhideTask: (id: string) => void;
  hideBoard: (id: string) => void;
  unhideBoard: (id: string) => void;
  setBoardColor: (id: string, color: string | null) => void;
}

export const TaskContext = createContext<TaskContextValue | null>(null);

export const useTaskContext = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTaskContext must be inside TaskProvider");
  return ctx;
};
