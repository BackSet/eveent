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

import java.util.List;

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
        if (rolesRepo.count() > 0) {
            log.info("Datos iniciales ya existen. Saltando seed.");
            return;
        }

        log.info("Insertando datos iniciales del sistema...");

        var superAdmin = rolesRepo.save(RolesSistema.builder().nombre("SuperAdmin").build());
        var organizador = rolesRepo.save(RolesSistema.builder().nombre("Organizador").build());
        var jugador = rolesRepo.save(RolesSistema.builder().nombre("Jugador").build());

        var pCrearConv = permisosRepo.save(PermisosSistema.builder().clave("crear_convocatoria").descripcion("Crear convocatorias").build());
        var pDividirEq = permisosRepo.save(PermisosSistema.builder().clave("dividir_equipos").descripcion("Dividir equipos").build());
        var pInvitarExt = permisosRepo.save(PermisosSistema.builder().clave("invitar_externos").descripcion("Invitar externos").build());
        var pGestionarRoles = permisosRepo.save(PermisosSistema.builder().clave("gestionar_roles").descripcion("Gestionar roles y permisos").build());
        var pVerConv = permisosRepo.save(PermisosSistema.builder().clave("ver_convocatoria").descripcion("Ver convocatorias").build());
        var pResponderAsist = permisosRepo.save(PermisosSistema.builder().clave("responder_asistencia").descripcion("Responder asistencia").build());

        List<PermisosSistema> todosPermisos = List.of(pCrearConv, pDividirEq, pInvitarExt, pGestionarRoles, pVerConv, pResponderAsist);

        for (PermisosSistema p : todosPermisos) {
            rolPermisoRepo.save(RolPermiso.builder()
                    .id(new RolPermisoId(superAdmin.getId(), p.getId()))
                    .rol(superAdmin).permiso(p).build());
        }

        List<PermisosSistema> permsOrg = List.of(pCrearConv, pDividirEq, pInvitarExt, pVerConv, pResponderAsist);
        for (PermisosSistema p : permsOrg) {
            rolPermisoRepo.save(RolPermiso.builder()
                    .id(new RolPermisoId(organizador.getId(), p.getId()))
                    .rol(organizador).permiso(p).build());
        }

        List<PermisosSistema> permsJug = List.of(pVerConv, pResponderAsist);
        for (PermisosSistema p : permsJug) {
            rolPermisoRepo.save(RolPermiso.builder()
                    .id(new RolPermisoId(jugador.getId(), p.getId()))
                    .rol(jugador).permiso(p).build());
        }

        if (!usuarioRepo.existsByEmail(adminEmail)) {
            Usuario admin = usuarioRepo.save(Usuario.builder()
                    .nombre(adminNombre)
                    .email(adminEmail)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .build());

            usuarioRolRepo.save(UsuarioRol.builder()
                    .id(new UsuarioRolId(admin.getId(), superAdmin.getId()))
                    .usuario(admin).rol(superAdmin).build());

            log.info("Admin creado desde variables de entorno: {}", adminEmail);
        }

        log.info("Seed completado: {} roles, {} permisos", rolesRepo.count(), permisosRepo.count());
    }
}
