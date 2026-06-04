package com.event.backend.security;

import com.event.backend.exception.ForbiddenException;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.Usuario;
import com.event.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SecurityService {

    private final UsuarioRepository usuarioRepository;

    public Usuario getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return usuarioRepository.findById(userDetails.getId())
                    .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        }
        if (auth != null && auth.getName() != null) {
            return usuarioRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        }
        throw new ForbiddenException("Usuario no autenticado");
    }

    public Long getCurrentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userDetails.getId();
        }
        throw new ForbiddenException("Usuario no autenticado");
    }

    public boolean isSuperAdmin() {
        return hasAuthority("ROLE_SUPERADMIN");
    }

    public boolean hasAuthority(String authority) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(authority));
    }

    public boolean hasAnyAuthority(String... authorities) {
        for (String authority : authorities) {
            if (hasAuthority(authority)) {
                return true;
            }
        }
        return false;
    }

}
