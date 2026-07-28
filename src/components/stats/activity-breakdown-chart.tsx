import { Activity, GraduationCap, PlusCircle, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateRu } from "@/lib/date";

type ActivityDay = {
  date: string;
  count: number;
  newCards: number;
  reviews: number;
  learned: number;
  correct: number;
  incorrect: number;
};

type ActivityTotals = {
  newCards: number;
  reviews: number;
  learned: number;
  correct: number;
  incorrect: number;
};

const series = [
  { key: "newCards", label: "Новые слова", className: "bg-blue", icon: PlusCircle },
  { key: "reviews", label: "Повторения", className: "bg-primary", icon: RotateCcw },
  { key: "learned", label: "Выучено", className: "bg-success", icon: GraduationCap }
] as const;

function formatShortDate(date: string) {
  return date.slice(5).replace("-", ".");
}

export function ActivityBreakdownChart({
  activity,
  totals
}: {
  activity: ActivityDay[];
  totals: ActivityTotals;
}) {
  const maxDaily = Math.max(
    1,
    ...activity.map((day) => day.newCards + day.reviews + day.learned)
  );
  const retention =
    totals.correct + totals.incorrect > 0
      ? Math.round((totals.correct / (totals.correct + totals.incorrect)) * 100)
      : 0;

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle>Активность обучения</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Новые карточки, повторения и слова, дошедшие до зрелого статуса за последние 30 дней.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {series.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Новые", value: totals.newCards, icon: PlusCircle, tone: "text-blue bg-blue-soft" },
            { label: "Повторения", value: totals.reviews, icon: RotateCcw, tone: "text-primary bg-primary/10" },
            { label: "Выучено", value: totals.learned, icon: GraduationCap, tone: "text-success bg-success/10" },
            { label: "Удержание 30 дней", value: `${retention}%`, icon: Activity, tone: "text-warning bg-warning/10" }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-md border border-border bg-surface-elevated p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md ${item.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-semibold">{item.value}</div>
              </div>
            );
          })}
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[860px] items-end gap-2">
            {activity.map((day) => {
              const total = day.newCards + day.reviews + day.learned;
              const height = total > 0 ? Math.max(8, Math.round((total / maxDaily) * 160)) : 0;
              return (
                <div key={day.date} className="flex w-7 shrink-0 flex-col items-center gap-2">
                  <div className="flex h-44 w-full items-end rounded-md bg-background-secondary px-1 py-1">
                    <div
                      className="flex w-full flex-col-reverse overflow-hidden rounded-sm"
                      style={{ height }}
                      title={`${formatDateRu(day.date)}: новые ${day.newCards}, повторения ${day.reviews}, выучено ${day.learned}`}
                    >
                      {series.map((item) => {
                        const value = day[item.key];
                        if (value <= 0 || total <= 0) return null;
                        return (
                          <div
                            key={item.key}
                            className={item.className}
                            style={{ height: `${Math.max(12, (value / total) * 100)}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{formatShortDate(day.date)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
