export const STORAGE_KEYS = {
  WORKSPACES: "spatialTodo_workspaces",
  ACTIVE_WORKSPACE: "spatialTodo_activeWorkspace",
  ANIMATIONS: "spatialTodo_animations",
  LIGHT_MODE: "spatialTodo_lightMode",
  BOARD_LAYOUT: "spatialTodo_boardLayout",
  CHECKLIST_EXPANDED: "spatialTodo_checklistExpanded",
  // Legacy keys kept for migration in workspaceStore
  LEGACY_TASKS: "kanban-tasks",
  LEGACY_BOARDS: "kanban-boards",
  tasks: (workspaceId: string) => `kanban-tasks_${workspaceId}`,
  boards: (workspaceId: string) => `kanban-boards_${workspaceId}`,
};
