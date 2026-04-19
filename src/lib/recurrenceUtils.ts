import { addDays, addWeeks, addMonths, parseISO, format, getDay } from "date-fns";
import type { Task, RecurrenceType } from "@/types/task";

export function shiftDate(dateStr: string, type: RecurrenceType, interval?: number): string {
  const d = parseISO(dateStr);
  if (type === "daily") return format(addDays(d, 1), "yyyy-MM-dd");
  if (type === "daily-weekdays") {
    let next = addDays(d, 1);
    while (getDay(next) === 0 || getDay(next) === 6) next = addDays(next, 1);
    return format(next, "yyyy-MM-dd");
  }
  if (type === "every-n-days") return format(addDays(d, interval ?? 2), "yyyy-MM-dd");
  if (type === "weekly") return format(addWeeks(d, 1), "yyyy-MM-dd");
  return format(addMonths(d, 1), "yyyy-MM-dd");
}

export function buildNextOccurrence(task: Task, firstBoardId: string): Task | null {
  const rec = task.recurrence!;
  if (rec.limit !== undefined && rec.limit <= 0) return null;
  const now = new Date().toISOString();
  return {
    ...task,
    id: crypto.randomUUID(),
    status: firstBoardId,
    order: Math.floor(Date.now() / 1000) + 1,
    createdAt: now,
    updatedAt: now,
    startDate: task.startDate ? shiftDate(task.startDate, rec.type, rec.interval) : undefined,
    endDate:   task.endDate   ? shiftDate(task.endDate,   rec.type, rec.interval) : undefined,
    checklist: task.checklist?.map((i) => ({ ...i, done: false })),
    recurrence: { ...rec, limit: rec.limit !== undefined ? rec.limit - 1 : undefined },
  };
}
