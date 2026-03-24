# Product Requirements Document

**Product:** ProactiveUI: Intent-Aware Writing and Analysis Co-Pilot
**Team:** Zhiping Zhang, Qiushi Liang
**Status:** Research Prototype

---

## 1. Problem Statement

AI writing and coding tools are predominantly chat-first. Users must leave their document, describe their intent in a chat window, copy the result, and paste it back. This creates unnecessary context switching and friction — especially for iterative work like data analysis planning or academic writing, where the user's intent is already expressed inline as comments or prose.

ProactiveUI's thesis: the document is the interface. Actions should come to the user, not the other way around.

---

## 2. Goals

- Infer user intent from in-document text (plan comments, selected passages) without requiring explicit prompting.
- Surface relevant AI actions at the point of writing, inside the editor.
- Write generated output back into the same document with explicit approval/undo controls, preserving user agency.
- Support concurrent actions with per-agent visibility into thinking and status.
- Keep credentials secure and the workflow contained to the editor.

---

## 3. Non-Goals

- Not a general-purpose chat assistant or code completion tool — intent detection is scoped to plan comments and prose, not all code.
- Not targeting languages beyond Python and LaTeX in this prototype — adding a new language is a deliberate scope expansion, not a bug fix.
- No collaborative or multi-user editing support.
- No persistent agent history across editor sessions.

---

## 4. Success Metrics

| # | Metric | Target |
|---|--------|--------|
| 1 | Intent classification relevance | Suggested actions are contextually appropriate for the triggering line/selection in ≥80% of demo file cases |
| 2 | Full flow completion | A first-time user can open `demo_plan.py`, trigger an action, and approve an artifact without assistance |
| 3 | Artifact correctness | Approve and Undo both leave the document in a clean, valid state 100% of the time |
| 4 | Concurrent agent stability | Running 3+ agents simultaneously produces no UI inconsistency or document corruption |
| 5 | API key security | The API key is never written to any file on disk, confirmed by code review |

---

## 5. Users

| User | Context | Primary Need |
|------|---------|--------------|
| Data analyst | Writing analysis plans in `.py` files | Move from plan comment to executable code without leaving the editor |
| Academic writer | Drafting or revising `.tex` files | Improve clarity and grammar while preserving argument flow |
| Careful reviewer | Reviewing AI-generated output | Approve or reject artifacts in-editor before they become permanent |

---

## 6. User Stories

**US-1 — Plan comment to action (data analyst)**
As a data analyst, I want to write a plan comment and get immediate relevant actions, so I can move from intention to executable code faster.

*Acceptance criteria:*
- Given a Python file is open and I press Enter after a `#`-prefixed comment, a hover panel appears on the completed line within 1 second.
- The hover panel offers at least one action appropriate to the comment's content (e.g., `Write Code` for a step-like comment).
- Clicking the action launches an agent card in the sidebar without requiring any additional input.

---

**US-2 — Selection-based writing actions (academic writer)**
As a writer, I want to select a paragraph and trigger "Reflect Understanding" or "Fix Grammar," so I can improve clarity while preserving flow.

*Acceptance criteria:*
- Given a `.tex` file is open and I make a non-empty text selection, a hover panel appears with at least `Fix Grammar` and `Reflect Understanding` options.
- Triggering either action produces an output that references the selected text.
- For `Fix Grammar`, a corrected artifact is inserted below the selection. For `Reflect Understanding`, a summary result appears in the agent card without modifying the document.

---

**US-3 — Concurrent agent visibility**
As a user running multiple tasks, I want one agent card per action with thinking and summary, so I can track what each agent is doing.

*Acceptance criteria:*
- Each triggered action creates exactly one new agent card in the sidebar.
- While an action is processing, the card shows a live thinking log with sequential steps.
- Once complete, the card shows a summary and the appropriate approve/undo/dismiss controls.
- Cards for multiple concurrent agents are all visible and independently operable.

---

**US-4 — In-editor artifact approval (careful reviewer)**
As a careful reviewer, I want to approve or undo generated artifacts in-editor, so I can keep control over document quality.

*Acceptance criteria:*
- For artifact-type actions, a draft block is inserted into the document immediately below the triggering line, clearly delimited and marked `pending`.
- Both the sidebar agent card and inline CodeLens controls offer Approve and Undo.
- Approving updates the delimiter marker to `approved` and leaves the content in place.
- Undoing removes the entire artifact block, restoring the document to its pre-action state.
- After either action, the controls update to reflect the new state (no stale buttons).

---

**US-5 — Jump to source from agent card**
As a user with many concurrent agents, I want to click an agent card and jump to its source comment, so I can quickly map outputs back to origin.

*Acceptance criteria:*
- Clicking anywhere on an agent card (not a button) scrolls the editor to the line that triggered the action and selects it.
- If the source document is not currently visible, the click does nothing (does not open a new tab).
- The clicked card is visually highlighted as active.

---

**US-6 — Secure API key storage**
As a privacy-conscious user, I want API keys stored securely in editor secret storage, so my credentials are not exposed in project files.

