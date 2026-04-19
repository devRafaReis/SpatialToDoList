import { describe, it, expect } from "vitest";
import { mergeCloudAndLocalTasks } from "@/lib/taskMerge";
import type { Task } from "@/types/task";

function makeTask(id: string, title = id): Task {
  return {
    id,
    title,
    description: "",
    status: "todo",
    order: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

describe("mergeCloudAndLocalTasks", () => {
  it("returns empty array when both are empty", () => {
    expect(mergeCloudAndLocalTasks([], [])).toEqual([]);
  });

  it("returns cloud tasks when local is empty", () => {
    const cloud = [makeTask("a"), makeTask("b")];
    expect(mergeCloudAndLocalTasks(cloud, [])).toEqual(cloud);
  });

  it("preserves local tasks when cloud is empty (guest tasks survive login)", () => {
    const local = [makeTask("guest-1"), makeTask("guest-2")];
    const result = mergeCloudAndLocalTasks([], local);
    expect(result).toEqual(local);
  });

  it("appends local-only tasks after cloud tasks", () => {
    const cloud = [makeTask("cloud-1")];
    const local = [makeTask("local-1")];
    const result = mergeCloudAndLocalTasks(cloud, local);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("cloud-1");
    expect(result[1].id).toBe("local-1");
  });

  it("deduplicates: local tasks already in cloud are not added again", () => {
    const cloud = [makeTask("shared"), makeTask("cloud-only")];
    const local = [makeTask("shared"), makeTask("local-only")];
    const result = mergeCloudAndLocalTasks(cloud, local);
    expect(result).toHaveLength(3);
    expect(result.filter((t) => t.id === "shared")).toHaveLength(1);
  });

  it("cloud version wins when same ID exists in both", () => {
    const cloudVersion = { ...makeTask("shared"), title: "cloud version" };
    const localVersion = { ...makeTask("shared"), title: "local version" };
    const result = mergeCloudAndLocalTasks([cloudVersion], [localVersion]);
    expect(result[0].title).toBe("cloud version");
  });

  it("preserves cloud task order", () => {
    const cloud = [makeTask("c"), makeTask("a"), makeTask("b")];
    const result = mergeCloudAndLocalTasks(cloud, []);
    expect(result.map((t) => t.id)).toEqual(["c", "a", "b"]);
  });

  it("local-only tasks are appended after all cloud tasks", () => {
    const cloud = [makeTask("c1"), makeTask("c2"), makeTask("c3")];
    const local = [makeTask("l1"), makeTask("c2")]; // c2 is duplicate
    const result = mergeCloudAndLocalTasks(cloud, local);
    expect(result.map((t) => t.id)).toEqual(["c1", "c2", "c3", "l1"]);
  });
});
