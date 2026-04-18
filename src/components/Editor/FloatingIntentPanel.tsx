"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { IntentSuggestion } from "@/types/proactive";

// Monaco editor and widget types (loose — the surface we use is small and stable).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Editor = any;

export type FloatingIntentState =
  | { status: "hidden" }
  | {
      status: "loading";
      anchor: { lineNumber: number; column: number };
    }
  | {
      status: "error";
      message: string;
      anchor: { lineNumber: number; column: number };
    }
  | {
      status: "ready";
      suggestion: IntentSuggestion;
      anchor: { lineNumber: number; column: number };
    };

interface Props {
  editor: Editor | null;
  state: FloatingIntentState;
  onRunAction: (
    actionId: string,
    actionLabel: string,
    suggestion: IntentSuggestion,
  ) => void;
  onClose: () => void;
}

/**
 * Floating panel that follows an anchor in the Monaco editor. Renders via
 * a ContentWidget (which Monaco positions relative to a document
 * line/column, following scrolls and layout changes) and a React portal
 * (so the panel stays inside the React tree for event handling and
 * re-renders).
 */
export function FloatingIntentPanel({
  editor,
  state,
  onRunAction,
  onClose,
}: Props) {
  const domRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<{ dispose: () => void } | null>(null);

  useEffect(() => {
    if (!editor) return;
    if (state.status === "hidden") {
      if (widgetRef.current) {
        widgetRef.current.dispose();
        widgetRef.current = null;
      }
      return;
    }

    if (!domRef.current) {
      const dom = document.createElement("div");
      dom.style.zIndex = "50";
      domRef.current = dom;
    }

    // Monaco ContentWidgetPositionPreference values (we don't import the
    // real enum to avoid pulling Monaco server-side):
    //   EXACT=0, ABOVE=1, BELOW=2
    // TypeScript narrows state to non-hidden here via the early return above.
    const anchor = state.anchor;
    const widget = {
      getId: () => "proactiveui.intent-panel",
      getDomNode: () => domRef.current!,
      getPosition: () => ({
        position: anchor,
        preference: [1, 2],
      }),
    };

    if (widgetRef.current) {
      editor.layoutContentWidget(widget);
    } else {
      editor.addContentWidget(widget);
      widgetRef.current = {
        dispose: () => editor.removeContentWidget(widget),
      };
    }

    return () => {
      // Don't dispose on every state change; handled above when hiding.
    };
  }, [editor, state]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      widgetRef.current?.dispose();
      widgetRef.current = null;
    };
  }, []);

  if (state.status === "hidden" || !domRef.current) return null;

  return createPortal(
    <PanelContents state={state} onRunAction={onRunAction} onClose={onClose} />,
    domRef.current,
  );
}

function PanelContents({
  state,
  onRunAction,
  onClose,
}: {
  state: Exclude<FloatingIntentState, { status: "hidden" }>;
  onRunAction: Props["onRunAction"];
  onClose: () => void;
}) {
  return (
    <div className="w-72 rounded-lg border border-gray-700 bg-gray-950 p-2 text-xs shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-gray-500">
          {state.status === "ready"
            ? `${state.suggestion.semanticType} · ${state.suggestion.source}`
            : state.status === "loading"
              ? "analyzing…"
              : "error"}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-1 text-gray-500 hover:bg-gray-900"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {state.status === "loading" ? (
        <p className="py-2 text-center text-gray-500">Reading intent…</p>
      ) : null}

      {state.status === "error" ? (
        <p className="py-2 text-red-400">{state.message}</p>
      ) : null}

      {state.status === "ready" ? (
        <div className="space-y-1">
          {state.suggestion.actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() =>
                onRunAction(action.id, action.label, state.suggestion)
              }
              className="block w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-left text-xs text-gray-200 hover:border-white hover:bg-gray-800"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
