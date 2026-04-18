"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OnMount } from "@monaco-editor/react";
import type { Language } from "@prisma/client";
import { MonacoEditor } from "@/components/Editor/MonacoEditor";
import {
  FloatingIntentPanel,
  type FloatingIntentState,
} from "@/components/Editor/FloatingIntentPanel";
import { FileList, type FileListEntry } from "@/components/Files/FileList";
import { AgentSidebar } from "@/components/Sidebar/AgentSidebar";
import type { AgentCardAgent } from "@/components/Sidebar/AgentCard";
import type { IntentSuggestion } from "@/types/proactive";
import {
  insertArtifactAfterLine,
  markArtifactApproved,
  removeArtifactBlock,
} from "@/lib/editor/artifactOps";
import {
  useIntentTriggers,
  type TriggerPayload,
} from "@/hooks/useIntentTriggers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Editor = any;

interface ActiveDocument {
  id: string;
  title: string;
  language: Language;
  content: string;
}

type AppLanguage = "python" | "latex" | "csv";

function langToEditor(l: Language): AppLanguage {
  if (l === "PYTHON") return "python";
  if (l === "LATEX") return "latex";
  return "csv";
}

/** Monaco doesn't have a first-class CSV mode; plaintext is fine. */
function editorModeFor(l: AppLanguage): string {
  if (l === "csv") return "plaintext";
  return l;
}

function langFromExtension(filename: string): AppLanguage {
  const name = filename.toLowerCase();
  if (name.endsWith(".tex")) return "latex";
  if (name.endsWith(".csv")) return "csv";
  return "python";
}