*Acceptance criteria:*
- Running `ProactiveUI: Set Anthropic API Key` from the Command Palette stores the key in VS Code Secret Storage, not in any file.
- The key is never logged, displayed in plaintext, or written to workspace/user settings.
- Running `ProactiveUI: Clear Anthropic API Key` fully removes it.
- If no key is set, the extension falls back to mock intent analysis silently — no error or prompt is shown to the user unprompted.

**US-7 — Export scan results**
As a researcher reviewing session results, I want to export all agent scan results to a file, so I can save and share the session's outputs outside the editor.

*Acceptance criteria:*
- Given agents are visible in the sidebar, clicking **Export Results** prompts for a format (JSON or TXT) via a VS Code quick pick.
- A save dialog appears with a default filename that includes a timestamp (e.g., `proactiveui-results-<timestamp>.json`).
- The exported JSON contains all `AgentRecord` fields for every agent in the current session.
- The exported TXT contains curated fields per agent: action label, status, file + line number, origin text, summary, and numbered thinking steps.
- If no agents are present, an informational message is shown and no dialog is opened.

---

## 7. User Flow

### Flow A — Line-triggered action (Python)

```
1. User opens a .py file.
2. User types a plan comment (e.g., "# Step 1: load and clean the dataset") and presses Enter.
3. Extension detects the completed comment line and runs intent analysis.
4. A hover panel appears over the line with 2–4 action links (e.g., Write Code, Detail Step).
5. User hovers over the line and clicks an action.
6. The ProactiveUI sidebar opens. A new agent card appears with status "thinking" and a live log.
7. A draft code block is inserted below the comment, marked "pending," with CodeLens controls above it.
8. The agent card updates to "awaiting approval" with Approve and Undo buttons.
9a. User clicks Approve → delimiter updates to "approved," card status updates.
9b. User clicks Undo → draft block is deleted, card status updates to "reverted."
10. User can Dismiss the card from the sidebar at any time.
```

### Flow B — Selection-triggered action (LaTeX)

```
1. User opens a .tex file.
2. User selects one or more lines of prose.
3. After ~180ms, intent analysis runs on the selected text.
4. A hover panel appears with LaTeX-appropriate actions (Fix Grammar, Reflect Understanding, etc.).
5. User clicks an action.
6. A new agent card appears in the sidebar with status "thinking."
7a. For artifact actions (Fix Grammar): a corrected draft is inserted below the selection.
    → Approve/Undo flow as in Flow A steps 8–9.
7b. For result-only actions (Reflect Understanding): no document insertion occurs.
    → The card shows the reflection text and an Approve button to acknowledge.
```

---

## 8. Feature Requirements

### 8.1 Intent Detection

- The extension must watch all open `.py` files and `.tex` files for qualifying edits and selections.
- **Line trigger:** fires when the user inserts a newline after a line that passes the interest filter (Python: non-empty `#` comment; LaTeX: non-empty line that is not a bare LaTeX command).
- **Selection trigger:** fires 180ms after a non-empty selection stabilizes; debounced per document.
- Analysis must be versioned per document so that a stale result from a cancelled analysis is never published.
- If an API key is available, intent must be classified via the Anthropic API. On any failure or missing key, the mock classifier must be used transparently.

### 8.2 Action Suggestions

- The hover panel must appear at the triggering line/selection range, not at the cursor's current position.
- Actions shown must be restricted to the file type: Python actions for `.py`, LaTeX actions for `.tex`.
- The panel must show 2–4 actions. Each action must be a single clickable link that fires immediately with no confirmation dialog.

**Python actions:**

| Action | Trigger condition | Output |
|--------|------------------|--------|
| Write Code | Step-like or freeform comment | Artifact: code block inserted below comment |
| Detail Step | Step-like comment | Artifact: expanded plan comment block |
| Explore Alternative | Goal or step comment | Result: alternative approach text in card |
| Revise | Any comment | Artifact: rewritten comment |

**LaTeX actions:**

| Action | Trigger condition | Output |
|--------|------------------|--------|
| Fix Grammar | Any prose line or selection | Artifact: grammar-corrected text block |
| Rewrite Academic | Freeform prose | Artifact: academically rewritten block |
| Expand Paragraph | Freeform prose | Artifact: expanded paragraph block |
| Reflect Understanding | Any selection or goal-like line | Result: understanding summary in card |

### 8.3 Agent Cards

- Each action invocation creates one `AgentRecord` with a unique ID.
- Cards must display: action label, status, origin text, thinking log, summary (when available), and context-sensitive controls.
- Status transitions: `thinking` → `awaiting_approval` → `approved` or `reverted`.
- Controls must update immediately on state change with no stale buttons remaining visible.
- Cards must be ordered newest-first.
- Clicking a card (not a button) must focus the editor at the source line if the document is already open.

### 8.4 Artifact Lifecycle

