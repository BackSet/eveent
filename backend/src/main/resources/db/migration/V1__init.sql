-- V1__init.sql
-- Schema inicial: RBAC + Convocatorias Deportivas + RSVP

CREATE TABLE IF NOT EXISTS usuarios (
    id              BIGSERIAL       PRIMARY KEY,
    nombre          VARCHAR(100)    NOT NULL,
    email           VARCHAR(150)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    activo          BOOLEAN         NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles_sistema (
    id      BIGSERIAL       PRIMARY KEY,
    nombre  VARCHAR(50)     NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permisos_sistema (
    id          BIGSERIAL       PRIMARY KEY,
    clave       VARCHAR(80)     NOT NULL UNIQUE,
    descripcion VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_id      BIGINT NOT NULL REFERENCES roles_sistema(id) ON DELETE CASCADE,
    permiso_id  BIGINT NOT NULL REFERENCES permisos_sistema(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

CREATE TABLE IF NOT EXISTS usuario_roles (
    usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id      BIGINT NOT NULL REFERENCES roles_sistema(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, rol_id)
);

CREATE TABLE IF NOT EXISTS deportes (
    id      BIGSERIAL       PRIMARY KEY,
    nombre  VARCHAR(80)     NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS posiciones_deporte (
    id          BIGSERIAL       PRIMARY KEY,
    deporte_id  BIGINT          NOT NULL REFERENCES deportes(id) ON DELETE CASCADE,
    nombre      VARCHAR(60)     NOT NULL,
    abreviatura VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS convocatorias (
    id              BIGSERIAL       PRIMARY KEY,
    titulo          VARCHAR(150)    NOT NULL,
    descripcion     VARCHAR(500),
    deporte_id      BIGINT          NOT NULL REFERENCES deportes(id),
    fecha_hora      TIMESTAMP       NOT NULL,
    lugar           VARCHAR(200),
    creado_por_id   BIGINT          NOT NULL REFERENCES usuarios(id),
    estado          VARCHAR(20)     NOT NULL DEFAULT 'BORRADOR',
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW(),
    cupo_maximo     INTEGER         NOT NULL DEFAULT 0,
    categoria       VARCHAR(100),
    fecha_limite_inscripcion TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipos_convocatoria (
    id               BIGSERIAL       PRIMARY KEY,
    convocatoria_id  BIGINT          NOT NULL REFERENCES convocatorias(id) ON DELETE CASCADE,
    nombre           VARCHAR(80)     NOT NULL,
    color            VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS asistencias (
    id               BIGSERIAL       PRIMARY KEY,
    convocatoria_id  BIGINT          NOT NULL REFERENCES convocatorias(id) ON DELETE CASCADE,
    usuario_id       BIGINT          REFERENCES usuarios(id),
    nombre_externo   VARCHAR(120),
    invitado_por_id  BIGINT          REFERENCES usuarios(id),
    estado           VARCHAR(20)     NOT NULL DEFAULT 'PENDIENTE',
    posicion_id      BIGINT          REFERENCES posiciones_deporte(id),
    equipo_id        BIGINT          REFERENCES equipos_convocatoria(id),
    fecha_respuesta  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asistencias_conv_usuario ON asistencias(convocatoria_id, usuario_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_estado ON asistencias(estado);
CREATE INDEX IF NOT EXISTS idx_convocatorias_estado ON convocatorias(estado);
CREATE INDEX IF NOT EXISTS idx_convocatorias_fecha ON convocatorias(fecha_hora);
