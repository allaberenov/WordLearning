import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertDeckOwner } from "@/lib/decks";
import {
  addDays,
  endOfDayInTimeZone,
  getDateKey,
  startOfDayInTimeZone
} from "@/lib/date";

function getReviewWhere(userId: string, deckId?: string | null): Prisma.ReviewWhereInput {
  return {
    userId,
    ...(deckId ? { card: { deckId } } : {})
  };
}

function getCardWhere(userId: string, deckId?: string | null): Prisma.CardWhereInput {
  return deckId ? { deckId } : { deck: { userId } };
}

function buildStreaks(reviewDates: Date[], timezone: string) {
  const days = [...new Set(reviewDates.map((date) => getDateKey(date, timezone)))].sort();
  if (days.length === 0) return { currentStreak: 0, maxStreak: 0 };

  let maxStreak = 1;
  let currentRun = 1;
  for (let i = 1; i < days.length; i += 1) {
    const previous = new Date(`${days[i - 1]}T00:00:00.000Z`);
    const current = new Date(`${days[i]}T00:00:00.000Z`);
    if (Math.round((current.getTime() - previous.getTime()) / 86_400_000) === 1) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }
    maxStreak = Math.max(maxStreak, currentRun);
  }

  const todayKey = getDateKey(new Date(), timezone);
  const yesterdayKey = getDateKey(addDays(new Date(), -1), timezone);
  const lastDay = days[days.length - 1];
  const currentStreak = lastDay === todayKey || lastDay === yesterdayKey ? currentRun : 0;
  return { currentStreak, maxStreak };
}

export async function getStats(userId: string, timezone: string, deckId?: string | null) {
  if (deckId) await assertDeckOwner(userId, deckId);

  const now = new Date();
  const todayStart = startOfDayInTimeZone(now, timezone);
  const todayEnd = endOfDayInTimeZone(now, timezone);
  const thirtyDaysStart = startOfDayInTimeZone(addDays(now, -29), timezone);
  const forecastEnd = endOfDayInTimeZone(addDays(now, 6), timezone);

  const reviewWhere = getReviewWhere(userId, deckId);
  const cardWhere = getCardWhere(userId, deckId);

  const [
    learnedWords,
    newWords,
    reviewsToday,
    correctToday,
    incorrectToday,
    statusGroups,
    activityReviews,
    activityCards,
    forecastCards,
    allReviewDates
  ] = await Promise.all([
    prisma.card.count({ where: { ...cardWhere, state: "MATURE" } }),
    prisma.card.count({ where: { ...cardWhere, state: "NEW" } }),
    prisma.review.count({
      where: { ...reviewWhere, reviewedAt: { gte: todayStart, lte: todayEnd } }
    }),
    prisma.review.count({
      where: {
        ...reviewWhere,
        rating: { in: ["GOOD", "EASY"] },
        reviewedAt: { gte: todayStart, lte: todayEnd }
      }
    }),
    prisma.review.count({
      where: {
        ...reviewWhere,
        rating: { in: ["AGAIN", "HARD"] },
        reviewedAt: { gte: todayStart, lte: todayEnd }
      }
    }),
    prisma.card.groupBy({
      by: ["state"],
      where: cardWhere,
      _count: { _all: true }
    }),
    prisma.review.findMany({
      where: {
        ...reviewWhere,
        reviewedAt: { gte: thirtyDaysStart, lte: todayEnd }
      },
      select: { reviewedAt: true, rating: true, previousState: true, nextState: true },
      orderBy: { reviewedAt: "asc" }
    }),
    prisma.card.findMany({
      where: {
        ...cardWhere,
        createdAt: { gte: thirtyDaysStart, lte: todayEnd }
      },
      select: { createdAt: true }
    }),
    prisma.card.findMany({
      where: {
        ...cardWhere,
        dueAt: { gte: todayStart, lte: forecastEnd }
      },
      select: { dueAt: true }
    }),
    prisma.review.findMany({
      where: reviewWhere,
      select: { reviewedAt: true },
      orderBy: { reviewedAt: "asc" }
    })
  ]);

  const statusCounts = {
    NEW: 0,
    LEARNING: 0,
    REVIEW: 0,
    RELEARNING: 0,
    MATURE: 0
  };
  for (const group of statusGroups) {
    statusCounts[group.state] = group._count._all;
  }

  const activityMap = new Map<
    string,
    {
      date: string;
      count: number;
      newCards: number;
      reviews: number;
      learned: number;
      correct: number;
      incorrect: number;
    }
  >();
  for (let i = 0; i < 30; i += 1) {
    const date = getDateKey(addDays(thirtyDaysStart, i), timezone);
    activityMap.set(date, {
      date,
      count: 0,
      newCards: 0,
      reviews: 0,
      learned: 0,
      correct: 0,
      incorrect: 0
    });
  }
  for (const card of activityCards) {
    const key = getDateKey(card.createdAt, timezone);
    const day = activityMap.get(key);
    if (!day) continue;
    day.newCards += 1;
    day.count += 1;
  }
  for (const review of activityReviews) {
    const key = getDateKey(review.reviewedAt, timezone);
    const day = activityMap.get(key);
    if (!day) continue;
    day.reviews += 1;
    day.count += 1;
    if (review.rating === "GOOD" || review.rating === "EASY") day.correct += 1;
    if (review.rating === "AGAIN" || review.rating === "HARD") day.incorrect += 1;
    if (review.nextState === "MATURE" && review.previousState !== "MATURE") {
      day.learned += 1;
      day.count += 1;
    }
  }

  const forecastMap = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) {
    forecastMap.set(getDateKey(addDays(todayStart, i), timezone), 0);
  }
  for (const card of forecastCards) {
    const key = getDateKey(card.dueAt, timezone);
    forecastMap.set(key, (forecastMap.get(key) ?? 0) + 1);
  }

  const activity = [...activityMap.values()];
  const activityTotals = activity.reduce(
    (totals, day) => ({
      newCards: totals.newCards + day.newCards,
      reviews: totals.reviews + day.reviews,
      learned: totals.learned + day.learned,
      correct: totals.correct + day.correct,
      incorrect: totals.incorrect + day.incorrect
    }),
    { newCards: 0, reviews: 0, learned: 0, correct: 0, incorrect: 0 }
  );

  const totalRated = correctToday + incorrectToday;
  const retention = totalRated > 0 ? Math.round((correctToday / totalRated) * 100) : 0;
  const streaks = buildStreaks(
    allReviewDates.map((review) => review.reviewedAt),
    timezone
  );

  return {
    learnedWords,
    newWords,
    reviewsToday,
    correctToday,
    incorrectToday,
    retention,
    statusCounts,
    activity,
    activityTotals,
    forecast: [...forecastMap.entries()].map(([date, count]) => ({ date, count })),
    ...streaks
  };
}
