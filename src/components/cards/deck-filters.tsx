"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DeckFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const state = searchParams.get("state") || "all";

  useEffect(() => {
    const currentQuery = searchParams.get("q") || "";
    if (query.trim() === currentQuery) return;

    const id = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      params.delete("page");
      router.push(`?${params.toString()}`);
    }, 350);
    return () => window.clearTimeout(id);
  }, [query, router, searchParams]);

  function changeState(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("state");
    else params.set("state", value);
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по слову или переводу"
          className="pl-9"
        />
      </div>
      <select
        value={state}
        onChange={(event) => changeState(event.target.value)}
        className="focus-ring h-10 rounded-md border border-input bg-background-secondary px-3 text-sm text-foreground hover:border-border-strong md:w-56"
      >
        <option value="all">Все статусы</option>
        <option value="NEW">Новые</option>
        <option value="LEARNING">Изучается</option>
        <option value="REVIEW">На повторении</option>
        <option value="RELEARNING">Переучивается</option>
        <option value="MATURE">Выучены</option>
      </select>
    </div>
  );
}
