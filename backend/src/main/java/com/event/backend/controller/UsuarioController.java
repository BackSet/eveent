package com.event.backend.controller;

import com.event.backend.dto.usuario.PasswordChangeRequest;
import com.event.backend.dto.usuario.UsuarioProfileRequest;
import com.event.backend.dto.usuario.UsuarioResponse;
import com.event.backend.dto.usuario.UsuarioRoleRequest;
import com.event.backend.dto.usuario.UsuarioPosicionDto;
import com.event.backend.model.RolesSistema;
import com.event.backend.repository.RolesSistemaRepository;
import com.event.backend.service.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;
    private final RolesSistemaRepository rolesSistemaRepository;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('gestionar_usuarios', 'crear_convocatoria')")
    public ResponseEntity<List<UsuarioResponse>> findAll() {
        return ResponseEntity.ok(usuarioService.findAll());
    }

    @GetMapping("/roles")
    @PreAuthorize("hasAuthority('gestionar_roles')")
    public ResponseEntity<List<RolesSistema>> findAllRoles() {
        return ResponseEntity.ok(rolesSistemaRepository.findAll());
    }

    @GetMapping("/me")
    public ResponseEntity<UsuarioResponse> getCurrentProfile() {
        return ResponseEntity.ok(usuarioService.getCurrentProfile());
    }

    @PutMapping("/me")
    public ResponseEntity<UsuarioResponse> updateProfile(@Valid @RequestBody UsuarioProfileRequest request) {
        return ResponseEntity.ok(usuarioService.updateProfile(request));
    }

    @PostMapping("/me/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody PasswordChangeRequest request) {
        usuarioService.changePassword(request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/posiciones")
    public ResponseEntity<List<UsuarioPosicionDto>> getCurrentUserPosiciones() {
        return ResponseEntity.ok(usuarioService.getCurrentUserPosiciones());
    }

    @PutMapping("/me/posiciones")
    public ResponseEntity<List<UsuarioPosicionDto>> updateCurrentUserPosiciones(@RequestBody List<UsuarioPosicionDto> positionsDto) {
        return ResponseEntity.ok(usuarioService.updateCurrentUserPosiciones(positionsDto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('gestionar_usuarios')")
    public ResponseEntity<UsuarioResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.findById(id));
    }

    @PutMapping("/roles")
    @PreAuthorize("hasAuthority('gestionar_roles')")
    public ResponseEntity<UsuarioResponse> updateUserRoles(@Valid @RequestBody UsuarioRoleRequest request) {
        return ResponseEntity.ok(usuarioService.updateUserRoles(request));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('gestionar_usuarios')")
    public ResponseEntity<UsuarioResponse> create(@Valid @RequestBody UsuarioResponse request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarioService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('gestionar_usuarios')")
    public ResponseEntity<UsuarioResponse> update(@PathVariable Long id, @Valid @RequestBody UsuarioResponse request) {
        return ResponseEntity.ok(usuarioService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('gestionar_usuarios')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        usuarioService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle-activo")
    @PreAuthorize("hasAuthority('gestionar_usuarios')")
    public ResponseEntity<UsuarioResponse> toggleActivo(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.toggleActivo(id));
    }
}