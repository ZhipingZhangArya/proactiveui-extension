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

  describe("reset", () => {
    it("should clear totalCount to 0", () => {
      const stats = new SessionStats();
      stats.recordAgent("a1", "writeCode", "approved");
      stats.recordAgent("a2", "fixGrammar", "reverted");
      stats.reset();
      expect(stats.totalCount).toBe(0);
    });

    it("should clear all status counts", () => {
      const stats = new SessionStats();
      stats.recordAgent("a1", "writeCode", "approved");
      stats.reset();
      expect(stats.countByStatus("approved")).toBe(0);
    });

    it("should clear all action counts", () => {
      const stats = new SessionStats();
      stats.recordAgent("a1", "writeCode", "approved");
      stats.reset();
      expect(stats.countByAction("writeCode")).toBe(0);
      expect(stats.trackedActions).toHaveLength(0);
    });

    it("should reset approvalRate to 0", () => {
      const stats = new SessionStats();
      stats.recordAgent("a1", "writeCode", "approved");
      stats.reset();
      expect(stats.approvalRate).toBe(0);
    });

    it("should allow recording new agents after reset", () => {
      const stats = new SessionStats();
      stats.recordAgent("a1", "writeCode", "approved");
      stats.reset();
      stats.recordAgent("a2", "fixGrammar", "reverted");
      expect(stats.totalCount).toBe(1);
      expect(stats.countByAction("fixGrammar")).toBe(1);
      expect(stats.approvalRate).toBe(0);
    });
  });

  describe("summary", () => {
    it("should return a structured summary object", () => {
      const stats = new SessionStats();
      const summary = stats.summary();
      expect(summary).toHaveProperty("totalAgents");
      expect(summary).toHaveProperty("approved");
      expect(summary).toHaveProperty("reverted");
      expect(summary).toHaveProperty("pending");
      expect(summary).toHaveProperty("approvalRate");
      expect(summary).toHaveProperty("actionBreakdown");
    });

    it("should reflect accurate counts in the summary", () => {
      const stats = new SessionStats();
      stats.recordAgent("a1", "writeCode", "approved");
      stats.recordAgent("a2", "writeCode", "reverted");
      stats.recordAgent("a3", "fixGrammar", "approved");
      stats.recordAgent("a4", "detailStep", "thinking");

      const summary = stats.summary();
      expect(summary.totalAgents).toBe(4);
      expect(summary.approved).toBe(2);
      expect(summary.reverted).toBe(1);
      expect(summary.pending).toBe(1);
      expect(summary.approvalRate).toBe(2 / 3);
      expect(summary.actionBreakdown).toEqual({
        writeCode: 2,
        fixGrammar: 1,
        detailStep: 1,
      });
    });

    it("should return zeroed summary after reset", () => {
      const stats = new SessionStats();
      stats.recordAgent("a1", "writeCode", "approved");
      stats.reset();

      const summary = stats.summary();
      expect(summary.totalAgents).toBe(0);
      expect(summary.approved).toBe(0);
      expect(summary.actionBreakdown).toEqual({});
    });
  });
});
