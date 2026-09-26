import Link from "next/link";
import { Activity, BookOpen, Clock, GraduationCap, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InviteStudentForm } from "@/components/teacher/invite-student-form";
import { requireUser } from "@/lib/auth";
import { formatDateRu } from "@/lib/date";
import { listTeacherRelationships } from "@/lib/teacher";

function statusBadge(status: string) {
  if (status === "ACTIVE") return <Badge variant="success">подтвержден</Badge>;
  if (status === "PENDING") return <Badge variant="warning">ожидает</Badge>;
  if (status === "DECLINED") return <Badge variant="danger">отклонен</Badge>;
  return <Badge>отключен</Badge>;
}

export default async function TeacherPage() {
  const user = await requireUser();
  const relationships = await listTeacherRelationships(user.id);
  const activeStudents = relationships.filter((item) => item.status === "ACTIVE");
  const pendingStudents = relationships.filter((item) => item.status === "PENDING");
  const totals = {
    active: activeStudents.length,
    pending: pendingStudents.length,
    decks: activeStudents.reduce((sum, item) => sum + item.student.deckCount, 0),
    cards: activeStudents.reduce((sum, item) => sum + item.student.cardCount, 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Преподаватель</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Запрашивайте доступ к студентам, назначайте наборы и следите за прогрессом.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex min-h-28 flex-col justify-between p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">Студентов</div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-soft text-blue">
                <UsersRound className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-semibold">{totals.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex min-h-28 flex-col justify-between p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">Ожидают</div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-warning/10 text-warning">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-semibold">{totals.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex min-h-28 flex-col justify-between p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">Наборов</div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-semibold">{totals.decks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex min-h-28 flex-col justify-between p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">Карточек</div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-success/10 text-success">
                <GraduationCap className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-semibold">{totals.cards}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Добавить студента</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteStudentForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Студенты</CardTitle>
        </CardHeader>
        <CardContent>
          {relationships.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет запросов и подключенных студентов.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Студент</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Контент</TableHead>
                    <TableHead>Запрос</TableHead>
                    <TableHead className="w-40" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relationships.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="min-w-56">
                        <div className="font-medium">{item.student.name || "Без имени"}</div>
                        <div className="text-sm text-muted-foreground">{item.student.email}</div>
                      </TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell className="min-w-40">
                        {item.status === "ACTIVE" ? (
                          <div className="text-sm">
                            <div>{item.student.deckCount} наборов</div>
                            <div>{item.student.cardCount} карточек</div>
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Activity className="h-3.5 w-3.5" />
                              {item.student.hasActivity ? "есть активность" : "без повторений"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Доступ откроется после подтверждения.</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDateRu(item.requestedAt)}</TableCell>
                      <TableCell>
                        {item.status === "ACTIVE" ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/teacher/students/${item.student.id}`}>Открыть</Link>
                          </Button>
                        ) : null}
                      </TableCell>
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
