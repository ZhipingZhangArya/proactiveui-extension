"use client";

import { useRef, useState } from "react";
import type { OnMount } from "@monaco-editor/react";
import {
  MonacoEditor,
  type EditorLanguage,
} from "@/components/Editor/MonacoEditor";
import { IntentPanel } from "@/components/Editor/IntentPanel";
import type { IntentSuggestion } from "@/types/proactive";

const INITIAL_PYTHON = `# Step 1: load and clean the dataset

# Step 2: run correlation analysis
`;

const INITIAL_LATEX = `\\section{Introduction}

This paper explores...
`;

type IntentState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; suggestion: IntentSuggestion };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Editor = any;

export default function DashboardPage() {
  const [language, setLanguage] = useState<EditorLanguage>("python");
  const [intent, setIntent] = useState<IntentState>({ status: "idle" });
  const [lastAction, setLastAction] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);

  const initial = language === "python" ? INITIAL_PYTHON : INITIAL_LATEX;

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  async function analyze(source: "line" | "selection") {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    let text: string;
    let range: {
      startLine: number;
      startCharacter: number;
      endLine: number;
      endCharacter: number;
    };

    if (source === "selection") {
      const selection = editor.getSelection();
      if (!selection || selection.isEmpty()) {
        setIntent({
          status: "error",
          message: "Select some text first, then click Analyze selection.",
        });
        return;
      }
      text = model.getValueInRange(selection);
      range = {
        startLine: selection.startLineNumber - 1,
        startCharacter: selection.startColumn - 1,
        endLine: selection.endLineNumber - 1,
        endCharacter: selection.endColumn - 1,
      };
    } else {
      const position = editor.getPosition();
      if (!position) return;
      const lineNumber = position.lineNumber;
      text = model.getLineContent(lineNumber).trim();
      if (!text) {
        setIntent({
          status: "error",
          message: "Current line is empty.",
        });
        return;
      }
      range = {
        startLine: lineNumber - 1,
        startCharacter: 0,
        endLine: lineNumber - 1,
        endCharacter: model.getLineMaxColumn(lineNumber) - 1,
      };
    }

    setIntent({ status: "loading" });
    setLastAction(null);

    try {
      const res = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          fileType: language,
          source,
          range,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setIntent({
          status: "error",
          message: body?.error ?? `Request failed (${res.status})`,
        });
        return;
      }
      const suggestion = (await res.json()) as IntentSuggestion;
      setIntent({ status: "ready", suggestion });
    } catch (err) {
      setIntent({
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  }

  function onRunAction(actionId: string, label: string) {
    // Wiring to /api/agents comes in the next stage (needs DB).
    setLastAction(`${label} (${actionId}) — agent execution not wired yet`);
  }

  return (
    <div className="grid h-[calc(100vh-49px)] grid-cols-[1fr_340px]">
      <section className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-2 text-sm">
          <span className="text-gray-500">Language:</span>
          <button
            type="button"
            onClick={() => setLanguage("python")}
            className={`rounded px-2 py-0.5 ${
              language === "python"
                ? "bg-white text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Python
          </button>
          <button
            type="button"
            onClick={() => setLanguage("latex")}
            className={`rounded px-2 py-0.5 ${
              language === "latex"
                ? "bg-white text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            LaTeX
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => analyze("line")}
              className="rounded border border-gray-700 px-2 py-0.5 text-gray-300 hover:bg-gray-900"
            >
              Analyze current line
            </button>
            <button
              type="button"
              onClick={() => analyze("selection")}
              className="rounded border border-gray-700 px-2 py-0.5 text-gray-300 hover:bg-gray-900"
            >
              Analyze selection
            </button>
          </div>
        </div>
        <div className="flex-1">
          <MonacoEditor
            key={language}
            initialValue={initial}
            language={language}
            onMount={handleMount}
          />
        </div>
      </section>
      <aside className="overflow-y-auto border-l border-gray-800 bg-gray-950 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Intent
        </h2>
        <IntentPanel state={intent} onRunAction={onRunAction} />
        {lastAction ? (
          <p className="mt-4 rounded bg-gray-900 px-3 py-2 text-xs text-gray-400">
            {lastAction}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
