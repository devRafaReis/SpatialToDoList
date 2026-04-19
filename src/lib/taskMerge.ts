import type { Task } from "@/types/task";

/**
 * Merges cloud tasks with local-only tasks.
 * Cloud is source of truth — local tasks not present in cloud are appended.
 * This ensures guest tasks created while logged out survive the next login.
 */
export function mergeCloudAndLocalTasks(cloudTasks: Task[], localTasks: Task[]): Task[] {
  const cloudIds = new Set(cloudTasks.map((t) => t.id));
  const localOnly = localTasks.filter((t) => !cloudIds.has(t.id));
  return [...cloudTasks, ...localOnly];
}
