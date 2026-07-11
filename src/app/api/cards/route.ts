import { apiOk, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { createCardFromGenerated } from "@/lib/cards";
import { saveCardSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = await readJson(request, saveCardSchema, { maxBytes: 20_000 });
    const card = await createCardFromGenerated(user.id, input.deckId, input);
    return apiOk({ card }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
