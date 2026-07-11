import { apiOk, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { moveCard } from "@/lib/cards";
import { cardMoveSchema } from "@/lib/schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ cardId: string }> };

export async function POST(request: Request, context: Params) {
  try {
    const user = await requireApiUser();
    const { cardId } = await context.params;
    const input = await readJson(request, cardMoveSchema, { maxBytes: 4_000 });
    const card = await moveCard(user.id, cardId, input.deckId);
    return apiOk({ card });
  } catch (error) {
    return handleApiError(error);
  }
}
