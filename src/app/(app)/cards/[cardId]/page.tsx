import Link from "next/link";
import { ArrowLeft, CalendarClock, Repeat2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FlipRevealCard } from "@/components/cards/flip-reveal-card";
import { requireUser } from "@/lib/auth";
import { assertCardOwner } from "@/lib/cards";
import { formatDateRu } from "@/lib/date";
import { cardStateLabels, ratingLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

function normalizeExamples(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => ({
      en: typeof item?.en === "string" ? item.en : "",
      ru: typeof item?.ru === "string" ? item.ru : ""
    }));
  }
  return [];
}

export default async function CardPage({ params }: { params: Promise<{ cardId: string }> }) {
  const user = await requireUser();
  const { cardId } = await params;
  const card = await assertCardOwner(user.id, cardId);
  const reviews = await prisma.review.findMany({
    where: { cardId: card.id, userId: user.id },
    orderBy: { reviewedAt: "desc" },
    take: 20
  });
  const examples = normalizeExamples(card.examples);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost">
        <Link href={`/decks/${card.deckId}`}>
          <ArrowLeft className="h-4 w-4" />
          К набору
        </Link>
      </Button>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-3xl">{card.word}</CardTitle>
                <p className="mt-2 text-muted-foreground">
                  {card.transcription || "без транскрипции"} · {card.partOfSpeech}
                </p>
              </div>
              <Badge>{cardStateLabels[card.state]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[minmax(220px,0.75fr)_1fr]">
              <FlipRevealCard
                front={
                  <span>
                    {card.word}
                    <span className="mt-2 block text-sm font-normal text-muted-foreground">
                      {card.transcription || "без транскрипции"} · {card.partOfSpeech}
                    </span>
                  </span>
                }
                back={<span>{card.translations.join(", ")}</span>}
                frontLabel="Word"
                backLabel="Перевод"
              />
              <FlipRevealCard
                front={<span>{card.definitionEn}</span>}
                back={<span>{card.translations.join(", ")}</span>}
                frontLabel="Definition"
                backLabel="Значение"
              />
            </div>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Примеры</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {examples.map((example, index) => (
                  <FlipRevealCard
                    key={index}
                    front={<span>{example.en}</span>}
                    back={<span>{example.ru}</span>}
                    frontLabel={`Example ${index + 1}`}
                    backLabel="Перевод"
                  />
                ))}
              </div>
            </section>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                Следующее повторение
              </div>
              <div className="text-xl font-semibold">{formatDateRu(card.dueAt)}</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-secondary p-3">
                  <div className="text-muted-foreground">Повторы</div>
                  <div className="text-lg font-semibold">{card.reps}</div>
                </div>
                <div className="rounded-md bg-secondary p-3">
                  <div className="text-muted-foreground">Ошибки</div>
                  <div className="text-lg font-semibold">{card.lapses}</div>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href={`/review?deckId=${card.deckId}`}>
                  <Repeat2 className="h-4 w-4" />
                  Повторять набор
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>История повторений</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Эту карточку еще не повторяли.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Ответ</TableHead>
                    <TableHead>Следующее повторение</TableHead>
                    <TableHead>Состояние</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>{formatDateRu(review.reviewedAt)}</TableCell>
                      <TableCell>{ratingLabels[review.rating]}</TableCell>
                      <TableCell>{formatDateRu(review.nextDueAt)}</TableCell>
                      <TableCell>{cardStateLabels[review.nextState]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
