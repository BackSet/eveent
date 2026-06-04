package com.event.backend.service;

import com.event.backend.dto.grupo.GrupoMiembroResponse;
import com.event.backend.dto.grupo.GrupoRequest;
import com.event.backend.dto.grupo.GrupoResponse;
import com.event.backend.dto.usuario.UsuarioPosicionDto;
import com.event.backend.exception.ForbiddenException;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.Grupo;
import com.event.backend.model.GrupoJugador;
import com.event.backend.model.GrupoJugadorId;
import com.event.backend.model.RolGrupo;
import com.event.backend.model.Usuario;
import com.event.backend.model.UsuarioPosicion;
import com.event.backend.repository.ConvocatoriaRepository;
import com.event.backend.repository.GrupoRepository;
import com.event.backend.repository.GrupoJugadorRepository;
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
    private final ConvocatoriaRepository convocatoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final SecurityService securityService;
    private final UsuarioPosicionRepository usuarioPosicionRepository;
    private final GrupoJugadorRepository grupoJugadorRepository;

    @Transactional(readOnly = true)
    public List<GrupoResponse> findAll() {
        if (canManageAnyGroup()) {
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
        
        if (!isCreator && !isMember && !canManageAnyGroup()) {
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
        ensureCreatorMembership(grupo, creador);
        return toResponse(grupo);
    }

    public GrupoResponse update(Long id, GrupoRequest request) {
        Grupo grupo = grupoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Grupo no encontrado con id: " + id));

        if (!canEditGroup(grupo)) {
            throw new ForbiddenException("No tienes permiso para editar este grupo");
        }

        if (request.getNombre() != null) grupo.setNombre(request.getNombre());
        if (request.getDescripcion() != null) grupo.setDescripcion(request.getDescripcion());

        if (request.getMiembroIds() != null) {
            List<Usuario> miembros = usuarioRepository.findAllById(request.getMiembroIds());
            Long creadorId = grupo.getCreadoPor().getId();
            if (miembros.stream().noneMatch(u -> u.getId().equals(creadorId))) {
                miembros.add(grupo.getCreadoPor());
            }
            grupo.getMiembros().clear();
            grupo.getMiembros().addAll(miembros);
        }

        grupo = grupoRepository.save(grupo);
        ensureCreatorMembership(grupo, grupo.getCreadoPor());
        return toResponse(grupo);
    }

    @Transactional(readOnly = true)
    public List<GrupoMiembroResponse> findJugadores(Long grupoId) {
        Grupo grupo = loadAndAssertCanView(grupoId);
        return toMiembrosDetalle(grupo);
    }

    public GrupoResponse addJugador(Long grupoId, Long usuarioId) {
        Grupo grupo = grupoRepository.findById(grupoId)
                .orElseThrow(() -> new NotFoundException("Grupo no encontrado con id: " + grupoId));
        assertCanManageMembers(grupo);
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado con id: " + usuarioId));
        if (grupo.getMiembros().stream().noneMatch(u -> u.getId().equals(usuarioId))) {
            grupo.getMiembros().add(usuario);
        }
        grupo = grupoRepository.save(grupo);
        saveMembership(grupo, usuario, RolGrupo.JUGADOR);
        return toResponse(grupo);
    }

    public GrupoResponse removeJugador(Long grupoId, Long usuarioId) {
        Grupo grupo = grupoRepository.findById(grupoId)
                .orElseThrow(() -> new NotFoundException("Grupo no encontrado con id: " + grupoId));
        assertCanManageMembers(grupo);
        if (grupo.getCreadoPor().getId().equals(usuarioId)) {
            throw new com.event.backend.exception.BusinessException("No puedes quitar al creador del grupo.");
        }
        grupo.getMiembros().removeIf(u -> u.getId().equals(usuarioId));
        grupoJugadorRepository.deleteById(new GrupoJugadorId(grupoId, usuarioId));
        grupo = grupoRepository.save(grupo);
        return toResponse(grupo);
    }

    public GrupoResponse assignOrganizador(Long grupoId, Long usuarioId) {
        Grupo grupo = grupoRepository.findById(grupoId)
                .orElseThrow(() -> new NotFoundException("Grupo no encontrado con id: " + grupoId));
        assertCanAssignOrganizers(grupo);
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado con id: " + usuarioId));
        if (grupo.getMiembros().stream().noneMatch(u -> u.getId().equals(usuarioId))) {
            grupo.getMiembros().add(usuario);
            grupoRepository.save(grupo);
        }
        saveMembership(grupo, usuario, RolGrupo.ORGANIZADOR);
        return toResponse(grupo);
    }

    public GrupoResponse removeOrganizador(Long grupoId, Long usuarioId) {
        Grupo grupo = grupoRepository.findById(grupoId)
                .orElseThrow(() -> new NotFoundException("Grupo no encontrado con id: " + grupoId));
        assertCanAssignOrganizers(grupo);
        if (grupo.getCreadoPor().getId().equals(usuarioId)) {
            throw new com.event.backend.exception.BusinessException("El creador no puede perder el rol CREADOR.");
        }
        GrupoJugador membresia = grupoJugadorRepository.findByIdGrupoIdAndIdUsuarioId(grupoId, usuarioId)
                .orElseThrow(() -> new NotFoundException("Miembro no encontrado en el grupo."));
        membresia.setRolGrupo(RolGrupo.JUGADOR);
        membresia.setAsignadoPor(securityService.getCurrentUser());
        grupoJugadorRepository.save(membresia);
        return toResponse(grupo);
    }

    public void delete(Long id) {
        Grupo grupo = grupoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Grupo no encontrado con id: " + id));

        if (!canDeleteGroup(grupo)) {
            throw new ForbiddenException("No tienes permiso para eliminar este grupo");
        }

        convocatoriaRepository.nullifyGrupo(id);
        grupoRepository.delete(grupo);
    }

    private boolean canManageAnyGroup() {
        return securityService.isSuperAdmin()
                || securityService.hasAnyAuthority("editar_grupos", "eliminar_grupos");
    }

    private boolean canEditGroup(Grupo grupo) {
        return isGroupCreator(grupo)
                || securityService.isSuperAdmin()
                || securityService.hasAuthority("editar_grupos");
    }

    private boolean canDeleteGroup(Grupo grupo) {
        return isGroupCreator(grupo)
                || securityService.isSuperAdmin()
                || securityService.hasAuthority("eliminar_grupos");
    }

    private boolean isGroupCreator(Grupo grupo) {
        Long currentUserId = securityService.getCurrentUserId();
        return grupo.getCreadoPor() != null && grupo.getCreadoPor().getId().equals(currentUserId);
    }

    private boolean isGroupOrganizerOrCreator(Grupo grupo) {
        Long currentUserId = securityService.getCurrentUserId();
        return isGroupCreator(grupo)
                || grupoJugadorRepository.existsByIdGrupoIdAndIdUsuarioIdAndRolGrupoIn(
                        grupo.getId(), currentUserId, List.of(RolGrupo.CREADOR, RolGrupo.ORGANIZADOR));
    }

    private Grupo loadAndAssertCanView(Long grupoId) {
        Grupo grupo = grupoRepository.findById(grupoId)
                .orElseThrow(() -> new NotFoundException("Grupo no encontrado con id: " + grupoId));
        Long currentUserId = securityService.getCurrentUserId();
        boolean isCreator = grupo.getCreadoPor().getId().equals(currentUserId);
        boolean isMember = grupo.getMiembros().stream().anyMatch(m -> m.getId().equals(currentUserId));
        if (!isCreator && !isMember && !canManageAnyGroup()) {
            throw new ForbiddenException("No tienes permiso para ver este grupo");
        }
        return grupo;
    }

    private void assertCanManageMembers(Grupo grupo) {
        if (!isGroupOrganizerOrCreator(grupo) && !securityService.isSuperAdmin() && !securityService.hasAuthority("editar_grupos")) {
            throw new ForbiddenException("No tienes permiso para gestionar miembros de este grupo");
        }
    }

    private void assertCanAssignOrganizers(Grupo grupo) {
        if (!isGroupCreator(grupo) && !securityService.isSuperAdmin()) {
            throw new ForbiddenException("Solo el creador del grupo puede asignar organizadores.");
        }
    }

    private void ensureCreatorMembership(Grupo grupo, Usuario creador) {
        if (grupo.getMiembros().stream().noneMatch(u -> u.getId().equals(creador.getId()))) {
            grupo.getMiembros().add(creador);
            grupoRepository.save(grupo);
        }
        saveMembership(grupo, creador, RolGrupo.CREADOR);
    }

    private void saveMembership(Grupo grupo, Usuario usuario, RolGrupo rolGrupo) {
        GrupoJugador membresia = grupoJugadorRepository.findByIdGrupoIdAndIdUsuarioId(grupo.getId(), usuario.getId())
                .orElse(GrupoJugador.builder()
                        .id(new GrupoJugadorId(grupo.getId(), usuario.getId()))
                        .grupo(grupo)
                        .usuario(usuario)
                        .build());
        membresia.setRolGrupo(rolGrupo);
        membresia.setAsignadoPor(securityService.getCurrentUser());
        grupoJugadorRepository.save(membresia);
    }

    private GrupoResponse toResponse(Grupo grupo) {
        List<Long> miembroIds = grupo.getMiembros().stream().map(Usuario::getId).toList();
        List<String> miembroNombres = grupo.getMiembros().stream().map(Usuario::getNombre).toList();

        List<UsuarioPosicion> posiciones = miembroIds.isEmpty() ? List.of() :
                usuarioPosicionRepository.findByUsuarioIdIn(miembroIds);
        Map<Long, List<UsuarioPosicion>> posicionesByUser = posiciones.stream()
                .collect(Collectors.groupingBy(up -> up.getId().getUsuarioId()));

        List<GrupoMiembroResponse> miembrosDetalle = toMiembrosDetalle(grupo);

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
                .puedeGestionar(isGroupOrganizerOrCreator(grupo) || canManageAnyGroup())
                .puedeAsignarOrganizadores(isGroupCreator(grupo) || securityService.isSuperAdmin())
                .build();
    }

    private List<GrupoMiembroResponse> toMiembrosDetalle(Grupo grupo) {
        List<Long> miembroIds = grupo.getMiembros().stream().map(Usuario::getId).toList();
        List<UsuarioPosicion> posiciones = miembroIds.isEmpty() ? List.of() :
                usuarioPosicionRepository.findByUsuarioIdIn(miembroIds);
        Map<Long, List<UsuarioPosicion>> posicionesByUser = posiciones.stream()
                .collect(Collectors.groupingBy(up -> up.getId().getUsuarioId()));
        Map<Long, RolGrupo> rolesByUser = grupoJugadorRepository.findByIdGrupoIdOrderByUsuarioNombreAsc(grupo.getId()).stream()
                .collect(Collectors.toMap(gj -> gj.getUsuario().getId(), GrupoJugador::getRolGrupo, (a, b) -> a));

        return grupo.getMiembros().stream()
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
                            .username(u.getUsername())
                            .email(u.getEmail())
                            .numeroCamiseta(u.getNumeroCamiseta())
                            .rolGrupo(rolesByUser.getOrDefault(u.getId(), RolGrupo.JUGADOR).name())
                            .posiciones(userPosDtos)
                            .fechaFinSuspension(u.getFechaFinSuspension())
                            .motivoSuspension(u.getMotivoSuspension())
                            .build();
                })
                .toList();
    }
}
