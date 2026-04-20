import { describe, it, expect } from "vitest";
import {
  ARTIFACT_ACTIONS,
  RESULT_ACTIONS,
  isArtifactAction,
  buildThinking,
  buildSummary,
  buildArtifactContent,
  artifactDelimiters,
} from "../agentManager";
import type { ActionId } from "@/types/proactive";

describe("agentManager — action classification", () => {
  it("splits actions into artifact vs result sets with no overlap", () => {
    for (const id of ARTIFACT_ACTIONS) {
      expect(RESULT_ACTIONS.has(id)).toBe(false);
    }
  });

  it("isArtifactAction is true for writeCode", () => {
    expect(isArtifactAction("writeCode")).toBe(true);
  });

  it("isArtifactAction is false for exploreAlternative", () => {
    expect(isArtifactAction("exploreAlternative")).toBe(false);
  });

  it("isArtifactAction is false for summarizeUnderstanding", () => {
    expect(isArtifactAction("summarizeUnderstanding")).toBe(false);
  });
});

describe("agentManager — buildThinking", () => {
  it("returns at least 2 steps for every action", () => {
    const ids = [...ARTIFACT_ACTIONS, ...RESULT_ACTIONS] as const;
    for (const id of ids) {
      const steps = buildThinking(id, "# Step 1: load data");
      expect(steps.length).toBeGreaterThanOrEqual(2);
      expect(steps.every((s) => s.length > 0)).toBe(true);
    }
  });

  it("embeds the trimmed origin text in the first step when applicable", () => {
    const steps = buildThinking("writeCode", "   # train a classifier   ");
    expect(steps[0]).toContain("# train a classifier");
  });
});

describe("agentManager — buildSummary", () => {
  it("returns a non-empty string for every action", () => {
    const ids = [...ARTIFACT_ACTIONS, ...RESULT_ACTIONS] as const;
    for (const id of ids) {
      expect(buildSummary(id, "sample")).toMatch(/.+/);
    }
  });
});

describe("agentManager — buildArtifactContent", () => {
  it("returns undefined for result-only actions", () => {
    expect(
      buildArtifactContent(
        "exploreAlternative",
        "# some step",
        "abc123",
        "python",
      ),
    ).toBeUndefined();
    expect(
      buildArtifactContent(
        "summarizeUnderstanding",
        "a claim",
        "abc123",
        "latex",
      ),
    ).toBeUndefined();
  });

  it("wraps Python artifacts in # delimiters with agent ID and pending state", () => {
    const artifact = buildArtifactContent(
      "writeCode",
      "# Step 1: load data",
      "agt_xyz",
      "python",
    );
    expect(artifact).toBeDefined();
    expect(artifact!.opening).toBe(
      "# --- [ProactiveUI Artifact agt_xyz | pending] ---",
    );
    expect(artifact!.closing).toBe(
      "# --- [End ProactiveUI Artifact agt_xyz] ---",
    );
    expect(artifact!.full).toContain(artifact!.opening);
    expect(artifact!.full).toContain(artifact!.closing);
  });

  it("wraps LaTeX artifacts in % delimiters", () => {
    const artifact = buildArtifactContent(
      "fixGrammar",
      "We proposes a new approach",
      "agt_lat",
      "latex",
    );
    expect(artifact!.opening.startsWith("%")).toBe(true);
    expect(artifact!.closing.startsWith("%")).toBe(true);
  });

  it("writeCode produces runnable-looking Python with an import", () => {
    const artifact = buildArtifactContent(
      "writeCode",
      "# load the dataset",
      "agt_1",
      "python",
    );
    expect(artifact!.body).toContain("import");
  });
});

describe("agentManager — artifactDelimiters", () => {
  it("matches the pending opening delimiter it produced", () => {
    const { opening } = artifactDelimiters("agt_xyz");
    expect(
      opening.test("# --- [ProactiveUI Artifact agt_xyz | pending] ---"),
    ).toBe(true);
  });

  it("matches approved and reverted states too (state transitions)", () => {
    const { opening } = artifactDelimiters("agt_xyz");
    expect(
      opening.test("# --- [ProactiveUI Artifact agt_xyz | approved] ---"),
    ).toBe(true);
    expect(
      opening.test("# --- [ProactiveUI Artifact agt_xyz | reverted] ---"),
    ).toBe(true);
  });

  it("does not match a different agent's delimiter", () => {
    const { opening } = artifactDelimiters("agt_xyz");
    expect(
      opening.test("# --- [ProactiveUI Artifact agt_other | pending] ---"),
    ).toBe(false);
  });

  it("matches both Python and LaTeX comment prefixes", () => {
    const { opening } = artifactDelimiters("agt_1");
    expect(
      opening.test("# --- [ProactiveUI Artifact agt_1 | pending] ---"),
    ).toBe(true);
    expect(
      opening.test("% --- [ProactiveUI Artifact agt_1 | pending] ---"),
    ).toBe(true);
  });

  it("matches the closing delimiter for Python", () => {
    const { closing } = artifactDelimiters("agt_xyz");
    expect(closing.test("# --- [End ProactiveUI Artifact agt_xyz] ---")).toBe(
      true,
    );
  });

  it("matches the closing delimiter for LaTeX", () => {
    const { closing } = artifactDelimiters("agt_1");
    expect(closing.test("% --- [End ProactiveUI Artifact agt_1] ---")).toBe(
      true,
    );
  });

  it("closing does not match a different agent", () => {
    const { closing } = artifactDelimiters("agt_xyz");
    expect(closing.test("# --- [End ProactiveUI Artifact agt_other] ---")).toBe(
      false,
    );
  });
});

