import OpenAI, { APIConnectionError, APIConnectionTimeoutError, APIError } from "openai";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import {
  generatedCardSchema,
  sentenceCheckResultSchema,
  type GeneratedCardInput,
  type SentenceCheckResult
} from "@/lib/schemas";
import { normalizeWord } from "@/lib/utils";

export const vocabularyCardJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "word",
    "normalizedWord",
    "partOfSpeech",
    "transcription",
    "translations",
    "definitionEn",
    "examples"
  ],
  properties: {
    word: { type: "string", minLength: 1, maxLength: 160 },
    normalizedWord: { type: "string", minLength: 1, maxLength: 160 },
    partOfSpeech: { type: "string", minLength: 1, maxLength: 60 },
    transcription: { type: ["string", "null"], maxLength: 120 },
    translations: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: { type: "string", minLength: 1, maxLength: 80 }
    },
    definitionEn: { type: "string", minLength: 1, maxLength: 800 },
    examples: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["en", "ru"],
        properties: {
          en: { type: "string", minLength: 1, maxLength: 260 },
          ru: { type: "string", minLength: 1, maxLength: 320 }
        }
      }
    }
  }
} as const;

export const sentenceCheckJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "correct", "feedback", "correctedSentence"],
  properties: {
    score: { type: "integer", minimum: 1, maximum: 5 },
    correct: { type: "boolean" },
    feedback: { type: "string", minLength: 1, maxLength: 160 },
    correctedSentence: { type: ["string", "null"], maxLength: 500 }
  }
} as const;

const geminiVocabularyCardSchema = {
  type: "OBJECT",
  propertyOrdering: [
    "word",
    "normalizedWord",
    "partOfSpeech",
    "transcription",
    "translations",
    "definitionEn",
    "examples"
  ],
  required: [
    "word",
    "normalizedWord",
    "partOfSpeech",
    "transcription",
    "translations",
    "definitionEn",
    "examples"
  ],
  properties: {
    word: { type: "STRING" },
    normalizedWord: { type: "STRING" },
    partOfSpeech: { type: "STRING" },
    transcription: { type: "STRING" },
    translations: {
      type: "ARRAY",
      minItems: 1,
      maxItems: 6,
      items: { type: "STRING" }
    },
    definitionEn: { type: "STRING" },
    examples: {
      type: "ARRAY",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "OBJECT",
        propertyOrdering: ["en", "ru"],
        required: ["en", "ru"],
        properties: {
          en: { type: "STRING" },
          ru: { type: "STRING" }
        }
      }
    }
  }
} as const;

const geminiSentenceCheckSchema = {
  type: "OBJECT",
  propertyOrdering: ["score", "correct", "feedback", "correctedSentence"],
  required: ["score", "correct", "feedback", "correctedSentence"],
  properties: {
    score: { type: "INTEGER" },
    correct: { type: "BOOLEAN" },
    feedback: { type: "STRING" },
    correctedSentence: { type: "STRING", nullable: true }
  }
} as const;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ApiError(
      503,
      "OpenAI API не настроен. Добавьте OPENAI_API_KEY в переменные окружения.",
      "OPENAI_NOT_CONFIGURED"
    );
  }
  return new OpenAI({ apiKey });
}

function getModel() {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

function getProvider() {
  return (process.env.AI_PROVIDER || "openai").trim().toLowerCase();
}

function getOllamaBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
}

function getOllamaModel() {
  return process.env.OLLAMA_MODEL || "qwen3:4b-instruct";
}

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new ApiError(
      503,
      "Gemini API не настроен. Добавьте GEMINI_API_KEY в переменные окружения.",
      "GEMINI_NOT_CONFIGURED"
    );
  }
  return apiKey;
}

function getGeminiBaseUrl() {
  return (process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(
    /\/$/,
    ""
  );
}

function getGeminiModelPath() {
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  return model.startsWith("models/") ? model : `models/${model}`;
}

function getGroqApiKey() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new ApiError(
      503,
      "Groq API не настроен. Добавьте GROQ_API_KEY в переменные окружения.",
      "GROQ_NOT_CONFIGURED"
    );
  }
  return apiKey;
}

