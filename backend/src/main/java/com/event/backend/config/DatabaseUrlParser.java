package com.event.backend.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

/**
 * Convierte {@code DATABASE_URL} a URL JDBC y credenciales.
 * Acepta {@code postgresql://…}, {@code postgres://…} y {@code jdbc:postgresql://…}.
 */
final class DatabaseUrlParser {

    record Parsed(String jdbcUrl, String username, String password) {}

    private DatabaseUrlParser() {}

    static Parsed parse(String databaseUrl) {
        if (databaseUrl == null || databaseUrl.isBlank()) {
            throw new IllegalArgumentException("DATABASE_URL no puede estar vacía");
        }
        String trimmed = normalizeConnectionString(databaseUrl);
        if (trimmed.regionMatches(true, 0, "jdbc:", 0, 5)) {
            return parseJdbc(trimmed);
        }
        return parsePostgresUri(trimmed);
    }

    /**
     * Corrige el error habitual {@code jdbc:postgresql://postgresql://…} al referenciar Railway.
     */
    static String normalizeConnectionString(String value) {
        String v = value.trim();
        boolean changed;
        do {
            changed = false;
            if (v.startsWith("jdbc:postgresql://postgresql://")) {
                v = v.substring("jdbc:postgresql://".length());
                changed = true;
            } else if (v.startsWith("jdbc:postgresql://postgres://")) {
                v = v.substring("jdbc:postgresql://".length());
                changed = true;
            } else if (v.startsWith("jdbc:postgres://postgresql://")) {
                v = v.substring("jdbc:postgres://".length());
                changed = true;
            }
        } while (changed);
        return v;
    }

    private static Parsed parsePostgresUri(String url) {
        String normalized = url.replaceFirst("^postgres://", "postgresql://");
        if (!normalized.regionMatches(true, 0, "postgresql://", 0, 13)) {
            throw new IllegalArgumentException(
                    "DATABASE_URL debe empezar por postgresql://, postgres:// o jdbc:postgresql://");
        }
        try {
            URI uri = URI.create(normalized);
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                throw new IllegalArgumentException("DATABASE_URL sin host válido");
            }
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            String path = uri.getPath() != null && !uri.getPath().isBlank() ? uri.getPath() : "/postgres";
            String query = uri.getRawQuery();
            String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path
                    + (query != null && !query.isBlank() ? "?" + query : "");
            return new Parsed(jdbcUrl, usernameFromUri(uri), passwordFromUri(uri));
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("No se pudo interpretar DATABASE_URL: " + url, ex);
        }
    }

    private static Parsed parseJdbc(String jdbcUrl) {
        String prefix = jdbcPrefix(jdbcUrl);
        String remainder = jdbcUrl.substring(prefix.length());
        if (remainder.regionMatches(true, 0, "postgresql://", 0, 13)
                || remainder.regionMatches(true, 0, "postgres://", 0, 11)) {
            return parsePostgresUri(remainder);
        }
        if (remainder.isBlank()) {
            throw new IllegalArgumentException("DATABASE_URL JDBC sin host");
        }

        String username = null;
        String password = null;
        String authorityAndPath = remainder;

        int at = remainder.lastIndexOf('@');
        if (at > 0) {
            String userInfo = remainder.substring(0, at);
            authorityAndPath = remainder.substring(at + 1);
            String[] parts = userInfo.split(":", 2);
            username = decode(parts[0]);
            if (parts.length > 1) {
                password = decode(parts[1]);
            }
        }

        if (authorityAndPath.isBlank() || authorityHost(authorityAndPath).isBlank()) {
            throw new IllegalArgumentException("DATABASE_URL JDBC sin host válido");
        }

        return new Parsed(prefix + authorityAndPath, username, password);
    }

    private static String jdbcPrefix(String jdbcUrl) {
        if (jdbcUrl.regionMatches(true, 0, "jdbc:postgresql://", 0, 18)) {
            return jdbcUrl.substring(0, 18);
        }
        if (jdbcUrl.regionMatches(true, 0, "jdbc:postgres://", 0, 16)) {
            return jdbcUrl.substring(0, 16);
        }
        throw new IllegalArgumentException(
                "DATABASE_URL JDBC debe usar jdbc:postgresql:// (no " + jdbcUrl.substring(0, Math.min(24, jdbcUrl.length())) + "…)");
    }

    private static String authorityHost(String authorityAndPath) {
        String authority = authorityAndPath.split("[/?]", 2)[0];
        if (authority.isBlank()) {
            return "";
        }
        if (authority.startsWith("[")) {
            int end = authority.indexOf(']');
            return end > 0 ? authority.substring(1, end) : "";
        }
        int colon = authority.lastIndexOf(':');
        if (colon > 0 && authority.indexOf(':') == colon) {
            return authority.substring(0, colon);
        }
        return authority;
    }

    private static String usernameFromUri(URI uri) {
        String userInfo = uri.getUserInfo();
        if (userInfo == null) {
            return null;
        }
        String[] parts = userInfo.split(":", 2);
        return decode(parts[0]);
    }

    private static String passwordFromUri(URI uri) {
        String userInfo = uri.getUserInfo();
        if (userInfo == null) {
            return null;
        }
        String[] parts = userInfo.split(":", 2);
        return parts.length > 1 ? decode(parts[1]) : null;
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}
