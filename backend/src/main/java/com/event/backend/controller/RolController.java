package com.event.backend.controller;

import com.event.backend.dto.permiso.PermisoResponse;
import com.event.backend.dto.rol.RolRequest;
import com.event.backend.dto.rol.RolResponse;
import com.event.backend.service.RolService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ver_roles', 'gestionar_roles')")
public class RolController {

    private final RolService rolService;

    @GetMapping
    public ResponseEntity<List<RolResponse>> findAll() {
        return ResponseEntity.ok(rolService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RolResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(rolService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('gestionar_roles')")
    public ResponseEntity<RolResponse> create(@Valid @RequestBody RolRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(rolService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('gestionar_roles')")
    public ResponseEntity<RolResponse> update(@PathVariable Long id, @Valid @RequestBody RolRequest request) {
        return ResponseEntity.ok(rolService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('gestionar_roles')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        rolService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/permisos")
    public ResponseEntity<List<PermisoResponse>> findAllPermisos() {
        return ResponseEntity.ok(rolService.findAllPermisos());
    }
}