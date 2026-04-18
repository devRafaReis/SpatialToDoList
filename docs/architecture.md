# Architecture

## Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Framework | React 18 + TypeScript |
| Build | Vite 5 + `@vitejs/plugin-react-swc` |
| Styling | Tailwind CSS 3 + CSS variables (dark galaxy / light mode) |
| UI components | shadcn/ui (`src/components/ui/`) via Radix UI primitives |
| Drag-and-drop | `@hello-pangea/dnd` |
| Routing | react-router-dom v6 (future v7 flags enabled) |
| Date math | date-fns |
| State | React Context (`WorkspaceProvider` → `SettingsProvider` → `TaskProvider`) |
| Persistence | `localStorage` namespaced by workspace |
| Testing | Vitest + jsdom + Testing Library |

## Application Structure

Single-page app with 2 routes:

```
/ → Index → TaskProvider(key=workspaceId) → KanbanBoard
* → NotFound
```

`App.tsx` mounts providers in this order:

```
QueryClientProvider
  └── WorkspaceProvider     (workspace list + active workspace)
        └── SettingsProvider  (animations, theme, layout, checklist defaults)
              └── TooltipProvider
                    └── BrowserRouter → Routes
```

**Note:** `@tanstack/react-query` is installed but not used for task data; all data flows through React Context.

## Data Flow

### Task data

```
WorkspaceProvider  (src/store/workspaceStore.tsx)
  └── activeWorkspaceId  →  TaskProvider key prop
        └── TaskProvider (src/store/taskStore.tsx)
              └── React Context: Task[] + Board[] + CRUD handlers
                    └── useEffect syncs to localStorage on every state change
                          └── createWorkspaceStorage(workspaceId)
                                └── kanban-tasks_<workspaceId>
                                    kanban-boards_<workspaceId>
```

Components read state via `useTaskContext()` → `useTasks()`:

```
useTasks()  (src/hooks/useTasks.ts)
  ├── Calls useTaskContext() for raw tasks + boards + actions
  └── Returns tasksByStatus: Record<TaskStatus, Task[]>  (memoized, sorted by task.order)
```

### Workspace switching

`TaskProvider` receives `workspaceId` as a prop and is mounted with `key={activeWorkspaceId}` in `Index.tsx`. When the active workspace changes, React unmounts and remounts `TaskProvider` entirely — `useState` initializers re-run and load the new workspace's data from localStorage. No explicit reset logic is needed.

### Settings data

```
SettingsProvider  (src/store/settingsStore.tsx)
  └── localStorage keys:
        spatialTodo_animations       ("true" / "false")
        spatialTodo_lightMode        ("true" / "false")
        spatialTodo_boardLayout      ("horizontal" / "vertical")
        spatialTodo_checklistExpanded ("true" / "false")
```

### Workspace data

```
WorkspaceProvider  (src/store/workspaceStore.tsx)
  └── localStorage keys:
        spatialTodo_workspaces       (JSON: Workspace[])
        spatialTodo_activeWorkspace  (string: workspace id)
```

On first load (no `spatialTodo_workspaces` key): creates default workspace `{ id: "default", name: "Personal" }` and migrates legacy keys `kanban-tasks` / `kanban-boards` to `kanban-tasks_default` / `kanban-boards_default`.

## Component Tree

```
KanbanBoard
  ├── StarParticles          (canvas — twinkling stars + periodic comet)
  ├── SpaceEasterEggs        (canvas — pixel-art Nyan Cat every 5 min)
  ├── Header
  │     ├── WorkspaceSwitcher  (dropdown: switch/create/rename/delete workspaces)
  │     ├── FilterPopover      (filter by priority, board, start date, end date)
  │     └── SettingsDialog     (animations, layout, checklist defaults, light mode)
  ├── DragDropContext        (@hello-pangea/dnd)
  │     └── KanbanColumn ×N  (dynamic boards — droppable)
  │           └── TaskCard   (Draggable)
  │                 ├── DragParticles       (canvas — active while dragging)
  │                 ├── BigBangCanvas       (canvas — burst on new card)
  │                 ├── BlackHoleCanvas     (canvas — vortex on delete)
  │                 ├── PortalExitCanvas    (canvas — swirl on move out)
  │                 ├── PortalEntryCanvas   (canvas — scatter on arrival)
  │                 └── Inline checklist    (checkbox items + progress bar)
  ├── BoardBlackHoleCanvas   (canvas — full-board black hole on board delete)
  └── TaskDialog             (create/edit modal — planning, checklist, recurrence)
```

## Task Data Model

```typescript
interface Task {
  id: string;               // crypto.randomUUID()
  title: string;
  description: string;
  status: TaskStatus;       // board id string (dynamic)
  priority?: TaskPriority;  // "low" | "medium" | "high" | "critical"
  order: number;            // Date.now() on creation; array index after reorder
  userId?: string;          // reserved, never populated
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
  estimatedHours?: number;
  estimatedMinutes?: number;
  startDate?: string;       // "yyyy-MM-dd"
  endDate?: string;         // "yyyy-MM-dd"
  checklist?: ChecklistItem[];
  recurrence?: Recurrence;
}

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

type RecurrenceType = "daily" | "daily-weekdays" | "weekly" | "monthly";

interface Recurrence {
  type: RecurrenceType;
  enabled: boolean;
  limit?: number;  // undefined = forever; decrements on each auto-creation; stops at 0
}
```

