ALTER TABLE convocatorias
    ADD COLUMN IF NOT EXISTS modo_formacion VARCHAR(30) DEFAULT 'BALANCEADO';

UPDATE convocatorias
SET modo_formacion = 'BALANCEADO'
WHERE modo_formacion IS NULL;

ALTER TABLE convocatorias
    ALTER COLUMN modo_formacion SET DEFAULT 'BALANCEADO',
    ALTER COLUMN modo_formacion SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_convocatorias_modo_formacion'
    ) THEN
        ALTER TABLE convocatorias
            ADD CONSTRAINT chk_convocatorias_modo_formacion
            CHECK (modo_formacion IN ('BALANCEADO', 'EQUIPOS_POR_GRUPO'));
    END IF;
END $$;
