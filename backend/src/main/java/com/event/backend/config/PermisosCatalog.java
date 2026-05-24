package com.event.backend.config;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Catálogo canónico de permisos y asignación por rol del sistema.
 * Los permisos se incorporan por código/migraciones; la UI solo puede editar el nombre visible.
 */
public final class PermisosCatalog {

    public static final String ROL_SUPER_ADMIN = "SuperAdmin";
    public static final String ROL_ORGANIZADOR = "Organizador";
    public static final String ROL_JUGADOR = "Jugador";

    public static final Set<String> ROLES_PREDEFINIDOS = Set.of(
            ROL_SUPER_ADMIN, ROL_ORGANIZADOR, ROL_JUGADOR);

    /** Clave legacy renombrada en V4; se migra a {@link #DIVIDIR_BANDOS}. */
    public static final String DIVIDIR_EQUIPOS_LEGACY = "dividir_equipos";
    public static final String DIVIDIR_BANDOS = "dividir_bandos";

    private static final Map<String, String> PERMISOS = new LinkedHashMap<>();

    static {
        // Convocatorias y asistencias
        PERMISOS.put("ver_convocatorias", "Ver convocatorias");
        PERMISOS.put("crear_convocatorias", "Crear convocatorias");
        PERMISOS.put("editar_convocatorias", "Editar convocatorias");
        PERMISOS.put("eliminar_convocatorias", "Eliminar convocatorias");
        PERMISOS.put("cancelar_convocatorias", "Cancelar convocatorias");
        PERMISOS.put("responder_asistencia", "Responder asistencia (RSVP)");
        PERMISOS.put("invitar_externos", "Invitar jugadores externos");
        PERMISOS.put(DIVIDIR_BANDOS, "Dividir bandos y balanceo automático");

        // Grupos
        PERMISOS.put("ver_grupos", "Ver grupos de jugadores");
        PERMISOS.put("crear_grupos", "Crear grupos de jugadores");
        PERMISOS.put("editar_grupos", "Editar grupos y miembros");
        PERMISOS.put("eliminar_grupos", "Eliminar grupos");

        // Deportes y posiciones
        PERMISOS.put("ver_deportes", "Ver disciplinas y posiciones");
        PERMISOS.put("gestionar_deportes", "Gestionar disciplinas y posiciones");

        // Usuarios
        PERMISOS.put("ver_usuarios", "Ver usuarios del sistema");
        PERMISOS.put("crear_usuarios", "Crear usuarios");
        PERMISOS.put("editar_usuarios", "Editar usuarios");
        PERMISOS.put("dar_baja_usuarios", "Dar de baja usuarios");
        PERMISOS.put("suspender_jugadores", "Suspender jugadores");

        // Roles y permisos
        PERMISOS.put("ver_roles", "Ver roles y privilegios");
        PERMISOS.put("gestionar_roles", "Gestionar roles y privilegios");
        PERMISOS.put("ver_permisos", "Ver permisos del sistema");
    }

    private static final Map<String, List<String>> PERMISOS_POR_ROL = Map.of(
            ROL_SUPER_ADMIN, List.of(
                    "ver_convocatorias", "crear_convocatorias", "editar_convocatorias",
                    "eliminar_convocatorias", "cancelar_convocatorias", "responder_asistencia",
                    "invitar_externos", DIVIDIR_BANDOS,
                    "ver_grupos", "crear_grupos", "editar_grupos", "eliminar_grupos",
                    "ver_deportes", "gestionar_deportes",
                    "ver_usuarios", "crear_usuarios", "editar_usuarios", "dar_baja_usuarios",
                    "suspender_jugadores",
                    "ver_roles", "gestionar_roles", "ver_permisos"
            ),
            ROL_ORGANIZADOR, List.of(
                    "ver_convocatorias", "crear_convocatorias", "editar_convocatorias",
                    "cancelar_convocatorias", "responder_asistencia", "invitar_externos", DIVIDIR_BANDOS,
                    "ver_grupos", "crear_grupos", "editar_grupos", "eliminar_grupos",
                    "ver_deportes", "gestionar_deportes",
                    "suspender_jugadores"
            ),
            ROL_JUGADOR, List.of(
                    "ver_convocatorias", "responder_asistencia", "invitar_externos", "ver_grupos"
            )
    );

    private PermisosCatalog() {
    }

    public static Map<String, String> permisos() {
        return Map.copyOf(PERMISOS);
    }

    public static Map<String, List<String>> permisosPorRol() {
        return Map.copyOf(PERMISOS_POR_ROL);
    }

    public static List<String> permisosDeRol(String nombreRol) {
        return PERMISOS_POR_ROL.getOrDefault(nombreRol, List.of());
    }
}
