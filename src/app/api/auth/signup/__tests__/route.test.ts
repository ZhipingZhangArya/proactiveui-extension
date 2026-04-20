import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

// vi.hoisted ensures these are available when vi.mock factories are hoisted.
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}));

// bcrypt at 10 rounds is slow in tests; mock it to keep the suite fast.
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_pw"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

const VALID_BODY = { username: "alice", password: "secret123" };
const CREATED_USER = { id: "u1", username: "alice", role: "WRITER" };

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function rawRequest(body: string) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    body,
  });
}

describe("POST /api/auth/signup — validation", () => {
  it("returns 400 for malformed JSON", async () => {
    const res = await POST(rawRequest("not-json{"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is null", async () => {
    const res = await POST(jsonRequest(null));
    expect(res.status).toBe(400);
  });

  it("returns 400 when both fields are missing", async () => {
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when username is missing", async () => {
    const res = await POST(jsonRequest({ password: "secret123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(jsonRequest({ username: "alice" }));
    expect(res.status).toBe(400);
  });

  // --- username constraints ---

  it("returns 400 when username is too short (< 3 chars)", async () => {
    const res = await POST(jsonRequest({ ...VALID_BODY, username: "ab" }));
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/3/);
  });

  it("returns 400 when username is too long (> 32 chars)", async () => {
    const res = await POST(
      jsonRequest({ ...VALID_BODY, username: "a".repeat(33) }),
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/32/);
  });

  it("returns 400 when username contains spaces", async () => {
    const res = await POST(
      jsonRequest({ ...VALID_BODY, username: "alice bob" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when username contains special chars (!@#)", async () => {
    const res = await POST(jsonRequest({ ...VALID_BODY, username: "alice!" }));
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/letters|numbers|_|-/i);
  });

  it("returns 400 when username contains a dot", async () => {
    const res = await POST(
      jsonRequest({ ...VALID_BODY, username: "alice.bob" }),
    );
    expect(res.status).toBe(400);
  });

  // --- password constraints ---

  it("returns 400 when password is too short (< 6 chars)", async () => {
    const res = await POST(jsonRequest({ ...VALID_BODY, password: "abc" }));
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/6/);
  });

  it("returns 400 when password exceeds 128 chars", async () => {
    const res = await POST(
      jsonRequest({ ...VALID_BODY, password: "x".repeat(129) }),
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/128/);
  });
});

describe("POST /api/auth/signup — conflict", () => {
  it("returns 409 when username is already taken", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing", username: "alice" });
    const res = await POST(jsonRequest(VALID_BODY));
    expect(res.status).toBe(409);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/taken/i);
  });
});

describe("POST /api/auth/signup — success", () => {
  beforeEach(() => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue(CREATED_USER);
  });

  it("returns 201 with the created user on valid input", async () => {
    const res = await POST(jsonRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const data = (await res.json()) as { user: typeof CREATED_USER };
    expect(data.user.username).toBe("alice");
    expect(data.user.id).toBe("u1");
  });

  it("does not include the password or hash in the response", async () => {
    const res = await POST(jsonRequest(VALID_BODY));
    const raw = await res.text();
    expect(raw).not.toContain("secret");
    expect(raw).not.toContain("password");
    expect(raw).not.toContain("hashed_pw");
  });

  it("accepts a username with underscores and hyphens", async () => {
    mockCreate.mockResolvedValue({ ...CREATED_USER, username: "alice_bob-42" });
    const res = await POST(
      jsonRequest({ username: "alice_bob-42", password: "validpass" }),
    );
    expect(res.status).toBe(201);
  });

  it("accepts a username that is exactly 3 characters (boundary)", async () => {
    mockCreate.mockResolvedValue({ ...CREATED_USER, username: "abc" });
    const res = await POST(
      jsonRequest({ username: "abc", password: "validpass" }),
    );
    expect(res.status).toBe(201);
  });

  it("accepts a username that is exactly 32 characters (boundary)", async () => {
    const username = "a".repeat(32);
    mockCreate.mockResolvedValue({ ...CREATED_USER, username });
    const res = await POST(jsonRequest({ username, password: "validpass" }));
    expect(res.status).toBe(201);
  });

  it("accepts a password that is exactly 6 characters (boundary)", async () => {
    const res = await POST(
      jsonRequest({ username: "alice", password: "abc123" }),
    );
    expect(res.status).toBe(201);
  });

  it("returns role in the response body", async () => {
    const res = await POST(jsonRequest(VALID_BODY));
    const data = (await res.json()) as { user: { role: string } };
    expect(data.user.role).toBe("WRITER");
  });
});
