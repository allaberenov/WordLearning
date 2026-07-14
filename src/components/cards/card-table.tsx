import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CardActions } from "@/components/cards/card-actions";
import { formatDateRu } from "@/lib/date";
import { cardStateLabels } from "@/lib/labels";
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

function stateVariant(state: string) {
  if (state === "MATURE") return "success" as const;
  if (state === "NEW") return "info" as const;
  if (state === "RELEARNING") return "danger" as const;
  if (state === "LEARNING") return "warning" as const;
  return "default" as const;
}

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
      <div className="overflow-x-auto rounded-lg border bg-card">
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
                  <span className="line-clamp-2">{card.translations.join(", ")}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={stateVariant(card.state)}>{cardStateLabels[card.state] || card.state}</Badge>
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
