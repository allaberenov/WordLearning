"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Save, Wand2 } from "lucide-react";
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
import { formatDurationRu } from "@/lib/duration";
import type { GeneratedCardInput } from "@/lib/schemas";
import { normalizeWord } from "@/lib/utils";

type Duplicate = { cardId: string; word: string };
type ApiErrorPayload = {
  error?: string;
  code?: string;
  details?: {
    provider?: string;
    retryAfter?: number | null;
    retryAfterSeconds?: number | null;
    limitType?: string | null;
  };
  duplicate?: Duplicate;
};
type RateLimitState = {
  message: string;
  retryAfterSeconds: number | null;
  remainingSeconds: number | null;
  limitType?: string | null;
};

const MAX_COUNTDOWN_SECONDS = 60 * 60;

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
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);
  const generationRequestRef = useRef<AbortController | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearRetryTimer() {
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }

  function resetForm() {
    clearRetryTimer();
    setWord("");
    setCard(null);
    setDuplicate(null);
    setGenerating(false);
    setSaving(false);
    setError(null);
    setRateLimit(null);
  }

  function cancel() {
    generationRequestRef.current?.abort();
    generationRequestRef.current = null;
    resetForm();
    setOpen(false);
  }

  function startRateLimitCooldown(payload: ApiErrorPayload) {
    clearRetryTimer();
    const retryAfterSeconds =
      payload.details?.retryAfterSeconds ?? payload.details?.retryAfter ?? null;
    const safeRetryAfter =
      typeof retryAfterSeconds === "number" && Number.isFinite(retryAfterSeconds)
        ? Math.max(0, Math.ceil(retryAfterSeconds))
        : null;

    const message = payload.error || "Временный лимит генерации исчерпан.";
    const shouldCountdown =
      safeRetryAfter != null && safeRetryAfter > 0 && safeRetryAfter <= MAX_COUNTDOWN_SECONDS;

    setRateLimit({
      message,
      retryAfterSeconds: safeRetryAfter,
      remainingSeconds: shouldCountdown ? safeRetryAfter : null,
      limitType: payload.details?.limitType
    });

    if (!shouldCountdown) return;

    retryTimerRef.current = setInterval(() => {
      setRateLimit((current) => {
        if (!current?.remainingSeconds) {
          clearRetryTimer();
          return current;
        }

        const nextRemaining = current.remainingSeconds - 1;
        if (nextRemaining <= 0) {
          clearRetryTimer();
          return null;
        }

        return { ...current, remainingSeconds: nextRemaining };
      });
    }, 1000);
  }

  function fillManually() {
    const trimmedWord = word.trim();
    if (!trimmedWord) return;

    setError(null);
    setRateLimit(null);
    setDuplicate(null);
    setCard({
      word: trimmedWord,
      normalizedWord: normalizeWord(trimmedWord),
      partOfSpeech: "",
      transcription: null,
      translations: [""],
      definitionEn: "",
      examples: [
        { en: "", ru: "" },
        { en: "", ru: "" }
      ]
    });
  }

  useEffect(
    () => () => {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    },
    []
  );

  async function generate(force = false) {
    if (generating || !word.trim() || (rateLimit?.remainingSeconds ?? 0) > 0) return;
    setGenerating(true);
    setError(null);
    setRateLimit(null);
    setDuplicate(null);
    const controller = new AbortController();
    generationRequestRef.current = controller;
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId, input: word, force }),
        signal: controller.signal
      });
      const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload & {
        card?: GeneratedCardInput;
      };
      if (!response.ok) {
        if (response.status === 409 && payload.duplicate) {
          setDuplicate(payload.duplicate);
          setError(payload.error || "Это слово уже добавлено в данный набор.");
          return;
        }
        if (payload.code === "GROQ_RATE_LIMITED") {
          startRateLimitCooldown(payload);
        }
        setError(payload.error || "Не удалось сгенерировать карточку.");
        return;
      }
      setRateLimit(null);
      if (!payload.card) {
        setError("Сервер вернул пустую карточку.");
        return;
      }
      setCard(payload.card);
      setDuplicate(payload.duplicate ?? null);
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") {
        setError("Нет соединения с сервером.");
      }
    } finally {
      if (generationRequestRef.current === controller) {
        generationRequestRef.current = null;
      }
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
      resetForm();
      setOpen(false);
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

  const generationDisabled = generating || !word.trim() || (rateLimit?.remainingSeconds ?? 0) > 0;
  const generationButtonText = rateLimit?.remainingSeconds
    ? `Повторить через ${rateLimit.remainingSeconds} сек.`
    : "Сгенерировать карточку";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          generationRequestRef.current?.abort();
          generationRequestRef.current = null;
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4" />
          Добавить слово
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Добавить слово</DialogTitle>
          <DialogDescription>Введите английское слово или выражение. Остальное подготовит backend через AI.</DialogDescription>
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
              <div className="rounded-md border border-border bg-surface-elevated px-3 py-3 text-sm text-foreground-secondary">
                Подготавливаем карточку…
              </div>
            ) : null}
            {rateLimit ? (
              <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                <p>{rateLimit.message}</p>
                {rateLimit.remainingSeconds ? (
                  <p className="mt-1 text-foreground-secondary">
                    Повторить можно через {formatDurationRu(rateLimit.remainingSeconds)}.
                  </p>
                ) : rateLimit.retryAfterSeconds ? (
                  <p className="mt-1 text-foreground-secondary">
                    Ориентир: через {formatDurationRu(rateLimit.retryAfterSeconds)}. Можно заполнить карточку вручную.
                  </p>
                ) : (
                  <p className="mt-1 text-foreground-secondary">Можно заполнить карточку вручную.</p>
                )}
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
                    <Button type="button" variant="outline" size="sm" onClick={cancel}>
                      Отменить добавление
                    </Button>
                    <Button type="button" size="sm" onClick={() => generate(true)} disabled={generating}>
                      Всё равно создать отдельную карточку
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button disabled={generationDisabled}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {generationButtonText}
              </Button>
              <Button type="button" variant="outline" onClick={fillManually} disabled={generating || !word.trim()}>
                <Pencil className="h-4 w-4" />
                Заполнить вручную
              </Button>
              <Button type="button" variant="outline" onClick={cancel}>
                Отменить
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {duplicate ? (
              <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                Это слово уже добавлено в данный набор.
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild type="button" variant="outline" size="sm">
                    <Link href={`/cards/${duplicate.cardId}`}>Открыть существующую карточку</Link>
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={cancel}>
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
              <Button variant="outline" onClick={cancel} disabled={saving}>
                Отменить
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
