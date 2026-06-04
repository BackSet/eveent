CREATE TABLE IF NOT EXISTS reglas_posicion_equipo (
    id BIGSERIAL PRIMARY KEY,
    deporte_id BIGINT NOT NULL REFERENCES deportes(id),
    posicion_id BIGINT NOT NULL REFERENCES posiciones_deporte(id),
    cantidad_titulares INTEGER NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP,

    CONSTRAINT uk_reglas_posicion_equipo_deporte_posicion
        UNIQUE (deporte_id, posicion_id)
);

CREATE INDEX IF NOT EXISTS idx_reglas_posicion_equipo_deporte
    ON reglas_posicion_equipo(deporte_id, activo);
