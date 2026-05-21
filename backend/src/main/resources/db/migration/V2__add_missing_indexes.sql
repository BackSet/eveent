-- V2__add_missing_indexes.sql
-- Missing FK and query indexes for performance

CREATE INDEX IF NOT EXISTS idx_asistencias_usuario ON asistencias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_posicion ON asistencias(posicion_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_equipo ON asistencias(equipo_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_invitado ON asistencias(invitado_por_id);

CREATE INDEX IF NOT EXISTS idx_convocatorias_creador ON convocatorias(creado_por_id);
CREATE INDEX IF NOT EXISTS idx_convocatorias_deporte ON convocatorias(deporte_id);

CREATE INDEX IF NOT EXISTS idx_equipos_convocatoria ON equipos_convocatoria(convocatoria_id);

CREATE INDEX IF NOT EXISTS idx_posiciones_deporte ON posiciones_deporte(deporte_id);

CREATE INDEX IF NOT EXISTS idx_usuario_roles_usuario ON usuario_roles(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_roles_rol ON usuario_roles(rol_id);

CREATE INDEX IF NOT EXISTS idx_rol_permisos_rol ON rol_permisos(rol_id);
CREATE INDEX IF NOT EXISTS idx_rol_permisos_permiso ON rol_permisos(permiso_id);
