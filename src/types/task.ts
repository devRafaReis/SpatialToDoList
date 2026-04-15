export type TaskStatus = "todo" | "doing" | "done" | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority?: TaskPriority;
  order: number;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Priority {
  id: TaskPriority;
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const PRIORITIES: Priority[] = [
  { id: "low",      label: "Baixa",   badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dotClass: "bg-emerald-400" },
  { id: "medium",   label: "Média",   badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",       dotClass: "bg-amber-400"   },
  { id: "high",     label: "Alta",    badgeClass: "bg-orange-500/15 text-orange-400 border-orange-500/30",    dotClass: "bg-orange-400"  },
  { id: "critical", label: "Crítica", badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",             dotClass: "bg-red-400"     },
];

export interface Column {
  id: TaskStatus;
  title: string;
}

export const COLUMNS: Column[] = [
  { id: "todo", title: "To Do" },
  { id: "doing", title: "Doing" },
  { id: "done", title: "Done" },
  { id: "cancelled", title: "Cancelled" },
];
