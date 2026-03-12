import * as vscode from "vscode";
import { AgentRecord } from "../types/proactive";

export class ArtifactCodeLensProvider implements vscode.CodeLensProvider {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  private readonly artifactByDocument = new Map<string, AgentRecord[]>();

  readonly onDidChangeCodeLenses = this.onDidChangeEmitter.event;

  setAgents(agents: AgentRecord[]): void {
    const next = new Map<string, AgentRecord[]>();
    for (const agent of agents) {
      if (
        !agent.isArtifactAction ||
        agent.artifactStartLine === undefined ||
        agent.artifactState === "reverted"
      ) {
        continue;
      }
      const key = agent.docUri;
      const list = next.get(key) ?? [];
      list.push(agent);
      next.set(key, list);
    }
    this.artifactByDocument.clear();
    for (const [key, value] of next) {
      this.artifactByDocument.set(key, value);
    }
    this.onDidChangeEmitter.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const agents = this.artifactByDocument.get(document.uri.toString()) ?? [];
    const codeLenses: vscode.CodeLens[] = [];

    for (const agent of agents) {
      if (agent.artifactStartLine === undefined) {
        continue;
      }

      const lineRange = document.lineAt(agent.artifactStartLine).range;
      if (agent.artifactState === "pending") {
        codeLenses.push(
          new vscode.CodeLens(lineRange, {
            title: "Approve Artifact",
            command: "proactiveui.approveArtifact",
            arguments: [agent.id],
          }),
          new vscode.CodeLens(lineRange, {
            title: "Undo Artifact",
            command: "proactiveui.undoArtifact",
            arguments: [agent.id],
          }),
        );
      } else if (agent.artifactState === "approved") {
        codeLenses.push(
          new vscode.CodeLens(lineRange, {
            title: "Approved",
            command: "proactiveui.noop",
          }),
        );
      }
    }

    return codeLenses;
  }
}
