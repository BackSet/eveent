ALTER TABLE bandos_convocatoria
    ALTER COLUMN nombre TYPE VARCHAR(120);

CREATE TABLE IF NOT EXISTS convocatoria_grupo_equipos (
    id BIGSERIAL PRIMARY KEY,
    convocatoria_id BIGINT NOT NULL REFERENCES convocatorias(id) ON DELETE CASCADE,
    grupo_id BIGINT NOT NULL REFERENCES grupos(id),
    equipo_id BIGINT NOT NULL REFERENCES bandos_convocatoria(id) ON DELETE CASCADE,
    nombre_equipo VARCHAR(120) NOT NULL,
    cupo_titulares INTEGER NOT NULL,
    cupo_espera INTEGER,
    orden INTEGER NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP,

    CONSTRAINT uk_convocatoria_grupo_equipos_convocatoria_grupo
        UNIQUE (convocatoria_id, grupo_id),

    CONSTRAINT uk_convocatoria_grupo_equipos_convocatoria_equipo
        UNIQUE (convocatoria_id, equipo_id)
);

CREATE INDEX IF NOT EXISTS idx_convocatoria_grupo_equipos_convocatoria
    ON convocatoria_grupo_equipos(convocatoria_id);

CREATE INDEX IF NOT EXISTS idx_convocatoria_grupo_equipos_grupo
    ON convocatoria_grupo_equipos(grupo_id);
