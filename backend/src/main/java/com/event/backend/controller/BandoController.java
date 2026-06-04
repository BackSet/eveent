package com.event.backend.controller;

import com.event.backend.dto.bando.BandoRequest;
import com.event.backend.dto.bando.BandoResponse;
import com.event.backend.service.BandoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class BandoController {

    private final BandoService bandoService;

    @GetMapping("/api/convocatorias/{convocatoriaId}/bandos")
    @PreAuthorize("hasAuthority('ver_convocatorias')")
    public ResponseEntity<List<BandoResponse>> findByConvocatoria(@PathVariable Long convocatoriaId) {
        return ResponseEntity.ok(bandoService.findByConvocatoriaId(convocatoriaId));
    }

    @PostMapping("/api/convocatorias/{convocatoriaId}/bandos")
    @PreAuthorize("hasAnyAuthority('dividir_bandos', 'dividir_equipos')")
    public ResponseEntity<BandoResponse> create(@PathVariable Long convocatoriaId, @Valid @RequestBody BandoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bandoService.create(convocatoriaId, request));
    }

    @GetMapping("/api/bandos/{id}")
    @PreAuthorize("hasAuthority('ver_convocatorias')")
    public ResponseEntity<BandoResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(bandoService.findById(id));
    }

    @PutMapping("/api/bandos/{id}")
    @PreAuthorize("hasAnyAuthority('dividir_bandos', 'dividir_equipos')")
    public ResponseEntity<BandoResponse> update(@PathVariable Long id, @Valid @RequestBody BandoRequest request) {
        return ResponseEntity.ok(bandoService.update(id, request));
    }

    @DeleteMapping("/api/bandos/{id}")
    @PreAuthorize("hasAnyAuthority('dividir_bandos', 'dividir_equipos')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        bandoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
