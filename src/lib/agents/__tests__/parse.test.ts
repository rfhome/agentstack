import { describe, it, expect } from "vitest";
import { extractJSON, isValidRating } from "../parse";

describe("extractJSON", () => {
  it("parses a plain JSON object", () => {
    const input = '{"content":"great session","nextActions":["rest","hydrate"]}';
    const result = extractJSON<{ content: string; nextActions: string[] }>(input, { content: "", nextActions: [] });
    expect(result.content).toBe("great session");
    expect(result.nextActions).toHaveLength(2);
  });

  it("extracts JSON from a markdown code fence", () => {
    const input = 'Here is the result:\n```json\n{"content":"good","nextActions":[]}\n```';
    const result = extractJSON<{ content: string }>(input, { content: "" });
    expect(result.content).toBe("good");
  });

  it("extracts JSON from a plain code fence", () => {
    const input = "```\n{\"content\":\"ok\"}\n```";
    const result = extractJSON<{ content: string }>(input, { content: "" });
    expect(result.content).toBe("ok");
  });

  it("extracts JSON embedded in preamble text", () => {
    const input = 'Some preamble text here. {"content":"embedded","nextActions":[]} The end.';
    const result = extractJSON<{ content: string }>(input, { content: "" });
    expect(result.content).toBe("embedded");
  });

  it("returns fallback when JSON is invalid", () => {
    const fallback = { content: "fallback", nextActions: [] };
    const result = extractJSON<{ content: string; nextActions: string[] }>("not valid json at all", fallback);
    expect(result).toEqual(fallback);
  });

  it("prefers fence content over object match when both present", () => {
    const input = '{"outer":true}\n```json\n{"inner":true}\n```';
    const result = extractJSON<{ inner?: boolean; outer?: boolean }>(input, {});
    expect(result.inner).toBe(true);
  });
});

describe("isValidRating", () => {
  it("accepts A, B, C", () => {
    expect(isValidRating("A")).toBe(true);
    expect(isValidRating("B")).toBe(true);
    expect(isValidRating("C")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isValidRating("D")).toBe(false);
    expect(isValidRating("a")).toBe(false);
    expect(isValidRating("")).toBe(false);
    expect(isValidRating(null)).toBe(false);
    expect(isValidRating(undefined)).toBe(false);
    expect(isValidRating(1)).toBe(false);
  });
});
