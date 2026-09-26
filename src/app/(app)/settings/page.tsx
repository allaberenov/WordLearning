import { ExternalLink, MessageCircle, Newspaper } from "lucide-react";
import { SettingsForm } from "@/components/settings/settings-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getOrCreateSettings } from "@/lib/settings";
import { listActiveTeachers } from "@/lib/teacher";

export default async function SettingsPage() {
  const user = await requireUser();
  const [settings, activeTeachers] = await Promise.all([
    getOrCreateSettings(user.id, user.timezone),
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
          <CardTitle>Поддержка и новости</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-soft text-blue">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-medium">Поддержка</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  По поводу улучшений или ошибок можно писать в Telegram-чате.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <a href="https://t.me/dublind_wl_chat" target="_blank" rel="noreferrer">
                    Открыть чат
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Newspaper className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-medium">Новости</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Подпишитесь на канал и следите за актуальными обновлениями приложения.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <a href="https://t.me/dublind_wl" target="_blank" rel="noreferrer">
                    Открыть канал
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
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
          <CardTitle>Подключенные преподаватели</CardTitle>
        </CardHeader>
        <CardContent>
          {activeTeachers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока преподавателей нет.</p>
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
