import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generatedCardSchema, type GeneratedCardInput } from "@/lib/schemas";
import { normalizeWord } from "@/lib/utils";
import { assertDeckOwner } from "@/lib/decks";

export async function findDuplicateCard(deckId: string, normalizedWord: string) {
  return prisma.card.findFirst({
    where: { deckId, normalizedWord },
    orderBy: { meaningIndex: "asc" }
  });
}

export async function createCardFromGenerated(
  userId: string,
  deckId: string,
  input: GeneratedCardInput & { allowDuplicate?: boolean }
) {
  await assertDeckOwner(userId, deckId);
  const payload = generatedCardSchema.parse(input);
  const normalizedWord = normalizeWord(payload.normalizedWord || payload.word);
  const existing = await findDuplicateCard(deckId, normalizedWord);

  if (existing && !input.allowDuplicate) {
    throw new ApiError(
      409,
      "Это слово уже добавлено в данный набор.",
      "DUPLICATE_CARD",
      { cardId: existing.id }
    );
  }

  const meaningIndex = existing
    ? ((await prisma.card.aggregate({
        where: { deckId, normalizedWord },
        _max: { meaningIndex: true }
      }))._max.meaningIndex ?? 0) + 1
    : 0;

  return prisma.card.create({
    data: {
      deckId,
      word: payload.word,
      normalizedWord,
      meaningIndex,
      partOfSpeech: payload.partOfSpeech,
      transcription: payload.transcription || null,
      translations: payload.translations,
      definitionEn: payload.definitionEn,
      examples: payload.examples
    }
  });
}

export async function assertCardOwner(userId: string, cardId: string) {
  const card = await prisma.card.findFirst({
    where: { id: cardId, deck: { userId } },
    include: { deck: true }
  });
  if (!card) {
    throw new ApiError(404, "Карточка не найдена.", "CARD_NOT_FOUND");
  }
  return card;
}

export async function updateCard(userId: string, cardId: string, data: Partial<GeneratedCardInput>) {
  await assertCardOwner(userId, cardId);
  const patch: Prisma.CardUpdateInput = {};
  if (data.word !== undefined) patch.word = data.word;
  if (data.normalizedWord !== undefined) patch.normalizedWord = normalizeWord(data.normalizedWord);
  if (data.partOfSpeech !== undefined) patch.partOfSpeech = data.partOfSpeech;
  if (data.transcription !== undefined) patch.transcription = data.transcription || null;
  if (data.translations !== undefined) patch.translations = data.translations;
  if (data.definitionEn !== undefined) patch.definitionEn = data.definitionEn;
  if (data.examples !== undefined) patch.examples = data.examples;

  return prisma.card.update({
    where: { id: cardId },
    data: patch
  });
}

export async function moveCard(userId: string, cardId: string, targetDeckId: string) {
  const card = await assertCardOwner(userId, cardId);
  await assertDeckOwner(userId, targetDeckId);
  const duplicate = await findDuplicateCard(targetDeckId, card.normalizedWord);
  if (duplicate) {
    throw new ApiError(
      409,
      "В целевом наборе уже есть такая карточка.",
      "DUPLICATE_CARD",
      { cardId: duplicate.id }
    );
  }

  return prisma.card.update({
    where: { id: cardId },
    data: { deckId: targetDeckId, meaningIndex: 0 }
  });
}

export async function resetCardProgress(userId: string, cardId: string) {
  await assertCardOwner(userId, cardId);
  return prisma.card.update({
    where: { id: cardId },
    data: {
      dueAt: new Date(),
      lastReviewedAt: null,
      state: "NEW",
      difficulty: 0,
      stability: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      learningSteps: 0,
      reps: 0,
      lapses: 0
    }
  });
}

export async function deleteCard(userId: string, cardId: string) {
  await assertCardOwner(userId, cardId);
  return prisma.card.delete({ where: { id: cardId } });
}