export default function DashboardPage() {
  const [files, setFiles] = useState<FileListEntry[]>([]);
  const [active, setActive] = useState<ActiveDocument | null>(null);
  const [agents, setAgents] = useState<AgentCardAgent[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [intent, setIntent] = useState<FloatingIntentState>({
    status: "hidden",
  });
  // IMPORTANT: use state (not useRef) for the editor so downstream
  // effects (useIntentTriggers, FloatingIntentPanel) re-run when Monaco
  // finishes mounting. With useRef, mutations to .current don't trigger
  // a re-render, so the hook would forever see a null editor.
  const [editor, setEditor] = useState<Editor | null>(null);
  const lastTriggerRef = useRef<TriggerPayload | null>(null);

  // ---------- load files on mount (with first-run seed) ----------
  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bootstrap() {
    const files = await fetchFiles();
    if (files && files.length === 0) {
      // First-run: seed the account with demo files so users can try the
      // product without having to type anything.
      try {
        await fetch("/api/documents/seed", { method: "POST" });
        const seeded = await fetchFiles();
        if (seeded && seeded.length > 0) {
          // Open the first non-CSV doc so the intent flow has something
          // to classify right away.
          const first = seeded.find((f) => f.language !== "CSV") ?? seeded[0];
          await selectFile(first.id);
          setBanner(
            "Started you off with demo files — delete any you don't need.",
          );
        }
      } catch {
        /* non-fatal */
      }
    }
  }

  async function fetchFiles(): Promise<FileListEntry[] | null> {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) return null;
      const data = (await res.json()) as { documents: FileListEntry[] };
      setFiles(data.documents);
      return data.documents;
    } catch {
      return null;
    }
  }

  async function reloadFiles() {
    await fetchFiles();
  }

  // ---------- load doc content + agents when active changes ----------
  async function selectFile(id: string) {
    try {
      const [docRes, agentsRes] = await Promise.all([
        fetch(`/api/documents/${id}`),
        fetch(`/api/agents?documentId=${id}`),
      ]);
      if (!docRes.ok) {
        setBanner("Failed to load document");
        return;
      }
      const docData = (await docRes.json()) as {
        document: {
          id: string;
          title: string;
          language: Language;
          content: string;
        };
      };
      setActive(docData.document);
      if (agentsRes.ok) {
        const agData = (await agentsRes.json()) as {
          agents: AgentCardAgent[];
        };
        setAgents(agData.agents);
      } else {
        setAgents([]);
      }
      setIntent({ status: "hidden" });
      lastTriggerRef.current = null;
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Failed to load file");
    }
  }

  async function createFile(title: string, language: "python" | "latex") {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, language, content: "" }),
    });
    if (!res.ok) {
      setBanner("Failed to create file");
      return;
    }
    const data = (await res.json()) as {
      document: { id: string };
    };
    await reloadFiles();
    await selectFile(data.document.id);
  }

  async function importFile(file: File) {
    const text = await file.text();
    const language = langFromExtension(file.name);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: file.name, language, content: text }),
    });
    if (!res.ok) {
      setBanner(`Failed to import ${file.name}`);
      return;
    }
    const data = (await res.json()) as { document: { id: string } };
    await reloadFiles();
    await selectFile(data.document.id);
  }

  async function deleteFile(id: string) {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setBanner("Failed to delete file");
      return;
    }
    if (active?.id === id) {
      setActive(null);
      setAgents([]);
    }
    await reloadFiles();
  }

  // ---------- auto-save ----------
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEditorChange = useCallback(
    (value: string) => {
      if (!active) return;
      setActive((prev) => (prev ? { ...prev, content: value } : prev));
      setSaveState("saving");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/documents/${active.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: value }),
          });
          if (res.ok) setSaveState("saved");
          else setSaveState("idle");
        } catch {
          setSaveState("idle");
        }
      }, 1000);
    },
    [active],
  );

  // ---------- intent triggers → API → floating panel ----------
  const appLanguage: AppLanguage = active
    ? langToEditor(active.language)
    : "python";
  // CSV files are data, not code/prose — no intent inference.
  const fileType: "python" | "latex" =
    appLanguage === "latex" ? "latex" : "python";
  const intentEnabled = appLanguage !== "csv";

  useIntentTriggers(intentEnabled ? editor : null, {
    dwellMs: 1500,
    selectionMs: 400,
    onTrigger: async (payload) => {
      if (!active) return;
      lastTriggerRef.current = payload;
      setIntent({
        status: "loading",
        anchor: { lineNumber: payload.lineNumber, column: 1 },
      });
      try {
        const res = await fetch("/api/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: payload.text,
            fileType,
            source: payload.source,
            range: payload.range,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setIntent({
            status: "error",
            message: body?.error ?? `Request failed (${res.status})`,
            anchor: { lineNumber: payload.lineNumber, column: 1 },
          });
          return;
        }
        const suggestion = (await res.json()) as IntentSuggestion;
        setIntent({
          status: "ready",
          suggestion,
          anchor: { lineNumber: payload.lineNumber, column: 1 },
        });
      } catch (err) {
        setIntent({
          status: "error",
          message: err instanceof Error ? err.message : "Network error",
          anchor: { lineNumber: payload.lineNumber, column: 1 },
        });
      }
    },
    onCancel: () => {
      setIntent({ status: "hidden" });
    },
  });

  // ---------- spawn agent from a clicked action ----------
  async function onRunAction(actionId: string, label: string) {
    if (!active) {
      setBanner("Open a file first before running an action.");
      return;
    }
    if (!editor) {
      setBanner("Editor not ready — try again.");
      return;
    }
    const trigger = lastTriggerRef.current;
    if (!trigger) {
      setBanner("No intent context. Hover or select again.");
      return;
    }

    const insertionLine =
      trigger.source === "line"
        ? trigger.lineNumber
        : trigger.range.endLine + 1; // convert 0-indexed endLine back to 1-indexed

    // Keep the panel visible for ~1s so the user sees which action they
    // just picked, then dismiss. The agent card itself appears in the
    // sidebar as independent feedback.
    setTimeout(() => setIntent({ status: "hidden" }), 1000);
    setBanner(null);

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId,
          actionLabel: label,
          originText: trigger.text,
          insertionLine: insertionLine - 1,
          fileType,
          documentId: active.id,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setBanner(
          `Agent failed: ${body?.error ?? res.status} ${res.statusText}`,
        );
        return;
      }
      const data = (await res.json()) as {
        agent: AgentCardAgent;
        artifact?: { full: string } | null;
      };
      // Update state FIRST so the card shows even if the editor insert
      // throws — otherwise a bad line number eats the whole action.
      setAgents((prev) => [data.agent, ...prev]);
      if (data.artifact?.full) {
        try {
          insertArtifactAfterLine(editor, insertionLine, data.artifact.full);
        } catch (insertErr) {
          setBanner(
            `Artifact insert failed: ${
              insertErr instanceof Error ? insertErr.message : "unknown"
            }`,
          );
        }
      }
    } catch (err) {
      setBanner(
        err instanceof Error ? err.message : "Network error spawning agent",
      );
    }
  }

  async function patchAgent(
    agentId: string,
    op: "approve" | "undo" | "dismiss",
  ) {
    if (!editor) return;
    if (op === "approve") markArtifactApproved(editor, agentId);
    else if (op === "undo") removeArtifactBlock(editor, agentId);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: op === "dismiss" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: op === "dismiss" ? undefined : JSON.stringify({ op }),
      });
      if (!res.ok) {
        setBanner(`Failed to ${op}: ${res.status}`);
        return;
      }
      if (op === "dismiss") {
        setAgents((prev) => prev.filter((a) => a.id !== agentId));
      } else {
        const data = (await res.json()) as { agent: AgentCardAgent };
        setAgents((prev) =>
          prev.map((a) => (a.id === agentId ? data.agent : a)),
        );
      }
    } catch (err) {
      setBanner(err instanceof Error ? err.message : `Network error on ${op}`);
    }
  }

  const handleMount: OnMount = (ed) => {
    setEditor(ed);
  };

  const editorKey = useMemo(() => active?.id ?? "empty", [active?.id]);

  return (
    <div className="grid h-[calc(100vh-49px)] grid-cols-[220px_1fr_340px]">
      {/* LEFT — files */}
      <aside className="border-r border-gray-800 bg-gray-950">
        <FileList
          files={files}
          activeFileId={active?.id ?? null}
          onSelect={selectFile}
          onCreate={createFile}
          onImport={importFile}
          onDelete={deleteFile}
        />
      </aside>

      {/* CENTER — editor */}
      <section className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-2 text-xs">
          {active ? (
            <>
              <span className="font-medium text-white">{active.title}</span>
              <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
                {appLanguage}
              </span>
              {appLanguage === "csv" ? (
                <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] text-emerald-300">
                  data — no intent inference
                </span>
              ) : null}
              <span className="ml-auto text-gray-500">
                {saveState === "saving"
                  ? "saving…"
                  : saveState === "saved"
                    ? "saved"
                    : ""}
              </span>
            </>
          ) : (
            <span className="text-gray-500">No file selected</span>
          )}
        </div>
        <div className="flex-1">
          {active ? (
            <MonacoEditor
              key={editorKey}
              initialValue={active.content}
              language={
                editorModeFor(appLanguage) as "python" | "latex" | "plaintext"
              }
              onChange={onEditorChange}
              onMount={handleMount}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-gray-500">
              <div className="max-w-sm">
                <p className="mb-2 font-medium text-gray-300">
                  Welcome to ProactiveUI
                </p>
                <p>
                  Create or import a <code>.py</code> or <code>.tex</code> file
                  from the left panel. Hover on a line for 3 seconds or select a
                  passage to see intent-aware AI actions appear inline.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* RIGHT — agents */}
      <aside className="overflow-y-auto border-l border-gray-800 bg-gray-950 p-4">
        {banner ? (
          <p className="mb-3 rounded bg-red-950 px-3 py-2 text-xs text-red-300">
            {banner}
          </p>
        ) : null}
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Agents
        </h2>
        <AgentSidebar
          agents={agents}
          onApprove={(id) => patchAgent(id, "approve")}
          onUndo={(id) => patchAgent(id, "undo")}
          onDismiss={(id) => patchAgent(id, "dismiss")}
        />
      </aside>

      {/* Floating panel (portal into Monaco widget) */}
      <FloatingIntentPanel
        editor={editor}
        state={intent}
        onRunAction={onRunAction}
        onClose={() => setIntent({ status: "hidden" })}
      />
    </div>
  );
}
