import { clamp } from "@/lib/utils";
import { addDays, differenceInWholeDays, formatIntervalRu } from "@/lib/date";

export type FsrsRating = "AGAIN" | "HARD" | "GOOD" | "EASY";
export type FsrsState = "NEW" | "LEARNING" | "REVIEW" | "RELEARNING" | "MATURE";

export type SchedulableCard = {
  state: FsrsState;
  difficulty: number;
  stability: number;
  dueAt: Date;
  lastReviewedAt: Date | null;
  scheduledDays: number;
  reps: number;
  lapses: number;
  learningSteps: number;
};

export type FsrsResult = {
  rating: FsrsRating;
  dueAt: Date;
  state: FsrsState;
  difficulty: number;
  stability: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  lapsesDelta: number;
};

const DECAY = -0.5;
const FACTOR = 19 / 81;

// FSRS-4.5 default parameter family. Keeping the weights explicit makes the
// scheduler deterministic and testable without coupling review logic to UI.
const W = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
  0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466
] as const;

const ratingValue: Record<FsrsRating, number> = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4
};

function retrievability(elapsedDays: number, stability: number) {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

function nextInterval(stability: number, desiredRetention: number) {
  const interval = (stability / FACTOR) * (Math.pow(desiredRetention, 1 / DECAY) - 1);
  return Math.max(1, Math.round(interval));
}

function initialStability(rating: FsrsRating) {
  const index = ratingValue[rating] - 1;
  return Math.max(0.1, W[index]);
}

function initialDifficulty(rating: FsrsRating) {
  return clamp(W[4] - Math.exp((ratingValue[rating] - 1) * W[5]) + 1, 1, 10);
}

function meanReversion(init: number, current: number) {
  return W[7] * init + (1 - W[7]) * current;
}

function nextDifficulty(previousDifficulty: number, rating: FsrsRating) {
  const current = previousDifficulty > 0 ? previousDifficulty : initialDifficulty("GOOD");
  const delta = -W[6] * (ratingValue[rating] - 3);
  return clamp(meanReversion(W[4], current + delta), 1, 10);
}

function nextRecallStability(
  previousDifficulty: number,
  previousStability: number,
  retrievabilityValue: number,
  rating: FsrsRating
) {
  const hardPenalty = rating === "HARD" ? W[15] : 1;
  const easyBonus = rating === "EASY" ? W[16] : 1;
  const growth =
    1 +
    Math.exp(W[8]) *
      (11 - previousDifficulty) *
      Math.pow(previousStability, -W[9]) *
      (Math.exp((1 - retrievabilityValue) * W[10]) - 1) *
      hardPenalty *
      easyBonus;

  return Math.max(0.1, previousStability * growth);
}

function nextForgetStability(
  previousDifficulty: number,
  previousStability: number,
  retrievabilityValue: number
) {
  return Math.max(
    0.1,
    W[11] *
      Math.pow(previousDifficulty, -W[12]) *
      (Math.pow(previousStability + 1, W[13]) - 1) *
      Math.exp((1 - retrievabilityValue) * W[14])
  );
}

function stateFromSchedule(rating: FsrsRating, currentState: FsrsState, scheduledDays: number) {
  if (rating === "AGAIN") {
    return currentState === "REVIEW" || currentState === "MATURE" ? "RELEARNING" : "LEARNING";
  }
  if (scheduledDays >= 21 && (rating === "GOOD" || rating === "EASY")) return "MATURE";
  return scheduledDays >= 1 ? "REVIEW" : "LEARNING";
}

function minutesFromRating(rating: FsrsRating) {
  if (rating === "AGAIN") return 5;
  if (rating === "HARD") return 15;
  return 0;
}

export function scheduleCard(
  card: SchedulableCard,
  rating: FsrsRating,
  now = new Date(),
  desiredRetention = 0.9
): FsrsResult {
  const elapsedDays = card.lastReviewedAt
    ? differenceInWholeDays(now, card.lastReviewedAt)
    : 0;
  const newCard = card.reps === 0 || card.stability <= 0 || card.difficulty <= 0;
  const difficulty = newCard
    ? initialDifficulty(rating)
    : nextDifficulty(card.difficulty, rating);

  let stability = newCard ? initialStability(rating) : card.stability;
  let scheduledDays = 0;
  let dueAt: Date;

  if (newCard) {
    stability = initialStability(rating);
    if (rating === "AGAIN" || rating === "HARD") {
      dueAt = new Date(now.getTime() + minutesFromRating(rating) * 60 * 1000);
    } else {
      scheduledDays = nextInterval(stability, desiredRetention);
      dueAt = addDays(now, scheduledDays);
    }
  } else {
    const memory = retrievability(elapsedDays, card.stability);
    stability =
      rating === "AGAIN"
        ? nextForgetStability(card.difficulty, card.stability, memory)
        : nextRecallStability(card.difficulty, card.stability, memory, rating);

    if (rating === "AGAIN") {
      dueAt = new Date(now.getTime() + minutesFromRating(rating) * 60 * 1000);
    } else if (rating === "HARD" && card.state === "LEARNING") {
      dueAt = new Date(now.getTime() + minutesFromRating(rating) * 60 * 1000);
    } else {
      scheduledDays = nextInterval(stability, desiredRetention);
      if (rating === "HARD") {
        scheduledDays = Math.max(1, Math.min(scheduledDays, Math.max(1, card.scheduledDays)));
      }
      dueAt = addDays(now, scheduledDays);
    }
  }

  const state = stateFromSchedule(rating, card.state, scheduledDays);
  const learningSteps =
    state === "LEARNING" || state === "RELEARNING" ? card.learningSteps + 1 : card.learningSteps;

  return {
    rating,
    dueAt,
    state,
    difficulty,
    stability,
    elapsedDays,
    scheduledDays,
    learningSteps,
    lapsesDelta: rating === "AGAIN" && card.reps > 0 ? 1 : 0
  };
}

export function previewRatings(
  card: SchedulableCard,
  now = new Date(),
  desiredRetention = 0.9
) {
  const ratings: FsrsRating[] = ["AGAIN", "HARD", "GOOD", "EASY"];
  return ratings.map((rating) => {
    const result = scheduleCard(card, rating, now, desiredRetention);
    return {
      rating,
      dueAt: result.dueAt,
      intervalLabel: formatIntervalRu(now, result.dueAt),
      scheduledDays: result.scheduledDays
    };
  });
}
