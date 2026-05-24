package com.event.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * En producción el JAR incluye el build de Vite en {@code classpath:/static/}.
 * Las rutas del SPA (React Router) devuelven {@code index.html}; {@code /api} sigue en los controladores REST.
 */
@Configuration
@Profile("prod")
public class SpaWebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        if (isApiOrActuatorPath(resourcePath)) {
                            return null;
                        }
                        Resource requested = super.getResource(resourcePath, location);
                        if (requested != null && requested.exists() && requested.isReadable()) {
                            return requested;
                        }
                        return super.getResource("index.html", location);
                    }
                });
    }

    private static boolean isApiOrActuatorPath(String path) {
        if (path == null || path.isEmpty()) {
            return false;
        }
        return path.startsWith("api/")
                || path.equals("api")
                || path.startsWith("actuator/")
                || path.equals("actuator");
    }
}