- Artifact blocks must be inserted directly below the line that triggered the action.
- The opening delimiter must include a unique artifact ID and state tag (`pending`).
- On Approve: the state tag in the opening delimiter is updated to `approved`; content is unchanged.
- On Undo: the entire artifact block (opening delimiter through closing delimiter, inclusive) is deleted.
- Both Approve and Undo must be available from the sidebar card and as inline CodeLens buttons above the artifact's first line.
- After Undo, the CodeLens buttons must disappear from the document.

### 8.5 API Key Management

- Keys must be stored exclusively via VS Code Secret Storage (`context.secrets`).
- Keys must never appear in logs, settings files, `.env` files, or any other file on disk.
- `ProactiveUI: Set Anthropic API Key` — stores or overwrites the key; input field must be password-masked.
- `ProactiveUI: Clear Anthropic API Key` — deletes the stored key.
- If no key is present, the extension falls back to mock classification silently.

### 8.6 Export

- Entry point: "Export Results" button at the top of the sidebar panel; no command palette entry.
- Clicking Export shows a VS Code quick pick with two options: **JSON** and **TXT**.
- A save dialog follows with a timestamped default filename (`proactiveui-results-<timestamp>.json` or `.txt`).
- **JSON format**: full `AgentRecord[]` serialized via `JSON.stringify` — all fields included.
- **TXT format**: one block per agent with curated fields (action label, status, file + line, origin, summary, numbered thinking steps); blocks separated by `---` dividers.
- Empty state: if `AgentManager.list()` returns an empty array, show an informational message and skip the dialogs.
- File write via `vscode.workspace.fs.writeFile` — no Node.js `fs` dependency.
- Implementation: `src/core/exportManager.ts` (serialization logic); `src/sidebar/sidebarViewProvider.ts` (button + message handler).

---

## 9. Limitations

### Accepted Tradeoffs

| Limitation | Rationale |
|-----------|-----------|
| Artifact content is rule-based/hardcoded, not LLM-generated | Keeps the demo stable and predictable; live artifact generation is deferred |
| Agent state is in-memory only; lost on editor close | Acceptable for a prototype demo; persistence adds complexity with little demo value |
| Sidebar UI is inline HTML/CSS/JS with no frontend framework | Intentional — keeps the extension self-contained and eliminates a build step |

### Deferred

| Limitation | Notes |
|-----------|-------|
| Live LLM-generated artifact content | Requires rethinking `artifactStartLine`/`artifactEndLine` tracking for streaming output |
| `.tex` cold-activation | `activationEvents` only covers `onLanguage:python`; LaTeX works only if the file is already open. Fix requires adding `onLanguage:latex` to `package.json` |
| Extension packaging (`.vsix`) | Not needed for prototype demo; required before any broader distribution |

### Active Risks

| Limitation | Risk |
|-----------|------|
| Line-shift bug: edits above an artifact after insertion invalidate its undo range | Could corrupt the document if a user edits above an artifact before undoing it. Mitigation: document this clearly in the demo flow; avoid editing above pending artifacts |
| Multiple artifacts in the same document share no ordering coordination | Approving/undoing overlapping artifacts in the wrong order may produce unexpected results |

---

## 10. Open Questions

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| 1 | Should the `.tex` cold-activation bug be fixed before the final demo, or is it acceptable to pre-open demo files? | Team | High |
| 2 | Is live LLM-generated artifact content a hard requirement for the demo, or is hardcoded output sufficient to demonstrate the UX concept? | Team | High |
| 3 | Should `rewriteAcademic` and `expandParagraph` be surfaced via the Anthropic classifier, or only via mock? (Currently only `fixGrammar` and `summarizeUnderstanding` are in the classifier's allowed set for LaTeX.) | Team | Medium |
| 4 | Is there a target number of concurrent agents the demo should support without degradation? | Team | Low |
| 5 | Should dismissed agents be recoverable within the same session, or is dismiss permanent? | Team | Low |

---

## 11. Demo Scenario

The canonical demo that all features and acceptance criteria should be validated against:

1. Open `examples/demo_plan.py` in VS Code/Cursor.
2. Launch the extension via `Run ProactiveUI Extension` (F5).
3. Run `ProactiveUI: Set Anthropic API Key` from the Command Palette.
4. Type a new plan comment (e.g., `# Step 2: run correlation analysis`) and press Enter.
5. Hover over the line — confirm the action panel appears with relevant options.
6. Click **Write Code** — confirm a pending artifact is inserted and an agent card appears.
7. Click **Detail Step** on a second comment — confirm a second agent card appears concurrently.
8. Approve the first artifact via CodeLens — confirm the delimiter updates and the button changes.
9. Undo the second artifact via the sidebar card — confirm the block is fully removed.
10. Click an agent card — confirm the editor scrolls to the source line.
11. Open `examples/6-discussion copy.tex`, select a passage, and trigger **Fix Grammar**.
12. Confirm a corrected artifact is inserted and the full approve/undo flow works in LaTeX.
13. Click **Export Results** in the sidebar → select JSON → save file → confirm the exported file contains all agent records from the session.
