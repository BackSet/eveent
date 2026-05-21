package com.event.backend.controller;

import com.event.backend.dto.recurrencia.ConvocatoriaRecurrenteRequest;
import com.event.backend.dto.recurrencia.ConvocatoriaRecurrenteResponse;
import com.event.backend.service.ConvocatoriaRecurrenteService;
import com.event.backend.config.RecurrenciaScheduler;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/convocatorias/recurrentes")
@RequiredArgsConstructor
public class ConvocatoriaRecurrenteController {

    private final ConvocatoriaRecurrenteService recurrenciaService;
    private final RecurrenciaScheduler recurrenciaScheduler;

    @GetMapping
    @PreAuthorize("hasAuthority('ver_convocatoria')")
    public ResponseEntity<List<ConvocatoriaRecurrenteResponse>> findAll() {
        return ResponseEntity.ok(recurrenciaService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ver_convocatoria')")
    public ResponseEntity<ConvocatoriaRecurrenteResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(recurrenciaService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('crear_convocatoria')")
    public ResponseEntity<ConvocatoriaRecurrenteResponse> create(@Valid @RequestBody ConvocatoriaRecurrenteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recurrenciaService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('crear_convocatoria')")
    public ResponseEntity<ConvocatoriaRecurrenteResponse> update(@PathVariable Long id, @Valid @RequestBody ConvocatoriaRecurrenteRequest request) {
        return ResponseEntity.ok(recurrenciaService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('crear_convocatoria')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        recurrenciaService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/generar")
    @PreAuthorize("hasAuthority('crear_convocatoria')")
    public ResponseEntity<Map<String, String>> forceGeneration() {
        recurrenciaScheduler.generarInstanciasProximas();
        recurrenciaScheduler.cerrarConvocatoriasVencidas();
        return ResponseEntity.ok(Map.of("message", "OK"));
    }
}
