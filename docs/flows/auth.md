# Auth Flow

## Current State: No Authentication

This application has **no authentication system**. There is no login, session, token, or user identity mechanism of any kind.

### What exists (placeholder only)

The `Task` type includes an optional `userId` field:

```typescript
interface Task {
  userId?: string;  // never populated — reserved for future multi-user support
  …
}
```

This field is declared, persisted to localStorage as part of the task object, and never read or written by any application code.

### Data isolation

All tasks belong to the device/browser. There is no concept of "current user". Any person with access to the browser's localStorage can read, modify, or delete all tasks.

### Future migration path

To add auth:
1. Implement an auth provider (e.g. Supabase, Auth0, custom JWT).
2. Populate `task.userId` on `addTask` with the authenticated user's ID.
3. Filter `getTasks()` results in `taskStorage.ts` by `userId`.
4. Swap `localStorageService` for an `apiStorageService` that calls an authenticated API (see `docs/flows/api.md`).

No components or hooks need to change for steps 3–4 if the `TaskStorageService` interface is honoured.
