"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function StatsDeckSelect({ decks }: { decks: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("deckId") || "all";

  function change(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("deckId");
    else params.set("deckId", value);
    router.push(`/stats?${params.toString()}`);
  }

  return (
    <select
      value={selected}
      onChange={(event) => change(event.target.value)}
      className="focus-ring h-10 rounded-md border bg-background px-3 text-sm"
    >
      <option value="all">Все наборы</option>
      {decks.map((deck) => (
        <option key={deck.id} value={deck.id}>
          {deck.name}
        </option>
      ))}
    </select>
  );
}
