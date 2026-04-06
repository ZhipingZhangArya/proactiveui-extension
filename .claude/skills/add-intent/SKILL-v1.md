---
name: add-intent
description: Add a new intent action type to the ProactiveUI extension. Guides through all required touch points in sync.
usage: /add-intent <actionId> [--file-type python|latex] [--artifact true|false]
examples:
  - /add-intent summarizeCode --file-type python --artifact false
  - /add-intent refactorSection --file-type latex --artifact true
  - /add-intent benchmarkPlan --file-type python --artifact true
---

# /add-intent — Add a New Intent Action to ProactiveUI

You are adding a new `ActionId` to the ProactiveUI VS Code extension. There are **6 required touch points** that must all be updated in sync. Missing any one will cause runtime failures, TypeScript errors, or silent no-ops.

## Before You Start

Ask the user for the following if not provided in the command arguments:

1. **`actionId`** — camelCase identifier (e.g., `summarizeCode`). Must be unique across existing IDs: `writeCode`, `detailStep`, `exploreAlternative`, `improveComment`, `fixGrammar`, `rewriteAcademic`, `expandParagraph`, `summarizeUnderstanding`.
2. **`fileType`** — `python` or `latex`. Determines which hover panel shows the action and which trigger rules apply.
3. **`label`** — Human-readable action label shown in hover panel and agent card (e.g., `"Summarize Code"`).
4. **`isArtifact`** — `true` if the action inserts a delimited block into the document; `false` if result is shown only in the sidebar card.
5. **`description`** — One sentence describing what this action does for the user.

Read `src/types/proactive.ts` and confirm `actionId` is not already in the `ActionId` union before proceeding.

---

## Step 1 — Add to `ActionId` union

**File:** `src/types/proactive.ts`

Add `"<actionId>"` to the `ActionId` union type. Keep Python actions grouped before LaTeX actions to match existing ordering.

```typescript
// Before
export type ActionId =
  | "writeCode"
  | ...existing...
  | "summarizeUnderstanding";

// After
export type ActionId =
  | "writeCode"
  | ...existing...
  | "summarizeUnderstanding"
  | "<actionId>";           // ← add here
```

**Constraint:** Do not reorder existing entries — the ordering is referenced in comments elsewhere.

---

## Step 2 — Add all 6 switch cases in `AgentManager`

**File:** `src/core/agentManager.ts`

There are 6 switch blocks that all must handle every `ActionId`. Find each one by searching for any existing `case "summarizeUnderstanding":` and add a peer case for `"<actionId>"` in each block.

### 2a. `getWorkingMessage()` — initial thinking message shown while agent starts

```typescript
case "<actionId>":
  return "<Present-tense sentence describing what the agent is doing, e.g.: 'Summarizing the code logic into plain language...'>";
```

### 2b. `getThinkingStream()` — array of 3–4 thinking step strings, shown one-per-180ms

```typescript
case "<actionId>":
  return [
    "<Step 1: what the agent reads or identifies>",
    "<Step 2: what it computes or transforms>",
    "<Step 3: what it produces or finalizes>",
  ];
```

### 2c. `buildSummary()` — one-line past-tense summary shown in finished agent card

```typescript
case "<actionId>":
  return "<Past-tense sentence describing what was produced, e.g.: 'Generated a plain-language summary of the code block.'>";
```

### 2d. `buildFinalOutput()` — detailed result text shown in agent card body

- If `isArtifact`: `"<ActionLabel> draft inserted as a pending artifact below the target line."`
- If not artifact: return the substantive result text inline (e.g., a reflection or analysis string)

```typescript
case "<actionId>":
  return "<Result description or content string>";
```

### 2e. `buildArtifact()` — document content to insert, or `undefined`

- If `isArtifact = false`: add `case "<actionId>": return undefined;` in the non-artifact branch (alongside `exploreAlternative` and `summarizeUnderstanding`).
- If `isArtifact = true`:
  - Python: wrap content in `# --- [ProactiveUI Artifact ${id} | pending] ---` / `# --- [/ProactiveUI Artifact] ---`
  - LaTeX: use `% ---` prefix instead of `# ---`
  - Content should be plausible mock output relevant to the action

