import * as path from "path";
import * as vscode from "vscode";
import { AgentRecord } from "../types/proactive";

export async function exportAgents(agents: AgentRecord[]): Promise<void> {
  if (agents.length === 0) {
    void vscode.window.showInformationMessage("No scan results to export.");
    return;
  }

  const format = await vscode.window.showQuickPick(["JSON", "TXT"], {
    placeHolder: "Select export format",
  });
  if (!format) {
    return;
  }

  const ext = format === "JSON" ? "json" : "txt";
  const defaultUri = vscode.Uri.file(`proactiveui-results-${Date.now()}.${ext}`);
  const filters =
    format === "JSON" ? { "JSON files": ["json"] } : { "Text files": ["txt"] };

  const saveUri = await vscode.window.showSaveDialog({ defaultUri, filters });
  if (!saveUri) {
    return;
  }

  const content = format === "JSON" ? toJson(agents) : toTxt(agents);
  await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, "utf-8"));
  void vscode.window.showInformationMessage(
    `Exported to ${path.basename(saveUri.fsPath)}.`,
  );
}

function toJson(agents: AgentRecord[]): string {
  return JSON.stringify(agents, null, 2);
}

function toTxt(agents: AgentRecord[]): string {
  return agents.map(formatAgent).join("\n\n---\n\n");
}

function formatAgent(agent: AgentRecord): string {
  const fileName = path.basename(vscode.Uri.parse(agent.docUri).fsPath);
  const line = agent.insertionLine + 1;
  const summary = agent.summary ?? agent.output;
  const thinkingLines = agent.thinking
    .map((step, i) => `  ${i + 1}. ${step}`)
    .join("\n");

  return [
    `=== Agent: ${agent.action.label} ===`,
    `Status:  ${agent.status}`,
    `File:    ${fileName} (line ${line})`,
    `Origin:  ${agent.originText}`,
    `Summary: ${summary}`,
    `Thinking:\n${thinkingLines}`,
  ].join("\n");
}
