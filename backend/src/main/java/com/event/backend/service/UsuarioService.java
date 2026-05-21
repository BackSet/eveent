package com.event.backend.service;

import com.event.backend.dto.usuario.PasswordChangeRequest;
import com.event.backend.dto.usuario.UsuarioProfileRequest;
import com.event.backend.dto.usuario.UsuarioResponse;
import com.event.backend.dto.usuario.UsuarioRoleRequest;
import com.event.backend.dto.usuario.UsuarioPosicionDto;
import com.event.backend.model.RolesSistema;
import com.event.backend.model.Usuario;
import com.event.backend.model.UsuarioRol;
import com.event.backend.model.UsuarioRolId;
import com.event.backend.model.UsuarioPosicion;
import com.event.backend.model.UsuarioPosicionId;
import com.event.backend.model.PosicionesDeporte;
import com.event.backend.repository.RolesSistemaRepository;
import com.event.backend.repository.UsuarioRepository;
import com.event.backend.repository.UsuarioRolRepository;
import com.event.backend.repository.RolPermisoRepository;
import com.event.backend.repository.UsuarioPosicionRepository;
import com.event.backend.repository.PosicionesDeporteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final UsuarioRolRepository usuarioRolRepository;
    private final RolesSistemaRepository rolesSistemaRepository;
    private final RolPermisoRepository rolPermisoRepository;
    private final PasswordEncoder passwordEncoder;
    private final UsuarioPosicionRepository usuarioPosicionRepository;
    private final PosicionesDeporteRepository posicionesDeporteRepository;

    @Transactional(readOnly = true)
    public List<UsuarioResponse> findAll() {
        return usuarioRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UsuarioResponse findById(Long id) {
        return usuarioRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con id: " + id));
    }

    @Transactional(readOnly = true)
    public UsuarioResponse getCurrentProfile() {
        Usuario usuario = getCurrentUser();
        return toResponse(usuario);
    }

    public UsuarioResponse updateProfile(UsuarioProfileRequest request) {
        Usuario usuario = getCurrentUser();

        if (!usuario.getEmail().equals(request.getEmail()) &&
                usuarioRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El email ya esta en uso por otro usuario");
        }

        usuario.setNombre(request.getNombre());
        usuario.setEmail(request.getEmail());
        usuario.setUsername(request.getUsername());
        usuario.setNumeroCamiseta(request.getNumeroCamiseta());
        usuario = usuarioRepository.save(usuario);
        return toResponse(usuario);
    }

    public void changePassword(PasswordChangeRequest request) {
        Usuario usuario = getCurrentUser();

        if (!passwordEncoder.matches(request.getCurrentPassword(), usuario.getPasswordHash())) {
            throw new RuntimeException("La contraseña actual es incorrecta");
        }

        usuario.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        usuarioRepository.save(usuario);
    }

    public UsuarioResponse changePasswordByAdmin(Long id, String newPassword) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con id: " + id));

        usuario.setPasswordHash(passwordEncoder.encode(newPassword));
        usuario = usuarioRepository.save(usuario);
        return toResponse(usuario);
    }

    public UsuarioResponse updateUserRoles(UsuarioRoleRequest request) {
        Usuario usuario = usuarioRepository.findById(request.getUsuarioId())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con id: " + request.getUsuarioId()));

        List<UsuarioRol> existingRoles = usuarioRolRepository.findByIdUsuarioId(usuario.getId());
        usuarioRolRepository.deleteAll(existingRoles);

        List<RolesSistema> roles = rolesSistemaRepository.findAllByNombreIn(request.getRoles());
        if (roles.size() != request.getRoles().size()) {
            throw new RuntimeException("Uno o mas roles no encontrados");
        }

        List<UsuarioRol> newRoles = roles.stream()
                .map(rol -> UsuarioRol.builder()
                        .id(new UsuarioRolId(usuario.getId(), rol.getId()))
                        .usuario(usuario)
                        .rol(rol)
                        .build())
                .toList();

        usuarioRolRepository.saveAll(newRoles);

        return toResponse(usuario);
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponse> findAllActivos() {
        return usuarioRepository.findByActivoTrue().stream()
                .map(this::toResponse)
                .toList();
    }

    public UsuarioResponse create(UsuarioResponse request) {
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El email ya esta registrado");
        }

        Usuario usuario = usuarioRepository.save(Usuario.builder()
                .nombre(request.getNombre())
                .email(request.getEmail())
                .username(request.getUsername())
                .numeroCamiseta(request.getNumeroCamiseta())
                .passwordHash(passwordEncoder.encode("Temporal123!"))
                .activo(true)
                .build());

        List<String> rolesToAssign = request.getRoles() != null && !request.getRoles().isEmpty()
                ? request.getRoles()
                : List.of("Jugador");

        List<RolesSistema> roles = rolesSistemaRepository.findAllByNombreIn(rolesToAssign);
        if (roles.isEmpty()) {
            throw new RuntimeException("Ningun rol valido encontrado");
        }

        List<UsuarioRol> newRoles = roles.stream()
                .map(rol -> UsuarioRol.builder()
                        .id(new UsuarioRolId(usuario.getId(), rol.getId()))
                        .usuario(usuario)
                        .rol(rol)
                        .build())
                .toList();

        usuarioRolRepository.saveAll(newRoles);

        return toResponse(usuario);
    }

    public UsuarioResponse update(Long id, UsuarioResponse request) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con id: " + id));

        if (!usuario.getEmail().equals(request.getEmail()) &&
                usuarioRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El email ya esta en uso por otro usuario");
        }

        usuario.setNombre(request.getNombre());
        usuario.setEmail(request.getEmail());
        usuario.setUsername(request.getUsername());
        usuario.setNumeroCamiseta(request.getNumeroCamiseta());
        usuario = usuarioRepository.save(usuario);

        return toResponse(usuario);
    }

    public void delete(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con id: " + id));
        usuario.setActivo(false);
        usuarioRepository.save(usuario);
    }

    public UsuarioResponse toggleActivo(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con id: " + id));
        usuario.setActivo(!usuario.getActivo());
        return toResponse(usuarioRepository.save(usuario));
    }

    private Usuario getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private UsuarioResponse toResponse(Usuario usuario) {
        List<UsuarioRol> usuarioRoles = usuarioRolRepository.findByIdUsuarioId(usuario.getId());

        List<String> roles = usuarioRoles.stream()
                .map(ur -> ur.getRol().getNombre())
                .toList();

        List<Long> rolIds = usuarioRoles.stream()
                .map(ur -> ur.getRol().getId())
                .distinct()
                .toList();

        List<String> permissions = rolPermisoRepository.findByIdRolIdIn(rolIds).stream()
                .map(rp -> rp.getPermiso().getClave())
                .distinct()
                .toList();

        return UsuarioResponse.builder()
                .id(usuario.getId())
                .nombre(usuario.getNombre())
                .email(usuario.getEmail())
                .username(usuario.getUsername())
                .numeroCamiseta(usuario.getNumeroCamiseta())
                .roles(roles)
                .permissions(permissions)
                .activo(usuario.getActivo())
                .fechaCreacion(usuario.getFechaCreacion())
                .build();
    }

    @Transactional(readOnly = true)
    public List<UsuarioPosicionDto> getCurrentUserPosiciones() {
        Usuario usuario = getCurrentUser();
        List<UsuarioPosicion> list = usuarioPosicionRepository.findByUsuarioId(usuario.getId());
        return list.stream()
                .map(up -> UsuarioPosicionDto.builder()
                        .posicionId(up.getPosicion().getId())
                        .posicionNombre(up.getPosicion().getNombre())
                        .deporteId(up.getPosicion().getDeporte().getId())
                        .deporteNombre(up.getPosicion().getDeporte().getNombre())
                        .prioridad(up.getPrioridad())
                        .build())
                .toList();
    }

    public List<UsuarioPosicionDto> updateCurrentUserPosiciones(List<UsuarioPosicionDto> positionsDto) {
        Usuario usuario = getCurrentUser();
        usuarioPosicionRepository.deleteByUsuarioId(usuario.getId());
        
        if (positionsDto == null || positionsDto.isEmpty()) {
            return List.of();
        }

        List<UsuarioPosicion> newPositions = positionsDto.stream()
                .map(dto -> {
                    PosicionesDeporte posicion = posicionesDeporteRepository.findById(dto.getPosicionId())
                            .orElseThrow(() -> new RuntimeException("Posicion no encontrada con id: " + dto.getPosicionId()));
                    return UsuarioPosicion.builder()
                            .id(new UsuarioPosicionId(usuario.getId(), posicion.getId()))
                            .usuario(usuario)
                            .posicion(posicion)
                            .prioridad(dto.getPrioridad())
                            .build();
                })
                .toList();

        usuarioPosicionRepository.saveAll(newPositions);

        return getCurrentUserPosiciones();
    }
}