```typescript
case "<actionId>": {
  const id = Date.now();
  // Python example:
  return [
    `# --- [ProactiveUI Artifact ${id} | pending] ---`,
    `# <mock artifact content line 1>`,
    `# <mock artifact content line 2>`,
    `# --- [/ProactiveUI Artifact] ---`,
  ].join("\n");
}
```

### 2f. `isArtifactAction()` — returns boolean controlling Approve/Undo UI

- If `isArtifact = true`: ensure the method returns `true` for `"<actionId>"` (it returns `true` by default for unhandled cases — verify the logic and add explicitly if needed).
- If `isArtifact = false`: add `"<actionId>"` to the set of IDs that return `false`, alongside `"exploreAlternative"` and `"summarizeUnderstanding"`.

---

## Step 3 — Register in `AnthropicIntentClient`

**File:** `src/llm/anthropicIntentClient.ts`

There are two places to update:

### 3a. `ACTION_BY_ID` map — maps string → `SuggestedAction`

Add an entry:
```typescript
"<actionId>": { id: "<actionId>", label: "<Label>" },
```

### 3b. `allowedActionIds` filter — controls which actions the LLM may suggest

- If `fileType = python`: add `"<actionId>"` to the Python array.
- If `fileType = latex`: add `"<actionId>"` to the LaTeX array.

**Constraint:** The LLM prompt lists valid action IDs. After updating `allowedActionIds`, verify the system prompt in this file still accurately describes the action set — update it if needed.

---

## Step 4 — Add to `mockIntentAnalyzer`

**File:** `src/core/mockIntentAnalyzer.ts`

The mock analyzer must surface the new action so users without an API key see it.

### 4a. `analyzeLine()` — line-triggered mock classification

Find the section for the correct `fileType`. Add `"<actionId>"` to the `actions` array of whichever semantic bucket fits best (`goal`, `step`, or `freeform`). If it fits multiple, add it to `freeform` as the catch-all.

### 4b. `analyzeSelection()` — selection-triggered mock classification

Same as above — find the `fileType` section and add to the appropriate bucket.

**Constraint:** The mock must never surface more than 4 actions total in any single classification result. If adding this action would push a bucket over 4, remove the weakest-fit existing action from that bucket (not from the other buckets).

---

## Step 5 — Verify TypeScript compiles

Run:
```bash
npm run build
```

Fix any TypeScript errors before proceeding. Common issues:
- Missing `case` in a switch that has `no-fallthrough` linting — add `break` or `return`
- `ActionId` type used in a non-exhaustive check elsewhere — search for `ActionId` across `src/` and handle any new compile errors

---

## Step 6 — Manual smoke test

Verify these paths work in the Extension Development Host (F5):

1. **Mock path (no API key):** Open a `.py` or `.tex` file, trigger the hover panel, confirm `"<Label>"` appears.
2. **Agent card:** Click the action, confirm a card appears with correct label, thinking steps, and summary.
3. **If artifact:** Confirm a delimited block is inserted below the trigger line with `| pending` tag.
4. **Approve:** Click Approve — confirm delimiter updates to `| approved`, CodeLens changes.
5. **Undo:** Trigger a second instance, click Undo — confirm the entire block is removed cleanly.
6. **Export:** Export to TXT and JSON — confirm the new action's records appear with correct fields.

---

## Constraints and Rules

- **No `any` types.** Use `unknown` + narrowing if the type is not obvious.
- **All 6 switch blocks in `agentManager.ts` must be updated together.** A partial update causes the `default` branch to silently produce wrong output with no TypeScript error.
- **Artifact delimiters are load-bearing.** The undo flow parses delimiter lines by exact string match. Never change the delimiter format — only the content between delimiters.
- **Do not add a frontend build step.** The sidebar webview is intentionally inline HTML/CSS/JS.
- **Mock and live paths are permanent peers.** The mock must always surface the new action, even after the live path is wired up.
- **Never store or log the API key.** It lives exclusively in `context.secrets`.
- **Do not touch `activationEvents` in `package.json`** unless explicitly asked — the `.tex` cold-activation gap is a known accepted limitation.

---

## Expected Output

After completing all steps, confirm to the user:

- [ ] `ActionId` union updated in `src/types/proactive.ts`
- [ ] All 6 switch blocks updated in `src/core/agentManager.ts`
  - `getWorkingMessage`, `getThinkingStream`, `buildSummary`, `buildFinalOutput`, `buildArtifact`, `isArtifactAction`
- [ ] `ACTION_BY_ID` and `allowedActionIds` updated in `src/llm/anthropicIntentClient.ts`
- [ ] `analyzeLine` and `analyzeSelection` updated in `src/core/mockIntentAnalyzer.ts`
- [ ] `npm run build` passes with no errors
- [ ] Smoke test paths verified (list which were tested and their results)

If any step was skipped or deferred, state why and what the user needs to do to complete it.