describe("agentManager — full ActionId coverage", () => {
  const ALL_IDS: ActionId[] = [
    "writeCode",
    "detailStep",
    "improveComment",
    "fixGrammar",
    "rewriteAcademic",
    "expandParagraph",
    "exploreAlternative",
    "summarizeUnderstanding",
  ];

  it("every ActionId belongs to exactly one of ARTIFACT_ACTIONS or RESULT_ACTIONS", () => {
    for (const id of ALL_IDS) {
      const inArtifact = ARTIFACT_ACTIONS.has(id);
      const inResult = RESULT_ACTIONS.has(id);
      expect(inArtifact || inResult, `${id} must be in one set`).toBe(true);
      expect(inArtifact && inResult, `${id} must not be in both sets`).toBe(
        false,
      );
    }
  });

  it("isArtifactAction is true for rewriteAcademic", () => {
    expect(isArtifactAction("rewriteAcademic")).toBe(true);
  });

  it("isArtifactAction is true for expandParagraph", () => {
    expect(isArtifactAction("expandParagraph")).toBe(true);
  });

  it("isArtifactAction is true for improveComment", () => {
    expect(isArtifactAction("improveComment")).toBe(true);
  });

  it("isArtifactAction is true for detailStep", () => {
    expect(isArtifactAction("detailStep")).toBe(true);
  });
});

describe("agentManager — buildThinking edge cases", () => {
  it("handles empty origin text without throwing", () => {
    const steps = buildThinking("writeCode", "");
    expect(steps.length).toBeGreaterThanOrEqual(2);
  });

  it("truncates long origin text — first step stays readable", () => {
    const longText = "# " + "a".repeat(100);
    const steps = buildThinking("writeCode", longText);
    // Origin is sliced to 60 chars max; the step should not be enormous
    expect(steps[0].length).toBeLessThan(150);
  });

  it("summarizeUnderstanding first step reflects the char count of the origin", () => {
    const origin = "x".repeat(50);
    const steps = buildThinking("summarizeUnderstanding", origin);
    expect(steps[0]).toContain("50 chars");
  });
});

describe("agentManager — buildArtifactContent Python variants", () => {
  it("detailStep body contains sub-step numbering", () => {
    const artifact = buildArtifactContent(
      "detailStep",
      "# load and clean data",
      "agt_d1",
      "python",
    );
    expect(artifact).toBeDefined();
    expect(artifact!.body).toContain("1.");
    expect(artifact!.opening.startsWith("#")).toBe(true);
  });

  it("improveComment body is a single revised comment line", () => {
    const artifact = buildArtifactContent(
      "improveComment",
      "# bad comment",
      "agt_i1",
      "python",
    );
    expect(artifact).toBeDefined();
    expect(artifact!.body.startsWith("#")).toBe(true);
    expect(artifact!.body.split("\n")).toHaveLength(1);
  });
});

describe("agentManager — buildArtifactContent LaTeX variants", () => {
  it("rewriteAcademic body starts with 'In this work'", () => {
    const artifact = buildArtifactContent(
      "rewriteAcademic",
      "we show that X is better",
      "agt_r1",
      "latex",
    );
    expect(artifact).toBeDefined();
    expect(artifact!.opening.startsWith("%")).toBe(true);
    expect(artifact!.body).toContain("In this work");
  });

  it("expandParagraph body contains motivating sentences", () => {
    const artifact = buildArtifactContent(
      "expandParagraph",
      "Our approach is efficient",
      "agt_e1",
      "latex",
    );
    expect(artifact).toBeDefined();
    expect(artifact!.body).toContain("motivated by");
  });

  it("fixGrammar body is a cleaned-up version of the origin", () => {
    const artifact = buildArtifactContent(
      "fixGrammar",
      "We proposes  a  new approach",
      "agt_f1",
      "latex",
    );
    expect(artifact).toBeDefined();
    // Collapses extra spaces and appends a period
    expect(artifact!.body.endsWith(".")).toBe(true);
  });
});
