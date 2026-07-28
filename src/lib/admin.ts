import { redirect } from "next/navigation";
import type { CardState } from "@prisma/client";
import { addDays, endOfDayInTimeZone, startOfDayInTimeZone } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}

export async function requireAdminUser() {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) redirect("/profile");
  return user;
}

export async function getAdminOverview(timezone: string) {
  const now = new Date();
  const todayStart = startOfDayInTimeZone(now, timezone);
  const todayEnd = endOfDayInTimeZone(now, timezone);
  const thirtyDaysStart = startOfDayInTimeZone(addDays(now, -29), timezone);

  const [users, decks, reviewsToday, reviewGroupsLast30] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            decks: true,
            reviews: true
          }
        }
      }
    }),
    prisma.deck.findMany({
      orderBy: [{ lastStudiedAt: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        userId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        lastStudiedAt: true,
        _count: {
          select: {
            cards: true
          }
        }
      }
    }),
    prisma.review.groupBy({
      by: ["userId"],
      where: { reviewedAt: { gte: todayStart, lte: todayEnd } },
      _count: { _all: true },
      _max: { reviewedAt: true }
    }),
    prisma.review.groupBy({
      by: ["userId"],
      where: { reviewedAt: { gte: thirtyDaysStart, lte: todayEnd } },
      _count: { _all: true },
      _max: { reviewedAt: true }
    })
  ]);

  const deckIds = decks.map((deck) => deck.id);
  const cardGroups = deckIds.length
    ? await prisma.card.groupBy({
        by: ["deckId", "state"],
        where: { deckId: { in: deckIds } },
        _count: { _all: true }
      })
    : [];

  const decksByUser = new Map<string, typeof decks>();
  const deckOwner = new Map<string, string>();
  for (const deck of decks) {
    deckOwner.set(deck.id, deck.userId);
    const list = decksByUser.get(deck.userId) || [];
    list.push(deck);
    decksByUser.set(deck.userId, list);
  }

  const reviewTodayByUser = new Map(
    reviewsToday.map((group) => [group.userId, { count: group._count._all, lastReviewAt: group._max.reviewedAt }])
  );
  const reviewLast30ByUser = new Map(
    reviewGroupsLast30.map((group) => [group.userId, { count: group._count._all, lastReviewAt: group._max.reviewedAt }])
  );

  const cardCountsByUser = new Map<string, number>();
  const stateCountsByUser = new Map<string, Record<CardState, number>>();
  const emptyStateCounts = () => ({
    NEW: 0,
    LEARNING: 0,
    REVIEW: 0,
    RELEARNING: 0,
    MATURE: 0
  });

  for (const group of cardGroups) {
    const userId = deckOwner.get(group.deckId);
    if (!userId) continue;
    cardCountsByUser.set(userId, (cardCountsByUser.get(userId) || 0) + group._count._all);
    const counts = stateCountsByUser.get(userId) || emptyStateCounts();
    counts[group.state] += group._count._all;
    stateCountsByUser.set(userId, counts);
  }

  const usersSummary = users.map((user) => {
    const userDecks = decksByUser.get(user.id) || [];
    const reviews30 = reviewLast30ByUser.get(user.id);
    const reviewsDay = reviewTodayByUser.get(user.id);
    const lastDeckActivity = userDecks
      .map((deck) => deck.lastStudiedAt || deck.updatedAt)
      .sort((a, b) => b.getTime() - a.getTime())[0] || null;
    const activityDates = [reviews30?.lastReviewAt || null, lastDeckActivity].filter(
      (date): date is Date => date instanceof Date
    );
    const lastActivityAt = activityDates
      .sort((a, b) => b.getTime() - a.getTime())[0] || null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      createdAt: user.createdAt,
      deckCount: user._count.decks,
      cardCount: cardCountsByUser.get(user.id) || 0,
      reviewCount: user._count.reviews,
      reviewsToday: reviewsDay?.count || 0,
      reviewsLast30: reviews30?.count || 0,
      lastActivityAt,
      stateCounts: stateCountsByUser.get(user.id) || emptyStateCounts(),
      decks: userDecks.slice(0, 5).map((deck) => ({
        id: deck.id,
        name: deck.name,
        cardCount: deck._count.cards,
        lastStudiedAt: deck.lastStudiedAt
      }))
    };
  });

  return {
    totals: {
      users: users.length,
      decks: decks.length,
      cards: [...cardCountsByUser.values()].reduce((sum, count) => sum + count, 0),
      reviewsToday: reviewsToday.reduce((sum, group) => sum + group._count._all, 0),
      reviewsLast30: reviewGroupsLast30.reduce((sum, group) => sum + group._count._all, 0)
    },
    users: usersSummary
  };
}