function getGroqBaseUrl() {
  return (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
}

function getGroqModel() {
  return process.env.GROQ_MODEL || "qwen/qwen3-32b";
}

function getProviderTimeoutMs() {
  return getProvider() === "ollama"
    ? Number(process.env.OLLAMA_TIMEOUT_MS || 60_000)
    : getProvider() === "gemini"
      ? Number(process.env.GEMINI_TIMEOUT_MS || 30_000)
      : getProvider() === "groq"
        ? Number(process.env.GROQ_TIMEOUT_MS || 20_000)
        : 20_000;
}

const systemPrompt = `
You create vocabulary cards for Russian-speaking learners of English.
Return only JSON that matches the provided schema.
Rules:
- Correct the English spelling if the user made a small typo.
- Treat phrasal verbs and fixed expressions as one whole expression.
- Use the most common meaning for polysemous words.
- Use simple, clear English in definitionEn.
- Avoid using the target word in definitionEn when it is reasonably possible.
- Provide natural, grammatical examples in two different contexts.
- Examples must match the selected part of speech.
- Provide exactly two examples.
- Russian translations must fit the concrete meaning and avoid rare, archaic wording.
- Russian translations must match the part of speech: adjectives as adjectives, verbs as infinitives, nouns as nouns.
- Avoid unnatural Russian participles or adverbs when a common dictionary equivalent exists.
- For idioms and fixed expressions, translate the idiomatic meaning, never the literal words.
- For "fall off the wagon", use meanings like "сорваться" or "вернуться к вредной привычке"; never use a literal phrase like "свалиться с колеса".
`.trim();

const sentenceCheckPrompt = `
You evaluate one learner-written English sentence for a Russian-speaking English learner.
Return only JSON that matches the provided schema.
Rules:
- Check whether the learner naturally and grammatically uses the target word or expression.
- The target word must match the given part of speech and definition.
- Minor punctuation or capitalization issues may still be correct.
- score: 1 means wrong or target is missing; 2 mostly wrong; 3 partly correct; 4 correct with minor issues; 5 natural and correct.
- correct is true only when the target word or expression is used with the intended meaning.
- feedback must be one friendly Russian phrase, no more than 20 words.
- correctedSentence must be one corrected English sentence when useful; otherwise null.
- Do not explain grammar rules. Do not add Markdown or prose outside JSON.
`.trim();

export function parseGeneratedCard(raw: string): GeneratedCardInput {
  const parsed = JSON.parse(extractJsonObject(raw)) as unknown;
  const validated = generatedCardSchema.parse(parsed);
  return {
    ...validated,
    normalizedWord: normalizeWord(validated.normalizedWord || validated.word),
    transcription: validated.transcription || null,
    translations: validated.translations.map((item) => item.trim()).filter(Boolean),
    examples: validated.examples.map((example) => ({
      en: example.en.trim(),
      ru: example.ru.trim()
    }))
  };
}

export function parseSentenceCheck(raw: string): SentenceCheckResult {
  const parsed = JSON.parse(extractJsonObject(raw)) as unknown;
  const validated = sentenceCheckResultSchema.parse(parsed);
  return {
    ...validated,
    feedback: validated.feedback.trim(),
    correctedSentence: validated.correctedSentence?.trim() || null
  };
}

function extractJsonObject(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return extractJsonObject(fenced[1]);

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function isStructuredOutputError(error: unknown) {
  return error instanceof SyntaxError || error instanceof ZodError;
}

function toSafeOpenAiError(error: unknown) {
  if (error instanceof APIConnectionTimeoutError) {
    return new ApiError(
      504,
      "OpenAI не ответил вовремя. Попробуйте еще раз.",
      "OPENAI_TIMEOUT"
    );
  }

  if (error instanceof APIConnectionError || error instanceof DOMException) {
    return new ApiError(
      502,
      "Не удалось подключиться к OpenAI. Проверьте сеть и повторите запрос.",
      "OPENAI_CONNECTION_ERROR"
    );
  }

  if (error instanceof APIError) {
    const status = error.status ?? 502;
    const message =
      status === 401
        ? "OpenAI отклонил ключ API. Проверьте OPENAI_API_KEY в .env."
        : status === 403
          ? "Нет доступа к выбранной модели OpenAI. Проверьте OPENAI_MODEL или права API-ключа."
          : status === 404
            ? "Выбранная модель OpenAI не найдена. Проверьте OPENAI_MODEL в .env."
            : status === 429
              ? "OpenAI ограничил частоту запросов или закончилась квота."
              : status === 400
                ? "OpenAI отклонил запрос. Проверьте модель и JSON Schema structured output."
                : "OpenAI вернул ошибку API. Подробности смотрите в консоли сервера.";

    console.error("OpenAI API error", {
      status,
      code: error.code,
      type: error.type,
      message: error.message
    });

    return new ApiError(status >= 500 ? 502 : status, message, "OPENAI_API_ERROR", {
      status,
      code: error.code,
      type: error.type
    });
  }

  return null;
}

type SentenceCheckInput = {
  word: string;
  partOfSpeech: string;
  definitionEn: string;
  sentence: string;
};

async function requestGeneratedCard(input: string, signal: AbortSignal) {
  if (getProvider() === "ollama") {
    return requestOllamaGeneratedCard(input, signal);
  }

  if (getProvider() === "gemini") {
    return requestGeminiGeneratedCard(input, signal);
  }

  if (getProvider() === "groq") {
    return requestGroqGeneratedCard(input, signal);
  }

  const client = getClient();
  const response = await client.responses.create(
    {
      model: getModel(),
      input: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `English word or expression: ${input}`
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "vocabulary_card",
          strict: true,
          schema: vocabularyCardJsonSchema
        }
      },
      max_output_tokens: 1200,
      temperature: 0.2
    },
    { signal }
  );

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error("OpenAI returned an empty response.");
  }
  return parseGeneratedCard(outputText);
}

