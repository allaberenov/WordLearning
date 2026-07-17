import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandLogo({
  subtitle,
  centered = false,
  compact = false
}: {
  subtitle?: string;
  centered?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", centered && "justify-center text-center")}>
      <div className="relative h-11 w-12 shrink-0">
        <div className="absolute left-0 top-2 h-8 w-8 rotate-[-10deg] rounded-md border border-primary/30 bg-secondary shadow-soft" />
        <div className="absolute right-0 top-0 flex h-9 w-9 rotate-6 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-soft">
          <span className="text-sm font-black tracking-normal">Aa</span>
        </div>
        <div className="absolute bottom-0 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-soft">
          <Sparkles className="h-3 w-3" />
        </div>
      </div>
      <div>
        <div className={cn("font-black tracking-normal text-foreground", compact ? "text-base" : "text-xl")}>
          Dublind
        </div>
        {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
    </div>
  );
}
