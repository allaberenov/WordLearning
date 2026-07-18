import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CardActions } from "@/components/cards/card-actions";
import { StatusBadge } from "@/components/cards/status-badge";
import { formatDateRu } from "@/lib/date";
import type { GeneratedCardInput } from "@/lib/schemas";

type CardRow = GeneratedCardInput & {
  id: string;
  createdAt: Date;
  dueAt: Date;
  state: string;
};

type DeckOption = {
  id: string;
  name: string;
};

export function CardTable({
  cards,
  decks
}: {
  cards: CardRow[];
  decks: DeckOption[];
}) {
  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card px-4 py-12 text-center">
        <h2 className="text-lg font-semibold">Карточки не найдены</h2>
        <p className="mt-2 text-sm text-muted-foreground">Измените фильтр или добавьте новое слово.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:hidden">
        {cards.map((card) => (
          <div key={card.id} className="rounded-lg border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/cards/${card.id}`} className="break-words font-semibold hover:text-primary">
                  {card.word}
                </Link>
                <div className="mt-1 text-xs text-muted-foreground">
                  {card.transcription || "без транскрипции"} · {card.partOfSpeech}
                </div>
              </div>
              <CardActions card={card} decks={decks} />
            </div>
            <div className="mt-3">
              <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Перевод</div>
                <div className="mt-1 text-sm font-medium text-foreground">{card.translations.join(", ")}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Статус</div>
                <div className="mt-1">
                  <StatusBadge state={card.state} />
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Следующее</div>
                <div className="mt-1 font-medium">{formatDateRu(card.dueAt)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-soft md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Слово</TableHead>
              <TableHead>Перевод</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Следующее повторение</TableHead>
              <TableHead>Создано</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((card) => (
              <TableRow key={card.id}>
                <TableCell>
                  <Link href={`/cards/${card.id}`} className="font-medium hover:underline">
                    {card.word}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {card.transcription || "без транскрипции"} · {card.partOfSpeech}
                  </div>
                </TableCell>
                <TableCell className="max-w-[260px]">
                  <span className="line-clamp-2 text-sm font-medium text-foreground">
                    {card.translations.join(", ")}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge state={card.state} />
                </TableCell>
                <TableCell>{formatDateRu(card.dueAt)}</TableCell>
                <TableCell>{formatDateRu(card.createdAt)}</TableCell>
                <TableCell>
                  <CardActions card={card} decks={decks} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
