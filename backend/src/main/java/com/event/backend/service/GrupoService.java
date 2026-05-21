package com.event.backend.service;

import com.event.backend.dto.grupo.GrupoRequest;
import com.event.backend.dto.grupo.GrupoResponse;
import com.event.backend.model.Grupo;
import com.event.backend.model.Usuario;
import com.event.backend.repository.GrupoRepository;
import com.event.backend.repository.UsuarioRepository;
import com.event.backend.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class GrupoService {

    private final GrupoRepository grupoRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public List<GrupoResponse> findAll() {
        return grupoRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GrupoResponse findById(Long id) {
        return grupoRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Grupo no encontrado con id: " + id));
    }

    public GrupoResponse create(GrupoRequest request) {
        Usuario creador = getCurrentUser();
        List<Usuario> miembros = new ArrayList<>();
        if (request.getMiembroIds() != null && !request.getMiembroIds().isEmpty()) {
            miembros = usuarioRepository.findAllById(request.getMiembroIds());
        }

        Grupo grupo = Grupo.builder()
                .nombre(request.getNombre())
                .descripcion(request.getDescripcion())
                .creadoPor(creador)
                .miembros(miembros)
                .build();

        grupo = grupoRepository.save(grupo);
        return toResponse(grupo);
    }

    public GrupoResponse update(Long id, GrupoRequest request) {
        Grupo grupo = grupoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Grupo no encontrado con id: " + id));

        Usuario currentUser = getCurrentUser();
        boolean isAdmin = currentUser.getEmail().equals("admin@event.com");
        if (!grupo.getCreadoPor().getId().equals(currentUser.getId()) && !isAdmin) {
            throw new RuntimeException("No tienes permiso para editar este grupo");
        }

        if (request.getNombre() != null) grupo.setNombre(request.getNombre());
        if (request.getDescripcion() != null) grupo.setDescripcion(request.getDescripcion());

        if (request.getMiembroIds() != null) {
            List<Usuario> miembros = usuarioRepository.findAllById(request.getMiembroIds());
            grupo.getMiembros().clear();
            grupo.getMiembros().addAll(miembros);
        }

        grupo = grupoRepository.save(grupo);
        return toResponse(grupo);
    }

    public void delete(Long id) {
        Grupo grupo = grupoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Grupo no encontrado con id: " + id));

        Usuario currentUser = getCurrentUser();
        boolean isAdmin = currentUser.getEmail().equals("admin@event.com");
        if (!grupo.getCreadoPor().getId().equals(currentUser.getId()) && !isAdmin) {
            throw new RuntimeException("No tienes permiso para eliminar este grupo");
        }

        grupoRepository.delete(grupo);
    }

    private Usuario getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return usuarioRepository.findById(userDetails.getId())
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        }
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private GrupoResponse toResponse(Grupo grupo) {
        List<Long> miembroIds = grupo.getMiembros().stream().map(Usuario::getId).toList();
        List<String> miembroNombres = grupo.getMiembros().stream().map(Usuario::getNombre).toList();

        return GrupoResponse.builder()
                .id(grupo.getId())
                .nombre(grupo.getNombre())
                .descripcion(grupo.getDescripcion())
                .creadoPorId(grupo.getCreadoPor().getId())
                .creadoPorNombre(grupo.getCreadoPor().getNombre())
                .fechaCreacion(grupo.getFechaCreacion())
                .miembroIds(miembroIds)
                .miembroNombres(miembroNombres)
                .build();
    }
}
