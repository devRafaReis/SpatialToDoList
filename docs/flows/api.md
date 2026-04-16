# API / Storage Flow

## Current State: localStorage only

There are **no HTTP requests** in this application. No `fetch`, `axios`, or `@tanstack/react-query` queries are made. All data is read from and written to `window.localStorage`.

### Storage key

```
localStorage["kanban-tasks"]  →  JSON array of Task objects
```

### Read path

```
Component mount
  → TaskProvider useState initialiser
  → taskStorage.getTasks()
  → localStorageService.getTasks()
  → JSON.parse(localStorage.getItem("kanban-tasks")) ?? []
  → Task[]
```

### Write path

```
Any CRUD action (add / update / delete / move / reorder)
  → setTasks(newState)            — React state update
  → useEffect([tasks])            — fires after every render with changed tasks
  → taskStorage.saveTasks(tasks)
  → localStorageService.saveTasks(tasks)
  → localStorage.setItem("kanban-tasks", JSON.stringify(tasks))
```

Note: the entire task array is serialised and written on **every change**, regardless of which task changed.

### Storage abstraction

`src/services/taskStorage.ts` defines:

```typescript
export interface TaskStorageService {
  getTasks(): Task[];
  saveTasks(tasks: Task[]): void;
}
```

The active implementation is exported as `taskStorage`. To swap to an API:

1. Create `apiStorageService: TaskStorageService` that calls your backend.
2. Change the last line of `taskStorage.ts`:
   ```typescript
   export const taskStorage: TaskStorageService = apiStorageService;
   ```
3. No other file needs modification.

### Error handling

`localStorageService.getTasks()` catches JSON parse errors and returns `[]`. `saveTasks` has no error handling — if `localStorage` is full or unavailable, the write silently fails.

### @tanstack/react-query

`QueryClient` is instantiated and provided in `App.tsx` but is not used for any data fetching. It is available for future use.
