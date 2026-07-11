import { ReviewClient } from "@/components/review/review-client";
import { requireUser } from "@/lib/auth";
import { getOrCreateSettings } from "@/lib/settings";

export default async function ReviewPage({
  searchParams
}: {
  searchParams: Promise<{ deckId?: string }>;
}) {
  const user = await requireUser();
  const settings = await getOrCreateSettings(user.id, user.timezone);
  const params = await searchParams;

  return (
    <ReviewClient
      deckId={params.deckId}
      reviewMode={settings.reviewMode}
      pronunciationEnabled={settings.pronunciationEnabled}
    />
  );
}
