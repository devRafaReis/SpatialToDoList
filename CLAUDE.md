# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev              # Start dev server (port 8080)
bun run build        # Production build
bun run build:dev    # Development mode build
bun run preview      # Serve production build locally (required to test PWA install)
bun run lint         # ESLint
bun run test         # Run all tests once (vitest + jsdom)
bun run test:watch   # Run tests in watch mode
bunx vitest src/path/to/specific.test.ts  # Run a single test file
bunx pwa-assets-generator  # Regenerate PWA icons from public/favicon.svg
```

> **Note:** Always use `bun run test`, not `bun test`. The latter invokes Bun's native test runner which does not load the Vite/jsdom config and will fail on any test that touches `localStorage` or the DOM.

> **PWA in dev:** the service worker is only registered in production builds. Use `bun run build && bun run preview` to test PWA install locally.

## Design System

**Before implementing any new feature or UI change, read `DESIGN_SYSTEM.md`.**

Key rules to always follow:
- Never hardcode colors — use Tailwind tokens (`text-primary`, `bg-muted`, `border-border/40`, etc.)
- Cards and surfaces use `.glass` CSS class, never solid backgrounds
- Custom pickers (date, time) always use `Popover` + custom content — never native `<input type="date/time">`
- Icons: Lucide React only, with `shrink-0` when next to truncatable text
- Animations are conditional on `animationsEnabled` from `useSettings()`
- Board title `maxLength={20}` everywhere
- Collapsible sections in TaskDialog follow the `rounded-md border border-border/40 bg-muted/20` pattern
- shadcn/ui components live in `src/components/ui/` — regenerate via `bunx shadcn@latest add <component>`, never hand-edit

## Architecture

This is a Kanban board app (React 18 + TypeScript + Vite) with dynamic user-configurable boards.

### Provider hierarchy

```
App.tsx
  AuthProvider       (src/store/authStore.tsx)
    WorkspaceProvider  (src/store/workspaceStore.tsx)
      SettingsProvider (src/store/settingsStore.tsx)
        TooltipProvider
          BrowserRouter
            Index.tsx → TaskProvider(key=workspaceId+userId, workspaceId, workspaceName, userId) → KanbanBoard
```

### Data flow

```
AuthProvider → user (Supabase session)
  WorkspaceProvider → activeWorkspaceId + workspaceName
    → TaskProvider (key=activeWorkspaceId+userId — full remount on workspace/auth change)
          └── React Context: Task[] + Column[] + CRUD handlers
                ├── guest: persists to localStorage via createWorkspaceStorage(workspaceId)
                └── logged in: localStorage (cache) + Supabase (source of truth)
                      └── cloud load on mount → full syncTasks on every change (600ms debounce)
