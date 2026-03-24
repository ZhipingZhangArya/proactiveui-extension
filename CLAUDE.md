# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Requirements

@PRD.md

`PRD.md` is the authoritative source for this project. It covers:
- **Problem statement and goals** — why this project exists and what it is optimizing for
- **User stories with acceptance criteria** — 6 stories (data analyst, academic writer, careful reviewer) each with testable given/when/then conditions
- **Feature requirements** — target behavior for intent detection, action suggestions, agent cards, artifact lifecycle, and API key management
- **Success metrics** — 5 measurable targets to validate the prototype
- **Open questions** — unresolved decisions the team needs to align on (e.g., `.tex` cold-activation fix, live LLM artifact generation scope)
- **Demo scenario** — the canonical 12-step walkthrough all acceptance criteria are validated against

When modifying any feature, check `PRD.md` first to confirm intended behavior and acceptance criteria before reading the code.

## Project Context

**ProactiveUI: Intent-Aware Writing and Analysis Co-Pilot** — Team: Zhiping Zhang, Qiushi Liang

A VS Code/Cursor extension that turns planning text in `.py` and `.tex` files into in-place AI actions. Infers intent from a completed line or selected passage, surfaces context-aware actions via hover panel, and writes artifact outputs back into the document with approve/undo controls.

This is a **research prototype/demo**. Primary workflows: data analysis (`.py` plan comments → code generation) and academic writing (`.tex` passages → grammar/style edits).

## Stack

- **VS Code Extension API** `^1.90.0` — runs via Extension Development Host (F5), no VSIX packaging
- **TypeScript** `^5.6.3` — strict mode, ES2020 target, CommonJS modules
- **Node.js** `>=20` (inferred from `@types/node ^20`)
- **`@anthropic-ai/sdk`** `^0.78.0` — intent classification only (`claude-3-5-haiku-latest`); artifact content is mock/hardcoded
- **No bundler, no frontend framework** — sidebar webview is intentionally inline HTML/CSS/JS

## Commands

```bash
npm install        # install dependencies
npm run build      # one-time compile (used by launch config)
npm run watch      # incremental compile during development
```

Run the extension: use **`Run ProactiveUI Extension`** launch config (F5) — builds and opens an Extension Development Host. There are no automated tests.

Set API key in the host: Command Palette → `ProactiveUI: Set Anthropic API Key`. Or set `ANTHROPIC_API_KEY` in the environment before launching. Compiled output → `dist/` (gitignored).

## Architecture

### Data flow

1. **`DocumentWatcher`** — listens for newline-after-comment (line trigger) and held selections (selection trigger); debounces per document; calls `IntentAnalyzer`.
2. **`IntentAnalyzer`** — classifies intent via `AnthropicIntentClient` (`claude-3-5-haiku`) if API key present; falls back to `mockIntentAnalyzer` on failure or missing key.
3. **`IntentActionProvider`** — `HoverProvider` storing `IntentSuggestion` per document URI; renders a hover panel of clickable action links firing `proactiveui.runAction`.
4. **`AgentManager`** — executes actions; maintains in-memory `AgentRecord[]`; fires `onDidUpdateAgents` on state changes.
5. **`ArtifactCodeLensProvider`** — renders inline Approve/Undo CodeLens controls above inserted artifact blocks.
6. **`SidebarViewProvider`** — webview panel showing live agent cards; communicates with the host via `postMessage`.
7. **`exportManager`** — triggered by the "Export Results" button in the sidebar; serializes the current `AgentRecord[]` snapshot to JSON (full fields) or TXT (curated: action, status, file+line, origin, summary, thinking) via a format quickpick and save dialog; writes via `vscode.workspace.fs`.

### Key types (`src/types/proactive.ts`)

- `ActionId` — union of 8 IDs: `writeCode`, `detailStep`, `exploreAlternative`, `improveComment`, `fixGrammar`, `rewriteAcademic`, `expandParagraph`, `summarizeUnderstanding`
- `SemanticType` — `goal | step | freeform`
- `AgentRecord` — runtime state of one agent, including `artifactStartLine`/`artifactEndLine` for undo
- `ArtifactState` — `pending | approved | reverted`

