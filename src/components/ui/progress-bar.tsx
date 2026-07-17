import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className
}: {
  value: number;
  className?: string;
}) {
  const width = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-background-secondary", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue to-primary transition-[width] duration-200"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
