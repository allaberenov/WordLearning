import Link from "next/link";
import { BookOpen, CalendarClock, Play, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeckDialog } from "@/components/decks/deck-dialog";
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
      <div className="grid place-items-center rounded-lg border border-dashed bg-card px-4 py-16 text-center">
        <div className="max-w-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-secondary">
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
        <Card key={deck.id} className="flex min-h-56 flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="leading-tight">
                  <Link href={`/decks/${deck.id}`} className="hover:underline">
                    {deck.name}
                  </Link>
                </CardTitle>
                {deck.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{deck.description}</p>
                ) : null}
              </div>
              {deck.dueTodayCount > 0 ? <Badge variant="warning">{deck.dueTodayCount} сегодня</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-secondary p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  Карточки
                </div>
                <div className="mt-1 text-xl font-semibold">{deck.cardCount}</div>
              </div>
              <div className="rounded-md bg-secondary p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
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
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary" style={{ width: `${deck.progress}%` }} />
              </div>
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