### Artifact lifecycle

Artifact actions insert a draft block below the triggering line, delimited by `# --- [ProactiveUI Artifact <id> | pending] ---` (Python) or `% ---` (LaTeX). Approve updates the tag to `approved`; Undo deletes the entire block using stored line numbers.

### Intent analysis split

- **Python** (`.py`): triggers on `#`-prefixed comment lines; actions: `writeCode`, `detailStep`, `exploreAlternative`, `improveComment`
- **LaTeX** (`.tex`): triggers on non-command prose lines; actions: `fixGrammar`, `summarizeUnderstanding` (mock also offers `rewriteAcademic`, `expandParagraph`)
- The Anthropic API is used for intent classification only — artifact content is entirely mock/hardcoded in `AgentManager`

### Architecture decisions

- **Inline HTML webview**: no bundler keeps F5 launch self-contained; a React/Vue setup would require a separate frontend build step unsuitable for a demo prototype.
- **`claude-3-5-haiku` for classification**: intent inference fires on every keypress event — latency matters more than capability; a larger model would cause perceptible hover-panel lag.
- **Mock artifact generation**: decouples the UX demo from LLM reliability and prompt engineering risk; the full approve/undo flow can be demonstrated without any API dependency.

## Conventions

**Adding a new action** requires updating four places in sync:
1. `ActionId` union in `src/types/proactive.ts`
2. All `switch (action.id)` blocks in `AgentManager` (`getWorkingMessage`, `getThinkingStream`, `buildSummary`, `buildFinalOutput`, `buildArtifact`, `isArtifactAction`)
3. `ACTION_BY_ID` map and `allowedActionIds` in `AnthropicIntentClient`
4. `mockIntentAnalyzer` (`analyzeLine` and `analyzeSelection`)

**Mock and live paths are permanent peers.** Both return the same `IntentSuggestion` shape. Mock is always active for users without an API key — treat it as a first-class path.

**State propagation:** `AgentManager` owns state and fires `onDidUpdateAgents`; consumers react to the event — never push state to UI directly.

**Floating promises:** prefix fire-and-forget async calls with `void` (e.g., `void agentManager.runAction(...)`), consistent with existing style inside VS Code event handlers.

**Folder ownership:** `src/core/` — stateful domain logic and stateless utilities (e.g., `agentManager`, `exportManager`); `src/providers/` — VS Code language feature registrations; `src/sidebar/` — webview; `src/llm/` — external API clients; `src/types/` — shared interfaces only.

**No `any`:** TypeScript strict is on; use `unknown` + narrowing or explicit types instead of casting.

**Artifact delimiter format** must stay consistent for undo line-tracking:
- Python: `# --- [ProactiveUI Artifact <timestamp> | pending] ---` / `# --- [/ProactiveUI Artifact] ---`
- LaTeX: same with `%` prefix

## Testing Strategy

**Policy:** no automated tests in scope for this prototype. All validation is manual.

**Pre-demo smoke test** — verify these 5 paths before any demo:
1. Line trigger: type a `#` comment in `demo_plan.py`, press Enter → hover panel appears
2. Selection trigger: select prose in a `.tex` file → hover panel appears with LaTeX actions
3. Concurrent agents: trigger two actions back-to-back → both cards appear and operate independently
4. Artifact approve: click Approve on a pending artifact → delimiter updates, CodeLens changes to "Approved"
5. Artifact undo: click Undo on a pending artifact → block is fully removed from the document

**If live LLM artifact generation is added**, introduce integration tests via the VS Code Extension Test Runner — line-tracking correctness is difficult to catch manually at scale.

## Do's and Don'ts

- **Do** store the API key exclusively via `context.secrets`. Never write it to workspace settings, `.env` files, or any file on disk.
- **Don't** add a frontend build step or JS framework to the sidebar — the inline webview is intentional.
- **Don't** move artifact generation to live LLM calls without rethinking `artifactStartLine`/`artifactEndLine` tracking — streaming output breaks the undo flow.
- **Don't** silently fix the `activationEvents` gap (`onLanguage:python` only) — `.tex` cold-activation is a known prototype scope decision, not a bug.
