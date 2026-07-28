import { Activity, BookOpen, Layers3, RotateCcw, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminOverview, requireAdminUser } from "@/lib/admin";
import { formatDateRu } from "@/lib/date";
import { cardStateLabels } from "@/lib/labels";

const metricCards = [
  { key: "users", label: "Пользователей", icon: UsersRound, tone: "text-blue bg-blue-soft" },
  { key: "decks", label: "Наборов", icon: BookOpen, tone: "text-primary bg-primary/10" },
  { key: "cards", label: "Карточек", icon: Layers3, tone: "text-success bg-success/10" },
  { key: "reviewsToday", label: "Повторов сегодня", icon: RotateCcw, tone: "text-warning bg-warning/10" },
  { key: "reviewsLast30", label: "Повторов за 30 дней", icon: Activity, tone: "text-blue bg-blue-soft" }
] as const;

export default async function AdminPage() {
  const admin = await requireAdminUser();
  const overview = await getAdminOverview(admin.settings?.timezone || admin.timezone || "UTC");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold">Админ-профиль</h1>
          <Badge variant="teal">admin</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Пользователи, наборы и активность приложения. Доступ ограничен серверной настройкой.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.key} className="transition-colors hover:border-border-strong">
              <CardContent className="flex min-h-28 flex-col justify-between p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">{metric.label}</div>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-md ${metric.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-semibold">{overview.totals[metric.key]}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Зарегистрированные пользователи</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пользователей пока нет.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Контент</TableHead>
                    <TableHead>Активность</TableHead>
                    <TableHead>Статусы</TableHead>
                    <TableHead>Наборы</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.users.map((user) => {
                    const mature = user.stateCounts.MATURE;
                    const progress = user.cardCount > 0 ? Math.round((mature / user.cardCount) * 100) : 0;
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="min-w-64 align-top">
                          <div className="font-medium">{user.name || "Без имени"}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Создан: {formatDateRu(user.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-40 align-top">
                          <div className="text-sm">
                            <span className="font-medium">{user.deckCount}</span> наборов
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">{user.cardCount}</span> карточек
                          </div>
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Выучено</span>
                              <span>{progress}%</span>
                            </div>
                            <ProgressBar value={progress} className="mt-1" />
                          </div>
                        </TableCell>
                        <TableCell className="min-w-44 align-top">
                          <div className="text-sm">
                            Сегодня: <span className="font-medium">{user.reviewsToday}</span>
                          </div>
                          <div className="text-sm">
                            30 дней: <span className="font-medium">{user.reviewsLast30}</span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Последняя: {formatDateRu(user.lastActivityAt)}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-56 align-top">
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(user.stateCounts).map(([state, count]) =>
                              count > 0 ? (
                                <Badge key={state} variant={state === "MATURE" ? "success" : "default"}>
                                  {cardStateLabels[state]}: {count}
                                </Badge>
                              ) : null
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-72 align-top">
                          {user.decks.length === 0 ? (
                            <span className="text-sm text-muted-foreground">Наборов нет</span>
                          ) : (
                            <div className="space-y-2">
                              {user.decks.map((deck) => (
                                <div key={deck.id} className="rounded-md border border-border bg-surface-elevated px-3 py-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{deck.name}</span>
                                    <span className="text-xs text-muted-foreground">{deck.cardCount} карт.</span>
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Последнее занятие: {formatDateRu(deck.lastStudiedAt)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
