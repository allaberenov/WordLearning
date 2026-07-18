"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Volume2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FlipRevealCard } from "@/components/cards/flip-reveal-card";
import { SentenceChecker } from "@/components/review/sentence-checker";
import { classifyTypedAnswer } from "@/lib/utils";
import { ratingLabels } from "@/lib/labels";

type Preview = {
  rating: "AGAIN" | "HARD" | "GOOD" | "EASY";
  intervalLabel: string;
};

type ReviewCard = {
  id: string;
  word: string;
  normalizedWord: string;
  partOfSpeech: string;
  transcription: string | null;
  translations: string[];
  definitionEn: string;
  examples: { en: string; ru: string }[];
  state: string;
  previews: Preview[];
};

const ratingOrder: Preview["rating"][] = ["AGAIN", "HARD", "GOOD", "EASY"];

const ratingStyles: Record<Preview["rating"], string> = {
  AGAIN: "",
  HARD: "border-warning/40 bg-warning/10 text-warning hover:bg-warning/20",
  GOOD: "border-blue/40 bg-blue-soft text-blue hover:bg-blue-soft",
  EASY: "border-success/40 bg-success/10 text-success hover:bg-success/20"
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function ReviewClient({
  deckId,
  reviewMode,
  pronunciationEnabled
}: {
  deckId?: string;
  reviewMode: "FLASHCARD" | "WRITE" | "MIXED";
  pronunciationEnabled: boolean;
}) {
  const [card, setCard] = useState<ReviewCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [typedAnswer, setTypedAnswer] = useState("");
  const [answerResult, setAnswerResult] = useState<"correct" | "typo" | "wrong" | null>(null);
  const [cardMode, setCardMode] = useState<"FLASHCARD" | "WRITE">("FLASHCARD");

  const previewMap = useMemo(() => {
    const map = new Map<string, Preview>();
    for (const preview of card?.previews || []) map.set(preview.rating, preview);
    return map;
  }, [card]);

  const loadNext = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRevealed(false);
    setTypedAnswer("");
    setAnswerResult(null);
    try {
      const params = deckId ? `?deckId=${deckId}` : "";
      const response = await fetch(`/api/review${params}`);
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Не удалось загрузить карточку.");
        return;
      }
      setCard(payload.card);
      setReason(payload.reason);
      setStartedAt(Date.now());
      const mode = reviewMode === "MIXED" ? (Math.random() > 0.5 ? "WRITE" : "FLASHCARD") : reviewMode;
      setCardMode(mode === "WRITE" ? "WRITE" : "FLASHCARD");
    } catch {
      setError("Нет соединения с сервером.");
    } finally {
      setLoading(false);
    }
  }, [deckId, reviewMode]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!card || submitting) return;
      if (isTypingTarget(event.target)) return;
      if (event.code === "Space") {
        event.preventDefault();
        setRevealed(true);
      }
      if (!revealed) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < ratingOrder.length) {
        event.preventDefault();
        void submitRating(ratingOrder[index]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function speak() {
    if (!card || !pronunciationEnabled || typeof speechSynthesis === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(card.word);
    utterance.lang = "en-US";
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  function checkAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!card) return;
    setAnswerResult(classifyTypedAnswer(typedAnswer, card.normalizedWord));
    setRevealed(true);
  }

  async function submitRating(rating: Preview["rating"]) {
    if (!card || submitting || !revealed) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/review/${card.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, responseTimeMs: Date.now() - startedAt })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Не удалось сохранить ответ.");
        return;
      }
      await loadNext();
    } catch {
      setError("Нет соединения с сервером.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardContent className="grid min-h-[420px] place-items-center p-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Загружаем карточку…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardContent className="p-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold">Ошибка</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button className="mt-5" onClick={() => loadNext()}>
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!card) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold">На сегодня всё готово</h1>
          <p className="mt-2 text-muted-foreground">
            Вы повторили все запланированные карточки. Следующие слова появятся позже.
          </p>
          {reason === "limit" ? (
            <Badge className="mt-4">Достигнут дневной лимит повторений</Badge>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Повторение</h1>
        </div>
        <Badge>{cardMode === "WRITE" ? "Написать ответ" : "Карточка"}</Badge>
      </div>

      <Card className="border-border-strong">
        <CardContent className="p-6 sm:p-8">
          {!revealed && cardMode === "WRITE" ? (
            <form className="mx-auto max-w-xl space-y-5 text-center" onSubmit={checkAnswer}>
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Подсказка</p>
                <FlipRevealCard
                  front={<span>{card.definitionEn}</span>}
                  back={<span>{card.translations.join(", ")}</span>}
                  frontLabel="Definition"
                  backLabel="Значение"
                  className="text-left"
                />
              </div>
              <Input
                value={typedAnswer}
                onChange={(event) => setTypedAnswer(event.target.value)}
                placeholder="Введите английское слово"
                className="h-12 text-center text-lg"
                autoFocus
              />
              <Button disabled={!typedAnswer.trim()}>Проверить</Button>
            </form>
          ) : (
            <div className="text-center">
              <div className="flex justify-center gap-2">
                <Badge variant="info">{card.partOfSpeech}</Badge>
                {card.state === "NEW" ? <Badge>новая</Badge> : null}
              </div>
              <h2 className="mt-5 break-words text-5xl font-semibold sm:text-6xl">{card.word}</h2>
              <p className="mt-3 text-xl text-muted-foreground">{card.transcription || "без транскрипции"}</p>
              {pronunciationEnabled ? (
                <Button type="button" variant="outline" size="icon" className="mt-4" onClick={speak} title="Произношение">
                  <Volume2 className="h-5 w-5" />
                </Button>
              ) : null}
              {!revealed ? (
                <div className="mt-8">
                  <Button size="lg" onClick={() => setRevealed(true)}>
                    Показать ответ
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          {revealed ? (
            <div className="mt-8 space-y-5">
              {answerResult ? (
                <div className="rounded-md border border-border bg-surface-elevated p-3 text-sm">
                  {answerResult === "correct" ? "Ответ верный." : null}
                  {answerResult === "typo" ? "Похоже на опечатку, правильный ответ ниже." : null}
                  {answerResult === "wrong" ? "Ответ не совпал, правильный ответ ниже." : null}
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-[minmax(220px,0.8fr)_1fr]">
                <FlipRevealCard
                  front={
                    <span>
                      {card.word}
                      <span className="mt-2 block text-sm font-normal text-muted-foreground">
                        {card.transcription || "без транскрипции"} · {card.partOfSpeech}
                      </span>
                    </span>
                  }
                  back={<span>{card.translations.join(", ")}</span>}
                  frontLabel="Word"
                  backLabel="Перевод"
                />
                <FlipRevealCard
                  front={<span>{card.definitionEn}</span>}
                  back={<span>{card.translations.join(", ")}</span>}
                  frontLabel="Definition"
                  backLabel="Перевод"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {card.examples.map((example, index) => (
                  <FlipRevealCard
                    key={index}
                    front={<span>{example.en}</span>}
                    back={<span>{example.ru}</span>}
                    frontLabel={`Example ${index + 1}`}
                    backLabel="Перевод"
                  />
                ))}
              </div>
              <SentenceChecker key={card.id} cardId={card.id} word={card.word} />
              <div className="grid gap-2 sm:grid-cols-4">
                {ratingOrder.map((rating, index) => (
                  <Button
                    key={rating}
                    type="button"
                    variant={rating === "AGAIN" ? "danger" : "outline"}
                    className={`h-auto flex-col py-3 ${ratingStyles[rating]}`}
                    disabled={submitting}
                    onClick={() => submitRating(rating)}
                  >
                    <span>
                      {index + 1}. {ratingLabels[rating]}
                    </span>
                    <span className="text-xs opacity-80">
                      {previewMap.get(rating)?.intervalLabel || "позже"}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