function buildSentenceCheckUserPrompt(input: SentenceCheckInput) {
  return [
    `Target word or expression: ${input.word}`,
    `Part of speech: ${input.partOfSpeech}`,
    `Simple definition: ${input.definitionEn}`,
    `Learner sentence: ${input.sentence}`
  ].join("\n");
}

async function requestSentenceCheck(input: SentenceCheckInput, signal: AbortSignal) {
  if (getProvider() === "ollama") {
    return requestOllamaSentenceCheck(input, signal);
  }

  if (getProvider() === "gemini") {
    return requestGeminiSentenceCheck(input, signal);
  }

  if (getProvider() === "groq") {
    return requestGroqSentenceCheck(input, signal);
  }

  const client = getClient();
  const response = await client.responses.create(
    {
      model: getModel(),
      input: [
        { role: "system", content: sentenceCheckPrompt },
        {
          role: "user",
          content: buildSentenceCheckUserPrompt(input)
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "sentence_check",
          strict: true,
          schema: sentenceCheckJsonSchema
        }
      },
      max_output_tokens: 350,
      temperature: 0.1
    },
    { signal }
  );

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error("OpenAI returned an empty sentence check response.");
  }
  return parseSentenceCheck(outputText);
}

type JsonSchemaPayload = typeof vocabularyCardJsonSchema | typeof sentenceCheckJsonSchema;

type GroqResponseFormat =
  | {
      type: "json_schema";
      json_schema: {
        name: string;
        schema: JsonSchemaPayload;
        strict: boolean;
      };
    }
  | { type: "json_object" };

async function requestGroqGeneratedCard(input: string, signal: AbortSignal) {
  try {
    return await requestGroqGeneratedCardWithFormat(input, signal, {
      type: "json_schema",
      json_schema: {
        name: "vocabulary_card",
        schema: vocabularyCardJsonSchema,
        strict: true
      }
    });
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== "GROQ_STRUCTURED_OUTPUT_UNSUPPORTED") {
      throw error;
    }

    return requestGroqGeneratedCardWithFormat(input, signal, { type: "json_object" });
  }
}

