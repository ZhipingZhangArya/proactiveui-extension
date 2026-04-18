"use client";

import { useState } from "react";
import { MonacoEditor, type EditorLanguage } from "@/components/Editor/MonacoEditor";

const INITIAL_PYTHON = `# Step 1: load and clean the dataset

# Step 2: run correlation analysis
`;

const INITIAL_LATEX = `\\section{Introduction}

This paper explores...
`;

export default function DashboardPage() {
  const [language, setLanguage] = useState<EditorLanguage>("python");
  const initial = language === "python" ? INITIAL_PYTHON : INITIAL_LATEX;

  return (
    <div className="grid h-[calc(100vh-49px)] grid-cols-[1fr_320px]">
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
        </div>
        <div className="flex-1">
          <MonacoEditor
            key={language}
            initialValue={initial}
            language={language}
          />
        </div>
      </section>
      <aside className="border-l border-gray-800 bg-gray-950 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Agents
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          No active agents yet. Trigger intent detection from the editor to
          spawn one.
        </p>
      </aside>
    </div>
  );
}