```

Components consume tasks via `useTaskContext()` → `useTasks()` hook which returns tasks grouped by status.

`useTaskContext` lives in `src/store/taskContext.ts` (separate from `taskStore.tsx`) to satisfy Vite Fast Refresh — each file must export only React components or only hooks, not both. The same pattern applies to all stores: every store has a companion `*Context.ts` file that holds the interface, context object, and hook, while the `*Store.tsx` file exports only the Provider component.

Settings persist under `spatialTodo_*` keys locally and in `public.settings` table in Supabase when logged in. Workspace list persists under `spatialTodo_workspaces` / `spatialTodo_activeWorkspace` locally and in `public.workspaces` table when logged in.

All localStorage key strings are centralised in `src/constants/storageKeys.ts` (`STORAGE_KEYS`). Never hardcode `"spatialTodo_*"` or `"kanban-*"` strings outside that file. Keys include `LANGUAGE` (`spatialTodo_language`) for the UI language preference and `DONE_BOARD_ID` (`spatialTodo_doneBoardId`) for the completed-board setting.

### Key files

| File | Role |
|---|---|
| `src/lib/supabase.ts` | Supabase client singleton (anon key — safe for frontend) |
| `src/lib/recurrenceUtils.ts` | Pure functions: `shiftDate`, `buildNextOccurrence` — extracted for testability |
| `src/lib/taskMerge.ts` | Pure function: `mergeCloudAndLocalTasks` — cloud+local merge logic |
| `src/constants/storageKeys.ts` | `STORAGE_KEYS` — all localStorage key strings in one place |
| `src/store/authContext.ts` | `AuthContextValue`, `AuthContext`, `useAuth` hook |
| `src/store/authStore.tsx` | `AuthProvider` only — Google OAuth popup, allowlist check, `accessDenied` state |
| `src/store/taskContext.ts` | `TaskContextValue`, `TaskContext`, `useTaskContext` hook |
| `src/store/taskStore.tsx` | `TaskProvider` only — task + board state, CRUD, drag-drop, recurrence, cloud sync |
| `src/i18n/translations.ts` | `useTranslation()` hook + EN/PT-BR dictionaries — see i18n section below |
| `src/store/settingsContext.ts` | `SettingsContextType`, `SettingsContext`, `useSettings` hook, `BoardLayout` type, `Language` type |
| `src/store/settingsStore.tsx` | `SettingsProvider` only — animations, light mode, board layout, checklist defaults, language, privacyMode, completedBoardId |
| `src/store/workspaceContext.ts` | `WorkspaceContextType`, `WorkspaceContext`, `useWorkspace` hook, `DEFAULT_WORKSPACE_ID` |
| `src/store/workspaceStore.tsx` | `WorkspaceProvider` only — workspace list, active workspace, legacy migration |
| `src/services/taskStorage.ts` | `createWorkspaceStorage(id): TaskStorageService` — localStorage layer |
| `src/services/supabaseStorage.ts` | All Supabase CRUD: workspaces, boards, tasks, settings |
| `src/types/task.ts` | `Task`, `Recurrence`, `Workspace`, `TaskFilter`, `Column`, `PRIORITIES` |
| `src/hooks/useTasks.ts` | Subscribes to context, groups tasks by status with memoization |
| `src/components/KanbanBoard.tsx` | Board orchestrator — `DragDropContext`, filter state, board management |
| `src/components/KanbanColumn.tsx` | Each board column (`Droppable`) + collapse + creation/deletion animations |
| `src/components/TaskCard.tsx` | Individual card (`Draggable`) + inline checklist + recurrence badge + canvas fx + check button (auto-move to completed board) |
| `src/components/TaskDialog.tsx` | Create/edit task modal — planning, checklist, recurrence sections |
| `src/components/Header.tsx` | WorkspaceSwitcher + SyncButton + AuthButton + SettingsDialog + HelpButton |
| `src/components/AccessRequestDialog.tsx` | Dialog for non-allowed users to request access |
| `src/components/FilterPopover.tsx` | Filter UI (priority, board, start/end date ranges) |
| `src/components/WorkspaceSwitcher.tsx` | Workspace dropdown with CRUD and deletion confirmation |
| `src/components/SettingsDialog.tsx` | Settings panel (animations, layout, checklist, light mode, language, completed board, privacy mode) |
| `src/components/ArchiveDialog.tsx` | View/restore/permanently delete archived tasks and boards |
| `src/components/HelpDialog.tsx` | In-app help guide with feature sections, triggered from Header |
| `src/components/SpaceEasterEggs.tsx` | Canvas-based ambient animations (supernova, UFO, nebula, X-wing, astronaut, satellite) on a timed loop |
| `src/components/CometTrail.tsx` | Canvas comet particle effect |
| `src/components/StarParticles.tsx` | Canvas star field background |
| `src/components/StarWarsShip.tsx` | Canvas Star Wars ship drawing utility |
| `src/index.css` | Global styles + CSS vars + animation keyframes (galaxy theme) |
| `pwa-assets.config.ts` | PWA icon generation config (`@vite-pwa/assets-generator`, source: `public/favicon.svg`) |

### i18n (internationalization)

Translation lives entirely in `src/i18n/translations.ts` — no external library.

**Usage in any component:**
```tsx
import { useTranslation } from "@/i18n/translations";

