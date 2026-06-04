package com.event.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@RequiredArgsConstructor
public class CorsConfig {

    private final Environment environment;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${app.cors.allowed-methods}")
    private String allowedMethods;

    @Value("${app.cors.allowed-headers}")
    private String allowedHeaders;

    @Value("${app.cors.exposed-headers}")
    private String exposedHeaders;

    @Value("${app.cors.max-age}")
    private Long maxAge;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> origins = parseList(allowedOrigins);
        if (origins.isEmpty() && environment.matchesProfiles("prod")) {
            throw new IllegalStateException(
                    "En perfil prod se requiere CORS_ALLOWED_ORIGINS con la URL pública del frontend "
                            + "(ej. https://tu-frontend.up.railway.app).");
        }

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowCredentials(true);
        config.setAllowedMethods(parseList(allowedMethods));
        config.setAllowedHeaders(parseList(allowedHeaders));
        config.setExposedHeaders(parseList(exposedHeaders));
        config.setMaxAge(maxAge);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private static List<String> parseList(String value) {
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }
}
