import Anthropic from "@anthropic-ai/sdk";
import type {
  FileLanguage,
  SemanticType,
  SuggestedAction,
} from "@/types/proactive";

export interface IntentRequest {
  source: "line" | "selection";
  fileType: FileLanguage;
  text: string;
  contextBefore: string;
  contextAfter: string;
}

export interface IntentResponse {
  semanticType: SemanticType;
  actions: SuggestedAction[];
}

type ParsedResponse = {
  semanticType?: string;
  actionIds?: string[];
};

const MODEL_NAME = "claude-3-5-haiku-latest";

const ACTION_BY_ID: Record<string, SuggestedAction> = {
  writeCode: { id: "writeCode", label: "Write Code" },
  detailStep: { id: "detailStep", label: "Detail Step" },
  exploreAlternative: { id: "exploreAlternative", label: "Explore Alternative" },
  improveComment: { id: "improveComment", label: "Revise" },
  fixGrammar: { id: "fixGrammar", label: "Fix Grammar" },
  summarizeUnderstanding: {
    id: "summarizeUnderstanding",
    label: "Reflect Understanding",
  },
};

export class AnthropicIntentClient {
  private currentKey?: string;
  private currentClient?: Anthropic;

  async inferIntent(
    apiKey: string,
    request: IntentRequest,
  ): Promise<IntentResponse | undefined> {
    const client = this.getClient(apiKey);

    const response = await client.messages.create({
      model: MODEL_NAME,
      max_tokens: 300,
      temperature: 0,
      system: [
        "You classify writing intent for proactive coding and paper-writing assistance.",
        "Return ONLY strict JSON with keys semanticType and actionIds.",
        "semanticType must be one of: goal, step, freeform.",
        "Choose 2-4 unique actionIds based on fileType and source.",
        "For fileType=python use: writeCode, detailStep, exploreAlternative, improveComment.",
        "For fileType=latex use ONLY: fixGrammar, summarizeUnderstanding.",
      ].join(" "),
      messages: [
        {
          role: "user",
          content: [
            `source: ${request.source}`,
            `fileType: ${request.fileType}`,
            `text:\n${request.text}`,
            `context_before:\n${request.contextBefore || "(empty)"}`,
            `context_after:\n${request.contextAfter || "(empty)"}`,
          ].join("\n\n"),
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("\n");
    const parsed = parseJson(text);
    if (!parsed) {
      return undefined;
    }

    const semanticType = normalizeSemanticType(parsed.semanticType);
    const actionIds = (parsed.actionIds ?? []).filter(
      (id): id is keyof typeof ACTION_BY_ID =>
        Object.prototype.hasOwnProperty.call(ACTION_BY_ID, id),
    );
    const allowedActionIds =
      request.fileType === "latex"
        ? ["fixGrammar", "summarizeUnderstanding"]
        : ["writeCode", "detailStep", "exploreAlternative", "improveComment"];
    const actions = unique(actionIds)
      .filter((id) => allowedActionIds.includes(id))
      .map((id) => ACTION_BY_ID[id]);

    if (actions.length === 0) {
      return undefined;
    }

    return {
      semanticType,
      actions: actions.slice(0, 4),
    };
  }

  private getClient(apiKey: string): Anthropic {
    if (this.currentClient && this.currentKey === apiKey) {
      return this.currentClient;
    }

    this.currentKey = apiKey;
    this.currentClient = new Anthropic({ apiKey });
    return this.currentClient;
  }
}

function parseJson(raw: string): ParsedResponse | undefined {
  const trimmed = raw.trim();
  const direct = tryParse(trimmed);
  if (direct) {
    return direct;
  }

  const blockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (blockMatch?.[1]) {
    const fromBlock = tryParse(blockMatch[1].trim());
    if (fromBlock) {
      return fromBlock;
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return tryParse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  return undefined;
}

function tryParse(text: string): ParsedResponse | undefined {
  try {
    const parsed = JSON.parse(text) as ParsedResponse;
    return parsed;
  } catch {
    return undefined;
  }
}

function normalizeSemanticType(value: string | undefined): SemanticType {
  if (value === "goal" || value === "step" || value === "freeform") {
    return value;
  }
  return "freeform";
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
