import * as vscode from "vscode";
import { AgentRecord, SuggestedAction } from "../types/proactive";

export class AgentManager {
  private readonly agents: AgentRecord[] = [];
  private readonly onDidUpdateAgentsEmitter = new vscode.EventEmitter<AgentRecord[]>();

  public readonly onDidUpdateAgents = this.onDidUpdateAgentsEmitter.event;

  list(): AgentRecord[] {
    return [...this.agents].sort((a, b) => b.createdAt - a.createdAt);
  }

  async runAction(
    document: vscode.TextDocument,
    range: vscode.Range,
    originText: string,
    action: SuggestedAction,
  ): Promise<AgentRecord> {
    const agent: AgentRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      status: "thinking",
      createdAt: Date.now(),
      docUri: document.uri.toString(),
      insertionLine: range.end.line,
      originText,
      output: "",
      summary: undefined,
      thinking: [this.getWorkingMessage(action)],
      isArtifactAction: this.isArtifactAction(action),
    };

    this.agents.unshift(agent);
    this.emit();

    await this.streamThinking(agent, this.getThinkingStream(action));
    agent.summary = this.buildSummary(action, originText);
    agent.output = this.buildFinalOutput(action, originText);
    agent.artifact = this.buildArtifact(action, originText);

    if (agent.isArtifactAction && agent.artifact) {
      await this.insertArtifactDraft(agent);
      agent.status = "awaiting_approval";
      agent.artifactState = "pending";
    } else {
      agent.status = "awaiting_approval";
    }

