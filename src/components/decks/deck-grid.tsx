import Link from "next/link";
import { BookOpen, CalendarClock, Play, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeckDialog } from "@/components/decks/deck-dialog";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatDateRu } from "@/lib/date";

export type DeckSummary = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastStudiedAt: Date | null;
  cardCount: number;
  dueTodayCount: number;
  progress: number;
};

export function DeckGrid({ decks }: { decks: DeckSummary[] }) {
  if (decks.length === 0) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed border-border-strong bg-card px-4 py-16 text-center shadow-soft">
        <div className="max-w-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-blue-soft text-blue">
            <Plus className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Пока нет наборов</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Создайте первый набор и добавьте слова для интервальных повторений.
          </p>
          <div className="mt-5">
            <DeckDialog />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {decks.map((deck) => (
        <Card
          key={deck.id}
          className="flex min-h-60 flex-col transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lift"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="leading-tight">
                  <Link href={`/decks/${deck.id}`} className="break-words hover:text-primary">
                    {deck.name}
                  </Link>
                </CardTitle>
                {deck.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{deck.description}</p>
                ) : null}
              </div>
              <Badge variant={deck.dueTodayCount > 0 ? "warning" : "teal"} className="shrink-0">
                {deck.dueTodayCount} сегодня
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-border bg-surface-elevated p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4 text-blue" />
                  Карточки
                </div>
                <div className="mt-1 text-xl font-semibold">{deck.cardCount}</div>
              </div>
              <div className="rounded-md border border-border bg-surface-elevated p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  Активность
                </div>
                <div className="mt-1 text-sm font-medium">{formatDateRu(deck.lastStudiedAt || deck.updatedAt)}</div>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Прогресс</span>
                <span className="font-medium">{deck.progress}%</span>
              </div>
              <ProgressBar value={deck.progress} />
            </div>
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link href={`/review?deckId=${deck.id}`}>
                  <Play className="h-4 w-4" />
                  Начать повторение
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href={`/decks/${deck.id}`}>Открыть</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
