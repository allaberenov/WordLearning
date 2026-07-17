import { Badge } from "@/components/ui/badge";
import { cardStateLabels } from "@/lib/labels";

function stateVariant(state: string) {
  if (state === "MATURE") return "success" as const;
  if (state === "NEW") return "info" as const;
  if (state === "RELEARNING") return "danger" as const;
  if (state === "LEARNING") return "warning" as const;
  if (state === "REVIEW") return "teal" as const;
  return "default" as const;
}

export function StatusBadge({ state }: { state: string }) {
  return <Badge variant={stateVariant(state)}>{cardStateLabels[state] || state}</Badge>;
}
