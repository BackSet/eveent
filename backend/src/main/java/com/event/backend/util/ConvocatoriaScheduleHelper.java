package com.event.backend.util;

import com.event.backend.exception.BusinessException;
import com.event.backend.model.Convocatoria;
import com.event.backend.model.EstadoConvocatoria;

import java.time.LocalDateTime;

public final class ConvocatoriaScheduleHelper {

    public static final int MIN_EVENT_LEAD_HOURS_SAME_DAY = 1;
    /** Días tras la fecha del evento antes de cancelar automáticamente un borrador huérfano. */
    public static final int DRAFT_AUTO_CANCEL_GRACE_DAYS = 1;

    private ConvocatoriaScheduleHelper() {}

    public static boolean isEventScheduleInPast(LocalDateTime eventTime, LocalDateTime now) {
        if (eventTime == null) {
            return false;
        }
        if (eventTime.toLocalDate().isEqual(now.toLocalDate())) {
            return eventTime.isBefore(now.plusHours(MIN_EVENT_LEAD_HOURS_SAME_DAY));
        }
        return eventTime.isBefore(now);
    }

    public static boolean isDraftEventDatePassed(Convocatoria convocatoria, LocalDateTime now) {
        if (convocatoria == null || convocatoria.getEstado() != EstadoConvocatoria.BORRADOR) {
            return false;
        }
        return isEventScheduleInPast(convocatoria.getFechaHora(), now);
    }

    public static boolean canPublishDraft(Convocatoria convocatoria, LocalDateTime now) {
        if (convocatoria == null || convocatoria.getEstado() != EstadoConvocatoria.BORRADOR) {
            return false;
        }
        return !isDraftEventDatePassed(convocatoria, now);
    }

    public static boolean shouldAutoCancelExpiredDraft(LocalDateTime eventTime, LocalDateTime now) {
        if (eventTime == null) {
            return false;
        }
        return eventTime.plusDays(DRAFT_AUTO_CANCEL_GRACE_DAYS).isBefore(now);
    }

    public static void assertEventNotInPastForPublish(LocalDateTime eventTime, LocalDateTime now) {
        if (eventTime == null) {
            return;
        }
        if (!isEventScheduleInPast(eventTime, now)) {
            return;
        }
        if (eventTime.toLocalDate().isEqual(now.toLocalDate())) {
            throw new BusinessException(
                    "Para convocatorias del mismo día, la hora del evento debe ser al menos una hora posterior a la hora actual.");
        }
        throw new BusinessException(
                "No se puede publicar: la fecha y hora del evento ya pasaron. Edita la convocatoria o elimínala.");
    }

    public static void assertScheduleAllowed(LocalDateTime eventTime, LocalDateTime now) {
        if (eventTime == null) {
            return;
        }
        if (eventTime.toLocalDate().isEqual(now.toLocalDate())) {
            if (eventTime.isBefore(now.plusHours(MIN_EVENT_LEAD_HOURS_SAME_DAY))) {
                throw new BusinessException(
                        "Para convocatorias del mismo día, la hora del evento debe ser al menos una hora posterior a la hora actual.");
            }
        } else if (eventTime.isBefore(now)) {
            throw new BusinessException("La fecha y hora de la convocatoria no puede ser en el pasado.");
        }
    }

    /** Permite eliminar borradores (incl. vencidos), ABIERTA y CANCELADA; bloquea en juego o finalizada. */
    public static void assertConvocatoriaDeletable(Convocatoria convocatoria) {
        if (convocatoria == null) {
            return;
        }
        EstadoConvocatoria estado = convocatoria.getEstado();
        if (estado == EstadoConvocatoria.BORRADOR
                || estado == EstadoConvocatoria.ABIERTA
                || estado == EstadoConvocatoria.CANCELADA) {
            return;
        }
        if (estado == EstadoConvocatoria.EN_PROGRESO) {
            throw new BusinessException(
                    "No se puede eliminar una convocatoria en progreso. Cancélala o espera a que finalice.");
        }
        if (estado == EstadoConvocatoria.FINALIZADA) {
            throw new BusinessException("No se puede eliminar una convocatoria finalizada.");
        }
        throw new BusinessException("No se puede eliminar esta convocatoria en su estado actual.");
    }

