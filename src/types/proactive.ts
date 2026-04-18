export type SemanticType = "goal" | "step" | "freeform";

export type FileLanguage = "python" | "latex";

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

export interface TextRange {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
}

export interface IntentSuggestion {
  semanticType: SemanticType;
  actions: SuggestedAction[];
  source: "line" | "selection";
  text: string;
  range: TextRange;
}

export type AgentStatus =
  | "thinking"
  | "awaiting_approval"
  | "done"
  | "approved"
  | "reverted";

export type ArtifactState = "pending" | "approved" | "reverted";

export interface AgentRecord {
  id: string;
  action: SuggestedAction;
  status: AgentStatus;
  createdAt: number;
  documentId: string;
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
