import type { Convocatoria } from "@/types";
import { parseConvocatoriaDate, type ConvocatoriaScheduleLike } from "@/lib/convocatoriaList";
import { validateIndividualEventDateTime } from "@/lib/convocatoriaSchedule";

export type BorradorSchedule = ConvocatoriaScheduleLike & {
  puedePublicarse?: boolean;
};

/** Borrador cuya fecha/hora de evento ya no es válida para publicar. */
export function isBorradorConFechaPasada(conv: BorradorSchedule, now = new Date()): boolean {
  if (conv.fechaEventoPasada != null) {
    return conv.fechaEventoPasada;
  }
  if (conv.estado !== "BORRADOR") return false;
  const eventDate = parseConvocatoriaDate(conv);
  if (!eventDate) return false;
  return validateIndividualEventDateTime(conv.fechaHora ?? "", now) != null;
}

export function puedePublicarBorrador(conv: BorradorSchedule, now = new Date()): boolean {
  if (conv.estado !== "BORRADOR") return false;
  if (conv.puedePublicarse != null) {
    return conv.puedePublicarse;
  }
  return !isBorradorConFechaPasada(conv, now);
}

export const MENSAJE_BORRADOR_FECHA_PASADA =
  "La fecha del evento ya pasó. Edita la convocatoria con una fecha futura o elimina el borrador.";

export const TOOLTIP_PUBLICAR_BORRADOR =
  "Publicar convocatoria y abrir inscripciones";

export const TOOLTIP_PUBLICAR_BLOQUEADO = MENSAJE_BORRADOR_FECHA_PASADA;
