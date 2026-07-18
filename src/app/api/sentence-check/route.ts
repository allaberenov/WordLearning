import { apiOk, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { assertCardOwner } from "@/lib/cards";
import { checkVocabularySentence } from "@/lib/openai";
import { requireGenerationRateLimit } from "@/lib/rate-limit";
import { sentenceCheckRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = await readJson(request, sentenceCheckRequestSchema, { maxBytes: 2_000 });
    const card = await assertCardOwner(user.id, input.cardId);

    requireGenerationRateLimit(user.id, request);

    const result = await checkVocabularySentence({
      word: card.word,
      partOfSpeech: card.partOfSpeech,
      definitionEn: card.definitionEn,
      sentence: input.sentence
    });

    return apiOk({ result });
  } catch (error) {
    return handleApiError(error);
  }
}
