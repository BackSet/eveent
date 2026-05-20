package com.event.backend.controller;

import com.event.backend.dto.convocatoria.ConvocatoriaRequest;
import com.event.backend.dto.convocatoria.ConvocatoriaResponse;
import com.event.backend.model.EstadoConvocatoria;
import com.event.backend.service.ConvocatoriaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/convocatorias")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ver_convocatoria')")
public class ConvocatoriaController {

    private final ConvocatoriaService convocatoriaService;

    @GetMapping
    public ResponseEntity<List<ConvocatoriaResponse>> findAll(
            @RequestParam(required = false) EstadoConvocatoria estado) {
        if (estado != null) {
            return ResponseEntity.ok(convocatoriaService.findByEstado(estado));
        }
        return ResponseEntity.ok(convocatoriaService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConvocatoriaResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(convocatoriaService.findById(id));
    }

    @GetMapping("/mis-convocalas")
    public ResponseEntity<List<ConvocatoriaResponse>> findMisConvocalas() {
        return ResponseEntity.ok(convocatoriaService.findByCreador(null));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('crear_convocatoria')")
    public ResponseEntity<ConvocatoriaResponse> create(@Valid @RequestBody ConvocatoriaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(convocatoriaService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('crear_convocatoria')")
    public ResponseEntity<ConvocatoriaResponse> update(@PathVariable Long id, @Valid @RequestBody ConvocatoriaRequest request) {
        return ResponseEntity.ok(convocatoriaService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('crear_convocatoria')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        convocatoriaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}