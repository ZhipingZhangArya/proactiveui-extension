import { describe, it, expect } from "vitest";
import { SessionStats } from "../sessionStats";

describe("SessionStats", () => {
  describe("initial state", () => {
    it("should have totalCount of 0", () => {
      const stats = new SessionStats();
      expect(stats.totalCount).toBe(0);
    });

    it("should have empty statusCounts", () => {
      const stats = new SessionStats();
      expect(stats.countByStatus("thinking")).toBe(0);
      expect(stats.countByStatus("approved")).toBe(0);
      expect(stats.countByStatus("reverted")).toBe(0);
    });

    it("should have empty actionCounts", () => {
      const stats = new SessionStats();
      expect(stats.countByAction("writeCode")).toBe(0);
      expect(stats.countByAction("fixGrammar")).toBe(0);
    });

    it("should have approvalRate of 0", () => {
      const stats = new SessionStats();
      expect(stats.approvalRate).toBe(0);
    });
  });

  describe("recordAgent and countByStatus", () => {
    it("should increment totalCount when an agent is recorded", () => {
      const stats = new SessionStats();
      stats.recordAgent("agent-1", "writeCode", "thinking");
      expect(stats.totalCount).toBe(1);
    });

    it("should track count by status", () => {
      const stats = new SessionStats();
      stats.recordAgent("agent-1", "writeCode", "thinking");
      stats.recordAgent("agent-2", "detailStep", "approved");
      expect(stats.countByStatus("thinking")).toBe(1);
      expect(stats.countByStatus("approved")).toBe(1);
      expect(stats.countByStatus("reverted")).toBe(0);
    });

    it("should update status when same agent is recorded again", () => {
      const stats = new SessionStats();
      stats.recordAgent("agent-1", "writeCode", "thinking");
      expect(stats.countByStatus("thinking")).toBe(1);

      stats.recordAgent("agent-1", "writeCode", "approved");
      expect(stats.countByStatus("thinking")).toBe(0);
      expect(stats.countByStatus("approved")).toBe(1);
      expect(stats.totalCount).toBe(1);
    });

    it("should handle multiple agents independently", () => {
      const stats = new SessionStats();
      stats.recordAgent("agent-1", "writeCode", "approved");
      stats.recordAgent("agent-2", "detailStep", "reverted");
      stats.recordAgent("agent-3", "fixGrammar", "approved");
      expect(stats.totalCount).toBe(3);
      expect(stats.countByStatus("approved")).toBe(2);
      expect(stats.countByStatus("reverted")).toBe(1);
    });
  });

  describe("countByAction", () => {
    it("should count agents by action type", () => {
      const stats = new SessionStats();
      stats.recordAgent("agent-1", "writeCode", "approved");
      stats.recordAgent("agent-2", "writeCode", "thinking");
      stats.recordAgent("agent-3", "fixGrammar", "approved");
      expect(stats.countByAction("writeCode")).toBe(2);
      expect(stats.countByAction("fixGrammar")).toBe(1);
      expect(stats.countByAction("detailStep")).toBe(0);
    });

    it("should not double-count when the same agent updates status", () => {
      const stats = new SessionStats();
      stats.recordAgent("agent-1", "writeCode", "thinking");
      stats.recordAgent("agent-1", "writeCode", "approved");
      expect(stats.countByAction("writeCode")).toBe(1);
    });

    it("should return all tracked action types", () => {
      const stats = new SessionStats();
      stats.recordAgent("a1", "writeCode", "approved");
      stats.recordAgent("a2", "fixGrammar", "approved");
      stats.recordAgent("a3", "detailStep", "thinking");
      const actions = stats.trackedActions;
      expect(actions).toContain("writeCode");
      expect(actions).toContain("fixGrammar");
      expect(actions).toContain("detailStep");
      expect(actions).toHaveLength(3);
    });
  });

  describe("approvalRate", () => {
    it("should return 0 when no agents are resolved", () => {
      const stats = new SessionStats();
      stats.recordAgent("a1", "writeCode", "thinking");
      expect(stats.approvalRate).toBe(0);
    });

    it("should return 1 when all resolved agents are approved", () => {
      const stats = new SessionStats();
      stats.recordAgent("a1", "writeCode", "approved");
      stats.recordAgent("a2", "fixGrammar", "approved");
      expect(stats.approvalRate).toBe(1);
    });

    it("should return 0 when all resolved agents are reverted", () => {
      const stats = new SessionStats();
      stats.recordAgent("a1", "writeCode", "reverted");
      expect(stats.approvalRate).toBe(0);
    });

    it("should compute ratio of approved / (approved + reverted)", () => {
      const stats = new SessionStats();
      stats.recordAgent("a1", "writeCode", "approved");
      stats.recordAgent("a2", "detailStep", "reverted");
      stats.recordAgent("a3", "fixGrammar", "approved");
      stats.recordAgent("a4", "writeCode", "reverted");
      expect(stats.approvalRate).toBe(0.5);
    });

    it("should exclude thinking/awaiting_approval from the rate", () => {
      const stats = new SessionStats();
      stats.recordAgent("a1", "writeCode", "approved");
      stats.recordAgent("a2", "detailStep", "thinking");
      stats.recordAgent("a3", "fixGrammar", "awaiting_approval");
      expect(stats.approvalRate).toBe(1);
    });
  });
});
