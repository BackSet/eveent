package com.event.backend.service;

import com.event.backend.dto.usuario.PasswordChangeRequest;
import com.event.backend.dto.usuario.SuspensionRequest;
import com.event.backend.dto.usuario.UsuarioProfileRequest;
import com.event.backend.dto.usuario.UsuarioResponse;
import com.event.backend.dto.usuario.UsuarioRoleRequest;
import com.event.backend.dto.usuario.UsuarioPosicionDto;
import com.event.backend.exception.BusinessException;
import com.event.backend.exception.ConflictException;
import com.event.backend.exception.NotFoundException;
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
import com.event.backend.security.SecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    private final SecurityService securityService;

    @Transactional(readOnly = true)
    public List<UsuarioResponse> findAll() {
        List<Usuario> usuarios = usuarioRepository.findAll();
        if (usuarios.isEmpty()) return List.of();

        List<Long> userIds = usuarios.stream().map(Usuario::getId).toList();

        List<UsuarioRol> allRoles = usuarioRolRepository.findAllByUsuarioIdIn(userIds);
        Map<Long, List<UsuarioRol>> rolesByUser = allRoles.stream()
                .collect(Collectors.groupingBy(ur -> ur.getId().getUsuarioId()));

        List<Long> allRolIds = allRoles.stream()
                .map(ur -> ur.getRol().getId()).distinct().toList();

        Map<Long, List<String>> permsByRol = allRolIds.isEmpty() ? Map.of() :
                rolPermisoRepository.findAllByRolIdInWithPermiso(allRolIds).stream()
                        .collect(Collectors.groupingBy(
                                rp -> rp.getId().getRolId(),
                                Collectors.mapping(rp -> rp.getPermiso().getClave(), Collectors.toList())
                        ));

        List<UsuarioPosicion> allPosiciones = usuarioPosicionRepository.findByUsuarioIdIn(userIds);
        Map<Long, List<UsuarioPosicion>> posicionesByUser = allPosiciones.stream()
                .collect(Collectors.groupingBy(up -> up.getId().getUsuarioId()));

        return usuarios.stream().map(u -> {
            List<UsuarioRol> userRoles = rolesByUser.getOrDefault(u.getId(), List.of());
            List<String> roleNames = userRoles.stream().map(ur -> ur.getRol().getNombre()).toList();
            List<String> permNames = userRoles.stream()
                    .flatMap(ur -> permsByRol.getOrDefault(ur.getRol().getId(), List.of()).stream())
                    .distinct().toList();

            List<UsuarioPosicion> userPositions = posicionesByUser.getOrDefault(u.getId(), List.of());
            List<UsuarioPosicionDto> userPosDtos = userPositions.stream()
                    .map(up -> UsuarioPosicionDto.builder()
                            .posicionId(up.getPosicion().getId())
                            .posicionNombre(up.getPosicion().getNombre())
                            .posicionAbreviatura(up.getPosicion().getAbreviatura())
                            .deporteId(up.getPosicion().getDeporte().getId())
                            .deporteNombre(up.getPosicion().getDeporte().getNombre())
                            .prioridad(up.getPrioridad())
                            .build())
                    .toList();

            return UsuarioResponse.builder()
                    .id(u.getId()).nombre(u.getNombre()).email(u.getEmail())
                    .username(u.getUsername()).numeroCamiseta(u.getNumeroCamiseta())
                    .roles(roleNames).permissions(permNames)
                    .posiciones(userPosDtos)
                    .activo(u.getActivo()).fechaCreacion(u.getFechaCreacion())
                    .fechaFinSuspension(u.getFechaFinSuspension()).motivoSuspension(u.getMotivoSuspension())
                    .build();
        }).toList();
    }

    @Transactional(readOnly = true)
    public UsuarioResponse findById(Long id) {
        return usuarioRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado con id: " + id));
    }

    @Transactional(readOnly = true)
    public UsuarioResponse getCurrentProfile() {
        return toResponse(securityService.getCurrentUser());
    }

    @CacheEvict(value = "userDetails", allEntries = true)
    public UsuarioResponse updateProfile(UsuarioProfileRequest request) {
        Usuario usuario = securityService.getCurrentUser();

        if (!usuario.getEmail().equals(request.getEmail()) &&
                usuarioRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("El email ya esta en uso por otro usuario");
        }

        usuario.setNombre(request.getNombre());
        usuario.setEmail(request.getEmail());
        usuario.setUsername(request.getUsername());
        usuario.setNumeroCamiseta(request.getNumeroCamiseta());
        usuario = usuarioRepository.save(usuario);
        return toResponse(usuario);
    }

    @CacheEvict(value = "userDetails", allEntries = true)
    public void changePassword(PasswordChangeRequest request) {
        Usuario usuario = securityService.getCurrentUser();

        if (!passwordEncoder.matches(request.getCurrentPassword(), usuario.getPasswordHash())) {
            throw new BusinessException("La contraseña actual es incorrecta");
        }

        usuario.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        usuarioRepository.save(usuario);
    }

    public UsuarioResponse changePasswordByAdmin(Long id, String newPassword) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado con id: " + id));

        usuario.setPasswordHash(passwordEncoder.encode(newPassword));
        usuario = usuarioRepository.save(usuario);
        return toResponse(usuario);
    }

    @CacheEvict(value = "userDetails", allEntries = true)
    public UsuarioResponse updateUserRoles(UsuarioRoleRequest request) {
        Usuario usuario = usuarioRepository.findById(request.getUsuarioId())
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado con id: " + request.getUsuarioId()));

        List<UsuarioRol> existingRoles = usuarioRolRepository.findByIdUsuarioId(usuario.getId());
        usuarioRolRepository.deleteAll(existingRoles);

        List<RolesSistema> roles = rolesSistemaRepository.findAllByNombreIn(request.getRoles());
        if (roles.size() != request.getRoles().size()) {
            throw new BusinessException("Uno o mas roles no encontrados");
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

    @CacheEvict(value = "userDetails", allEntries = true)
    public UsuarioResponse create(UsuarioResponse request) {
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("El email ya esta registrado");
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
            throw new BusinessException("Ningun rol valido encontrado");
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

    @CacheEvict(value = "userDetails", allEntries = true)
    public UsuarioResponse update(Long id, UsuarioResponse request) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado con id: " + id));

        if (!usuario.getEmail().equals(request.getEmail()) &&
                usuarioRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("El email ya esta en uso por otro usuario");
        }

        usuario.setNombre(request.getNombre());
        usuario.setEmail(request.getEmail());
        usuario.setUsername(request.getUsername());
        usuario.setNumeroCamiseta(request.getNumeroCamiseta());
        usuario = usuarioRepository.save(usuario);

        return toResponse(usuario);
    }

    @CacheEvict(value = "userDetails", allEntries = true)
    public void delete(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado con id: " + id));
        usuario.setActivo(false);
        usuarioRepository.save(usuario);
    }

    @CacheEvict(value = "userDetails", allEntries = true)
    public UsuarioResponse toggleActivo(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado con id: " + id));
        usuario.setActivo(!usuario.getActivo());
        return toResponse(usuarioRepository.save(usuario));
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

        List<String> permissions = rolIds.isEmpty() ? List.of() :
                rolPermisoRepository.findByIdRolIdIn(rolIds).stream()
                        .map(rp -> rp.getPermiso().getClave())
                        .distinct()
                        .toList();

        List<UsuarioPosicionDto> posiciones = usuarioPosicionRepository.findByUsuarioId(usuario.getId())
                .stream()
                .map(up -> UsuarioPosicionDto.builder()
                        .posicionId(up.getPosicion().getId())
                        .posicionNombre(up.getPosicion().getNombre())
                        .posicionAbreviatura(up.getPosicion().getAbreviatura())
                        .deporteId(up.getPosicion().getDeporte().getId())
                        .deporteNombre(up.getPosicion().getDeporte().getNombre())
                        .prioridad(up.getPrioridad())
                        .build())
                .toList();

        return UsuarioResponse.builder()
                .id(usuario.getId())
                .nombre(usuario.getNombre())
                .email(usuario.getEmail())
                .username(usuario.getUsername())
                .numeroCamiseta(usuario.getNumeroCamiseta())
                .roles(roles)
                .permissions(permissions)
                .posiciones(posiciones)
                .activo(usuario.getActivo())
                .fechaCreacion(usuario.getFechaCreacion())
                .fechaFinSuspension(usuario.getFechaFinSuspension())
                .motivoSuspension(usuario.getMotivoSuspension())
                .build();
    }

    @Transactional(readOnly = true)
    public List<UsuarioPosicionDto> getCurrentUserPosiciones() {
        Usuario usuario = securityService.getCurrentUser();
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
        Usuario usuario = securityService.getCurrentUser();
        usuarioPosicionRepository.deleteByUsuarioId(usuario.getId());

        if (positionsDto == null || positionsDto.isEmpty()) {
            return List.of();
        }

        List<UsuarioPosicion> newPositions = positionsDto.stream()
                .map(dto -> {
                    PosicionesDeporte posicion = posicionesDeporteRepository.findById(dto.getPosicionId())
                            .orElseThrow(() -> new NotFoundException("Posicion no encontrada con id: " + dto.getPosicionId()));
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

    @CacheEvict(value = "userDetails", allEntries = true)
    public UsuarioResponse suspender(Long id, SuspensionRequest request) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado con id: " + id));

        if (request.getFechaFin() == null) {
            throw new BusinessException("La fecha de finalizacion es obligatoria");
        }
        if (request.getFechaFin().isBefore(LocalDateTime.now())) {
            throw new BusinessException("La fecha de finalizacion debe ser futura");
        }

        usuario.setFechaFinSuspension(request.getFechaFin());
        usuario.setMotivoSuspension(request.getMotivo());
        usuario = usuarioRepository.save(usuario);
        return toResponse(usuario);
    }

    @CacheEvict(value = "userDetails", allEntries = true)
    public UsuarioResponse levantarSuspension(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado con id: " + id));

        usuario.setFechaFinSuspension(null);
        usuario.setMotivoSuspension(null);
        usuario = usuarioRepository.save(usuario);
        return toResponse(usuario);
    }
}
