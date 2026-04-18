"use client";

import { useEffect, useState } from "react";
import type { Agent, AgentStatus, ArtifactState } from "@prisma/client";

export type AgentCardAgent = Pick<
  Agent,
  | "id"
  | "actionId"
  | "actionLabel"
  | "status"
  | "originText"
  | "thinking"
  | "summary"
  | "artifactState"
>;

interface Props {
  agent: AgentCardAgent;
  isArtifact: boolean;
  onApprove: (agentId: string) => void;
  onUndo: (agentId: string) => void;
  onDismiss: (agentId: string) => void;
}

export function AgentCard({
  agent,
  isArtifact,
  onApprove,
  onUndo,
  onDismiss,
}: Props) {
  // Reveal thinking steps one at a time so the card feels alive even
  // though the backend is synchronous.
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    if (revealed >= agent.thinking.length) return;
    const t = setTimeout(() => setRevealed((n) => n + 1), 220);
    return () => clearTimeout(t);
  }, [revealed, agent.thinking.length]);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-white">{agent.actionLabel}</div>
        <StatusPill status={agent.status} artifactState={agent.artifactState} />
      </div>
      <blockquote className="mt-2 truncate rounded border border-gray-800 bg-black px-2 py-1 text-xs text-gray-500">
        {agent.originText.trim().slice(0, 80)}
        {agent.originText.length > 80 ? "…" : ""}
      </blockquote>

      <div className="mt-3 space-y-1">
        {agent.thinking.slice(0, revealed).map((step, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
            <span className="mt-0.5 text-green-400">•</span>
            <span>{step}</span>
          </div>
        ))}
        {revealed < agent.thinking.length ? (
          <div className="text-xs text-gray-600 italic">thinking…</div>
        ) : null}
      </div>

      {agent.summary && revealed >= agent.thinking.length ? (
        <p className="mt-3 rounded bg-gray-900 px-2 py-1.5 text-xs text-gray-300">
          {agent.summary}
        </p>
      ) : null}

      {revealed >= agent.thinking.length &&
      (agent.status === "AWAITING_APPROVAL" || agent.status === "THINKING") ? (
        <div className="mt-3 flex gap-2">
          {isArtifact ? (
            <>
              <button
                type="button"
                onClick={() => onApprove(agent.id)}
                className="flex-1 rounded border border-green-900 bg-green-950 px-2 py-1 text-xs text-green-300 hover:bg-green-900"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => onUndo(agent.id)}
                className="flex-1 rounded border border-red-900 bg-red-950 px-2 py-1 text-xs text-red-300 hover:bg-red-900"
              >
                Undo
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onApprove(agent.id)}
              className="flex-1 rounded border border-green-900 bg-green-950 px-2 py-1 text-xs text-green-300 hover:bg-green-900"
            >
              Acknowledge
            </button>
          )}
          <button
            type="button"
            onClick={() => onDismiss(agent.id)}
            className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-400 hover:bg-gray-900"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({
  status,
  artifactState,
}: {
  status: AgentStatus;
  artifactState: ArtifactState | null;
}) {
  const text = artifactState
    ? artifactState.toLowerCase()
    : status.toLowerCase().replace(/_/g, " ");
  const cls =
    status === "APPROVED"
      ? "bg-green-950 text-green-400 border-green-900"
      : status === "REVERTED"
        ? "bg-red-950 text-red-400 border-red-900"
        : "bg-gray-900 text-gray-400 border-gray-800";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${cls}`}
    >
      {text}
    </span>
  );
}
