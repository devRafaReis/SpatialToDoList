export type TaskStatus = string;

export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

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
  estimatedHours?: number;
  estimatedMinutes?: number;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  reminderDismissed?: boolean;
  checklist?: ChecklistItem[];
  recurrence?: Recurrence;
  archived?: boolean;
}

export interface Priority {
  id: TaskPriority;
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const PRIORITIES: Priority[] = [
  { id: "low",      label: "Low",      badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dotClass: "bg-emerald-400" },
  { id: "medium",   label: "Medium",   badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",       dotClass: "bg-amber-400"   },
  { id: "high",     label: "High",     badgeClass: "bg-orange-500/15 text-orange-400 border-orange-500/30",    dotClass: "bg-orange-400"  },
  { id: "critical", label: "Critical", badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",             dotClass: "bg-red-400"     },
];

export type RecurrenceType = "daily" | "daily-weekdays" | "weekly" | "monthly" | "every-n-days";

export interface Recurrence {
  type: RecurrenceType;
  enabled: boolean;
  limit?: number;    // undefined = forever; decrements on each auto-creation
  interval?: number; // days interval for "every-n-days"
}

export interface Column {
  id: string;
  title: string;
  archived?: boolean;
}

export interface TaskFilter {
  priorities: TaskPriority[];
  boards: string[];
  startDateFrom: string;
  startDateTo: string;
  endDateFrom: string;
  endDateTo: string;
}

export const EMPTY_FILTER: TaskFilter = {
  priorities: [],
  boards: [],
  startDateFrom: "",
  startDateTo: "",
  endDateFrom: "",
  endDateTo: "",
};

export interface Workspace {
  id: string;
  name: string;
}

export const DEFAULT_COLUMNS: Column[] = [
  { id: "todo",  title: "To Do" },
  { id: "doing", title: "Doing" },
  { id: "done",  title: "Done" },
];
