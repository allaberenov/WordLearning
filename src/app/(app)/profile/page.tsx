import { Mail, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatDateRu } from "@/lib/date";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Профиль</h1>
        <p className="mt-1 text-sm text-muted-foreground">Данные аккаунта и текущая серверная сессия.</p>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Аккаунт</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-md border border-border bg-surface-elevated p-3">
            <UserRound className="h-5 w-5 text-blue" />
            <div>
              <div className="text-sm text-muted-foreground">Имя</div>
              <div className="font-medium">{user.name || "Не указано"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border bg-surface-elevated p-3">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-medium">{user.email}</div>
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface-elevated p-3">
            <div className="text-sm text-muted-foreground">Создан</div>
            <div className="font-medium">{formatDateRu(user.createdAt)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
