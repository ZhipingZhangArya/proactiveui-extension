# MCP Integration Retrospective

## What Did MCP Integration Enable That Wasn't Possible Before?

### 1. Zero-context-switch GitHub workflow

Before MCP, interacting with GitHub required leaving the terminal — opening a browser to file issues, create PRs, or check repo status. With GitHub MCP, we completed an entire **issue → fix → PR** cycle without ever leaving Claude Code. The LLM could read repository state, create an issue with structured markdown and labels, and open a PR referencing that issue — all as natural tool calls in the same conversation where we were writing code.

### 2. Semantic understanding of project context during GitHub operations

When we created Issue #2, Claude Code had already read `PRD.md` and understood that the `.tex` cold-activation problem was a known limitation (Section 9, Open Question #1). The MCP tool call wasn't just a mechanical API request — it was informed by the full project context. The issue body included references to specific PRD sections, reproduction steps derived from understanding the `activationEvents` mechanism, and a precise fix description. This level of context-aware issue filing would require significant manual effort without MCP.

### 3. Atomic multi-step operations

The PR was created with `Closes #2` in the body, automatically linking it to the issue. The branch had already been pushed, the commit message referenced the issue — everything was coordinated in a single conversation flow. Without MCP, this would involve: copy issue number from browser → write commit message → push → go back to browser → click "New PR" → paste description → link issue. MCP collapsed all of this into one coherent operation.

### 4. Configuration challenges revealed real developer experience gaps

The setup process itself was instructive. We hit three blockers:
- `npx` not on the sandboxed PATH → needed full path
- `npx` internally calling `node` which also wasn't on PATH → `npx` approach failed entirely
- Permission denied for global npm install → had to install locally

This forced us to use `/usr/local/bin/node` directly pointing to the local `dist/index.js`. The experience highlights that **MCP server setup is still fragile** — it assumes standard PATH configurations that sandboxed or restricted environments don't provide. Documenting these workarounds in `docs/mcp-setup.md` was essential.

## What Would We Build Next?

### 1. Pre-commit hook: auto-link issues in commit messages

**Type:** Claude Code hook (post-commit-message / pre-commit)

When committing a change on a branch associated with a GitHub issue, a hook could automatically verify the commit message references the relevant issue number. Using GitHub MCP, it could read open issues, match them to the branch name or changed files, and suggest adding `Refs #N` or `Closes #N` if missing.

```
# Example hook concept
trigger: pre-commit
action: read open issues via MCP → match to branch → suggest issue reference
```

### 2. Sub-agent: automated PR reviewer

**Type:** Sub-agent (spawned on PR creation)

After creating a PR via MCP, a sub-agent could automatically:
- Read the PR diff via `mcp__github__get_pull_request_files`
- Check if the changes align with the linked issue description
- Verify that `CLAUDE.md` conventions are followed (e.g., if a new `ActionId` was added, are all four required locations updated?)
- Post a review comment via `mcp__github__create_pull_request_review`

This would be particularly valuable for ProactiveUI since adding a new action requires synchronized changes across 4 files — easy to miss manually.

### 3. Hook: post-push CI status monitor

**Type:** Claude Code hook (post-push) + scheduled agent

After pushing, a hook could use GitHub MCP to poll `get_pull_request_status` and notify when CI checks pass or fail — without needing to open the GitHub web UI. For ProactiveUI, this would be especially useful once GitHub Actions CI is added (currently missing from the repo).

### 4. Sub-agent: issue triage from PRD

**Type:** Sub-agent (on-demand)

A sub-agent that reads `PRD.md` open questions and deferred limitations, cross-references with existing GitHub issues, and creates missing issues automatically. This would keep the GitHub issue tracker in sync with the living PRD — useful as the project evolves from prototype to production.

## Key Takeaway

MCP's value isn't just API access — it's **contextual API access**. The LLM already understands the codebase, the PRD, the conventions. MCP lets it act on that understanding directly, turning analysis into action without the human needing to be the bridge between "what Claude knows" and "what GitHub needs."
