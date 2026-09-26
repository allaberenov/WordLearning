"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Wand2 } from "lucide-react";
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

export function AssignmentDialog({ studentId }: { studentId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const words = String(formData.get("words") || "")
      .split(/\r?\n/)
      .map((word) => word.trim())
      .filter(Boolean);

    try {
      const response = await fetch(`/api/teacher/students/${studentId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") || ""),
          description: String(formData.get("description") || ""),
          words
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Не удалось назначить набор.");
        return;
      }
      toast({
        title: "Набор назначен",
        description: `${payload.deck?.cards?.length ?? words.length} карточек`
      });
      setOpen(false);
      router.refresh();
    } catch {
      setError("Нет соединения с сервером.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Назначить набор
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Назначить набор студенту</DialogTitle>
          <DialogDescription>
            Введите слова построчно. Карточки будут созданы через текущий AI-провайдер и появятся у студента.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="assignment-name">Название набора</Label>
            <Input id="assignment-name" name="name" required maxLength={120} placeholder="Unit 4 vocabulary" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignment-description">Описание</Label>
            <Textarea id="assignment-description" name="description" maxLength={600} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignment-words">Слова</Label>
            <Textarea
              id="assignment-words"
              name="words"
              required
              className="min-h-40"
              placeholder={"abandon\nreluctant\nfall off the wagon"}
            />
            <p className="text-xs text-muted-foreground">До 20 слов за одно назначение.</p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Создать и назначить
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
