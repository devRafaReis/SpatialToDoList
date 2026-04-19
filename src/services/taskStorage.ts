import { Task, Column, DEFAULT_COLUMNS } from "@/types/task";
import { STORAGE_KEYS } from "@/constants/storageKeys";

export interface TaskStorageService {
  getTasks(): Task[];
  saveTasks(tasks: Task[]): void;
  getBoards(): Column[];
  saveBoards(boards: Column[]): void;
}

export const createWorkspaceStorage = (workspaceId: string): TaskStorageService => ({
  getTasks(): Task[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.tasks(workspaceId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  saveTasks(tasks: Task[]): void {
    localStorage.setItem(STORAGE_KEYS.tasks(workspaceId), JSON.stringify(tasks));
  },
  getBoards(): Column[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.boards(workspaceId));
      return raw ? JSON.parse(raw) : DEFAULT_COLUMNS;
    } catch {
      return DEFAULT_COLUMNS;
    }
  },
  saveBoards(boards: Column[]): void {
    localStorage.setItem(STORAGE_KEYS.boards(workspaceId), JSON.stringify(boards));
  },
});
