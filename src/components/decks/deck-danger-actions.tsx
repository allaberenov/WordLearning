"use client";

import { useRouter } from "next/navigation";
import { Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeckDialog } from "@/components/decks/deck-dialog";
import { useToast } from "@/components/providers/toast-provider";

export function DeckDangerActions({
  deck
}: {
  deck: { id: string; name: string; description: string | null };
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function remove() {
    if (!window.confirm(`Удалить набор «${deck.name}» и все его карточки?`)) return;
    const response = await fetch(`/api/decks/${deck.id}`, { method: "DELETE" });
    if (!response.ok) {
      toast({ title: "Не удалось удалить набор", variant: "destructive" });
      return;
    }
    toast({ title: "Набор удален" });
    router.push("/decks");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <DeckDialog
        deck={deck}
        trigger={
          <Button variant="outline">
            <Edit3 className="h-4 w-4" />
            Переименовать
          </Button>
        }
      />
      <Button
        variant="outline"
        className="border-destructive/40 text-destructive hover:bg-destructive/10"
        onClick={remove}
      >
        <Trash2 className="h-4 w-4" />
        Удалить
      </Button>
    </div>
  );
}