const { t } = useTranslation();
// Simple key:
t("cancel")                         // → "Cancel" / "Cancelar"
// Key with variable interpolation:
t("maxChars", { count: 30 })        // → "Max 30 characters"
// Dynamic key (use `as any` since TypeScript can't verify template literals):
t(`priority_${p.id}` as any)        // → "Low" / "Baixa"
```

**Language type and persistence:**
- `Language = "en" | "pt-BR"` — defined in `translations.ts`, re-exported from `settingsContext.ts`
- `language` and `setLanguage` come from `useSettings()`
- Stored under `STORAGE_KEYS.LANGUAGE` (`spatialTodo_language`) in **localStorage only** — intentionally not synced to Supabase (per-device preference, avoids DB migration)
- Default: `"en"`

### Settings — localStorage-only fields

Some settings are **not** synced to Supabase (no column in `public.settings`). They are per-device preferences stored only in localStorage:

| Key | `STORAGE_KEYS` constant | Default | Notes |
|---|---|---|---|
| `spatialTodo_language` | `LANGUAGE` | `"en"` | UI language — per-device, avoids DB migration |
| `spatialTodo_doneBoardId` | `DONE_BOARD_ID` | `null` | Completed board — board ID tasks auto-move to when checked; `null` disables the check button |
| `spatialTodo_privacyMode` | (in settings store) | `false` | Hides tasks/boards flagged as `hidden` — per-device |

### Completed board feature

When `completedBoardId` is set in settings:
- Every `TaskCard` renders a `Circle` / `CheckCircle2` button (Lucide) between the drag handle and title
- Clicking the unchecked circle calls `handleMoveClick(completedBoardId)` — teleports the task with portal animation
- Tasks whose `task.status === completedBoardId` render with `line-through text-muted-foreground/50` title and green `CheckCircle2` icon
- Clicking the green check moves the task back to the first non-archived, non-completed board
- The setting is configured in `SettingsDialog` via a shadcn `Select` populated from `useTaskContext().boards` (active boards only)

**Adding a new translation key:**
1. Add the key+value to both `dict.en` and `dict["pt-BR"]` in `translations.ts`
2. Use `t("newKey")` in the component — TypeScript will infer the key type from `dict.en`

**Adding a new language:**
1. Add a new entry to `dict` with the same keys as `dict.en`
2. Add the new language code to the `Language` union type in `settingsContext.ts`
3. Add a toggle button in `SettingsDialog.tsx`

### PWA

The app is a Progressive Web App installable on Android, iOS, and desktop.

**Setup:** `vite-plugin-pwa` in `vite.config.ts` with `registerType: "autoUpdate"` and Workbox `generateSW` strategy.

**Caching strategy:**
- All static assets (JS, CSS, HTML, images, fonts) are precached
- Supabase API calls use `NetworkFirst` (10s timeout, 24h max-age, 50 entries max)

**Icon generation:** Run `bunx pwa-assets-generator` to regenerate all icons from `public/favicon.svg`. Output: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`. Config: `pwa-assets.config.ts`.

**Testing:** PWA install only works from a production build — use `bun run build && bun run preview`. The service worker is intentionally disabled in `bun dev`.

### Task type (src/types/task.ts)

```ts
interface Task {
  id: string;
  title: string;           // maxLength 200
  description: string;
  status: TaskStatus;      // board id
  priority?: "low" | "medium" | "high" | "critical";
  order: number;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  estimatedHours?: number;
  estimatedMinutes?: number;
  startDate?: string;      // "yyyy-MM-dd"
  startTime?: string;      // "HH:mm"
  endDate?: string;        // "yyyy-MM-dd"
  endTime?: string;        // "HH:mm"
  reminderDismissed?: boolean;
  checklist?: ChecklistItem[];
  recurrence?: Recurrence;
  archived?: boolean;      // true = task is in the archive (hidden from board, visible in ArchiveDialog)
  hidden?: boolean;        // true = task is hidden in privacy mode
}

interface Column {
  id: string;
  title: string;
  archived?: boolean;      // true = board is in the archive
  hidden?: boolean;        // true = board is hidden in privacy mode
  color?: string;          // HSL string e.g. "265,70%,65%" — stored in Supabase
}
```

When adding fields to `Task`, also update: `addTask` + `updateTask` signatures in `taskStore.tsx`, `onSave` in `TaskDialog.tsx`, `handleSave` in `KanbanBoard.tsx`, and display in `TaskCard.tsx`.

### Archive and privacy features

**Archive:** Tasks and boards can be archived via the `⋯` menu. Archived items are hidden from the board but accessible through `ArchiveDialog`. Context methods: `archiveTask`, `unarchiveTask`, `archiveBoard`, `unarchiveBoard`, `deleteArchivedBoard`, `deleteTask`.

