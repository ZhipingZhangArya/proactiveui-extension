import { describe, it, expect } from "vitest";
import { analyzeLine, analyzeSelection } from "../mockIntentAnalyzer";
import type { TextRange } from "@/types/proactive";

const RANGE: TextRange = {
  startLine: 0,
  startCharacter: 0,
  endLine: 0,
  endCharacter: 10,
};

describe("mockIntentAnalyzer — Python step triggers", () => {
  it("classifies 'visualize' as step", () => {
    const result = analyzeLine(
      "# visualize the correlation matrix",
      RANGE,
      "python",
    );
    expect(result.semanticType).toBe("step");
  });

  it("classifies 'predict' as step", () => {
    const result = analyzeLine("# predict next month's sales", RANGE, "python");
    expect(result.semanticType).toBe("step");
  });

  it("classifies 'train' as step", () => {
    const result = analyzeLine(
      "# train a random forest classifier",
      RANGE,
      "python",
    );
    expect(result.semanticType).toBe("step");
  });

  it("classifies 'transform' as step", () => {
    const result = analyzeLine(
      "# transform features with StandardScaler",
      RANGE,
      "python",
    );
    expect(result.semanticType).toBe("step");
  });

  it("offers writeCode as the first action for step-like lines", () => {
    const result = analyzeLine("# visualize the data", RANGE, "python");
    expect(result.actions[0].id).toBe("writeCode");
  });

  it("keeps selections flagged as source=selection", () => {
    const result = analyzeSelection("# train a model", RANGE, "python");
    expect(result.source).toBe("selection");
    expect(result.semanticType).toBe("step");
  });
});

describe("mockIntentAnalyzer — LaTeX goal triggers", () => {
  it("classifies 'Abstract:' as goal", () => {
    const result = analyzeLine(
      "Abstract: This paper studies...",
      RANGE,
      "latex",
    );
    expect(result.semanticType).toBe("goal");
  });

  it("classifies 'In conclusion' as goal", () => {
    const result = analyzeLine(
      "In conclusion, we find that...",
      RANGE,
      "latex",
    );
    expect(result.semanticType).toBe("goal");
  });

  it("classifies '\\title{...}' as goal", () => {
    const result = analyzeLine(
      "\\title{Intent-Aware Co-Pilot}",
      RANGE,
      "latex",
    );
    expect(result.semanticType).toBe("goal");
  });

  it("classifies '\\begin{abstract}' as goal", () => {
    const result = analyzeLine("\\begin{abstract}", RANGE, "latex");
    expect(result.semanticType).toBe("goal");
  });

  it("still treats plain prose as freeform in latex", () => {
    const result = analyzeLine(
      "The quick brown fox jumps over the lazy dog.",
      RANGE,
      "latex",
    );
    expect(result.semanticType).toBe("freeform");
  });

  it("classifies '\\subsection{...}' as goal", () => {
    const result = analyzeLine("\\subsection{Related Work}", RANGE, "latex");
    expect(result.semanticType).toBe("goal");
  });

  it("classifies 'we propose' as goal", () => {
    const result = analyzeLine(
      "we propose a novel architecture",
      RANGE,
      "latex",
    );
    expect(result.semanticType).toBe("goal");
  });

  it("classifies 'our contribution' as goal", () => {
    const result = analyzeLine(
      "our contribution is a new loss function",
      RANGE,
      "latex",
    );
    expect(result.semanticType).toBe("goal");
  });

  it("LaTeX goal actions are always [summarizeUnderstanding, fixGrammar]", () => {
    const result = analyzeLine("\\section{Introduction}", RANGE, "latex");
    expect(result.actions.map((a) => a.id)).toEqual([
      "summarizeUnderstanding",
      "fixGrammar",
    ]);
  });

  it("LaTeX freeform actions are also [summarizeUnderstanding, fixGrammar]", () => {
    const result = analyzeLine("A sentence with no cues.", RANGE, "latex");
    expect(result.actions.map((a) => a.id)).toEqual([
      "summarizeUnderstanding",
      "fixGrammar",
    ]);
  });

  it("analyzeSelection on a LaTeX goal line returns source=selection", () => {
    const result = analyzeSelection("\\section{Methods}", RANGE, "latex");
    expect(result.source).toBe("selection");
    expect(result.semanticType).toBe("goal");
  });
});

describe("mockIntentAnalyzer — Python goal triggers", () => {
  it("classifies 'goal' keyword as goal", () => {
    const result = analyzeLine(
      "# goal: build a recommendation engine",
      RANGE,
      "python",
    );
    expect(result.semanticType).toBe("goal");
  });

  it("classifies 'objective' keyword as goal", () => {
    const result = analyzeLine(
      "# objective: reduce model error below 5%",
      RANGE,
      "python",
    );
    expect(result.semanticType).toBe("goal");
  });

  it("classifies 'hypothesis' keyword as goal", () => {
    const result = analyzeLine(
      "# hypothesis: ensembling improves accuracy",
      RANGE,
      "python",
    );
    expect(result.semanticType).toBe("goal");
  });

  it("classifies 'question' keyword as goal", () => {
    const result = analyzeLine(
      "# question: which model generalises best?",
      RANGE,
      "python",
    );
    expect(result.semanticType).toBe("goal");
  });

  it("goal actions are [improveComment, exploreAlternative]", () => {
    const result = analyzeLine(
      "# goal: optimise the pipeline",
      RANGE,
      "python",
    );
    expect(result.actions.map((a) => a.id)).toEqual([
      "improveComment",
      "exploreAlternative",
    ]);
  });
});

describe("mockIntentAnalyzer — Python freeform", () => {
  it("classifies a comment with no recognised keywords as freeform", () => {
    const result = analyzeLine("# this is just a note", RANGE, "python");
    expect(result.semanticType).toBe("freeform");
  });

  it("freeform actions are [improveComment, detailStep]", () => {
    const result = analyzeLine("# just a note", RANGE, "python");
    expect(result.actions.map((a) => a.id)).toEqual([
      "improveComment",
      "detailStep",
    ]);
  });
});

describe("mockIntentAnalyzer — case insensitivity and pattern matching", () => {
  it("matches step keywords regardless of case (VISUALIZE → step)", () => {
    const result = analyzeLine("# VISUALIZE the results", RANGE, "python");
    expect(result.semanticType).toBe("step");
  });

  it("matches 'step 1:' via the numeric regex pattern", () => {
    const result = analyzeLine("Step 1: preprocess the data", RANGE, "python");
    expect(result.semanticType).toBe("step");
  });

  it("matches 'step10' (no space between step and digit)", () => {
    const result = analyzeLine("step10: final cleanup", RANGE, "python");
    expect(result.semanticType).toBe("step");
  });
});
