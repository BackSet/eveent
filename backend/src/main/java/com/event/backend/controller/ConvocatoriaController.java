package com.event.backend.controller;

import com.event.backend.dto.convocatoria.ConvocatoriaRequest;
import com.event.backend.dto.convocatoria.ConvocatoriaResponse;
import com.event.backend.model.EstadoConvocatoria;
import com.event.backend.security.SecurityService;
import com.event.backend.service.ConvocatoriaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/convocatorias")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ver_convocatorias')")
public class ConvocatoriaController {

    private final ConvocatoriaService convocatoriaService;
    private final SecurityService securityService;

    @GetMapping
    public ResponseEntity<List<ConvocatoriaResponse>> findAll(
            @RequestParam(required = false) EstadoConvocatoria estado) {
        boolean isOrganizer = SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> {
                    String auth = a.getAuthority();
                    return auth.equals("crear_convocatorias")
                            || auth.equals("editar_convocatorias")
                            || auth.equals("cancelar_convocatorias")
                            || auth.equals("eliminar_convocatorias");
                });
        if (estado != null) {
            return ResponseEntity.ok(convocatoriaService.findByEstado(estado));
        }
        if (!isOrganizer) {
            return ResponseEntity.ok(convocatoriaService.findAllVisible());
        }
        return ResponseEntity.ok(convocatoriaService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConvocatoriaResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(convocatoriaService.findById(id));
    }

    @GetMapping("/mis-convocatorias")
    public ResponseEntity<List<ConvocatoriaResponse>> findMisConvocatorias() {
        Long userId = securityService.getCurrentUserId();
        return ResponseEntity.ok(convocatoriaService.findByCreador(userId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('crear_convocatorias')")
    public ResponseEntity<ConvocatoriaResponse> create(@Valid @RequestBody ConvocatoriaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(convocatoriaService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('editar_convocatorias') or hasAuthority('crear_convocatorias')")
    public ResponseEntity<ConvocatoriaResponse> update(@PathVariable Long id, @Valid @RequestBody ConvocatoriaRequest request) {
        return ResponseEntity.ok(convocatoriaService.update(id, request));
    }

    @PutMapping("/{id}/abrir")
    @PreAuthorize("hasAuthority('editar_convocatorias') or hasAuthority('crear_convocatorias')")
    public ResponseEntity<ConvocatoriaResponse> abrir(@PathVariable Long id) {
        return ResponseEntity.ok(convocatoriaService.abrir(id));
    }

    @PutMapping("/{id}/cancelar")
    @PreAuthorize("hasAuthority('cancelar_convocatorias') or hasAuthority('editar_convocatorias') or hasAuthority('crear_convocatorias')")
    public ResponseEntity<ConvocatoriaResponse> cancelar(@PathVariable Long id) {
        return ResponseEntity.ok(convocatoriaService.cancelar(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('eliminar_convocatorias') or hasAuthority('editar_convocatorias') or hasAuthority('crear_convocatorias')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        convocatoriaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}