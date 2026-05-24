-- V9: Columnas y nullability que las entidades JPA esperan (hibernate ddl-auto=validate en prod)

ALTER TABLE convocatorias
    ADD COLUMN IF NOT EXISTS duracion_estimada_minutos INTEGER NOT NULL DEFAULT 60;

ALTER TABLE configuraciones_recurrentes
    ADD COLUMN IF NOT EXISTS horarios_por_dia TEXT;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS fecha_fin_suspension TIMESTAMP;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS motivo_suspension VARCHAR(500);

-- Entidades permiten deporte opcional; V1/V3 lo crearon NOT NULL
ALTER TABLE convocatorias
    ALTER COLUMN deporte_id DROP NOT NULL;

ALTER TABLE configuraciones_recurrentes
    ALTER COLUMN deporte_id DROP NOT NULL;

-- Entidad Convocatoria.estado admite hasta 30 caracteres
ALTER TABLE convocatorias
    ALTER COLUMN estado TYPE VARCHAR(30);
