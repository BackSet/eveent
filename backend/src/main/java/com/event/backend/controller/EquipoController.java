package com.event.backend.controller;

import com.event.backend.dto.equipo.EquipoRequest;
import com.event.backend.dto.equipo.EquipoResponse;
import com.event.backend.service.EquipoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class EquipoController {

    private final EquipoService equipoService;

    @GetMapping("/api/convocatorias/{convocatoriaId}/equipos")
    @PreAuthorize("hasAuthority('ver_convocatoria')")
    public ResponseEntity<List<EquipoResponse>> findByConvocatoria(@PathVariable Long convocatoriaId) {
        return ResponseEntity.ok(equipoService.findByConvocatoriaId(convocatoriaId));
    }

    @PostMapping("/api/convocatorias/{convocatoriaId}/equipos")
    @PreAuthorize("hasAuthority('dividir_equipos')")
    public ResponseEntity<EquipoResponse> create(@PathVariable Long convocatoriaId, @Valid @RequestBody EquipoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(equipoService.create(convocatoriaId, request));
    }

    @GetMapping("/api/equipos/{id}")
    @PreAuthorize("hasAuthority('ver_convocatoria')")
    public ResponseEntity<EquipoResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(equipoService.findById(id));
    }

    @PutMapping("/api/equipos/{id}")
    @PreAuthorize("hasAuthority('dividir_equipos')")
    public ResponseEntity<EquipoResponse> update(@PathVariable Long id, @Valid @RequestBody EquipoRequest request) {
        return ResponseEntity.ok(equipoService.update(id, request));
    }

    @DeleteMapping("/api/equipos/{id}")
    @PreAuthorize("hasAuthority('dividir_equipos')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        equipoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}