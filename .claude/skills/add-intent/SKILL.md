---
name: add-intent
description: Add a new intent action type to the ProactiveUI extension. Guides through all 7 required touch points in sync, with originText-derived artifacts and targeted mock detection.
argument-hint: <actionId> --file-type python|latex --artifact true|false
---

# /add-intent — Add a New Intent Action to ProactiveUI (v2)

You are adding a new `ActionId` to the ProactiveUI VS Code extension. There are **7 required touch points** that must all be updated in sync. Missing any one will cause runtime failures, TypeScript errors, or silent no-ops.

## Before You Start

Ask the user for the following if not provided in the command arguments:

1. **`actionId`** — camelCase identifier (e.g., `generateDocstring`). Must be unique across existing IDs: `writeCode`, `detailStep`, `exploreAlternative`, `improveComment`, `fixGrammar`, `rewriteAcademic`, `expandParagraph`, `summarizeUnderstanding`.
2. **`fileType`** — `python` or `latex`.
3. **`label`** — Human-readable label shown in hover panel and agent card (e.g., `"Generate Docstring"`).
4. **`isArtifact`** — `true` if the action inserts a delimited block into the document; `false` if the result appears only in the sidebar card.
5. **`triggerPattern`** — What text pattern should activate this action in the mock analyzer? For Python: keywords or regex (e.g., `def `, `class `, `return`). For LaTeX: prose markers (e.g., `however`, `in contrast`, `to summarize`). This drives Step 4.
6. **`semanticBucket`** — Which mock bucket: `goal`, `step`, or `freeform`? Use `goal` for high-level intents, `step` for procedural/structural patterns, `freeform` as a last resort.
7. **`description`** — One sentence describing what this action does for the user.

Read `src/types/proactive.ts` and confirm `actionId` is not already in the `ActionId` union before proceeding.

---

## Step 1 — Add to `ActionId` union

**File:** `src/types/proactive.ts`

Add `"<actionId>"` to the `ActionId` union. Keep Python actions grouped before LaTeX actions.

```typescript
export type ActionId =
  | "writeCode"
  | ...existing...
  | "summarizeUnderstanding"
  | "<actionId>";           // ← add here
```

**Constraint:** Do not reorder existing entries.

---

## Step 2 — Add all 6 switch cases in `AgentManager`

**File:** `src/core/agentManager.ts`

Find each switch block by searching for `case "summarizeUnderstanding":` and add a peer case for `"<actionId>"` in all 6.

### 2a. `getWorkingMessage()` — initial status message

```typescript
case "<actionId>":
  return "<Present-tense sentence, e.g. 'Generating a docstring from the function signature...'>";
```

### 2b. `getThinkingStream()` — 3–4 thinking steps, one per 180ms

Write steps that describe reasoning over the *actual triggering text*, not generic placeholders:

```typescript
case "<actionId>":
  return [
    "<Step 1: what the agent identifies in the triggering line/selection>",
    "<Step 2: how it transforms or interprets that content>",
    "<Step 3: what it produces>",
  ];
```

### 2c. `buildSummary()` — one-line past-tense summary

```typescript
case "<actionId>":
  return "<Past-tense summary, e.g. 'Generated a docstring artifact below the function definition.'>";
```

### 2d. `buildFinalOutput()` — result text shown in agent card body

- If `isArtifact = true`: `"<Label> draft inserted as a pending artifact below the target line."`
- If `isArtifact = false`: call the private helper `this.to<ActionId>Output(originText)` — do **not** return a static string. The output must visibly differ based on what `originText` contains.

```typescript
case "<actionId>":
  return agent.isArtifactAction
    ? "<Label> draft inserted as a pending artifact below the target line."
    : this.to<ActionId>Output(originText);
```

### 2e. `buildArtifact()` — content inserted into the document

**Critical:** Artifact content must be derived from `originText`, not a hardcoded template. Existing helpers follow this pattern — study them before writing yours:

| Helper | What it does with `originText` |
|--------|-------------------------------|
| `toGrammarFixedParagraph(originText)` | Strips `%` prefix, capitalizes, adds period |
| `toAcademicRewrite(originText)` | Strips prefix, prepends `"We reformulate this point as follows: "` |
| `toExpandedParagraph(originText)` | Strips prefix, appends an expansion sentence |
| `toRevisedComment(originText)` | Strips `#` prefix, capitalizes |

Add a new private helper following the same pattern (see Step 2f). Then in `buildArtifact()`:

- If `isArtifact = false`: add alongside `exploreAlternative` and `summarizeUnderstanding`:
  ```typescript
  case "<actionId>":
    return undefined;
  ```

