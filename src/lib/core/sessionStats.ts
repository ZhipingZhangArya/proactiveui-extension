/**
 * Tracks aggregate statistics for agent actions within a single editor session.
 * Pure logic — no framework dependency — so it can be unit-tested in isolation.
 */

interface TrackedAgent {
  actionId: string;
  status: string;
}

export class SessionStats {
  private agents = new Map<string, TrackedAgent>();

  get totalCount(): number {
    return this.agents.size;
  }

  recordAgent(id: string, actionId: string, status: string): void {
    this.agents.set(id, { actionId, status });
  }

  countByStatus(status: string): number {
    return this.countWhere((a) => a.status === status);
  }

  countByAction(actionId: string): number {
    return this.countWhere((a) => a.actionId === actionId);
  }

  get trackedActions(): string[] {
    return [...new Set(this.agentValues().map((a) => a.actionId))];
  }

  private countWhere(predicate: (agent: TrackedAgent) => boolean): number {
    return this.agentValues().filter(predicate).length;
  }

  private agentValues(): TrackedAgent[] {
    return [...this.agents.values()];
  }

  reset(): void {
    this.agents.clear();
  }

  get approvalRate(): number {
    const approved = this.countByStatus("approved");
    const reverted = this.countByStatus("reverted");
    const resolved = approved + reverted;
    if (resolved === 0) {
      return 0;
    }
    return approved / resolved;
  }

  summary(): SessionSummary {
    const actionBreakdown: Record<string, number> = {};
    for (const action of this.trackedActions) {
      actionBreakdown[action] = this.countByAction(action);
    }

    const approved = this.countByStatus("approved");
    const reverted = this.countByStatus("reverted");
    const pending = this.totalCount - approved - reverted;

    return {
      totalAgents: this.totalCount,
      approved,
      reverted,
      pending,
      approvalRate: this.approvalRate,
      actionBreakdown,
    };
  }
}

export interface SessionSummary {
  totalAgents: number;
  approved: number;
  reverted: number;
  pending: number;
  approvalRate: number;
  actionBreakdown: Record<string, number>;
}
