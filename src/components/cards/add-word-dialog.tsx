"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardEditor } from "@/components/cards/card-editor";
import { useToast } from "@/components/providers/toast-provider";
import type { GeneratedCardInput } from "@/lib/schemas";

type Duplicate = { cardId: string; word: string };

export function AddWordDialog({ deckId }: { deckId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [card, setCard] = useState<GeneratedCardInput | null>(null);
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(force = false) {
    if (generating || !word.trim()) return;
    setGenerating(true);
    setError(null);
    setDuplicate(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId, input: word, force })
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 409 && payload.duplicate) {
          setDuplicate(payload.duplicate);
          setError(payload.error || "Это слово уже добавлено в данный набор.");
          return;
        }
        setError(payload.error || "Не удалось сгенерировать карточку.");
        return;
      }
      setCard(payload.card);
      setDuplicate(payload.duplicate);
    } catch {
      setError("Нет соединения с сервером.");
    } finally {
      setGenerating(false);
    }
  }

  async function save(allowDuplicate = false) {
    if (!card || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...card, deckId, allowDuplicate })
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 409 && payload.details?.cardId) {
          setDuplicate({ cardId: payload.details.cardId, word: card.word });
        }
        setError(payload.error || "Не удалось сохранить карточку.");
        return;
      }
      toast({ title: "Карточка сохранена", description: payload.card.word });
      setOpen(false);
      setWord("");
      setCard(null);
      setDuplicate(null);
      router.refresh();
    } catch {
      setError("Нет соединения с сервером.");
    } finally {
      setSaving(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void generate(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Добавить слово
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Добавить слово</DialogTitle>
          <DialogDescription>Введите английское слово или выражение. Остальное подготовит backend через OpenAI.</DialogDescription>
        </DialogHeader>

        {!card ? (
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="word">Английское слово или выражение</Label>
              <Input
                id="word"
                value={word}
                onChange={(event) => setWord(event.target.value)}
                placeholder="abandon"
                required
                maxLength={160}
                autoFocus
              />
            </div>
            {generating ? (
              <div className="rounded-md border bg-secondary px-3 py-3 text-sm">
                Подготавливаем карточку…
              </div>
            ) : null}
            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
                {duplicate ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link href={`/cards/${duplicate.cardId}`}>Открыть существующую карточку</Link>
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                      Отменить добавление
                    </Button>
                    <Button type="button" size="sm" onClick={() => generate(true)} disabled={generating}>
                      Всё равно создать отдельную карточку
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <Button disabled={generating || !word.trim()}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Сгенерировать карточку
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {duplicate ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/25 dark:text-amber-100">
                Это слово уже добавлено в данный набор.
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild type="button" variant="outline" size="sm">
                    <Link href={`/cards/${duplicate.cardId}`}>Открыть существующую карточку</Link>
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                    Отменить добавление
                  </Button>
                </div>
              </div>
            ) : null}
            <CardEditor value={card} onChange={setCard} />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => save(false)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Сохранить карточку
              </Button>
              {duplicate ? (
                <Button variant="outline" onClick={() => save(true)} disabled={saving}>
                  Сохранить как отдельное значение
                </Button>
              ) : null}
              <Button variant="ghost" onClick={() => setCard(null)} disabled={saving}>
                Вернуться к вводу
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
