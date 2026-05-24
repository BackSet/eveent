import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPageIcon, type PageIconKind } from "@/lib/iconography";
import { PageHeaderIcon } from "@/components/ui/page-icon";
import { InfoHint } from "@/components/ui/info-hint";

export type PageHeaderHintProps = {
  side?: "top" | "bottom" | "left" | "right";
  maxWidth?: number;
  minWidth?: number;
  variant?: "info" | "help";
};

export type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconKind?: PageIconKind;
  hint?: ReactNode;
  hintProps?: PageHeaderHintProps;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  icon,
  iconKind,
  hint,
  hintProps,
  actions,
  className,
}: PageHeaderProps) {
  const resolvedIcon = icon ?? (iconKind ? getPageIcon(iconKind) : Trophy);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 pt-2 gap-4",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <PageHeaderIcon icon={resolvedIcon} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {title}
            {hint != null && (
              <InfoHint
                side={hintProps?.side ?? "right"}
                maxWidth={hintProps?.maxWidth ?? 320}
                minWidth={hintProps?.minWidth}
                variant={hintProps?.variant}
              >
                {hint}
              </InfoHint>
            )}
          </h1>
          {description && (
            <p className="text-muted-foreground text-xs mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
