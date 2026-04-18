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
});
