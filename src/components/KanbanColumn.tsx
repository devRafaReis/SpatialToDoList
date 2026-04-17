import { useState, useRef, useEffect } from "react";
import { Droppable, DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { useSettings } from "@/store/settingsStore";
import { ChevronDown, GripVertical, Pencil, Plus, Trash2, Check, X } from "lucide-react";
import { Task, TaskStatus, Column } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TaskCard from "@/components/TaskCard";

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onMoveTask: (id: string, status: TaskStatus) => void;
  onAddTask: () => void;
  onRenameBoard: (title: string) => void;
  onDeleteBoard: () => void;
  newTaskId?: string | null;
  teleportedTaskId?: string | null;
}

const KanbanColumn = ({
  column, tasks, dragHandleProps,
  onEditTask, onDeleteTask, onMoveTask,
  onAddTask, onRenameBoard, onDeleteBoard,
  newTaskId, teleportedTaskId,
}: KanbanColumnProps) => {
  const { boardLayout } = useSettings();
  const isHorizontal = boardLayout === "vertical";
  const [collapsed, setCollapsed]       = useState(false);
  const [isRenaming, setIsRenaming]     = useState(false);
  const [editTitle, setEditTitle]       = useState(column.title);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const inputRef                        = useRef<HTMLInputElement>(null);

  useEffect(() => { setEditTitle(column.title); }, [column.title]);
  useEffect(() => { if (isRenaming) inputRef.current?.focus(); }, [isRenaming]);

  const commitRename = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== column.title) onRenameBoard(trimmed);
    else setEditTitle(column.title);
    setIsRenaming(false);
  };

  const cancelRename = () => {
    setEditTitle(column.title);
    setIsRenaming(false);
  };

  const handleDeleteConfirm = () => {
    setDeleteOpen(false);
    onDeleteBoard();
  };

  return (
    <>
      <div className="flex flex-col rounded-lg glass-column overflow-hidden">
        {/* Board header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/20">
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Title — editable */}
          {isRenaming ? (
            <div className="flex flex-1 items-center gap-1.5 min-w-0">
              <input
                ref={inputRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") cancelRename();
                }}
                onBlur={commitRename}
                maxLength={40}
                className="flex-1 min-w-0 bg-transparent border-b border-primary/60 text-sm font-semibold text-foreground outline-none py-0.5"
              />
              <button onClick={commitRename} className="text-primary hover:text-primary/80 shrink-0">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={cancelRename} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <h2
              className="flex-1 min-w-0 text-sm font-semibold text-foreground truncate cursor-default select-none"
              onDoubleClick={() => setIsRenaming(true)}
            >
              {column.title}
            </h2>
          )}

          <Badge variant="secondary" className="text-xs shrink-0">{tasks.length}</Badge>

          {!isRenaming && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 text-muted-foreground/50 hover:text-primary shrink-0"
                  onClick={onAddTask}
                  aria-label="Add task"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add task</TooltipContent>
            </Tooltip>
          )}

          {!isRenaming && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground"
                    onClick={() => setCollapsed((c) => !c)}
                    aria-label={collapsed ? "Expand board" : "Collapse board"}
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{collapsed ? "Expand" : "Collapse"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground"
                    onClick={() => setIsRenaming(true)}
                    aria-label="Rename board"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rename</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground/50 hover:text-red-400"
                    onClick={() => setDeleteOpen(true)}
                    aria-label="Delete board"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete board</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Tasks */}
        {collapsed && <div className="h-1" />}
        {!collapsed && <Droppable droppableId={column.id} type="TASK" direction={isHorizontal ? "horizontal" : "vertical"}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-2 transition-colors ${snapshot.isDraggingOver ? "bg-accent/30" : ""} ${
                isHorizontal
                  ? "flex flex-row gap-2 overflow-x-auto min-h-[140px]"
                  : "flex flex-col min-h-[80px]"
              }`}
            >
              {tasks.map((task, index) => (
                isHorizontal ? (
                  <div key={task.id} className="shrink-0 w-64">
                    <TaskCard
                      task={task}
                      index={index}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onMove={onMoveTask}
                      isNew={task.id === newTaskId}
                      isPortalIn={task.id === teleportedTaskId}
                    />
                  </div>
                ) : (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onMove={onMoveTask}
                    isNew={task.id === newTaskId}
                    isPortalIn={task.id === teleportedTaskId}
                  />
                )
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board "{column.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {tasks.length > 0
                ? `The ${tasks.length} task${tasks.length !== 1 ? "s" : ""} in this board will be moved to the first available board.`
                : "This board is empty and will be permanently removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default KanbanColumn;
