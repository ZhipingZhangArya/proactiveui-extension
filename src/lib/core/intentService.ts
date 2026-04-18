import type {
  FileLanguage,
  IntentSuggestion,
  TextRange,
} from "@/types/proactive";
import { analyzeLine, analyzeSelection } from "@/lib/core/mockIntentAnalyzer";
import { AnthropicIntentClient } from "@/lib/llm/anthropicIntentClient";

export interface IntentServiceRequest {
  source: "line" | "selection";
  fileType: FileLanguage;
  text: string;
  range: TextRange;
  contextBefore?: string;
  contextAfter?: string;
}

const client = new AnthropicIntentClient();

/**
 * Server-side intent analysis.
 *
 * Uses the Anthropic API when `ANTHROPIC_API_KEY` is set; transparently
 * falls back to the rule-based mock analyzer on missing key or failure.
 * Callers get the same {@link IntentSuggestion} shape either way.
 */
export async function analyzeIntent(
  req: IntentServiceRequest,
): Promise<IntentSuggestion> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const live = await client.inferIntent(apiKey, {
        source: req.source,
        fileType: req.fileType,
        text: req.text,
        contextBefore: req.contextBefore ?? "",
        contextAfter: req.contextAfter ?? "",
      });
      if (live) {
        return {
          semanticType: live.semanticType,
          actions: live.actions,
          source: req.source,
          text: req.text,
          range: req.range,
        };
      }
    } catch {
      // fall through to mock
    }
  }

  return req.source === "line"
    ? analyzeLine(req.text, req.range, req.fileType)
    : analyzeSelection(req.text, req.range, req.fileType);
}
