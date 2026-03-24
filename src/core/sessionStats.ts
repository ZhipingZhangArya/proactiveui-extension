/**
 * Tracks aggregate statistics for agent actions within a single editor session.
 * Pure logic — no VS Code API dependency — so it can be unit-tested in isolation.
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
    let count = 0;
    for (const agent of this.agents.values()) {
      if (agent.status === status) {
        count++;
      }
    }
    return count;
  }

  countByAction(actionId: string): number {
    let count = 0;
    for (const agent of this.agents.values()) {
      if (agent.actionId === actionId) {
        count++;
      }
    }
    return count;
  }

  get trackedActions(): string[] {
    const actions = new Set<string>();
    for (const agent of this.agents.values()) {
      actions.add(agent.actionId);
    }
    return [...actions];
  }

  get approvalRate(): number {
    return 0;
  }
}
