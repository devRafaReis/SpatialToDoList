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

This is a Kanban board app (React 18 + TypeScript + Vite) with four task columns: `todo`, `doing`, `done`, `cancelled`.

### Data flow

```
TaskProvider (src/store/taskStore.tsx)
  └── React Context with task state + CRUD handlers
        └── persists to localStorage via taskStorage.ts
              └── TaskStorageService interface (designed to swap to API later)
```

Components consume state via `useTaskContext()` → `useTasks()` hook which returns tasks grouped by status.

### Key files

| File | Role |
|---|---|
| `src/store/taskStore.tsx` | Global state (React Context), CRUD operations, drag-drop handlers |
| `src/services/taskStorage.ts` | Storage abstraction — `localStorageService` is current impl; swap this for API migration |
| `src/types/task.ts` | `Task` interface, `TaskStatus` union, `COLUMNS` constant |
| `src/hooks/useTasks.ts` | Subscribes to context, groups tasks by status with memoization |
| `src/components/KanbanBoard.tsx` | Board orchestrator — wraps everything in `DragDropContext` |
| `src/components/KanbanColumn.tsx` | Each status column (`Droppable`) |
| `src/components/TaskCard.tsx` | Individual card (`Draggable`) with edit/delete/move actions |
| `src/components/TaskDialog.tsx` | Create/edit task modal using React Hook Form |
| `src/index.css` | Global styles + custom Tailwind utilities (glass morphism, galaxy theme) |

### UI stack

- **shadcn/ui** components live in `src/components/ui/` — do not hand-edit these; regenerate via `bunx shadcn@latest add <component>`
- Tailwind CSS with path alias `@/*` → `src/*`
- Drag-and-drop via `@hello-pangea/dnd`
- Dark galaxy theme uses CSS variables defined in `src/index.css`

### Testing

- Vitest + jsdom + Testing Library
- Test setup (window.matchMedia mock) is in `src/test/setup.ts`
- Currently only an example test exists — component tests go in `src/**/*.test.tsx`

### TypeScript

- Strict mode is **off** (`strict: false`, `noImplicitAny: false`)
- Path alias `@/*` maps to `src/*` — use this for all internal imports
