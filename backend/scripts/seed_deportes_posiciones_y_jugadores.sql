-- Carga catalogo de deportes/posiciones y asigna una posicion por deporte
-- a cada usuario con rol Jugador que aun no tenga posicion en ese deporte.
--
-- Uso local:
--   PGPASSWORD=*** psql -h localhost -U postgres -d event -f backend/scripts/seed_deportes_posiciones_y_jugadores.sql

BEGIN;

WITH deportes_seed(nombre, es_por_equipos, min_jugadores_por_bando, max_jugadores_por_bando) AS (
    VALUES
        ('Fútbol', true, 7, 11),
        ('Baloncesto', true, 5, 5),
        ('Vóleibol', true, 6, 6),
        ('Tenis', false, 1, 2),
        ('Trotar / Running', false, 1, 1),
        ('Ciclismo', false, 1, 1),
        ('Pádel', false, 1, 2)
)
INSERT INTO deportes (nombre, es_por_equipos, min_jugadores_por_bando, max_jugadores_por_bando)
SELECT nombre, es_por_equipos, min_jugadores_por_bando, max_jugadores_por_bando
FROM deportes_seed
ON CONFLICT (nombre) DO UPDATE
SET es_por_equipos = EXCLUDED.es_por_equipos,
    min_jugadores_por_bando = EXCLUDED.min_jugadores_por_bando,
    max_jugadores_por_bando = EXCLUDED.max_jugadores_por_bando;

WITH posiciones_seed(deporte_nombre, nombre, abreviatura, orden) AS (
    VALUES
        ('Fútbol', 'Portero', 'POR', 1),
        ('Fútbol', 'Defensa Central', 'DFC', 2),
        ('Fútbol', 'Lateral Izquierdo', 'LI', 3),
        ('Fútbol', 'Lateral Derecho', 'LD', 4),
        ('Fútbol', 'Mediocentro Defensivo', 'MCD', 5),
        ('Fútbol', 'Mediocentro Organizador', 'MC', 6),
        ('Fútbol', 'Mediapunta', 'MCO', 7),
        ('Fútbol', 'Extremo Izquierdo', 'EI', 8),
        ('Fútbol', 'Extremo Derecho', 'ED', 9),
        ('Fútbol', 'Delantero Centro', 'DC', 10),
        ('Baloncesto', 'Base', 'B', 1),
        ('Baloncesto', 'Escolta', 'E', 2),
        ('Baloncesto', 'Alero', 'A', 3),
        ('Baloncesto', 'Ala-Pívot', 'AP', 4),
        ('Baloncesto', 'Pívot', 'P', 5),
        ('Vóleibol', 'Colocador / Armador', 'COL', 1),
        ('Vóleibol', 'Rematador / Punta', 'PUN', 2),
        ('Vóleibol', 'Central', 'CEN', 3),
        ('Vóleibol', 'Opuesto', 'OPU', 4),
        ('Vóleibol', 'Líbero', 'LIB', 5),
        ('Tenis', 'Singles', 'SGL', 1),
        ('Tenis', 'Dobles', 'DBL', 2),
        ('Trotar / Running', 'Corredor Recreativo', 'REC', 1),
        ('Trotar / Running', 'Velocista', 'VEL', 2),
        ('Trotar / Running', 'Fondista / Maratonista', 'FON', 3),
        ('Trotar / Running', 'Trail Runner', 'TRL', 4),
        ('Ciclismo', 'Ciclista de Ruta', 'RUT', 1),
        ('Ciclismo', 'Escalador', 'ESC', 2),
        ('Ciclismo', 'Sprinter', 'SPR', 3),
        ('Ciclismo', 'Mountain Biker', 'MTB', 4),
        ('Pádel', 'Revés / Lado Izquierdo', 'REV', 1),
        ('Pádel', 'Drive / Lado Derecho', 'DRV', 2)
)
INSERT INTO posiciones_deporte (deporte_id, nombre, abreviatura)
SELECT d.id, ps.nombre, ps.abreviatura
FROM posiciones_seed ps
JOIN deportes d ON d.nombre = ps.deporte_nombre
WHERE NOT EXISTS (
    SELECT 1
    FROM posiciones_deporte p
    WHERE p.deporte_id = d.id
      AND lower(trim(p.nombre)) = lower(trim(ps.nombre))
);

WITH jugadores AS (
    SELECT DISTINCT u.id AS usuario_id
    FROM usuarios u
    JOIN usuario_roles ur ON ur.usuario_id = u.id
    JOIN roles_sistema r ON r.id = ur.rol_id
    WHERE r.nombre = 'Jugador'
      AND u.activo = true
),
primera_posicion_por_deporte AS (
    SELECT deporte_id, id AS posicion_id,
           row_number() OVER (PARTITION BY deporte_id ORDER BY id) AS rn
    FROM posiciones_deporte
),
faltantes AS (
    SELECT j.usuario_id, pp.posicion_id
    FROM jugadores j
    JOIN primera_posicion_por_deporte pp ON pp.rn = 1
    WHERE NOT EXISTS (
        SELECT 1
        FROM usuario_posiciones up
        JOIN posiciones_deporte p ON p.id = up.posicion_id
        WHERE up.usuario_id = j.usuario_id
          AND p.deporte_id = pp.deporte_id
    )
)
INSERT INTO usuario_posiciones (usuario_id, posicion_id, prioridad)
SELECT usuario_id, posicion_id, 0
FROM faltantes
ON CONFLICT (usuario_id, posicion_id) DO NOTHING;

COMMIT;
