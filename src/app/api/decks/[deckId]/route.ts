import { apiOk, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { assertDeckOwner } from "@/lib/decks";
import { prisma } from "@/lib/prisma";
import { deckUpdateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ deckId: string }> };

export async function GET(_request: Request, context: Params) {
  try {
    const user = await requireApiUser();
    const { deckId } = await context.params;
    const deck = await assertDeckOwner(user.id, deckId);
    return apiOk({ deck });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: Params) {
  try {
    const user = await requireApiUser();
    const { deckId } = await context.params;
    await assertDeckOwner(user.id, deckId);
    const input = await readJson(request, deckUpdateSchema, { maxBytes: 8_000 });
    const deck = await prisma.deck.update({
      where: { id: deckId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {})
      }
    });
    return apiOk({ deck });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Params) {
  try {
    const user = await requireApiUser();
    const { deckId } = await context.params;
    await assertDeckOwner(user.id, deckId);
    await prisma.deck.delete({ where: { id: deckId } });
    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
