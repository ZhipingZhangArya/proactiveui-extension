"use client";

import { useEffect, useRef } from "react";

// Loose Monaco types — the API surface we use is small and stable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Editor = any;

export type TriggerPayload =
  | {
      source: "line";
      text: string;
      lineNumber: number; // 1-indexed
      range: {
        startLine: number;
        startCharacter: number;
        endLine: number;
        endCharacter: number;
      };
    }
  | {
      source: "selection";
      text: string;
      lineNumber: number; // end line, 1-indexed (for widget anchor)
      range: {
        startLine: number;
        startCharacter: number;
        endLine: number;
        endCharacter: number;
      };
    };

interface Options {
  /** Dwell-time before a stationary-cursor line triggers analysis. */
  dwellMs?: number;
  /** Debounce before a stable selection triggers analysis. */
  selectionMs?: number;
  /** Called when either trigger fires. */
  onTrigger: (payload: TriggerPayload) => void;
  /** Called when the cursor moves or selection is cleared. */
  onCancel: () => void;
}

/**
 * Attach dwell-cursor and selection-debounce listeners to a Monaco
 * editor. Resets timers on every cursor move so a trigger only fires
 * when the user actually pauses.
 */
export function useIntentTriggers(editor: Editor | null, opts: Options) {
  const dwellMs = opts.dwellMs ?? 3000;
  const selectionMs = opts.selectionMs ?? 400;

  // Keep callback references stable so re-renders don't tear down the
  // Monaco listeners.
  const onTriggerRef = useRef(opts.onTrigger);
  const onCancelRef = useRef(opts.onCancel);
  useEffect(() => {
    onTriggerRef.current = opts.onTrigger;
    onCancelRef.current = opts.onCancel;
  }, [opts.onTrigger, opts.onCancel]);

  useEffect(() => {
    if (!editor) return;
    let dwellTimer: ReturnType<typeof setTimeout> | null = null;
    let selectionTimer: ReturnType<typeof setTimeout> | null = null;

    function clearDwell() {
      if (dwellTimer) {
        clearTimeout(dwellTimer);
        dwellTimer = null;
      }
    }
    function clearSelection() {
      if (selectionTimer) {
        clearTimeout(selectionTimer);
        selectionTimer = null;
      }
    }

    function scheduleDwell(lineNumber: number) {
      clearDwell();
      dwellTimer = setTimeout(() => {
        const model = editor.getModel();
        if (!model) return;
        const text = model.getLineContent(lineNumber).trim();
        if (!text) return;
        onTriggerRef.current({
          source: "line",
          text,
          lineNumber,
          range: {
            startLine: lineNumber - 1,
            startCharacter: 0,
            endLine: lineNumber - 1,
            endCharacter: model.getLineMaxColumn(lineNumber) - 1,
          },
        });
      }, dwellMs);
    }

    function scheduleSelection(selection: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    }) {
      clearSelection();
      selectionTimer = setTimeout(() => {
        const model = editor.getModel();
        if (!model) return;
        const text = model.getValueInRange(selection).trim();
        if (!text) return;
        onTriggerRef.current({
          source: "selection",
          text,
          lineNumber: selection.endLineNumber,
          range: {
            startLine: selection.startLineNumber - 1,
            startCharacter: selection.startColumn - 1,
            endLine: selection.endLineNumber - 1,
            endCharacter: selection.endColumn - 1,
          },
        });
      }, selectionMs);
    }

    const cursorSub = editor.onDidChangeCursorPosition((e: unknown) => {
      const event = e as {
        position: { lineNumber: number; column: number };
        reason: number;
      };
      // Any cursor move cancels an in-flight trigger and re-arms the dwell.
      clearDwell();
      clearSelection();
      onCancelRef.current();
      scheduleDwell(event.position.lineNumber);
    });

    const selectionSub = editor.onDidChangeCursorSelection((e: unknown) => {
      const event = e as {
        selection: {
          startLineNumber: number;
          startColumn: number;
          endLineNumber: number;
          endColumn: number;
          isEmpty?: () => boolean;
        };
      };
      const sel = event.selection;
      const isEmpty =
        sel.startLineNumber === sel.endLineNumber &&
        sel.startColumn === sel.endColumn;
      if (isEmpty) return; // cursor move without a selection — handled above
      clearDwell();
      scheduleSelection(sel);
    });

    const blurSub = editor.onDidBlurEditorText?.(() => {
      clearDwell();
      clearSelection();
      onCancelRef.current();
    });

    // Prime the dwell timer on the current position so just opening a
    // file with a cursor already on a meaningful line still triggers.
    const pos = editor.getPosition?.();
    if (pos) scheduleDwell(pos.lineNumber);

    return () => {
      clearDwell();
      clearSelection();
      cursorSub?.dispose?.();
      selectionSub?.dispose?.();
      blurSub?.dispose?.();
    };
  }, [editor, dwellMs, selectionMs]);
}
