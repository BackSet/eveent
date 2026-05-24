package com.event.backend.model;

/**
 * Define quién puede ver y confirmar asistencia en una convocatoria.
 */
public enum TipoInvitacion {
    /** Cualquier jugador que practique el deporte de la convocatoria. */
    ABIERTA,
    /** Solo miembros del grupo vinculado. */
    GRUPO,
    /** Solo jugadores invitados explícitamente (registro de asistencia previo). */
    MANUAL
}
