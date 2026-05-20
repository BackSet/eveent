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
        return rolesRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RolResponse findById(Long id) {
        RolesSistema rol = rolesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado con id: " + id));
        return toResponse(rol);
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

        return toResponse(rolesRepository.save(rol));
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

        return toResponse(rolesRepository.save(rol));
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
        for (Long permisoId : permisoIds) {
            PermisosSistema permiso = permisosRepository.findById(permisoId)
                    .orElseThrow(() -> new RuntimeException("Permiso no encontrado con id: " + permisoId));

            rolPermisoRepository.save(RolPermiso.builder()
                    .id(new RolPermisoId(rol.getId(), permiso.getId()))
                    .rol(rol)
                    .permiso(permiso)
                    .build());
        }
    }

    private RolResponse toResponse(RolesSistema rol) {
        List<String> permisos = rolPermisoRepository.findByIdRolId(rol.getId()).stream()
                .map(rp -> rp.getPermiso().getClave())
                .collect(Collectors.toList());

        return RolResponse.builder()
                .id(rol.getId())
                .nombre(rol.getNombre())
                .permisos(permisos)
                .build();
    }
}