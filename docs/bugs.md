# Known Issues & Quirks

## `CometTrail.tsx` — defined but never imported

`src/components/CometTrail.tsx` implements a cursor-following particle trail intended for use during drag operations. It is not imported by any component. The drag visual effect currently used is `DragParticles` (a canvas mounted inside `TaskCard` while `snapshot.isDragging` is true).

**Impact:** None — dead code only.  
**Location:** [src/components/CometTrail.tsx](../src/components/CometTrail.tsx)

---

## `NavLink.tsx` — defined but never used

`src/components/NavLink.tsx` wraps `react-router-dom`'s `NavLink` with an `activeClassName` API. There is currently no navigation UI in the app (single-page board only).

**Impact:** None — dead code only.  
**Location:** [src/components/NavLink.tsx](../src/components/NavLink.tsx)

---

## `updateTask` implementation doesn't enforce `priority` in its type

The `TaskContextValue` interface includes `priority` in the `updateTask` signature, but the implementation's type annotation omits it. `priority` updates work at runtime via object spread, but static analysis won't catch invalid priority values passed to `updateTask`.

**Impact:** Low — works correctly at runtime, but type-unsafe.  
**Location:** [src/store/taskStore.tsx:46](../src/store/taskStore.tsx)

---

## `@tanstack/react-query` installed but unused for task data

`QueryClient` is mounted in `App.tsx` but all task state goes through React Context and localStorage. If queries are added later, they will share this client.

**Impact:** Adds ~50kB to bundle unnecessarily.  
**Location:** [src/App.tsx:1](../src/App.tsx)

---

## `react-hook-form` installed but unused

Listed as a production dependency. `TaskDialog` uses `useState` directly.

**Impact:** Bundle weight only.

---

## Order field resets to small integers after any drag

After the first drag-and-drop, all tasks in the affected columns have `order` values of 0, 1, 2 … Newly created tasks use `order = Date.now()` (~1.7 trillion), so they always sort after existing tasks. This is consistent but the mixed scale is non-obvious.

**Impact:** Functionally harmless. Tasks remain correctly ordered.

---

## No tests beyond the placeholder

`src/test/example.test.ts` contains only a `1 + 1 = 2` assertion. There are no component, hook, or integration tests.

**Impact:** Regressions in task CRUD, drag-drop logic, or storage are undetected by CI.
