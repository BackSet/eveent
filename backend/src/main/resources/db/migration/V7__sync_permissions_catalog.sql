-- V7: Catálogo canónico de permisos y asignación a roles predefinidos

-- 1. Renombrar clave legacy si aún existe
UPDATE permisos_sistema
SET clave = 'dividir_bandos',
    descripcion = COALESCE(descripcion, 'Dividir bandos y balanceo automático')
WHERE clave = 'dividir_equipos'
  AND NOT EXISTS (SELECT 1 FROM permisos_sistema WHERE clave = 'dividir_bandos');

-- 2. Fusionar rol_permisos legacy → dividir_bandos y eliminar permiso duplicado
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT rp.rol_id, pb.id
FROM rol_permisos rp
JOIN permisos_sistema pe ON pe.id = rp.permiso_id AND pe.clave = 'dividir_equipos'
JOIN permisos_sistema pb ON pb.clave = 'dividir_bandos'
WHERE NOT EXISTS (
    SELECT 1 FROM rol_permisos x
    WHERE x.rol_id = rp.rol_id AND x.permiso_id = pb.id
);

DELETE FROM rol_permisos
WHERE permiso_id IN (SELECT id FROM permisos_sistema WHERE clave = 'dividir_equipos');

DELETE FROM permisos_sistema WHERE clave = 'dividir_equipos';

-- 3. Insertar permisos faltantes del catálogo (no sobrescribe nombres editados en UI)
INSERT INTO permisos_sistema (clave, descripcion) VALUES
    ('ver_convocatorias', 'Ver convocatorias'),
    ('crear_convocatorias', 'Crear convocatorias'),
    ('editar_convocatorias', 'Editar convocatorias'),
    ('eliminar_convocatorias', 'Eliminar convocatorias'),
    ('cancelar_convocatorias', 'Cancelar convocatorias'),
    ('responder_asistencia', 'Responder asistencia (RSVP)'),
    ('invitar_externos', 'Invitar jugadores externos'),
    ('dividir_bandos', 'Dividir bandos y balanceo automático'),
    ('ver_grupos', 'Ver grupos de jugadores'),
    ('crear_grupos', 'Crear grupos de jugadores'),
    ('editar_grupos', 'Editar grupos y miembros'),
    ('eliminar_grupos', 'Eliminar grupos'),
    ('ver_deportes', 'Ver disciplinas y posiciones'),
    ('gestionar_deportes', 'Gestionar disciplinas y posiciones'),
    ('ver_usuarios', 'Ver usuarios del sistema'),
    ('crear_usuarios', 'Crear usuarios'),
    ('editar_usuarios', 'Editar usuarios'),
    ('dar_baja_usuarios', 'Dar de baja usuarios'),
    ('suspender_jugadores', 'Suspender jugadores'),
    ('ver_roles', 'Ver roles y privilegios'),
    ('gestionar_roles', 'Gestionar roles y privilegios'),
    ('ver_permisos', 'Ver permisos del sistema')
ON CONFLICT (clave) DO NOTHING;

-- 4. Roles predefinidos
INSERT INTO roles_sistema (nombre) VALUES
    ('SuperAdmin'),
    ('Organizador'),
    ('Jugador')
ON CONFLICT (nombre) DO NOTHING;

-- 5. SuperAdmin: todos los permisos del catálogo
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles_sistema r
CROSS JOIN permisos_sistema p
WHERE r.nombre = 'SuperAdmin'
  AND p.clave IN (
    'ver_convocatorias', 'crear_convocatorias', 'editar_convocatorias', 'eliminar_convocatorias',
    'cancelar_convocatorias', 'responder_asistencia', 'invitar_externos', 'dividir_bandos',
    'ver_grupos', 'crear_grupos', 'editar_grupos', 'eliminar_grupos',
    'ver_deportes', 'gestionar_deportes',
    'ver_usuarios', 'crear_usuarios', 'editar_usuarios', 'dar_baja_usuarios', 'suspender_jugadores',
    'ver_roles', 'gestionar_roles', 'ver_permisos'
  )
ON CONFLICT DO NOTHING;

-- 6. Organizador
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles_sistema r
CROSS JOIN permisos_sistema p
WHERE r.nombre = 'Organizador'
  AND p.clave IN (
    'ver_convocatorias', 'crear_convocatorias', 'editar_convocatorias', 'cancelar_convocatorias',
    'responder_asistencia', 'invitar_externos', 'dividir_bandos',
    'ver_grupos', 'crear_grupos', 'editar_grupos', 'eliminar_grupos',
    'ver_deportes', 'gestionar_deportes', 'suspender_jugadores'
  )
ON CONFLICT DO NOTHING;

-- 7. Jugador
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles_sistema r
CROSS JOIN permisos_sistema p
WHERE r.nombre = 'Jugador'
  AND p.clave IN ('ver_convocatorias', 'responder_asistencia', 'invitar_externos', 'ver_grupos')
ON CONFLICT DO NOTHING;

-- 8. Migrar asignaciones que aún apunten a dividir_equipos (por si quedó huérfano)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT rp.rol_id, pb.id
FROM rol_permisos rp
JOIN permisos_sistema pe ON pe.id = rp.permiso_id AND pe.clave = 'dividir_equipos'
JOIN permisos_sistema pb ON pb.clave = 'dividir_bandos'
ON CONFLICT DO NOTHING;
