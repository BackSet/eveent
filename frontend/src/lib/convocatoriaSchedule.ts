import type { HorarioDia } from "@/types";

/** Margen mínimo entre ahora y el inicio del evento (convocatoria individual). */
export const MIN_EVENT_LEAD_MINUTES = 60;

/**
 * Replica ConvocatoriaScheduleHelper.isEventScheduleInPast del backend.
 * Mismo día: el evento debe ser al menos MIN_EVENT_LEAD_MINUTES después de ahora.
 */
export function isEventScheduleInPast(fechaHora: string | undefined, now = new Date()): boolean {
  if (!fechaHora || !fechaHora.includes("T")) {
    return false;
  }
  const event = new Date(fechaHora);
  if (Number.isNaN(event.getTime())) {
    return false;
  }
  const today = toLocalDateValue(now);
  const eventDate = fechaHora.split("T")[0];
  if (eventDate === today) {
    return event.getTime() < getMinimumEventDate(now).getTime();
  }
  return event.getTime() < now.getTime();
}

export function toLocalDateValue(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function toLocalTimeValue(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(11, 16);
}

export function combineDateAndTime(date: string, time: string): string {
  return `${date}T${time}`;
}

export function splitDateTimeLocal(fechaHora: string): { date: string; time: string } {
  if (!fechaHora || !fechaHora.includes("T")) {
    const suggested = getSuggestedDefaultDateTime();
    return { date: suggested.date, time: suggested.time };
  }
  const [date, time] = fechaHora.split("T");
  return { date, time: time?.slice(0, 5) || "20:00" };
}

export function getMinimumEventDate(now: Date = new Date()): Date {
  return new Date(now.getTime() + MIN_EVENT_LEAD_MINUTES * 60 * 1000);
}

/** Redondea al siguiente bloque de 15 minutos. */
export function roundUpToQuarterHour(d: Date): Date {
  const copy = new Date(d);
  const minutes = copy.getMinutes();
  const rounded = Math.ceil(minutes / 15) * 15;
  copy.setMinutes(rounded, 0, 0);
  if (rounded >= 60) {
    copy.setHours(copy.getHours() + 1);
    copy.setMinutes(0, 0, 0);
  }
  return copy;
}

export function getSuggestedDefaultDateTime(now: Date = new Date()): {
  date: string;
  time: string;
  fechaHora: string;
} {
  const min = roundUpToQuarterHour(getMinimumEventDate(now));
  const date = toLocalDateValue(min);
  const time = toLocalTimeValue(min);
  return { date, time, fechaHora: combineDateAndTime(date, time) };
}

export function formatTimeLocal(d: Date): string {
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTimeLocal(fechaHora: string): string | null {
  if (!fechaHora) return null;
  const d = new Date(fechaHora);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * El evento debe ser estrictamente posterior a «ahora + margen».
 * (La creación de la convocatoria ocurre ahora; el evento va después.)
 */
export function validateIndividualEventDateTime(
  fechaHora: string,
  now: Date = new Date()
): string | null {
  if (!fechaHora || !fechaHora.includes("T")) {
    return "Indica la fecha y la hora del evento.";
  }

  const event = new Date(fechaHora);
  if (Number.isNaN(event.getTime())) {
    return "Fecha u hora no válida.";
  }

  const minEvent = getMinimumEventDate(now);
  if (event < minEvent) {
    const today = toLocalDateValue(now);
    const eventDate = fechaHora.split("T")[0];
    if (eventDate < today) {
      return "No puedes programar el evento en una fecha pasada. Elige hoy o un día futuro.";
    }
    if (eventDate === today) {
      return `El evento debe empezar al menos ${MIN_EVENT_LEAD_MINUTES} minutos después de ahora (desde las ${formatTimeLocal(minEvent)}).`;
    }
    return "La fecha y hora del evento no pueden ser en el pasado.";
  }

  return null;
}

export function getMinTimeForDate(date: string, now: Date = new Date()): string | undefined {
  const today = toLocalDateValue(now);
  if (date !== today) return undefined;
  return toLocalTimeValue(getMinimumEventDate(now));
}

export function clampDateTimeToMinimum(fechaHora: string, now: Date = new Date()): string {
  const error = validateIndividualEventDateTime(fechaHora, now);
  if (!error) return fechaHora;
  const suggested = getSuggestedDefaultDateTime(now);
  return suggested.fechaHora;
}

export function validateHorarioDia(hor: HorarioDia): string | null {
  if (hor.horaApertura && hor.horaEvento && hor.horaApertura >= hor.horaEvento) {
    return "La hora de apertura debe ser anterior a la hora del evento.";
  }
  return null;
}

const DAY_LABELS: Record<string, string> = {
  MO: "Lunes",
  TU: "Martes",
  WE: "Miércoles",
  TH: "Jueves",
  FR: "Viernes",
  SA: "Sábado",
  SU: "Domingo",
  DEFAULT: "Cada ocurrencia",
};

export function validateRecurrentHorarios(
  horariosPorDia: Record<string, HorarioDia>,
  activeKeys: string[]
): string | null {
  for (const key of activeKeys) {
    const hor = horariosPorDia[key] || { horaApertura: "08:00", horaEvento: "20:00", duracionMinutos: 90 };
    const err = validateHorarioDia(hor);
    if (err) {
      const label = DAY_LABELS[key] ?? key;
      return `${err} Revisa el horario de «${label}».`;
    }
  }
  return null;
}
