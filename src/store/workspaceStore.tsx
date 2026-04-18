import { createContext, useContext, useState } from "react";
import { Workspace } from "@/types/task";

const WORKSPACES_KEY = "spatialTodo_workspaces";
const ACTIVE_KEY = "spatialTodo_activeWorkspace";
export const DEFAULT_WORKSPACE_ID = "default";

function initWorkspaces(): { workspaces: Workspace[]; activeId: string } {
  const raw = localStorage.getItem(WORKSPACES_KEY);
  if (!raw) {
    const workspaces: Workspace[] = [{ id: DEFAULT_WORKSPACE_ID, name: "Personal" }];
    // Migrate legacy keys to namespaced keys
    const oldTasks = localStorage.getItem("kanban-tasks");
    const oldBoards = localStorage.getItem("kanban-boards");
    if (oldTasks) localStorage.setItem(`kanban-tasks_${DEFAULT_WORKSPACE_ID}`, oldTasks);
    if (oldBoards) localStorage.setItem(`kanban-boards_${DEFAULT_WORKSPACE_ID}`, oldBoards);
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
    localStorage.setItem(ACTIVE_KEY, DEFAULT_WORKSPACE_ID);
    return { workspaces, activeId: DEFAULT_WORKSPACE_ID };
  }
  try {
    const workspaces: Workspace[] = JSON.parse(raw);
    const savedId = localStorage.getItem(ACTIVE_KEY);
    const activeId = workspaces.some((w) => w.id === savedId) ? savedId! : workspaces[0].id;
    return { workspaces, activeId };
  } catch {
    return { workspaces: [{ id: DEFAULT_WORKSPACE_ID, name: "Personal" }], activeId: DEFAULT_WORKSPACE_ID };
  }
}

type WorkspaceContextType = {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  setActiveWorkspace: (id: string) => void;
  addWorkspace: (name: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const [{ workspaces, activeId }, setState] = useState(initWorkspaces);

  const persist = (ws: Workspace[], id: string) => {
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(ws));
    localStorage.setItem(ACTIVE_KEY, id);
    setState({ workspaces: ws, activeId: id });
  };

  const setActiveWorkspace = (id: string) => persist(workspaces, id);

  const addWorkspace = (name: string) => {
    const id = `ws-${crypto.randomUUID().slice(0, 8)}`;
    const updated = [...workspaces, { id, name }];
    persist(updated, id);
  };

  const renameWorkspace = (id: string, name: string) => {
    persist(workspaces.map((w) => (w.id === id ? { ...w, name } : w)), activeId);
  };

  const deleteWorkspace = (id: string) => {
    if (workspaces.length <= 1) return;
    // Remove workspace data
    localStorage.removeItem(`kanban-tasks_${id}`);
    localStorage.removeItem(`kanban-boards_${id}`);
    const updated = workspaces.filter((w) => w.id !== id);
    const newActiveId = id === activeId ? updated[0].id : activeId;
    persist(updated, newActiveId);
  };

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspaceId: activeId, setActiveWorkspace, addWorkspace, renameWorkspace, deleteWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be inside WorkspaceProvider");
  return ctx;
};
