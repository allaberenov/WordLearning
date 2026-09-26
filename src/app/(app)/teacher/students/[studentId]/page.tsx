import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { AssignmentDialog } from "@/components/teacher/assignment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
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
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/teacher/students/${studentId}/cards`}>
              <BookOpen className="h-4 w-4" />
              Карточки
            </Link>
          </Button>
          <AssignmentDialog studentId={studentId} />
        </div>
      </div>

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
                <Link
                  key={deck.id}
                  href={`/teacher/students/${studentId}/cards?deckId=${deck.id}`}
                  className="focus-ring block rounded-md border border-border bg-surface-elevated p-3 transition-colors hover:border-primary/50 hover:bg-surface-hover"
                  aria-label={`Открыть слова набора ${deck.name}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="break-words font-medium">{deck.name}</div>
                      {deck.description ? (
                        <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{deck.description}</div>
                      ) : null}
                    </div>
                    {deck.assignedByTeacherId === user.id ? <Badge variant="teal">назначен</Badge> : null}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
                    <div>
                      <div className="text-muted-foreground">Карточки</div>
                      <div className="font-semibold">{deck.cardCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Сегодня</div>
                      <div className="font-semibold">{deck.dueTodayCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Выучено</div>
                      <div className="font-semibold">{deck.learnedCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Осталось</div>
                      <div className="font-semibold">{deck.remainingCount}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
