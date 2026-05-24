import type { Asistencia } from "@/types";
import {
  type ConvocatoriaScheduleLike,
  type ConvocatoriaTimeGroup,
  formatEventProximity,
  getTimeGroup,
  parseConvocatoriaDate,
} from "@/lib/convocatoriaList";

export type AsistenciaQuickFilter =
  | "PROXIMAS"
  | "SEMANA"
  | "ASISTIRE"
  | "PENDIENTES"
  | "TODAS"
  | "PASADAS";

export const ASISTENCIA_FILTER_LABELS: Record<AsistenciaQuickFilter, string> = {
  PROXIMAS: "Próximos partidos",
  SEMANA: "Esta semana",
  ASISTIRE: "Confirmé asistencia",
  PENDIENTES: "Pendiente / espera",
  TODAS: "Todas",
  PASADAS: "Historial",
};

const GROUP_LABELS: Record<ConvocatoriaTimeGroup, string> = {
  EN_JUEGO: "En juego ahora",
  HOY: "Hoy",
  MANANA: "Mañana",
  ESTA_SEMANA: "Esta semana",
  PROXIMAMENTE: "Más adelante",
  BORRADORES: "Borradores",
  BORRADORES_VENCIDOS: "Borradores vencidos",
  PASADAS: "Partidos pasados",
  SIN_FECHA: "Sin fecha programada",
};

const GROUP_ORDER: ConvocatoriaTimeGroup[] = [
  "EN_JUEGO",
  "HOY",
  "MANANA",
  "ESTA_SEMANA",
  "PROXIMAMENTE",
  "SIN_FECHA",
  "PASADAS",
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function asistenciaSchedule(asis: Asistencia): ConvocatoriaScheduleLike {
  return {
    fechaHora: asis.convocatoriaFechaHora,
    estado: asis.convocatoriaEstado,
  };
}

export function parseAsistenciaEventDate(asis: Asistencia): Date | null {
  return parseConvocatoriaDate(asistenciaSchedule(asis));
}

export function isPastAsistencia(asis: Asistencia, now = new Date()): boolean {
  const estado = asis.convocatoriaEstado;
  if (estado === "FINALIZADA" || estado === "CANCELADA") return true;
  if (estado === "EN_PROGRESO") return false;
  const eventDate = parseAsistenciaEventDate(asis);
  if (!eventDate) return false;
  return eventDate.getTime() < now.getTime();
}

export function formatAsistenciaEventProximity(asis: Asistencia, now = new Date()): string | null {
  return formatEventProximity(asistenciaSchedule(asis), now);
}

export function matchesAsistenciaFilter(
  asis: Asistencia,
  filter: AsistenciaQuickFilter
): boolean {
  const now = new Date();
  const eventDate = parseAsistenciaEventDate(asis);

  switch (filter) {
    case "ASISTIRE":
      return asis.estado === "ASISTIRE" && !isPastAsistencia(asis, now);

    case "PENDIENTES":
      return (
        (asis.estado === "PENDIENTE" || asis.estado === "LISTA_ESPERA") &&
        !isPastAsistencia(asis, now)
      );

    case "PASADAS":
      return isPastAsistencia(asis, now);

    case "SEMANA": {
      if (isPastAsistencia(asis, now)) return false;
      if (!eventDate) return false;
      const weekEnd = endOfDay(addDays(startOfDay(now), 6));
      return eventDate >= startOfDay(now) && eventDate <= weekEnd;
    }

    case "TODAS":
      return true;

    case "PROXIMAS":
    default:
      return !isPastAsistencia(asis, now);
  }
}

function compareAsistencias(a: Asistencia, b: Asistencia): number {
  const da = parseAsistenciaEventDate(a);
  const db = parseAsistenciaEventDate(b);
  if (da && db) return da.getTime() - db.getTime();
  if (da) return -1;
  if (db) return 1;
  return (a.convocatoriaTitulo ?? "").localeCompare(b.convocatoriaTitulo ?? "", "es");
}

function compareAsistenciasPast(a: Asistencia, b: Asistencia): number {
  const da = parseAsistenciaEventDate(a);
  const db = parseAsistenciaEventDate(b);
  if (da && db) return db.getTime() - da.getTime();
  if (da) return -1;
  if (db) return 1;
  return (a.convocatoriaTitulo ?? "").localeCompare(b.convocatoriaTitulo ?? "", "es");
}

export interface AsistenciaListSection {
  id: ConvocatoriaTimeGroup;
  label: string;
  items: Asistencia[];
}

export function buildAsistenciaSections(
  asistencias: Asistencia[],
  filter: AsistenciaQuickFilter
): AsistenciaListSection[] {
  const filtered = asistencias.filter((a) => matchesAsistenciaFilter(a, filter));

  if (filter === "PASADAS") {
    const sorted = [...filtered].sort(compareAsistenciasPast);
    return sorted.length
      ? [{ id: "PASADAS", label: GROUP_LABELS.PASADAS, items: sorted }]
      : [];
  }

  const buckets = new Map<ConvocatoriaTimeGroup, Asistencia[]>();
  for (const asis of filtered) {
    const g = !asis.convocatoriaFechaHora
      ? ("SIN_FECHA" as ConvocatoriaTimeGroup)
      : getTimeGroup(asistenciaSchedule(asis));
    if (!buckets.has(g)) buckets.set(g, []);
    buckets.get(g)!.push(asis);
  }

  for (const [key, items] of buckets) {
    items.sort(key === "PASADAS" ? compareAsistenciasPast : compareAsistencias);
  }

  const order =
    filter === "TODAS"
      ? ([...GROUP_ORDER, "BORRADORES"] as ConvocatoriaTimeGroup[])
      : GROUP_ORDER.filter((g) => g !== "BORRADORES");

  return order
    .map((id) => ({
      id,
      label: GROUP_LABELS[id],
      items: buckets.get(id) ?? [],
    }))
    .filter((s) => s.items.length > 0);
}
