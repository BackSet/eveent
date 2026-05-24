package com.event.backend.service;

import com.event.backend.config.PermisosCatalog;
import com.event.backend.model.PermisosSistema;
import com.event.backend.model.RolPermiso;
import com.event.backend.model.RolPermisoId;
import com.event.backend.model.RolesSistema;
import com.event.backend.repository.PermisosSistemaRepository;
import com.event.backend.repository.RolPermisoRepository;
import com.event.backend.repository.RolesSistemaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PermisoRoleSyncService {

    private final PermisosSistemaRepository permisosRepository;
    private final RolesSistemaRepository rolesRepository;
    private final RolPermisoRepository rolPermisoRepository;

    /**
     * Asegura que existan todos los permisos del catálogo y que los roles predefinidos
     * tengan las asignaciones canónicas (añade las que falten, sin quitar personalizaciones).
     */
    @Transactional
    public void syncCatalog() {
        migrateDividirEquiposLegacy();
        Map<String, PermisosSistema> permisosByClave = upsertPermisosFromCatalog();
        ensurePredefinedRolesExist();
        syncPredefinedRolePermissions(permisosByClave);
    }

    private void migrateDividirEquiposLegacy() {
        permisosRepository.findByClave(PermisosCatalog.DIVIDIR_EQUIPOS_LEGACY).ifPresent(legacy -> {
            var bandosOpt = permisosRepository.findByClave(PermisosCatalog.DIVIDIR_BANDOS);
            if (bandosOpt.isEmpty()) {
                legacy.setClave(PermisosCatalog.DIVIDIR_BANDOS);
                legacy.setDescripcion(PermisosCatalog.permisos().get(PermisosCatalog.DIVIDIR_BANDOS));
                permisosRepository.save(legacy);
                log.info("Permiso legacy {} renombrado a {}", PermisosCatalog.DIVIDIR_EQUIPOS_LEGACY, PermisosCatalog.DIVIDIR_BANDOS);
            } else {
                PermisosSistema bandos = bandosOpt.get();
                List<RolPermiso> legacyLinks = rolPermisoRepository.findByIdPermisoId(legacy.getId());
                for (RolPermiso link : legacyLinks) {
                    Long rolId = link.getId().getRolId();
                    boolean alreadyHasBando = rolPermisoRepository.findByIdRolId(rolId).stream()
                            .anyMatch(rp -> rp.getPermiso().getId().equals(bandos.getId()));
                    if (!alreadyHasBando) {
                        RolesSistema rol = link.getRol();
                        rolPermisoRepository.save(RolPermiso.builder()
                                .id(new RolPermisoId(rolId, bandos.getId()))
                                .rol(rol)
                                .permiso(bandos)
                                .build());
                    }
                    rolPermisoRepository.delete(link);
                }
                rolPermisoRepository.flush();
                permisosRepository.delete(legacy);
                log.info("Permiso legacy {} fusionado en {}", PermisosCatalog.DIVIDIR_EQUIPOS_LEGACY, PermisosCatalog.DIVIDIR_BANDOS);
            }
        });
    }

    private Map<String, PermisosSistema> upsertPermisosFromCatalog() {
        Map<String, String> catalog = PermisosCatalog.permisos();
        List<PermisosSistema> existing = permisosRepository.findByClaveIn(catalog.keySet().stream().toList());
        Map<String, PermisosSistema> byClave = new HashMap<>();
        existing.forEach(p -> byClave.put(p.getClave(), p));

        for (Map.Entry<String, String> entry : catalog.entrySet()) {
            String clave = entry.getKey();
            if (!byClave.containsKey(clave)) {
                PermisosSistema nuevo = permisosRepository.save(
                        PermisosSistema.builder().clave(clave).descripcion(entry.getValue()).build());
                byClave.put(clave, nuevo);
                log.info("Permiso creado: {}", clave);
            }
        }
        return byClave;
    }

    private void ensurePredefinedRolesExist() {
        for (String nombreRol : PermisosCatalog.ROLES_PREDEFINIDOS) {
            rolesRepository.findByNombre(nombreRol).orElseGet(() ->
                    rolesRepository.save(RolesSistema.builder().nombre(nombreRol).build()));
        }
    }

    private void syncPredefinedRolePermissions(Map<String, PermisosSistema> permisosByClave) {
        List<RolesSistema> roles = rolesRepository.findAllByNombreIn(
                PermisosCatalog.ROLES_PREDEFINIDOS.stream().toList());
        Map<String, RolesSistema> rolesByName = roles.stream()
                .collect(Collectors.toMap(RolesSistema::getNombre, r -> r));

        List<RolPermiso> toSave = new ArrayList<>();

        for (Map.Entry<String, List<String>> entry : PermisosCatalog.permisosPorRol().entrySet()) {
            RolesSistema rol = rolesByName.get(entry.getKey());
            if (rol == null) continue;

            Long rolId = rol.getId();
            var existingClaves = rolPermisoRepository.findByIdRolId(rolId).stream()
                    .map(rp -> rp.getPermiso().getClave())
                    .collect(Collectors.toSet());

            for (String clavePermiso : entry.getValue()) {
                if (existingClaves.contains(clavePermiso)) continue;
                PermisosSistema permiso = permisosByClave.get(clavePermiso);
                if (permiso == null) {
                    log.warn("Permiso {} no encontrado al sincronizar rol {}", clavePermiso, entry.getKey());
                    continue;
                }
                toSave.add(RolPermiso.builder()
                        .id(new RolPermisoId(rolId, permiso.getId()))
                        .rol(rol)
                        .permiso(permiso)
                        .build());
            }
        }

        if (!toSave.isEmpty()) {
            rolPermisoRepository.saveAll(toSave);
            log.info("Sincronizados {} vínculos rol-permiso", toSave.size());
        }
    }
}
