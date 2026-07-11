"use client";

import { FormEvent, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/providers/toast-provider";
import { setClientTheme } from "@/components/providers/theme-provider";

type Settings = {
  newCardsPerDay: number;
  maxReviewsPerDay: number;
  desiredRetention: number;
  reviewMode: "FLASHCARD" | "WRITE" | "MIXED";
  theme: "SYSTEM" | "LIGHT" | "DARK";
  timezone: string;
  interfaceLanguage: string;
  pronunciationEnabled: boolean;
  newCardOrder: "CREATED_FIRST" | "RANDOM";
};

export function SettingsForm({ settings }: { settings: Settings }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Не удалось сохранить настройки.");
        return;
      }
      setClientTheme(draft.theme);
      toast({ title: "Настройки сохранены" });
    } catch {
      setError("Нет соединения с сервером.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>Повторения</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="newCardsPerDay">Новых карточек в день</Label>
            <Input
              id="newCardsPerDay"
              type="number"
              min={0}
              max={200}
              value={draft.newCardsPerDay}
              onChange={(event) => update("newCardsPerDay", Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxReviewsPerDay">Максимум повторений</Label>
            <Input
              id="maxReviewsPerDay"
              type="number"
              min={1}
              max={1000}
              value={draft.maxReviewsPerDay}
              onChange={(event) => update("maxReviewsPerDay", Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desiredRetention">Желаемое удержание FSRS</Label>
            <Input
              id="desiredRetention"
              type="number"
              min={0.7}
              max={0.98}
              step={0.01}
              value={draft.desiredRetention}
              onChange={(event) => update("desiredRetention", Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reviewMode">Режим повторения</Label>
            <select
              id="reviewMode"
              value={draft.reviewMode}
              onChange={(event) => update("reviewMode", event.target.value as Settings["reviewMode"])}
              className="focus-ring h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="FLASHCARD">Карточки</option>
              <option value="WRITE">Написать ответ</option>
              <option value="MIXED">Смешанный</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newCardOrder">Порядок новых карточек</Label>
            <select
              id="newCardOrder"
              value={draft.newCardOrder}
              onChange={(event) => update("newCardOrder", event.target.value as Settings["newCardOrder"])}
              className="focus-ring h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="CREATED_FIRST">Сначала старые</option>
              <option value="RANDOM">Случайно</option>
            </select>
          </div>
          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={draft.pronunciationEnabled}
              onChange={(event) => update("pronunciationEnabled", event.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">Включить произношение</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Интерфейс</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="theme">Тема</Label>
            <select
              id="theme"
              value={draft.theme}
              onChange={(event) => update("theme", event.target.value as Settings["theme"])}
              className="focus-ring h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="SYSTEM">Системная</option>
              <option value="LIGHT">Светлая</option>
              <option value="DARK">Темная</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Часовой пояс</Label>
            <Input
              id="timezone"
              value={draft.timezone}
              onChange={(event) => update("timezone", event.target.value)}
              placeholder="Europe/Moscow"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interfaceLanguage">Язык интерфейса</Label>
            <select
              id="interfaceLanguage"
              value={draft.interfaceLanguage}
              onChange={(event) => update("interfaceLanguage", event.target.value)}
              className="focus-ring h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="ru">Русский</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Сохранить настройки
      </Button>
    </form>
  );
}
