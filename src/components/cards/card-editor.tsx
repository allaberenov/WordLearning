"use client";

import { GeneratedCardInput } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CardEditor({
  value,
  onChange
}: {
  value: GeneratedCardInput;
  onChange: (value: GeneratedCardInput) => void;
}) {
  function update<K extends keyof GeneratedCardInput>(key: K, next: GeneratedCardInput[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Слово</Label>
          <Input value={value.word} onChange={(event) => update("word", event.target.value)} maxLength={160} />
        </div>
        <div className="space-y-2">
          <Label>Нормализованное слово</Label>
          <Input
            value={value.normalizedWord}
            onChange={(event) => update("normalizedWord", event.target.value)}
            maxLength={160}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Часть речи</Label>
          <Input
            value={value.partOfSpeech}
            onChange={(event) => update("partOfSpeech", event.target.value)}
            maxLength={60}
          />
        </div>
        <div className="space-y-2">
          <Label>Транскрипция</Label>
          <Input
            value={value.transcription || ""}
            onChange={(event) => update("transcription", event.target.value)}
            maxLength={120}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Переводы</Label>
        <Textarea
          value={value.translations.join("\n")}
          onChange={(event) =>
            update(
              "translations",
              event.target.value
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean)
            )
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Определение на английском</Label>
        <Textarea
          value={value.definitionEn}
          onChange={(event) => update("definitionEn", event.target.value)}
          maxLength={800}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {value.examples.map((example, index) => (
          <div key={index} className="rounded-md border border-border bg-surface-elevated p-3">
            <div className="mb-3 text-sm font-medium">Пример {index + 1}</div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>English</Label>
                <Textarea
                  value={example.en}
                  onChange={(event) => {
                    const examples = [...value.examples];
                    examples[index] = { ...example, en: event.target.value };
                    update("examples", examples);
                  }}
                  maxLength={260}
                />
              </div>
              <div className="space-y-2">
                <Label>Русский перевод</Label>
                <Textarea
                  value={example.ru}
                  onChange={(event) => {
                    const examples = [...value.examples];
                    examples[index] = { ...example, ru: event.target.value };
                    update("examples", examples);
                  }}
                  maxLength={320}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
