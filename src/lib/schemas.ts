import { z } from "zod";

export const emailSchema = z.string().email("Введите корректный email").max(320);
export const passwordSchema = z
  .string()
  .min(8, "Минимум 8 символов")
  .max(128, "Слишком длинный пароль");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().max(120).optional().or(z.literal(""))
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128)
});

export const deckCreateSchema = z.object({
  name: z.string().trim().min(1, "Название обязательно").max(120),
  description: z.string().trim().max(600).optional().or(z.literal(""))
});

export const deckUpdateSchema = deckCreateSchema.partial();

export const generateWordSchema = z.object({
  deckId: z.string().uuid(),
  input: z.string().trim().min(1).max(160),
  force: z.boolean().optional().default(false)
});

export const generatedExampleSchema = z.object({
  en: z.string().trim().min(1).max(260),
  ru: z.string().trim().min(1).max(320)
});

export const generatedCardSchema = z.object({
  word: z.string().trim().min(1).max(160),
  normalizedWord: z.string().trim().min(1).max(160),
  partOfSpeech: z.string().trim().min(1).max(60),
  transcription: z.string().trim().max(120).optional().nullable(),
  translations: z.array(z.string().trim().min(1).max(80)).min(1).max(6),
  definitionEn: z.string().trim().min(1).max(800),
  examples: z.array(generatedExampleSchema).length(2)
});

export const saveCardSchema = generatedCardSchema.extend({
  deckId: z.string().uuid(),
  allowDuplicate: z.boolean().default(false).optional()
});

export const cardUpdateSchema = generatedCardSchema.partial().extend({
  deckId: z.string().uuid().optional()
});

export const cardMoveSchema = z.object({
  deckId: z.string().uuid()
});

export const reviewRatingSchema = z.enum(["AGAIN", "HARD", "GOOD", "EASY"]);

export const submitReviewSchema = z.object({
  rating: reviewRatingSchema,
  responseTimeMs: z.number().int().min(0).max(10 * 60 * 1000).optional()
});

export const settingsSchema = z.object({
  newCardsPerDay: z.number().int().min(0).max(200),
  maxReviewsPerDay: z.number().int().min(1).max(1000),
  desiredRetention: z.number().min(0.7).max(0.98),
  reviewMode: z.enum(["FLASHCARD", "WRITE", "MIXED"]),
  theme: z.enum(["SYSTEM", "LIGHT", "DARK"]),
  timezone: z.string().trim().min(1).max(80),
  interfaceLanguage: z.string().trim().min(2).max(16),
  pronunciationEnabled: z.boolean(),
  newCardOrder: z.enum(["CREATED_FIRST", "RANDOM"])
});

export type GeneratedCardInput = z.infer<typeof generatedCardSchema>;
