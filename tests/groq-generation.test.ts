import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedCardInput } from "@/lib/schemas";
import { resetGroqQueueForTests } from "@/lib/ai/groq-limiter";

const validCard: GeneratedCardInput = {
  word: "abandon",
  normalizedWord: "abandon",
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

const { generatedWordCache } = vi.hoisted(() => ({
  generatedWordCache: {
    findUnique: vi.fn(),
    upsert: vi.fn()
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    generatedWordCache
  }
}));

const originalEnv = {
  AI_PROVIDER: process.env.AI_PROVIDER,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL,
  GROQ_GLOBAL_RPM: process.env.GROQ_GLOBAL_RPM,
  GROQ_GLOBAL_RPD: process.env.GROQ_GLOBAL_RPD,
  GROQ_MAX_CONCURRENCY: process.env.GROQ_MAX_CONCURRENCY,
  GROQ_QUEUE_MAX_SIZE: process.env.GROQ_QUEUE_MAX_SIZE,
  GROQ_QUEUE_TIMEOUT_MS: process.env.GROQ_QUEUE_TIMEOUT_MS
};

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
}

function groqSuccessResponse(card = validCard) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(card) }, finish_reason: "stop" }]
    }),
    {
      status: 200,
      headers: {
        "x-ratelimit-remaining-requests": "999",
        "x-ratelimit-remaining-tokens": "5000"
      }
    }
  );
}

describe("Groq generation cache and retry behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resetGroqQueueForTests();
    process.env.AI_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "test-key";
    process.env.GROQ_MODEL = "qwen/qwen3.6-27b";
    process.env.GROQ_GLOBAL_RPM = "1000";
    process.env.GROQ_GLOBAL_RPD = "1000";
    process.env.GROQ_MAX_CONCURRENCY = "1";
    process.env.GROQ_QUEUE_MAX_SIZE = "20";
    process.env.GROQ_QUEUE_TIMEOUT_MS = "1000";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetGroqQueueForTests();
    restoreEnv();
  });

  it("returns cached cards without calling Groq", async () => {
    generatedWordCache.findUnique.mockResolvedValueOnce({ payload: validCard });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { generateVocabularyCard } = await import("@/lib/openai");
    await expect(generateVocabularyCard(" abandon ")).resolves.toMatchObject({
      normalizedWord: "abandon"
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(generatedWordCache.upsert).not.toHaveBeenCalled();
  });

  it("deduplicates parallel requests for the same normalized word", async () => {
    generatedWordCache.findUnique.mockResolvedValue(null);
    generatedWordCache.upsert.mockResolvedValue({});
    const fetchMock = vi.fn().mockResolvedValue(groqSuccessResponse());
    vi.stubGlobal("fetch", fetchMock);

    const { generateVocabularyCard } = await import("@/lib/openai");
    const [first, second] = await Promise.all([
      generateVocabularyCard("Abandon"),
      generateVocabularyCard(" abandon ")
    ]);

    expect(first.normalizedWord).toBe("abandon");
    expect(second.normalizedWord).toBe("abandon");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(requestBody.max_completion_tokens).toBe(800);
    expect(requestBody.max_tokens).toBeUndefined();
    expect(requestBody.reasoning_effort).toBe("none");
    expect(requestBody.reasoning_format).toBeUndefined();
    expect(requestBody.response_format).toEqual({ type: "json_object" });
  });

  it("does not retry Groq 429 responses", async () => {
    generatedWordCache.findUnique.mockResolvedValue(null);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            type: "rate_limit_exceeded",
            message: "Rate limit reached on tokens per minute (TPM)."
          }
        }),
        {
          status: 429,
          headers: {
            "retry-after": "12",
            "x-ratelimit-remaining-tokens": "0",
            "x-ratelimit-reset-tokens": "12s"
          }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const { generateVocabularyCard } = await import("@/lib/openai");

    await expect(generateVocabularyCard("reluctant")).rejects.toMatchObject({
      code: "GROQ_RATE_LIMITED",
      details: {
        retryAfterSeconds: 12,
        limitType: "TPM"
      }
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses compact JSON object mode for Llama sentence checks", async () => {
    process.env.GROQ_SENTENCE_MODEL = "llama-3.1-8b-instant";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  score: 4,
                  correct: true,
                  feedback: "Почти правильно, нужен артикль.",
                  correctedSentence: "We use a gauge to put up a shelf."
                })
              },
              finish_reason: "stop"
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "x-ratelimit-remaining-requests": "14399",
            "x-ratelimit-remaining-tokens": "5500"
          }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const { checkVocabularySentence } = await import("@/lib/openai");
    await expect(
      checkVocabularySentence({
        word: "gauge",
        partOfSpeech: "noun",
        definitionEn: "An instrument for measuring something.",
        sentence: "We use gauge to put up a shelf."
      })
    ).resolves.toMatchObject({ score: 4, correct: true });

    const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(requestBody.max_completion_tokens).toBe(200);
    expect(requestBody.max_tokens).toBeUndefined();
    expect(requestBody.reasoning_format).toBeUndefined();
    expect(requestBody.response_format).toEqual({ type: "json_object" });
  });
});
