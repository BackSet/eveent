package com.event.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        dropColumnIfExists("convocatorias_recurrentes", "rsvp_apertura_dia_semana");
        dropColumnIfExists("convocatorias_recurrentes", "rsvp_apertura_hora");
        dropColumnIfExists("convocatorias_recurrentes", "rsvp_cierre_dia_semana");
        dropColumnIfExists("convocatorias_recurrentes", "rsvp_cierre_hora");
        addColumnIfNotExists("convocatorias_recurrentes", "hora_partido", "TIME NOT NULL DEFAULT '21:00:00'");
    }

    private void dropColumnIfExists(String table, String column) {
        try {
            jdbcTemplate.execute("ALTER TABLE " + table + " DROP COLUMN IF EXISTS " + column);
            log.info("Columna '{}.{}' eliminada correctamente", table, column);
        } catch (Exception e) {
            log.warn("No se pudo eliminar la columna '{}.{}': {}", table, column, e.getMessage());
        }
    }

    private void addColumnIfNotExists(String table, String column, String definition) {
        try {
            jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS " + column + " " + definition);
            log.info("Columna '{}.{}' agregada correctamente con definición: {}", table, column, definition);
        } catch (Exception e) {
            log.warn("No se pudo agregar la columna '{}.{}': {}", table, column, e.getMessage());
        }
    }
}
