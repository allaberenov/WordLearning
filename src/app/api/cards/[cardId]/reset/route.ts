import { apiOk, handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { resetCardProgress } from "@/lib/cards";

export const runtime = "nodejs";

type Params = { params: Promise<{ cardId: string }> };

export async function POST(_request: Request, context: Params) {
  try {
    const user = await requireApiUser();
    const { cardId } = await context.params;
    const card = await resetCardProgress(user.id, cardId);
    return apiOk({ card });
  } catch (error) {
    return handleApiError(error);
  }
}
