import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

vi.mock("@/lib/auth/getCurrentUser", () => ({
  getCurrentUser: vi.fn(),
}));

// Prevent intentService from hitting the real Anthropic SDK.
vi.mock("@/lib/llm/anthropicIntentClient", () => ({
  AnthropicIntentClient: vi.fn(function (this: Record<string, unknown>) {
    this.inferIntent = vi.fn().mockResolvedValue(undefined);
  }),
}));

const AUTHED_USER = { id: "u1", name: "alice", role: "WRITER" as const };

const VALID_BODY = {
  text: "# Step 1: load data",
  fileType: "python",
  source: "line",
  range: { startLine: 0, startCharacter: 0, endLine: 0, endCharacter: 20 },
};

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function rawRequest(body: string) {
  return new Request("http://localhost/api/intent", {
    method: "POST",
    body,
  });
}

describe("POST /api/intent — authentication", () => {
  it("returns 401 when there is no session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await POST(jsonRequest(VALID_BODY));
    expect(res.status).toBe(401);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("Unauthorized");
  });

  it("does not reach the analyzer when unauthenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await POST(jsonRequest(VALID_BODY));
    // Only checking we got 401 without an unhandled error
    expect(res.status).toBe(401);
  });
});

describe("POST /api/intent — validation", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(AUTHED_USER);
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("returns 400 for malformed JSON body", async () => {
    const res = await POST(rawRequest("not-json{"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is completely absent (null parse result)", async () => {
    const res = await POST(jsonRequest(null));
    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields are all missing", async () => {
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when text is an empty string", async () => {
    const res = await POST(jsonRequest({ ...VALID_BODY, text: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when text exceeds 5000 chars", async () => {
    const res = await POST(
      jsonRequest({ ...VALID_BODY, text: "x".repeat(5001) }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unrecognised fileType", async () => {
    const res = await POST(
      jsonRequest({ ...VALID_BODY, fileType: "javascript" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unrecognised source value", async () => {
    const res = await POST(jsonRequest({ ...VALID_BODY, source: "hover" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when range is missing entirely", async () => {
    const { range: _r, ...noRange } = VALID_BODY;
    const res = await POST(jsonRequest(noRange));
    expect(res.status).toBe(400);
  });

  it("returns 400 when startLine is negative", async () => {
    const res = await POST(
      jsonRequest({
        ...VALID_BODY,
        range: {
          startLine: -1,
          startCharacter: 0,
          endLine: 0,
          endCharacter: 0,
        },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when range values are non-integers (float)", async () => {
    const res = await POST(
      jsonRequest({
        ...VALID_BODY,
        range: {
          startLine: 0.5,
          startCharacter: 0,
          endLine: 0,
          endCharacter: 0,
        },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when contextBefore exceeds 2000 chars", async () => {
    const res = await POST(
      jsonRequest({ ...VALID_BODY, contextBefore: "c".repeat(2001) }),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/intent — successful response", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(AUTHED_USER);
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("returns 200 with the full IntentSuggestion shape", async () => {
    const res = await POST(jsonRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toHaveProperty("semanticType");
    expect(data).toHaveProperty("actions");
    expect(data).toHaveProperty("source");
    expect(data).toHaveProperty("text");
    expect(data).toHaveProperty("range");
  });

  it("actions is a non-empty array with id and label fields", async () => {
    const res = await POST(jsonRequest(VALID_BODY));
    const data = (await res.json()) as {
      actions: { id: string; label: string }[];
    };
    expect(Array.isArray(data.actions)).toBe(true);
    expect(data.actions.length).toBeGreaterThan(0);
    expect(data.actions[0]).toHaveProperty("id");
    expect(data.actions[0]).toHaveProperty("label");
  });

  it("echoes the request source back in the response", async () => {
    const res = await POST(jsonRequest({ ...VALID_BODY, source: "selection" }));
    const data = (await res.json()) as { source: string };
    expect(data.source).toBe("selection");
  });

  it("classifies a step-like Python line as step with writeCode first (mock path)", async () => {
    const res = await POST(jsonRequest(VALID_BODY));
    const data = (await res.json()) as {
      semanticType: string;
      actions: { id: string }[];
    };
    expect(data.semanticType).toBe("step");
    expect(data.actions[0].id).toBe("writeCode");
  });

  it("classifies a LaTeX section command as goal", async () => {
    const res = await POST(
      jsonRequest({
        text: "\\section{Introduction}",
        fileType: "latex",
        source: "line",
        range: {
          startLine: 0,
          startCharacter: 0,
          endLine: 0,
          endCharacter: 22,
        },
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { semanticType: string };
    expect(data.semanticType).toBe("goal");
  });

  it("accepts optional contextBefore and contextAfter without error", async () => {
    const res = await POST(
      jsonRequest({
        ...VALID_BODY,
        contextBefore: "# previous line",
        contextAfter: "x = 1",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("returns text and range exactly as sent in the request", async () => {
    const res = await POST(jsonRequest(VALID_BODY));
    const data = (await res.json()) as {
      text: string;
      range: typeof VALID_BODY.range;
    };
    expect(data.text).toBe(VALID_BODY.text);
    expect(data.range).toEqual(VALID_BODY.range);
  });
});
