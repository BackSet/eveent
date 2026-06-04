import { Badge } from "@/components/ui/badge";
import { CONVOCATORIA_ESTADO_COLORS, ESTADO_COLORS, ESTADO_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatEventProximity, type ConvocatoriaScheduleLike } from "@/lib/convocatoriaList";
import { isBorradorConFechaPasada, type BorradorSchedule } from "@/lib/convocatoriaDraft";
import { Clock, Repeat } from "lucide-react";

const badgeXs =
  "inline-flex items-center whitespace-nowrap shrink-0 text-[9px] px-1.5 py-0.5 uppercase tracking-wide font-bold rounded-md";

export function ConvocatoriaEstadoBadge({
  estado,
  className,
}: {
  estado: string;
  className?: string;
}) {
  return (
    <Badge
      variant={CONVOCATORIA_ESTADO_COLORS[estado] || "default"}
      className={cn(badgeXs, className)}
    >
      {ESTADO_LABELS[estado] || estado}
    </Badge>
  );
}

export function AsistenciaEstadoBadge({
  estado,
  className,
}: {
  estado: string;
  className?: string;
}) {
  return (
    <Badge
      variant={ESTADO_COLORS[estado] || "default"}
      className={cn(badgeXs, className)}
    >
      {ESTADO_LABELS[estado] || estado}
    </Badge>
  );
}

/** Estado + indicador de vencimiento en una sola línea (evita dos pills apilados). */
export function ConvocatoriaEstadoCell({
  conv,
  recurrente,
  className,
  align = "start",
}: {
  conv: BorradorSchedule & { estado: string };
  recurrente?: boolean;
  className?: string;
  align?: "start" | "end";
}) {
  const vencido = conv.estado === "BORRADOR" && isBorradorConFechaPasada(conv);

  return (
    <div
      className={cn(
        "flex items-center gap-1 min-w-0 max-w-full",
        align === "end" ? "justify-end" : "justify-start",
        className
      )}
    >
      {recurrente && (
        <Badge variant="info" className="text-[8px] px-1 py-0 uppercase whitespace-nowrap shrink-0">
          <Repeat size={8} className="mr-0.5 inline" />
          Rec.
        </Badge>
      )}
      {vencido ? (
        <span
          className={cn(
            badgeXs,
            "normal-case tracking-normal gap-1 border border-warning/30 bg-warning/10 text-warning"
          )}
          title="La fecha del evento ya pasó; edita o elimina este borrador"
        >
          <Clock size={10} className="shrink-0 opacity-80" aria-hidden />
          <span className="font-bold uppercase text-[8px] text-muted-foreground">Borrador</span>
          <span className="text-muted-foreground/60 font-normal">·</span>
          <span className="font-semibold">Vencido</span>
        </span>
      ) : (
        <ConvocatoriaEstadoBadge estado={conv.estado} />
      )}
    </div>
  );
}

export function EventProximityPill({
  schedule,
  className,
}: {
  schedule: ConvocatoriaScheduleLike;
  className?: string;
}) {
  const text = formatEventProximity(schedule);
  if (!text) return null;
  return (
    <span
      className={cn(
        "text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border border-primary/25 bg-primary/10 text-primary",
        className
      )}
    >
      {text}
    </span>
  );
}

export function RecurrenteEstadoBadge({
  activo,
  className,
}: {
  activo: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant={activo ? "success" : "secondary"}
      className={cn(badgeXs, className)}
    >
      {activo ? "Activa" : "Borrador"}
    </Badge>
  );
}

export function TipoInvitacionPill({
  tipo,
  grupoNombre,
  className,
}: {
  tipo?: string;
  grupoNombre?: string | null;
  className?: string;
}) {
  if (!tipo) return null;
  const label =
    tipo === "GRUPO"
      ? grupoNombre
        ? `Grupo: ${grupoNombre}`
        : "Solo grupo"
      : tipo === "MANUAL"
        ? "Invitados"
        : "Abierta";
  return (
    <span
      className={cn(
        "text-[9px] font-semibold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border",
        className
      )}
      title={label}
    >
      {label}
    </span>
  );
}

export function CupoLabel({
  cupoMaximo,
  className,
}: {
  cupoMaximo?: number | null;
  className?: string;
}) {
  const text =
    cupoMaximo != null && cupoMaximo > 0 ? `Máx. ${cupoMaximo}` : "Sin límite";
  return (
    <span className={cn("text-xs font-semibold text-foreground", className)}>
      {text}
    </span>
  );
}