    /** Edición de metadatos: borrador y abierta siempre; bloquea terminales y en juego. */
    public static void assertConvocatoriaEditable(Convocatoria convocatoria) {
        if (convocatoria == null) {
            return;
        }
        EstadoConvocatoria estado = convocatoria.getEstado();
        if (estado == EstadoConvocatoria.BORRADOR || estado == EstadoConvocatoria.ABIERTA) {
            return;
        }
        if (estado == EstadoConvocatoria.EN_PROGRESO) {
            throw new BusinessException(
                    "No se pueden editar los datos de una convocatoria en progreso.");
        }
        if (estado == EstadoConvocatoria.FINALIZADA) {
            throw new BusinessException("No se pueden editar los datos de una convocatoria finalizada.");
        }
        if (estado == EstadoConvocatoria.CANCELADA) {
            throw new BusinessException("No se pueden editar los datos de una convocatoria cancelada.");
        }
    }

    /** Cancelar convocatoria: solo ABIERTA. */
    public static void assertConvocatoriaCancellable(Convocatoria convocatoria) {
        if (convocatoria == null) {
            return;
        }
        EstadoConvocatoria estado = convocatoria.getEstado();
        if (estado == EstadoConvocatoria.ABIERTA) {
            return;
        }
        if (estado == EstadoConvocatoria.BORRADOR) {
            throw new BusinessException(
                    "No se puede cancelar un borrador. Elimínalo o publícalo primero.");
        }
        if (estado == EstadoConvocatoria.EN_PROGRESO) {
            throw new BusinessException(
                    "No se puede cancelar una convocatoria en progreso.");
        }
        if (estado == EstadoConvocatoria.FINALIZADA) {
            throw new BusinessException("No se puede cancelar una convocatoria finalizada.");
        }
        if (estado == EstadoConvocatoria.CANCELADA) {
            throw new BusinessException("La convocatoria ya está cancelada.");
        }
        throw new BusinessException("No se puede cancelar esta convocatoria en su estado actual.");
    }

    /** Autobalanceo y bandos: solo ABIERTA con evento no pasado. */
    public static void assertConvocatoriaMatchmakingAllowed(Convocatoria convocatoria, LocalDateTime now) {
        if (convocatoria == null) {
            return;
        }
        if (convocatoria.getEstado() != EstadoConvocatoria.ABIERTA) {
            throw new BusinessException(
                    "Solo se puede autobalancear una convocatoria abierta (publicada).");
        }
        assertConvocatoriaActiveForSideEffects(convocatoria, now);
    }

    /** Cambios en asistencias/bandos: bloquea estados terminales y eventos cuya hora ya pasó. */
    public static void assertConvocatoriaActiveForSideEffects(Convocatoria convocatoria, LocalDateTime now) {
        if (convocatoria == null) {
            return;
        }
        if (convocatoria.getEstado() == EstadoConvocatoria.EN_PROGRESO) {
            throw new BusinessException(
                    "No se pueden realizar cambios en asistencias o bandos de una convocatoria en progreso.");
        }
        if (convocatoria.getEstado() == EstadoConvocatoria.FINALIZADA) {
            throw new BusinessException(
                    "No se pueden realizar cambios en asistencias o bandos de una convocatoria finalizada.");
        }
        if (convocatoria.getEstado() == EstadoConvocatoria.CANCELADA) {
            throw new BusinessException(
                    "No se pueden realizar cambios en asistencias o bandos de una convocatoria cancelada.");
        }
        if (isEventScheduleInPast(convocatoria.getFechaHora(), now)) {
            throw new BusinessException(
                    "No se pueden realizar cambios: la fecha y hora del evento ya pasaron.");
        }
    }
}
