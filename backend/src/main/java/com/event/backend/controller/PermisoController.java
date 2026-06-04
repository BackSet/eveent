package com.event.backend.controller;

import com.event.backend.dto.permiso.PermisoDescripcionUpdateRequest;
import com.event.backend.dto.permiso.PermisoResponse;
import com.event.backend.service.PermisoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/permisos")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ver_permisos', 'gestionar_roles')")
public class PermisoController {

    private final PermisoService permisoService;

    @GetMapping
    public ResponseEntity<List<PermisoResponse>> findAll() {
        return ResponseEntity.ok(permisoService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PermisoResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(permisoService.findById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('gestionar_roles')")
    public ResponseEntity<PermisoResponse> updateDescripcion(
            @PathVariable Long id,
            @Valid @RequestBody PermisoDescripcionUpdateRequest request) {
        return ResponseEntity.ok(permisoService.updateDescripcion(id, request));
    }
}
