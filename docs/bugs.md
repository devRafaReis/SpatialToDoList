# Known Issues & Quirks

## `CometTrail.tsx` — defined but never imported

`src/components/CometTrail.tsx` implements a cursor-following particle trail intended for drag operations. It is not imported anywhere. The active drag visual is `DragParticles` (mounted inside `TaskCard` while `snapshot.isDragging` is true).

**Impact:** None — dead code only.  
**Location:** [src/components/CometTrail.tsx](../src/components/CometTrail.tsx)

---

## `NavLink.tsx` — defined but never used

`src/components/NavLink.tsx` wraps `react-router-dom`'s `NavLink`. There is no navigation UI in the app (single-page board only).

**Impact:** None — dead code only.  
**Location:** [src/components/NavLink.tsx](../src/components/NavLink.tsx)

---

## `@tanstack/react-query` installed but unused

`QueryClient` is mounted in `App.tsx` but all task state flows through React Context and localStorage. No queries are made.

**Impact:** Adds ~50 kB to the bundle unnecessarily.  
**Location:** [src/App.tsx](../src/App.tsx)

---

## `react-hook-form` installed but unused

Listed as a production dependency. `TaskDialog` uses `useState` directly.

**Impact:** Bundle weight only.

---

## Order field resets to small integers after any drag

After the first drag-and-drop, all tasks in the affected boards have `order` values of 0, 1, 2 … New tasks use `order = Date.now()` (~1.7 trillion), so they always sort after existing tasks. This is consistent but the mixed scale is non-obvious.

**Impact:** Functionally harmless. Tasks remain correctly ordered.

---

## Recurrence trigger is position-based, not semantic

The recurrence auto-creation fires when a task is moved to the **last board by array position**, not to a board semantically marked as "done". If the user reorders boards so that "To Do" is last, moving a recurring task there will trigger a new occurrence in the first board.

**Impact:** Unexpected behavior if boards are reordered in a non-standard way. Users should keep "done"-type boards last.

---

## Recurrence dates: no start-date fallback

If a recurring task has no `endDate` and no `startDate`, the auto-created copy will also have no dates (no shift is applied). The recurrence still fires (a new copy is created in the first board) but without date progression — the task just reappears without any due date.

**Impact:** Low. Tasks without dates are still valid; users who want date tracking must set an end date on recurring tasks.

---

## Legacy localStorage keys not cleaned up after migration

On first load, `workspaceStore` migrates `kanban-tasks` and `kanban-boards` to `kanban-tasks_default` / `kanban-boards_default`. The original keys (`kanban-tasks`, `kanban-boards`) are not deleted — they remain in localStorage indefinitely.

**Impact:** Minimal storage overhead; no functional impact.

---

## No tests beyond the placeholder

`src/test/example.test.ts` contains only a `1 + 1 = 2` assertion. There are no component, hook, or integration tests.

**Impact:** Regressions in task CRUD, drag-drop logic, recurrence, workspace switching, or storage are undetected by CI.
