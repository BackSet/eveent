package com.event.backend.service;

import com.event.backend.dto.asistencia.AsistenciaRequest;
import com.event.backend.dto.asistencia.AsistenciaResponse;
import com.event.backend.dto.asistencia.AsistenciaUpdateRequest;
import com.event.backend.exception.BusinessException;
import com.event.backend.exception.ForbiddenException;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.*;
import com.event.backend.repository.*;
import com.event.backend.security.SecurityService;
import com.event.backend.util.ConvocatoriaScheduleHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AsistenciaService {

    private final AsistenciaRepository asistenciaRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final PosicionesDeporteRepository posicionRepository;
    private final BandoConvocatoriaRepository bandoRepository;
    private final SecurityService securityService;
    private final AsistenciaMapper asistenciaMapper;
    private final UsuarioPosicionRepository usuarioPosicionRepository;
    private final ConvocatoriaAccessService convocatoriaAccessService;
    private final AutoAceptacionService autoAceptacionService;
    private final ConvocatoriaGrupoEquipoRepository convocatoriaGrupoEquipoRepository;
    private final ReglaPosicionEquipoRepository reglaPosicionEquipoRepository;

    @Transactional(readOnly = true)
    public List<AsistenciaResponse> findByConvocatoriaId(Long convocatoriaId) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + convocatoriaId));
        convocatoriaAccessService.assertCanView(convocatoria, securityService.getCurrentUserId());

        List<Asistencia> asistencias = asistenciaRepository.findByConvocatoriaId(convocatoriaId);
        List<AsistenciaResponse> responses = asistencias.stream()
                .map(asistenciaMapper::toResponse)
                .collect(Collectors.toList());
        if (!asistencias.isEmpty()) {
            Convocatoria conv = asistencias.get(0).getConvocatoria();
            Long deporteId = conv.getDeporte() != null ? conv.getDeporte().getId() : null;
            populateUserPositions(responses, deporteId);
        }
        return responses;
    }

    @Transactional(readOnly = true)
    public List<AsistenciaResponse> findByUsuarioId(Long usuarioId) {
        Long idToUse = usuarioId != null ? usuarioId : securityService.getCurrentUserId();
        List<Asistencia> asistencias = asistenciaRepository.findByUsuarioId(idToUse);
        List<AsistenciaResponse> responses = asistencias.stream()
                .map(asistenciaMapper::toResponse)
                .collect(Collectors.toList());
        
        List<UsuarioPosicion> upList = usuarioPosicionRepository.findByUsuarioId(idToUse);
        for (int i = 0; i < asistencias.size(); i++) {
            Asistencia a = asistencias.get(i);
            AsistenciaResponse res = responses.get(i);
            if (res.getPosicionPreferidaNombre() == null && a.getUsuario() != null) {
                Convocatoria conv = a.getConvocatoria();
                Long depId = conv.getDeporte() != null ? conv.getDeporte().getId() : null;
                if (depId != null) {
                    List<UsuarioPosicion> filtered = upList.stream()
                            .filter(up -> up.getPosicion() != null && up.getPosicion().getDeporte() != null && up.getPosicion().getDeporte().getId().equals(depId))
                            .sorted(java.util.Comparator.comparing(UsuarioPosicion::getPrioridad))
                            .toList();
                    if (!filtered.isEmpty()) {
                        res.setPosicionPreferidaNombre(filtered.get(0).getPosicion().getNombre());
                    }
                }
            }
        }
        return responses;
    }

    @Transactional(readOnly = true)
    public AsistenciaResponse findById(Long id) {
        Asistencia asistencia = asistenciaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Asistencia no encontrada con id: " + id));
        AsistenciaResponse response = asistenciaMapper.toResponse(asistencia);
        if (asistencia.getConvocatoria().getDeporte() != null) {
            List<AsistenciaResponse> list = new java.util.ArrayList<>(List.of(response));
            populateUserPositions(list, asistencia.getConvocatoria().getDeporte().getId());
            response = list.get(0);
        }
        return response;
    }

    @Transactional(readOnly = true)
    public AsistenciaResponse findByConvocatoriaAndUsuario(Long convocatoriaId) {
        Long usuarioId = securityService.getCurrentUserId();
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + convocatoriaId));
        convocatoriaAccessService.assertCanView(convocatoria, usuarioId);

        Asistencia asistencia = asistenciaRepository.findByConvocatoriaIdAndUsuarioId(convocatoriaId, usuarioId)
                .orElseThrow(() -> new NotFoundException("No tienes registro de asistencia para esta convocatoria"));
        AsistenciaResponse response = asistenciaMapper.toResponse(asistencia);
        if (asistencia.getConvocatoria().getDeporte() != null) {
            List<AsistenciaResponse> list = new java.util.ArrayList<>(List.of(response));
            populateUserPositions(list, asistencia.getConvocatoria().getDeporte().getId());
            response = list.get(0);
        }
        return response;
    }

    private EstadoAsistencia evaluateEstadoWithCupo(Convocatoria conv, EstadoAsistencia requestedEstado) {
        if (requestedEstado == EstadoAsistencia.ASISTIRE) {
            if (conv.getCupoMaximo() != null && conv.getCupoMaximo() > 0) {
                long countAsistire = asistenciaRepository.countByConvocatoriaIdAndEstado(conv.getId(), EstadoAsistencia.ASISTIRE);
                if (countAsistire >= conv.getCupoMaximo()) {
                    if ("LISTA_ESPERA".equals(conv.getManejoExcedente())) {
                        return EstadoAsistencia.LISTA_ESPERA;
                    }
                }
            }
        }
        return requestedEstado;
    }

    private void checkSuspension(Usuario usuario) {
        if (usuario != null && usuario.getFechaFinSuspension() != null && usuario.getFechaFinSuspension().isAfter(LocalDateTime.now())) {
            throw new BusinessException("No puedes registrar asistencia ya que te encuentras suspendido hasta " + 
                usuario.getFechaFinSuspension() + " por el siguiente motivo: " + usuario.getMotivoSuspension());
        }
    }

    public AsistenciaResponse create(AsistenciaRequest request) {
        Usuario usuario = securityService.getCurrentUser();
        if (request.getNombreExterno() == null || request.getNombreExterno().trim().isEmpty()) {
            checkSuspension(usuario);
        }
        Convocatoria convocatoria = convocatoriaRepository.findById(request.getConvocatoriaId())
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + request.getConvocatoriaId()));

        ConvocatoriaScheduleHelper.assertConvocatoriaActiveForSideEffects(convocatoria, LocalDateTime.now());

        // Si es un jugador externo (invitado por el usuario actual)
        if (request.getNombreExterno() != null && !request.getNombreExterno().trim().isEmpty()) {
            if (isGroupFormation(convocatoria)) {
                throw new BusinessException("Los invitados externos no pueden confirmar en convocatorias por grupos.");
            }
            boolean isOwnerOrSuperAdmin = convocatoriaAccessService.isOwnerOrSuperAdmin(convocatoria, usuario.getId());
            if (!isOwnerOrSuperAdmin && !hasAuthority("invitar_externos")) {
                throw new ForbiddenException("No tienes permiso para registrar invitados externos.");
            }
            if (!isOwnerOrSuperAdmin) {
                convocatoriaAccessService.assertCanSelfRegister(convocatoria, usuario.getId());
            }
            EstadoAsistencia requestedEstado = request.getEstado() != null 
                    ? EstadoAsistencia.valueOf(request.getEstado()) 
                    : EstadoAsistencia.ASISTIRE;
            EstadoAsistencia finalEstado = evaluateEstadoWithCupo(convocatoria, requestedEstado);

            Asistencia.AsistenciaBuilder builder = Asistencia.builder()
                    .convocatoria(convocatoria)
                    .usuario(null)
                    .nombreExterno(request.getNombreExterno().trim())
                    .invitadoPor(usuario)
                    .estado(finalEstado)
                    .fechaRespuesta(LocalDateTime.now());

            if (request.getPosicionPreferidaId() != null) {
                PosicionesDeporte posicion = posicionRepository.findById(request.getPosicionPreferidaId())
                        .orElseThrow(() -> new NotFoundException("Posicion no encontrada con id: " + request.getPosicionPreferidaId()));
                builder.posicionPreferida(posicion);
            }

            if (request.getBandoId() != null) {
                BandoConvocatoria bando = bandoRepository.findById(request.getBandoId())
                        .orElseThrow(() -> new NotFoundException("Bando no encontrado con id: " + request.getBandoId()));
                builder.bando(bando);
            }

            Asistencia asistencia = builder.build();
            java.util.List<PosicionesDeporte> selectedPos = new java.util.ArrayList<>();
            if (request.getPosicionesPreferidasIds() != null && !request.getPosicionesPreferidasIds().isEmpty()) {
                List<PosicionesDeporte> found = posicionRepository.findAllById(request.getPosicionesPreferidasIds());
                for (Long id : request.getPosicionesPreferidasIds()) {
                    found.stream().filter(p -> p.getId().equals(id)).findFirst().ifPresent(selectedPos::add);
                }
            }
            if (asistencia.getPosicionPreferida() != null && !selectedPos.contains(asistencia.getPosicionPreferida())) {
                selectedPos.add(asistencia.getPosicionPreferida());
            }
            asistencia.setPosicionesPreferidas(selectedPos);
            asistencia = asistenciaRepository.save(asistencia);
            
            AsistenciaResponse response = asistenciaMapper.toResponse(asistencia);
            if (convocatoria.getDeporte() != null) {
                List<AsistenciaResponse> list = new java.util.ArrayList<>(List.of(response));
                populateUserPositions(list, convocatoria.getDeporte().getId());
                response = list.get(0);
            }
            return response;
        }

        convocatoriaAccessService.assertCanSelfRegister(convocatoria, usuario.getId());

        var existing = asistenciaRepository.findByConvocatoriaIdAndUsuarioId(request.getConvocatoriaId(), usuario.getId());
        if (existing.isPresent()) {
            Asistencia asistencia = existing.get();
            if (request.getEstado() != null) {
                EstadoAsistencia requestedEstado = EstadoAsistencia.valueOf(request.getEstado());
                EstadoAsistencia oldEstado = asistencia.getEstado();
                Long oldBandoId = asistencia.getBando() != null ? asistencia.getBando().getId() : null;
                TipoConfirmacion oldTipo = asistencia.getTipoConfirmacion();
                if (requestedEstado == EstadoAsistencia.ASISTIRE) {
                    if (isGroupFormation(asistencia.getConvocatoria())) {
                        confirmarAsistenciaPorGrupo(asistencia, requestedEstado);
                    } else if (asistencia.getEstado() != EstadoAsistencia.ASISTIRE) {
                        asistencia.setEstado(evaluateEstadoWithCupo(asistencia.getConvocatoria(), requestedEstado));
                    } else {
                        asistencia.setEstado(requestedEstado);
                    }
                } else {
                    asistencia.setEstado(requestedEstado);
                    clearGroupAssignmentIfNeeded(asistencia);
                    promoteAfterLeaving(oldEstado, oldTipo, asistencia.getConvocatoria().getId(), oldBandoId);
                }
            }
            asistencia.setFechaRespuesta(LocalDateTime.now());
            
            java.util.List<PosicionesDeporte> selectedPos = new java.util.ArrayList<>();
            if (request.getPosicionesPreferidasIds() != null && !request.getPosicionesPreferidasIds().isEmpty()) {
                List<PosicionesDeporte> found = posicionRepository.findAllById(request.getPosicionesPreferidasIds());
                for (Long id : request.getPosicionesPreferidasIds()) {
                    found.stream().filter(p -> p.getId().equals(id)).findFirst().ifPresent(selectedPos::add);
                }
            }
            asistencia.setPosicionesPreferidas(selectedPos);
            asistencia = asistenciaRepository.save(asistencia);
            
            AsistenciaResponse response = asistenciaMapper.toResponse(asistencia);
            if (asistencia.getConvocatoria().getDeporte() != null) {
                List<AsistenciaResponse> list = new java.util.ArrayList<>(List.of(response));
                populateUserPositions(list, asistencia.getConvocatoria().getDeporte().getId());
                response = list.get(0);
            }
            return response;
        }

        EstadoAsistencia requestedEstado = request.getEstado() != null ? EstadoAsistencia.valueOf(request.getEstado()) : EstadoAsistencia.PENDIENTE;
        if (request.getEstado() == null
                && autoAceptacionService.shouldAutoAcceptOnSelfRegister(usuario, convocatoria, requestedEstado)) {
            requestedEstado = EstadoAsistencia.ASISTIRE;
        }
        EstadoAsistencia finalEstado = evaluateEstadoWithCupo(convocatoria, requestedEstado);

        Asistencia.AsistenciaBuilder builder = Asistencia.builder()
                .convocatoria(convocatoria)
                .usuario(usuario)
                .estado(finalEstado);

        if (request.getPosicionPreferidaId() != null) {
            PosicionesDeporte posicion = posicionRepository.findById(request.getPosicionPreferidaId())
                    .orElseThrow(() -> new NotFoundException("Posicion no encontrada con id: " + request.getPosicionPreferidaId()));
            builder.posicionPreferida(posicion);
        }

        if (request.getBandoId() != null) {
            BandoConvocatoria bando = bandoRepository.findById(request.getBandoId())
                    .orElseThrow(() -> new NotFoundException("Bando no encontrado con id: " + request.getBandoId()));
            builder.bando(bando);
        }

        Asistencia asistencia = builder.build();
        java.util.List<PosicionesDeporte> selectedPos = new java.util.ArrayList<>();
        if (request.getPosicionesPreferidasIds() != null && !request.getPosicionesPreferidasIds().isEmpty()) {
            List<PosicionesDeporte> found = posicionRepository.findAllById(request.getPosicionesPreferidasIds());
            for (Long id : request.getPosicionesPreferidasIds()) {
                found.stream().filter(p -> p.getId().equals(id)).findFirst().ifPresent(selectedPos::add);
            }
        }
        if (asistencia.getPosicionPreferida() != null && !selectedPos.contains(asistencia.getPosicionPreferida())) {
            selectedPos.add(asistencia.getPosicionPreferida());
        }
        asistencia.setPosicionesPreferidas(selectedPos);
        if (request.getEstado() == null
                && autoAceptacionService.matches(usuario, convocatoria.getFechaHora(), LocalDateTime.now())) {
            autoAceptacionService.enrichAsistenciaForAutoAccept(asistencia, usuario);
        } else if (request.getEstado() != null
                && EstadoAsistencia.valueOf(request.getEstado()) == EstadoAsistencia.ASISTIRE
                && autoAceptacionService.matches(usuario, convocatoria.getFechaHora(), LocalDateTime.now())) {
            autoAceptacionService.enrichAsistenciaForAutoAccept(asistencia, usuario);
        }
        if (isGroupFormation(convocatoria) && asistencia.getEstado() == EstadoAsistencia.ASISTIRE) {
            confirmarAsistenciaPorGrupo(asistencia, EstadoAsistencia.ASISTIRE);
        }
        asistencia = asistenciaRepository.save(asistencia);
        
        AsistenciaResponse response = asistenciaMapper.toResponse(asistencia);
        if (convocatoria.getDeporte() != null) {
            List<AsistenciaResponse> list = new java.util.ArrayList<>(List.of(response));
            populateUserPositions(list, convocatoria.getDeporte().getId());
            response = list.get(0);
        }
        return response;
    }

    public AsistenciaResponse update(Long id, AsistenciaUpdateRequest request) {
        Asistencia asistencia = asistenciaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Asistencia no encontrada con id: " + id));

        ConvocatoriaScheduleHelper.assertConvocatoriaActiveForSideEffects(
                asistencia.getConvocatoria(), LocalDateTime.now());

        Long currentUserId = securityService.getCurrentUserId();
        boolean isOwner = asistencia.getUsuario() != null && asistencia.getUsuario().getId().equals(currentUserId);
        boolean isHost = asistencia.getInvitadoPor() != null && asistencia.getInvitadoPor().getId().equals(currentUserId);

        if (!isOwner && !isHost
                && !convocatoriaAccessService.canManageAttendance(asistencia.getConvocatoria(), currentUserId)) {
            throw new ForbiddenException("No tienes permiso para editar esta asistencia");
        }

        if (isOwner) {
            checkSuspension(asistencia.getUsuario());
        }

        EstadoAsistencia oldEstado = asistencia.getEstado();
        EstadoAsistencia newEstado = request.getEstado();

        if (request.getNombreExterno() != null) {
            asistencia.setNombreExterno(request.getNombreExterno().trim().isEmpty() ? null : request.getNombreExterno().trim());
        }

        if (newEstado != null) {
            boolean isOldAttending = (oldEstado == EstadoAsistencia.ASISTIRE || oldEstado == EstadoAsistencia.LISTA_ESPERA);
            boolean isNewAttending = (newEstado == EstadoAsistencia.ASISTIRE || newEstado == EstadoAsistencia.LISTA_ESPERA);

            Long oldBandoId = asistencia.getBando() != null ? asistencia.getBando().getId() : null;
            TipoConfirmacion oldTipo = asistencia.getTipoConfirmacion();

            if (isGroupFormation(asistencia.getConvocatoria()) && newEstado == EstadoAsistencia.ASISTIRE) {
                confirmarAsistenciaPorGrupo(asistencia, newEstado);
                if (oldTipo == TipoConfirmacion.TITULAR
                        && oldBandoId != null
                        && !oldBandoId.equals(asistencia.getBando() != null ? asistencia.getBando().getId() : null)) {
                    promoverSiguienteEnEspera(oldBandoId, asistencia.getConvocatoria().getId());
                }
            } else if (isNewAttending && isOldAttending) {
                newEstado = oldEstado;
            } else if (newEstado == EstadoAsistencia.ASISTIRE && !isOldAttending) {
                Convocatoria conv = asistencia.getConvocatoria();
                newEstado = evaluateEstadoWithCupo(conv, newEstado);
                asistencia.setFechaRespuesta(LocalDateTime.now());
            } else if (newEstado != oldEstado) {
                asistencia.setFechaRespuesta(LocalDateTime.now());
            }
            if (!isGroupFormation(asistencia.getConvocatoria()) || newEstado != EstadoAsistencia.ASISTIRE) {
                asistencia.setEstado(newEstado);
            }
            if (!isNewAttending) {
                clearGroupAssignmentIfNeeded(asistencia);
                promoteAfterLeaving(oldEstado, oldTipo, asistencia.getConvocatoria().getId(), oldBandoId);
            }
        }

        if (request.getPosicionPreferidaId() != null) {
            PosicionesDeporte posicion = posicionRepository.findById(request.getPosicionPreferidaId())
                    .orElseThrow(() -> new NotFoundException("Posicion no encontrada con id: " + request.getPosicionPreferidaId()));
            asistencia.setPosicionPreferida(posicion);
            if (!asistencia.getPosicionesPreferidas().contains(posicion)) {
                asistencia.getPosicionesPreferidas().add(posicion);
            }
        }

        if (request.getPosicionesPreferidasIds() != null) {
            java.util.List<PosicionesDeporte> selectedPos = new java.util.ArrayList<>();
            if (!request.getPosicionesPreferidasIds().isEmpty()) {
                List<PosicionesDeporte> found = posicionRepository.findAllById(request.getPosicionesPreferidasIds());
                for (Long posId : request.getPosicionesPreferidasIds()) {
                    found.stream().filter(p -> p.getId().equals(posId)).findFirst().ifPresent(selectedPos::add);
                }
            }
            if (asistencia.getPosicionPreferida() != null && !selectedPos.contains(asistencia.getPosicionPreferida())) {
                selectedPos.add(asistencia.getPosicionPreferida());
            }
            asistencia.setPosicionesPreferidas(selectedPos);
        }

        if (request.getBandoId() != null) {
            if (isGroupFormation(asistencia.getConvocatoria()) && asistencia.getUsuario() != null) {
                ConvocatoriaGrupoEquipo relacion = resolverEquipoDelUsuario(
                        asistencia.getConvocatoria(), asistencia.getUsuario());
                if (!relacion.getEquipo().getId().equals(request.getBandoId())) {
                    throw new BusinessException("Un jugador no puede quedar en el equipo de otro grupo.");
                }
            }
            if (request.getBandoId() <= 0) {
                asistencia.setBando(null);
            } else {
                BandoConvocatoria bando = bandoRepository.findById(request.getBandoId())
                        .orElseThrow(() -> new NotFoundException("Bando no encontrado con id: " + request.getBandoId()));
                asistencia.setBando(bando);
            }
        }

        asistencia = asistenciaRepository.save(asistencia);

        if (!isGroupFormation(asistencia.getConvocatoria())
                && oldEstado == EstadoAsistencia.ASISTIRE
                && newEstado != null
                && newEstado != EstadoAsistencia.ASISTIRE) {
            promoteFromWaitlist(asistencia.getConvocatoria().getId());
        }

        AsistenciaResponse response = asistenciaMapper.toResponse(asistencia);
        if (asistencia.getConvocatoria().getDeporte() != null) {
            List<AsistenciaResponse> list = new java.util.ArrayList<>(List.of(response));
            populateUserPositions(list, asistencia.getConvocatoria().getDeporte().getId());
            response = list.get(0);
        }
        return response;
    }

    public void delete(Long id) {
        Asistencia asistencia = asistenciaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Asistencia no encontrada con id: " + id));

        ConvocatoriaScheduleHelper.assertConvocatoriaActiveForSideEffects(
                asistencia.getConvocatoria(), LocalDateTime.now());

        Long currentUserId = securityService.getCurrentUserId();
        boolean isOwner = asistencia.getUsuario() != null && asistencia.getUsuario().getId().equals(currentUserId);
        boolean isHost = asistencia.getInvitadoPor() != null && asistencia.getInvitadoPor().getId().equals(currentUserId);

        if (!isOwner && !isHost
                && !convocatoriaAccessService.canManageAttendance(asistencia.getConvocatoria(), currentUserId)) {
            throw new ForbiddenException("No tienes permiso para eliminar esta asistencia");
        }

        EstadoAsistencia estado = asistencia.getEstado();
        Long convocatoriaId = asistencia.getConvocatoria().getId();
        Long bandoId = asistencia.getBando() != null ? asistencia.getBando().getId() : null;
        TipoConfirmacion tipoConfirmacion = asistencia.getTipoConfirmacion();

        asistenciaRepository.deleteById(id);

        if (isGroupFormation(asistencia.getConvocatoria()) && tipoConfirmacion == TipoConfirmacion.TITULAR && bandoId != null) {
            promoverSiguienteEnEspera(bandoId, convocatoriaId);
        } else if (estado == EstadoAsistencia.ASISTIRE) {
            promoteFromWaitlist(convocatoriaId);
        }
    }

    private boolean hasAuthority(String authority) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(authority));
    }

    private void promoteFromWaitlist(Long convocatoriaId) {
        List<Asistencia> waitlist = asistenciaRepository.findByConvocatoriaIdAndEstado(convocatoriaId, EstadoAsistencia.LISTA_ESPERA);
        if (!waitlist.isEmpty()) {
            Asistencia first = waitlist.get(0);
            first.setEstado(EstadoAsistencia.ASISTIRE);
            first.setFechaRespuesta(LocalDateTime.now());
            asistenciaRepository.save(first);
        }
    }

    private void promoverSiguienteEnEspera(Long bandoId, Long convocatoriaId) {
        if (bandoId == null) {
            return;
        }
        List<Asistencia> waitlist = asistenciaRepository
                .findByConvocatoriaIdAndBandoIdAndTipoConfirmacionOrderByFechaRespuestaAsc(
                        convocatoriaId, bandoId, TipoConfirmacion.ESPERA);
        if (!waitlist.isEmpty()) {
            Asistencia first = waitlist.get(0);
            first.setEstado(EstadoAsistencia.ASISTIRE);
            first.setTipoConfirmacion(TipoConfirmacion.TITULAR);
            first.setFechaRespuesta(LocalDateTime.now());
            asistenciaRepository.save(first);
        }
    }

    public List<AsistenciaResponse> bulkInvite(Long convocatoriaId, List<Long> usuarioIds) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada"));

        ConvocatoriaScheduleHelper.assertConvocatoriaActiveForSideEffects(convocatoria, LocalDateTime.now());

        if (!convocatoriaAccessService.canInviteRegisteredPlayers(convocatoria, securityService.getCurrentUserId())) {
            throw new ForbiddenException("No tienes permiso para invitar jugadores a esta convocatoria.");
        }

        List<Asistencia> existing = asistenciaRepository.findByConvocatoriaId(convocatoriaId);
        Set<Long> existingUserIds = existing.stream()
                .filter(a -> a.getUsuario() != null)
                .map(a -> a.getUsuario().getId())
                .collect(Collectors.toSet());

        List<Long> newIds = usuarioIds.stream().filter(uid -> !existingUserIds.contains(uid)).toList();
        if (newIds.isEmpty()) return List.of();

        List<Usuario> users = usuarioRepository.findAllById(newIds);

        List<Asistencia> newAsistencias = users.stream()
                .map(usuario -> {
                    Asistencia asistencia = Asistencia.builder()
                            .convocatoria(convocatoria)
                            .usuario(usuario)
                            .estado(EstadoAsistencia.PENDIENTE)
                            .build();
                    autoAceptacionService.enrichAsistenciaForAutoAccept(asistencia, usuario);
                    if (isGroupFormation(convocatoria) && asistencia.getEstado() == EstadoAsistencia.ASISTIRE) {
                        confirmarAsistenciaPorGrupo(asistencia, EstadoAsistencia.ASISTIRE);
                    }
                    return asistencia;
                })
                .toList();

        asistenciaRepository.saveAll(newAsistencias);

        List<Asistencia> all = asistenciaRepository.findByConvocatoriaId(convocatoriaId);
        List<AsistenciaResponse> responses = all.stream()
                .map(asistenciaMapper::toResponse)
                .collect(Collectors.toList());
        if (!all.isEmpty()) {
            Convocatoria conv = all.get(0).getConvocatoria();
            Long deporteId = conv.getDeporte() != null ? conv.getDeporte().getId() : null;
            populateUserPositions(responses, deporteId);
        }
        return responses;
    }

    public void deleteBulk(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return;
        List<Asistencia> asistencias = asistenciaRepository.findAllById(ids);
        
        if (!asistencias.isEmpty()) {
            ConvocatoriaScheduleHelper.assertConvocatoriaActiveForSideEffects(
                    asistencias.get(0).getConvocatoria(), LocalDateTime.now());
        }
        Long currentUserId = securityService.getCurrentUserId();
        
        for (Asistencia a : asistencias) {
            boolean isOwner = a.getUsuario() != null && a.getUsuario().getId().equals(currentUserId);
            boolean isHost = a.getInvitadoPor() != null && a.getInvitadoPor().getId().equals(currentUserId);
            if (!isOwner && !isHost
                    && !convocatoriaAccessService.canManageAttendance(a.getConvocatoria(), currentUserId)) {
                throw new ForbiddenException("No tienes permiso para eliminar esta asistencia: " + a.getId());
            }
        }
        
        asistenciaRepository.deleteAll(asistencias);
        
        for (Asistencia a : asistencias) {
            if (isGroupFormation(a.getConvocatoria()) && a.getTipoConfirmacion() == TipoConfirmacion.TITULAR && a.getBando() != null) {
                promoverSiguienteEnEspera(a.getBando().getId(), a.getConvocatoria().getId());
            } else if (a.getEstado() == EstadoAsistencia.ASISTIRE) {
                promoteFromWaitlist(a.getConvocatoria().getId());
            }
        }
    }

    private void confirmarAsistenciaPorGrupo(Asistencia asistencia, EstadoAsistencia requestedEstado) {
        if (!isGroupFormation(asistencia.getConvocatoria()) || requestedEstado != EstadoAsistencia.ASISTIRE) {
            return;
        }
        if (asistencia.getUsuario() == null) {
            throw new BusinessException("Los invitados externos no pueden confirmar en convocatorias por grupos.");
        }

        ConvocatoriaGrupoEquipo relacion = resolverEquipoDelUsuario(asistencia.getConvocatoria(), asistencia.getUsuario());
        TipoConfirmacion tipoConfirmacion = calcularTipoConfirmacion(asistencia, relacion);
        asistencia.setBando(relacion.getEquipo());
        asistencia.setTipoConfirmacion(tipoConfirmacion);
        asistencia.setEstado(tipoConfirmacion == TipoConfirmacion.TITULAR
                ? EstadoAsistencia.ASISTIRE
                : EstadoAsistencia.LISTA_ESPERA);
        asistencia.setFechaRespuesta(LocalDateTime.now());
    }

    private ConvocatoriaGrupoEquipo resolverEquipoDelUsuario(Convocatoria convocatoria, Usuario usuario) {
        return convocatoriaGrupoEquipoRepository.findParticipatingGroupForUser(convocatoria.getId(), usuario.getId())
                .orElseThrow(() -> new BusinessException(
                        "No perteneces a ningun grupo participante de esta convocatoria."));
    }

    private TipoConfirmacion calcularTipoConfirmacion(Asistencia asistencia, ConvocatoriaGrupoEquipo relacion) {
        Integer cupo = relacion.getCupoTitulares() != null ? relacion.getCupoTitulares() : 1;
        long titulares = asistenciaRepository.countByConvocatoriaIdAndBandoIdAndTipoConfirmacion(
                relacion.getConvocatoria().getId(),
                relacion.getEquipo().getId(),
                TipoConfirmacion.TITULAR);
        if (asistencia.getId() != null
                && asistencia.getBando() != null
                && asistencia.getBando().getId().equals(relacion.getEquipo().getId())
                && asistencia.getTipoConfirmacion() == TipoConfirmacion.TITULAR) {
            titulares = Math.max(0, titulares - 1);
        }
        return titulares < cupo ? TipoConfirmacion.TITULAR : TipoConfirmacion.ESPERA;
    }

    private boolean isGroupFormation(Convocatoria convocatoria) {
        return convocatoria != null && convocatoria.getModoFormacion() == ModoFormacion.EQUIPOS_POR_GRUPO;
    }

    private void clearGroupAssignmentIfNeeded(Asistencia asistencia) {
        if (isGroupFormation(asistencia.getConvocatoria())) {
            asistencia.setBando(null);
            asistencia.setTipoConfirmacion(TipoConfirmacion.TITULAR);
        }
    }

    private void promoteAfterLeaving(EstadoAsistencia oldEstado, TipoConfirmacion oldTipo, Long convocatoriaId, Long oldBandoId) {
        if (oldTipo == TipoConfirmacion.TITULAR && oldBandoId != null && oldEstado == EstadoAsistencia.ASISTIRE) {
            promoverSiguienteEnEspera(oldBandoId, convocatoriaId);
        }
    }

    public void populateUserPositions(List<AsistenciaResponse> responses, Long deporteId) {
        if (responses == null || responses.isEmpty() || deporteId == null) return;
        
        List<Long> usuarioIds = responses.stream()
                .filter(res -> res.getUsuarioId() != null && (res.getPosicionesPreferidasNombres() == null || res.getPosicionesPreferidasNombres().isEmpty()))
                .map(AsistenciaResponse::getUsuarioId)
                .distinct()
                .toList();
                
        if (usuarioIds.isEmpty()) return;
        
        List<UsuarioPosicion> upList = usuarioPosicionRepository.findByUsuarioIdIn(usuarioIds);
        
        java.util.Map<Long, List<String>> userPositionsMap = new java.util.HashMap<>();
        java.util.Map<Long, String> userPrimaryPositionMap = new java.util.HashMap<>();
        
        java.util.Map<Long, List<UsuarioPosicion>> upGrouped = upList.stream()
                .filter(up -> up.getPosicion() != null && up.getPosicion().getDeporte() != null && up.getPosicion().getDeporte().getId().equals(deporteId))
                .collect(Collectors.groupingBy(up -> up.getUsuario().getId()));
                
        upGrouped.forEach((userId, positions) -> {
            if (!positions.isEmpty()) {
                positions.sort(java.util.Comparator.comparing(UsuarioPosicion::getPrioridad));
                List<String> posNames = positions.stream().map(up -> up.getPosicion().getNombre()).collect(Collectors.toList());
                userPositionsMap.put(userId, posNames);
                userPrimaryPositionMap.put(userId, positions.get(0).getPosicion().getNombre());
            }
        });
        
        for (AsistenciaResponse res : responses) {
            if (res.getUsuarioId() != null) {
                if (res.getPosicionPreferidaNombre() == null) {
                    res.setPosicionPreferidaNombre(userPrimaryPositionMap.get(res.getUsuarioId()));
                }
                if (res.getPosicionesPreferidasNombres() == null || res.getPosicionesPreferidasNombres().isEmpty()) {
                    res.setPosicionesPreferidasNombres(userPositionsMap.getOrDefault(res.getUsuarioId(), java.util.List.of()));
                }
            }
        }
    }

    public List<AsistenciaResponse> recalcularPosicionesPorEquipo(Long convocatoriaId) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + convocatoriaId));
        if (!convocatoriaAccessService.canManageAttendance(convocatoria, securityService.getCurrentUserId())) {
            throw new ForbiddenException("No tienes permiso para recalcular posiciones de esta convocatoria.");
        }
        if (!isGroupFormation(convocatoria)) {
            throw new BusinessException("El recalculo por posiciones solo aplica a equipos por grupo.");
        }

        List<ConvocatoriaGrupoEquipo> equipos = convocatoriaGrupoEquipoRepository.findByConvocatoriaIdOrderByOrdenAsc(convocatoriaId);
        List<ReglaPosicionEquipo> reglas = convocatoria.getDeporte() == null
                ? List.of()
                : reglaPosicionEquipoRepository.findByDeporteIdAndActivoTrueOrderByPosicionNombreAsc(convocatoria.getDeporte().getId());
        List<Asistencia> asistencias = asistenciaRepository.findByConvocatoriaId(convocatoriaId);

        for (ConvocatoriaGrupoEquipo equipo : equipos) {
            List<Asistencia> candidatos = asistencias.stream()
                    .filter(a -> a.getBando() != null && a.getBando().getId().equals(equipo.getEquipo().getId()))
                    .filter(a -> a.getEstado() == EstadoAsistencia.ASISTIRE || a.getEstado() == EstadoAsistencia.LISTA_ESPERA)
                    .sorted(java.util.Comparator.comparing(Asistencia::getFechaRespuesta))
                    .toList();
            recalcularEquipoPorPosicion(equipo, candidatos, reglas);
        }

        List<Asistencia> saved = asistenciaRepository.saveAll(asistencias);
        List<AsistenciaResponse> responses = saved.stream()
                .map(asistenciaMapper::toResponse)
                .collect(Collectors.toList());
        if (convocatoria.getDeporte() != null) {
            populateUserPositions(responses, convocatoria.getDeporte().getId());
        }
        return responses;
    }

    private void recalcularEquipoPorPosicion(
            ConvocatoriaGrupoEquipo equipo,
            List<Asistencia> candidatos,
            List<ReglaPosicionEquipo> reglas
    ) {
        int cupo = equipo.getCupoTitulares() != null ? equipo.getCupoTitulares() : 1;
        java.util.Set<Long> titularesIds = new java.util.LinkedHashSet<>();

        for (ReglaPosicionEquipo regla : reglas) {
            int cantidad = regla.getCantidadTitulares() != null ? regla.getCantidadTitulares() : 0;
            if (cantidad <= 0) {
                continue;
            }
            List<Asistencia> matches = candidatos.stream()
                    .filter(a -> !titularesIds.contains(a.getId()))
                    .filter(a -> matchesPosicion(a, regla.getPosicion()))
                    .sorted(java.util.Comparator.comparing(Asistencia::getFechaRespuesta))
                    .toList();
            int asignados = 0;
            for (Asistencia asistencia : matches) {
                if (titularesIds.size() >= cupo || asignados >= cantidad) {
                    break;
                }
                titularesIds.add(asistencia.getId());
                asistencia.setPosicionAsignada(regla.getPosicion());
                asignados++;
            }
        }

        for (Asistencia asistencia : candidatos) {
            if (titularesIds.size() >= cupo) {
                break;
            }
            titularesIds.add(asistencia.getId());
            if (asistencia.getPosicionAsignada() == null) {
                asistencia.setPosicionAsignada(resolvePreferredPosition(asistencia));
            }
        }

        for (Asistencia asistencia : candidatos) {
            if (titularesIds.contains(asistencia.getId())) {
                asistencia.setEstado(EstadoAsistencia.ASISTIRE);
                asistencia.setTipoConfirmacion(TipoConfirmacion.TITULAR);
            } else {
                asistencia.setEstado(EstadoAsistencia.LISTA_ESPERA);
                asistencia.setTipoConfirmacion(TipoConfirmacion.ESPERA);
                asistencia.setPosicionAsignada(null);
            }
        }
    }

    private boolean matchesPosicion(Asistencia asistencia, PosicionesDeporte posicion) {
        if (posicion == null) {
            return false;
        }
        if (asistencia.getPosicionAsignada() != null && asistencia.getPosicionAsignada().getId().equals(posicion.getId())) {
            return true;
        }
        if (asistencia.getPosicionPreferida() != null && asistencia.getPosicionPreferida().getId().equals(posicion.getId())) {
            return true;
        }
        return asistencia.getPosicionesPreferidas() != null
                && asistencia.getPosicionesPreferidas().stream().anyMatch(p -> p.getId().equals(posicion.getId()));
    }

    private PosicionesDeporte resolvePreferredPosition(Asistencia asistencia) {
        if (asistencia.getPosicionAsignada() != null) {
            return asistencia.getPosicionAsignada();
        }
        if (asistencia.getPosicionPreferida() != null) {
            return asistencia.getPosicionPreferida();
        }
        if (asistencia.getPosicionesPreferidas() != null && !asistencia.getPosicionesPreferidas().isEmpty()) {
            return asistencia.getPosicionesPreferidas().get(0);
        }
        return null;
    }

}