**Privacy mode:** `privacyMode` setting (in `useSettings()`) — when enabled, tasks and boards marked `hidden: true` are suppressed from view. Context methods: `hideTask`, `unhideTask`, `hideBoard`, `unhideBoard`. Toggled in `SettingsDialog`.

### Recurrence

```ts
type RecurrenceType = "daily" | "daily-weekdays" | "weekly" | "monthly" | "every-n-days";
interface Recurrence {
  type: RecurrenceType;
  enabled: boolean;
  limit?: number;    // undefined = forever; decrements on each auto-creation
  interval?: number; // days between occurrences — only used when type === "every-n-days"
}
```

Trigger: task moved to the **last board** (by position). `buildNextOccurrence` in `src/lib/recurrenceUtils.ts` shifts dates, resets checklist, decrements `limit`. Returns `null` when `limit === 0` (no new task created).

For `"every-n-days"`, `shiftDate` uses `addDays(d, interval ?? 2)`. The user sets the interval via a numeric input in TaskDialog's Recurrence section.

### TaskDialog sections

The dialog has three collapsible sections — all follow the same pattern (`rounded-md border border-border/40 bg-muted/20` container with chevron toggle):
1. **Planning** — estimated time (single input, formats: `1h30m`, `90m`, `1.5h`, `1:30`), date range (start date + start time picker, end date + end time picker), parsed on blur
2. **Checklist** — list of `ChecklistItem` with inline add/delete
3. **Recurrence** — type select (includes "Every X days" with custom interval input), enabled toggle, optional limit

#### Time picker scrolling
Time picker columns use `overflow-y-scroll` + `onWheel={(e) => e.stopPropagation()}` to prevent Radix Popover from capturing wheel events.

### Mobile UX patterns

- Action buttons that should be hidden on desktop until hover but always visible on mobile use `sm:opacity-0 group-hover:opacity-100` (not `opacity-0 group-hover:opacity-100`).
- Card actions are consolidated in a single `⋯` (`MoreHorizontal`) `DropdownMenu` button (28px) so they never push card content when visible. The Draggable root must NOT have `mb-2` — use `gap-2` on the Droppable container instead.
- Adding a new board opens a Dialog on mobile instead of an inline input in the header to avoid layout breakage.

### Drag-and-drop (DnD) layout rules

Use `gap-2` on the Droppable vertical container. Do **not** put `mb-2` on the Draggable root element — bottom margin is invisible to `@hello-pangea/dnd` position calculations and causes cards to jump when dragged.

### Per-column sort

`KanbanColumn` accepts `onSortTasks: (sort: "priority" | "date") => void`. `KanbanBoard.handleSortTasks` sorts the column's tasks and calls `reorderTasks(columnId, sortedIds)` to persist the new order.

Priority order: `critical(0) > high(1) > medium(2) > low(3) > none(4)`.
Date sort: ascending by `startDate` then `startTime`; tasks without a date go last.

### Supabase integration

**Auth flow:**
- Google OAuth via popup (`skipBrowserRedirect: true`) — main page never redirects
- After login, `authStore` checks `public.allowed_emails` table; if not found, signs the user out, sets `accessDenied = true`, and opens `AccessRequestDialog` automatically
- `accessDenied` auto-clears after 10 seconds
- Popup detects it's an OAuth callback via `window.opener` and closes itself once session is ready
- Popup monitoring uses `window.addEventListener("focus")` on the parent window — **not** `popup.closed` polling, which is blocked by Google's `Cross-Origin-Opener-Policy` headers
- `handleSession` does **not** call `popup.close()` — COOP makes even that throw a console error. The popup closes itself via `window.close()` once the session is ready (detected by the `useEffect` in the popup window)

**Storage modes:**
- Guest (no user): localStorage only — identical to pre-Supabase behavior
- Logged in: localStorage as cache + Supabase as source of truth
  - On workspace mount: fetch from Supabase, then call `mergeCloudAndLocalTasks(cloudTasks, localTasks)`
    - Cloud is source of truth; local-only tasks (e.g. created as guest while logged out) are always appended
    - If boards exist in cloud, they override local boards
    - Merged result is saved back to localStorage and to state
  - On every change (add, edit, delete, reorder): localStorage saves immediately; `syncTasks` runs after 600ms debounce
  - `syncTasks` / `syncBoards` = delete all rows for that workspace + upsert current state (upsert avoids 409 on concurrent calls)
  - `cloudLoadDone` is React state (not a ref) so debounced effects always re-run after cloud load completes, even on fetch error
  - Cloud load does **not** call `syncBoards`/`syncTasks` directly — all cloud writes go through the debounced effects to avoid race conditions
