import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TextRange } from "@/types/proactive";

// vi.hoisted ensures the variable is available when vi.mock is hoisted.
const mockInferIntent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/llm/anthropicIntentClient", () => ({
  AnthropicIntentClient: vi.fn(function (this: Record<string, unknown>) {
    this.inferIntent = mockInferIntent;
  }),
}));

// Import after mocks are hoisted so the module-level singleton gets the mock.
import { analyzeIntent } from "../intentService";

const RANGE: TextRange = {
  startLine: 0,
  startCharacter: 0,
  endLine: 0,
  endCharacter: 20,
};

const STEP_REQ = {
  source: "line" as const,
  fileType: "python" as const,
  text: "# Step 1: load data",
  range: RANGE,
};

describe("intentService — mock fallback (no API key)", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    mockInferIntent.mockReset();
  });

  it("does not call Anthropic when ANTHROPIC_API_KEY is not set", async () => {
    await analyzeIntent(STEP_REQ);
    expect(mockInferIntent).not.toHaveBeenCalled();
  });

  it("returns a valid IntentSuggestion from the mock analyzer", async () => {
    const result = await analyzeIntent(STEP_REQ);
    expect(result.semanticType).toBe("step");
    expect(result.actions[0].id).toBe("writeCode");
  });

  it("delegates to analyzeLine for source=line", async () => {
    const result = await analyzeIntent({ ...STEP_REQ, source: "line" });
    expect(result.source).toBe("line");
  });

  it("delegates to analyzeSelection for source=selection", async () => {
    const result = await analyzeIntent({ ...STEP_REQ, source: "selection" });
    expect(result.source).toBe("selection");
  });

  it("handles LaTeX freeform text via mock", async () => {
    const result = await analyzeIntent({
      source: "line",
      fileType: "latex",
      text: "The cat sat on the mat.",
      range: RANGE,
    });
    expect(result.semanticType).toBe("freeform");
    expect(result.actions.some((a) => a.id === "fixGrammar")).toBe(true);
  });
});

describe("intentService — live Anthropic path", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    mockInferIntent.mockReset();
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("returns the live result when inferIntent resolves with valid data", async () => {
    mockInferIntent.mockResolvedValue({
      semanticType: "goal",
      actions: [{ id: "exploreAlternative", label: "Explore Alternative" }],
    });
    const result = await analyzeIntent(STEP_REQ);
    expect(result.semanticType).toBe("goal");
    expect(result.actions[0].id).toBe("exploreAlternative");
  });

  it("attaches the original range, text and source from the request to the live result", async () => {
    mockInferIntent.mockResolvedValue({
      semanticType: "step",
      actions: [{ id: "writeCode", label: "Write Code" }],
    });
    const result = await analyzeIntent(STEP_REQ);
    expect(result.text).toBe(STEP_REQ.text);
    expect(result.range).toEqual(RANGE);
    expect(result.source).toBe("line");
  });

  it("falls back to mock when inferIntent throws", async () => {
    mockInferIntent.mockRejectedValue(new Error("Network error"));
    const result = await analyzeIntent(STEP_REQ);
    // mock analyzer: "# Step 1: load data" → step
    expect(result.semanticType).toBe("step");
  });

  it("falls back to mock when inferIntent returns undefined (no valid actions)", async () => {
    mockInferIntent.mockResolvedValue(undefined);
    const result = await analyzeIntent(STEP_REQ);
    expect(result.semanticType).toBe("step");
  });

  it("falls back to mock when inferIntent returns null", async () => {
    mockInferIntent.mockResolvedValue(null);
    const result = await analyzeIntent(STEP_REQ);
    expect(result.semanticType).toBe("step");
  });
});
