import { BarChart3, Check, Flame, GraduationCap, RotateCcw, TrendingUp, X } from "lucide-react";
import { StatsDeckSelect } from "@/components/stats/stats-deck-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireUser } from "@/lib/auth";
import { getStats } from "@/lib/stats";
import { prisma } from "@/lib/prisma";
import { cardStateLabels } from "@/lib/labels";

function intensity(count: number) {
  if (count === 0) return "bg-background-secondary";
  if (count < 3) return "bg-blue-soft";
  if (count < 7) return "bg-primary/50";
  return "bg-primary";
}

export default async function StatsPage({
  searchParams
}: {
  searchParams: Promise<{ deckId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const timezone = user.settings?.timezone || user.timezone || "UTC";
  const stats = await getStats(user.id, timezone, params.deckId);
  const decks = await prisma.deck.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  });

  const metrics = [
    { label: "Изученных слов", value: stats.learnedWords, icon: GraduationCap, tone: "text-success bg-success/10" },
    { label: "Новых слов", value: stats.newWords, icon: TrendingUp, tone: "text-blue bg-blue-soft" },
    { label: "Повторений сегодня", value: stats.reviewsToday, icon: RotateCcw, tone: "text-primary bg-primary/10" },
    { label: "Правильных", value: stats.correctToday, icon: Check, tone: "text-success bg-success/10" },
    { label: "Неправильных", value: stats.incorrectToday, icon: X, tone: "text-destructive bg-destructive/10" },
    { label: "Удержание", value: `${stats.retention}%`, icon: BarChart3, tone: "text-blue bg-blue-soft" },
    { label: "Текущая серия", value: stats.currentStreak, icon: Flame, tone: "text-warning bg-warning/10" },
    { label: "Максимальная серия", value: stats.maxStreak, icon: Flame, tone: "text-warning bg-warning/10" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Статистика</h1>
          <p className="mt-1 text-sm text-muted-foreground">Активность, удержание и прогноз повторений.</p>
        </div>
        <StatsDeckSelect decks={decks} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="transition-colors hover:border-border-strong">
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
            <CardTitle>Активность за 30 дней</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[repeat(10,minmax(0,1fr))] gap-2 md:grid-cols-[repeat(15,minmax(0,1fr))]">
              {stats.activity.map((day) => (
                <div key={day.date} className="space-y-1">
                  <div
                    className={`h-8 rounded-md ${intensity(day.count)}`}
                    title={`${day.date}: ${day.count}`}
                  />
                  <div className="truncate text-[10px] text-muted-foreground">{day.date.slice(5)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Статусы карточек</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.statusCounts).map(([state, count]) => (
              <div key={state}>
                <div className="flex justify-between text-sm">
                  <span>{cardStateLabels[state]}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <ProgressBar
                  value={Math.min(100, (count / Math.max(1, Object.values(stats.statusCounts).reduce((a, b) => a + b, 0))) * 100)}
                  className="mt-1"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Прогноз на 7 дней</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-7">
            {stats.forecast.map((day) => (
              <div key={day.date} className="rounded-md border border-border bg-surface-elevated p-3 text-center">
                <div className="text-xs text-muted-foreground">{day.date.slice(5)}</div>
                <div className="mt-2 text-2xl font-semibold">{day.count}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
