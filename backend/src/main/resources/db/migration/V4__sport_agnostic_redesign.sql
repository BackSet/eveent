-- V4: Sport-agnostic redesign
-- 1. Ampliar tabla deportes
ALTER TABLE deportes ADD COLUMN IF NOT EXISTS es_por_equipos BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE deportes ADD COLUMN IF NOT EXISTS min_jugadores_por_bando INTEGER NOT NULL DEFAULT 1;
ALTER TABLE deportes ADD COLUMN IF NOT EXISTS max_jugadores_por_bando INTEGER NOT NULL DEFAULT 11;

-- 2. Agregar categoria_linea a posiciones_deporte
ALTER TABLE posiciones_deporte ADD COLUMN IF NOT EXISTS categoria_linea VARCHAR(30);

-- 3. Renombrar convocatorias_recurrentes → configuraciones_recurrentes
ALTER TABLE convocatorias_recurrentes RENAME TO configuraciones_recurrentes;

ALTER TABLE configuraciones_recurrentes ADD COLUMN IF NOT EXISTS rrule_expression VARCHAR(255);
ALTER TABLE configuraciones_recurrentes ADD COLUMN IF NOT EXISTS hora_creacion_convocatoria TIME;
ALTER TABLE configuraciones_recurrentes ADD COLUMN IF NOT EXISTS duracion_estimada_minutos INTEGER NOT NULL DEFAULT 60;

UPDATE configuraciones_recurrentes SET
  rrule_expression = CASE
    WHEN patron = 'DIARIO' THEN 'FREQ=DAILY'
    WHEN patron = 'SEMANAL' AND dias_semana IS NOT NULL THEN
      'FREQ=WEEKLY;BYDAY=' || REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(UPPER(dias_semana),
                'MONDAY', 'MO'), 'TUESDAY', 'TU'), 'WEDNESDAY', 'WE'),
              'THURSDAY', 'TH'), 'FRIDAY', 'FR'), 'SATURDAY', 'SA'), 'SUNDAY', 'SU')
    WHEN patron = 'SEMANAL' THEN 'FREQ=WEEKLY'
    ELSE 'FREQ=DAILY'
  END;

UPDATE configuraciones_recurrentes SET hora_creacion_convocatoria = hora_evento
  WHERE hora_creacion_convocatoria IS NULL;

ALTER TABLE configuraciones_recurrentes DROP COLUMN IF EXISTS patron;
ALTER TABLE configuraciones_recurrentes DROP COLUMN IF EXISTS dias_semana;
ALTER TABLE configuraciones_recurrentes DROP COLUMN IF EXISTS hora_evento;
ALTER TABLE configuraciones_recurrentes DROP COLUMN IF EXISTS hora_partido;

-- 4. Renombrar equipos_convocatoria → bandos_convocatoria
ALTER TABLE equipos_convocatoria RENAME TO bandos_convocatoria;

-- 5. Ampliar tabla convocatorias con campos de ciclo de vida
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS fecha_apertura_inscripcion TIMESTAMP;
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS fecha_hora_fin TIMESTAMP;
ALTER TABLE convocatorias RENAME COLUMN recurrencia_id TO configuracion_recurrente_id;

-- 6. Renombrar columnas en asistencias
ALTER TABLE asistencias RENAME COLUMN posicion_id TO posicion_preferida_id;
ALTER TABLE asistencias RENAME COLUMN equipo_id TO bando_id;
ALTER TABLE asistencias ADD COLUMN IF NOT EXISTS posicion_asignada_id BIGINT REFERENCES posiciones_deporte(id);

-- 7. Renombrar permiso dividir_equipos → dividir_bandos
UPDATE permisos_sistema SET clave = 'dividir_bandos' WHERE clave = 'dividir_equipos';

-- 8. Índices
CREATE INDEX IF NOT EXISTS idx_convocatorias_fecha_apertura ON convocatorias(fecha_apertura_inscripcion);
CREATE INDEX IF NOT EXISTS idx_convocatorias_fecha_fin ON convocatorias(fecha_hora_fin);
CREATE INDEX IF NOT EXISTS idx_convocatorias_config_rec ON convocatorias(configuracion_recurrente_id);
