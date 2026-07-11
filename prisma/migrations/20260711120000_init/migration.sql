CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "CardState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'RELEARNING', 'MATURE');
CREATE TYPE "ReviewRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');
CREATE TYPE "ReviewMode" AS ENUM ('FLASHCARD', 'WRITE', 'MIXED');
CREATE TYPE "Theme" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');
CREATE TYPE "NewCardOrder" AS ENUM ('CREATED_FIRST', 'RANDOM');

CREATE TABLE "User" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "email" VARCHAR(320) NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" VARCHAR(120),
  "timezone" VARCHAR(80) NOT NULL DEFAULT 'UTC',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSettings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "newCardsPerDay" INTEGER NOT NULL DEFAULT 10,
  "maxReviewsPerDay" INTEGER NOT NULL DEFAULT 100,
  "desiredRetention" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
  "reviewMode" "ReviewMode" NOT NULL DEFAULT 'FLASHCARD',
  "theme" "Theme" NOT NULL DEFAULT 'SYSTEM',
  "timezone" VARCHAR(80) NOT NULL DEFAULT 'UTC',
  "interfaceLanguage" VARCHAR(16) NOT NULL DEFAULT 'ru',
  "pronunciationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "newCardOrder" "NewCardOrder" NOT NULL DEFAULT 'CREATED_FIRST',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Deck" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" VARCHAR(600),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastStudiedAt" TIMESTAMP(3),
  CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Card" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "deckId" TEXT NOT NULL,
  "word" VARCHAR(160) NOT NULL,
  "normalizedWord" VARCHAR(160) NOT NULL,
  "meaningIndex" INTEGER NOT NULL DEFAULT 0,
  "partOfSpeech" VARCHAR(60) NOT NULL,
  "transcription" VARCHAR(120),
  "translations" TEXT[],
  "definitionEn" VARCHAR(800) NOT NULL,
  "examples" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReviewedAt" TIMESTAMP(3),
  "state" "CardState" NOT NULL DEFAULT 'NEW',
  "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "stability" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "elapsedDays" INTEGER NOT NULL DEFAULT 0,
  "scheduledDays" INTEGER NOT NULL DEFAULT 0,
  "learningSteps" INTEGER NOT NULL DEFAULT 0,
  "reps" INTEGER NOT NULL DEFAULT 0,
  "lapses" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Review" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "cardId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" "ReviewRating" NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "previousDueAt" TIMESTAMP(3),
  "nextDueAt" TIMESTAMP(3) NOT NULL,
  "previousState" "CardState" NOT NULL,
  "nextState" "CardState" NOT NULL,
  "responseTimeMs" INTEGER,
  "elapsedDays" INTEGER NOT NULL,
  "scheduledDays" INTEGER NOT NULL,
  "difficulty" DOUBLE PRECISION NOT NULL,
  "stability" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GeneratedWordCache" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "normalizedWord" VARCHAR(160) NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GeneratedWordCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
CREATE INDEX "Deck_userId_name_idx" ON "Deck"("userId", "name");
CREATE INDEX "Deck_userId_createdAt_idx" ON "Deck"("userId", "createdAt");
CREATE INDEX "Deck_userId_lastStudiedAt_idx" ON "Deck"("userId", "lastStudiedAt");
CREATE UNIQUE INDEX "Card_deckId_normalizedWord_meaningIndex_key" ON "Card"("deckId", "normalizedWord", "meaningIndex");
CREATE INDEX "Card_deckId_state_idx" ON "Card"("deckId", "state");
CREATE INDEX "Card_deckId_dueAt_idx" ON "Card"("deckId", "dueAt");
CREATE INDEX "Card_normalizedWord_idx" ON "Card"("normalizedWord");
CREATE INDEX "Review_userId_reviewedAt_idx" ON "Review"("userId", "reviewedAt");
CREATE INDEX "Review_cardId_reviewedAt_idx" ON "Review"("cardId", "reviewedAt");
CREATE INDEX "Review_nextDueAt_idx" ON "Review"("nextDueAt");
CREATE UNIQUE INDEX "GeneratedWordCache_normalizedWord_key" ON "GeneratedWordCache"("normalizedWord");
CREATE INDEX "GeneratedWordCache_updatedAt_idx" ON "GeneratedWordCache"("updatedAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Card" ADD CONSTRAINT "Card_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
