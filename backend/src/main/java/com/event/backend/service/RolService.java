package com.event.backend.service;

import com.event.backend.dto.permiso.PermisoResponse;
import com.event.backend.dto.rol.RolRequest;
import com.event.backend.dto.rol.RolResponse;
import com.event.backend.model.PermisosSistema;
import com.event.backend.model.RolPermiso;
import com.event.backend.model.RolPermisoId;
import com.event.backend.model.RolesSistema;
import com.event.backend.repository.PermisosSistemaRepository;
import com.event.backend.repository.RolPermisoRepository;
import com.event.backend.repository.RolesSistemaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RolService {

    private final RolesSistemaRepository rolesRepository;
    private final PermisosSistemaRepository permisosRepository;
    private final RolPermisoRepository rolPermisoRepository;

    @Transactional(readOnly = true)
    public List<RolResponse> findAll() {
        List<RolesSistema> allRoles = rolesRepository.findAll();
        List<Long> rolIds = allRoles.stream().map(RolesSistema::getId).toList();
        List<RolPermiso> allPermisos = rolPermisoRepository.findByIdRolIdIn(rolIds);

        Map<Long, List<String>> permisosByRolId = allPermisos.stream()
                .collect(Collectors.groupingBy(
                        rp -> rp.getRol().getId(),
                        Collectors.mapping(rp -> rp.getPermiso().getClave(), Collectors.toList())
                ));

        return allRoles.stream()
                .map(rol -> toResponse(rol, permisosByRolId.getOrDefault(rol.getId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public RolResponse findById(Long id) {
        RolesSistema rol = rolesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado con id: " + id));
        return toResponseWithFetch(rol);
    }

    public RolResponse create(RolRequest request) {
        if (rolesRepository.findByNombre(request.getNombre()).isPresent()) {
            throw new RuntimeException("Ya existe un rol con el nombre: " + request.getNombre());
        }

        RolesSistema rol = rolesRepository.save(RolesSistema.builder()
                .nombre(request.getNombre())
                .build());

        if (request.getPermisoIds() != null && !request.getPermisoIds().isEmpty()) {
            assignPermissions(rol, request.getPermisoIds());
        }

        return toResponseWithFetch(rol);
    }

    public RolResponse update(Long id, RolRequest request) {
        RolesSistema rol = rolesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado con id: " + id));

        rolesRepository.findByNombre(request.getNombre())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new RuntimeException("Ya existe un rol con el nombre: " + request.getNombre());
                });

        rol.setNombre(request.getNombre());
        rol = rolesRepository.save(rol);

        rolPermisoRepository.deleteByIdRolId(id);

        if (request.getPermisoIds() != null && !request.getPermisoIds().isEmpty()) {
            assignPermissions(rol, request.getPermisoIds());
        }

        return toResponseWithFetch(rol);
    }

    public void delete(Long id) {
        RolesSistema rol = rolesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado con id: " + id));

        if (List.of("SuperAdmin", "Organizador", "Jugador").contains(rol.getNombre())) {
            throw new RuntimeException("No se puede eliminar el rol: " + rol.getNombre());
        }

        rolPermisoRepository.deleteByIdRolId(id);
        rolesRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<PermisoResponse> findAllPermisos() {
        return permisosRepository.findAll().stream()
                .map(p -> PermisoResponse.builder()
                        .id(p.getId())
                        .clave(p.getClave())
                        .descripcion(p.getDescripcion())
                        .build())
                .toList();
    }

    private void assignPermissions(RolesSistema rol, List<Long> permisoIds) {
        List<PermisosSistema> permisos = permisosRepository.findAllById(permisoIds);
        if (permisos.size() != permisoIds.size()) {
            throw new RuntimeException("Uno o mas permisos no encontrados");
        }

        List<RolPermiso> mappings = permisos.stream()
                .map(permiso -> RolPermiso.builder()
                        .id(new RolPermisoId(rol.getId(), permiso.getId()))
                        .rol(rol)
                        .permiso(permiso)
                        .build())
                .toList();

        rolPermisoRepository.saveAll(mappings);
    }

    private RolResponse toResponse(RolesSistema rol, List<String> permisos) {
        return RolResponse.builder()
                .id(rol.getId())
                .nombre(rol.getNombre())
                .permisos(permisos)
                .build();
    }

    private RolResponse toResponseWithFetch(RolesSistema rol) {
        List<String> permisos = rolPermisoRepository.findByIdRolId(rol.getId()).stream()
                .map(rp -> rp.getPermiso().getClave())
                .collect(Collectors.toList());

        return toResponse(rol, permisos);
    }
}