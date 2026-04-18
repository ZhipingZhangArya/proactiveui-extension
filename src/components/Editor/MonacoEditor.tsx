"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useState } from "react";

export type EditorLanguage = "python" | "latex";

interface Props {
  initialValue?: string;
  /** Monaco language mode. Use `plaintext` for data files like CSV. */
  language?: EditorLanguage | "plaintext";
  onChange?: (value: string) => void;
  onMount?: OnMount;
}

export function MonacoEditor({
  initialValue = "",
  language = "python",
  onChange,
  onMount,
}: Props) {
  const [value, setValue] = useState(initialValue);

  return (
    <Editor
      height="100%"
      language={language}
      theme="vs-dark"
      value={value}
      onChange={(v) => {
        const next = v ?? "";
        setValue(next);
        onChange?.(next);
      }}
      onMount={onMount}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
      }}
    />
  );
}
