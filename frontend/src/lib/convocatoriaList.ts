import type { Convocatoria } from "@/types";
import { isEventScheduleInPast } from "@/lib/convocatoriaSchedule";
import { isBorradorConFechaPasada } from "@/lib/convocatoriaDraft";

/** Datos mínimos para ordenar/agrupar por fecha de evento. */
export type ConvocatoriaScheduleLike = {
  fechaHora?: string | null;
  estado?: string;
  fechaEventoPasada?: boolean;
};

export type ConvocatoriaQuickFilter =
  | "PROXIMAS"
  | "SEMANA"
  | "ABIERTAS"
  | "BORRADORES"
  | "TODAS"
  | "PASADAS"
  | "VENCIDOS";

export type ConvocatoriaTimeGroup =
  | "EN_JUEGO"
  | "HOY"
  | "MANANA"
  | "ESTA_SEMANA"
  | "PROXIMAMENTE"
  | "BORRADORES"
  | "BORRADORES_VENCIDOS"
  | "PASADAS"
  | "SIN_FECHA";

export const QUICK_FILTER_LABELS: Record<ConvocatoriaQuickFilter, string> = {
  PROXIMAS: "Próximas",
  SEMANA: "Esta semana",
  ABIERTAS: "Abiertas",
  BORRADORES: "Borradores",
  TODAS: "Todas",
  PASADAS: "Historial",
  VENCIDOS: "Vencidos",
};

const GROUP_LABELS: Record<ConvocatoriaTimeGroup, string> = {
  EN_JUEGO: "En juego ahora",
  HOY: "Hoy",
  MANANA: "Mañana",
  ESTA_SEMANA: "Esta semana",
  PROXIMAMENTE: "Más adelante",
  BORRADORES: "Borradores",
  BORRADORES_VENCIDOS: "Borradores vencidos",
  PASADAS: "Pasadas y canceladas",
  SIN_FECHA: "Sin fecha programada",
};

const GROUP_ORDER: ConvocatoriaTimeGroup[] = [
  "EN_JUEGO",
  "HOY",
  "MANANA",
  "ESTA_SEMANA",
  "PROXIMAMENTE",
  "BORRADORES",
  "BORRADORES_VENCIDOS",
  "SIN_FECHA",
  "PASADAS",
];

const ESTADO_PRIORITY: Record<string, number> = {
  EN_PROGRESO: 0,
  ABIERTA: 1,
  BORRADOR: 2,
  FINALIZADA: 3,
  CANCELADA: 4,
};

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

