import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    deck: {
      findFirst
    }
  }
}));

describe("ownership checks", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("returns a deck only when it belongs to the current user", async () => {
    findFirst.mockResolvedValue({ id: "deck-1", userId: "user-1", name: "Work English" });
    const { assertDeckOwner } = await import("@/lib/decks");
    const deck = await assertDeckOwner("user-1", "deck-1");
    expect(deck.id).toBe("deck-1");
    expect(findFirst).toHaveBeenCalledWith({ where: { id: "deck-1", userId: "user-1" } });
  });

  it("throws for a foreign or missing deck", async () => {
    findFirst.mockResolvedValue(null);
    const { assertDeckOwner } = await import("@/lib/decks");
    await expect(assertDeckOwner("user-1", "deck-2")).rejects.toMatchObject({ status: 404 });
  });
});
