"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DeckDialog } from "@/components/decks/deck-dialog";
import { Label } from "@/components/ui/label";

export function DeckToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") || "lastActivity";

  function setSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.push(`/decks?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Наборы карточек</h1>
        <p className="mt-1 text-sm text-muted-foreground">Слова, повторения и прогресс по каждому контексту.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Label htmlFor="deck-sort" className="text-muted-foreground">
            Сортировка
          </Label>
          <select
            id="deck-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="focus-ring h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="lastActivity">Последняя активность</option>
            <option value="createdAt">Дата создания</option>
            <option value="name">Название</option>
          </select>
        </div>
        <DeckDialog />
      </div>
    </div>
  );
}
