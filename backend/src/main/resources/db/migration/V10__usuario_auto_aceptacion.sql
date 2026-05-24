-- Auto-aceptación de convocatorias (jugador)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auto_aceptacion_modo VARCHAR(30);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auto_aceptacion_referencia TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auto_aceptacion_actualizado_en TIMESTAMP;

UPDATE usuarios SET auto_aceptacion_modo = 'OFF' WHERE auto_aceptacion_modo IS NULL;

ALTER TABLE usuarios ALTER COLUMN auto_aceptacion_modo SET DEFAULT 'OFF';
ALTER TABLE usuarios ALTER COLUMN auto_aceptacion_modo SET NOT NULL;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_auto_aceptacion_modo_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_auto_aceptacion_modo_check
    CHECK (auto_aceptacion_modo IN ('OFF', 'HOY', 'DIA', 'DESDE_FECHA_HORA'));
