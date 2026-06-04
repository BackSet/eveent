import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDeporteIcon } from "@/lib/iconography";

/** Icono inline según deporte (filas de listas, tabs). */
export function DeporteIcon({
  nombre,
  size = 16,
  className,
}: {
  nombre?: string | null;
  size?: number;
  className?: string;
}) {
  const Icon = getDeporteIcon(nombre);
  return (
    <Icon
      size={size}
      className={cn("shrink-0 text-muted-foreground", className)}
      strokeWidth={1.75}
      aria-hidden
    />
  );
}

/** Icono de módulo de permisos (Roles, Permisos). */
export function ModuleIcon({
  icon: Icon,
  size = 16,
  className,
}: {
  icon: LucideIcon;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-muted/80 p-1 shrink-0",
        className
      )}
      aria-hidden
    >
      <Icon size={size} className="text-foreground" strokeWidth={1.75} />
    </span>
  );
}

/** Icono compacto en sidebar / breadcrumbs. */
export function NavIcon({
  icon: Icon,
  active = false,
  size = 16,
  className,
}: {
  icon: LucideIcon;
  active?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <Icon
      size={size}
      className={cn(
        "shrink-0",
        active ? "text-foreground" : "text-muted-foreground",
        className
      )}
      strokeWidth={active ? 2 : 1.75}
      aria-hidden
    />
  );
}

/** Cabecera de sección admin (sin cover completo). */
export function PageHeaderIcon({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-muted/40 shrink-0",
        className
      )}
      aria-hidden
    >
      <Icon size={22} className="text-primary" strokeWidth={1.75} />
    </span>
  );
}
