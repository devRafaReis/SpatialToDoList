import React, { useEffect, useState } from "react";
import { Workspace } from "@/types/task";
import { useAuth } from "@/store/authContext";
import {
  fetchWorkspaces,
  upsertWorkspace,
  deleteWorkspaceRemote,
} from "@/services/supabaseStorage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { WorkspaceContext, DEFAULT_WORKSPACE_ID } from "@/store/workspaceContext";

function initWorkspaces(): { workspaces: Workspace[]; activeId: string } {
  const raw = localStorage.getItem(STORAGE_KEYS.WORKSPACES);
  if (!raw) {
    // Generate a unique ID so multiple users never share the same workspace/board IDs in Supabase.
    // Legacy data (LEGACY_TASKS/BOARDS) is migrated under DEFAULT_WORKSPACE_ID to preserve it.
    const hasLegacy = !!(localStorage.getItem(STORAGE_KEYS.LEGACY_TASKS) || localStorage.getItem(STORAGE_KEYS.LEGACY_BOARDS));
    const newId = hasLegacy ? DEFAULT_WORKSPACE_ID : crypto.randomUUID();
    const workspaces: Workspace[] = [{ id: newId, name: "Personal" }];
    if (hasLegacy) {
      const oldTasks = localStorage.getItem(STORAGE_KEYS.LEGACY_TASKS);
      const oldBoards = localStorage.getItem(STORAGE_KEYS.LEGACY_BOARDS);
      if (oldTasks) localStorage.setItem(STORAGE_KEYS.tasks(newId), oldTasks);
      if (oldBoards) localStorage.setItem(STORAGE_KEYS.boards(newId), oldBoards);
    }
    localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(workspaces));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKSPACE, newId);
    return { workspaces, activeId: newId };
  }
  try {
    const workspaces: Workspace[] = JSON.parse(raw);
    const savedId = localStorage.getItem(STORAGE_KEYS.ACTIVE_WORKSPACE);
    const activeId = workspaces.some((w) => w.id === savedId) ? savedId! : workspaces[0].id;
    return { workspaces, activeId };
  } catch {
    const fallbackId = crypto.randomUUID();
    return { workspaces: [{ id: fallbackId, name: "Personal" }], activeId: fallbackId };
  }
}

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

    // Detect user switch: if a different user was last logged in, clear their local data
    // to prevent workspace/task contamination across accounts on the same device.
    const lastUserId = localStorage.getItem(STORAGE_KEYS.LAST_USER_ID);
    if (lastUserId && lastUserId !== user.id) {
      const prevWorkspaces = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKSPACES) || "[]") as Workspace[];
      prevWorkspaces.forEach((ws) => {
        localStorage.removeItem(STORAGE_KEYS.tasks(ws.id));
        localStorage.removeItem(STORAGE_KEYS.boards(ws.id));
      });
      localStorage.removeItem(STORAGE_KEYS.WORKSPACES);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_WORKSPACE);
      setState(initWorkspaces());
    }
    localStorage.setItem(STORAGE_KEYS.LAST_USER_ID, user.id);

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
