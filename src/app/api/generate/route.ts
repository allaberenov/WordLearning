import { apiOk, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { assertDeckOwner } from "@/lib/decks";
import { findDuplicateCard } from "@/lib/cards";
import { generateVocabularyCard } from "@/lib/openai";
import { getClientIp, requireRateLimit } from "@/lib/rate-limit";
import { generateWordSchema } from "@/lib/schemas";
import { normalizeWord } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    requireRateLimit(`openai:${user.id}:${getClientIp(request)}`, 20, 24 * 60 * 60 * 1000);
    const input = await readJson(request, generateWordSchema, { maxBytes: 4_000 });
    await assertDeckOwner(user.id, input.deckId);

    const preDuplicate = await findDuplicateCard(input.deckId, normalizeWord(input.input));
    if (preDuplicate && !input.force) {
      return apiOk(
        {
          duplicate: {
            cardId: preDuplicate.id,
            word: preDuplicate.word
          },
          error: "Это слово уже добавлено в данный набор."
        },
        { status: 409 }
      );
    }

    const card = await generateVocabularyCard(input.input);
    const duplicate = await findDuplicateCard(input.deckId, normalizeWord(card.normalizedWord));
    return apiOk({
      card,
      duplicate: duplicate
        ? {
            cardId: duplicate.id,
            word: duplicate.word
          }
        : null
    });
  } catch (error) {
    return handleApiError(error);
  }
}
