import { SettingsForm } from "@/components/settings/settings-form";
import { TeacherRequestActions } from "@/components/teacher/teacher-request-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatDateRu } from "@/lib/date";
import { getOrCreateSettings } from "@/lib/settings";
import { listActiveTeachers, listIncomingTeacherRequests } from "@/lib/teacher";

export default async function SettingsPage() {
  const user = await requireUser();
  const [settings, incomingRequests, activeTeachers] = await Promise.all([
    getOrCreateSettings(user.id, user.timezone),
    listIncomingTeacherRequests(user.id),
    listActiveTeachers(user.id)
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Настройки</h1>
        <p className="mt-1 text-sm text-muted-foreground">Лимиты, FSRS, режим проверки и внешний вид.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Роли аккаунта</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="blue">студент</Badge>
            <Badge variant="teal">преподаватель</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Каждый аккаунт может учиться сам и работать как преподаватель. Доступ преподавателя к данным студента
            появляется только после подтверждения запроса студентом.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Запросы преподавателей</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {incomingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Новых запросов нет.</p>
          ) : (
            <div className="grid gap-3">
              {incomingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 rounded-md border border-border bg-surface-elevated p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium">{request.teacher.name || "Преподаватель"}</div>
                    <div className="text-sm text-muted-foreground">{request.teacher.email}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Запрос отправлен: {formatDateRu(request.requestedAt)}
                    </div>
                  </div>
                  <TeacherRequestActions requestId={request.id} />
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-border pt-4">
            <div className="mb-2 text-sm font-medium">Подключенные преподаватели</div>
            {activeTeachers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Вы пока не подтвердили ни одного преподавателя.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {activeTeachers.map((link) => (
                  <div key={link.id} className="rounded-md border border-border bg-surface-elevated p-3">
                    <div className="font-medium">{link.teacher.name || "Преподаватель"}</div>
                    <div className="text-sm text-muted-foreground">{link.teacher.email}</div>
                    <div className="mt-2">
                      <Badge variant="success">доступ подтвержден</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <SettingsForm
        settings={{
          newCardsPerDay: settings.newCardsPerDay,
          maxReviewsPerDay: settings.maxReviewsPerDay,
          desiredRetention: settings.desiredRetention,
          reviewMode: settings.reviewMode,
          theme: settings.theme,
          timezone: settings.timezone,
          interfaceLanguage: settings.interfaceLanguage,
          pronunciationEnabled: settings.pronunciationEnabled,
          newCardOrder: settings.newCardOrder
        }}
      />
    </div>
  );
}
