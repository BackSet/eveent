package com.event.backend.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DatabaseUrlParserTest {

    @Test
    void parsePostgresqlUrl() {
        var parsed = DatabaseUrlParser.parse("postgresql://postgres:secret@db.example.com:5432/railway");
        assertEquals("jdbc:postgresql://db.example.com:5432/railway", parsed.jdbcUrl());
        assertEquals("postgres", parsed.username());
        assertEquals("secret", parsed.password());
    }

    @Test
    void parsePostgresAlias() {
        var parsed = DatabaseUrlParser.parse("postgres://u:p@localhost/event");
        assertEquals("jdbc:postgresql://localhost:5432/event", parsed.jdbcUrl());
        assertEquals("u", parsed.username());
        assertEquals("p", parsed.password());
    }

    @Test
    void parseJdbcUrlWithCredentials() {
        var parsed = DatabaseUrlParser.parse("jdbc:postgresql://postgres:secret@db:5432/event");
        assertEquals("jdbc:postgresql://db:5432/event", parsed.jdbcUrl());
        assertEquals("postgres", parsed.username());
        assertEquals("secret", parsed.password());
    }

    @Test
    void parseJdbcUrlWithoutCredentials() {
        var parsed = DatabaseUrlParser.parse("jdbc:postgresql://db:5432/event");
        assertEquals("jdbc:postgresql://db:5432/event", parsed.jdbcUrl());
        assertEquals(null, parsed.username());
        assertEquals(null, parsed.password());
    }

    @Test
    void rejectsJdbcUrlWithNullHost() {
        assertThrows(IllegalArgumentException.class,
                () -> DatabaseUrlParser.parse("jdbc:postgresql:///event"));
    }

    @Test
    void parseDoublePrefixedJdbcUrl() {
        var parsed = DatabaseUrlParser.parse(
                "jdbc:postgresql://postgresql://postgres:secret@postgres.railway.internal:5432/railway");
        assertEquals("jdbc:postgresql://postgres.railway.internal:5432/railway", parsed.jdbcUrl());
        assertEquals("postgres", parsed.username());
        assertEquals("secret", parsed.password());
    }

    @Test
    void normalizeConnectionStringStripsJdbcWrapper() {
        assertEquals(
                "postgresql://postgres:pass@host:5432/db",
                DatabaseUrlParser.normalizeConnectionString("jdbc:postgresql://postgresql://postgres:pass@host:5432/db"));
    }
}
