package com.event.backend.security;

import com.event.backend.model.Usuario;
import com.event.backend.model.UsuarioRol;
import com.event.backend.model.RolesSistema;
import com.event.backend.repository.UsuarioRepository;
import com.event.backend.repository.UsuarioRolRepository;
import com.event.backend.repository.RolPermisoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;
    private final UsuarioRolRepository usuarioRolRepository;
    private final RolPermisoRepository rolPermisoRepository;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "userDetails", key = "#email")
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));

        List<UsuarioRol> usuarioRoles = usuarioRolRepository.findByIdUsuarioId(usuario.getId());
        var roles = usuarioRoles.stream()
                .map(UsuarioRol::getRol)
                .toList();

        List<Long> rolIds = roles.stream()
                .map(RolesSistema::getId)
                .toList();

        List<String> permissions = rolPermisoRepository.findByIdRolIdIn(rolIds).stream()
                .map(rp -> rp.getPermiso().getClave())
                .distinct()
                .toList();

        return new UserDetailsImpl(usuario, roles, permissions);
    }
}
