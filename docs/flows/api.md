# API / Storage Flow

## Current State: localStorage only, namespaced by workspace

There are **no HTTP requests** in this application. All data is read from and written to `window.localStorage`.

### Storage keys

```
kanban-tasks_<workspaceId>   →  JSON array of Task objects
kanban-boards_<workspaceId>  →  JSON array of Column objects

spatialTodo_workspaces        →  JSON array of Workspace objects
spatialTodo_activeWorkspace   →  string (active workspace id)
spatialTodo_animations        →  "true" | "false"
spatialTodo_lightMode         →  "true" | "false"
spatialTodo_boardLayout       →  "horizontal" | "vertical"
spatialTodo_checklistExpanded →  "true" | "false"
```

### Read path (tasks)

```
Index.tsx renders TaskProvider with key=workspaceId
  → TaskProvider useState initializer
  → createWorkspaceStorage(workspaceId).getTasks()
  → JSON.parse(localStorage.getItem("kanban-tasks_<id>")) ?? []
  → Task[]
```

### Write path (tasks)

```
Any CRUD action (add / update / delete / move / reorder / recurrence)
  → setTasks(newState)                     — React state update
  → useEffect([tasks])                     — fires after every render with changed tasks
  → storage.saveTasks(tasks)               — storage = createWorkspaceStorage(workspaceId)
  → localStorage.setItem("kanban-tasks_<id>", JSON.stringify(tasks))
```

Note: the entire task array is serialised and written on **every change**, regardless of which task changed.

### Workspace switching

When `activeWorkspaceId` changes in `WorkspaceProvider`, `Index.tsx` re-renders `TaskProvider` with a new `key`. React unmounts the old provider (which has already saved its state) and mounts a fresh one that reads from the new workspace keys.

### Migration from legacy keys

On first load (no `spatialTodo_workspaces` in localStorage), `workspaceStore` runs a one-time migration:

```
localStorage["kanban-tasks"]   → copied to → localStorage["kanban-tasks_default"]
localStorage["kanban-boards"]  → copied to → localStorage["kanban-boards_default"]
```

The original keys are preserved (not deleted) to avoid data loss.

### Storage abstraction

`src/services/taskStorage.ts` exports:

```typescript
export interface TaskStorageService {
  getTasks(): Task[];
  saveTasks(tasks: Task[]): void;
  getBoards(): Column[];
  saveBoards(boards: Column[]): void;
}

export const createWorkspaceStorage = (workspaceId: string): TaskStorageService => { … }
```

### Migrating to an API

1. Implement `TaskStorageService` with HTTP calls to your backend. The factory receives `workspaceId` which can map to a tenant, user, or project id.

```typescript
const createApiStorage = (workspaceId: string): TaskStorageService => ({
  getTasks: async () => fetch(`/api/workspaces/${workspaceId}/tasks`).then(r => r.json()),
  saveTasks: (tasks) => fetch(`/api/workspaces/${workspaceId}/tasks`, { method: "PUT", body: JSON.stringify(tasks) }),
  getBoards: async () => fetch(`/api/workspaces/${workspaceId}/boards`).then(r => r.json()),
  saveBoards: (boards) => fetch(`/api/workspaces/${workspaceId}/boards`, { method: "PUT", body: JSON.stringify(boards) }),
});
```

2. Replace `createWorkspaceStorage` in `taskStore.tsx`:

```typescript
// Before:
const storage = useMemo(() => createWorkspaceStorage(workspaceId), [workspaceId]);

// After:
const storage = useMemo(() => createApiStorage(workspaceId), [workspaceId]);
```

3. The save `useEffect`s become fire-and-forget HTTP calls. You may want to swap them for `@tanstack/react-query` mutations for proper loading/error states — `QueryClient` is already mounted in `App.tsx`.

No other file needs modification.

### Error handling

`localStorageService` catches JSON parse errors in reads and returns `[]` / `DEFAULT_COLUMNS`. Writes have no error handling — if `localStorage` is full or unavailable, writes silently fail.
