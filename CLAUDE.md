# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev              # Start dev server (port 8080)
bun run build        # Production build
bun run build:dev    # Development mode build
bun run lint         # ESLint
bun test             # Run all tests once
bun run test:watch   # Run tests in watch mode
bunx vitest src/path/to/specific.test.ts  # Run a single test file
```

## Architecture

This is a Kanban board app (React 18 + TypeScript + Vite) with dynamic user-configurable boards.

### Provider hierarchy

```
App.tsx
  WorkspaceProvider  (src/store/workspaceStore.tsx)
    SettingsProvider (src/store/settingsStore.tsx)
      TooltipProvider
        BrowserRouter
          Index.tsx → TaskProvider(key=workspaceId, workspaceId=activeId) → KanbanBoard
```

### Data flow

```
WorkspaceProvider → activeWorkspaceId
  → TaskProvider (key=activeWorkspaceId — full remount on workspace switch)
        └── React Context: Task[] + Column[] + CRUD handlers
              └── persists to localStorage via createWorkspaceStorage(workspaceId)
                    └── keys: kanban-tasks_<id>, kanban-boards_<id>
```

Components consume tasks via `useTaskContext()` → `useTasks()` hook which returns tasks grouped by status.

Settings persist under `spatialTodo_*` keys. Workspace list and active workspace persist under `spatialTodo_workspaces` / `spatialTodo_activeWorkspace`.

### Key files

| File | Role |
|---|---|
| `src/store/taskStore.tsx` | Task + board state, CRUD, drag-drop handlers, recurrence auto-creation |
| `src/store/settingsStore.tsx` | Animations, light mode, board layout, checklist defaults |
| `src/store/workspaceStore.tsx` | Workspace list, active workspace, first-load migration of legacy keys |
| `src/services/taskStorage.ts` | `createWorkspaceStorage(id): TaskStorageService` — swap this for API migration |
| `src/types/task.ts` | `Task`, `Recurrence`, `Workspace`, `TaskFilter`, `Column`, `PRIORITIES` |
| `src/hooks/useTasks.ts` | Subscribes to context, groups tasks by status with memoization |
| `src/components/KanbanBoard.tsx` | Board orchestrator — `DragDropContext`, filter state, board management |
| `src/components/KanbanColumn.tsx` | Each board column (`Droppable`) + collapse + creation/deletion animations |
| `src/components/TaskCard.tsx` | Individual card (`Draggable`) + inline checklist + recurrence badge + canvas fx |
| `src/components/TaskDialog.tsx` | Create/edit task modal — planning, checklist, recurrence sections |
| `src/components/Header.tsx` | WorkspaceSwitcher + FilterPopover + SettingsDialog + add-task button |
| `src/components/FilterPopover.tsx` | Filter UI (priority, board, start/end date ranges) |
| `src/components/WorkspaceSwitcher.tsx` | Workspace dropdown with CRUD and deletion confirmation |
| `src/components/SettingsDialog.tsx` | Settings panel (animations, layout, checklist, light mode) |
| `src/index.css` | Global styles + CSS vars + animation keyframes (galaxy theme) |

### Recurrence

`Recurrence = { type: "daily" | "daily-weekdays" | "weekly" | "monthly", enabled: boolean, limit?: number }`.

Trigger: task moved to the **last board** (by position). `buildNextOccurrence` in `taskStore.tsx` shifts dates, resets checklist, decrements `limit`. Returns `null` when `limit === 0` (no new task created).

### UI stack

- **shadcn/ui** components live in `src/components/ui/` — do not hand-edit; regenerate via `bunx shadcn@latest add <component>`
- Tailwind CSS with path alias `@/*` → `src/*`
- Drag-and-drop via `@hello-pangea/dnd`
- Dark galaxy theme / light mode toggled via `.light` class on `<html>`

### Testing

- Vitest + jsdom + Testing Library
- Test setup (window.matchMedia mock) is in `src/test/setup.ts`
- Currently only a placeholder test exists — component tests go in `src/**/*.test.tsx`

### TypeScript

- Strict mode is **off** (`strict: false`, `noImplicitAny: false`)
- Path alias `@/*` maps to `src/*` — use this for all internal imports
