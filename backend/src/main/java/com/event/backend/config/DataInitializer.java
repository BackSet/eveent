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
        if (!bootstrapEnabled) return;
        if (!environment.matchesProfiles("dev", "test", "default")) return;
        seedRolesIfEmpty();
        seedAdminIfNoUsers();
        seedJugadoresIfEmpty();
        log.info("Seed completado: {} roles, {} permisos", rolesRepo.count(), permisosRepo.count());
    }

    private void seedRolesIfEmpty() {
        Map<String, String> permisosData = new HashMap<>();
        permisosData.put("crear_convocatoria", "Crear convocatorias");
        permisosData.put("dividir_equipos", "Dividir equipos");
        permisosData.put("invitar_externos", "Invitar externos");
        permisosData.put("gestionar_roles", "Gestionar roles y permisos");
        permisosData.put("ver_convocatoria", "Ver convocatorias");
        permisosData.put("responder_asistencia", "Responder asistencia");
        permisosData.put("gestionar_usuarios", "Gestionar usuarios");
        permisosData.put("gestionar_deportes", "Gestionar deportes y posiciones");
        permisosData.put("ver_permisos", "Ver lista de permisos");
        permisosData.put("gestionar_convocatorias", "Gestionar convocatorias");

        Map<String, List<String>> rolesPermisos = new HashMap<>();
        rolesPermisos.put("SuperAdmin", List.of("crear_convocatoria", "dividir_equipos", "invitar_externos",
                "gestionar_roles", "ver_convocatoria", "responder_asistencia", "gestionar_usuarios", "gestionar_deportes",
                "ver_permisos", "gestionar_convocatorias"));
        rolesPermisos.put("Organizador", List.of("crear_convocatoria", "dividir_equipos", "invitar_externos",
                "ver_convocatoria", "responder_asistencia", "gestionar_deportes", "gestionar_convocatorias"));
        rolesPermisos.put("Jugador", List.of("ver_convocatoria", "responder_asistencia"));

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
}