import { DeckGrid } from "@/components/decks/deck-grid";
import { DeckToolbar } from "@/components/decks/deck-toolbar";
import { requireUser } from "@/lib/auth";
import { listDeckSummaries, type DeckSort } from "@/lib/decks";

export default async function DecksPage({
  searchParams
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const sort = (params.sort || "lastActivity") as DeckSort;
  const decks = await listDeckSummaries(
    user.id,
    ["name", "createdAt", "lastActivity"].includes(sort) ? sort : "lastActivity",
    user.settings?.timezone || user.timezone || "UTC"
  );

  return (
    <div className="space-y-6">
      <DeckToolbar />
      <DeckGrid decks={decks} />
    </div>
  );
}
