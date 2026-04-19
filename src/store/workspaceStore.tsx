import { createContext, useContext, useEffect, useState } from "react";
import { Workspace } from "@/types/task";
import { useAuth } from "@/store/authStore";
import {
  fetchWorkspaces,
  upsertWorkspace,
  deleteWorkspaceRemote,
} from "@/services/supabaseStorage";
import { STORAGE_KEYS } from "@/constants/storageKeys";

export const DEFAULT_WORKSPACE_ID = "default";

function initWorkspaces(): { workspaces: Workspace[]; activeId: string } {
  const raw = localStorage.getItem(STORAGE_KEYS.WORKSPACES);
  if (!raw) {
    const workspaces: Workspace[] = [{ id: DEFAULT_WORKSPACE_ID, name: "Personal" }];
    const oldTasks = localStorage.getItem(STORAGE_KEYS.LEGACY_TASKS);
    const oldBoards = localStorage.getItem(STORAGE_KEYS.LEGACY_BOARDS);
    if (oldTasks) localStorage.setItem(STORAGE_KEYS.tasks(DEFAULT_WORKSPACE_ID), oldTasks);
    if (oldBoards) localStorage.setItem(STORAGE_KEYS.boards(DEFAULT_WORKSPACE_ID), oldBoards);
    localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(workspaces));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKSPACE, DEFAULT_WORKSPACE_ID);
    return { workspaces, activeId: DEFAULT_WORKSPACE_ID };
  }
  try {
    const workspaces: Workspace[] = JSON.parse(raw);
    const savedId = localStorage.getItem(STORAGE_KEYS.ACTIVE_WORKSPACE);
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
  const { user } = useAuth();
  const [{ workspaces, activeId }, setState] = useState(initWorkspaces);

  // Sync with Supabase when auth state changes
  useEffect(() => {
    if (!user) {
      // Logged out — revert to localStorage state
      setState(initWorkspaces());
      return;
    }
    fetchWorkspaces(user.id)
      .then((cloudWs) => {
        if (cloudWs.length === 0) {
          // First login — migrate local workspaces to Supabase
          const local = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKSPACES) || "[]") as Workspace[];
          (local.length > 0 ? local : [{ id: DEFAULT_WORKSPACE_ID, name: "Personal" }])
            .forEach((ws) => upsertWorkspace(user.id, ws).catch(console.error));
        } else {
          const savedActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_WORKSPACE);
          const newActiveId = cloudWs.some((w) => w.id === savedActive) ? savedActive! : cloudWs[0].id;
          localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(cloudWs));
          localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKSPACE, newActiveId);
          setState({ workspaces: cloudWs, activeId: newActiveId });
        }
      })
      .catch(console.error);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = (ws: Workspace[], id: string) => {
    localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(ws));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKSPACE, id);
    setState({ workspaces: ws, activeId: id });
  };

  const setActiveWorkspace = (id: string) => persist(workspaces, id);

  const addWorkspace = (name: string) => {
    const id = `ws-${crypto.randomUUID().slice(0, 8)}`;
    const ws = { id, name };
    const updated = [...workspaces, ws];
    persist(updated, id);
    if (user) upsertWorkspace(user.id, ws).catch(console.error);
  };

  const renameWorkspace = (id: string, name: string) => {
    const updated = workspaces.map((w) => (w.id === id ? { ...w, name } : w));
    persist(updated, activeId);
    if (user) upsertWorkspace(user.id, { id, name }).catch(console.error);
  };

  const deleteWorkspace = (id: string) => {
    if (workspaces.length <= 1) return;
    localStorage.removeItem(STORAGE_KEYS.tasks(id));
    localStorage.removeItem(STORAGE_KEYS.boards(id));
    const updated = workspaces.filter((w) => w.id !== id);
    const newActiveId = id === activeId ? updated[0].id : activeId;
    persist(updated, newActiveId);
    if (user) deleteWorkspaceRemote(id).catch(console.error); // cascades boards + tasks in DB
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