## Board (Column) Data Model

```typescript
interface Column {
  id: string;    // "todo" / "doing" / "done" for defaults; "board-<uuid>" for custom
  title: string;
}
```

`TaskStatus` is a plain `string` (the board id). There are no fixed status values — all boards are user-configurable.

## Workspace Data Model

```typescript
interface Workspace {
  id: string;   // "default" for the first workspace; "ws-<uuid>" for subsequent
  name: string;
}
```

## Recurrence Logic

When a task with `recurrence.enabled = true` is moved to the **last board** (by position in the boards array), `buildNextOccurrence` is called inside `setTasks`:

1. If `limit` is defined and `≤ 0`: no new task is created (recurrence exhausted).
2. Otherwise: a new `Task` is created with:
   - New `id` and `createdAt`/`updatedAt`
   - `status` = first board's id
   - `startDate`/`endDate` shifted forward by the interval (skipping weekends for `daily-weekdays`)
   - All checklist items reset to `done: false`
   - `recurrence.limit` decremented by 1 (if it was defined)

This logic runs inside both `moveTask` (button-triggered moves) and `moveTaskBetweenColumns` (drag-drop moves).

## Drag-and-Drop Logic

Handled in `KanbanBoard.handleDragEnd`:

- **Card in same board**: `reorderTasks(status, reorderedIds)` — splices id array, updates `order` as array index.
- **Card cross-board**: `moveTaskBetweenColumns(taskId, src, dest, destIndex, srcIds, destIds)` — updates moved task's `status` + `order`, re-numbers both boards. If destination is the last board and task is recurring, auto-creates next occurrence.
- **Board reorder**: `reorderBoards(orderedIds)`.

## Filter Logic

`KanbanBoard` holds a `filter: TaskFilter` state. Two memos derive the visible data:

```typescript
const visibleBoards = useMemo(…)         // boards matching filter.boards (or all)
const filteredTasksByStatus = useMemo(…) // tasks per board after all filter criteria applied
```

`FilterPopover` renders the filter UI; `Header` passes filter state down to it.

## Animation Architecture

Canvas effects are rendered via `createPortal(…, document.body)` at `position: fixed` coordinates derived from `getBoundingClientRect()`. Key timing details:

- **New card (BigBang):** position captured 210ms after dialog closes (waits for Radix scrollbar-compensation padding-right to be removed).
- **Deleted card (BlackHole):** position captured 220ms after AlertDialog closes, same reason.
- **Moved card (Portal):** position captured immediately in the same frame as the button click (no dialog involved).
- All canvases use `display: block` (not `position: absolute`) so the portal div sizes to the canvas — centering math is `left: x - canvasWidth/2`.

## Theme

Two themes toggled via `lightMode` setting:

| | Dark (default) | Light |
|---|---|---|
| Title | "Spatial ToDoList" | "Boring ToDoList" |
| Background | `hsl(230 25% 9%)` + nebula gradient | white / light gray |
| Animations | Enabled by default | Disabled and locked |
| CSS class | (none) | `document.documentElement.classList → "light"` |

Custom utilities: `.glass`, `.glass-column`, `.glass-drag` (glassmorphism).  
Card animation keyframes: `card-portal-out`, `card-portal-in`, `card-big-bang-in`, `card-suck-in`.

## File Map

```
src/
  App.tsx                    — Router + providers root
  main.tsx                   — ReactDOM.createRoot entry
  index.css                  — Global styles, CSS vars, animation keyframes
  types/task.ts              — All types: Task, Recurrence, Workspace, TaskFilter, Column, PRIORITIES
  store/
    taskStore.tsx            — TaskProvider, CRUD, drag-drop handlers, recurrence auto-creation
    settingsStore.tsx        — SettingsProvider (animations, lightMode, boardLayout, checklist)
    workspaceStore.tsx       — WorkspaceProvider, CRUD, migration of legacy localStorage keys
  services/taskStorage.ts    — createWorkspaceStorage(id): TaskStorageService
  hooks/useTasks.ts          — Grouped/sorted tasks + all context actions
  hooks/useIsMobile.ts       — Breakpoint hook
  lib/utils.ts               — cn() helper (clsx + tailwind-merge)
  pages/Index.tsx            — Route /: mounts TaskProvider with key + workspaceId
  pages/NotFound.tsx         — 404 page
  components/
    KanbanBoard.tsx          — Board orchestrator, drag-drop, filter state, board management
    KanbanColumn.tsx         — Droppable column, collapse toggle, BigBang/BlackHole animations
    TaskCard.tsx             — Draggable card, inline checklist, recurrence badge, canvas effects
    TaskDialog.tsx           — Create/edit modal (planning, checklist, recurrence sections)
    Header.tsx               — WorkspaceSwitcher + FilterPopover + SettingsDialog + add-task button
    FilterPopover.tsx        — Filter UI (priority chips, board chips, date range inputs)
    WorkspaceSwitcher.tsx    — Workspace dropdown with create/rename/delete + confirmation
    SettingsDialog.tsx       — Settings panel (animations, layout, checklist, light mode)
    StarParticles.tsx        — Full-screen background canvas (stars + comet)
    SpaceEasterEggs.tsx      — Full-screen overlay canvas (Nyan Cat easter egg)
    ui/                      — shadcn/ui generated components (do not hand-edit)
  test/
    setup.ts                 — window.matchMedia mock for jsdom
    example.test.ts          — Placeholder test
```