- If `isArtifact = true`:
  - Python delimiter: `# --- [ProactiveUI Artifact ${Date.now()} | pending] ---` / `# --- [/ProactiveUI Artifact] ---`
  - LaTeX delimiter: `% --- [ProactiveUI Artifact ${Date.now()} | pending] ---` / `% --- [/ProactiveUI Artifact] ---`

  ```typescript
  case "<actionId>":
    return [
      `# --- [ProactiveUI Artifact ${Date.now()} | pending] ---`,
      this.to<ActionId>Artifact(originText),
      `# --- [/ProactiveUI Artifact] ---`,
    ].join("\n");
  ```

### 2f. Add private helper methods

Add these at the bottom of the `AgentManager` class body, before the closing `}`, alongside existing helpers like `toGrammarFixedParagraph`:

**For artifact content** (if `isArtifact = true`):
```typescript
private to<ActionId>Artifact(originText: string): string {
  // Strip the comment/command prefix for the file type:
  //   Python: originText.replace(/^(\s*#\s*)?/, "").trim()
  //   LaTeX:  originText.replace(/^\s*%+\s?/, "").trim()
  const stripped = originText.replace(/* appropriate regex */, "").trim();

  // Transform the stripped content into a plausible mock output.
  // The result must vary based on what `stripped` contains.
  // For generateDocstring example:
  //   Extract param names from `def foo(a, b):` → produce Args block
  // For simplifyParagraph example:
  //   Shorten multi-clause sentence → return a simplified version
  return stripped
    ? `<transformation of stripped>`
    : "<fallback string if originText was empty>";
}
```

**For non-artifact output** (if `isArtifact = false`):
```typescript
private to<ActionId>Output(originText: string): string {
  const stripped = originText.replace(/* appropriate regex */, "").trim();
  return stripped
    ? `<substantive result referencing stripped>`
    : "<fallback>";
}
```

**Quality bar:** Trigger the action on two different lines. The two artifacts/outputs must look meaningfully different. If they are identical, the helper is too generic — fix it before moving on.

### 2g. `isArtifactAction()` — controls Approve/Undo UI

Current implementation:
```typescript
return action.id !== "exploreAlternative" && action.id !== "summarizeUnderstanding";
```

- If `isArtifact = true`: no change needed — the default returns `true` for new IDs.
- If `isArtifact = false`: add `&& action.id !== "<actionId>"` to the condition.

---

## Step 3 — Register in `AnthropicIntentClient`

**File:** `src/llm/anthropicIntentClient.ts`

Three places to update (v1 only covered two):

### 3a. `ACTION_BY_ID` map

```typescript
"<actionId>": { id: "<actionId>", label: "<Label>" },
```

### 3b. `allowedActionIds` array

- Python: add `"<actionId>"` to the Python array.
- LaTeX: add `"<actionId>"` to the LaTeX array.

### 3c. System prompt string ← new in v2

The system prompt (lines ~49–51) hardcodes which IDs the LLM may return:
```
"For fileType=python use: writeCode, detailStep, exploreAlternative, improveComment."
"For fileType=latex use ONLY: fixGrammar, summarizeUnderstanding."
```

Add `<actionId>` to the appropriate line. If this is skipped, the LLM will never suggest the new action on the live path even though `allowedActionIds` allows it.

---

## Step 4 — Add targeted detection to `mockIntentAnalyzer`

**File:** `src/core/mockIntentAnalyzer.ts`

**Do not only append to the `freeform` bucket.** Adding to `freeform` makes the action appear on every line of that file type, which dilutes relevance and hides the intent-matching logic. Instead, add a dedicated detection predicate.

### 4a. Declare a module-level action constant

At the top of the file alongside `WRITE_CODE`, `FIX_GRAMMAR`, etc.:

```typescript
const <SCREAMING_SNAKE>: SuggestedAction = {
  id: "<actionId>",
  label: "<Label>",
};
```

### 4b. Add a `looksLike<ActionId>()` predicate

At the bottom of the file alongside `looksLikeGoal()`, `looksLikeStep()`, `looksLikeSectionOrClaim()`:

```typescript
function looksLike<ActionId>(text: string): boolean {
  return (
    text.includes("<keyword1>") ||
    text.includes("<keyword2>") ||
    /<regex matching triggerPattern>/i.test(text)
  );
}
```

Use the `triggerPattern` from Before You Start. Reference how existing predicates work:
- `looksLikeStep()` matches `step\s*\d+`, `load`, `clean`, `analyze`, `model`, `plot`, `test`
- `looksLikeSectionOrClaim()` matches `\\section`, `we propose`, `our contribution`, `this paper`

### 4c. Wire into `analyzeLine()` (and `analyzeLatexLine()` for LaTeX)

Insert a new `if` block **before** the `freeform` fallback return, in priority order:

```typescript
// Python — inside analyzeLine() before the freeform return:
if (looksLike<ActionId>(normalized)) {
  return {
    semanticType: "<semanticBucket>",
    actions: [<SCREAMING_SNAKE>, <one or two other relevant actions>],
    source: "line",
    text,
    range,
  };
}