    this.emit();
    return agent;
  }

  async approveArtifact(agentId: string): Promise<void> {
    const agent = this.agents.find((item) => item.id === agentId);
    if (!agent) {
      return;
    }

    if (agent.isArtifactAction && agent.artifactState === "pending") {
      await this.updateArtifactHeader(agent, "approved");
      agent.artifactState = "approved";
    }

    agent.status = "approved";
    this.emit();
  }

  async undoArtifact(agentId: string): Promise<void> {
    const agent = this.agents.find((item) => item.id === agentId);
    if (!agent) {
      return;
    }

    if (agent.isArtifactAction && agent.artifactStartLine !== undefined && agent.artifactEndLine !== undefined) {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(agent.docUri));
      const editor = await vscode.window.showTextDocument(document, { preview: false });
      const start = new vscode.Position(agent.artifactStartLine, 0);
      const endLineText = document.lineAt(agent.artifactEndLine).text;
      const end = new vscode.Position(agent.artifactEndLine, endLineText.length);
      await editor.edit((editBuilder) => {
        editBuilder.delete(new vscode.Range(start, end));
      });
      agent.artifactState = "reverted";
      agent.status = "reverted";
      this.emit();
      return;
    }

    agent.status = "reverted";
    this.emit();
  }

  dismissAgent(agentId: string): void {
    const index = this.agents.findIndex((agent) => agent.id === agentId);
    if (index === -1) {
      return;
    }

    this.agents.splice(index, 1);
    this.emit();
  }

  async focusAgentTarget(agentId: string): Promise<void> {
    const agent = this.agents.find((item) => item.id === agentId);
    if (!agent) {
      return;
    }

    const existingEditor = vscode.window.visibleTextEditors.find(
      (editor) => editor.document.uri.toString() === agent.docUri,
    );
    if (!existingEditor) {
      // Do not open a new editor/tab when user clicks an agent card.
      return;
    }

    const document = existingEditor.document;
    const targetLine = Math.min(Math.max(0, agent.insertionLine), document.lineCount - 1);
    const line = document.lineAt(targetLine);
    const startChar = firstNonWhitespace(line.text);
    const start = new vscode.Position(targetLine, startChar);
    const end = new vscode.Position(targetLine, line.text.length);
    const range = new vscode.Range(start, end);

    existingEditor.selection = new vscode.Selection(start, end);
    existingEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  }

  private emit(): void {
    this.onDidUpdateAgentsEmitter.fire(this.list());
  }

  private getWorkingMessage(action: SuggestedAction): string {
    switch (action.id) {
      case "writeCode":
        return "Generating analysis code from your plan comment...";
      case "detailStep":
        return "Expanding this step into a more executable analysis checklist...";
      case "exploreAlternative":
        return "Looking for an alternative analysis path...";
      case "improveComment":
        return "Revising the comment for clarity and readability...";
      case "generateDocstring":
        return "Generating a docstring for the selected function or class...";
      case "fixGrammar":
        return "Fixing grammar and fluency for the selected academic text...";
      case "rewriteAcademic":
        return "Rewriting the text in a clearer academic writing style...";
      case "expandParagraph":
        return "Expanding the paragraph with stronger context and transitions...";
      case "summarizeUnderstanding":
        return "Reflecting understanding of this passage and surfacing the core intent...";
      case "simplifyParagraph":
        return "Rewriting the paragraph in simpler and clearer language...";
      case "extractTodo":
        return "Scanning for TODO, FIXME, HACK, and XXX markers in the selected text...";
    }
  }

  private getThinkingStream(action: SuggestedAction): string[] {
    switch (action.id) {
      case "writeCode":
        return [
          "Parsing the comment intent and extracting executable subtasks.",
          "Choosing a minimal first-pass data-loading skeleton.",
          "Adding lightweight preprocessing to keep output runnable.",
          "Formatting code block for direct insertion under the comment.",
        ];
      case "detailStep":
        return [
          "Reading the current step and identifying hidden sub-goals.",
          "Expanding into ordered sub-steps with clear outcomes.",
          "Rewriting as compact plan comments for fast review.",
        ];
      case "exploreAlternative":
        return [
          "Finding a second approach that answers the same question.",
          "Comparing complexity and interpretability trade-offs.",
          "Drafting a concise alternative path with rationale.",
        ];
      case "improveComment":
        return [
          "Preserving original intent while improving clarity.",
          "Tightening wording and grammar for readability.",
          "Producing a concise revised comment draft.",
        ];
      case "generateDocstring":
        return [
          "Identifying the function or class signature from the surrounding context.",
          "Inferring parameter types, return values, and purpose.",
          "Formatting a complete docstring following Google style conventions.",
        ];
      case "fixGrammar":
        return [
          "Scanning sentence structure and grammar issues.",
          "Applying minimal edits while preserving technical meaning.",
          "Preparing a polished corrected draft.",
        ];
      case "rewriteAcademic":
        return [
          "Identifying weak wording and informal phrasing.",
          "Rewriting in concise academic style.",
          "Ensuring argument flow and readability.",
        ];
      case "expandParagraph":
        return [
          "Finding missing context and transition gaps.",
          "Adding one coherent supporting idea.",
          "Producing an expanded paragraph draft.",
        ];
      case "summarizeUnderstanding":
        return [
          "Reading the selected passage for core claims.",
          "Extracting assumptions and implied reasoning.",
          "Writing a concise reflection of understanding.",
        ];
      case "simplifyParagraph":
        return [
          "Identifying complex sentence structures and jargon in the passage.",
          "Replacing technical terms with plain equivalents where possible.",
          "Restructuring sentences for maximum clarity without losing meaning.",
        ];
      case "extractTodo":
        return [
          "Scanning the triggering line for TODO, FIXME, HACK, and XXX comment markers.",
          "Extracting the task description from each marker found.",
          "Formatting a prioritized list of action items for review.",
        ];
    }
  }

  private buildSummary(action: SuggestedAction, originText: string): string {
    switch (action.id) {
      case "writeCode":
        return "Generated a draft code artifact and inserted it below the target comment.";
      case "detailStep":
        return "Expanded the plan into concrete sub-steps and inserted it as an artifact.";
      case "exploreAlternative":
        return "Prepared an alternative plan with rationale; waiting for your approval.";
      case "improveComment":
        return `Prepared a revised version of the comment for "${originText.trim()}".`;
      case "generateDocstring":
        return "Generated a docstring artifact and inserted it below the target comment.";
      case "fixGrammar":
        return "Prepared a grammar-corrected artifact draft below the original text.";
      case "rewriteAcademic":
        return "Prepared an academic-style rewrite artifact below the original text.";
      case "expandParagraph":
        return "Prepared an expanded paragraph artifact below the original text.";
      case "summarizeUnderstanding":
        return "Prepared a concise reflection of understanding; waiting for your approval.";
      case "simplifyParagraph":
        return "Prepared a simplified version of the paragraph as a pending artifact.";
      case "extractTodo":
        return `Extracted TODO/FIXME items from "${originText.trim()}"; results shown in the sidebar card.`;
    }
  }

  private buildFinalOutput(action: SuggestedAction, originText: string): string {
    switch (action.id) {
      case "writeCode":
        return "Code draft ready and inserted as a pending artifact under the comment.";
      case "detailStep":
        return "Detailed plan draft inserted as a pending artifact under the comment.";
      case "exploreAlternative":
        return `Alternative idea: instead of following "${originText.trim()}", consider validating the same question with a simpler baseline first.`;
      case "improveComment":
        return `Revised comment inserted below the original line: ${this.toRevisedComment(originText)}`;
      case "generateDocstring":
        return "Generate Docstring draft inserted as a pending artifact below the target line.";
      case "fixGrammar":
        return "Grammar-fixed draft inserted as a pending artifact.";
      case "rewriteAcademic":
        return "Academic rewrite inserted as a pending artifact.";
      case "expandParagraph":
        return "Expanded paragraph inserted as a pending artifact.";
      case "summarizeUnderstanding":
        return this.buildUnderstandingSummary(originText);
      case "simplifyParagraph":
        return "Simplify Paragraph draft inserted as a pending artifact below the target line.";
      case "extractTodo":
        return this.toExtractTodoOutput(originText);
    }
  }

  private buildArtifact(action: SuggestedAction, originText: string): string | undefined {
    switch (action.id) {
      case "writeCode":
        return [
          `# --- [ProactiveUI Artifact ${Date.now()} | pending] ---`,
          "import pandas as pd",
          "",
          "df = pd.read_csv(\"data.csv\")",
          "df = df.dropna()",
          "print(df.head())",
          "# --- [/ProactiveUI Artifact] ---",
        ].join("\n");
      case "detailStep":
        return [
          `# --- [ProactiveUI Artifact ${Date.now()} | pending] ---`,
          `# Refined from: ${originText.trim()}`,
          "# 1. Load the relevant dataset.",
          "# 2. Check schema and missing values.",
          "# 3. Clean obvious data quality issues.",
          "# 4. Run a first-pass summary before modeling.",
          "# --- [/ProactiveUI Artifact] ---",
        ].join("\n");
      case "improveComment":
        return this.toRevisedComment(originText);
      case "fixGrammar":
        return [
          `% --- [ProactiveUI Artifact ${Date.now()} | pending] ---`,
          this.toGrammarFixedParagraph(originText),
          `% --- [/ProactiveUI Artifact] ---`,
        ].join("\n");
      case "rewriteAcademic":
        return [
          `% --- [ProactiveUI Artifact ${Date.now()} | pending] ---`,
          this.toAcademicRewrite(originText),
          `% --- [/ProactiveUI Artifact] ---`,
        ].join("\n");
      case "expandParagraph":
        return [
          `% --- [ProactiveUI Artifact ${Date.now()} | pending] ---`,
          this.toExpandedParagraph(originText),
          `% --- [/ProactiveUI Artifact] ---`,
        ].join("\n");
      case "generateDocstring": {
        const id = Date.now();
        return [
          `# --- [ProactiveUI Artifact ${id} | pending] ---`,
          `def example_function(param1, param2):`,
          `    """Summary line describing what this function does.`,
          ``,
          `    Args:`,
          `        param1: Description of param1.`,
          `        param2: Description of param2.`,
          ``,
          `    Returns:`,
          `        Description of the return value.`,
          `    """`,
          `# --- [/ProactiveUI Artifact] ---`,
        ].join("\n");
      }
      case "simplifyParagraph": {
        const id = Date.now();
        return [
          `% --- [ProactiveUI Artifact ${id} | pending] ---`,
          this.toSimplifiedParagraph(originText),
          `% --- [/ProactiveUI Artifact] ---`,
        ].join("\n");
      }
      case "summarizeUnderstanding":
        return undefined;
      case "exploreAlternative":
        return undefined;
      case "extractTodo":
        return undefined;
    }
  }

  private isArtifactAction(action: SuggestedAction): boolean {
    return action.id !== "exploreAlternative" && action.id !== "summarizeUnderstanding" && action.id !== "extractTodo";
  }

  private async streamThinking(agent: AgentRecord, lines: string[]): Promise<void> {
    for (const line of lines) {
      await sleep(180);
      agent.thinking.push(line);
      this.emit();
    }
    await sleep(120);
  }

  private async insertArtifactDraft(agent: AgentRecord): Promise<void> {
    if (!agent.artifact) {
      return;
    }

    const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(agent.docUri));
    const editor = await vscode.window.showTextDocument(document, { preview: false });
    const insertLine = Math.min(agent.insertionLine + 1, document.lineCount);
    const insertPosition = new vscode.Position(insertLine, 0);
    const insertion = `${agent.artifact}\n`;

    await editor.edit((editBuilder) => {
      editBuilder.insert(insertPosition, insertion);
    });

    const insertedLines = insertion.split("\n").length - 1;
    agent.artifactStartLine = insertLine;
    agent.artifactEndLine = insertLine + Math.max(0, insertedLines - 1);
  }

  private async updateArtifactHeader(agent: AgentRecord, state: "approved"): Promise<void> {
    if (agent.artifactStartLine === undefined) {
      return;
    }

    const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(agent.docUri));
    const editor = await vscode.window.showTextDocument(document, { preview: false });
    const line = document.lineAt(agent.artifactStartLine);
    const updated = line.text.replace("| pending", `| ${state}`);
    if (updated === line.text) {
      return;
    }

    await editor.edit((editBuilder) => {
      editBuilder.replace(line.range, updated);
    });
  }

  private toRevisedComment(originText: string): string {
    const stripped = originText.replace(/^(\s*#\s*)?/, "").trim().replace(/\s+/g, " ");
    if (!stripped) {
      return "# Revised comment";
    }

    return `# ${capitalize(stripped)}`;
  }

  private toGrammarFixedParagraph(originText: string): string {
    const stripped = originText.replace(/^\s*%+\s?/, "").trim();
    return stripped
      ? `${capitalize(stripped.replace(/\s+/g, " "))}.`
      : "This sentence has been grammar-corrected.";
  }

  private toAcademicRewrite(originText: string): string {
    const stripped = originText.replace(/^\s*%+\s?/, "").trim();
    if (!stripped) {
      return "In this section, we present a clearer academic formulation of the original statement.";
    }
    return `We reformulate this point as follows: ${stripTrailingPunctuation(stripped)}.`;
  }

  private toExpandedParagraph(originText: string): string {
    const stripped = originText.replace(/^\s*%+\s?/, "").trim();
    if (!stripped) {
      return "This paragraph is expanded with additional context, motivation, and a transition to the next section.";
    }
    return `${stripTrailingPunctuation(stripped)}. This expanded version clarifies the motivation, states the expected outcome, and improves the transition to the subsequent argument.`;
  }

  private toSimplifiedParagraph(originText: string): string {
    const stripped = originText.replace(/^\s*%+\s?/, "").trim();
    if (!stripped) {
      return "This paragraph has been rewritten in simpler and clearer language.";
    }
    return `In short: ${stripTrailingPunctuation(stripped)}. This version uses plain language to make the same point more directly.`;
  }

  private toExtractTodoOutput(originText: string): string {
    const stripped = originText.replace(/^(\s*#\s*)?/, "").trim();
    const pattern = /\b(TODO|FIXME|HACK|XXX)\s*:?\s*(.*)/gi;
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(stripped)) !== null) {
      const marker = match[1].toUpperCase();
      const desc = match[2].trim();
      matches.push(desc ? `${marker}: ${desc}` : marker);
    }
    if (matches.length === 0) {
      return `No TODO/FIXME/HACK/XXX markers found in: "${stripped || originText.trim()}"`;
    }
    return `Found ${matches.length} item${matches.length > 1 ? "s" : ""}:\n${matches.map((m) => `  • ${m}`).join("\n")}`;
  }

  private buildUnderstandingSummary(originText: string): string {
    const stripped = originText.replace(/^\s*%+\s?/, "").trim();
    return `Reflecting my understanding: this passage argues that ${stripped || "the author is introducing a core idea"}, and the next step should clarify evidence and scope.`;
  }
}

function capitalize(text: string): string {
  if (!text) {
    return text;
  }

  return text[0].toUpperCase() + text.slice(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function firstNonWhitespace(text: string): number {
  const idx = text.search(/\S/);
  return idx >= 0 ? idx : 0;
}

function stripTrailingPunctuation(text: string): string {
  return text.replace(/[.?!\s]+$/g, "");
}
