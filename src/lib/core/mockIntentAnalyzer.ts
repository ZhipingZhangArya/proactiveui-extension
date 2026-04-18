import type {
  FileLanguage,
  IntentSuggestion,
  SuggestedAction,
  TextRange,
} from "@/types/proactive";

const IMPROVE_COMMENT: SuggestedAction = {
  id: "improveComment",
  label: "Revise",
};

const WRITE_CODE: SuggestedAction = {
  id: "writeCode",
  label: "Write Code",
};

const DETAIL_STEP: SuggestedAction = {
  id: "detailStep",
  label: "Detail Step",
};

const EXPLORE_ALTERNATIVE: SuggestedAction = {
  id: "exploreAlternative",
  label: "Explore Alternative",
};

const FIX_GRAMMAR: SuggestedAction = {
  id: "fixGrammar",
  label: "Fix Grammar",
};

const SUMMARIZE_UNDERSTANDING: SuggestedAction = {
  id: "summarizeUnderstanding",
  label: "Reflect Understanding",
};

export function analyzeLine(
  text: string,
  range: TextRange,
  fileType: FileLanguage,
): IntentSuggestion {
  if (fileType === "latex") {
    return analyzeLatexLine(text, range);
  }

  const normalized = text.toLowerCase();

  if (looksLikeGoal(normalized)) {
    return {
      semanticType: "goal",
      actions: [IMPROVE_COMMENT, EXPLORE_ALTERNATIVE],
      source: "line",
      text,
      range,
    };
  }

  if (looksLikeStep(normalized)) {
    return {
      semanticType: "step",
      actions: [WRITE_CODE, DETAIL_STEP, EXPLORE_ALTERNATIVE],
      source: "line",
      text,
      range,
    };
  }

  return {
    semanticType: "freeform",
    actions: [IMPROVE_COMMENT, DETAIL_STEP],
    source: "line",
    text,
    range,
  };
}

export function analyzeSelection(
  text: string,
  range: TextRange,
  fileType: FileLanguage,
): IntentSuggestion {
  const base = analyzeLine(text, range, fileType);
  return {
    ...base,
    source: "selection",
  };
}

function looksLikeGoal(text: string): boolean {
  return (
    text.includes("goal") ||
    text.includes("objective") ||
    text.includes("question") ||
    text.includes("hypothesis")
  );
}

function looksLikeStep(text: string): boolean {
  return (
    /step\s*\d+/i.test(text) ||
    text.includes("load") ||
    text.includes("clean") ||
    text.includes("analyze") ||
    text.includes("model") ||
    text.includes("plot") ||
    text.includes("test") ||
    text.includes("visualize") ||
    text.includes("predict") ||
    text.includes("train") ||
    text.includes("transform")
  );
}

function analyzeLatexLine(text: string, range: TextRange): IntentSuggestion {
  const normalized = text.toLowerCase();
  if (looksLikeSectionOrClaim(normalized)) {
    return {
      semanticType: "goal",
      actions: [SUMMARIZE_UNDERSTANDING, FIX_GRAMMAR],
      source: "line",
      text,
      range,
    };
  }

  return {
    semanticType: "freeform",
    actions: [SUMMARIZE_UNDERSTANDING, FIX_GRAMMAR],
    source: "line",
    text,
    range,
  };
}

function looksLikeSectionOrClaim(text: string): boolean {
  return (
    text.includes("\\section") ||
    text.includes("\\subsection") ||
    text.includes("we propose") ||
    text.includes("our contribution") ||
    text.includes("this paper")
  );
}
