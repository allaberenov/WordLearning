import { apiOk, handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getNextReviewCard } from "@/lib/reviews";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const url = new URL(request.url);
    const deckId = url.searchParams.get("deckId");
    const result = await getNextReviewCard(user.id, deckId);
    return apiOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
