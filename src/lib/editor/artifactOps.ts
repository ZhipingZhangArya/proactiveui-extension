/**
 * Monaco editor helpers for artifact lifecycle.
 *
 * These run client-side. The editor/monaco types are loose (any) because
 * importing the real types couples us to the Monaco namespace in a way
 * that breaks Next.js SSR. The shape we use is small and stable.
 */

import { artifactDelimiters } from "@/lib/core/agentManager";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MonacoEditor = any;

/**
 * Scroll the editor to a specific line and select the whole line so it
 * looks highlighted. Used when the user clicks an agent card in the
 * sidebar and we want to jump the editor to where the agent was
 * triggered.
 */
export function focusLine(editor: MonacoEditor, lineNumber: number): void {
  if (!editor) return;
  const model = editor.getModel?.();
  if (!model) return;
  // Clamp to the model's current line count in case content shrank.
  const clamped = Math.max(1, Math.min(lineNumber, model.getLineCount()));
  try {
    editor.revealLineInCenter?.(clamped);
    editor.setSelection?.({
      startLineNumber: clamped,
      startColumn: 1,
      endLineNumber: clamped,
      endColumn: model.getLineMaxColumn(clamped),
    });
    editor.focus?.();
  } catch {
    /* non-fatal */
  }
}

/**
 * Insert the artifact block after the given line (1-indexed Monaco
 * line number). Returns `true` on success.
 */
export function insertArtifactAfterLine(
  editor: MonacoEditor,
  lineNumber: number,
  artifactFull: string,
): boolean {
  const model = editor?.getModel?.();
  if (!model) return false;

  const lastColumn = model.getLineMaxColumn(lineNumber);
  const insertText = "\n" + artifactFull;

  editor.executeEdits("proactiveui-insert", [
    {
      range: {
        startLineNumber: lineNumber,
        startColumn: lastColumn,
        endLineNumber: lineNumber,
        endColumn: lastColumn,
      },
      text: insertText,
      forceMoveMarkers: true,
    },
  ]);
  return true;
}

/**
 * Find the artifact's line range in the current editor content.
 * Returns `undefined` if the block is not present (e.g., user deleted
 * it manually or the artifact was never inserted).
 */
export function findArtifactRange(
  editor: MonacoEditor,
  agentId: string,
): { start: number; end: number } | undefined {
  const model = editor?.getModel?.();
  if (!model) return undefined;

  const { opening, closing } = artifactDelimiters(agentId);
  const lineCount = model.getLineCount();
  let start = -1;
  let end = -1;
  for (let i = 1; i <= lineCount; i++) {
    const line = model.getLineContent(i);
    if (start === -1 && opening.test(line)) {
      start = i;
      continue;
    }
    if (start !== -1 && closing.test(line)) {
      end = i;
      break;
    }
  }
  if (start === -1 || end === -1) return undefined;
  return { start, end };
}

/**
 * Update the opening delimiter's state tag from `pending` to
 * `approved`. Leaves the body and closing delimiter untouched so a
 * reviewer can still see the approved content.
 */
export function markArtifactApproved(
  editor: MonacoEditor,
  agentId: string,
): boolean {
  const range = findArtifactRange(editor, agentId);
  if (!range) return false;
  const model = editor.getModel();
  const openingLine = model.getLineContent(range.start);
  const updated = openingLine.replace("| pending", "| approved");
  editor.executeEdits("proactiveui-approve", [
    {
      range: {
        startLineNumber: range.start,
        startColumn: 1,
        endLineNumber: range.start,
        endColumn: model.getLineMaxColumn(range.start),
      },
      text: updated,
      forceMoveMarkers: true,
    },
  ]);
  return true;
}

/**
 * Remove the entire artifact block (opening line through closing line,
 * inclusive). Returns `true` if something was removed.
 */
export function removeArtifactBlock(
  editor: MonacoEditor,
  agentId: string,
): boolean {
  const range = findArtifactRange(editor, agentId);
  if (!range) return false;
  const model = editor.getModel();
  // Remove from start of opening line to start of the line AFTER closing
  // to also eat the trailing newline.
  const endLineNumber = Math.min(range.end + 1, model.getLineCount() + 1);
  editor.executeEdits("proactiveui-undo", [
    {
      range: {
        startLineNumber: range.start,
        startColumn: 1,
        endLineNumber,
        endColumn: 1,
      },
      text: "",
      forceMoveMarkers: true,
    },
  ]);
  return true;
}
