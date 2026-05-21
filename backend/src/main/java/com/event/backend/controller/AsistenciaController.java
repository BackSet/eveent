package com.event.backend.controller;

import com.event.backend.dto.asistencia.AsistenciaRequest;
import com.event.backend.dto.asistencia.AsistenciaResponse;
import com.event.backend.dto.asistencia.AsistenciaUpdateRequest;
import com.event.backend.service.AsistenciaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class AsistenciaController {

    private final AsistenciaService asistenciaService;

    @GetMapping("/api/convocatorias/{convocatoriaId}/asistencias")
    @PreAuthorize("hasAuthority('ver_convocatoria')")
    public ResponseEntity<List<AsistenciaResponse>> findByConvocatoria(@PathVariable Long convocatoriaId) {
        return ResponseEntity.ok(asistenciaService.findByConvocatoriaId(convocatoriaId));
    }

    @GetMapping("/api/convocatorias/{convocatoriaId}/asistencias/mi-asistencia")
    @PreAuthorize("hasAuthority('responder_asistencia')")
    public ResponseEntity<AsistenciaResponse> findMiAsistencia(@PathVariable Long convocatoriaId) {
        return ResponseEntity.ok(asistenciaService.findByConvocatoriaAndUsuario(convocatoriaId));
    }

    @PostMapping("/api/convocatorias/{convocatoriaId}/asistencias")
    @PreAuthorize("hasAnyAuthority('responder_asistencia', 'invitar_externos', 'crear_convocatoria')")
    public ResponseEntity<AsistenciaResponse> create(@PathVariable Long convocatoriaId, @Valid @RequestBody AsistenciaRequest request) {
        request.setConvocatoriaId(convocatoriaId);
        return ResponseEntity.status(HttpStatus.CREATED).body(asistenciaService.create(request));
    }

    @GetMapping("/api/asistencias/{id}")
    @PreAuthorize("hasAuthority('ver_convocatoria')")
    public ResponseEntity<AsistenciaResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(asistenciaService.findById(id));
    }

    @PutMapping("/api/asistencias/{id}")
    @PreAuthorize("hasAnyAuthority('responder_asistencia', 'crear_convocatoria')")
    public ResponseEntity<AsistenciaResponse> update(@PathVariable Long id, @Valid @RequestBody AsistenciaUpdateRequest request) {
        return ResponseEntity.ok(asistenciaService.update(id, request));
    }

    @DeleteMapping("/api/asistencias/{id}")
    @PreAuthorize("hasAnyAuthority('responder_asistencia', 'crear_convocatoria')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        asistenciaService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/asistencias/mis-asistencias")
    @PreAuthorize("hasAuthority('responder_asistencia')")
    public ResponseEntity<List<AsistenciaResponse>> findMisAsistencias() {
        return ResponseEntity.ok(asistenciaService.findByUsuarioId(null));
    }

    @PostMapping("/api/convocatorias/{convocatoriaId}/asistencias/bulk")
    @PreAuthorize("hasAuthority('crear_convocatoria')")
    public ResponseEntity<List<AsistenciaResponse>> bulkInvite(@PathVariable Long convocatoriaId, @RequestBody List<Long> usuarioIds) {
        return ResponseEntity.ok(asistenciaService.bulkInvite(convocatoriaId, usuarioIds));
    }
}