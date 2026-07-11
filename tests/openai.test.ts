import { describe, expect, it } from "vitest";
import { generatedCardSchema } from "@/lib/schemas";
import { parseGeneratedCard } from "@/lib/openai";

const validCard = {
  word: "abandon",
  normalizedWord: "Abandon",
  partOfSpeech: "verb",
  transcription: "/əˈbændən/",
  translations: ["оставлять", "покидать"],
  definitionEn: "To leave a place or stop doing something.",
  examples: [
    {
      en: "They had to abandon the village after the storm.",
      ru: "Им пришлось покинуть деревню после шторма."
    },
    {
      en: "She abandoned the plan because it was too risky.",
      ru: "Она отказалась от плана, потому что он был слишком рискованным."
    }
  ]
};

describe("OpenAI structured output parsing", () => {
  it("validates generated JSON and normalizes the word", () => {
    const parsed = parseGeneratedCard(JSON.stringify(validCard));
    expect(parsed.normalizedWord).toBe("abandon");
    expect(generatedCardSchema.safeParse(parsed).success).toBe(true);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseGeneratedCard("{not-json")).toThrow();
  });

  it("rejects cards without exactly two examples", () => {
    expect(() =>
      parseGeneratedCard(JSON.stringify({ ...validCard, examples: validCard.examples.slice(0, 1) }))
    ).toThrow();
  });
});
