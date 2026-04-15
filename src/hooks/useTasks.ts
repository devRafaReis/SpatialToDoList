import { useMemo } from "react";
import { useTaskContext } from "@/store/taskStore";
import { TaskStatus } from "@/types/task";

export const useTasks = () => {
  const ctx = useTaskContext();

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, typeof ctx.tasks> = { todo: [], doing: [], done: [], cancelled: [] };
    ctx.tasks.forEach((t) => grouped[t.status].push(t));
    Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.order - b.order));
    return grouped;
  }, [ctx.tasks]);

  return { ...ctx, tasksByStatus };
};
