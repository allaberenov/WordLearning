import { describe, expect, it } from "vitest";
import { generatedCardSchema } from "@/lib/schemas";
import { parseGeneratedCard, parseSentenceCheck } from "@/lib/openai";

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

  it("validates sentence check JSON", () => {
    const parsed = parseSentenceCheck(
      JSON.stringify({
        score: 4,
        correct: true,
        feedback: "Хорошее предложение, звучит естественно.",
        correctedSentence: null
      })
    );
    expect(parsed).toEqual({
      score: 4,
      correct: true,
      feedback: "Хорошее предложение, звучит естественно.",
      correctedSentence: null
    });
  });

  it("rejects long sentence check feedback", () => {
    expect(() =>
      parseSentenceCheck(
        JSON.stringify({
          score: 3,
          correct: false,
          feedback: "Это слишком длинный фидбэк который содержит намного больше двадцати слов и должен быть отклонен валидатором для компактного интерфейса без дополнительных объяснений грамматики",
          correctedSentence: "I abandoned the plan."
        })
      )
    ).toThrow();
  });

  it("normalizes inconsistent sentence check score", () => {
    const parsed = parseSentenceCheck(
      JSON.stringify({
        score: 1,
        correct: true,
        feedback: "Правильно использовано слово.",
        correctedSentence: null
      })
    );
    expect(parsed.score).toBe(4);
  });
});
