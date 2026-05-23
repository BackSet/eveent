package com.event.backend.config;

import com.event.backend.model.*;
import com.event.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RolesSistemaRepository rolesRepo;
    private final PermisosSistemaRepository permisosRepo;
    private final RolPermisoRepository rolPermisoRepo;
    private final UsuarioRepository usuarioRepo;
    private final UsuarioRolRepository usuarioRolRepo;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;
    private final DeporteRepository deporteRepo;
    private final PosicionesDeporteRepository posicionesDeporteRepo;
    private final jakarta.persistence.EntityManager entityManager;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Value("${app.admin.nombre}")
    private String adminNombre;

    @Value("${ADMIN_BOOTSTRAP_ENABLED:true}")
    private boolean bootstrapEnabled;

    @Override
    @Transactional
    public void run(String... args) {
        try {
            entityManager.createNativeQuery("ALTER TABLE convocatorias ALTER COLUMN deporte_id DROP NOT NULL").executeUpdate();
            entityManager.createNativeQuery("ALTER TABLE configuraciones_recurrentes ALTER COLUMN deporte_id DROP NOT NULL").executeUpdate();
            log.info("Restricciones NOT NULL para deporte_id removidas con éxito.");
        } catch (Exception e) {
            log.warn("No se pudieron alterar los campos deporte_id (ya podrían ser nullables): {}", e.getMessage());
        }

        try {
            entityManager.createNativeQuery("ALTER TABLE asistencias_posiciones_preferidas ADD COLUMN IF NOT EXISTS prioridad INTEGER NOT NULL DEFAULT 0").executeUpdate();
            log.info("Columna prioridad en asistencias_posiciones_preferidas agregada/verificada con éxito.");
        } catch (Exception e) {
            log.warn("No se pudo agregar la columna prioridad a asistencias_posiciones_preferidas: {}", e.getMessage());
        }

        if (!bootstrapEnabled) return;
        if (!environment.matchesProfiles("dev", "test", "default")) return;
        seedRolesIfEmpty();
        seedAdminIfNoUsers();
        seedJugadoresIfEmpty();
        seedDeportesYPosicionesIfEmpty();
        log.info("Seed completado: {} roles, {} permisos, {} deportes", rolesRepo.count(), permisosRepo.count(), deporteRepo.count());
    }

    private void seedRolesIfEmpty() {
        Map<String, String> permisosData = new HashMap<>();
        // Convocatorias
        permisosData.put("ver_convocatorias", "Ver convocatorias");
        permisosData.put("crear_convocatorias", "Crear convocatorias");
        permisosData.put("editar_convocatorias", "Editar convocatorias");
        permisosData.put("eliminar_convocatorias", "Eliminar convocatorias");
        permisosData.put("cancelar_convocatorias", "Cancelar convocatorias (dar de baja)");
        permisosData.put("responder_asistencia", "Responder asistencia (RSVP)");
        permisosData.put("invitar_externos", "Invitar externos");
        permisosData.put("dividir_equipos", "Dividir equipos y balanceo");
        
        // Grupos
        permisosData.put("ver_grupos", "Ver grupos del sistema");
        permisosData.put("crear_grupos", "Crear grupos de jugadores");
        permisosData.put("editar_grupos", "Editar grupos y miembros");
        permisosData.put("eliminar_grupos", "Eliminar grupos de jugadores");

        // Deportes
        permisosData.put("ver_deportes", "Ver disciplinas y posiciones");
        permisosData.put("gestionar_deportes", "Gestionar disciplinas y posiciones");

        // Usuarios
        permisosData.put("ver_usuarios", "Ver lista de usuarios");
        permisosData.put("crear_usuarios", "Crear nuevos usuarios");
        permisosData.put("editar_usuarios", "Editar informacion de usuarios");
        permisosData.put("dar_baja_usuarios", "Dar de baja usuarios");

        // Roles
        permisosData.put("ver_roles", "Ver roles y privilegios");
        permisosData.put("gestionar_roles", "Gestionar roles y privilegios");
        permisosData.put("ver_permisos", "Ver lista de permisos del sistema");
        permisosData.put("suspender_jugadores", "Suspender jugadores del sistema");

        Map<String, List<String>> rolesPermisos = new HashMap<>();
        rolesPermisos.put("SuperAdmin", List.of(
                "ver_convocatorias", "crear_convocatorias", "editar_convocatorias", "eliminar_convocatorias", "cancelar_convocatorias", "responder_asistencia", "invitar_externos", "dividir_equipos",
                "ver_grupos", "crear_grupos", "editar_grupos", "eliminar_grupos",
                "ver_deportes", "gestionar_deportes",
                "ver_usuarios", "crear_usuarios", "editar_usuarios", "dar_baja_usuarios",
                "ver_roles", "gestionar_roles", "ver_permisos", "suspender_jugadores"
        ));
        rolesPermisos.put("Organizador", List.of(
                "ver_convocatorias", "crear_convocatorias", "editar_convocatorias", "cancelar_convocatorias", "responder_asistencia", "invitar_externos", "dividir_equipos",
                "ver_grupos", "crear_grupos", "editar_grupos", "eliminar_grupos",
                "ver_deportes", "gestionar_deportes", "suspender_jugadores"
        ));
        rolesPermisos.put("Jugador", List.of(
                "ver_convocatorias", "responder_asistencia", "ver_grupos"
        ));

        List<String> rolNombres = rolesPermisos.keySet().stream().toList();
        List<RolesSistema> existingRoles = rolesRepo.findAllByNombreIn(rolNombres);

        for (String rolNombre : rolNombres) {
            existingRoles.stream()
                    .filter(r -> r.getNombre().equals(rolNombre))
                    .findFirst()
                    .orElseGet(() -> rolesRepo.save(RolesSistema.builder().nombre(rolNombre).build()));
        }

        List<String> permisosClaves = permisosData.keySet().stream().toList();
        List<PermisosSistema> existingPermisos = permisosRepo.findByClaveIn(permisosClaves);

        Map<String, PermisosSistema> permisosByClave = new HashMap<>();
        existingPermisos.forEach(p -> permisosByClave.put(p.getClave(), p));

        for (Map.Entry<String, String> entry : permisosData.entrySet()) {
            String clave = entry.getKey();
            if (!permisosByClave.containsKey(clave)) {
                PermisosSistema nuevo = permisosRepo.save(
                        PermisosSistema.builder().clave(clave).descripcion(entry.getValue()).build());
                permisosByClave.put(clave, nuevo);
            }
        }

        List<RolesSistema> allRoles = rolesRepo.findAllByNombreIn(rolNombres);
        Map<String, RolesSistema> rolesByName = allRoles.stream()
                .collect(Collectors.toMap(RolesSistema::getNombre, r -> r));

        Map<String, PermisosSistema> finalPermisosByClave = permisosByClave;
        List<RolPermiso> toSave = new ArrayList<>();

        for (Map.Entry<String, List<String>> entry : rolesPermisos.entrySet()) {
            RolesSistema rol = rolesByName.get(entry.getKey());
            if (rol == null) continue;
            Long rolId = rol.getId();

            List<RolPermiso> existingRolPermisos = rolPermisoRepo.findByIdRolId(rolId);
            var existingClaves = existingRolPermisos.stream()
                    .map(rp -> rp.getPermiso().getClave())
                    .collect(Collectors.toSet());

            for (String clavePermiso : entry.getValue()) {
                if (!existingClaves.contains(clavePermiso)) {
                    PermisosSistema permiso = finalPermisosByClave.get(clavePermiso);
                    if (permiso != null) {
                        toSave.add(RolPermiso.builder()
                                .id(new RolPermisoId(rolId, permiso.getId()))
                                .rol(rol).permiso(permiso).build());
                    }
                }
            }
        }

        if (!toSave.isEmpty()) {
            rolPermisoRepo.saveAll(toSave);
        }

        log.info("Roles y permisos sembrados");
    }

    private void seedAdminIfNoUsers() {
        if (adminEmail == null || adminEmail.isBlank()) {
            log.warn("No se ha configurado app.admin.email. Saltando creacion de admin.");
            return;
        }

        RolesSistema superAdmin = rolesRepo.findByNombre("SuperAdmin")
                .orElseThrow(() -> new RuntimeException("Rol SuperAdmin no encontrado"));

        Usuario admin = usuarioRepo.findByEmail(adminEmail)
                .orElseGet(() -> usuarioRepo.save(Usuario.builder()
                        .nombre(adminNombre != null && !adminNombre.isBlank() ? adminNombre : "Super Admin")
                        .email(adminEmail)
                        .passwordHash(passwordEncoder.encode(adminPassword))
                        .activo(true)
                        .build()));

        if (usuarioRolRepo.findByIdUsuarioId(admin.getId()).stream()
                .noneMatch(ur -> ur.getRol().getNombre().equals("SuperAdmin"))) {
            usuarioRolRepo.save(UsuarioRol.builder()
                    .id(new UsuarioRolId(admin.getId(), superAdmin.getId()))
                    .usuario(admin).rol(superAdmin).build());
            log.info("Admin listo: {} con rol SuperAdmin", adminEmail);
        }
    }

    private void seedJugadoresIfEmpty() {
        RolesSistema rolJugador = rolesRepo.findByNombre("Jugador")
                .orElseThrow(() -> new RuntimeException("Rol Jugador no encontrado"));

        List<Usuario> existingJugadores = usuarioRolRepo.findByIdRolId(rolJugador.getId()).stream()
                .map(UsuarioRol::getUsuario)
                .toList();

        if (!existingJugadores.isEmpty()) {
            log.info("Jugadores ya existen ({}) - omitiendo seed", existingJugadores.size());
            return;
        }

        record JugadorData(String nombre, String email) {}

        List<JugadorData> jugadores = List.of(
                new JugadorData("Carlos Mendoza", "carlos.mendoza@email.com"),
                new JugadorData("María Fernández", "maria.fernandez@email.com"),
                new JugadorData("Luis García", "luis.garcia@email.com"),
                new JugadorData("Ana Ramírez", "ana.ramirez@email.com"),
                new JugadorData("Pedro Sánchez", "pedro.sanchez@email.com"),
                new JugadorData("Laura Torres", "laura.torres@email.com"),
                new JugadorData("Jorge Díaz", "jorge.diaz@email.com"),
                new JugadorData("Sofia Castro", "sofia.castro@email.com"),
                new JugadorData("Miguel Rivera", "miguel.rivera@email.com"),
                new JugadorData("Carmen Ortiz", "carmen.ortiz@email.com"),
                new JugadorData("Diego Jiménez", "diego.jimenez@email.com"),
                new JugadorData("Patricia Vega", "patricia.vega@email.com"),
                new JugadorData("Roberto Luna", "roberto.luna@email.com"),
                new JugadorData("Isabel Morales", "isabel.morales@email.com"),
                new JugadorData("Antonio Ruiz", "antonio.ruiz@email.com")
        );

        List<Usuario> savedJugadores = new ArrayList<>();
        for (JugadorData jd : jugadores) {
            if (usuarioRepo.findByEmail(jd.email()).isPresent()) continue;

            Usuario jugador = usuarioRepo.save(Usuario.builder()
                    .nombre(jd.nombre())
                    .email(jd.email())
                    .passwordHash(passwordEncoder.encode("Jugador123!"))
                    .activo(true)
                    .build());
            savedJugadores.add(jugador);
        }

        for (Usuario jugador : savedJugadores) {
            usuarioRolRepo.save(UsuarioRol.builder()
                    .id(new UsuarioRolId(jugador.getId(), rolJugador.getId()))
                    .usuario(jugador)
                    .rol(rolJugador)
                    .build());
        }

        log.info("Jugadores creados: {} | Contraseña: Jugador123!", savedJugadores.size());
    }

    private record PosData(String nombre, String abreviatura) {}

    private void seedDeportesYPosicionesIfEmpty() {

        // 1. Fútbol
        Deporte futbol = deporteRepo.findByNombreIgnoreCase("Fútbol")
                .orElseGet(() -> deporteRepo.save(Deporte.builder()
                        .nombre("Fútbol")
                        .esPorEquipos(true)
                        .minJugadoresPorBando(7)
                        .maxJugadoresPorBando(11)
                        .build()));

        List<PosData> futbolPos = List.of(
                new PosData("Portero", "POR"),
                new PosData("Defensa Central", "DFC"),
                new PosData("Lateral Izquierdo", "LI"),
                new PosData("Lateral Derecho", "LD"),
                new PosData("Mediocentro Defensivo", "MCD"),
                new PosData("Mediocentro Organizador", "MC"),
                new PosData("Mediapunta", "MCO"),
                new PosData("Extremo Izquierdo", "EI"),
                new PosData("Extremo Derecho", "ED"),
                new PosData("Delantero Centro", "DC")
        );
        seedPosicionesParaDeporte(futbol, futbolPos);

        // 2. Baloncesto
        Deporte baloncesto = deporteRepo.findByNombreIgnoreCase("Baloncesto")
                .orElseGet(() -> deporteRepo.save(Deporte.builder()
                        .nombre("Baloncesto")
                        .esPorEquipos(true)
                        .minJugadoresPorBando(5)
                        .maxJugadoresPorBando(5)
                        .build()));

        List<PosData> baloncestoPos = List.of(
                new PosData("Base", "B"),
                new PosData("Escolta", "E"),
                new PosData("Alero", "A"),
                new PosData("Ala-Pívot", "AP"),
                new PosData("Pívot", "P")
        );
        seedPosicionesParaDeporte(baloncesto, baloncestoPos);

        // 3. Vóleibol
        Deporte voleibol = deporteRepo.findByNombreIgnoreCase("Vóleibol")
                .orElseGet(() -> deporteRepo.save(Deporte.builder()
                        .nombre("Vóleibol")
                        .esPorEquipos(true)
                        .minJugadoresPorBando(6)
                        .maxJugadoresPorBando(6)
                        .build()));

        List<PosData> voleibolPos = List.of(
                new PosData("Colocador / Armador", "COL"),
                new PosData("Rematador / Punta", "PUN"),
                new PosData("Central", "CEN"),
                new PosData("Opuesto", "OPU"),
                new PosData("Líbero", "LIB")
        );
        seedPosicionesParaDeporte(voleibol, voleibolPos);

        // 4. Tenis
        Deporte tenis = deporteRepo.findByNombreIgnoreCase("Tenis")
                .orElseGet(() -> deporteRepo.save(Deporte.builder()
                        .nombre("Tenis")
                        .esPorEquipos(false)
                        .minJugadoresPorBando(1)
                        .maxJugadoresPorBando(2)
                        .build()));

        List<PosData> tenisPos = List.of(
                new PosData("Singles", "SGL"),
                new PosData("Dobles", "DBL")
        );
        seedPosicionesParaDeporte(tenis, tenisPos);

        // 5. Trotar / Running
        Deporte trotar = deporteRepo.findByNombreIgnoreCase("Trotar / Running")
                .orElseGet(() -> deporteRepo.save(Deporte.builder()
                        .nombre("Trotar / Running")
                        .esPorEquipos(false)
                        .minJugadoresPorBando(1)
                        .maxJugadoresPorBando(1)
                        .build()));

        List<PosData> trotarPos = List.of(
                new PosData("Corredor Recreativo", "REC"),
                new PosData("Velocista", "VEL"),
                new PosData("Fondista / Maratonista", "FON"),
                new PosData("Trail Runner", "TRL")
        );
        seedPosicionesParaDeporte(trotar, trotarPos);

        // 6. Ciclismo
        Deporte ciclismo = deporteRepo.findByNombreIgnoreCase("Ciclismo")
                .orElseGet(() -> deporteRepo.save(Deporte.builder()
                        .nombre("Ciclismo")
                        .esPorEquipos(false)
                        .minJugadoresPorBando(1)
                        .maxJugadoresPorBando(1)
                        .build()));

        List<PosData> ciclismoPos = List.of(
                new PosData("Ciclista de Ruta", "RUT"),
                new PosData("Escalador", "ESC"),
                new PosData("Sprinter", "SPR"),
                new PosData("Mountain Biker", "MTB")
        );
        seedPosicionesParaDeporte(ciclismo, ciclismoPos);

        // 7. Pádel
        Deporte padel = deporteRepo.findByNombreIgnoreCase("Pádel")
                .orElseGet(() -> deporteRepo.save(Deporte.builder()
                        .nombre("Pádel")
                        .esPorEquipos(false)
                        .minJugadoresPorBando(1)
                        .maxJugadoresPorBando(2)
                        .build()));

        List<PosData> padelPos = List.of(
                new PosData("Revés / Lado Izquierdo", "REV"),
                new PosData("Drive / Lado Derecho", "DRV")
        );
        seedPosicionesParaDeporte(padel, padelPos);

        log.info("Seed de deportes y posiciones oficiales completado de forma auto-reparable.");
    }

    private void seedPosicionesParaDeporte(Deporte deporte, List<PosData> posicionesRequeridas) {
        List<PosicionesDeporte> posicionesExistentes = posicionesDeporteRepo.findByDeporteId(deporte.getId());
        var nombresExistentes = posicionesExistentes.stream()
                .map(p -> p.getNombre().toLowerCase().trim())
                .collect(Collectors.toSet());

        for (PosData pd : posicionesRequeridas) {
            if (!nombresExistentes.contains(pd.nombre().toLowerCase().trim())) {
                posicionesDeporteRepo.save(PosicionesDeporte.builder()
                        .nombre(pd.nombre())
                        .abreviatura(pd.abreviatura())
                        .deporte(deporte)
                        .build());
            }
        }
    }
}