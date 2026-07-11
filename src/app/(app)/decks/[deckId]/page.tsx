import Link from "next/link";
import { BookOpen, Clock, GraduationCap, Layers3, Play, PlusCircle, RotateCcw } from "lucide-react";
import { AddWordDialog } from "@/components/cards/add-word-dialog";
import { CardTable } from "@/components/cards/card-table";
import { DeckFilters } from "@/components/cards/deck-filters";
import { DeckDangerActions } from "@/components/decks/deck-danger-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getDeckPageData } from "@/lib/decks";
import { prisma } from "@/lib/prisma";
import { cardStateLabels } from "@/lib/labels";
import type { GeneratedCardInput } from "@/lib/schemas";

function toSearchParams(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value) {
      params.set(key, value);
    }
  }
  return params;
}

function normalizeExamples(value: unknown): GeneratedCardInput["examples"] {
  if (Array.isArray(value) && value.length === 2) {
    return value.map((item) => ({
      en: typeof item?.en === "string" ? item.en : "",
      ru: typeof item?.ru === "string" ? item.ru : ""
    })) as GeneratedCardInput["examples"];
  }
  return [
    { en: "", ru: "" },
    { en: "", ru: "" }
  ];
}

export default async function DeckPage({
  params,
  searchParams
}: {
  params: Promise<{ deckId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { deckId } = await params;
  const queryParams = await searchParams;
  const urlParams = toSearchParams(queryParams);
  const data = await getDeckPageData(
    user.id,
    deckId,
    urlParams,
    user.settings?.timezone || user.timezone || "UTC"
  );
  const decks = await prisma.deck.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  });

  const cards = data.cards.map((card) => ({
    id: card.id,
    word: card.word,
    normalizedWord: card.normalizedWord,
    partOfSpeech: card.partOfSpeech,
    transcription: card.transcription,
    translations: card.translations,
    definitionEn: card.definitionEn,
    examples: normalizeExamples(card.examples),
    createdAt: card.createdAt,
    dueAt: card.dueAt,
    state: card.state
  }));

  const summary = [
    { label: "Всего", value: data.totalCards, icon: Layers3 },
    { label: cardStateLabels.NEW, value: data.stateCounts.NEW, icon: PlusCircle },
    { label: cardStateLabels.LEARNING, value: data.stateCounts.LEARNING + data.stateCounts.RELEARNING, icon: RotateCcw },
    { label: cardStateLabels.REVIEW, value: data.stateCounts.REVIEW, icon: Clock },
    { label: "Просрочены", value: data.overdueCount, icon: BookOpen },
    { label: cardStateLabels.MATURE, value: data.stateCounts.MATURE, icon: GraduationCap }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-normal">{data.deck.name}</h1>
            {data.dueTodayCount > 0 ? <Badge variant="warning">{data.dueTodayCount} к повторению</Badge> : null}
          </div>
          {data.deck.description ? (
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{data.deck.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/review?deckId=${data.deck.id}`}>
              <Play className="h-4 w-4" />
              Начать повторение
            </Link>
          </Button>
          <AddWordDialog deckId={data.deck.id} />
          <DeckDangerActions deck={data.deck} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
                <div className="mt-2 text-2xl font-semibold">{item.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DeckFilters />
      <CardTable
        cards={cards}
        decks={decks}
        page={data.page}
        totalPages={data.totalPages}
        basePath={`/decks/${data.deck.id}`}
        searchParamsString={urlParams.toString()}
      />
    </div>
  );
}
