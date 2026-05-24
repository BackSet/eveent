package com.event.backend.config;

import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;

import javax.sql.DataSource;

/**
 * En producción la base de datos se configura solo con {@code DATABASE_URL}.
 */
@Configuration
@Profile("prod")
public class ProdDatabaseConfig {

    @Bean
    @Primary
    public DataSource prodDataSource(Environment env) {
        String databaseUrl = env.getProperty("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isBlank()) {
            throw new IllegalStateException(
                    "En perfil prod se requiere DATABASE_URL. "
                            + "En Railway, vincula PostgreSQL al servicio (se inyecta automáticamente). "
                            + "No uses PGHOST/PGUSER por separado ni jdbc:postgresql://${{…}}.");
        }

        DatabaseUrlParser.Parsed parsed = DatabaseUrlParser.parse(databaseUrl);
        DataSourceProperties props = new DataSourceProperties();
        props.setUrl(parsed.jdbcUrl());
        if (parsed.username() != null) {
            props.setUsername(parsed.username());
        }
        if (parsed.password() != null) {
            props.setPassword(parsed.password());
        }
        return props.initializeDataSourceBuilder().build();
    }
}
