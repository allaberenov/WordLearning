import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  subtitle = "Word Learning",
  centered = false,
  compact = false,
  iconOnly = false,
  priority = false
}: {
  subtitle?: string;
  centered?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  priority?: boolean;
}) {
  const size = compact ? 40 : 56;

  return (
    <div className={cn("flex items-center gap-3", centered && "justify-center text-center")}>
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg border border-border bg-white shadow-soft",
          compact ? "h-10 w-10" : "h-14 w-14"
        )}
      >
        <Image
          src="/brand/wl-logo.png"
          alt="WL logo"
          width={size}
          height={size}
          priority={priority}
          className="h-full w-full object-contain"
        />
      </span>
      {!iconOnly ? (
        <span className="min-w-0">
          <span className={cn("block font-bold leading-tight text-foreground", compact ? "text-base" : "text-2xl")}>
            Dublind
          </span>
          {subtitle ? (
            <span className={cn("block truncate text-muted-foreground", compact ? "text-xs" : "text-sm")}>
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
