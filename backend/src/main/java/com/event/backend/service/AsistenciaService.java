package com.event.backend.service;

import com.event.backend.dto.asistencia.AsistenciaRequest;
import com.event.backend.dto.asistencia.AsistenciaResponse;
import com.event.backend.dto.asistencia.AsistenciaUpdateRequest;
import com.event.backend.exception.ForbiddenException;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.*;
import com.event.backend.repository.*;
import com.event.backend.security.SecurityService;
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

    @Transactional(readOnly = true)
    public List<AsistenciaResponse> findByConvocatoriaId(Long convocatoriaId) {
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

    public AsistenciaResponse create(AsistenciaRequest request) {
        Usuario usuario = securityService.getCurrentUser();
        Convocatoria convocatoria = convocatoriaRepository.findById(request.getConvocatoriaId())
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + request.getConvocatoriaId()));

        validateConvocatoriaNotInProgress(convocatoria);

        // Validar si es una convocatoria abierta (categoria LIBRE), debe ser del deporte que practica el usuario
        Deporte deporteConvocatoria = convocatoria.getDeporte();
        if (deporteConvocatoria != null && "LIBRE".equalsIgnoreCase(convocatoria.getCategoria())) {
            List<UsuarioPosicion> posicionesUsuario = usuarioPosicionRepository.findByUsuarioId(usuario.getId());
            boolean practicaDeporte = posicionesUsuario.stream()
                    .anyMatch(up -> up.getPosicion() != null 
                            && up.getPosicion().getDeporte() != null 
                            && up.getPosicion().getDeporte().getId().equals(deporteConvocatoria.getId()));
            
            if (!practicaDeporte) {
                throw new com.event.backend.exception.ConflictException("Solo los jugadores que practican el deporte " 
                        + deporteConvocatoria.getNombre() + " pueden inscribirse a esta convocatoria abierta. "
                        + "Configura tus demarcaciones de " + deporteConvocatoria.getNombre() + " en tu perfil para continuar.");
            }
        }

        // Si es un jugador externo (invitado por el usuario actual)
        if (request.getNombreExterno() != null && !request.getNombreExterno().trim().isEmpty()) {
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

        var existing = asistenciaRepository.findByConvocatoriaIdAndUsuarioId(request.getConvocatoriaId(), usuario.getId());
        if (existing.isPresent()) {
            Asistencia asistencia = existing.get();
            if (request.getEstado() != null) {
                EstadoAsistencia requestedEstado = EstadoAsistencia.valueOf(request.getEstado());
                if (requestedEstado == EstadoAsistencia.ASISTIRE && asistencia.getEstado() != EstadoAsistencia.ASISTIRE) {
                    asistencia.setEstado(evaluateEstadoWithCupo(asistencia.getConvocatoria(), requestedEstado));
                } else {
                    asistencia.setEstado(requestedEstado);
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

        validateConvocatoriaNotInProgress(asistencia.getConvocatoria());

        Long currentUserId = securityService.getCurrentUserId();
        boolean isOwner = asistencia.getUsuario() != null && asistencia.getUsuario().getId().equals(currentUserId);
        boolean isHost = asistencia.getInvitadoPor() != null && asistencia.getInvitadoPor().getId().equals(currentUserId);

        if (!isOwner && !isHost && !hasAdminPermission()) {
            throw new ForbiddenException("No tienes permiso para editar esta asistencia");
        }

        EstadoAsistencia oldEstado = asistencia.getEstado();
        EstadoAsistencia newEstado = request.getEstado();

        if (request.getNombreExterno() != null) {
            asistencia.setNombreExterno(request.getNombreExterno().trim().isEmpty() ? null : request.getNombreExterno().trim());
        }

        if (newEstado != null) {
            boolean isOldAttending = (oldEstado == EstadoAsistencia.ASISTIRE || oldEstado == EstadoAsistencia.LISTA_ESPERA);
            boolean isNewAttending = (newEstado == EstadoAsistencia.ASISTIRE || newEstado == EstadoAsistencia.LISTA_ESPERA);

            if (isNewAttending && isOldAttending) {
                newEstado = oldEstado;
            } else if (newEstado == EstadoAsistencia.ASISTIRE && !isOldAttending) {
                Convocatoria conv = asistencia.getConvocatoria();
                newEstado = evaluateEstadoWithCupo(conv, newEstado);
                asistencia.setFechaRespuesta(LocalDateTime.now());
            } else if (newEstado != oldEstado) {
                asistencia.setFechaRespuesta(LocalDateTime.now());
            }
            asistencia.setEstado(newEstado);
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
            if (request.getBandoId() <= 0) {
                asistencia.setBando(null);
            } else {
                BandoConvocatoria bando = bandoRepository.findById(request.getBandoId())
                        .orElseThrow(() -> new NotFoundException("Bando no encontrado con id: " + request.getBandoId()));
                asistencia.setBando(bando);
            }
        }

        asistencia = asistenciaRepository.save(asistencia);

        if (oldEstado == EstadoAsistencia.ASISTIRE && newEstado != null && newEstado != EstadoAsistencia.ASISTIRE) {
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

        validateConvocatoriaNotInProgress(asistencia.getConvocatoria());

        Long currentUserId = securityService.getCurrentUserId();
        boolean isOwner = asistencia.getUsuario() != null && asistencia.getUsuario().getId().equals(currentUserId);
        boolean isHost = asistencia.getInvitadoPor() != null && asistencia.getInvitadoPor().getId().equals(currentUserId);

        if (!isOwner && !isHost && !hasAdminPermission()) {
            throw new ForbiddenException("No tienes permiso para eliminar esta asistencia");
        }

        EstadoAsistencia estado = asistencia.getEstado();
        Long convocatoriaId = asistencia.getConvocatoria().getId();

        asistenciaRepository.deleteById(id);

        if (estado == EstadoAsistencia.ASISTIRE) {
            promoteFromWaitlist(convocatoriaId);
        }
    }

    private boolean hasAdminPermission() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("gestionar_convocatorias")
                        || a.getAuthority().equals("ROLE_SUPERADMIN"));
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

    public List<AsistenciaResponse> bulkInvite(Long convocatoriaId, List<Long> usuarioIds) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada"));

        validateConvocatoriaNotInProgress(convocatoria);

        List<Asistencia> existing = asistenciaRepository.findByConvocatoriaId(convocatoriaId);
        Set<Long> existingUserIds = existing.stream()
                .filter(a -> a.getUsuario() != null)
                .map(a -> a.getUsuario().getId())
                .collect(Collectors.toSet());

        List<Long> newIds = usuarioIds.stream().filter(uid -> !existingUserIds.contains(uid)).toList();
        if (newIds.isEmpty()) return List.of();

        List<Usuario> users = usuarioRepository.findAllById(newIds);

        List<Asistencia> newAsistencias = users.stream()
                .map(usuario -> Asistencia.builder()
                        .convocatoria(convocatoria)
                        .usuario(usuario)
                        .estado(EstadoAsistencia.PENDIENTE)
                        .build())
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
            validateConvocatoriaNotInProgress(asistencias.get(0).getConvocatoria());
        }
        Long currentUserId = securityService.getCurrentUserId();
        
        for (Asistencia a : asistencias) {
            boolean isOwner = a.getUsuario() != null && a.getUsuario().getId().equals(currentUserId);
            boolean isHost = a.getInvitadoPor() != null && a.getInvitadoPor().getId().equals(currentUserId);
            if (!isOwner && !isHost && !hasAdminPermission()) {
                throw new ForbiddenException("No tienes permiso para eliminar esta asistencia: " + a.getId());
            }
        }
        
        asistenciaRepository.deleteAll(asistencias);
        
        for (Asistencia a : asistencias) {
            if (a.getEstado() == EstadoAsistencia.ASISTIRE) {
                promoteFromWaitlist(a.getConvocatoria().getId());
            }
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

    private void validateConvocatoriaNotInProgress(Convocatoria c) {
        if (c.getEstado() == EstadoConvocatoria.EN_PROGRESO || 
            c.getEstado() == EstadoConvocatoria.FINALIZADA || 
            c.getEstado() == EstadoConvocatoria.CANCELADA || 
            (c.getFechaHora() != null && !c.getFechaHora().isAfter(LocalDateTime.now()))) {
            throw new com.event.backend.exception.BusinessException("No se pueden realizar cambios en las asistencias de una convocatoria en progreso, finalizada o cancelada.");
        }
    }
}
