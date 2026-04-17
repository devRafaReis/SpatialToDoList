import { Task, Column, DEFAULT_COLUMNS } from "@/types/task";

const TASKS_KEY  = "kanban-tasks";
const BOARDS_KEY = "kanban-boards";

export interface TaskStorageService {
  getTasks(): Task[];
  saveTasks(tasks: Task[]): void;
  getBoards(): Column[];
  saveBoards(boards: Column[]): void;
}

export const localStorageService: TaskStorageService = {
  getTasks(): Task[] {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  saveTasks(tasks: Task[]): void {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  },
  getBoards(): Column[] {
    try {
      const raw = localStorage.getItem(BOARDS_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_COLUMNS;
    } catch {
      return DEFAULT_COLUMNS;
    }
  },
  saveBoards(boards: Column[]): void {
    localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
  },
};

export const taskStorage: TaskStorageService = localStorageService;
