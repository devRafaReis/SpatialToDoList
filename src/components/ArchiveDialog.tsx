import { useState } from "react";
import { Archive, RotateCcw, Trash2, ChevronDown } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTaskContext } from "@/store/taskContext";
import { useTranslation } from "@/i18n/translations";
import { PRIORITIES } from "@/types/task";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ArchiveDialog = ({ open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const { tasks, boards, unarchiveTask, deleteTask, unarchiveBoard, deleteArchivedBoard } = useTaskContext();
  const [boardsExpanded, setBoardsExpanded] = useState(true);
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "task" | "board"; id: string; label: string } | null>(null);

  const archivedBoards = boards.filter((b) => b.archived);
  const archivedTasks  = tasks.filter((t) => t.archived);

  const boardTaskCount = (boardId: string) => tasks.filter((t) => t.status === boardId).length;

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "task") deleteTask(confirmDelete.id);
    else deleteArchivedBoard(confirmDelete.id);
    setConfirmDelete(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-lg rounded-lg max-h-[80vh] flex flex-col" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Archive className="h-4 w-4 text-muted-foreground" />
              {t("archiveDialogTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {/* ── Archived boards ─────────────────────────────────────────── */}
            <section className="rounded-md border border-border/40 bg-muted/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setBoardsExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{t("archivedBoards")} ({archivedBoards.length})</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${boardsExpanded ? "" : "-rotate-90"}`} />
              </button>

              {boardsExpanded && (
                <div className="border-t border-border/30 divide-y divide-border/20">
                  {archivedBoards.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted-foreground/60 text-center">{t("noArchivedBoards")}</p>
                  ) : archivedBoards.map((board) => {
                    const count = boardTaskCount(board.id);
                    return (
                      <div key={board.id} className="flex items-center gap-2 px-3 py-2">
                        <span className="flex-1 min-w-0 text-sm truncate">{board.title}</span>
                        <span className="text-[10px] text-muted-foreground/60 shrink-0">{count} task{count !== 1 ? "s" : ""}</span>
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground/50 hover:text-primary"
                          onClick={() => unarchiveBoard(board.id)}
                          title={t("restore")}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground/50 hover:text-red-400"
                          onClick={() => setConfirmDelete({ type: "board", id: board.id, label: board.title })}
                          title={t("deleteBoardAndTasks")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Archived tasks ───────────────────────────────────────────── */}
            <section className="rounded-md border border-border/40 bg-muted/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setTasksExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{t("archivedTasks")} ({archivedTasks.length})</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${tasksExpanded ? "" : "-rotate-90"}`} />
              </button>

              {tasksExpanded && (
                <div className="border-t border-border/30 divide-y divide-border/20">
                  {archivedTasks.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted-foreground/60 text-center">{t("noArchivedTasks")}</p>
                  ) : archivedTasks.map((task) => {
                    const boardName = boards.find((b) => b.id === task.status)?.title ?? "—";
                    const priority  = task.priority ? PRIORITIES.find((p) => p.id === task.priority) : null;
                    return (
                      <div key={task.id} className="flex items-center gap-2 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{task.title}</p>
                          <p className="text-[10px] text-muted-foreground/60 truncate">
                            {boardName}
                            {priority && <span className={`ml-1.5 inline-flex items-center gap-0.5 rounded-full border px-1 py-0 ${priority.badgeClass}`}><span className={`h-1.5 w-1.5 rounded-full ${priority.dotClass}`} />{priority.label}</span>}
                          </p>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground/50 hover:text-primary"
                          onClick={() => unarchiveTask(task.id)}
                          title={t("restore")}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground/50 hover:text-red-400"
                          onClick={() => setConfirmDelete({ type: "task", id: task.id, label: task.title })}
                          title={t("delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.type === "board"
                ? t("deleteBoardAndTasks")
                : t("delete")}
              {" "}<strong>"{confirmDelete?.label}"</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ArchiveDialog;
