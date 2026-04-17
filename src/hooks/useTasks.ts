import { useMemo } from "react";
import { useTaskContext } from "@/store/taskStore";

export const useTasks = () => {
  const ctx = useTaskContext();

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, typeof ctx.tasks> = {};
    ctx.boards.forEach((b) => { grouped[b.id] = []; });
    ctx.tasks.forEach((t) => {
      if (grouped[t.status] !== undefined) {
        grouped[t.status].push(t);
      } else if (ctx.boards.length > 0) {
        grouped[ctx.boards[0].id].push(t);
      }
    });
    Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.order - b.order));
    return grouped;
  }, [ctx.tasks, ctx.boards]);

  return { ...ctx, tasksByStatus };
};
