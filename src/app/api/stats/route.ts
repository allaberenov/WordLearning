import { apiOk, handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getStats } from "@/lib/stats";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const url = new URL(request.url);
    const deckId = url.searchParams.get("deckId");
    const stats = await getStats(
      user.id,
      user.settings?.timezone || user.timezone || "UTC",
      deckId
    );
    return apiOk({ stats });
  } catch (error) {
    return handleApiError(error);
  }
}
