"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type SentenceCheckResult = {
  score: number;
  correct: boolean;
  feedback: string;
  correctedSentence?: string | null;
};

export function SentenceChecker({ cardId, word }: { cardId: string; word: string }) {
  const [sentence, setSentence] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SentenceCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      const controller = requestRef.current;
      requestRef.current = null;
      controller?.abort();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = sentence.trim();
    if (!trimmed || checking) return;

    setChecking(true);
    setError(null);
    setResult(null);
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const response = await fetch("/api/sentence-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, sentence: trimmed }),
        signal: controller.signal
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Не удалось проверить предложение.");
        return;
      }
      setResult(payload.result);
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") {
        setError("Нет соединения с сервером.");
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setChecking(false);
      }
    }
  }

  return (
    <form className="rounded-lg border border-border bg-surface-elevated p-4" onSubmit={submit}>
      <div className="space-y-2">
        <label htmlFor={`sentence-${cardId}`} className="text-sm font-semibold">
          Составьте предложение с этим словом
        </label>
        <Textarea
          id={`sentence-${cardId}`}
          value={sentence}
          onChange={(event) => {
            setSentence(event.target.value);
            if (result) setResult(null);
            if (error) setError(null);
          }}
          placeholder={`Например: I used "${word}" in a sentence.`}
          maxLength={500}
          rows={2}
          className="min-h-20 resize-none"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="submit" variant="outline" disabled={checking || sentence.trim().length < 3}>
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Проверить
        </Button>
        {result ? (
          <div className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
            <Badge variant={result.correct ? "success" : "warning"}>{result.score}/5</Badge>
            <span className="text-foreground-secondary">{result.feedback}</span>
          </div>
        ) : null}
        {error ? (
          <div className="text-sm text-destructive" aria-live="polite">
            {error}
          </div>
        ) : null}
      </div>
      {result?.correctedSentence ? (
        <div className="mt-2 space-y-2 rounded-md border border-border bg-background-secondary px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Вторая версия</Badge>
            <span className="text-muted-foreground">{result.score === 4 ? "Лучше так" : "Вариант"}</span>
          </div>
          <span className="block font-medium">{result.correctedSentence}</span>
        </div>
      ) : null}
    </form>
  );
}
