"use client";

import { AgentCard, type AgentCardAgent } from "./AgentCard";
import type { ActionId } from "@/types/proactive";
import { ARTIFACT_ACTIONS } from "@/lib/core/agentManager";

interface Props {
  agents: AgentCardAgent[];
  onApprove: (agentId: string) => void;
  onUndo: (agentId: string) => void;
  onDismiss: (agentId: string) => void;
}

export function AgentSidebar({ agents, onApprove, onUndo, onDismiss }: Props) {
  if (agents.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No active agents. Click a suggested action above to spawn one.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          isArtifact={ARTIFACT_ACTIONS.has(agent.actionId as ActionId)}
          onApprove={onApprove}
          onUndo={onUndo}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
