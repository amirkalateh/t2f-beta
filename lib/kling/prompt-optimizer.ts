import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

export const KLING_MAX_PROMPT_CHARS = 2500;
const SAFE_LIMIT = 2400;

function hardTruncate(prompt: string): string {
  if (prompt.length <= SAFE_LIMIT) return prompt;
  const cut = prompt.slice(0, SAFE_LIMIT);
  const lastPeriod = cut.lastIndexOf(". ");
  const lastComma = cut.lastIndexOf(", ");
  const breakAt = Math.max(lastPeriod, lastComma);
  return breakAt > SAFE_LIMIT * 0.7 ? cut.slice(0, breakAt + 1).trim() : cut.trim();
}

function cheapStrip(prompt: string): string {
  return prompt
    .replace(/RACCORD & SEQUENCE CONTINUITY[^.]*\./gi, "")
    .replace(/\[SCENE ANCHORS[^\]]*\][^.]*\./gi, "")
    .replace(/\[CHARACTER RACCORD[^\]]*\][^.]*\./gi, "")
    .replace(/\[Preceding shot \d+\][^.]*\./gi, "")
    .replace(/HARD CONSTRAINTS:[^.]*\./gi, "")
    .replace(/MAINTAIN EXACT SAME /gi, "maintain ")
    .replace(/FILM VISUAL DNA \(apply to this frame\):/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function optimizePrompt(prompt: string): Promise<string> {
  if (prompt.length <= SAFE_LIMIT) return prompt;

  const stripped = cheapStrip(prompt);
  if (stripped.length <= SAFE_LIMIT) return stripped;

  try {
    const response = await openrouter.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a cinematic image-generation prompt optimizer for Kling AI. Your ONLY job is to compress a given prompt to under ${SAFE_LIMIT} characters while keeping it visually effective.

OUTPUT RULES — follow exactly:
- Output ONLY the final prompt text. No explanations, no quotes, no labels.
- Hard limit: ${SAFE_LIMIT} characters.
- KEEP: scene/subject visual description, lighting quality and direction, color palette/grade, camera model + lens + focal length, film style/texture, mood, environment details, character appearance.
- REMOVE entirely: continuity/raccord meta-instructions ("MAINTAIN EXACT SAME", "HARD CONSTRAINTS", "SCENE ANCHORS", "CHARACTER RACCORD", "Preceding shot N:", "RACCORD &", film sequence notes). These are for an LLM not an image generator.
- COMPRESS: wordy phrases into concise cinematic tags separated by commas.
- PRESERVE: element syntax tokens like <<<object_1>>> — keep them exactly as-is.
- Language: English only.`,
        },
        {
          role: "user",
          content: `Compress this prompt to under ${SAFE_LIMIT} characters:\n\n${stripped}`,
        },
      ],
      max_tokens: 700,
      temperature: 0.05,
    });

    const optimized = response.choices[0]?.message?.content?.trim() ?? "";

    if (optimized.length > 0 && optimized.length <= KLING_MAX_PROMPT_CHARS) {
      console.log(`[PromptOptimizer] ${prompt.length} → ${optimized.length} chars (LLM compressed)`);
      return optimized;
    }

    console.warn("[PromptOptimizer] LLM result too long or empty, falling back to hard truncate");
    return hardTruncate(stripped);
  } catch (err) {
    console.error("[PromptOptimizer] LLM call failed, using hard truncate:", err);
    return hardTruncate(stripped);
  }
}
