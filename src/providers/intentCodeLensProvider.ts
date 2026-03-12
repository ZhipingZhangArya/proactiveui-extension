import * as vscode from "vscode";
import { IntentSuggestion, SuggestedAction } from "../types/proactive";

export class IntentActionProvider implements vscode.HoverProvider, vscode.Disposable {
  private readonly suggestions = new Map<string, IntentSuggestion[]>();

  setSuggestions(documentUri: vscode.Uri, suggestions: IntentSuggestion[]): void {
    this.suggestions.set(documentUri.toString(), suggestions);
  }

  clearSuggestions(documentUri: vscode.Uri): void {
    this.suggestions.delete(documentUri.toString());
  }

  getSuggestions(documentUri: vscode.Uri): IntentSuggestion[] {
    return this.suggestions.get(documentUri.toString()) ?? [];
  }

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const suggestion = this.getSuggestions(document.uri).find((item) => item.range.contains(position));
    if (!suggestion) {
      return undefined;
    }

    return new vscode.Hover(this.buildHoverMarkdown(document.uri, suggestion), suggestion.range);
  }

  refreshVisibleEditors(): void {
    // No-op for now. Kept for compatibility with existing extension wiring.
  }

  dispose(): void {
    // No-op.
  }

  private buildHoverMarkdown(
    documentUri: vscode.Uri,
    suggestion: IntentSuggestion,
  ): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.isTrusted = true;
    markdown.appendMarkdown(
      suggestion.actions
        .map((action) => this.toCommandLink(documentUri, suggestion, action))
        .join("  \n\n"),
    );
    return markdown;
  }

  private toCommandLink(
    documentUri: vscode.Uri,
    suggestion: IntentSuggestion,
    action: SuggestedAction,
  ): string {
    const args = encodeURIComponent(
      JSON.stringify([documentUri, suggestion.range, suggestion.text, action]),
    );
    return `[${this.toHoverActionLabel(action.label)}](command:proactiveui.runAction?${args})`;
  }

  private toHoverActionLabel(label: string): string {
    return `  ${label}  `;
  }
}
