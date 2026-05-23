package com.event.backend.service;

import com.event.backend.dto.grupo.GrupoMiembroResponse;
import com.event.backend.dto.grupo.GrupoRequest;
import com.event.backend.dto.grupo.GrupoResponse;
import com.event.backend.dto.usuario.UsuarioPosicionDto;
import com.event.backend.exception.ForbiddenException;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.Grupo;
import com.event.backend.model.Usuario;
import com.event.backend.model.UsuarioPosicion;
import com.event.backend.repository.GrupoRepository;
import com.event.backend.repository.UsuarioRepository;
import com.event.backend.repository.UsuarioPosicionRepository;
import com.event.backend.security.SecurityService;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
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
    private final SecurityService securityService;
    private final UsuarioPosicionRepository usuarioPosicionRepository;

    @Transactional(readOnly = true)
    public List<GrupoResponse> findAll() {
        if (securityService.isSuperAdmin()) {
            return grupoRepository.findAll().stream()
                    .map(this::toResponse)
                    .toList();
        }
        Long userId = securityService.getCurrentUserId();
        return grupoRepository.findByCreadoPorIdOrMiembroId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GrupoResponse findById(Long id) {
        Grupo grupo = grupoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Grupo no encontrado con id: " + id));
        
        Long currentUserId = securityService.getCurrentUserId();
        boolean isCreator = grupo.getCreadoPor().getId().equals(currentUserId);
        boolean isMember = grupo.getMiembros().stream().anyMatch(m -> m.getId().equals(currentUserId));
        
        if (!isCreator && !isMember && !securityService.isSuperAdmin()) {
            throw new ForbiddenException("No tienes permiso para ver este grupo");
        }
        return toResponse(grupo);
    }

    public GrupoResponse create(GrupoRequest request) {
        Usuario creador = securityService.getCurrentUser();
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
                .orElseThrow(() -> new NotFoundException("Grupo no encontrado con id: " + id));

        if (!securityService.isOwnerOrAdmin(grupo.getCreadoPor().getId())) {
            throw new ForbiddenException("No tienes permiso para editar este grupo");
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
                .orElseThrow(() -> new NotFoundException("Grupo no encontrado con id: " + id));

        if (!securityService.isOwnerOrAdmin(grupo.getCreadoPor().getId())) {
            throw new ForbiddenException("No tienes permiso para eliminar este grupo");
        }

        grupoRepository.delete(grupo);
    }

    private GrupoResponse toResponse(Grupo grupo) {
        List<Long> miembroIds = grupo.getMiembros().stream().map(Usuario::getId).toList();
        List<String> miembroNombres = grupo.getMiembros().stream().map(Usuario::getNombre).toList();

        List<UsuarioPosicion> posiciones = miembroIds.isEmpty() ? List.of() :
                usuarioPosicionRepository.findByUsuarioIdIn(miembroIds);
        Map<Long, List<UsuarioPosicion>> posicionesByUser = posiciones.stream()
                .collect(Collectors.groupingBy(up -> up.getId().getUsuarioId()));

        List<GrupoMiembroResponse> miembrosDetalle = grupo.getMiembros().stream()
                .map(u -> {
                    List<UsuarioPosicionDto> userPosDtos = posicionesByUser.getOrDefault(u.getId(), List.of()).stream()
                            .map(up -> UsuarioPosicionDto.builder()
                                    .posicionId(up.getPosicion().getId())
                                    .posicionNombre(up.getPosicion().getNombre())
                                    .posicionAbreviatura(up.getPosicion().getAbreviatura())
                                    .deporteId(up.getPosicion().getDeporte().getId())
                                    .deporteNombre(up.getPosicion().getDeporte().getNombre())
                                    .prioridad(up.getPrioridad())
                                    .build())
                            .toList();

                    return GrupoMiembroResponse.builder()
                            .id(u.getId())
                            .nombre(u.getNombre())
                            .email(u.getEmail())
                            .numeroCamiseta(u.getNumeroCamiseta())
                            .posiciones(userPosDtos)
                            .fechaFinSuspension(u.getFechaFinSuspension())
                            .motivoSuspension(u.getMotivoSuspension())
                            .build();
                })
                .toList();

        return GrupoResponse.builder()
                .id(grupo.getId())
                .nombre(grupo.getNombre())
                .descripcion(grupo.getDescripcion())
                .creadoPorId(grupo.getCreadoPor().getId())
                .creadoPorNombre(grupo.getCreadoPor().getNombre())
                .fechaCreacion(grupo.getFechaCreacion())
                .miembroIds(miembroIds)
                .miembroNombres(miembroNombres)
                .miembros(miembrosDetalle)
                .build();
    }
}
