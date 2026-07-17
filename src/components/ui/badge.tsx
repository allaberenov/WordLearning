import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "border-border bg-surface-hover text-foreground-secondary",
      success: "border-success/25 bg-success/10 text-success",
      warning: "border-warning/30 bg-warning/10 text-warning",
      danger: "border-destructive/30 bg-destructive/10 text-destructive",
      info: "border-blue/25 bg-blue-soft text-blue",
      teal: "border-primary/30 bg-primary/10 text-primary",
      blue: "border-blue/25 bg-blue-soft text-blue"
    }
  },
  defaultVariants: { variant: "default" }
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