export function parseConvocatoriaDate(conv: ConvocatoriaScheduleLike): Date | null {
  if (!conv.fechaHora) return null;
  const d = new Date(conv.fechaHora);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isPastConvocatoria(conv: ConvocatoriaScheduleLike, now = new Date()): boolean {
  if (conv.estado === "FINALIZADA" || conv.estado === "CANCELADA") return true;
  if (conv.estado === "EN_PROGRESO") return false;
  if (!conv.fechaHora) return false;
  return isEventScheduleInPast(conv.fechaHora, now);
}

export function matchesQuickFilter(
  conv: Convocatoria,
  filter: ConvocatoriaQuickFilter,
  options?: { includeBorradores?: boolean }
): boolean {
  const now = new Date();
  const eventDate = parseConvocatoriaDate(conv);
  const includeBorradores = options?.includeBorradores ?? false;

  switch (filter) {
    case "ABIERTAS":
      return conv.estado === "ABIERTA";

    case "PASADAS":
      return isPastConvocatoria(conv, now);

    case "VENCIDOS":
      return conv.estado === "BORRADOR" && isBorradorConFechaPasada(conv, now);

    case "BORRADORES":
      return conv.estado === "BORRADOR" && !isBorradorConFechaPasada(conv, now);

    case "SEMANA": {
      if (conv.estado === "CANCELADA") return false;
      if (!eventDate) {
        return includeBorradores && conv.estado === "BORRADOR" && !isBorradorConFechaPasada(conv, now);
      }
      if (conv.estado === "BORRADOR" && isBorradorConFechaPasada(conv, now)) return false;
      const weekEnd = endOfDay(addDays(startOfDay(now), 6));
      return eventDate >= startOfDay(now) && eventDate <= weekEnd;
    }

    case "TODAS":
      return true;

    case "PROXIMAS":
    default: {
      if (conv.estado === "FINALIZADA" || conv.estado === "CANCELADA") return false;
      if (conv.estado === "EN_PROGRESO" || conv.estado === "ABIERTA") return true;
      if (conv.estado === "BORRADOR") {
        return includeBorradores && !isBorradorConFechaPasada(conv, now);
      }
      if (!eventDate) return includeBorradores;
      return eventDate >= startOfDay(now);
    }
  }
}

export function getTimeGroup(conv: ConvocatoriaScheduleLike, now = new Date()): ConvocatoriaTimeGroup {
  if (conv.estado === "BORRADOR") {
    if (conv.fechaEventoPasada) return "BORRADORES_VENCIDOS";
    const eventDate = parseConvocatoriaDate(conv);
    if (eventDate && eventDate.getTime() < now.getTime()) return "BORRADORES_VENCIDOS";
    return "BORRADORES";
  }
  if (isPastConvocatoria(conv, now)) return "PASADAS";
  if (conv.estado === "EN_PROGRESO") return "EN_JUEGO";

  const eventDate = parseConvocatoriaDate(conv);
  if (!eventDate) return "SIN_FECHA";

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrowEnd = endOfDay(addDays(todayStart, 1));
  const weekEnd = endOfDay(addDays(todayStart, 6));

  if (eventDate >= todayStart && eventDate <= todayEnd) return "HOY";
  if (eventDate > todayEnd && eventDate <= tomorrowEnd) return "MANANA";
  if (eventDate > tomorrowEnd && eventDate <= weekEnd) return "ESTA_SEMANA";
  return "PROXIMAMENTE";
}

export function compareConvocatorias(a: Convocatoria, b: Convocatoria): number {
  const pa = ESTADO_PRIORITY[a.estado] ?? 9;
  const pb = ESTADO_PRIORITY[b.estado] ?? 9;
  if (pa !== pb) return pa - pb;

  const da = parseConvocatoriaDate(a);
  const db = parseConvocatoriaDate(b);
  if (da && db) return da.getTime() - db.getTime();
  if (da) return -1;
  if (db) return 1;
  return a.titulo.localeCompare(b.titulo, "es");
}

export function compareConvocatoriasPast(a: Convocatoria, b: Convocatoria): number {
  const da = parseConvocatoriaDate(a);
  const db = parseConvocatoriaDate(b);
  if (da && db) return db.getTime() - da.getTime();
  if (da) return -1;
  if (db) return 1;
  return a.titulo.localeCompare(b.titulo, "es");
}

export interface ConvocatoriaListSection {
  id: ConvocatoriaTimeGroup;
  label: string;
  items: Convocatoria[];
}

export function buildConvocatoriaSections(
  convocatorias: Convocatoria[],
  filter: ConvocatoriaQuickFilter,
  options?: { includeBorradores?: boolean; groupPast?: boolean }
): ConvocatoriaListSection[] {
  const includeBorradores = options?.includeBorradores ?? false;
  const groupPast = options?.groupPast ?? filter !== "PASADAS";

  const filtered = convocatorias.filter((c) =>
    matchesQuickFilter(c, filter, { includeBorradores })
  );

  if (filter === "PASADAS" || filter === "VENCIDOS" || filter === "BORRADORES") {
    const sorted = [...filtered].sort(
      filter === "BORRADORES" ? compareConvocatorias : compareConvocatoriasPast
    );
    const sectionId =
      filter === "VENCIDOS"
        ? "BORRADORES_VENCIDOS"
        : filter === "BORRADORES"
          ? "BORRADORES"
          : "PASADAS";
    const label =
      filter === "BORRADORES" || filter === "VENCIDOS"
        ? QUICK_FILTER_LABELS[filter]
        : GROUP_LABELS[sectionId];
    return sorted.length ? [{ id: sectionId, label, items: sorted }] : [];
  }

  if (!groupPast || filter === "TODAS") {
    const sorted =
      filter === "TODAS"
        ? [...filtered].sort((a, b) => {
            const aPast = isPastConvocatoria(a);
            const bPast = isPastConvocatoria(b);
            if (aPast !== bPast) return aPast ? 1 : -1;
            return aPast ? compareConvocatoriasPast(a, b) : compareConvocatorias(a, b);
          })
        : [...filtered].sort(compareConvocatorias);

    if (filter === "TODAS") {
      const buckets = new Map<ConvocatoriaTimeGroup, Convocatoria[]>();
      for (const conv of sorted) {
        const g = getTimeGroup(conv);
        if (!buckets.has(g)) buckets.set(g, []);
        buckets.get(g)!.push(conv);
      }
      return GROUP_ORDER.map((id) => ({
        id,
        label: GROUP_LABELS[id],
        items: buckets.get(id) ?? [],
      })).filter((s) => s.items.length > 0);
    }

    return sorted.length
      ? [{ id: "PROXIMAMENTE", label: "Convocatorias", items: sorted }]
      : [];
  }

  const buckets = new Map<ConvocatoriaTimeGroup, Convocatoria[]>();
  for (const conv of filtered) {
    const g = getTimeGroup(conv);
    if (!buckets.has(g)) buckets.set(g, []);
    buckets.get(g)!.push(conv);
  }

  for (const [key, items] of buckets) {
    items.sort(key === "PASADAS" ? compareConvocatoriasPast : compareConvocatorias);
  }

  return GROUP_ORDER.map((id) => ({
    id,
    label: GROUP_LABELS[id],
    items: buckets.get(id) ?? [],
  })).filter((s) => s.items.length > 0);
}

/** Etiqueta temporal junto a la fecha: Hoy, Mañana, En 3 días… (no duplica el badge de estado). */
export function formatEventProximity(conv: ConvocatoriaScheduleLike, now = new Date()): string | null {
  if (
    conv.estado === "BORRADOR" ||
    conv.estado === "CANCELADA" ||
    conv.estado === "FINALIZADA" ||
    conv.estado === "EN_PROGRESO"
  ) {
    return null;
  }

  const eventDate = parseConvocatoriaDate(conv);
  if (!eventDate) return null;

  const todayStart = startOfDay(now);
  const diffMs = startOfDay(eventDate).getTime() - todayStart.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return "Pasado";
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  if (diffDays <= 7) return `En ${diffDays} días`;
  return null;
}
