import * as vscode from "vscode";
import { AgentManager } from "./core/agentManager";
import { DocumentWatcher } from "./core/documentWatcher";
import { IntentAnalyzer } from "./core/intentAnalyzer";
import { SessionStats } from "./core/sessionStats";
import { ArtifactCodeLensProvider } from "./providers/artifactCodeLensProvider";
import { IntentActionProvider } from "./providers/intentCodeLensProvider";
import { SidebarViewProvider } from "./sidebar/sidebarViewProvider";
import { SuggestedAction } from "./types/proactive";

export function activate(context: vscode.ExtensionContext): void {
  const actionProvider = new IntentActionProvider();
  const artifactCodeLensProvider = new ArtifactCodeLensProvider();
  const intentAnalyzer = new IntentAnalyzer(
    async () => (await context.secrets.get("proactiveui.anthropicApiKey")) ?? process.env.ANTHROPIC_API_KEY,
  );
  const agentManager = new AgentManager();
  const sessionStats = new SessionStats();
  const sidebarProvider = new SidebarViewProvider(context.extensionUri, agentManager);
  const documentWatcher = new DocumentWatcher(actionProvider, intentAnalyzer);

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "proactiveui.showSessionStats";
  statusBarItem.text = "$(beaker) ProactiveUI: 0 agents";
  statusBarItem.tooltip = "Click to view session statistics";
  statusBarItem.show();

  context.subscriptions.push(
    actionProvider,
    documentWatcher,
    vscode.languages.registerHoverProvider(
      [{ language: "python" }, { language: "latex" }],
      actionProvider,
    ),
    vscode.languages.registerCodeLensProvider(
      [{ language: "python" }, { language: "latex" }],
      artifactCodeLensProvider,
    ),
    vscode.window.registerWebviewViewProvider(SidebarViewProvider.viewId, sidebarProvider),
    vscode.commands.registerCommand("proactiveui.setAnthropicApiKey", async () => {
      const value = await vscode.window.showInputBox({
        title: "Set Anthropic API Key",
        prompt: "Paste your Anthropic API key. It will be stored in VS Code Secret Storage.",
        password: true,
        ignoreFocusOut: true,
      });
      if (!value) {
        return;
      }
      await context.secrets.store("proactiveui.anthropicApiKey", value.trim());
      vscode.window.showInformationMessage("ProactiveUI: Anthropic API key saved.");
    }),
    vscode.commands.registerCommand("proactiveui.clearAnthropicApiKey", async () => {
      await context.secrets.delete("proactiveui.anthropicApiKey");
      vscode.window.showInformationMessage("ProactiveUI: Anthropic API key cleared.");
    }),
    vscode.commands.registerCommand(
      "proactiveui.runAction",
      async (
        documentUri: vscode.Uri,
        range: vscode.Range,
        originText: string,
        action: SuggestedAction,
      ) => {
        const document = await vscode.workspace.openTextDocument(documentUri);
        void agentManager.runAction(document, range, originText, action);
        sidebarProvider.reveal();
      },
    ),
    vscode.commands.registerCommand("proactiveui.focusSidebar", () => {
      sidebarProvider.reveal();
    }),
    vscode.commands.registerCommand("proactiveui.approveArtifact", async (agentId: string) => {
      await agentManager.approveArtifact(agentId);
    }),
    vscode.commands.registerCommand("proactiveui.undoArtifact", async (agentId: string) => {
      await agentManager.undoArtifact(agentId);
    }),
    vscode.commands.registerCommand("proactiveui.approveResult", async (agentId: string) => {
      await agentManager.approveArtifact(agentId);
    }),
    vscode.commands.registerCommand("proactiveui.dismissAgent", (agentId: string) => {
      agentManager.dismissAgent(agentId);
    }),
    vscode.commands.registerCommand("proactiveui.focusAgent", async (agentId: string) => {
      await agentManager.focusAgentTarget(agentId);
    }),
    vscode.commands.registerCommand("proactiveui.noop", () => {}),
    vscode.commands.registerCommand("proactiveui.showSessionStats", () => {
      const s = sessionStats.summary();
      const lines = [
        `Total agents: ${s.totalAgents}`,
        `Approved: ${s.approved}  |  Reverted: ${s.reverted}  |  Pending: ${s.pending}`,
        `Approval rate: ${s.totalAgents > 0 ? `${Math.round(s.approvalRate * 100)}%` : "N/A"}`,
        "",
        "Action breakdown:",
        ...Object.entries(s.actionBreakdown).map(([action, count]) => `  ${action}: ${count}`),
      ];
      if (Object.keys(s.actionBreakdown).length === 0) {
        lines.push("  (no actions recorded yet)");
      }
      void vscode.window.showInformationMessage(lines.join("\n"), { modal: true });
    }),
    statusBarItem,
    agentManager.onDidUpdateAgents((agents) => {
      sidebarProvider.postAgents(agents);
      artifactCodeLensProvider.setAgents(agents);

      for (const agent of agents) {
        sessionStats.recordAgent(agent.id, agent.action.id, agent.status);
      }
      const pending = sessionStats.countByStatus("thinking") + sessionStats.countByStatus("awaiting_approval");
      const total = sessionStats.totalCount;
      statusBarItem.text = pending > 0
        ? `$(beaker) ProactiveUI: ${pending} pending`
        : `$(beaker) ProactiveUI: ${total} agents`;
    }),
    vscode.window.onDidChangeVisibleTextEditors(() => {
      actionProvider.refreshVisibleEditors();
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      actionProvider.refreshVisibleEditors();
    }),
  );
}

export function deactivate(): void {}
