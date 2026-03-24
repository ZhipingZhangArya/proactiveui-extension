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
});
