-- La tabla convocatoria_grupo_equipos es solo un puente entre convocatoria, grupo y equipo.
-- El cupo de titulares por equipo pasa a ser convocatorias.cupo_maximo (fuente única) y la
-- espera es indefinida, por lo que se eliminan las columnas de cupo de la tabla puente.

ALTER TABLE convocatoria_grupo_equipos
    DROP COLUMN IF EXISTS cupo_titulares,
    DROP COLUMN IF EXISTS cupo_espera;
