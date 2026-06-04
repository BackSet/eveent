package com.event.backend.controller;

import com.event.backend.dto.posicion.PosicionRequest;
import com.event.backend.dto.posicion.PosicionResponse;
import com.event.backend.service.PosicionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PosicionController {

    private final PosicionService posicionService;

    @GetMapping("/api/deportes/{deporteId}/posiciones")
    public ResponseEntity<List<PosicionResponse>> findByDeporte(@PathVariable Long deporteId) {
        return ResponseEntity.ok(posicionService.findByDeporteId(deporteId));
    }

    @PostMapping("/api/deportes/{deporteId}/posiciones")
    @PreAuthorize("hasAuthority('gestionar_deportes')")
    public ResponseEntity<PosicionResponse> create(@PathVariable Long deporteId, @Valid @RequestBody PosicionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(posicionService.create(deporteId, request));
    }

    @GetMapping("/api/posiciones/{id}")
    public ResponseEntity<PosicionResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(posicionService.findById(id));
    }

    @PutMapping("/api/posiciones/{id}")
    @PreAuthorize("hasAuthority('gestionar_deportes')")
    public ResponseEntity<PosicionResponse> update(@PathVariable Long id, @Valid @RequestBody PosicionRequest request) {
        return ResponseEntity.ok(posicionService.update(id, request));
    }

    @DeleteMapping("/api/posiciones/{id}")
    @PreAuthorize("hasAuthority('gestionar_deportes')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        posicionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}