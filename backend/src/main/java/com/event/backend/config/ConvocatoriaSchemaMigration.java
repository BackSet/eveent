package com.event.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Aplica columnas de tipo_invitacion/grupo_id si la BD no las tiene
 * (Flyway deshabilitado y ddl-auto puede no haberlas creado).
 */
@Slf4j
@Component
@Order(0)
@RequiredArgsConstructor
public class ConvocatoriaSchemaMigration implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        boolean hasTipo = columnExists("convocatorias", "tipo_invitacion");
        boolean hasGrupo = columnExists("convocatorias", "grupo_id");

        if (!hasTipo || !hasGrupo) {
            log.warn("Aplicando parche de esquema convocatorias (tipo_invitacion={}, grupo_id={})", hasTipo, hasGrupo);
            if (!hasTipo) {
                jdbcTemplate.execute(
                        "ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS tipo_invitacion VARCHAR(20) NOT NULL DEFAULT 'ABIERTA'"
                );
            }
            if (!hasGrupo) {
                jdbcTemplate.execute(
                        "ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS grupo_id BIGINT REFERENCES grupos(id)"
                );
            }
            log.info("Parche de esquema convocatorias aplicado correctamente");
        }
    }

    private boolean columnExists(String table, String column) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = ? AND column_name = ?
                """,
                Integer.class,
                table,
                column
        );
        return count != null && count > 0;
    }
}
