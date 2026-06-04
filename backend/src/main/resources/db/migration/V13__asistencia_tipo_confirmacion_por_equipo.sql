ALTER TABLE asistencias
    ADD COLUMN IF NOT EXISTS tipo_confirmacion VARCHAR(30) NOT NULL DEFAULT 'TITULAR';

UPDATE asistencias
SET tipo_confirmacion = CASE
    WHEN estado = 'LISTA_ESPERA' THEN 'ESPERA'
    ELSE 'TITULAR'
END
WHERE tipo_confirmacion IS NULL
   OR tipo_confirmacion NOT IN ('TITULAR', 'ESPERA');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_asistencias_tipo_confirmacion'
    ) THEN
        ALTER TABLE asistencias
            ADD CONSTRAINT chk_asistencias_tipo_confirmacion
            CHECK (tipo_confirmacion IN ('TITULAR', 'ESPERA'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_asistencias_conv_bando_tipo
    ON asistencias(convocatoria_id, bando_id, tipo_confirmacion);
