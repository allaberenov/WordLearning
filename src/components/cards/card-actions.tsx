"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit3, Loader2, MoreHorizontal, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import * as DropdownMenu from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { CardEditor } from "@/components/cards/card-editor";
import { useToast } from "@/components/providers/toast-provider";
import type { GeneratedCardInput } from "@/lib/schemas";

type CardActionData = GeneratedCardInput & {
  id: string;
};

type DeckOption = {
  id: string;
  name: string;
};

export function CardActions({ card, decks }: { card: CardActionData; decks: DeckOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<GeneratedCardInput>(card);
  const [targetDeckId, setTargetDeckId] = useState(decks[0]?.id || "");
  const [error, setError] = useState<string | null>(null);

  async function request(path: string, options: RequestInit = {}) {
    const response = await fetch(path, options);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Не удалось выполнить действие.");
    return payload;
  }

  async function saveEdit() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await request(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      toast({ title: "Карточка обновлена" });
      setEditOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCard() {
    if (!window.confirm("Удалить карточку без возможности восстановления?")) return;
    await request(`/api/cards/${card.id}`, { method: "DELETE" });
    toast({ title: "Карточка удалена" });
    router.refresh();
  }

  async function resetProgress() {
    if (!window.confirm("Сбросить прогресс по этой карточке?")) return;
    await request(`/api/cards/${card.id}/reset`, { method: "POST" });
    toast({ title: "Прогресс сброшен" });
    router.refresh();
  }

  async function moveCard() {
    if (!targetDeckId) return;
    setSaving(true);
    setError(null);
    try {
      await request(`/api/cards/${card.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId: targetDeckId })
      });
      toast({ title: "Карточка перемещена" });
      setMoveOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка перемещения.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" size="icon" title="Действия" aria-label="Действия карточки">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="z-50 min-w-52 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-soft"
          >
            <DropdownMenu.Item asChild>
              <Link className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-surface-hover focus:bg-surface-hover focus:outline-none" href={`/cards/${card.id}`}>
                <Send className="h-4 w-4" />
                Открыть
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <button
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
                onClick={() => setEditOpen(true)}
              >
                <Edit3 className="h-4 w-4" />
                Редактировать
              </button>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <button
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
                onClick={() => setMoveOpen(true)}
              >
                <Send className="h-4 w-4" />
                Переместить
              </button>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <button
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
                onClick={resetProgress}
              >
                <RotateCcw className="h-4 w-4" />
                Сбросить прогресс
              </button>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <button
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 text-left text-sm text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none"
                onClick={deleteCard}
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </button>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Редактировать карточку</DialogTitle>
            <DialogDescription>Можно изменить любые данные, созданные моделью.</DialogDescription>
          </DialogHeader>
          <CardEditor value={draft} onChange={setDraft} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button onClick={saveEdit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Сохранить
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переместить карточку</DialogTitle>
            <DialogDescription>Выберите другой набор для этой карточки.</DialogDescription>
          </DialogHeader>
          <select
            className="focus-ring h-10 rounded-md border border-input bg-background-secondary px-3 text-sm text-foreground hover:border-border-strong"
            value={targetDeckId}
            onChange={(event) => setTargetDeckId(event.target.value)}
          >
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button onClick={moveCard} disabled={saving || !targetDeckId}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Переместить
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
