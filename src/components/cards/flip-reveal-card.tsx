"use client";

import { useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function FlipRevealCard({
  front,
  back,
  frontLabel = "EN",
  backLabel = "RU",
  className,
  compact = false
}: {
  front: ReactNode;
  back: ReactNode;
  frontLabel?: string;
  backLabel?: string;
  className?: string;
  compact?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={flipped}
      title={flipped ? "Показать английскую сторону" : "Показать перевод"}
      onClick={() => setFlipped((value) => !value)}
      className={cn(
        "focus-ring group block w-full rounded-lg text-left [perspective:1200px]",
        compact ? "min-h-[72px]" : "min-h-[140px]",
        className
      )}
    >
      <span
        className={cn(
          "relative block h-full min-h-[inherit] rounded-lg transition-transform duration-300 [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]"
        )}
      >
        <span className="absolute inset-0 flex min-h-[inherit] flex-col justify-between rounded-lg border bg-card p-4 shadow-soft [backface-visibility:hidden]">
          <span className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {frontLabel}
            <RotateCcw className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:rotate-12" />
          </span>
          <span className={cn("block text-foreground", compact ? "mt-2 text-sm" : "mt-5 text-lg")}>{front}</span>
        </span>
        <span className="absolute inset-0 flex min-h-[inherit] flex-col justify-between rounded-lg border border-primary/25 bg-primary/10 p-4 shadow-soft [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {backLabel}
            <RotateCcw className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:-rotate-12" />
          </span>
          <span className={cn("block text-foreground", compact ? "mt-2 text-sm" : "mt-5 text-lg font-medium")}>
            {back}
          </span>
        </span>
      </span>
    </button>
  );
}
