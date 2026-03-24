/**
 * Tracks aggregate statistics for agent actions within a single editor session.
 * Pure logic — no VS Code API dependency — so it can be unit-tested in isolation.
 */
export class SessionStats {
  get totalCount(): number {
    return 0;
  }

  countByStatus(_status: string): number {
    return 0;
  }

  countByAction(_actionId: string): number {
    return 0;
  }

  get approvalRate(): number {
    return 0;
  }
}
