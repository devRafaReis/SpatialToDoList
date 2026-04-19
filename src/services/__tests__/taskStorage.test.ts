import { describe, it, expect, beforeEach } from "vitest";
import { createWorkspaceStorage } from "@/services/taskStorage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { DEFAULT_COLUMNS } from "@/types/task";
import type { Task, Column } from "@/types/task";

function makeTask(id: string): Task {
  return {
    id,
    title: `Task ${id}`,
    description: "",
    status: "todo",
    order: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("createWorkspaceStorage — tasks", () => {
  it("getTasks returns empty array when nothing is saved", () => {
    const storage = createWorkspaceStorage("ws-1");
    expect(storage.getTasks()).toEqual([]);
  });

  it("getTasks returns empty array when localStorage has corrupted JSON", () => {
    localStorage.setItem(STORAGE_KEYS.tasks("ws-1"), "not-valid-json{{{");
    const storage = createWorkspaceStorage("ws-1");
    expect(storage.getTasks()).toEqual([]);
  });

  it("saveTasks + getTasks roundtrip", () => {
    const storage = createWorkspaceStorage("ws-1");
    const tasks = [makeTask("t1"), makeTask("t2")];
    storage.saveTasks(tasks);
    expect(storage.getTasks()).toEqual(tasks);
  });

  it("saveTasks persists to the workspace-specific key", () => {
    const storage = createWorkspaceStorage("ws-abc");
    storage.saveTasks([makeTask("t1")]);
    expect(localStorage.getItem(STORAGE_KEYS.tasks("ws-abc"))).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.tasks("ws-xyz"))).toBeNull();
  });

  it("different workspaces are isolated", () => {
    const ws1 = createWorkspaceStorage("ws-1");
    const ws2 = createWorkspaceStorage("ws-2");
    ws1.saveTasks([makeTask("a")]);
    ws2.saveTasks([makeTask("b")]);
    expect(ws1.getTasks()[0].id).toBe("a");
    expect(ws2.getTasks()[0].id).toBe("b");
  });

  it("saveTasks overwrites previous data", () => {
    const storage = createWorkspaceStorage("ws-1");
    storage.saveTasks([makeTask("old")]);
    storage.saveTasks([makeTask("new")]);
    const result = storage.getTasks();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("new");
  });
});

describe("createWorkspaceStorage — boards", () => {
  it("getBoards returns DEFAULT_COLUMNS when nothing is saved", () => {
    const storage = createWorkspaceStorage("ws-1");
    expect(storage.getBoards()).toEqual(DEFAULT_COLUMNS);
  });

  it("getBoards returns DEFAULT_COLUMNS when localStorage has corrupted JSON", () => {
    localStorage.setItem(STORAGE_KEYS.boards("ws-1"), "{{bad}}");
    const storage = createWorkspaceStorage("ws-1");
    expect(storage.getBoards()).toEqual(DEFAULT_COLUMNS);
  });

  it("saveBoards + getBoards roundtrip", () => {
    const storage = createWorkspaceStorage("ws-1");
    const boards: Column[] = [
      { id: "b1", title: "Backlog" },
      { id: "b2", title: "Done" },
    ];
    storage.saveBoards(boards);
    expect(storage.getBoards()).toEqual(boards);
  });

  it("different workspaces have independent boards", () => {
    const ws1 = createWorkspaceStorage("ws-1");
    const ws2 = createWorkspaceStorage("ws-2");
    ws1.saveBoards([{ id: "b1", title: "Only in WS1" }]);
    expect(ws2.getBoards()).toEqual(DEFAULT_COLUMNS);
  });
});
