package com.event.backend.service;

import com.event.backend.dto.usuario.PasswordChangeRequest;
import com.event.backend.dto.usuario.UsuarioProfileRequest;
import com.event.backend.dto.usuario.UsuarioResponse;
import com.event.backend.dto.usuario.UsuarioRoleRequest;
import com.event.backend.model.RolesSistema;
import com.event.backend.model.Usuario;
import com.event.backend.model.UsuarioRol;
import com.event.backend.model.UsuarioRolId;
import com.event.backend.repository.RolesSistemaRepository;
import com.event.backend.repository.UsuarioRepository;
import com.event.backend.repository.UsuarioRolRepository;
import com.event.backend.repository.RolPermisoRepository;
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

        for (String rolNombre : request.getRoles()) {
            RolesSistema rol = rolesSistemaRepository.findByNombre(rolNombre)
                    .orElseThrow(() -> new RuntimeException("Rol no encontrado: " + rolNombre));

            usuarioRolRepository.save(UsuarioRol.builder()
                    .id(new UsuarioRolId(usuario.getId(), rol.getId()))
                    .usuario(usuario)
                    .rol(rol)
                    .build());
        }

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
                .passwordHash(passwordEncoder.encode("Temporal123!"))
                .activo(true)
                .build());

        RolesSistema rolJugador = rolesSistemaRepository.findByNombre("Jugador")
                .orElseThrow(() -> new RuntimeException("Rol Jugador no encontrado"));

        usuarioRolRepository.save(UsuarioRol.builder()
                .id(new UsuarioRolId(usuario.getId(), rolJugador.getId()))
                .usuario(usuario)
                .rol(rolJugador)
                .build());

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
        List<String> roles = usuarioRolRepository.findByIdUsuarioId(usuario.getId()).stream()
                .map(ur -> ur.getRol().getNombre())
                .toList();

        List<String> permissions = usuarioRolRepository.findByIdUsuarioId(usuario.getId()).stream()
                .flatMap(ur -> rolPermisoRepository.findByIdRolId(ur.getRol().getId()).stream()
                        .map(rp -> rp.getPermiso().getClave()))
                .distinct()
                .toList();

        return UsuarioResponse.builder()
                .id(usuario.getId())
                .nombre(usuario.getNombre())
                .email(usuario.getEmail())
                .roles(roles)
                .permissions(permissions)
                .activo(usuario.getActivo())
                .fechaCreacion(usuario.getFechaCreacion())
                .build();
    }
}