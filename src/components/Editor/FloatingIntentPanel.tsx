"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { IntentSuggestion } from "@/types/proactive";

// Monaco editor and widget types (loose — the surface we use is small and stable).
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
 * Floating panel that follows an anchor in the Monaco editor.
 *
 * Implementation notes:
 * - Monaco's ContentWidget API positions a DOM node relative to a
 *   document line/column, following scroll and layout.
 * - The widget object must keep a stable identity for the lifetime of
 *   its registration — passing a new object to layoutContentWidget
 *   silently no-ops because Monaco tracks widgets by reference.
 * - We therefore keep the widget in a ref and have its getPosition
 *   callback read the current anchor from a second ref that we update
 *   on every render.
 * - React renders the panel's contents via createPortal into the
 *   widget's host div so state + event handlers work normally.
 */
export function FloatingIntentPanel({
  editor,
  state,
  onRunAction,
  onClose,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<Anchor | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const widgetRef = useRef<any>(null);
  // Used solely to trigger a re-render once the host div exists, so
  // createPortal can attach its output to it.
  const [, setHostReady] = useState(false);

  // Keep the current anchor in a ref read by Monaco's getPosition.
  anchorRef.current = state.status === "hidden" ? null : state.anchor;

  useEffect(() => {
    if (!editor) return;

    if (state.status === "hidden") {
      if (widgetRef.current) {
        editor.removeContentWidget(widgetRef.current);
        widgetRef.current = null;
      }
      return;
    }

    // Lazily create the host div on first show.
    if (!hostRef.current) {
      const div = document.createElement("div");
      div.style.zIndex = "50";
      hostRef.current = div;
      setHostReady(true);
    }

    if (!widgetRef.current) {
      const widget = {
        getId: () => "proactiveui.intent-panel",
        getDomNode: () => hostRef.current!,
        getPosition: () => {
          const a = anchorRef.current;
          if (!a) return null;
          // Monaco ContentWidgetPositionPreference: EXACT=0, ABOVE=1, BELOW=2
          return { position: a, preference: [1, 2] };
        },
      };
      editor.addContentWidget(widget);
      widgetRef.current = widget;
    } else {
      // Anchor or state changed; ask Monaco to re-layout.
      editor.layoutContentWidget(widgetRef.current);
    }
  }, [editor, state]);

  // Tear down when the editor itself changes (e.g. file switch re-mounts
  // Monaco) or on unmount.
  useEffect(() => {
    return () => {
      if (widgetRef.current && editor) {
        editor.removeContentWidget(widgetRef.current);
      }
      widgetRef.current = null;
    };
  }, [editor]);

  if (state.status === "hidden" || !hostRef.current) return null;

  return createPortal(
    <PanelContents state={state} onRunAction={onRunAction} onClose={onClose} />,
    hostRef.current,
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
  // Monaco dispatches mouse events on its own DOM tree. Without
  // stopPropagation, clicks inside the widget can be interpreted as
  // "click in editor", which fires onDidChangeCursorPosition, which
  // cancels the panel mid-click. Swallow the mousedown at the widget
  // boundary so Monaco never sees it.
  const swallow = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      className="w-72 rounded-lg border border-gray-700 bg-gray-950 p-2 text-xs shadow-xl"
      onMouseDown={swallow}
      onMouseUp={swallow}
      onClick={swallow}
    >
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
