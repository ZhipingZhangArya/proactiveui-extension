"use client";

import { useRef, useState } from "react";
import type { Language } from "@prisma/client";

export interface FileListEntry {
  id: string;
  title: string;
  language: Language;
  updatedAt: string | Date;
}

interface Props {
  files: FileListEntry[];
  activeFileId: string | null;
  onSelect: (id: string) => void;
  onCreate: (title: string, language: "python" | "latex") => Promise<void>;
  onImport: (file: File) => Promise<void>;
  onDelete: (id: string) => void;
}

const LANG_LABEL: Record<Language, string> = {
  PYTHON: "py",
  LATEX: "tex",
  CSV: "csv",
};

const LANG_COLOR: Record<Language, string> = {
  PYTHON: "bg-blue-950 text-blue-300",
  LATEX: "bg-amber-950 text-amber-300",
  CSV: "bg-emerald-950 text-emerald-300",
};

export function FileList({
  files,
  activeFileId,
  onSelect,
  onCreate,
  onImport,
  onDelete,
}: Props) {
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCreate(language: "python" | "latex") {
    const defaultName = language === "python" ? "untitled.py" : "untitled.tex";
    const title = prompt("File name", defaultName)?.trim();
    if (!title) return;
    setBusy(true);
    try {
      await onCreate(title, language);
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await onImport(file);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-800 p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Files
        </h2>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleCreate("python")}
            className="rounded border border-gray-700 px-2 py-1 text-left text-xs text-gray-300 hover:bg-gray-900 disabled:opacity-50"
          >
            + New Python file
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleCreate("latex")}
            className="rounded border border-gray-700 px-2 py-1 text-left text-xs text-gray-300 hover:bg-gray-900 disabled:opacity-50"
          >
            + New LaTeX file
          </button>
          <label
            className={`rounded border border-gray-700 px-2 py-1 text-left text-xs text-gray-300 hover:bg-gray-900 ${
              busy ? "opacity-50" : "cursor-pointer"
            }`}
          >
            ⬆ Import .py / .tex / .csv
            <input
              ref={fileInputRef}
              type="file"
              accept=".py,.tex,.csv"
              onChange={handleImport}
              disabled={busy}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {files.length === 0 ? (
          <p className="p-3 text-center text-xs text-gray-600">
            No files yet. Create one or import a local file above.
          </p>
        ) : (
          <ul className="space-y-1">
            {files.map((file) => {
              const isActive = file.id === activeFileId;
              return (
                <li key={file.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelect(file.id)}
                    className={`flex flex-1 items-center gap-2 truncate rounded px-2 py-1 text-left text-xs ${
                      isActive
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:bg-gray-900"
                    }`}
                  >
                    <span
                      className={`inline-block w-6 shrink-0 rounded text-center text-[10px] ${LANG_COLOR[file.language]}`}
                    >
                      {LANG_LABEL[file.language]}
                    </span>
                    <span className="truncate">{file.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete "${file.title}"?`)) onDelete(file.id);
                    }}
                    className="invisible rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-red-950 hover:text-red-300 group-hover:visible"
                    aria-label={`Delete ${file.title}`}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
