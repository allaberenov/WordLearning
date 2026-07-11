"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/providers/toast-provider";

export function DeckDialog({
  deck,
  trigger
}: {
  deck?: { id: string; name: string; description: string | null };
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const body = {
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || "")
    };

    try {
      const response = await fetch(deck ? `/api/decks/${deck.id}` : "/api/decks", {
        method: deck ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Не удалось сохранить набор.");
        return;
      }
      toast({ title: deck ? "Набор обновлен" : "Набор создан" });
      setOpen(false);
      router.refresh();
    } catch {
      setError("Нет соединения с сервером.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4" />
            Создать набор
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{deck ? "Переименовать набор" : "Создать набор"}</DialogTitle>
          <DialogDescription>Название видно только вам и помогает разделять контекст слов.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="name">Название</Label>
            <Input id="name" name="name" defaultValue={deck?.name} required maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={deck?.description || ""}
              maxLength={600}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Сохранить
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
