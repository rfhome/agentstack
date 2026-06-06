/**
 * Extracts and parses a JSON object from an LLM response string.
 * Handles: raw JSON, markdown fences (```json ... ```), and preamble text before the object.
 */
export function extractJSON<T>(text: string, fallback: T): T {
  const fenceMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  const objectMatch = text.match(/(\{[\s\S]*\})/);
  const clean = fenceMatch?.[1] ?? objectMatch?.[1] ?? text;
  try {
    return JSON.parse(clean) as T;
  } catch {
    return fallback;
  }
}

/**
 * Validates that a rating string is one of the allowed values.
 */
export function isValidRating(value: unknown): value is "A" | "B" | "C" {
  return value === "A" || value === "B" || value === "C";
}
