package com.event.backend.config;

import com.event.backend.model.*;
import com.event.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Value("${app.admin.nombre}")
    private String adminNombre;

    @Override
    @Transactional
    public void run(String... args) {
        seedRolesIfEmpty();
        seedAdminIfNoUsers();
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

        Map<String, Long> roleIds = new HashMap<>();

        for (Map.Entry<String, List<String>> entry : rolesPermisos.entrySet()) {
            String rolNombre = entry.getKey();
            RolesSistema rol = rolesRepo.findByNombre(rolNombre)
                    .orElseGet(() -> rolesRepo.save(RolesSistema.builder().nombre(rolNombre).build()));
            roleIds.put(rolNombre, rol.getId());
        }

        for (Map.Entry<String, String> entry : permisosData.entrySet()) {
            String clave = entry.getKey();
            String desc = entry.getValue();
            permisosRepo.findByClave(clave)
                    .orElseGet(() -> permisosRepo.save(PermisosSistema.builder().clave(clave).descripcion(desc).build()));
        }

        for (Map.Entry<String, List<String>> entry : rolesPermisos.entrySet()) {
            String rolNombre = entry.getKey();
            Long rolId = roleIds.get(rolNombre);
            RolesSistema rol = rolesRepo.findByNombre(rolNombre).get();

            for (String clavePermiso : entry.getValue()) {
                permisosRepo.findByClave(clavePermiso).ifPresent(permiso -> {
                    boolean exists = rolPermisoRepo.findByIdRolId(rolId).stream()
                            .anyMatch(rp -> rp.getPermiso().getClave().equals(permiso.getClave()));
                    if (!exists) {
                        rolPermisoRepo.save(RolPermiso.builder()
                                .id(new RolPermisoId(rolId, permiso.getId()))
                                .rol(rol).permiso(permiso).build());
                    }
                });
            }
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
                        .build()));

        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setActivo(true);
        usuarioRepo.save(admin);

        if (usuarioRolRepo.findByIdUsuarioId(admin.getId()).stream()
                .noneMatch(ur -> ur.getRol().getNombre().equals("SuperAdmin"))) {
            usuarioRolRepo.save(UsuarioRol.builder()
                    .id(new UsuarioRolId(admin.getId(), superAdmin.getId()))
                    .usuario(admin).rol(superAdmin).build());
        }

        log.info("Admin listo: {} con rol SuperAdmin", adminEmail);
    }
}