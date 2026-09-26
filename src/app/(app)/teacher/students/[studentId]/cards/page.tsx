import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { formatDateRu } from "@/lib/date";
import { cardStateLabels } from "@/lib/labels";
import { getTeacherStudentCardsPageData } from "@/lib/teacher";

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

function pageHref(studentId: string, currentParams: URLSearchParams, page: number) {
  const nextParams = new URLSearchParams(currentParams.toString());
  if (page <= 1) nextParams.delete("page");
  else nextParams.set("page", String(page));
  const query = nextParams.toString();
  return `/teacher/students/${studentId}/cards${query ? `?${query}` : ""}`;
}

export default async function TeacherStudentCardsPage({
  params,
  searchParams
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { studentId } = await params;
  const queryParams = await searchParams;
  const urlParams = toSearchParams(queryParams);
  const data = await getTeacherStudentCardsPageData(user.id, studentId, urlParams);
  const pageStart =
    data.pagination.totalItems === 0
      ? 0
      : (data.pagination.page - 1) * data.pagination.pageSize + 1;
  const pageEnd = Math.min(
    data.pagination.totalItems,
    data.pagination.page * data.pagination.pageSize
  );
  const clearSearchHref = data.selectedDeck
    ? `/teacher/students/${studentId}/cards?deckId=${data.selectedDeck.id}`
    : `/teacher/students/${studentId}/cards`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-3">
            <Link href={`/teacher/students/${studentId}`}>
              <ArrowLeft className="h-4 w-4" />
              К обзору
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold">{data.selectedDeck ? "Слова набора" : "Карточки студента"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.student.name || data.student.email}
            {data.selectedDeck ? ` · ${data.selectedDeck.name}` : ""} · {data.pagination.totalItems} карточек
          </p>
        </div>
        {data.selectedDeck ? (
          <Button asChild variant="outline">
            <Link href={`/teacher/students/${studentId}/cards`}>Все карточки</Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Поиск</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-2 sm:flex-row">
            {data.selectedDeck ? <input type="hidden" name="deckId" value={data.selectedDeck.id} /> : null}
            <Input name="q" defaultValue={data.query} placeholder="Слово или перевод" />
            <Button>
              <Search className="h-4 w-4" />
              Найти
            </Button>
            {data.query ? (
              <Button asChild variant="outline">
                <Link href={clearSearchHref}>Сбросить</Link>
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Слова</CardTitle>
        </CardHeader>
        <CardContent>
          {data.cards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Карточки не найдены.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Слово</TableHead>
                    <TableHead>Набор</TableHead>
                    <TableHead>Перевод</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Ошибки</TableHead>
                    <TableHead>Создано</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.cards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="min-w-48">
                        <div className="font-medium">{card.word}</div>
                        <div className="text-xs text-muted-foreground">
                          {card.transcription || "без транскрипции"} · {card.partOfSpeech}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-48">
                        <div>{card.deck.name}</div>
                        {card.deck.assignedByTeacherId === user.id ? (
                          <div className="mt-1">
                            <Badge variant="teal">назначено вами</Badge>
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-72">
                        <span className="line-clamp-2 text-sm font-medium">{card.translations.join(", ")}</span>
                      </TableCell>
                      <TableCell>{cardStateLabels[card.state]}</TableCell>
                      <TableCell>{card.lapses}</TableCell>
                      <TableCell>{formatDateRu(card.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {data.pagination.totalItems > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            Показаны {pageStart}-{pageEnd} из {data.pagination.totalItems}. По {data.pagination.pageSize} карточек на странице.
          </div>
          {data.pagination.totalPages > 1 ? (
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className={data.pagination.page <= 1 ? "pointer-events-none opacity-50" : undefined}
                aria-disabled={data.pagination.page <= 1}
              >
                <Link href={pageHref(studentId, urlParams, Math.max(1, data.pagination.page - 1))}>Назад</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className={
                  data.pagination.page >= data.pagination.totalPages ? "pointer-events-none opacity-50" : undefined
                }
                aria-disabled={data.pagination.page >= data.pagination.totalPages}
              >
                <Link href={pageHref(studentId, urlParams, Math.min(data.pagination.totalPages, data.pagination.page + 1))}>
                  Вперед
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
