# Design Decisions

## Storage: workspace-namespaced localStorage with swap-ready interface

`taskStorage.ts` exports `createWorkspaceStorage(workspaceId): TaskStorageService`. Each workspace gets its own localStorage keys:

```
kanban-tasks_<workspaceId>
kanban-boards_<workspaceId>
```

**To migrate to an API:** implement `TaskStorageService` with HTTP calls, replace `createWorkspaceStorage` with your factory. No other file needs changing.

**Current behaviour:** every React state update triggers a `useEffect` that serialises the full task or board array to JSON.

---

## Workspace isolation via React `key` prop

`TaskProvider` is mounted with `key={activeWorkspaceId}` in `Index.tsx`. When the workspace changes, React fully unmounts and remounts `TaskProvider` — the `useState` initializers re-run and load the new workspace's data. This is simpler and safer than trying to reset state imperatively inside a running provider.

---

## Boards are dynamic, not fixed columns

`TaskStatus` is `string` (a board id), not a union of fixed values. The default boards (`todo`, `doing`, `done`) are created on first load but can be renamed, reordered, or deleted. Custom boards get ids in the format `board-<uuid>`.

There is no hardcoded concept of "done" or "completion" — the recurrence system uses **last board by position** as the completion trigger.

---

## Recurrence: last-board trigger, immutable limit countdown

When a recurring task is moved to the last board (rightmost in the boards array), `buildNextOccurrence` runs inside `setTasks`:

- The `limit` field is decremented on each auto-creation and embedded in the new task. The original task retains its value unchanged. The new task carries the decremented count so the chain halts automatically at 0 with no external state.
- `daily-weekdays` skips Saturday and Sunday by repeatedly adding 1 day until a weekday is reached.

This approach is self-contained: the recurrence state travels with the task, requires no scheduler, no cron, and no server.

---

## State: React Context, not a global store library

Task, workspace, and settings state each live in their own `Provider` (React Context + `useState`). No Redux, Zustand, or Jotai. All mutations go through `useCallback`-wrapped handlers exposed via context.

`@tanstack/react-query` is installed (scaffolding default) but is not used for any data fetching.

---

## Animation: portal canvases at fixed viewport coordinates

Canvas animations (BigBang, BlackHole, Portal) are rendered via `createPortal(…, document.body)` at `position: fixed`. Coordinates come from `getBoundingClientRect()` on the card element.

Key subtlety: Radix UI adds `padding-right` to `<body>` (scrollbar compensation) while dialogs are open. Position capture must be delayed ~210–220ms after dialog close so the layout has settled. `BigBangCanvas` and `BlackHoleCanvas` account for this; `PortalExitCanvas` does not need to (no dialog is involved).

Canvas divs use `display: block` so the portal container sizes to the canvas. Centering: `left = x - canvasWidth/2`.

---

## Auto-expand board on task creation

`KanbanColumn` watches `newTaskId` (a prop from `KanbanBoard`). If a task with that id belongs to a collapsed board, the board auto-expands so the BigBang animation is visible. This avoids animating inside a collapsed (invisible) column.

---

## Order field strategy

- **New task:** `order = Date.now()` — guarantees new tasks sort to the bottom of a column.
- **After reorder / cross-column move:** `order` is reassigned as the array index (0, 1, 2 …).
- Recurrence auto-created tasks use `order = Date.now() + 1` to sort after existing tasks.

After any drag, orders become small integers. New tasks will have large `Date.now()` values, always placing them at the bottom. This is consistent but the mixed scale is non-obvious.

---

## TaskDialog: plain useState, not React Hook Form

`react-hook-form` is listed as a dependency but `TaskDialog.tsx` manages all form state with `useState`. Each logical section (planning, checklist, recurrence) is a collapsible accordion-style panel.

---

## Light mode: CSS class toggle, animations disabled

Light mode is toggled by adding/removing the `light` class on `document.documentElement`. The SettingsProvider also forcibly disables animations when light mode is on (animations are thematically tied to the dark galaxy aesthetic). Animations cannot be re-enabled while light mode is active.

---

## Workspace deletion: data purged immediately

When a workspace is deleted, `deleteWorkspace` in `workspaceStore.tsx` calls `localStorage.removeItem` for both storage keys (`kanban-tasks_<id>` and `kanban-boards_<id>`) synchronously, then removes the workspace from the list. The deletion confirmation dialog shows the task count by reading from localStorage before the delete. There is no soft-delete or undo.

---

## TypeScript: strict mode off

`tsconfig.app.json` has `"strict": false` and `"noImplicitAny": false`. Type safety is present but not enforced comprehensively.

---

## shadcn/ui: do not hand-edit

`src/components/ui/` is generated by `bunx shadcn@latest add <component>`. Regenerate via CLI, do not edit directly.

---

## `userId` field: placeholder for future multi-user

`Task.userId?: string` is declared in the type and persisted to localStorage but is never populated by any code path. Reserved for a future authenticated multi-user implementation.
