-- V5: Add prioridad column to asistencias_posiciones_preferidas for ordered list support

CREATE TABLE IF NOT EXISTS asistencias_posiciones_preferidas (
    asistencia_id BIGINT NOT NULL REFERENCES asistencias(id) ON DELETE CASCADE,
    posicion_id BIGINT NOT NULL REFERENCES posiciones_deporte(id) ON DELETE CASCADE,
    PRIMARY KEY (asistencia_id, posicion_id)
);

ALTER TABLE asistencias_posiciones_preferidas ADD COLUMN IF NOT EXISTS prioridad INTEGER NOT NULL DEFAULT 0;
