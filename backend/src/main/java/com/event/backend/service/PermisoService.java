package com.event.backend.service;

import com.event.backend.dto.permiso.PermisoDescripcionUpdateRequest;
import com.event.backend.dto.permiso.PermisoResponse;
import com.event.backend.exception.BusinessException;
import com.event.backend.model.PermisosSistema;
import com.event.backend.repository.PermisosSistemaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PermisoService {

    private final PermisosSistemaRepository permisosRepository;

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

    public PermisoResponse updateDescripcion(Long id, PermisoDescripcionUpdateRequest request) {
        PermisosSistema permiso = permisosRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Permiso no encontrado con id: " + id));

        permiso.setDescripcion(request.getDescripcion().trim());

        return toResponse(permisosRepository.save(permiso));
    }

    private PermisoResponse toResponse(PermisosSistema permiso) {
        return PermisoResponse.builder()
                .id(permiso.getId())
                .clave(permiso.getClave())
                .descripcion(permiso.getDescripcion())
                .build();
    }
}
