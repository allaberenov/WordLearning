import { describe, expect, it } from "vitest";
import { previewRatings, scheduleCard, type SchedulableCard } from "@/lib/fsrs";

const now = new Date("2026-07-11T10:00:00.000Z");

function baseCard(overrides: Partial<SchedulableCard> = {}): SchedulableCard {
  return {
    state: "NEW",
    difficulty: 0,
    stability: 0,
    dueAt: now,
    lastReviewedAt: null,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    learningSteps: 0,
    ...overrides
  };
}

describe("FSRS scheduler", () => {
  it("schedules a new Again card as learning without a fixed day interval", () => {
    const result = scheduleCard(baseCard(), "AGAIN", now, 0.9);
    expect(result.state).toBe("LEARNING");
    expect(result.scheduledDays).toBe(0);
    expect(result.dueAt.getTime()).toBeGreaterThan(now.getTime());
    expect(result.difficulty).toBeGreaterThan(0);
    expect(result.stability).toBeGreaterThan(0);
  });

  it("gives Easy a longer interval than Good for a new card", () => {
    const good = scheduleCard(baseCard(), "GOOD", now, 0.9);
    const easy = scheduleCard(baseCard(), "EASY", now, 0.9);
    expect(easy.scheduledDays).toBeGreaterThan(good.scheduledDays);
  });

  it("updates a reviewed card and counts a lapse on Again", () => {
    const reviewed = baseCard({
      state: "REVIEW",
      difficulty: 6,
      stability: 10,
      reps: 4,
      scheduledDays: 8,
      lastReviewedAt: new Date("2026-07-01T10:00:00.000Z")
    });
    const result = scheduleCard(reviewed, "AGAIN", now, 0.9);
    expect(result.state).toBe("RELEARNING");
    expect(result.lapsesDelta).toBe(1);
    expect(result.elapsedDays).toBe(10);
  });

  it("previews all four ratings", () => {
    const previews = previewRatings(baseCard(), now, 0.9);
    expect(previews.map((item) => item.rating)).toEqual(["AGAIN", "HARD", "GOOD", "EASY"]);
    expect(previews.every((item) => item.intervalLabel.length > 0)).toBe(true);
  });
});
