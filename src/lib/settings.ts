import { prisma } from "@/lib/prisma";

export async function getOrCreateSettings(userId: string, timezone = "UTC") {
  return prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      timezone,
      newCardsPerDay: 10,
      maxReviewsPerDay: 100,
      desiredRetention: 0.9,
      theme: "SYSTEM",
      reviewMode: "FLASHCARD",
      pronunciationEnabled: true,
      interfaceLanguage: "ru",
      newCardOrder: "CREATED_FIRST"
    }
  });
}
