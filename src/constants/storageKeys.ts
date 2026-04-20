export const STORAGE_KEYS = {
  WORKSPACES: "spatialTodo_workspaces",
  ACTIVE_WORKSPACE: "spatialTodo_activeWorkspace",
  LAST_USER_ID: "spatialTodo_lastUserId",
  ANIMATIONS: "spatialTodo_animations",
  LIGHT_MODE: "spatialTodo_lightMode",
  BOARD_LAYOUT: "spatialTodo_boardLayout",
  CHECKLIST_EXPANDED: "spatialTodo_checklistExpanded",
  LANGUAGE: "spatialTodo_language",
  DONE_BOARD_ID: "spatialTodo_doneBoardId",
  // Legacy keys kept for migration in workspaceStore
  LEGACY_TASKS: "kanban-tasks",
  LEGACY_BOARDS: "kanban-boards",
  tasks: (workspaceId: string) => `kanban-tasks_${workspaceId}`,
  boards: (workspaceId: string) => `kanban-boards_${workspaceId}`,
};