// LaTeX — inside analyzeLatexLine() before the freeform return:
if (looksLike<ActionId>(normalized)) {
  return {
    semanticType: "<semanticBucket>",
    actions: [<SCREAMING_SNAKE>, <one or two other relevant actions>],
    source: "line",
    text,
    range,
  };
}
```

**Note:** `analyzeSelection()` delegates to `analyzeLine()`, so no separate change is needed unless the action should only appear for selections.

**Constraint:** No bucket may surface more than 4 actions. If adding your block pushes one over 4, drop the weakest-fit existing action from that bucket only.

---

## Step 5 — Verify TypeScript compiles

```bash
npm run build
```

Common failure modes after adding a new `ActionId`:
- **Exhaustiveness:** A switch elsewhere treats `ActionId` as exhaustive — grep for `ActionId` across `src/` and handle the new case.
- **Missing return:** If a switch arm has no `return`, TypeScript may infer `undefined` and break the method signature.
- **Missing helper:** If `this.to<ActionId>Artifact()` is referenced in `buildArtifact()` but not defined as a private method, TypeScript errors at the call site.

---

## Step 6 — Manual smoke test

Verify in the Extension Development Host (F5):

1. **Trigger specificity:** Write a line that matches `triggerPattern` → hover panel shows `"<Label>"`. Write a line that does NOT match → `"<Label>"` does not appear.
2. **Agent card content:** Click the action. Thinking steps and summary must reference the actual triggered text, not be generic.
3. **Artifact varies by input (if isArtifact):** Trigger the action on two different lines. The two inserted artifact bodies must be visibly different. If they are identical, the helper in Step 2f is too generic.
4. **Approve flow:** Delimiter updates from `| pending` to `| approved`, CodeLens changes.
5. **Undo flow:** Entire artifact block is removed with no leftover lines.
6. **Export:** TXT and JSON exports include the new action's records with correct `originText` preserved.

---

## Constraints and Rules

- **No `any` types.** Use `unknown` + narrowing or explicit types.
- **All 6 switch blocks in `agentManager.ts` must be updated together.** Partial update silently produces wrong output — no TypeScript error will warn you.
- **Artifact content must use `originText`.** Two different triggering lines must produce two different artifact bodies. A helper that ignores `originText` fails the smoke test.
- **Artifact delimiters are load-bearing.** The undo flow matches delimiters by exact string. Never change the format — only the content between delimiters.
- **Mock detection must be specific.** Adding only to `freeform` surfaces the action on every line. Add a `looksLike<X>()` predicate and a dedicated `if` block.
- **System prompt must list the new `actionId`.** `allowedActionIds` alone is not enough — the system prompt tells the LLM which IDs to return. Both must be updated.
- **Do not add a frontend build step.** The sidebar webview is intentionally inline HTML/CSS/JS.
- **Mock and live paths are permanent peers.** The mock must always surface the new action.
- **Never store or log the API key.** It lives exclusively in `context.secrets`.
- **Do not touch `activationEvents` in `package.json`** unless explicitly asked — the `.tex` cold-activation gap is a known accepted limitation.

---

## Expected Output

Confirm all of the following before marking done:

- [ ] `ActionId` union updated in `src/types/proactive.ts`
- [ ] All 6 switch blocks updated in `src/core/agentManager.ts`
  - `getWorkingMessage`, `getThinkingStream`, `buildSummary`, `buildFinalOutput`, `buildArtifact`, `isArtifactAction`
- [ ] Private helper(s) added to `AgentManager`: `to<ActionId>Artifact()` and/or `to<ActionId>Output()`
- [ ] `ACTION_BY_ID`, `allowedActionIds`, **and system prompt** updated in `src/llm/anthropicIntentClient.ts`
- [ ] `looksLike<ActionId>()` predicate added in `src/core/mockIntentAnalyzer.ts`
- [ ] New action constant declared and wired into the correct semantic `if` block (not only `freeform`)
- [ ] `npm run build` passes with no errors
- [ ] Smoke test step 3 verified: two different triggering lines produce two visibly different artifact bodies

If any step was skipped or deferred, state why and what the user needs to do to complete it.

---

## v1 → v2 Changelog

| Problem found in testing | v1 behavior | v2 fix |
|--------------------------|-------------|--------|
| `buildArtifact` ignored `originText` | Inserted a hardcoded generic template regardless of triggering text | Step 2e/2f now requires a `to<ActionId>Artifact(originText)` private helper that transforms the actual content; smoke test step 3 explicitly verifies two triggers produce different output |
| Mock only added to `freeform` bucket | New action surfaced on every line of the file type, diluting relevance | Step 4 now requires a `looksLike<ActionId>()` predicate and a dedicated `if` block before the freeform fallback |
| No test for output variation | Artifact quality was assumed, not verified | Smoke test step 3 is now a required check: trigger on two lines, confirm bodies differ |
| System prompt not updated | `allowedActionIds` was updated but the system prompt still listed old IDs, so the LLM never suggested the new action | Step 3c is now an explicit sub-step: update the `"For fileType=X use:"` line in the system prompt string |
| Text helpers too naive | `buildFinalOutput` for non-artifact actions returned a static string with no reference to `originText` | Step 2d now requires a `to<ActionId>Output(originText)` helper for non-artifact actions, parallel to the artifact helper |
