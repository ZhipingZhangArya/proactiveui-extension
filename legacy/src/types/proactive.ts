import * as vscode from "vscode";

export type SemanticType = "goal" | "step" | "freeform";

export type ActionId =
  | "writeCode"
  | "detailStep"
  | "exploreAlternative"
  | "improveComment"
  | "fixGrammar"
  | "rewriteAcademic"
  | "expandParagraph"
  | "summarizeUnderstanding";

export interface SuggestedAction {
  id: ActionId;
  label: string;
}

export interface IntentSuggestion {
  semanticType: SemanticType;
  actions: SuggestedAction[];
  source: "line" | "selection";
  text: string;
  range: vscode.Range;
}

export type AgentStatus = "thinking" | "awaiting_approval" | "done" | "approved" | "reverted";
export type ArtifactState = "pending" | "approved" | "reverted";

export interface AgentRecord {
  id: string;
  action: SuggestedAction;
  status: AgentStatus;
  createdAt: number;
  docUri: string;
  insertionLine: number;
  originText: string;
  output: string;
  summary?: string;
  thinking: string[];
  isArtifactAction: boolean;
  artifact?: string;
  artifactState?: ArtifactState;
  artifactStartLine?: number;
  artifactEndLine?: number;
}
