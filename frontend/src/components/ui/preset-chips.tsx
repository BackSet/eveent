import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export interface PresetOption {
  id: string;
  label: string;
  onClick: () => void;
}

interface PresetChipsProps {
  options: PresetOption[];
  activeId?: string;
  className?: string;
  size?: "sm" | "default";
  showIcon?: boolean;
}

export function PresetChips({
  options,
  activeId,
  className,
  size = "sm",
  showIcon = true,
}: PresetChipsProps) {
  if (options.length === 0) return null;

  return (
    <div
      className={cn(
        "flex gap-1.5 overflow-x-auto flex-nowrap pb-0.5 -mx-0.5 px-0.5 sm:flex-wrap sm:overflow-visible",
        className
      )}
    >
      {options.map((opt) => (
        <Button
          key={opt.id}
          type="button"
          variant={activeId === opt.id ? "default" : "outline"}
          size={size}
          className={cn(
            "h-7 text-[10px] font-semibold px-2.5 shadow-none",
            activeId === opt.id && "ring-1 ring-primary/30"
          )}
          onClick={opt.onClick}
        >
          {showIcon && <Sparkles size={10} className="mr-1 opacity-70" />}
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
