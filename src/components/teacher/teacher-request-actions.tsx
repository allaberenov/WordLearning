"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast-provider";

export function TeacherRequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loadingAction, setLoadingAction] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "accept" | "decline") {
    if (loadingAction) return;
    setLoadingAction(action);
    setError(null);
    try {
      const response = await fetch(`/api/teacher/requests/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Не удалось обработать запрос.");
        return;
      }
      toast({ title: action === "accept" ? "Преподаватель подключен" : "Запрос отклонен" });
      router.refresh();
    } catch {
      setError("Нет соединения с сервером.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => respond("accept")} disabled={!!loadingAction}>
          {loadingAction === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Принять
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => respond("decline")} disabled={!!loadingAction}>
          {loadingAction === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Отклонить
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
