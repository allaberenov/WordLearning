import { apiOk, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { assertCardOwner, deleteCard, updateCard } from "@/lib/cards";
import { cardUpdateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ cardId: string }> };

export async function GET(_request: Request, context: Params) {
  try {
    const user = await requireApiUser();
    const { cardId } = await context.params;
    const card = await assertCardOwner(user.id, cardId);
    return apiOk({ card });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: Params) {
  try {
    const user = await requireApiUser();
    const { cardId } = await context.params;
    const input = await readJson(request, cardUpdateSchema, { maxBytes: 20_000 });
    const card = await updateCard(user.id, cardId, input);
    return apiOk({ card });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Params) {
  try {
    const user = await requireApiUser();
    const { cardId } = await context.params;
    await deleteCard(user.id, cardId);
    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
