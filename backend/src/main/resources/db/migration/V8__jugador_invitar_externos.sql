-- V8: El rol Jugador puede invitar externos a convocatorias

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles_sistema r
CROSS JOIN permisos_sistema p
WHERE r.nombre = 'Jugador'
  AND p.clave = 'invitar_externos'
ON CONFLICT DO NOTHING;
