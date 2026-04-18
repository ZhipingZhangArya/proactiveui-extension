# GitHub MCP Server Setup for Claude Code

## What is MCP?

MCP (Model Context Protocol) allows Claude Code to connect to external services via standardized tool interfaces. By adding a GitHub MCP server, Claude Code gains direct access to GitHub APIs — creating issues, pull requests, reading code, and managing repositories — all from within the CLI.

## What GitHub MCP Enables

- **Create and manage issues** directly from Claude Code
- **Create pull requests** with titles, descriptions, and linked issues
- **Read PR diffs, comments, and review status**
- **Search code, issues, and repositories** across GitHub
- **List commits and branches** without leaving the conversation

This eliminates context-switching between the terminal and the GitHub web UI.

## Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20 installed
- A [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` scope
- [Claude Code CLI](https://claude.ai/code) installed

### Step 1: Install the MCP server package

```bash
npm install @modelcontextprotocol/server-github
```

### Step 2: Create `.mcp.json` in the project root

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": [
        "node_modules/@modelcontextprotocol/server-github/dist/index.js"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-github-token>"
      }
    }
  }
}
```

> **Note:** If `node` is not on your default PATH (common in sandboxed environments), use the full path (e.g., `/usr/local/bin/node`). Similarly, use the full path to the `dist/index.js` file if needed.

### Step 3: Add `.mcp.json` to `.gitignore`

The file contains your GitHub token — never commit it.

```
# .gitignore
.mcp.json
```

### Step 4: Restart Claude Code

MCP servers are loaded at startup. After creating `.mcp.json`, exit and restart Claude Code:

```
/exit
claude
```

### Step 5: Verify

Ask Claude Code to list issues or interact with your repo. If the GitHub MCP tools are available (e.g., `create_issue`, `create_pull_request`), the setup is working.

## Demonstrated Workflow

We used GitHub MCP to complete a full **issue → fix → PR** cycle for the ProactiveUI extension:

### 1. Created Issue #2 via MCP

Used `mcp__github__create_issue` to file a bug report for the `.tex` cold-activation problem — a known limitation documented in PRD.md where opening a `.tex` file first (without a `.py` file already open) fails to activate the extension.

### 2. Implemented the Fix

Added `"onLanguage:latex"` to the `activationEvents` array in `package.json`:

```json
"activationEvents": [
  "onLanguage:python",
  "onLanguage:latex"
],
```

### 3. Created PR #3 via MCP

Used `mcp__github__create_pull_request` to open a pull request linked to issue #2 with a description, test plan, and `Closes #2` reference.

**All three steps were performed entirely within Claude Code using the GitHub MCP connection — no browser or `gh` CLI needed.**

## Troubleshooting

| Problem                                | Solution                                                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP tools don't appear after restart   | Check that `.mcp.json` is in the project root (not a subdirectory). Verify the `command` path is correct.                                     |
| `env: node: No such file or directory` | Use the full path to `node` (e.g., `/usr/local/bin/node`) in the `command` field.                                                             |
| `npx` not found                        | Install the package locally with `npm install` and point directly to the `dist/index.js` file instead of using `npx`.                         |
| 401 Unauthorized errors                | Your GitHub token may be expired or missing the `repo` scope. Regenerate it at GitHub Settings > Developer settings > Personal access tokens. |
