package com.event.backend.controller;

import com.event.backend.dto.deporte.DeporteRequest;
import com.event.backend.dto.deporte.DeporteResponse;
import com.event.backend.service.DeporteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/deportes")
@RequiredArgsConstructor
public class DeporteController {

    private final DeporteService deporteService;

    @GetMapping
    public ResponseEntity<List<DeporteResponse>> findAll() {
        return ResponseEntity.ok(deporteService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DeporteResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(deporteService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('gestionar_deportes')")
    public ResponseEntity<DeporteResponse> create(@Valid @RequestBody DeporteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deporteService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('gestionar_deportes')")
    public ResponseEntity<DeporteResponse> update(@PathVariable Long id, @Valid @RequestBody DeporteRequest request) {
        return ResponseEntity.ok(deporteService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('gestionar_deportes')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        deporteService.delete(id);
        return ResponseEntity.noContent().build();
    }
}