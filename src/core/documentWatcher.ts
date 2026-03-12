import * as vscode from "vscode";
import { IntentActionProvider } from "../providers/intentCodeLensProvider";
import { IntentSuggestion } from "../types/proactive";
import { IntentAnalyzer } from "./intentAnalyzer";

export class DocumentWatcher implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly selectionDebounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly lastSelectionSignatures = new Map<string, string>();
  private readonly analysisVersions = new Map<string, number>();

  constructor(
    private readonly actionProvider: IntentActionProvider,
    private readonly intentAnalyzer: IntentAnalyzer,
  ) {
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        this.handleTextChange(event);
      }),
      vscode.window.onDidChangeTextEditorSelection((event) => {
        this.handleSelectionChange(event);
      }),
      vscode.workspace.onDidCloseTextDocument((document) => {
        this.actionProvider.clearSuggestions(document.uri);
        this.clearTimer(document.uri.toString());
        this.clearSelectionTimer(document.uri.toString());
        this.lastSelectionSignatures.delete(document.uri.toString());
        this.analysisVersions.delete(document.uri.toString());
      }),
    );
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.selectionDebounceTimers.values()) {
      clearTimeout(timer);
    }
  }

  private handleTextChange(event: vscode.TextDocumentChangeEvent): void {
    if (!isSupportedDocument(event.document) || event.contentChanges.length === 0) {
      return;
    }

    const insertedNewline = event.contentChanges.some((change) => change.text.includes("\n"));
    if (!insertedNewline) {
      return;
    }

    const editor = vscode.window.visibleTextEditors.find(
      (candidate) => candidate.document.uri.toString() === event.document.uri.toString(),
    );
    if (!editor) {
      return;
    }

    const cursorLine = editor.selection.active.line;
    const completedLineNumber = Math.max(0, cursorLine - 1);
    const completedLine = event.document.lineAt(completedLineNumber);
    const text = completedLine.text;

    if (!isInterestingLine(event.document, text)) {
      return;
    }

    this.scheduleLineAnalysis(event.document, completedLineNumber, text);
  }

  private handleSelectionChange(event: vscode.TextEditorSelectionChangeEvent): void {
    if (!isSupportedDocument(event.textEditor.document)) {
      return;
    }

    const key = event.textEditor.document.uri.toString();
    this.clearSelectionTimer(key);

    const selection = event.selections[0];
    if (!selection || selection.isEmpty) {
      this.lastSelectionSignatures.delete(key);
      return;
    }

    const selectionCopy = new vscode.Selection(selection.start, selection.end);
    const timer = setTimeout(() => {
      void this.handleSelectionAnalysis(event.textEditor.document, key, selectionCopy);
    }, 180);

    this.selectionDebounceTimers.set(key, timer);
  }

  private async handleSelectionAnalysis(
    document: vscode.TextDocument,
    key: string,
    selectionCopy: vscode.Selection,
  ): Promise<void> {
    const text = document.getText(selectionCopy);
    const signature = `${selectionCopy.start.line}:${selectionCopy.start.character}-${selectionCopy.end.line}:${selectionCopy.end.character}-${text.length}`;

    if (this.lastSelectionSignatures.get(key) === signature) {
      return;
    }

    this.lastSelectionSignatures.set(key, signature);
    const version = this.bumpAnalysisVersion(key);
    const suggestion = await this.intentAnalyzer.analyzeSelection(document, selectionCopy, text);
    if (!this.isCurrentVersion(key, version)) {
      return;
    }
    this.publishSuggestions(document, [suggestion]);
  }

  private scheduleLineAnalysis(
    document: vscode.TextDocument,
    lineNumber: number,
    text: string,
  ): void {
    const key = document.uri.toString();
    this.clearTimer(key);

    const timer = setTimeout(() => {
      void this.handleLineAnalysis(document, key, lineNumber, text);
    }, 60);

    this.debounceTimers.set(key, timer);
  }

  private async handleLineAnalysis(
    document: vscode.TextDocument,
    key: string,
    lineNumber: number,
    text: string,
  ): Promise<void> {
    const range = document.lineAt(lineNumber).range;
    const version = this.bumpAnalysisVersion(key);
    const suggestion = await this.intentAnalyzer.analyzeLine(document, range, text);
    if (!this.isCurrentVersion(key, version)) {
      return;
    }
    this.publishSuggestions(document, [suggestion]);
  }

  private publishSuggestions(
    document: vscode.TextDocument,
    nextSuggestions: IntentSuggestion[],
  ): void {
    this.actionProvider.setSuggestions(document.uri, nextSuggestions);
    const firstSuggestion = nextSuggestions[0];
    if (firstSuggestion?.source === "selection") {
      void this.showSelectionActions(document, firstSuggestion);
      return;
    }

    if (firstSuggestion?.source === "line") {
      void this.showLineActions(document, firstSuggestion);
    }
  }

  private async showSelectionActions(
    document: vscode.TextDocument,
    suggestion: IntentSuggestion,
  ): Promise<void> {
    const editor = vscode.window.visibleTextEditors.find(
      (candidate) => candidate.document.uri.toString() === document.uri.toString(),
    );
    if (!editor) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 30));
    await vscode.commands.executeCommand("editor.action.showHover");
  }

  private async showLineActions(
    document: vscode.TextDocument,
    suggestion: IntentSuggestion,
  ): Promise<void> {
    const editor = vscode.window.visibleTextEditors.find(
      (candidate) => candidate.document.uri.toString() === document.uri.toString(),
    );
    if (!editor) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 30));
    const hoverChar = Math.max(
      suggestion.range.start.character,
      suggestion.range.end.character - 1,
    );
    const hoverPosition = new vscode.Position(suggestion.range.start.line, hoverChar);
    editor.selection = new vscode.Selection(hoverPosition, hoverPosition);
    await vscode.commands.executeCommand("editor.action.showHover");
  }

  private bumpAnalysisVersion(key: string): number {
    const next = (this.analysisVersions.get(key) ?? 0) + 1;
    this.analysisVersions.set(key, next);
    return next;
  }

  private isCurrentVersion(key: string, version: number): boolean {
    return this.analysisVersions.get(key) === version;
  }

  private clearTimer(key: string): void {
    const timer = this.debounceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(key);
    }
  }

  private clearSelectionTimer(key: string): void {
    const timer = this.selectionDebounceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.selectionDebounceTimers.delete(key);
    }
  }
}

function isInterestingLine(document: vscode.TextDocument, text: string): boolean {
  if (document.languageId === "python") {
    const trimmed = text.trim();
    return trimmed.startsWith("#") && trimmed.length > 1;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  // Ignore plain LaTeX commands-only lines for trigger quality.
  return !trimmed.match(/^\\[a-zA-Z]+\*?(\{.*\})?$/);
}

function isSupportedDocument(document: vscode.TextDocument): boolean {
  if (document.languageId === "python" || document.languageId === "latex") {
    return true;
  }

  return document.fileName.toLowerCase().endsWith(".tex");
}
