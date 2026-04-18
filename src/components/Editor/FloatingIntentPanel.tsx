"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { IntentSuggestion } from "@/types/proactive";

// Monaco editor type (loose — the surface we use is small and stable).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Editor = any;

type Anchor = { lineNumber: number; column: number };

export type FloatingIntentState =
  | { status: "hidden" }
  | { status: "loading"; anchor: Anchor }
  | { status: "error"; message: string; anchor: Anchor }
  | {
      status: "ready";
      suggestion: IntentSuggestion;
      anchor: Anchor;
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
 * Floating panel that tracks an anchor line in the Monaco editor.
 *
 * Implementation note: we deliberately **do not** use Monaco's
 * ContentWidget API, even though that's the "official" way to attach
 * floating UI inside the editor. ContentWidgets live inside Monaco's
 * view layers and Monaco's own mouse handling can intercept DOM events
 * before React's synthetic listeners see them — which silently breaks
 * click handlers on any buttons inside the widget (observed in
 * production on Apr 18 2026).
 *
 * Instead we render a `position: fixed` overlay into `document.body`
 * via a React portal and compute its pixel position from Monaco's
 * `getScrolledVisiblePosition` + the editor's bounding rect. This is
 * ordinary DOM — events work the normal way.
 */
export function FloatingIntentPanel({
  editor,
  state,
  onRunAction,
  onClose,
}: Props) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Recompute position whenever state changes, when the editor scrolls,
  // or when the window resizes. Cheap — only runs while visible.
  useEffect(() => {
    if (!editor) return;
    if (state.status === "hidden") {
      setPos(null);
      return;
    }

    function recalc() {
      if (state.status === "hidden") return;
      const visible = editor.getScrolledVisiblePosition?.({
        lineNumber: state.anchor.lineNumber,
        column: state.anchor.column,
      });
      const dom = editor.getDomNode?.();
      if (!visible || !dom) return;
      const rect = dom.getBoundingClientRect();
      // Place the panel just below the anchor line. `visible.top` is
      // relative to the editor's content viewport; +visible.height
      // puts us on the line-below baseline.
      setPos({
        top: rect.top + visible.top + visible.height + 6,
        left: rect.left + visible.left,
      });
    }

    recalc();

    const scrollSub = editor.onDidScrollChange?.(recalc);
    window.addEventListener("resize", recalc);
    const layoutSub = editor.onDidLayoutChange?.(recalc);

    return () => {
      scrollSub?.dispose?.();
      layoutSub?.dispose?.();
      window.removeEventListener("resize", recalc);
    };
  }, [editor, state]);

  if (state.status === "hidden" || !pos) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 100,
      }}
    >
      <PanelContents
        state={state}
        onRunAction={onRunAction}
        onClose={onClose}
      />
    </div>,
    document.body,
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
