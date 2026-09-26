import Link from "next/link";
import { ArrowLeft, BarChart3, Check, GraduationCap, Layers3, RotateCcw, X } from "lucide-react";
import { AssignmentDialog } from "@/components/teacher/assignment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { formatDateRu } from "@/lib/date";
import { cardStateLabels } from "@/lib/labels";
import { getTeacherStudentPageData } from "@/lib/teacher";

export default async function TeacherStudentPage({
  params
}: {
  params: Promise<{ studentId: string }>;
}) {
  const user = await requireUser();
  const { studentId } = await params;
  const data = await getTeacherStudentPageData(
    user.id,
    studentId,
    user.settings?.timezone || user.timezone || "UTC"
  );
  const stats = data.stats;
  const totalCards = Object.values(stats.statusCounts).reduce((sum, count) => sum + count, 0);
  const metrics = [
    { label: "Изученных слов", value: stats.learnedWords, icon: GraduationCap, tone: "text-success bg-success/10" },
    { label: "Новых слов", value: stats.newWords, icon: Layers3, tone: "text-blue bg-blue-soft" },
    { label: "Повторений сегодня", value: stats.reviewsToday, icon: RotateCcw, tone: "text-primary bg-primary/10" },
    { label: "Правильных", value: stats.correctToday, icon: Check, tone: "text-success bg-success/10" },
    { label: "Неправильных", value: stats.incorrectToday, icon: X, tone: "text-destructive bg-destructive/10" },
    { label: "Удержание", value: `${stats.retention}%`, icon: BarChart3, tone: "text-blue bg-blue-soft" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-3">
            <Link href="/teacher">
              <ArrowLeft className="h-4 w-4" />
              К студентам
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold">{data.student.name || "Студент"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.student.email}</p>
        </div>
        <AssignmentDialog studentId={studentId} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardContent className="flex min-h-28 flex-col justify-between p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">{metric.label}</div>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-md ${metric.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-semibold">{metric.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Наборы студента</CardTitle>
          </CardHeader>
          <CardContent>
            {data.decks.length === 0 ? (
              <p className="text-sm text-muted-foreground">У студента пока нет наборов.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.decks.map((deck) => (
                  <div key={deck.id} className="rounded-md border border-border bg-surface-elevated p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{deck.name}</div>
                        {deck.description ? (
                          <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{deck.description}</div>
                        ) : null}
                      </div>
                      {deck.assignedByTeacherId === user.id ? <Badge variant="teal">назначен</Badge> : null}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Карточки</div>
                        <div className="font-semibold">{deck.cardCount}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Сегодня</div>
                        <div className="font-semibold">{deck.dueTodayCount}</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>Прогресс</span>
                        <span>{deck.progress}%</span>
                      </div>
                      <ProgressBar value={deck.progress} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Статусы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.statusCounts).map(([state, count]) => (
              <div key={state}>
                <div className="flex justify-between text-sm">
                  <span>{cardStateLabels[state]}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <ProgressBar value={Math.min(100, (count / Math.max(1, totalCards)) * 100)} className="mt-1" />
              </div>
            ))}
            <div className="rounded-md border border-border bg-surface-elevated p-3 text-sm">
              <div className="text-muted-foreground">Назначено вами</div>
              <div className="mt-1 text-xl font-semibold">{data.assignedDecksCount}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние карточки</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentCards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Карточек пока нет.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Слово</TableHead>
                    <TableHead>Набор</TableHead>
                    <TableHead>Перевод</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Создано</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentCards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell>
                        <div className="font-medium">{card.word}</div>
                        <div className="text-xs text-muted-foreground">{card.partOfSpeech}</div>
                      </TableCell>
                      <TableCell>
                        <div>{card.deck.name}</div>
                        {card.deck.assignedByTeacherId === user.id ? (
                          <div className="mt-1">
                            <Badge variant="teal">назначено вами</Badge>
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-64">
                        <span className="line-clamp-2">{card.translations.join(", ")}</span>
                      </TableCell>
                      <TableCell>{cardStateLabels[card.state]}</TableCell>
                      <TableCell>{formatDateRu(card.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Сложные слова</CardTitle>
        </CardHeader>
        <CardContent>
          {data.problemCards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ошибок пока нет.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.problemCards.map((card) => (
                <div key={card.id} className="rounded-md border border-border bg-surface-elevated p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{card.word}</div>
                      <div className="text-sm text-muted-foreground">{card.deck.name}</div>
                    </div>
                    <Badge variant="danger">{card.lapses} ошибок</Badge>
                  </div>
                  <div className="mt-2 text-sm">{card.translations.join(", ")}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
