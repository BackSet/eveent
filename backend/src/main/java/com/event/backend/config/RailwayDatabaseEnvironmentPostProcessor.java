package com.event.backend.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Normaliza URLs de BD mal formadas y evita perfil {@code dev} en Railway con credenciales de prod.
 */
@SuppressWarnings("removal")
public class RailwayDatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final List<String> URL_KEYS = List.of("DATABASE_URL", "DB_URL");

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, Object> overrides = new HashMap<>();

        for (String key : URL_KEYS) {
            String value = environment.getProperty(key);
            if (value == null || value.isBlank()) {
                continue;
            }
            String normalized = DatabaseUrlParser.normalizeConnectionString(value);
            if (!normalized.equals(value.trim())) {
                overrides.put(key, normalized);
            }
        }

        if (!overrides.isEmpty()) {
            environment.getPropertySources().addFirst(
                    new MapPropertySource("normalizedDatabaseUrls", overrides));
        }

        if (environment.matchesProfiles("dev") && usesRailwayDatabase(environment)) {
            throw new IllegalStateException(
                    "Perfil 'dev' detectado con base de datos de Railway. "
                            + "En el servicio backend configura SPRING_PROFILES_ACTIVE=prod, "
                            + "DATABASE_URL=${{Postgres.DATABASE_URL}} y elimina DB_URL, DB_USERNAME y DB_PASSWORD.");
        }
    }

    private static boolean usesRailwayDatabase(ConfigurableEnvironment environment) {
        for (String key : URL_KEYS) {
            String value = environment.getProperty(key);
            if (value != null && value.contains("railway")) {
                return true;
            }
        }
        String datasourceUrl = environment.getProperty("spring.datasource.url");
        return datasourceUrl != null && datasourceUrl.contains("railway");
    }
}
