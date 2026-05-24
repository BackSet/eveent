package com.event.backend.config;

import com.event.backend.model.Deporte;
import com.event.backend.model.PosicionesDeporte;
import com.event.backend.model.RolesSistema;
import com.event.backend.model.Usuario;
import com.event.backend.model.UsuarioRol;
import com.event.backend.model.UsuarioRolId;
import com.event.backend.repository.*;
import com.event.backend.service.PermisoRoleSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final PermisoRoleSyncService permisoRoleSyncService;
    private final RolesSistemaRepository rolesRepo;
    private final UsuarioRepository usuarioRepo;
    private final UsuarioRolRepository usuarioRolRepo;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;
    private final DeporteRepository deporteRepo;
    private final PosicionesDeporteRepository posicionesDeporteRepo;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Value("${app.admin.nombre}")
    private String adminNombre;

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.bootstrap.enabled:true}")
    private boolean bootstrapEnabled;

    @Override
    @Transactional
    public void run(String... args) {
        permisoRoleSyncService.syncCatalog();
        seedDeportesYPosicionesIfEmpty();

        if (!bootstrapEnabled) return;

        seedAdminIfNoUsers();

        if (environment.matchesProfiles("prod")) return;

        if (!environment.matchesProfiles("dev", "test", "default")) return;
        seedJugadoresIfEmpty();
        log.info("Seed dev completado: {} deportes", deporteRepo.count());
    }

    private void seedAdminIfNoUsers() {
        if (adminEmail == null || adminEmail.isBlank()) {
            log.warn("No se ha configurado app.admin.email. Saltando creacion de admin.");
            return;
        }
        if (adminPassword == null || adminPassword.isBlank()) {
            log.warn("No se ha configurado app.admin.password / ADMIN_INITIAL_PASSWORD. Saltando creacion de admin.");
            return;
        }

        RolesSistema superAdmin = rolesRepo.findByNombre("SuperAdmin")
                .orElseThrow(() -> new RuntimeException("Rol SuperAdmin no encontrado"));

        Usuario admin = usuarioRepo.findByEmail(adminEmail).orElse(null);
        if (admin == null) {
            if (usuarioRepo.count() > 0) {
                log.warn(
                        "Bootstrap de admin omitido: no existe {} pero ya hay usuarios en la BD",
                        adminEmail);
                return;
            }
            admin = usuarioRepo.save(Usuario.builder()
                    .nombre(adminNombre != null && !adminNombre.isBlank() ? adminNombre : "Super Admin")
                    .email(adminEmail)
                    .username(adminUsername)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .activo(true)
                    .build());
            log.info("Admin creado: {} (usuario: {})", adminEmail, adminUsername);
        } else {
            boolean changed = false;
            if (admin.getUsername() == null || admin.getUsername().isBlank()) {
                admin.setUsername(adminUsername);
                changed = true;
            }
            if (!admin.getActivo()) {
                admin.setActivo(true);
                changed = true;
            }
            if (changed) {
                admin = usuarioRepo.save(admin);
            }
        }

        ensureSuperAdminRole(admin, superAdmin);
    }

    private void ensureSuperAdminRole(Usuario admin, RolesSistema superAdmin) {
        if (usuarioRolRepo.findByIdUsuarioId(admin.getId()).stream()
                .noneMatch(ur -> ur.getRol().getNombre().equals("SuperAdmin"))) {
            usuarioRolRepo.save(UsuarioRol.builder()
                    .id(new UsuarioRolId(admin.getId(), superAdmin.getId()))
                    .usuario(admin).rol(superAdmin).build());
            log.info("Rol SuperAdmin asignado a {}", adminEmail);
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
        if (deporteRepo.count() > 0) {
            log.debug("Catálogo de deportes ya inicializado ({} registros) — omitiendo seed", deporteRepo.count());
            return;
        }

        log.info("Catálogo de deportes vacío — cargando disciplinas y posiciones iniciales (solo esta vez)");

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

        log.info("Seed inicial de deportes y posiciones completado ({} deportes)", deporteRepo.count());
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