async function requestGroqGeneratedCardWithFormat(
  input: string,
  signal: AbortSignal,
  responseFormat: GroqResponseFormat
) {
  const groqSystemPrompt = `${systemPrompt}

JSON schema:
${JSON.stringify(vocabularyCardJsonSchema)}

Return a single valid JSON object only. Do not use Markdown or prose outside JSON.
Use an empty string for transcription only if pronunciation is genuinely unknown.
The response must be JSON.
The "translations" field must contain natural Russian translations only.
Bad translation examples: "намерзший" for "reluctant", "намного" for "reluctant", adverbs for adjectives, rare literal calques.
Bad idiom translation examples: "свалиться с колеса" for "fall off the wagon".
Good translation examples: "неохотный", "не желающий", "склонный", "существенный", "поддерживать", "сорваться", "вернуться к вредной привычке".`;

  const response = await fetch(`${getGroqBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getGroqApiKey()}`
    },
    signal,
    body: JSON.stringify({
      model: getGroqModel(),
      messages: [
        {
          role: "system",
          content: groqSystemPrompt
        },
        {
          role: "user",
          content: `Create a vocabulary card for this English word or expression: ${input}`
        }
      ],
      response_format: responseFormat,
      reasoning_format: "hidden",
      temperature: 0.2,
      max_tokens: 1200
    })
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{
          message?: { content?: string };
          finish_reason?: string;
        }>;
        error?: { code?: string; type?: string; message?: string; failed_generation?: string };
        failed_generation?: string;
      }
    | null;

  if (!response.ok) {
    const message = payload?.error?.message || "";
    const structuredUnsupported =
      responseFormat.type === "json_schema" &&
      response.status === 400 &&
      /json_schema|structured|response_format/i.test(message);

    if (structuredUnsupported) {
      throw new ApiError(
        400,
        "Groq не поддерживает JSON Schema для выбранной модели, пробуем JSON mode.",
        "GROQ_STRUCTURED_OUTPUT_UNSUPPORTED"
      );
    }

    console.error("Groq API error", {
      status: response.status,
      code: payload?.error?.code,
      type: payload?.error?.type,
      message,
      failedGeneration: (payload?.error?.failed_generation || payload?.failed_generation)?.slice(0, 1000)
    });

    if (response.status === 400 && payload?.error?.code === "json_validate_failed") {
      throw new SyntaxError(`Groq returned invalid JSON: ${message}`);
    }

    const userMessage =
      response.status === 401 || response.status === 403
        ? "Groq отклонил API-ключ или доступ к модели. Проверьте GROQ_API_KEY и GROQ_MODEL."
        : response.status === 404
          ? "Модель Groq не найдена. Проверьте GROQ_MODEL."
          : response.status === 429
            ? "Groq ограничил частоту запросов или квоту."
            : response.status === 400
              ? "Groq отклонил запрос. Проверьте GROQ_MODEL и формат structured output."
              : "Groq вернул ошибку API. Подробности смотрите в консоли сервера.";

    throw new ApiError(response.status >= 500 ? 502 : response.status, userMessage, "GROQ_API_ERROR", {
      status: response.status,
      type: payload?.error?.type
    });
  }

  const outputText = payload?.choices?.[0]?.message?.content?.trim() || "";
  if (!outputText) {
    throw new Error("Groq returned an empty response.");
  }
  return parseGeneratedCard(outputText);
}

async function requestGroqSentenceCheck(input: SentenceCheckInput, signal: AbortSignal) {
  try {
    return await requestGroqSentenceCheckWithFormat(input, signal, {
      type: "json_schema",
      json_schema: {
        name: "sentence_check",
        schema: sentenceCheckJsonSchema,
        strict: true
      }
    });
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== "GROQ_STRUCTURED_OUTPUT_UNSUPPORTED") {
      throw error;
    }

    return requestGroqSentenceCheckWithFormat(input, signal, { type: "json_object" });
  }
}

