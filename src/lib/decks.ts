import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { endOfDayInTimeZone } from "@/lib/date";
import { safeInt } from "@/lib/utils";

export type DeckSort = "name" | "createdAt" | "lastActivity";

function deckOrderBy(sort: DeckSort): Prisma.DeckOrderByWithRelationInput[] {
  if (sort === "name") return [{ name: "asc" }];
  if (sort === "lastActivity") return [{ lastStudiedAt: "desc" }, { updatedAt: "desc" }];
  return [{ createdAt: "desc" }];
}

export async function assertDeckOwner(userId: string, deckId: string) {
  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId }
  });
  if (!deck) {
    throw new ApiError(404, "Набор не найден.", "DECK_NOT_FOUND");
  }
  return deck;
}

export async function listDeckSummaries(userId: string, sort: DeckSort, timezone: string) {
  const decks = await prisma.deck.findMany({
    where: { userId },
    orderBy: deckOrderBy(sort),
    include: {
      _count: {
        select: { cards: true }
      }
    }
  });

  if (decks.length === 0) return [];

  const deckIds = decks.map((deck) => deck.id);
  const todayEnd = endOfDayInTimeZone(new Date(), timezone);
  const [dueGroups, stateGroups] = await Promise.all([
    prisma.card.groupBy({
      by: ["deckId"],
      where: { deckId: { in: deckIds }, dueAt: { lte: todayEnd } },
      _count: { _all: true }
    }),
    prisma.card.groupBy({
      by: ["deckId", "state"],
      where: { deckId: { in: deckIds } },
      _count: { _all: true }
    })
  ]);

  const dueMap = new Map(dueGroups.map((group) => [group.deckId, group._count._all]));
  const matureMap = new Map<string, number>();
  for (const group of stateGroups) {
    if (group.state === "MATURE") {
      matureMap.set(group.deckId, group._count._all);
    }
  }

  return decks.map((deck) => {
    const total = deck._count.cards;
    const mature = matureMap.get(deck.id) ?? 0;
    return {
      ...deck,
      cardCount: total,
      dueTodayCount: dueMap.get(deck.id) ?? 0,
      progress: total > 0 ? Math.round((mature / total) * 100) : 0
    };
  });
}

export async function getDeckPageData(
  userId: string,
  deckId: string,
  searchParams: URLSearchParams,
  timezone: string
) {
  const deck = await assertDeckOwner(userId, deckId);
  const query = searchParams.get("q")?.trim() ?? "";
  const state = searchParams.get("state")?.trim() ?? "all";
  const page = safeInt(searchParams.get("page"), 1, 1, 10_000);
  const pageSize = 15;

  const where: Prisma.CardWhereInput = {
    deckId,
    ...(query
      ? {
          OR: [
            { word: { contains: query, mode: "insensitive" } },
            { normalizedWord: { contains: query.toLowerCase(), mode: "insensitive" } },
            { translations: { hasSome: [query.toLowerCase(), query] } }
          ]
        }
      : {}),
    ...(state !== "all" ? { state: state as Prisma.EnumCardStateFilter["equals"] } : {})
  };

  const now = new Date();
  const todayEnd = endOfDayInTimeZone(now, timezone);
  const [cards, totalCards, stateGroups, overdueCount, dueTodayCount] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.card.count({ where }),
    prisma.card.groupBy({
      by: ["state"],
      where: { deckId },
      _count: { _all: true }
    }),
    prisma.card.count({
      where: { deckId, dueAt: { lt: now }, state: { not: "NEW" } }
    }),
    prisma.card.count({
      where: { deckId, dueAt: { lte: todayEnd } }
    })
  ]);

  const stateCounts = {
    NEW: 0,
    LEARNING: 0,
    REVIEW: 0,
    RELEARNING: 0,
    MATURE: 0
  };
  for (const group of stateGroups) {
    stateCounts[group.state] = group._count._all;
  }

  return {
    deck,
    cards,
    totalCards,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCards / pageSize)),
    stateCounts,
    overdueCount,
    dueTodayCount
  };
}