- `settingsStore` uses a `cloudSyncReady` ref (simpler than state because settings sync is synchronous on user action). Set to `true` in `.finally()` so a failed `fetchSettings` still enables local-change syncing.

**Sync status:**
- `syncStatus: "idle" | "syncing" | "error"` exposed via `useTaskContext()`
- `SyncButton` in Header shows current status (Cloud / RefreshCw spinning / CloudOff) — click triggers `forceSyncNow`
- Errors shown in tooltip

**Task `order` field:**
- Stored as `bigint` in Supabase (requires `alter table public.tasks alter column "order" type bigint`)
- New tasks use `Math.floor(Date.now() / 1000)` (seconds) to fit safely in the column
- `taskToDb` in `supabaseStorage.ts` converts any legacy ms-based order values automatically

**Database tables (`public` schema, all with RLS):**

| Table | Purpose |
|---|---|
| `workspaces` | User workspaces (`id`, `user_id`, `name`) |
| `boards` | Columns per workspace (`id`, `workspace_id`, `user_id`, `title`, `position`) |
| `tasks` | All task fields; `order` is `bigint` |
| `settings` | One row per user with all settings fields |
| `allowed_emails` | Allowlist — only emails here can log in |
| `access_requests` | Pending access requests (`name`, `email`, unique constraint) |

**RLS policy pattern:**
```sql
create policy "owner" on public.<table> using (auth.uid() = user_id);
```

**Admin operations:**
```sql
-- Approve a pending request (moves email to allowlist)
select approve_access_request('email@example.com');

-- View pending requests
select name, email, requested_at from public.access_requests order by requested_at asc;

-- Add email directly
insert into public.allowed_emails values ('email@example.com');

-- Remove access
delete from public.allowed_emails where email = 'email@example.com';
```

**Supabase config required:**
- Authentication → Providers → Google: Client ID + Secret from Google Cloud Console
- Authentication → URL Configuration: add `http://localhost:8080` (dev) and production URL
- Authorized redirect URI in Google Cloud Console: `https://<project>.supabase.co/auth/v1/callback`

### UI stack

- **shadcn/ui** components live in `src/components/ui/` — do not hand-edit; regenerate via `bunx shadcn@latest add <component>`
- Tailwind CSS with path alias `@/*` → `src/*`
- Drag-and-drop via `@hello-pangea/dnd`
- Dark galaxy theme / light mode toggled via `.light` class on `<html>`
- Supabase JS client v2 (`@supabase/supabase-js`)

### Testing

- Vitest + jsdom + Testing Library
- Vitest config is in `vite.config.ts` (`test.environment = "jsdom"`, `setupFiles = ["./src/test/setup.ts"]`)
- Test setup (`window.matchMedia` mock) is in `src/test/setup.ts`
- **Always run `bun run test`** — `bun test` uses Bun's native runner without jsdom and fails on localStorage tests

Current test coverage:

| File | What it tests |
|---|---|
| `src/lib/__tests__/recurrenceUtils.test.ts` | `shiftDate` (all types + weekend skip), `buildNextOccurrence` (limit, checklist reset, date shift) |
| `src/lib/__tests__/taskMerge.test.ts` | `mergeCloudAndLocalTasks` — guest task preservation, deduplication, cloud-wins-on-conflict |
| `src/services/__tests__/taskStorage.test.ts` | `createWorkspaceStorage` — localStorage CRUD, corrupted JSON fallbacks, workspace isolation |

New unit tests go in `src/**/__tests__/*.test.ts`. Pure functions (no DOM, no React) go in `src/lib/__tests__/` or `src/services/__tests__/`. Component tests go in `src/**/*.test.tsx`.

### TypeScript

- Strict mode is **off** (`strict: false`, `noImplicitAny: false`)
- Path alias `@/*` maps to `src/*` — use this for all internal imports
