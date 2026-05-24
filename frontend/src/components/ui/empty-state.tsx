import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Ícono o emoji a mostrar arriba del título. */
  icon?: ReactNode;
  /** Título corto y descriptivo. */
  title: string;
  /** Texto secundario explicando qué ocurre y qué puede hacer el usuario. */
  description?: ReactNode;
  /** Acción primaria (ej. Button) sugerida al usuario. */
  action?: ReactNode;
  /** Acción secundaria opcional. */
  secondaryAction?: ReactNode;
  /** Variante visual. */
  variant?: "default" | "search" | "error";
  className?: string;
}

/**
 * Estado vacío reutilizable. Muestra ícono, título, descripción y un CTA
 * para ayudar al usuario a entender qué pasa y qué hacer a continuación.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
}: EmptyStateProps) {
  const borderClass =
    variant === "error"
      ? "border-destructive/30"
      : "border-border";
  const bgClass =
    variant === "error"
      ? "bg-destructive/[0.06] dark:bg-destructive/[0.1]"
      : "bg-muted/15 dark:bg-muted/25";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 border border-dashed rounded-lg space-y-3",
        borderClass,
        bgClass,
        className
      )}
    >
      {icon && (
        <div className="text-muted-foreground/70 text-3xl select-none flex items-center justify-center">
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-md">
        <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
