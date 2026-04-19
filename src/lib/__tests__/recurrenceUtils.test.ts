import { describe, it, expect } from "vitest";
import { shiftDate, buildNextOccurrence } from "@/lib/recurrenceUtils";
import type { Task } from "@/types/task";

// ── shiftDate ──────────────────────────────────────────────────────────────────

describe("shiftDate", () => {
  describe("daily", () => {
    it("advances by 1 day", () => {
      expect(shiftDate("2024-01-15", "daily")).toBe("2024-01-16");
    });

    it("crosses month boundary", () => {
      expect(shiftDate("2024-01-31", "daily")).toBe("2024-02-01");
    });
  });

  describe("daily-weekdays", () => {
    it("Thursday → Friday", () => {
      expect(shiftDate("2024-01-11", "daily-weekdays")).toBe("2024-01-12"); // Thu → Fri
    });

    it("Friday → Monday (skips weekend)", () => {
      expect(shiftDate("2024-01-12", "daily-weekdays")).toBe("2024-01-15"); // Fri → Mon
    });

    it("Saturday → Monday", () => {
      expect(shiftDate("2024-01-13", "daily-weekdays")).toBe("2024-01-15"); // Sat → Mon
    });

    it("Sunday → Monday", () => {
      expect(shiftDate("2024-01-14", "daily-weekdays")).toBe("2024-01-15"); // Sun → Mon
    });
  });

  describe("weekly", () => {
    it("advances by 7 days", () => {
      expect(shiftDate("2024-01-01", "weekly")).toBe("2024-01-08");
    });

    it("crosses month boundary", () => {
      expect(shiftDate("2024-01-29", "weekly")).toBe("2024-02-05");
    });
  });

  describe("monthly", () => {
    it("advances by 1 month", () => {
      expect(shiftDate("2024-01-15", "monthly")).toBe("2024-02-15");
    });

    it("crosses year boundary", () => {
      expect(shiftDate("2024-12-01", "monthly")).toBe("2025-01-01");
    });
  });

  describe("every-n-days", () => {
    it("advances by the given interval", () => {
      expect(shiftDate("2024-01-01", "every-n-days", 5)).toBe("2024-01-06");
    });

    it("defaults to 2 days when no interval given", () => {
      expect(shiftDate("2024-01-01", "every-n-days")).toBe("2024-01-03");
    });

    it("advances by 1 day when interval=1", () => {
      expect(shiftDate("2024-01-01", "every-n-days", 1)).toBe("2024-01-02");
    });
  });
});

// ── buildNextOccurrence ────────────────────────────────────────────────────────

const baseTask: Task = {
  id: "task-1",
  title: "Weekly review",
  description: "",
  status: "done",
  order: 1000,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  startDate: "2024-01-08",
  endDate: "2024-01-09",
  recurrence: { type: "weekly", enabled: true },
};

describe("buildNextOccurrence", () => {
  it("returns null when limit is 0", () => {
    const task = { ...baseTask, recurrence: { type: "weekly" as const, enabled: true, limit: 0 } };
    expect(buildNextOccurrence(task, "todo")).toBeNull();
  });

  it("returns a task when limit is undefined (infinite)", () => {
    const next = buildNextOccurrence(baseTask, "todo");
    expect(next).not.toBeNull();
    expect(next!.recurrence!.limit).toBeUndefined();
  });

  it("decrements limit by 1", () => {
    const task = { ...baseTask, recurrence: { type: "weekly" as const, enabled: true, limit: 3 } };
    const next = buildNextOccurrence(task, "todo");
    expect(next!.recurrence!.limit).toBe(2);
  });

  it("returns null when limit reaches 0 after decrement (limit=1 → next has limit=0, then next call returns null)", () => {
    const task = { ...baseTask, recurrence: { type: "weekly" as const, enabled: true, limit: 1 } };
    const next = buildNextOccurrence(task, "todo");
    expect(next).not.toBeNull();
    expect(next!.recurrence!.limit).toBe(0);
    expect(buildNextOccurrence(next!, "todo")).toBeNull();
  });

  it("sets status to firstBoardId", () => {
    const next = buildNextOccurrence(baseTask, "board-xyz");
    expect(next!.status).toBe("board-xyz");
  });

  it("generates a new unique id", () => {
    const next = buildNextOccurrence(baseTask, "todo");
    expect(next!.id).not.toBe(baseTask.id);
  });

  it("shifts startDate by recurrence type", () => {
    const next = buildNextOccurrence(baseTask, "todo");
    expect(next!.startDate).toBe("2024-01-15"); // +7 days from 2024-01-08
  });

  it("shifts endDate by recurrence type", () => {
    const next = buildNextOccurrence(baseTask, "todo");
    expect(next!.endDate).toBe("2024-01-16"); // +7 days from 2024-01-09
  });

  it("does not shift dates when task has none", () => {
    const task = { ...baseTask, startDate: undefined, endDate: undefined };
    const next = buildNextOccurrence(task, "todo");
    expect(next!.startDate).toBeUndefined();
    expect(next!.endDate).toBeUndefined();
  });

  it("resets checklist items to done=false", () => {
    const task = {
      ...baseTask,
      checklist: [
        { id: "c1", text: "Step 1", done: true },
        { id: "c2", text: "Step 2", done: true },
      ],
    };
    const next = buildNextOccurrence(task, "todo");
    expect(next!.checklist!.every((i) => i.done === false)).toBe(true);
  });

  it("preserves checklist text and ids", () => {
    const task = {
      ...baseTask,
      checklist: [{ id: "c1", text: "Step 1", done: true }],
    };
    const next = buildNextOccurrence(task, "todo");
    expect(next!.checklist![0].id).toBe("c1");
    expect(next!.checklist![0].text).toBe("Step 1");
  });

  it("keeps checklist undefined when original has none", () => {
    const task = { ...baseTask, checklist: undefined };
    const next = buildNextOccurrence(task, "todo");
    expect(next!.checklist).toBeUndefined();
  });
});
