import type { Card, UserSettings } from "@prisma/client";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { startOfDayInTimeZone, endOfDayInTimeZone } from "@/lib/date";
import { previewRatings, scheduleCard, type FsrsRating, type SchedulableCard } from "@/lib/fsrs";
import { assertDeckOwner } from "@/lib/decks";
import { getOrCreateSettings } from "@/lib/settings";

function toSchedulableCard(card: Card): SchedulableCard {
  return {
    state: card.state,
    difficulty: card.difficulty,
    stability: card.stability,
    dueAt: card.dueAt,
    lastReviewedAt: card.lastReviewedAt,
    scheduledDays: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    learningSteps: card.learningSteps
  };
}

async function getTodayReviewCount(userId: string, timezone: string) {
  const now = new Date();
  return prisma.review.count({
    where: {
      userId,
      reviewedAt: {
        gte: startOfDayInTimeZone(now, timezone),
        lte: endOfDayInTimeZone(now, timezone)
      }
    }
  });
}

async function getTodayNewReviewCount(userId: string, timezone: string) {
  const now = new Date();
  return prisma.review.count({
    where: {
      userId,
      previousState: "NEW",
      reviewedAt: {
        gte: startOfDayInTimeZone(now, timezone),
        lte: endOfDayInTimeZone(now, timezone)
      }
    }
  });
}

function serializeCardForReview(card: Card, settings: UserSettings, now: Date) {
  return {
    id: card.id,
    word: card.word,
    normalizedWord: card.normalizedWord,
    partOfSpeech: card.partOfSpeech,
    transcription: card.transcription,
    translations: card.translations,
    definitionEn: card.definitionEn,
    examples: card.examples,
    state: card.state,
    previews: previewRatings(toSchedulableCard(card), now, settings.desiredRetention)
  };
}

export async function getNextReviewCard(userId: string, deckId?: string | null) {
  if (deckId) await assertDeckOwner(userId, deckId);

  const settings = await getOrCreateSettings(userId);
  const timezone = settings.timezone || "UTC";
  const now = new Date();
  const reviewedToday = await getTodayReviewCount(userId, timezone);
  if (reviewedToday >= settings.maxReviewsPerDay) {
    return { card: null, reason: "limit" as const };
  }

  const deckFilter = deckId ? { deckId } : { deck: { userId } };
  const dueCard = await prisma.card.findFirst({
    where: {
      ...deckFilter,
      state: { not: "NEW" },
      dueAt: { lte: now }
    },
    orderBy: [{ dueAt: "asc" }, { lastReviewedAt: "asc" }]
  });

  if (dueCard) {
    return { card: serializeCardForReview(dueCard, settings, now), reason: null };
  }

  const newToday = await getTodayNewReviewCount(userId, timezone);
  const newRemaining = Math.max(0, settings.newCardsPerDay - newToday);
  if (newRemaining <= 0) {
    return { card: null, reason: "new-limit" as const };
  }

  const newCards = await prisma.card.findMany({
    where: {
      ...deckFilter,
      state: "NEW",
      dueAt: { lte: now }
    },
    orderBy: [{ createdAt: "asc" }],
    take: settings.newCardOrder === "RANDOM" ? Math.min(20, newRemaining + 20) : 1
  });

  const newCard =
    settings.newCardOrder === "RANDOM" && newCards.length > 0
      ? newCards[Math.floor(Math.random() * newCards.length)]
      : newCards[0];

  if (!newCard) {
    return { card: null, reason: "empty" as const };
  }

  return { card: serializeCardForReview(newCard, settings, now), reason: null };
}

export async function submitReview(
  userId: string,
  cardId: string,
  rating: FsrsRating,
  responseTimeMs?: number
) {
  const card = await prisma.card.findFirst({
    where: { id: cardId, deck: { userId } },
    include: { deck: true }
  });

  if (!card) {
    throw new ApiError(404, "Карточка не найдена.", "CARD_NOT_FOUND");
  }

  const now = new Date();
  if (
    card.dueAt > now &&
    card.lastReviewedAt &&
    now.getTime() - card.lastReviewedAt.getTime() < 30_000
  ) {
    throw new ApiError(409, "Ответ по этой карточке уже сохранен.", "REVIEW_ALREADY_SAVED");
  }

  const settings = await getOrCreateSettings(userId);
  const result = scheduleCard(toSchedulableCard(card), rating, now, settings.desiredRetention);

  await prisma.$transaction([
    prisma.card.update({
      where: { id: card.id },
      data: {
        dueAt: result.dueAt,
        lastReviewedAt: now,
        state: result.state,
        difficulty: result.difficulty,
        stability: result.stability,
        elapsedDays: result.elapsedDays,
        scheduledDays: result.scheduledDays,
        learningSteps: result.learningSteps,
        reps: { increment: 1 },
        lapses: { increment: result.lapsesDelta }
      }
    }),
    prisma.review.create({
      data: {
        cardId: card.id,
        userId,
        rating,
        reviewedAt: now,
        previousDueAt: card.dueAt,
        nextDueAt: result.dueAt,
        previousState: card.state,
        nextState: result.state,
        responseTimeMs,
        elapsedDays: result.elapsedDays,
        scheduledDays: result.scheduledDays,
        difficulty: result.difficulty,
        stability: result.stability
      }
    }),
    prisma.deck.update({
      where: { id: card.deckId },
      data: { lastStudiedAt: now }
    })
  ]);

  return result;
}
