-- Tipo de invitación y grupo vinculado en convocatorias
ALTER TABLE convocatorias
    ADD COLUMN IF NOT EXISTS tipo_invitacion VARCHAR(20) NOT NULL DEFAULT 'ABIERTA';

ALTER TABLE convocatorias
    ADD COLUMN IF NOT EXISTS grupo_id BIGINT REFERENCES grupos(id);
