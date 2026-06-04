ALTER TABLE grupo_jugadores
    ADD COLUMN IF NOT EXISTS rol_grupo VARCHAR(30) NOT NULL DEFAULT 'JUGADOR',
    ADD COLUMN IF NOT EXISTS asignado_por_id BIGINT REFERENCES usuarios(id),
    ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMP;

INSERT INTO grupo_jugadores (grupo_id, usuario_id, rol_grupo, asignado_por_id, fecha_creacion)
SELECT g.id, g.creado_por_id, 'CREADOR', g.creado_por_id, NOW()
FROM grupos g
WHERE NOT EXISTS (
    SELECT 1
    FROM grupo_jugadores gj
    WHERE gj.grupo_id = g.id
      AND gj.usuario_id = g.creado_por_id
);

UPDATE grupo_jugadores gj
SET rol_grupo = 'CREADOR',
    asignado_por_id = COALESCE(gj.asignado_por_id, g.creado_por_id),
    fecha_actualizacion = NOW()
FROM grupos g
WHERE gj.grupo_id = g.id
  AND gj.usuario_id = g.creado_por_id;

UPDATE grupo_jugadores gj
SET rol_grupo = 'JUGADOR'
WHERE rol_grupo IS NULL
   OR rol_grupo NOT IN ('CREADOR', 'ORGANIZADOR', 'JUGADOR');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_grupo_jugadores_rol_grupo'
    ) THEN
        ALTER TABLE grupo_jugadores
            ADD CONSTRAINT chk_grupo_jugadores_rol_grupo
            CHECK (rol_grupo IN ('CREADOR', 'ORGANIZADOR', 'JUGADOR'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_grupo_jugadores_rol
    ON grupo_jugadores(grupo_id, rol_grupo);
