# Architecture

## Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Framework | React 18 + TypeScript |
| Build | Vite 5 + `@vitejs/plugin-react-swc` |
| Styling | Tailwind CSS 3 + CSS variables (dark-only theme) |
| UI components | shadcn/ui (`src/components/ui/`) via Radix UI primitives |
| Drag-and-drop | `@hello-pangea/dnd` |
| Routing | react-router-dom v6 |
| State | React Context (`TaskProvider`) |
| Persistence | `localStorage` (key: `kanban-tasks`) |
| Testing | Vitest + jsdom + Testing Library |

## Application Structure

Single-page app with 2 routes:

```
/ → Index → TaskProvider → KanbanBoard
* → NotFound
```

`App.tsx` mounts `QueryClientProvider` + `TooltipProvider` + toast providers globally. **Note:** `@tanstack/react-query` is installed but not used for task data; all data flows through React Context.

## Data Flow

```
TaskProvider  (src/store/taskStore.tsx)
  └── React Context: Task[] + CRUD handlers
        └── useEffect syncs to localStorage on every state change
              └── taskStorage (src/services/taskStorage.ts)
                    └── localStorageService (current impl)
                          └── JSON.parse / JSON.stringify under key "kanban-tasks"
```

Components read state via `useTaskContext()` → `useTasks()`:

```
useTasks()  (src/hooks/useTasks.ts)
  ├── Calls useTaskContext() for raw tasks + actions
  └── Returns tasksByStatus: Record<TaskStatus, Task[]>  (memoized, sorted by task.order)
```

## Component Tree

```
KanbanBoard
  ├── StarParticles          (canvas — twinkling stars + periodic comet)
  ├── NyanCatEasterEgg       (canvas — pixel-art Nyan Cat every 5 min)
  ├── Header                 (title + "Nova Tarefa" button)
  ├── DragDropContext        (@hello-pangea/dnd)
  │     └── KanbanColumn ×4  (todo / doing / done / cancelled)
  │           └── TaskCard   (Draggable — shows title, priority badge, description)
  │                 ├── DragParticles      (canvas — active while card is dragged)
  │                 ├── BigBangCanvas      (canvas — burst effect on new card creation)
  │                 ├── BlackHoleCanvas    (canvas — black hole on delete)
  │                 ├── PortalExitCanvas   (canvas — swirl on move-to-column)
  │                 └── PortalEntryCanvas  (canvas — scatter on arrival)
  └── TaskDialog             (create/edit modal — plain useState, NOT React Hook Form)
```

## Task Data Model

```typescript
interface Task {
  id: string;          // crypto.randomUUID()
  title: string;
  description: string;
  status: TaskStatus;  // "todo" | "doing" | "done" | "cancelled"
  priority?: TaskPriority; // "low" | "medium" | "high" | "critical" — optional
  order: number;       // Date.now() on creation; index after reorder
  userId?: string;     // defined but never set — reserved for multi-user
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
}
```

## Drag-and-Drop Logic

Handled entirely in `KanbanBoard.handleDragEnd`:

- **Same column**: `reorderTasks(status, reorderedIds)` — splices id array, updates `order` as array index.
- **Cross-column**: `moveTaskBetweenColumns(taskId, src, dest, destIndex, srcIds, destIds)` — updates moved task's `status` + `order`, and re-numbers both columns.

## Theme

Dark galaxy theme, CSS-variables-only (no light mode). Defined in `src/index.css`:
- Background: `hsl(230 25% 9%)` with radial gradient nebula overlays
- Primary: `hsl(260 50% 60%)` (violet-purple)
- Custom utilities: `.glass`, `.glass-column`, `.glass-drag` (glassmorphism)
- Card animation keyframes: `card-portal-out`, `card-portal-in`, `card-big-bang-in`, `card-suck-in`

## File Map

```
src/
  App.tsx                   — Router + providers root
  main.tsx                  — ReactDOM.createRoot entry
  index.css                 — Global styles, CSS vars, animation keyframes
  types/task.ts             — Task, TaskStatus, TaskPriority, COLUMNS, PRIORITIES
  store/taskStore.tsx       — Context, TaskProvider, CRUD operations
  services/taskStorage.ts   — TaskStorageService interface + localStorageService
  hooks/useTasks.ts         — Grouped/sorted tasks consumer hook
  hooks/use-mobile.tsx      — Breakpoint hook (shadcn default)
  hooks/use-toast.ts        — Toast hook (shadcn default)
  lib/utils.ts              — cn() helper (clsx + tailwind-merge)
  pages/Index.tsx           — Route component: wraps KanbanBoard in TaskProvider
  pages/NotFound.tsx        — 404 page
  components/
    KanbanBoard.tsx         — Board orchestrator, drag-drop context, dialog state
    KanbanColumn.tsx        — Droppable column wrapper
    TaskCard.tsx            — Draggable card + all canvas effect sub-components
    TaskDialog.tsx          — Create/edit modal (local state, no RHF)
    Header.tsx              — App title + add-task button
    StarParticles.tsx       — Full-screen background canvas (stars + comet)
    NyanCatEasterEgg.tsx    — Full-screen overlay canvas (Nyan Cat easter egg)
    CometTrail.tsx          — Cursor-following particle trail during drag (defined, unused)
    NavLink.tsx             — Router NavLink wrapper (defined, currently unused)
    ui/                     — shadcn/ui generated components (do not hand-edit)
  test/
    setup.ts                — window.matchMedia mock for jsdom
    example.test.ts         — Placeholder test
```
