package com.event.backend.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

/**
 * Si Railway inyecta {@code DATABASE_URL} (postgresql://…), la convierte a JDBC.
 * Si no existe, Spring Boot usa {@code PGHOST}, {@code PGUSER}, etc. del plugin PostgreSQL.
 */
@Configuration
@Profile("prod")
@ConditionalOnProperty(name = "DATABASE_URL")
public class RailwayDatabaseConfig {

    @Bean
    @Primary
    public DataSource railwayDataSource(Environment env) {
        DataSourceProperties props = new DataSourceProperties();
        applyDatabaseUrl(props, env.getProperty("DATABASE_URL"));
        return props.initializeDataSourceBuilder().build();
    }

    static void applyDatabaseUrl(DataSourceProperties props, String databaseUrl) {
        try {
            URI uri = URI.create(databaseUrl.replace("postgres://", "postgresql://"));
            String userInfo = uri.getUserInfo();
            if (userInfo != null) {
                String[] parts = userInfo.split(":", 2);
                props.setUsername(URLDecoder.decode(parts[0], StandardCharsets.UTF_8));
                if (parts.length > 1) {
                    props.setPassword(URLDecoder.decode(parts[1], StandardCharsets.UTF_8));
                }
            }
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            String path = uri.getPath() != null ? uri.getPath() : "/railway";
            props.setUrl("jdbc:postgresql://" + uri.getHost() + ":" + port + path);
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo interpretar DATABASE_URL para JDBC", ex);
        }
    }
}
