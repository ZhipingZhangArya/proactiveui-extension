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
});
