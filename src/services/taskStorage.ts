import { Task } from "@/types/task";

const STORAGE_KEY = "kanban-tasks";

export interface TaskStorageService {
  getTasks(): Task[];
  saveTasks(tasks: Task[]): void;
}

export const localStorageService: TaskStorageService = {
  getTasks(): Task[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveTasks(tasks: Task[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  },
};

// To migrate to an API, create an apiStorageService implementing TaskStorageService
// and swap the export below.
export const taskStorage: TaskStorageService = localStorageService;
