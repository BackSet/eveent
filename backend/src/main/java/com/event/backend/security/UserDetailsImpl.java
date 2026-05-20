package com.event.backend.security;

import com.event.backend.model.RolesSistema;
import com.event.backend.model.Usuario;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@Getter
public class UserDetailsImpl implements UserDetails {

    private final Long id;
    private final String email;
    private final String password;
    private final String nombre;
    private final boolean activo;
    private final List<String> roles;
    private final List<String> permissions;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserDetailsImpl(Usuario usuario, Collection<RolesSistema> roles, Collection<String> permissions) {
        this.id = usuario.getId();
        this.email = usuario.getEmail();
        this.password = usuario.getPasswordHash();
        this.nombre = usuario.getNombre();
        this.activo = usuario.getActivo();
        this.roles = roles.stream().map(RolesSistema::getNombre).toList();
        this.permissions = List.copyOf(permissions);
        
        List<SimpleGrantedAuthority> authoritiesList = roles.stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r.getNombre().toUpperCase()))
                .collect(Collectors.toList());
                
        permissions.stream()
                .map(SimpleGrantedAuthority::new)
                .forEach(authoritiesList::add);
                
        this.authorities = authoritiesList;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return activo;
    }

    @Override
    public boolean isAccountNonLocked() {
        return activo;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return activo;
    }

    @Override
    public boolean isEnabled() {
        return activo;
    }
}
