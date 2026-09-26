"use client";

import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { TeacherRequestActions } from "@/components/teacher/teacher-request-actions";
import { formatDateRu } from "@/lib/date";

type IncomingTeacherRequest = {
  id: string;
  requestedAt: string;
  teacher: {
    email: string;
    name: string | null;
  };
};

export function IncomingTeacherRequestsDialog({
  requests
}: {
  requests: IncomingTeacherRequest[];
}) {
  const count = requests.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={count > 0 ? "default" : "outline"} className="relative">
          <Bell className="h-4 w-4" />
          Запросы
          {count > 0 ? (
            <span className="absolute -left-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground shadow-soft">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Запросы преподавателей</DialogTitle>
          <DialogDescription>
            Подтвердите запрос, чтобы преподаватель увидел ваши наборы, карточки, прогресс и мог назначать новые слова.
          </DialogDescription>
        </DialogHeader>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Новых запросов нет.</p>
        ) : (
          <div className="grid gap-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-md border border-border bg-surface-elevated p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{request.teacher.name || "Преподаватель"}</div>
                      <Badge variant="warning">ожидает</Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{request.teacher.email}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Запрос отправлен: {formatDateRu(request.requestedAt)}
                    </div>
                  </div>
                  <TeacherRequestActions requestId={request.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
