package com.event.backend.service;

import com.event.backend.dto.JwtResponse;
import com.event.backend.dto.LoginRequest;
import com.event.backend.dto.RegisterRequest;
import com.event.backend.model.*;
import com.event.backend.repository.UsuarioRepository;
import com.event.backend.repository.UsuarioRolRepository;
import com.event.backend.repository.RolesSistemaRepository;
import com.event.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
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
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    @Transactional
    public JwtResponse register(RegisterRequest request) {
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El email ya esta registrado");
        }

        Usuario usuario = Usuario.builder()
                .nombre(request.getNombre())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();
        usuario = usuarioRepository.save(usuario);

        RolesSistema rolJugador = rolesSistemaRepository.findByNombre("Jugador")
                .orElseGet(() -> rolesSistemaRepository.save(
                        RolesSistema.builder().nombre("Jugador").build()));

        UsuarioRolId urId = new UsuarioRolId(usuario.getId(), rolJugador.getId());
        usuarioRolRepository.save(UsuarioRol.builder()
                .id(urId)
                .usuario(usuario)
                .rol(rolJugador)
                .build());

        String token = jwtUtil.generateToken(usuario.getEmail());
        List<String> roles = List.of(rolJugador.getNombre());

        return JwtResponse.builder()
                .token(token)
                .email(usuario.getEmail())
                .nombre(usuario.getNombre())
                .roles(roles)
                .build();
    }

    public JwtResponse login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        var userDetails = (com.event.backend.security.UserDetailsImpl) auth.getPrincipal();
        String token = jwtUtil.generateToken(userDetails.getEmail());
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(r -> r.replace("ROLE_", ""))
                .toList();

        return JwtResponse.builder()
                .token(token)
                .email(userDetails.getEmail())
                .nombre(userDetails.getNombre())
                .roles(roles)
                .build();
    }
}
