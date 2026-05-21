-- V3__groups_and_matchmaking.sql
-- Add username and jersey number to users
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS numero_camiseta INTEGER;

-- Create grupos table
CREATE TABLE IF NOT EXISTS grupos (
    id              BIGSERIAL       PRIMARY KEY,
    nombre          VARCHAR(100)    NOT NULL,
    descripcion     VARCHAR(500),
    creado_por_id   BIGINT          NOT NULL REFERENCES usuarios(id),
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Create grupo_jugadores table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS grupo_jugadores (
    grupo_id        BIGINT          NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    usuario_id      BIGINT          NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (grupo_id, usuario_id)
);

-- Create usuario_posiciones table (association with extra fields)
CREATE TABLE IF NOT EXISTS usuario_posiciones (
    usuario_id      BIGINT          NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    posicion_id    BIGINT          NOT NULL REFERENCES posiciones_deporte(id) ON DELETE CASCADE,
    prioridad       INTEGER         NOT NULL,
    PRIMARY KEY (usuario_id, posicion_id)
);

-- Create convocatorias_recurrentes table
CREATE TABLE IF NOT EXISTS convocatorias_recurrentes (
    id                          BIGSERIAL       PRIMARY KEY,
    titulo                      VARCHAR(150)    NOT NULL,
    descripcion                 VARCHAR(500),
    deporte_id                  BIGINT          NOT NULL REFERENCES deportes(id),
    lugar                       VARCHAR(200),
    creado_por_id               BIGINT          NOT NULL REFERENCES usuarios(id),
    cupo_maximo                 INTEGER         NOT NULL DEFAULT 0,
    categoria                   VARCHAR(100),
    patron                      VARCHAR(20)     NOT NULL, -- e.g. 'SEMANAL'
    dias_semana                 VARCHAR(50),              -- e.g. 'MONDAY'
    hora_evento                 TIME            NOT NULL,
    rsvp_apertura_dia_semana    VARCHAR(20),
    rsvp_apertura_hora          TIME            NOT NULL,
    rsvp_cierre_dia_semana      VARCHAR(20),
    rsvp_cierre_hora            TIME            NOT NULL,
    grupo_destino_id            BIGINT          REFERENCES grupos(id) ON DELETE SET NULL,
    activo                      BOOLEAN         NOT NULL DEFAULT TRUE,
    fecha_creacion              TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Add matchmaking columns and recurrencia to convocatorias
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS recurrencia_id BIGINT REFERENCES convocatorias_recurrentes(id) ON DELETE SET NULL;
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS manejo_excedente VARCHAR(20) NOT NULL DEFAULT 'LISTA_ESPERA';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_grupos_creador ON grupos(creado_por_id);
CREATE INDEX IF NOT EXISTS idx_grupo_jugadores_usuario ON grupo_jugadores(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_posiciones_posicion ON usuario_posiciones(posicion_id);
CREATE INDEX IF NOT EXISTS idx_convocatorias_recurrentes_deporte ON convocatorias_recurrentes(deporte_id);
CREATE INDEX IF NOT EXISTS idx_convocatorias_recurrentes_grupo ON convocatorias_recurrentes(grupo_destino_id);
CREATE INDEX IF NOT EXISTS idx_convocatorias_recurrencia ON convocatorias(recurrencia_id);
