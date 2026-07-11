import { apiOk, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { submitReview } from "@/lib/reviews";
import { submitReviewSchema } from "@/lib/schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ cardId: string }> };

export async function POST(request: Request, context: Params) {
  try {
    const user = await requireApiUser();
    const { cardId } = await context.params;
    const input = await readJson(request, submitReviewSchema, { maxBytes: 4_000 });
    const result = await submitReview(user.id, cardId, input.rating, input.responseTimeMs);
    return apiOk({ result });
  } catch (error) {
    return handleApiError(error);
  }
}
