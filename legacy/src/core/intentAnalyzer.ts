import * as vscode from "vscode";
import { analyzeLine, analyzeSelection } from "./mockIntentAnalyzer";
import { AnthropicIntentClient } from "../llm/anthropicIntentClient";
import { IntentSuggestion } from "../types/proactive";

type GetApiKey = () => Promise<string | undefined>;
type SupportedFileType = "python" | "latex";

export class IntentAnalyzer {
  private readonly anthropicClient = new AnthropicIntentClient();

  constructor(private readonly getApiKey: GetApiKey) {}

  async analyzeLine(
    document: vscode.TextDocument,
    range: vscode.Range,
    text: string,
  ): Promise<IntentSuggestion> {
    return this.analyze(document, range, text, "line");
  }

  async analyzeSelection(
    document: vscode.TextDocument,
    range: vscode.Selection,
    text: string,
  ): Promise<IntentSuggestion> {
    return this.analyze(document, range, text, "selection");
  }

  private async analyze(
    document: vscode.TextDocument,
    range: vscode.Range,
    text: string,
    source: "line" | "selection",
  ): Promise<IntentSuggestion> {
    const fileType = detectFileType(document);
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return source === "selection"
        ? analyzeSelection(text, range, fileType)
        : analyzeLine(text, range, fileType);
    }

    try {
      const { contextBefore, contextAfter } = buildContext(document, range);
      const inferred = await this.anthropicClient.inferIntent(apiKey, {
        source,
        fileType,
        text,
        contextBefore,
        contextAfter,
      });

      if (!inferred) {
        return source === "selection"
          ? analyzeSelection(text, range, fileType)
          : analyzeLine(text, range, fileType);
      }

      return {
        semanticType: inferred.semanticType,
        actions: inferred.actions,
        source,
        text,
        range,
      };
    } catch {
      return source === "selection"
        ? analyzeSelection(text, range, fileType)
        : analyzeLine(text, range, fileType);
    }
  }
}

function buildContext(
  document: vscode.TextDocument,
  range: vscode.Range,
): { contextBefore: string; contextAfter: string } {
  const start = range.start.line;
  const end = range.end.line;

  const beforeStart = Math.max(0, start - 4);
  const beforeLines: string[] = [];
  for (let i = beforeStart; i < start; i += 1) {
    beforeLines.push(document.lineAt(i).text);
  }

  const afterEnd = Math.min(document.lineCount - 1, end + 4);
  const afterLines: string[] = [];
  for (let i = end + 1; i <= afterEnd; i += 1) {
    afterLines.push(document.lineAt(i).text);
  }

  return {
    contextBefore: beforeLines.join("\n"),
    contextAfter: afterLines.join("\n"),
  };
}

function detectFileType(document: vscode.TextDocument): SupportedFileType {
  if (document.languageId === "python") {
    return "python";
  }

  if (document.languageId === "latex" || document.fileName.toLowerCase().endsWith(".tex")) {
    return "latex";
  }

  return "python";
}
