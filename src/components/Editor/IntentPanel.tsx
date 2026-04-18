"use client";

import type { IntentSuggestion } from "@/types/proactive";

interface Props {
  state:
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; suggestion: IntentSuggestion };
  onRunAction?: (actionId: string, actionLabel: string) => void;
}

export function IntentPanel({ state, onRunAction }: Props) {
  if (state.status === "idle") {
    return (
      <p className="text-sm text-gray-500">
        Place the cursor on a line and click{" "}
        <span className="text-gray-300">Analyze current line</span>, or select
        text and click <span className="text-gray-300">Analyze selection</span>.
      </p>
    );
  }

  if (state.status === "loading") {
    return <p className="text-sm text-gray-500">Analyzing…</p>;
  }

  if (state.status === "error") {
    return <p className="text-sm text-red-400">{state.message}</p>;
  }

  const { suggestion } = state;

  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        Detected intent:{" "}
        <span className="text-gray-300">{suggestion.semanticType}</span>{" "}
        <span className="text-gray-600">({suggestion.source})</span>
      </div>
      <blockquote className="rounded border border-gray-800 bg-black px-2 py-1 text-xs text-gray-400">
        {suggestion.text.length > 120
          ? suggestion.text.slice(0, 120) + "…"
          : suggestion.text}
      </blockquote>
      <div className="space-y-1.5">
        {suggestion.actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onRunAction?.(action.id, action.label)}
            className="block w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-left text-sm hover:border-white hover:bg-gray-800"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
