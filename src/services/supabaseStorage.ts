import { supabase } from "@/lib/supabase";
import type { Task, Column, Workspace } from "@/types/task";

// ── Workspaces ────────────────────────────────────────────────────────────────

export async function fetchWorkspaces(userId: string): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function upsertWorkspace(userId: string, workspace: Workspace): Promise<void> {
  const { error } = await supabase
    .from("workspaces")
    .upsert({ id: workspace.id, user_id: userId, name: workspace.name });
  if (error) throw error;
}

export async function deleteWorkspaceRemote(workspaceId: string): Promise<void> {
  const { error } = await supabase.from("workspaces").delete().eq("id", workspaceId);
  if (error) throw error;
}

// ── Boards ────────────────────────────────────────────────────────────────────

export async function fetchBoards(userId: string, workspaceId: string): Promise<Column[]> {
  const { data, error } = await supabase
    .from("boards")
    .select("id, title, position, archived")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .order("position");
  if (error) throw error;
  return (data ?? []).map((b) => ({ id: b.id, title: b.title, archived: b.archived ?? false }));
}

export async function syncBoards(userId: string, workspaceId: string, boards: Column[]): Promise<void> {
  await supabase.from("boards").delete().eq("workspace_id", workspaceId).eq("user_id", userId);
  if (boards.length === 0) return;
  // upsert instead of insert — concurrent calls with the same board IDs update rather than conflict (409)
  const { error } = await supabase.from("boards").upsert(
    boards.map((b, i) => ({ id: b.id, workspace_id: workspaceId, user_id: userId, title: b.title, position: i, archived: b.archived ?? false })),
    { onConflict: "id" }
  );
  if (error) throw error;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function fetchTasks(userId: string, workspaceId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return (data ?? []).map(dbToTask);
}

export async function upsertTasks(userId: string, workspaceId: string, tasks: Task[]): Promise<void> {
  if (tasks.length === 0) return;
  const { error } = await supabase
    .from("tasks")
    .upsert(tasks.map((t) => taskToDb(t, userId, workspaceId)));
  if (error) throw error;
}

export async function deleteTaskRemote(taskId: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function deleteAllTasksRemote(userId: string, workspaceId: string): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function syncTasks(userId: string, workspaceId: string, tasks: Task[], workspaceName?: string): Promise<void> {
  // Guard against FK violation: ensure workspace row exists before inserting tasks.
  // ignoreDuplicates=true means DO NOTHING on conflict — the real name is preserved.
  await supabase
    .from("workspaces")
    .upsert({ id: workspaceId, user_id: userId, name: workspaceName ?? workspaceId }, { onConflict: "id", ignoreDuplicates: true });

  const { error: delError } = await supabase
    .from("tasks")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  if (delError) throw delError;
  if (tasks.length === 0) return;
  const { error: insError } = await supabase
    .from("tasks")
    .upsert(tasks.map((t) => taskToDb(t, userId, workspaceId)), { onConflict: "id" });
  if (insError) throw insError;
}

interface DbTaskRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string | null;
  order: number;
  estimated_hours: number | null;
  estimated_minutes: number | null;
  start_date: string | null;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  reminder_dismissed: boolean | null;
  checklist: unknown | null;
  recurrence: unknown | null;
  created_at: string;
  updated_at: string;
  archived: boolean | null;
}

function dbToTask(row: DbTaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: (row.priority ?? undefined) as Task["priority"],
    order: row.order,
    estimatedHours: row.estimated_hours ?? undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
    startDate: row.start_date ?? undefined,
    startTime: row.start_time ?? undefined,
    endDate: row.end_date ?? undefined,
    endTime: row.end_time ?? undefined,
    reminderDismissed: row.reminder_dismissed ?? false,
    checklist: (row.checklist ?? undefined) as Task["checklist"],
    recurrence: (row.recurrence ?? undefined) as Task["recurrence"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archived: row.archived ?? false,
  };
}

function taskToDb(task: Task, userId: string, workspaceId: string) {
  return {
    id: task.id,
    workspace_id: workspaceId,
    user_id: userId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority ?? null,
    order: task.order > 2147483647 ? Math.floor(task.order / 1000) : task.order,
    estimated_hours: task.estimatedHours ?? null,
    estimated_minutes: task.estimatedMinutes ?? null,
    start_date: task.startDate ?? null,
    start_time: task.startTime ?? null,
    end_date: task.endDate ?? null,
    end_time: task.endTime ?? null,
    reminder_dismissed: task.reminderDismissed ?? false,
    checklist: task.checklist ?? null,
    recurrence: task.recurrence ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    archived: task.archived ?? false,
  };
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface CloudSettings {
  animationsEnabled: boolean;
  lightMode: boolean;
  boardLayout: string;
  checklistExpandedByDefault: boolean;
}

export async function fetchSettings(userId: string): Promise<CloudSettings | null> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  if (!data) return null;
  return {
    animationsEnabled: data.animations_enabled,
    lightMode: data.light_mode,
    boardLayout: data.board_layout,
    checklistExpandedByDefault: data.checklist_expanded_by_default,
  };
}

export async function saveSettingsRemote(userId: string, settings: CloudSettings): Promise<void> {
  const { error } = await supabase.from("settings").upsert({
    user_id: userId,
    animations_enabled: settings.animationsEnabled,
    light_mode: settings.lightMode,
    board_layout: settings.boardLayout,
    checklist_expanded_by_default: settings.checklistExpandedByDefault,
  });
  if (error) throw error;
}
