package com.event.backend.controller;

import com.event.backend.dto.permiso.PermisoRequest;
import com.event.backend.dto.permiso.PermisoResponse;
import com.event.backend.service.PermisoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/permisos")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('gestionar_roles')")
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

    @PostMapping
    public ResponseEntity<PermisoResponse> create(@Valid @RequestBody PermisoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(permisoService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PermisoResponse> update(@PathVariable Long id, @Valid @RequestBody PermisoRequest request) {
        return ResponseEntity.ok(permisoService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        permisoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
