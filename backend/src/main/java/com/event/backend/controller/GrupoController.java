package com.event.backend.controller;

import com.event.backend.dto.grupo.GrupoRequest;
import com.event.backend.dto.grupo.GrupoResponse;
import com.event.backend.service.GrupoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/grupos")
@RequiredArgsConstructor
public class GrupoController {

    private final GrupoService grupoService;

    @GetMapping
    @PreAuthorize("hasAuthority('ver_grupos')")
    public ResponseEntity<List<GrupoResponse>> findAll() {
        return ResponseEntity.ok(grupoService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ver_grupos')")
    public ResponseEntity<GrupoResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(grupoService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('crear_grupos')")
    public ResponseEntity<GrupoResponse> create(@Valid @RequestBody GrupoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(grupoService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('editar_grupos')")
    public ResponseEntity<GrupoResponse> update(@PathVariable Long id, @Valid @RequestBody GrupoRequest request) {
        return ResponseEntity.ok(grupoService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('eliminar_grupos')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        grupoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
