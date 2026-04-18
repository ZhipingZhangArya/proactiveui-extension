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
});
