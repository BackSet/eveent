package com.event.backend.controller;

import com.event.backend.dto.configuracion_recurrente.ConfiguracionRecurrenteRequest;
import com.event.backend.dto.configuracion_recurrente.ConfiguracionRecurrenteResponse;
import com.event.backend.service.ConfiguracionRecurrenteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/configuraciones-recurrentes")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('crear_convocatoria')")
public class ConfiguracionRecurrenteController {

    private final ConfiguracionRecurrenteService configuracionService;

    @GetMapping
    public ResponseEntity<List<ConfiguracionRecurrenteResponse>> findAll() {
        return ResponseEntity.ok(configuracionService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConfiguracionRecurrenteResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(configuracionService.findById(id));
    }

    @PostMapping
    public ResponseEntity<ConfiguracionRecurrenteResponse> create(@Valid @RequestBody ConfiguracionRecurrenteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(configuracionService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ConfiguracionRecurrenteResponse> update(@PathVariable Long id, @Valid @RequestBody ConfiguracionRecurrenteRequest request) {
        return ResponseEntity.ok(configuracionService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        configuracionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
