import { Droppable } from "@hello-pangea/dnd";
import { Task, TaskStatus, Column } from "@/types/task";
import TaskCard from "@/components/TaskCard";
import { Badge } from "@/components/ui/badge";

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onMoveTask: (id: string, status: TaskStatus) => void;
  newTaskId?: string | null;
  teleportedTaskId?: string | null;
}

const KanbanColumn = ({ column, tasks, onEditTask, onDeleteTask, onMoveTask, newTaskId, teleportedTaskId }: KanbanColumnProps) => {
  return (
    <div className="flex min-w-0 flex-col rounded-lg glass-column p-3" style={{ isolation: "auto" }}>
      <div className="mb-3 flex items-center gap-2 px-1">
        <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
        <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[120px] rounded-md p-1 transition-colors ${
              snapshot.isDraggingOver ? "bg-accent/50" : ""
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} onEdit={onEditTask} onDelete={onDeleteTask} onMove={onMoveTask} isNew={task.id === newTaskId} isPortalIn={task.id === teleportedTaskId} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
