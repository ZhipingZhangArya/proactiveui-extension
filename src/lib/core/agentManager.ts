import type { ActionId, FileLanguage } from "@/types/proactive";

/**
 * Framework-agnostic agent content generation.
 *
 * Given an action and its origin text (the line/selection that triggered
 * it), produce three things:
 *  - `thinking`: a sequence of status-log strings the UI replays to give
 *    the agent card its "working" animation.
 *  - `summary`: a short text shown on the card once the agent finishes.
 *  - `artifact`: for artifact actions, a delimited text block to splice
 *    into the editor. `undefined` for non-artifact actions.
 *
 * All content is rule-based / template-based for now — we prioritise
 * deterministic demo output over live generation. Live LLM generation
 * would replace `buildArtifactContent` and `buildSummary` but keep the
 * same signatures so the caller doesn't care.
 */

export const ARTIFACT_ACTIONS: ReadonlySet<ActionId> = new Set<ActionId>([
  "writeCode",
  "detailStep",
  "improveComment",
  "fixGrammar",
  "rewriteAcademic",
  "expandParagraph",
]);

export const RESULT_ACTIONS: ReadonlySet<ActionId> = new Set<ActionId>([
  "exploreAlternative",
  "summarizeUnderstanding",
]);

export function isArtifactAction(actionId: ActionId): boolean {
  return ARTIFACT_ACTIONS.has(actionId);
}

export function buildThinking(
  actionId: ActionId,
  originText: string,
): string[] {
  const stripped = originText.trim().slice(0, 60);
  switch (actionId) {
    case "writeCode":
      return [
        `Parsing plan comment: "${stripped}"`,
        "Selecting idiomatic pandas / sklearn pattern",
        "Drafting code with sensible defaults",
        "Finalising code block",
      ];
    case "detailStep":
      return [
        `Reading step: "${stripped}"`,
        "Breaking into 3-5 sub-steps",
        "Formatting as indented comment block",
      ];
    case "improveComment":
      return [
        `Reviewing comment: "${stripped}"`,
        "Tightening wording",
        "Producing revised comment",
      ];
    case "exploreAlternative":
      return [
        `Considering: "${stripped}"`,
        "Searching for two or three viable alternatives",
        "Summarising trade-offs",
      ];
    case "fixGrammar":
      return [
        "Scanning selection for grammar issues",
        "Preserving academic tone",
        "Producing corrected version",
      ];
    case "rewriteAcademic":
      return [
        "Analysing voice and register",
        "Rewriting with passive / academic conventions",
        "Checking the rewrite against the original meaning",
      ];
    case "expandParagraph":
      return [
        "Identifying undersupported claims",
        "Drafting expanded paragraph with 2-3 more sentences",
        "Verifying logical flow",
      ];
    case "summarizeUnderstanding":
      return [
        `Re-reading selection (${stripped.length} chars)`,
        "Extracting author's main claim",
        "Phrasing summary in reviewer's own words",
      ];
  }
}

export function buildSummary(actionId: ActionId, originText: string): string {
  const snippet = originText.trim().slice(0, 80);
  switch (actionId) {
    case "exploreAlternative":
      return `Two alternatives considered for "${snippet}": (A) chain of small transforms, (B) one vectorised pass. Option B is usually faster but less debuggable — pick A for early exploration.`;
    case "summarizeUnderstanding":
      return `In plain language: the selected passage argues that the chosen approach generalises beyond the specific dataset used for evaluation. This is the key claim the paper rests on.`;
    case "writeCode":
      return "Code block ready for review below the comment.";
    case "detailStep":
      return "Expanded step inserted below the original comment.";
    case "improveComment":
      return "Revised comment inserted below the original.";
    case "fixGrammar":
      return "Grammar-corrected version inserted below the selection.";
    case "rewriteAcademic":
      return "Academic rewrite inserted below the selection.";
    case "expandParagraph":
      return "Expanded paragraph inserted below the selection.";
  }
}

export interface ArtifactContent {
  /** The opening delimiter line with placeholder `pending` state. */
  opening: string;
  /** The artifact body (multi-line). */
  body: string;
  /** The closing delimiter line. */
  closing: string;
  /** Full block joined with newlines, ready to insert. */
  full: string;
}

/**
 * Build an artifact block for an action. Returns `undefined` for
 * result-only actions.
 *
 * `agentId` is embedded in the delimiter so approve/undo can find the
 * block later. `language` determines the comment syntax (Python `#` or
 * LaTeX `%`).
 */
export function buildArtifactContent(
  actionId: ActionId,
  originText: string,
  agentId: string,
  language: FileLanguage,
): ArtifactContent | undefined {
  if (!isArtifactAction(actionId)) return undefined;

  const comment = language === "python" ? "#" : "%";
  const opening = `${comment} --- [ProactiveUI Artifact ${agentId} | pending] ---`;
  const closing = `${comment} --- [End ProactiveUI Artifact ${agentId}] ---`;
  const body = buildArtifactBody(actionId, originText, language);
  const full = [opening, body, closing].join("\n");
  return { opening, body, closing, full };
}

function buildArtifactBody(
  actionId: ActionId,
  originText: string,
  language: FileLanguage,
): string {
  const snippet = originText.trim().replace(/^#\s*/, "").slice(0, 100);

  if (language === "python") {
    switch (actionId) {
      case "writeCode":
        return [
          "import pandas as pd",
          "",
          `# TODO: ${snippet}`,
          "df = pd.read_csv('data.csv')",
          "df = df.dropna()",
        ].join("\n");
      case "detailStep":
        return [
          `# ${snippet}`,
          `#   1. Load data from source`,
          `#   2. Validate schema and types`,
          `#   3. Handle missing values`,
          `#   4. Persist cleaned dataset`,
        ].join("\n");
      case "improveComment":
        return `# ${snippet.charAt(0).toUpperCase() + snippet.slice(1)}`;
      default:
        return `# ${snippet}`;
    }
  }

  // LaTeX
  switch (actionId) {
    case "fixGrammar":
      return snippet.replace(/\s+/g, " ").trim() + ".";
    case "rewriteAcademic":
      return `In this work, we ${snippet.replace(/^we\s+/i, "").toLowerCase()}.`;
    case "expandParagraph":
      return [
        snippet,
        "This approach is motivated by two observations.",
        "First, empirical results on the benchmark dataset align with our hypothesis.",
        "Second, the computational overhead remains tractable at scale.",
      ].join(" ");
    default:
      return snippet;
  }
}

/** Delimiter patterns so callers can find an artifact in editor text. */
export function artifactDelimiters(agentId: string): {
  opening: RegExp;
  closing: RegExp;
} {
  // Match any `#` or `%` prefix so the same regex works for Python and LaTeX.
  return {
    opening: new RegExp(
      `[#%]\\s*---\\s*\\[ProactiveUI Artifact ${agentId}\\s*\\|\\s*(pending|approved|reverted)\\]\\s*---`,
    ),
    closing: new RegExp(
      `[#%]\\s*---\\s*\\[End ProactiveUI Artifact ${agentId}\\]\\s*---`,
    ),
  };
}
