-- Soporte de "equipos por grupo" en las configuraciones recurrentes.
-- Los grupos participantes se guardan como JSON de ids en una columna de texto
-- (mismo enfoque que horarios_por_dia), para no requerir una tabla de unión.

ALTER TABLE configuraciones_recurrentes
    ADD COLUMN IF NOT EXISTS modo_formacion VARCHAR(30) DEFAULT 'BALANCEADO';

UPDATE configuraciones_recurrentes
SET modo_formacion = 'BALANCEADO'
WHERE modo_formacion IS NULL;

ALTER TABLE configuraciones_recurrentes
    ALTER COLUMN modo_formacion SET DEFAULT 'BALANCEADO',
    ALTER COLUMN modo_formacion SET NOT NULL;

-- Los grupos participantes se guardan como JSON de ids; el cupo de titulares por
-- equipo es convocatorias.cupo_maximo (fuente única) y la espera es indefinida,
-- por eso no se añaden columnas de cupo.
ALTER TABLE configuraciones_recurrentes
    ADD COLUMN IF NOT EXISTS grupos_equipo_ids TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_config_recurrente_modo_formacion'
    ) THEN
        ALTER TABLE configuraciones_recurrentes
            ADD CONSTRAINT chk_config_recurrente_modo_formacion
            CHECK (modo_formacion IN ('BALANCEADO', 'EQUIPOS_POR_GRUPO'));
    END IF;
END $$;
