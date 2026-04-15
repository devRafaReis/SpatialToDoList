import { useState, useCallback, useRef } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Task, TaskStatus, COLUMNS } from "@/types/task";
import { useTasks } from "@/hooks/useTasks";
import KanbanColumn from "@/components/KanbanColumn";
import TaskDialog from "@/components/TaskDialog";
import Header from "@/components/Header";
import StarParticles from "@/components/StarParticles";
import NyanCatEasterEgg from "@/components/NyanCatEasterEgg";

const KanbanBoard = () => {
  const { tasksByStatus, addTask, updateTask, deleteTask, moveTask, reorderTasks, moveTaskBetweenColumns } = useTasks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskId, setNewTaskId] = useState<string | null>(null);
  const [teleportedTaskId, setTeleportedTaskId] = useState<string | null>(null);
  const newTaskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;

      const destStatus   = destination.droppableId as TaskStatus;
      const sourceStatus = source.droppableId as TaskStatus;

      if (sourceStatus === destStatus) {
        const ids = tasksByStatus[destStatus].map((t) => t.id);
        ids.splice(source.index, 1);
        ids.splice(destination.index, 0, draggableId);
        reorderTasks(destStatus, ids);
      } else {
        const sourceIds = tasksByStatus[sourceStatus]
          .filter((t) => t.id !== draggableId)
          .map((t) => t.id);
        const destIds = [...tasksByStatus[destStatus].map((t) => t.id)];
        destIds.splice(destination.index, 0, draggableId);
        moveTaskBetweenColumns(draggableId, sourceStatus, destStatus, destination.index, sourceIds, destIds);
      }
    },
    [tasksByStatus, reorderTasks, moveTaskBetweenColumns]
  );

  const handleAddTask = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleSave = (title: string, description: string, status?: TaskStatus, priority?: Task["priority"]) => {
    if (editingTask) {
      updateTask(editingTask.id, { title, description, priority });
    } else {
      const id = addTask(title, description, status, priority);
      if (newTaskTimerRef.current) clearTimeout(newTaskTimerRef.current);
      setNewTaskId(id);
      newTaskTimerRef.current = setTimeout(() => {
        setNewTaskId(null);
        newTaskTimerRef.current = null;
      }, 1200);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <StarParticles />
      <NyanCatEasterEgg />
      <div className="relative z-10 flex flex-1 flex-col">
        <Header onAddTask={handleAddTask} />
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="mx-auto w-full max-w-screen-2xl grid auto-rows-min grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:p-6">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={tasksByStatus[col.id]}
                onEditTask={handleEditTask}
                onDeleteTask={deleteTask}
                onMoveTask={(id, status) => {
                  moveTask(id, status, Date.now());
                  setTeleportedTaskId(id);
                  setTimeout(() => setTeleportedTaskId(null), 1200);
                }}
                newTaskId={newTaskId}
                teleportedTaskId={teleportedTaskId}
              />
            ))}
          </div>
        </DragDropContext>
        <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editingTask} onSave={handleSave} />
      </div>
    </div>
  );
};

export default KanbanBoard;