async function requestGroqSentenceCheckWithFormat(
  input: SentenceCheckInput,
  signal: AbortSignal,
  responseFormat: GroqResponseFormat
) {
  const groqSystemPrompt = `${sentenceCheckPrompt}

JSON schema:
${JSON.stringify(sentenceCheckJsonSchema)}

Return a single valid JSON object only. The response must be JSON.`;

  const response = await fetch(`${getGroqBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getGroqApiKey()}`
    },
    signal,
    body: JSON.stringify({
      model: getGroqModel(),
      messages: [
        {
          role: "system",
          content: groqSystemPrompt
        },
        {
          role: "user",
          content: buildSentenceCheckUserPrompt(input)
        }
      ],
      response_format: responseFormat,
      reasoning_format: "hidden",
      temperature: 0.1,
      max_tokens: 350
    })
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{
          message?: { content?: string };
          finish_reason?: string;
        }>;
        error?: { code?: string; type?: string; message?: string; failed_generation?: string };
        failed_generation?: string;
      }
    | null;

  if (!response.ok) {
    const message = payload?.error?.message || "";
    const structuredUnsupported =
      responseFormat.type === "json_schema" &&
      response.status === 400 &&
      /json_schema|structured|response_format/i.test(message);

    if (structuredUnsupported) {
      throw new ApiError(
        400,
        "Groq не поддерживает JSON Schema для выбранной модели, пробуем JSON mode.",
        "GROQ_STRUCTURED_OUTPUT_UNSUPPORTED"
      );
    }

    console.error("Groq sentence check API error", {
      status: response.status,
      code: payload?.error?.code,
      type: payload?.error?.type,
      message,
      failedGeneration: (payload?.error?.failed_generation || payload?.failed_generation)?.slice(0, 1000)
    });

    if (response.status === 400 && payload?.error?.code === "json_validate_failed") {
      throw new SyntaxError(`Groq returned invalid sentence check JSON: ${message}`);
    }

    const userMessage =
      response.status === 401 || response.status === 403
        ? "Groq отклонил API-ключ или доступ к модели. Проверьте GROQ_API_KEY и GROQ_MODEL."
        : response.status === 404
          ? "Модель Groq не найдена. Проверьте GROQ_MODEL."
          : response.status === 429
            ? "Groq ограничил частоту запросов или квоту."
            : response.status === 400
              ? "Groq отклонил запрос проверки предложения."
              : "Groq вернул ошибку API. Подробности смотрите в консоли сервера.";

    throw new ApiError(response.status >= 500 ? 502 : response.status, userMessage, "GROQ_API_ERROR", {
      status: response.status,
      type: payload?.error?.type
    });
  }

  const outputText = payload?.choices?.[0]?.message?.content?.trim() || "";
  if (!outputText) {
    throw new Error("Groq returned an empty sentence check response.");
  }
  return parseSentenceCheck(outputText);
}

async function requestGeminiGeneratedCard(input: string, signal: AbortSignal) {
  const response = await fetch(`${getGeminiBaseUrl()}/${getGeminiModelPath()}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": getGeminiApiKey()
    },
    signal,
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: `${systemPrompt}

Return a single valid JSON object only. Do not use Markdown or prose outside JSON.
Use an empty string for transcription only if pronunciation is genuinely unknown.`
          }
        ]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Create a vocabulary card for this English word or expression: ${input}`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: geminiVocabularyCardSchema,
        temperature: 0.2,
        maxOutputTokens: 1200
      }
    })
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
        promptFeedback?: { blockReason?: string };
        error?: { code?: number; status?: string; message?: string };
      }
    | null;

  if (!response.ok) {
    console.error("Gemini API error", {
      status: response.status,
      code: payload?.error?.code,
      type: payload?.error?.status,
      message: payload?.error?.message
    });

    const message =
      response.status === 400
        ? "Gemini отклонил запрос. Проверьте GEMINI_MODEL и responseSchema."
        : response.status === 401 || response.status === 403
          ? "Gemini отклонил API-ключ или доступ к модели. Проверьте GEMINI_API_KEY и GEMINI_MODEL."
          : response.status === 404
            ? "Модель Gemini не найдена. Проверьте GEMINI_MODEL."
            : response.status === 429
              ? "Gemini ограничил частоту запросов или квоту."
              : "Gemini вернул ошибку API. Подробности смотрите в консоли сервера.";

    throw new ApiError(response.status >= 500 ? 502 : response.status, message, "GEMINI_API_ERROR", {
      status: response.status,
      type: payload?.error?.status
    });
  }

  if (payload?.promptFeedback?.blockReason) {
    throw new ApiError(
      400,
      "Gemini заблокировал запрос политиками безопасности.",
      "GEMINI_BLOCKED",
      { blockReason: payload.promptFeedback.blockReason }
    );
  }

  const outputText =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "";

  if (!outputText) {
    throw new Error("Gemini returned an empty response.");
  }

  return parseGeneratedCard(outputText);
}

