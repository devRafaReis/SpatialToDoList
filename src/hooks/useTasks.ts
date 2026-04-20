import { useMemo } from "react";
import { useTaskContext } from "@/store/taskContext";

export const useTasks = () => {
  const ctx = useTaskContext();

  const activeBoards = useMemo(() => ctx.boards.filter((b) => !b.archived), [ctx.boards]);

  const tasksByStatus = useMemo(() => {
    const activeBoardIds = new Set(activeBoards.map((b) => b.id));
    const grouped: Record<string, typeof ctx.tasks> = {};
    activeBoards.forEach((b) => { grouped[b.id] = []; });
    ctx.tasks.forEach((t) => {
      if (t.archived) return;
      if (grouped[t.status] !== undefined) {
        grouped[t.status].push(t);
      } else if (!activeBoardIds.has(t.status) && activeBoards.length > 0) {
        // task belongs to an archived board — skip (shown in archive dialog)
      }
    });
    Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.order - b.order));
    return grouped;
  }, [ctx.tasks, activeBoards]);

  return { ...ctx, boards: activeBoards, tasksByStatus };
};
