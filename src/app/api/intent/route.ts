import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { analyzeIntent } from "@/lib/core/intentService";

const RangeSchema = z.object({
  startLine: z.number().int().min(0),
  startCharacter: z.number().int().min(0),
  endLine: z.number().int().min(0),
  endCharacter: z.number().int().min(0),
});

const IntentBodySchema = z.object({
  text: z.string().min(1).max(5000),
  fileType: z.enum(["python", "latex"]),
  source: z.enum(["line", "selection"]),
  range: RangeSchema,
  contextBefore: z.string().max(2000).optional(),
  contextAfter: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = IntentBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const suggestion = await analyzeIntent(parsed.data);
  return NextResponse.json(suggestion);
}