async function requestGeminiSentenceCheck(input: SentenceCheckInput, signal: AbortSignal) {
  const response = await fetch(`${getGeminiBaseUrl()}/${getGeminiModelPath()}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": getGeminiApiKey()
    },
    signal,
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: `${sentenceCheckPrompt}

Return a single valid JSON object only. Do not use Markdown or prose outside JSON.`
          }
        ]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildSentenceCheckUserPrompt(input)
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: geminiSentenceCheckSchema,
        temperature: 0.1,
        maxOutputTokens: 350
      }
    })
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
        promptFeedback?: { blockReason?: string };
        error?: { code?: number; status?: string; message?: string };
      }
    | null;

  if (!response.ok) {
    console.error("Gemini sentence check API error", {
      status: response.status,
      code: payload?.error?.code,
      type: payload?.error?.status,
      message: payload?.error?.message
    });

    const message =
      response.status === 400
        ? "Gemini отклонил запрос проверки предложения."
        : response.status === 401 || response.status === 403
          ? "Gemini отклонил API-ключ или доступ к модели. Проверьте GEMINI_API_KEY и GEMINI_MODEL."
          : response.status === 404
            ? "Модель Gemini не найдена. Проверьте GEMINI_MODEL."
            : response.status === 429
              ? "Gemini ограничил частоту запросов или квоту."
              : "Gemini вернул ошибку API. Подробности смотрите в консоли сервера.";

    throw new ApiError(response.status >= 500 ? 502 : response.status, message, "GEMINI_API_ERROR", {
      status: response.status,
      type: payload?.error?.status
    });
  }

  if (payload?.promptFeedback?.blockReason) {
    throw new ApiError(
      400,
      "Gemini заблокировал запрос политиками безопасности.",
      "GEMINI_BLOCKED",
      { blockReason: payload.promptFeedback.blockReason }
    );
  }

  const outputText =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "";

  if (!outputText) {
    throw new Error("Gemini returned an empty sentence check response.");
  }

  return parseSentenceCheck(outputText);
}

async function requestOllamaGeneratedCard(input: string, signal: AbortSignal) {
  const response = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model: getOllamaModel(),
      stream: false,
      format: vocabularyCardJsonSchema,
      options: {
        temperature: 0.1,
        num_predict: 900
      },
      messages: [
        {
          role: "system",
          content: `${systemPrompt}

Return a single valid JSON object only. Do not use Markdown. Do not add tips, headings, comments, or prose outside JSON.
The "translations" field must contain natural Russian translations only.
Bad translation examples: "нехотящий" for "reluctant", adverbs for adjectives, rare literal calques.
Good translation examples: "неохотный", "не желающий", "склонный", "существенный", "поддерживать".`
        },
        {
          role: "user",
          content: `Create a vocabulary card for this English word or expression: ${input}`
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("Ollama API error", {
      status: response.status,
      body: text.slice(0, 1000)
    });
    throw new ApiError(
      response.status >= 500 ? 502 : response.status,
      response.status === 404
        ? "Модель Ollama не найдена. Выполните `ollama pull qwen3:4b-instruct` или проверьте OLLAMA_MODEL."
        : "Ollama вернула ошибку. Подробности смотрите в консоли сервера.",
      "OLLAMA_API_ERROR",
      { status: response.status }
    );
  }

  const payload = (await response.json()) as {
    message?: { content?: string };
    response?: string;
  };
  const outputText = payload.message?.content || payload.response;
  if (!outputText) {
    throw new Error("Ollama returned an empty response.");
  }
  return parseGeneratedCard(outputText);
}

async function requestOllamaSentenceCheck(input: SentenceCheckInput, signal: AbortSignal) {
  const response = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model: getOllamaModel(),
      stream: false,
      format: sentenceCheckJsonSchema,
      options: {
        temperature: 0.1,
        num_predict: 260
      },
      messages: [
        {
          role: "system",
          content: `${sentenceCheckPrompt}

Return a single valid JSON object only. Do not use Markdown, headings, comments, or prose outside JSON.`
        },
        {
          role: "user",
          content: buildSentenceCheckUserPrompt(input)
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("Ollama sentence check API error", {
      status: response.status,
      body: text.slice(0, 1000)
    });
    throw new ApiError(
      response.status >= 500 ? 502 : response.status,
      response.status === 404
        ? "Модель Ollama не найдена. Выполните `ollama pull qwen3:4b-instruct` или проверьте OLLAMA_MODEL."
        : "Ollama вернула ошибку проверки предложения. Подробности смотрите в консоли сервера.",
      "OLLAMA_API_ERROR",
      { status: response.status }
    );
  }

  const payload = (await response.json()) as {
    message?: { content?: string };
    response?: string;
  };
  const outputText = payload.message?.content || payload.response;
  if (!outputText) {
    throw new Error("Ollama returned an empty sentence check response.");
  }
  return parseSentenceCheck(outputText);
}

export async function generateVocabularyCard(input: string) {
  const normalizedInput = normalizeWord(input);
  const cached = await prisma.generatedWordCache.findUnique({
    where: { normalizedWord: normalizedInput }
  });

  if (cached) {
    return generatedCardSchema.parse(cached.payload);
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeoutMs = getProviderTimeoutMs();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const card = await requestGeneratedCard(input, controller.signal);
      const normalizedWord = normalizeWord(card.normalizedWord || card.word);
      const payload = { ...card, normalizedWord };

      await prisma.generatedWordCache.upsert({
        where: { normalizedWord },
        update: { payload },
        create: { normalizedWord, payload }
      });

      if (normalizedWord !== normalizedInput) {
        await prisma.generatedWordCache.upsert({
          where: { normalizedWord: normalizedInput },
          update: { payload },
          create: { normalizedWord: normalizedInput, payload }
        });
      }

      return payload;
    } catch (error) {
      lastError = error;
      const openAiError = toSafeOpenAiError(error);
      if (openAiError) {
        throw openAiError;
      }
      if (!isStructuredOutputError(error)) {
        console.error("Unexpected card generation error", error);
        break;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError instanceof ApiError) throw lastError;
  if (lastError instanceof ZodError) {
    console.error("OpenAI structured output validation error", lastError.flatten());
  } else if (lastError instanceof SyntaxError) {
    console.error("OpenAI returned invalid JSON", lastError.message);
  }
  throw new ApiError(
    502,
    "Не удалось получить корректную карточку от OpenAI. Попробуйте еще раз позже.",
    "OPENAI_INVALID_RESPONSE"
  );
}

export async function checkVocabularySentence(input: SentenceCheckInput) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getProviderTimeoutMs());
    try {
      return await requestSentenceCheck(input, controller.signal);
    } catch (error) {
      lastError = error;
      const openAiError = toSafeOpenAiError(error);
      if (openAiError) {
        throw openAiError;
      }
      if (!isStructuredOutputError(error)) {
        console.error("Unexpected sentence check error", error);
        break;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError instanceof ApiError) throw lastError;
  if (lastError instanceof ZodError) {
    console.error("Sentence check structured output validation error", lastError.flatten());
  } else if (lastError instanceof SyntaxError) {
    console.error("AI returned invalid sentence check JSON", lastError.message);
  }

  throw new ApiError(
    502,
    "Не удалось проверить предложение. Попробуйте еще раз позже.",
    "SENTENCE_CHECK_INVALID_RESPONSE"
  );
}
