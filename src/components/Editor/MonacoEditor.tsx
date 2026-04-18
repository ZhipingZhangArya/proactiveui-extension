"use client";

import Editor from "@monaco-editor/react";
import { useState } from "react";

export type EditorLanguage = "python" | "latex";

interface Props {
  initialValue?: string;
  language?: EditorLanguage;
  onChange?: (value: string) => void;
}

export function MonacoEditor({
  initialValue = "",
  language = "python",
  onChange,
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
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
      }}
    />
  );
}
