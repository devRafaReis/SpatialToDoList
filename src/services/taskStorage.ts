import { Task, Column, DEFAULT_COLUMNS } from "@/types/task";

export interface TaskStorageService {
  getTasks(): Task[];
  saveTasks(tasks: Task[]): void;
  getBoards(): Column[];
  saveBoards(boards: Column[]): void;
}

export const createWorkspaceStorage = (workspaceId: string): TaskStorageService => ({
  getTasks(): Task[] {
    try {
      const raw = localStorage.getItem(`kanban-tasks_${workspaceId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  saveTasks(tasks: Task[]): void {
    localStorage.setItem(`kanban-tasks_${workspaceId}`, JSON.stringify(tasks));
  },
  getBoards(): Column[] {
    try {
      const raw = localStorage.getItem(`kanban-boards_${workspaceId}`);
      return raw ? JSON.parse(raw) : DEFAULT_COLUMNS;
    } catch {
      return DEFAULT_COLUMNS;
    }
  },
  saveBoards(boards: Column[]): void {
    localStorage.setItem(`kanban-boards_${workspaceId}`, JSON.stringify(boards));
  },
});
