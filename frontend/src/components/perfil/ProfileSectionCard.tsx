import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ProfileSectionCardProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  hint?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function ProfileSectionCard({
  title,
  description,
  icon: Icon,
  hint,
  actions,
  children,
  className,
  contentClassName,
}: ProfileSectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card overflow-hidden shadow-sm shadow-black/5",
        className
      )}
    >
      <header className="flex flex-col gap-3 border-b border-border/70 bg-secondary/15 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
            {Icon && <Icon size={15} className="text-primary shrink-0" aria-hidden />}
            <span>{title}</span>
            {hint}
          </h2>
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className={cn("p-5", contentClassName)}>{children}</div>
    </section>
  );
}
