import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { Zap } from "lucide-react";

export function AutoAceptadaBadge({ className }: { className?: string }) {
  return (
    <Tooltip content="Confirmada automáticamente según tu disponibilidad en perfil">
      <Badge
        variant="outline"
        className={
          className ??
          "text-[8px] px-1.5 py-0 font-semibold uppercase tracking-wide gap-0.5 bg-info-muted text-info border-info/30 inline-flex items-center"
        }
      >
        <Zap size={8} className="opacity-80" />
        Auto
      </Badge>
    </Tooltip>
  );
}
