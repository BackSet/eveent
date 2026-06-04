package com.event.backend.service;

import com.event.backend.dto.JwtResponse;
import com.event.backend.dto.LoginRequest;
import com.event.backend.dto.RegisterRequest;
import com.event.backend.model.*;
import com.event.backend.repository.UsuarioRepository;
import com.event.backend.repository.UsuarioRolRepository;
import com.event.backend.repository.RolesSistemaRepository;
import com.event.backend.repository.RolPermisoRepository;
import com.event.backend.repository.UsuarioPosicionRepository;
import com.event.backend.repository.PosicionesDeporteRepository;
import com.event.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final RolesSistemaRepository rolesSistemaRepository;
    private final UsuarioRolRepository usuarioRolRepository;
    private final RolPermisoRepository rolPermisoRepository;
    private final UsuarioPosicionRepository usuarioPosicionRepository;
    private final PosicionesDeporteRepository posicionesDeporteRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    @Transactional
    public JwtResponse register(RegisterRequest request) {
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El email ya esta registrado");
        }
        if (usuarioRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("El nombre de usuario ya esta registrado");
        }

        Usuario usuario = Usuario.builder()
                .nombre(request.getNombre())
                .email(request.getEmail())
                .username(request.getUsername())
                .numeroCamiseta(request.getNumeroCamiseta())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .activo(true)
                .build();
        usuario = usuarioRepository.save(usuario);

        final Usuario savedUsuario = usuario;
        if (request.getPosicionIds() != null && !request.getPosicionIds().isEmpty()) {
            java.util.Map<Long, Integer> deportePriorityMap = new java.util.HashMap<>();
            List<UsuarioPosicion> userPositions = request.getPosicionIds().stream()
                    .map(posId -> {
                        PosicionesDeporte posicion = posicionesDeporteRepository.findById(posId)
                                .orElseThrow(() -> new RuntimeException("Posicion no encontrada con id: " + posId));
                        
                        Long sportId = posicion.getDeporte().getId();
                        int currentPriority = deportePriorityMap.getOrDefault(sportId, 1);
                        deportePriorityMap.put(sportId, currentPriority + 1);

                        return UsuarioPosicion.builder()
                                .id(new UsuarioPosicionId(savedUsuario.getId(), posicion.getId()))
                                .usuario(savedUsuario)
                                .posicion(posicion)
                                .prioridad(currentPriority)
                                .build();
                    })
                    .toList();
            usuarioPosicionRepository.saveAll(userPositions);
        }

        String rolNombre = request.isRegisterAsOrganizador() ? "Organizador" : "Jugador";
        RolesSistema rol = rolesSistemaRepository.findByNombre(rolNombre)
                .orElseGet(() -> rolesSistemaRepository.save(
                        RolesSistema.builder().nombre(rolNombre).build()));

        UsuarioRolId urId = new UsuarioRolId(usuario.getId(), rol.getId());
        usuarioRolRepository.save(UsuarioRol.builder()
                .id(urId)
                .usuario(usuario)
                .rol(rol)
                .build());

        String token = jwtUtil.generateToken(usuario.getEmail());
        List<String> roles = List.of(rol.getNombre());
        List<String> permissions = rolPermisoRepository.findByIdRolId(rol.getId()).stream()
                .map(rp -> rp.getPermiso().getClave())
                .toList();

        return JwtResponse.builder()
                .token(token)
                .id(usuario.getId())
                .email(usuario.getEmail())
                .nombre(usuario.getNombre())
                .roles(roles)
                .permissions(permissions)
                .build();
    }

    public JwtResponse login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        var userDetails = (com.event.backend.security.UserDetailsImpl) auth.getPrincipal();
        String token = jwtUtil.generateToken(userDetails.getEmail());
        List<String> roles = userDetails.getRoles();
        List<String> permissions = userDetails.getPermissions();

        return JwtResponse.builder()
                .token(token)
                .id(userDetails.getId())
                .email(userDetails.getEmail())
                .nombre(userDetails.getNombre())
                .roles(roles)
                .permissions(permissions)
                .build();
    }
}
