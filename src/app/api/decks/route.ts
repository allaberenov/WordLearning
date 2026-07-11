import { apiOk, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { listDeckSummaries, type DeckSort } from "@/lib/decks";
import { prisma } from "@/lib/prisma";
import { deckCreateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const url = new URL(request.url);
    const sort = (url.searchParams.get("sort") || "lastActivity") as DeckSort;
    const decks = await listDeckSummaries(
      user.id,
      ["name", "createdAt", "lastActivity"].includes(sort) ? sort : "lastActivity",
      user.settings?.timezone || user.timezone || "UTC"
    );
    return apiOk({ decks });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = await readJson(request, deckCreateSchema, { maxBytes: 8_000 });
    const deck = await prisma.deck.create({
      data: {
        userId: user.id,
        name: input.name,
        description: input.description || null
      }
    });
    return apiOk({ deck }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
