package com.event.backend.config;

import com.event.backend.model.Deporte;
import com.event.backend.model.PosicionesDeporte;
import com.event.backend.model.RolesSistema;
import com.event.backend.model.Usuario;
import com.event.backend.model.UsuarioRol;
import com.event.backend.model.UsuarioRolId;
import com.event.backend.repository.DeporteRepository;
import com.event.backend.repository.PosicionesDeporteRepository;
import com.event.backend.repository.RolesSistemaRepository;
import com.event.backend.repository.UsuarioRepository;
import com.event.backend.repository.UsuarioRolRepository;
import com.event.backend.service.PermisoRoleSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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

    @Value("${app.seed.deportes-posiciones.enabled:false}")
    private boolean seedDeportesPosicionesEnabled;

    @Value("${app.seed.deportes-posiciones.update-existing:false}")
    private boolean updateExistingDeportesPosiciones;

    @Override
    @Transactional
    public void run(String... args) {
        permisoRoleSyncService.syncCatalog();

        if (seedDeportesPosicionesEnabled) {
            seedDeportesYPosiciones();
        } else {
            log.info("Seed de deportes/posiciones desactivado. Activalo con APP_SEED_DEPORTES_POSICIONES_ENABLED=true.");
        }

        if (!bootstrapEnabled) return;

        seedAdminIfNoUsers();

        if (environment.matchesProfiles("prod")) return;
        if (environment.matchesProfiles("dev", "test", "default")) {
            log.info("Bootstrap dev completado sin sembrar jugadores ni posiciones desde DataInitializer.");
        }
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

    private record PosData(String nombre, String abreviatura) {}

    private record DeporteSeed(
            String nombre,
            boolean esPorEquipos,
            int minJugadoresPorBando,
            int maxJugadoresPorBando,
            List<PosData> posiciones
    ) {}

    private void seedDeportesYPosiciones() {
        List<DeporteSeed> deportes = List.of(
                new DeporteSeed("Fútbol", true, 7, 11, List.of(
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
                )),
                new DeporteSeed("Baloncesto", true, 5, 5, List.of(
                        new PosData("Base", "B"),
                        new PosData("Escolta", "E"),
                        new PosData("Alero", "A"),
                        new PosData("Ala-Pívot", "AP"),
                        new PosData("Pívot", "P")
                )),
                new DeporteSeed("Vóleibol", true, 6, 6, List.of(
                        new PosData("Colocador / Armador", "COL"),
                        new PosData("Rematador / Punta", "PUN"),
                        new PosData("Central", "CEN"),
                        new PosData("Opuesto", "OPU"),
                        new PosData("Líbero", "LIB")
                )),
                new DeporteSeed("Tenis", false, 1, 2, List.of(
                        new PosData("Singles", "SGL"),
                        new PosData("Dobles", "DBL")
                )),
                new DeporteSeed("Trotar / Running", false, 1, 1, List.of(
                        new PosData("Corredor Recreativo", "REC"),
                        new PosData("Velocista", "VEL"),
                        new PosData("Fondista / Maratonista", "FON"),
                        new PosData("Trail Runner", "TRL")
                )),
                new DeporteSeed("Ciclismo", false, 1, 1, List.of(
                        new PosData("Ciclista de Ruta", "RUT"),
                        new PosData("Escalador", "ESC"),
                        new PosData("Sprinter", "SPR"),
                        new PosData("Mountain Biker", "MTB")
                )),
                new DeporteSeed("Pádel", false, 1, 2, List.of(
                        new PosData("Revés / Lado Izquierdo", "REV"),
                        new PosData("Drive / Lado Derecho", "DRV")
                ))
        );

        for (DeporteSeed seed : deportes) {
            Deporte deporte = deporteRepo.findByNombreIgnoreCase(seed.nombre())
                    .map(existing -> updateDeporteIfAllowed(existing, seed))
                    .orElseGet(() -> deporteRepo.save(Deporte.builder()
                            .nombre(seed.nombre())
                            .esPorEquipos(seed.esPorEquipos())
                            .minJugadoresPorBando(seed.minJugadoresPorBando())
                            .maxJugadoresPorBando(seed.maxJugadoresPorBando())
                            .build()));
            seedPosicionesParaDeporte(deporte, seed.posiciones());
        }

        log.info(
                "Seed de deportes/posiciones completado. Modo update-existing={}",
                updateExistingDeportesPosiciones);
    }

    private Deporte updateDeporteIfAllowed(Deporte deporte, DeporteSeed seed) {
        if (!updateExistingDeportesPosiciones) {
            return deporte;
        }
        deporte.setEsPorEquipos(seed.esPorEquipos());
        deporte.setMinJugadoresPorBando(seed.minJugadoresPorBando());
        deporte.setMaxJugadoresPorBando(seed.maxJugadoresPorBando());
        return deporteRepo.save(deporte);
    }

    private void seedPosicionesParaDeporte(Deporte deporte, List<PosData> posicionesRequeridas) {
        List<PosicionesDeporte> posicionesExistentes = posicionesDeporteRepo.findByDeporteId(deporte.getId());
        for (PosData posicionRequerida : posicionesRequeridas) {
            boolean exists = posicionesExistentes.stream()
                    .anyMatch(p -> p.getNombre() != null
                            && p.getNombre().trim().equalsIgnoreCase(posicionRequerida.nombre().trim()));
            if (!exists) {
                posicionesDeporteRepo.save(PosicionesDeporte.builder()
                        .nombre(posicionRequerida.nombre())
                        .abreviatura(posicionRequerida.abreviatura())
                        .deporte(deporte)
                        .build());
            }
        }
    }
}
