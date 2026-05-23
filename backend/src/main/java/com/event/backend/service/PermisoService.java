package com.event.backend.service;

import com.event.backend.dto.permiso.PermisoRequest;
import com.event.backend.dto.permiso.PermisoResponse;
import com.event.backend.model.PermisosSistema;
import com.event.backend.repository.PermisosSistemaRepository;
import com.event.backend.repository.RolPermisoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PermisoService {

    private final PermisosSistemaRepository permisosRepository;
    private final RolPermisoRepository rolPermisoRepository;

    @Transactional(readOnly = true)
    public List<PermisoResponse> findAll() {
        return permisosRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PermisoResponse findById(Long id) {
        PermisosSistema permiso = permisosRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Permiso no encontrado con id: " + id));
        return toResponse(permiso);
    }

    public PermisoResponse create(PermisoRequest request) {
        if (permisosRepository.findByClave(request.getClave()).isPresent()) {
            throw new RuntimeException("Ya existe un permiso con la clave: " + request.getClave());
        }

        PermisosSistema permiso = permisosRepository.save(PermisosSistema.builder()
                .clave(request.getClave())
                .descripcion(request.getDescripcion())
                .build());

        return toResponse(permiso);
    }

    public PermisoResponse update(Long id, PermisoRequest request) {
        PermisosSistema permiso = permisosRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Permiso no encontrado con id: " + id));

        permisosRepository.findByClave(request.getClave())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new RuntimeException("Ya existe un permiso con la clave: " + request.getClave());
                });

        permiso.setClave(request.getClave());
        permiso.setDescripcion(request.getDescripcion());

        return toResponse(permisosRepository.save(permiso));
    }

    public void delete(Long id) {
        PermisosSistema permiso = permisosRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Permiso no encontrado con id: " + id));

        // Evitar borrar permisos del sistema core sembrados por defecto
        List<String> corePermisos = List.of(
                "ver_convocatorias", "crear_convocatorias", "editar_convocatorias", "eliminar_convocatorias", "cancelar_convocatorias", "responder_asistencia", "invitar_externos", "dividir_equipos",
                "ver_grupos", "crear_grupos", "editar_grupos", "eliminar_grupos",
                "ver_deportes", "gestionar_deportes",
                "ver_usuarios", "crear_usuarios", "editar_usuarios", "dar_baja_usuarios", "suspender_jugadores",
                "ver_roles", "gestionar_roles", "ver_permisos"
        );
        if (corePermisos.contains(permiso.getClave())) {
            throw new RuntimeException("No se puede eliminar un permiso del sistema por defecto: " + permiso.getClave());
        }

        rolPermisoRepository.deleteByIdPermisoId(id);
        permisosRepository.deleteById(id);
    }

    private PermisoResponse toResponse(PermisosSistema permiso) {
        return PermisoResponse.builder()
                .id(permiso.getId())
                .clave(permiso.getClave())
                .descripcion(permiso.getDescripcion())
                .build();
    }
}
