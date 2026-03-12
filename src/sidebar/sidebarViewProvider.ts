import * as vscode from "vscode";
import { AgentManager } from "../core/agentManager";
import { AgentRecord } from "../types/proactive";

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = "proactiveui.sidebar";

  private view?: vscode.WebviewView;
  private panel?: vscode.WebviewPanel;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly agentManager: AgentManager,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "focusAgent") {
        await vscode.commands.executeCommand("proactiveui.focusAgent", message.agentId);
      }

      if (message.type === "approveArtifact") {
        await vscode.commands.executeCommand("proactiveui.approveArtifact", message.agentId);
      }

      if (message.type === "undoArtifact") {
        await vscode.commands.executeCommand("proactiveui.undoArtifact", message.agentId);
      }

      if (message.type === "approveResult") {
        await vscode.commands.executeCommand("proactiveui.approveResult", message.agentId);
      }

      if (message.type === "dismissAgent") {
        await vscode.commands.executeCommand("proactiveui.dismissAgent", message.agentId);
      }
    });

    this.postAgents(this.agentManager.list());
  }

  reveal(): void {
    if (this.view) {
      this.view.show?.(true);
      return;
    }

    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        "proactiveui.agentsPanel",
        "ProactiveUI Agents",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        },
      );
      this.panel.webview.html = this.getHtml(this.panel.webview);
      this.panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === "focusAgent") {
          await vscode.commands.executeCommand("proactiveui.focusAgent", message.agentId);
        }

        if (message.type === "approveArtifact") {
          await vscode.commands.executeCommand("proactiveui.approveArtifact", message.agentId);
        }

        if (message.type === "undoArtifact") {
          await vscode.commands.executeCommand("proactiveui.undoArtifact", message.agentId);
        }

        if (message.type === "approveResult") {
          await vscode.commands.executeCommand("proactiveui.approveResult", message.agentId);
        }

        if (message.type === "dismissAgent") {
          await vscode.commands.executeCommand("proactiveui.dismissAgent", message.agentId);
        }
      });
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    }

    this.panel.reveal(vscode.ViewColumn.Beside, true);
    this.postAgents(this.agentManager.list());
  }

  postAgents(agents: AgentRecord[]): void {
    const message = {
      type: "agentsUpdated",
      agents,
    };
    this.view?.webview.postMessage(message);
    this.panel?.webview.postMessage(message);
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
        padding: 12px;
      }
      .empty {
        opacity: 0.7;
        line-height: 1.5;
      }
      .card {
        border: 1px solid var(--vscode-widget-border);
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 10px;
        background: var(--vscode-editor-background);
        min-height: 120px;
        max-height: 240px;
        overflow: auto;
        resize: vertical;
      }
      .card.active {
        border-color: var(--vscode-focusBorder);
        box-shadow: inset 0 0 0 1px var(--vscode-focusBorder);
      }
      .card.expanded {
        max-height: none;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
      }
      .titleWrap {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .agentIcon {
        font-size: 14px;
        line-height: 1;
      }
      .status {
        font-size: 12px;
        opacity: 0.75;
      }
      .origin, .output {
        font-size: 12px;
        line-height: 1.5;
        margin-top: 8px;
        white-space: pre-wrap;
      }
      .summary {
        font-size: 12px;
        line-height: 1.5;
        margin-top: 8px;
        font-weight: 600;
      }
      .thinking {
        font-size: 11px;
        line-height: 1.5;
        margin-top: 8px;
        border-left: 2px solid var(--vscode-widget-border);
        padding-left: 8px;
        white-space: pre-wrap;
        color: var(--vscode-descriptionForeground);
      }
      .actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;
        flex-wrap: wrap;
      }
      button {
        border: 1px solid var(--vscode-button-border, transparent);
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border-radius: 6px;
        padding: 4px 8px;
        cursor: pointer;
      }
      button.secondary {
        background: transparent;
        color: var(--vscode-foreground);
      }
      button.ghost {
        background: transparent;
        color: var(--vscode-descriptionForeground);
        border-style: dashed;
      }
    </style>
  </head>
  <body>
    <div id="root" class="empty">No agents yet. Trigger a Python plan comment action to start the demo.</div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const root = document.getElementById("root");
      const expandedAgents = new Set();
      let activeAgentId = null;

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message.type !== "agentsUpdated") {
          return;
        }

        const agents = message.agents || [];
        if (!agents.length) {
          root.className = "empty";
          root.textContent = "No agents yet. Trigger a Python plan comment action to start the demo.";
          return;
        }

        root.className = "";
        root.replaceChildren(...agents.map(renderAgent));
      });

      document.addEventListener("click", (event) => {
        const target = event.target;
        const element = event.target instanceof Element ? event.target : null;
        const card = element ? element.closest(".card") : null;

        if (card && !(target instanceof HTMLButtonElement)) {
          const cardAgentId = card.dataset.agentId;
          if (cardAgentId) {
            activeAgentId = cardAgentId;
            root.querySelectorAll(".card").forEach((node) => node.classList.remove("active"));
            card.classList.add("active");
            vscode.postMessage({ type: "focusAgent", agentId: cardAgentId });
          }
          return;
        }

        if (!(target instanceof HTMLButtonElement)) {
          return;
        }
        const action = target.dataset.action;
        const agentId = target.dataset.agentId;
        if (!action || !agentId) {
          return;
        }
        if (action === "toggleExpand") {
          if (expandedAgents.has(agentId)) {
            expandedAgents.delete(agentId);
          } else {
            expandedAgents.add(agentId);
          }
          const card = target.closest(".card");
          if (card) {
            card.classList.toggle("expanded");
          }
          target.textContent = expandedAgents.has(agentId) ? "Collapse" : "Expand";
          return;
        }
        vscode.postMessage({ type: action, agentId });
      });

      function renderAgent(agent) {
        const card = document.createElement("div");
        card.className = "card";
        card.dataset.agentId = agent.id;
        if (expandedAgents.has(agent.id)) {
          card.classList.add("expanded");
        }
        if (activeAgentId === agent.id) {
          card.classList.add("active");
        }

        const row = document.createElement("div");
        row.className = "row";

        const titleWrap = document.createElement("div");
        titleWrap.className = "titleWrap";

        const agentIcon = document.createElement("span");
        agentIcon.className = "agentIcon";
        agentIcon.textContent = "🤖";

        const title = document.createElement("strong");
        title.textContent = agent.action.label;
        titleWrap.append(agentIcon, title);

        const status = document.createElement("span");
        status.className = "status";
        status.textContent = agent.status;

        row.append(titleWrap, status);

        const origin = document.createElement("div");
        origin.className = "origin";
        origin.textContent = agent.originText;

        const output = document.createElement("div");
        output.className = "output";
        output.textContent = agent.output;

        const thinking = document.createElement("div");
        thinking.className = "thinking";
        thinking.textContent = (agent.thinking && agent.thinking.length)
          ? agent.thinking.map((line, index) => (index + 1) + ". " + line).join("\\n")
          : "";

        const summary = document.createElement("div");
        summary.className = "summary";
        summary.textContent = agent.summary ? ("Summary: " + agent.summary) : "";

        const actions = document.createElement("div");
        actions.className = "actions";

        const expand = document.createElement("button");
        expand.className = "ghost";
        expand.dataset.action = "toggleExpand";
        expand.dataset.agentId = agent.id;
        expand.textContent = expandedAgents.has(agent.id) ? "Collapse" : "Expand";
        actions.appendChild(expand);

        if (agent.isArtifactAction && agent.status === "awaiting_approval") {
          const approve = document.createElement("button");
          approve.dataset.action = "approveArtifact";
          approve.dataset.agentId = agent.id;
          approve.textContent = "Approve";
          actions.appendChild(approve);

          const undo = document.createElement("button");
          undo.dataset.action = "undoArtifact";
          undo.dataset.agentId = agent.id;
          undo.textContent = "Undo";
          actions.appendChild(undo);
        } else if (!agent.isArtifactAction && agent.status === "awaiting_approval") {
          const approveResult = document.createElement("button");
          approveResult.dataset.action = "approveResult";
          approveResult.dataset.agentId = agent.id;
          approveResult.textContent = "Approve";
          actions.appendChild(approveResult);
        }

        const dismiss = document.createElement("button");
        dismiss.className = "secondary";
        dismiss.dataset.action = "dismissAgent";
        dismiss.dataset.agentId = agent.id;
        dismiss.textContent = "Dismiss";
        actions.appendChild(dismiss);

        if (thinking.textContent) {
          card.append(row, origin, thinking);
        } else {
          card.append(row, origin);
        }
        if (summary.textContent) {
          card.append(summary);
        }
        if (output.textContent) {
          card.append(output);
        }
        card.append(actions);
        return card;
      }
    </script>
  </body>
</html>`;
  }
}

function getNonce(): string {
  return Math.random().toString(36).slice(2);
}
