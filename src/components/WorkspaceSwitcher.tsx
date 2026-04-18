import { useState } from "react";
import { Check, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/store/workspaceStore";
import { createWorkspaceStorage } from "@/services/taskStorage";

type EditMode = { type: "create" } | { type: "rename"; id: string; current: string };
type DeleteTarget = { id: string; name: string; taskCount: number };

const WorkspaceSwitcher = () => {
  const { workspaces, activeWorkspaceId, setActiveWorkspace, addWorkspace, renameWorkspace, deleteWorkspace } = useWorkspace();
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const openCreate = () => {
    setInputValue("");
    setEditMode({ type: "create" });
  };

  const openRename = (id: string, current: string) => {
    setInputValue(current);
    setEditMode({ type: "rename", id, current });
  };

  const openDelete = (id: string, name: string) => {
    const storage = createWorkspaceStorage(id);
    const taskCount = storage.getTasks().length;
    setDeleteTarget({ id, name, taskCount });
  };

  const handleEditConfirm = () => {
    const name = inputValue.trim();
    if (!name || !editMode) return;
    if (editMode.type === "create") {
      addWorkspace(name);
    } else {
      renameWorkspace(editMode.id, name);
    }
    setEditMode(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteWorkspace(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 gap-1.5 px-2 text-sm font-semibold max-w-[180px]">
            <span className="truncate">{activeWorkspace?.name ?? "Workspace"}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              className="group flex items-center gap-2 pr-1"
              onSelect={(e) => {
                e.preventDefault();
                if (ws.id !== activeWorkspaceId) setActiveWorkspace(ws.id);
              }}
            >
              <Check className={`h-3.5 w-3.5 shrink-0 ${ws.id === activeWorkspaceId ? "opacity-100" : "opacity-0"}`} />
              <span className="flex-1 truncate">{ws.name}</span>
              <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  onClick={(e) => { e.stopPropagation(); openRename(ws.id, ws.name); }}
                  aria-label="Rename workspace"
                  title="Rename"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                {workspaces.length > 1 && (
                  <button
                    className="rounded p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
                    onClick={(e) => { e.stopPropagation(); openDelete(ws.id, ws.name); }}
                    aria-label="Delete workspace"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openCreate(); }} className="gap-2 text-muted-foreground">
            <Plus className="h-3.5 w-3.5" />
            New workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create / Rename dialog */}
      <Dialog open={editMode !== null} onOpenChange={(open) => { if (!open) setEditMode(null); }}>
        <DialogContent className="sm:max-w-xs" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editMode?.type === "create" ? "New workspace" : "Rename workspace"}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="workspace-name" className="sr-only">Name</Label>
            <Input
              id="workspace-name"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Workspace name"
              onKeyDown={(e) => { if (e.key === "Enter") handleEditConfirm(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMode(null)}>Cancel</Button>
            <Button onClick={handleEditConfirm} disabled={!inputValue.trim()}>
              {editMode?.type === "create" ? "Create" : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm" aria-describedby="delete-ws-desc">
          <DialogHeader>
            <DialogTitle>Delete workspace</DialogTitle>
            <DialogDescription id="delete-ws-desc">
              {deleteTarget && (
                <>
                  Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
                  {deleteTarget.taskCount > 0 ? (
                    <span className="mt-1 block text-destructive">
                      This workspace contains <strong>{deleteTarget.taskCount} task{deleteTarget.taskCount !== 1 ? "s" : ""}</strong> that will be permanently deleted.
                    </span>
                  ) : (
                    <span className="mt-1 block">This workspace has no tasks.</span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkspaceSwitcher;
