package com.event.backend.service;

import com.event.backend.dto.convocatoria.ConvocatoriaRequest;
import com.event.backend.dto.convocatoria.ConvocatoriaResponse;
import com.event.backend.exception.BusinessException;
import com.event.backend.util.ConvocatoriaScheduleHelper;
import com.event.backend.exception.ForbiddenException;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.Convocatoria;
import com.event.backend.model.Deporte;
import com.event.backend.model.EstadoConvocatoria;
import com.event.backend.model.Grupo;
import com.event.backend.model.TipoInvitacion;
import com.event.backend.model.Usuario;
import com.event.backend.repository.ConvocatoriaRepository;
import com.event.backend.repository.DeporteRepository;
import com.event.backend.repository.GrupoRepository;
import com.event.backend.security.SecurityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ConvocatoriaService {

    private final ConvocatoriaRepository convocatoriaRepository;
    private final DeporteRepository deporteRepository;
    private final GrupoRepository grupoRepository;
    private final SecurityService securityService;
    private final ConvocatoriaAccessService convocatoriaAccessService;

    public boolean canManageAny() {
        return convocatoriaAccessService.canManageAny();
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaResponse> findAll() {
        if (!convocatoriaAccessService.canManageAny()) {
            Long userId = securityService.getCurrentUserId();
            return convocatoriaRepository.findByCreadoPorId(userId).stream()
                    .map(this::toResponse)
                    .toList();
        }
        return convocatoriaRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaResponse> findAllVisible() {
        Long userId = securityService.getCurrentUserId();
        return convocatoriaRepository.findByEstadoNot(EstadoConvocatoria.BORRADOR).stream()
                .filter(c -> convocatoriaAccessService.canView(c, userId))
                .map(c -> toResponse(c, true))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaResponse> findByEstado(EstadoConvocatoria estado) {
        Long userId = securityService.getCurrentUserId();
        boolean canManageAny = convocatoriaAccessService.canManageAny();

        return convocatoriaRepository.findByEstado(estado).stream()
                .filter(c -> canManageAny || convocatoriaAccessService.canView(c, userId))
                .map(c -> toResponse(c, true))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaResponse> findByCreador(Long usuarioId) {
        return convocatoriaRepository.findByCreadoPorId(usuarioId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ConvocatoriaResponse findById(Long id) {
        Convocatoria convocatoria = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + id));
        Long userId = securityService.getCurrentUserId();
        convocatoriaAccessService.assertCanView(convocatoria, userId);
        return toResponse(convocatoria, true);
    }

    public ConvocatoriaResponse create(ConvocatoriaRequest request) {
        Usuario creador = securityService.getCurrentUser();
        Deporte deporte = deporteRepository.findById(request.getDeporteId())
                .orElseThrow(() -> new NotFoundException("Deporte no encontrado con id: " + request.getDeporteId()));

        validateSchedule(request, null);

        EstadoConvocatoria estado = request.getEstado() != null ? request.getEstado() : EstadoConvocatoria.BORRADOR;
        LocalDateTime fechaApertura = request.getFechaAperturaInscripcion();
        if (estado == EstadoConvocatoria.ABIERTA && fechaApertura == null) {
            fechaApertura = LocalDateTime.now();
        }

        TipoInvitacion tipoInvitacion = request.getTipoInvitacion() != null
                ? request.getTipoInvitacion()
                : TipoInvitacion.ABIERTA;
        Grupo grupo = resolveGrupoForTipo(tipoInvitacion, request.getGrupoId());

        Convocatoria convocatoria = Convocatoria.builder()
                .titulo(request.getTitulo())
                .descripcion(request.getDescripcion())
                .deporte(deporte)
                .fechaHora(request.getFechaHora())
                .fechaHoraFin(request.getFechaHoraFin())
                .duracionEstimadaMinutos(request.getDuracionEstimadaMinutos() != null ? request.getDuracionEstimadaMinutos() : 60)
                .lugar(request.getLugar())
                .creadoPor(creador)
                .estado(estado)
                .cupoMaximo(request.getCupoMaximo() != null ? request.getCupoMaximo() : 0)
                .categoria(request.getCategoria())
                .fechaAperturaInscripcion(fechaApertura)
                .fechaLimiteInscripcion(request.getFechaLimiteInscripcion())
                .manejoExcedente(request.getManejoExcedente() != null ? request.getManejoExcedente() : "LISTA_ESPERA")
                .tipoInvitacion(tipoInvitacion)
                .grupo(grupo)
                .build();

        if (convocatoria.getFechaHoraFin() == null && convocatoria.getDuracionEstimadaMinutos() != null && convocatoria.getFechaHora() != null) {
            convocatoria.setFechaHoraFin(convocatoria.getFechaHora().plusMinutes(convocatoria.getDuracionEstimadaMinutos()));
        }

        convocatoria = convocatoriaRepository.save(convocatoria);
        return toResponse(convocatoria, true);
    }

    public ConvocatoriaResponse update(Long id, ConvocatoriaRequest request) {
        Convocatoria convocatoria = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + id));

        if (!convocatoriaAccessService.canEdit(convocatoria, securityService.getCurrentUserId())) {
            throw new ForbiddenException("No tienes permiso para editar esta convocatoria");
        }

        ConvocatoriaScheduleHelper.assertConvocatoriaEditable(convocatoria);

        validateSchedule(request, convocatoria);

        if (request.getTitulo() != null) convocatoria.setTitulo(request.getTitulo());
        if (request.getDescripcion() != null) convocatoria.setDescripcion(request.getDescripcion());
        if (request.getFechaHora() != null) convocatoria.setFechaHora(request.getFechaHora());
        if (request.getFechaHoraFin() != null) convocatoria.setFechaHoraFin(request.getFechaHoraFin());
        if (request.getDuracionEstimadaMinutos() != null) convocatoria.setDuracionEstimadaMinutos(request.getDuracionEstimadaMinutos());
        if (request.getLugar() != null) convocatoria.setLugar(request.getLugar());
        if (request.getCupoMaximo() != null) convocatoria.setCupoMaximo(request.getCupoMaximo());
        if (request.getCategoria() != null) convocatoria.setCategoria(request.getCategoria());
        if (request.getFechaAperturaInscripcion() != null) convocatoria.setFechaAperturaInscripcion(request.getFechaAperturaInscripcion());
        if (request.getFechaLimiteInscripcion() != null) convocatoria.setFechaLimiteInscripcion(request.getFechaLimiteInscripcion());
        if (request.getManejoExcedente() != null) convocatoria.setManejoExcedente(request.getManejoExcedente());

        if (request.getDeporteId() != null && (convocatoria.getDeporte() == null || !request.getDeporteId().equals(convocatoria.getDeporte().getId()))) {
            Deporte deporte = deporteRepository.findById(request.getDeporteId())
                    .orElseThrow(() -> new NotFoundException("Deporte no encontrado con id: " + request.getDeporteId()));
            convocatoria.setDeporte(deporte);
        }

        if (request.getTipoInvitacion() != null) {
            convocatoria.setTipoInvitacion(request.getTipoInvitacion());
            convocatoria.setGrupo(resolveGrupoForTipo(request.getTipoInvitacion(), request.getGrupoId()));
        } else if (request.getGrupoId() != null) {
            convocatoria.setGrupo(grupoRepository.findById(request.getGrupoId())
                    .orElseThrow(() -> new NotFoundException("Grupo no encontrado con id: " + request.getGrupoId())));
        }

        convocatoria = convocatoriaRepository.save(convocatoria);
        return toResponse(convocatoria, true);
    }

    public ConvocatoriaResponse abrir(Long id) {
        Convocatoria convocatoria = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + id));

        if (!convocatoriaAccessService.canPublish(convocatoria, securityService.getCurrentUserId())) {
            throw new ForbiddenException("No tienes permiso para abrir esta convocatoria");
        }

        if (convocatoria.getEstado() != EstadoConvocatoria.BORRADOR) {
            throw new BusinessException("Solo se pueden abrir convocatorias en estado BORRADOR");
        }

        LocalDateTime now = LocalDateTime.now();
        ConvocatoriaScheduleHelper.assertEventNotInPastForPublish(convocatoria.getFechaHora(), now);

        convocatoria.setEstado(EstadoConvocatoria.ABIERTA);
        if (convocatoria.getFechaAperturaInscripcion() == null) {
            convocatoria.setFechaAperturaInscripcion(LocalDateTime.now());
        }
        convocatoria = convocatoriaRepository.save(convocatoria);
        log.info("Convocatoria {} → ABIERTA", id);
        return toResponse(convocatoria);
    }

    public ConvocatoriaResponse cancelar(Long id) {
        Convocatoria convocatoria = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + id));

        if (!convocatoriaAccessService.canCancel(convocatoria, securityService.getCurrentUserId())) {
            throw new ForbiddenException("No tienes permiso para cancelar esta convocatoria");
        }

        ConvocatoriaScheduleHelper.assertConvocatoriaCancellable(convocatoria);

        convocatoria.setEstado(EstadoConvocatoria.CANCELADA);
        convocatoria = convocatoriaRepository.save(convocatoria);
        log.info("Convocatoria {} → CANCELADA", id);
        return toResponse(convocatoria);
    }

    public void delete(Long id) {
        Convocatoria convocatoria = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + id));

        if (!convocatoriaAccessService.canDelete(convocatoria, securityService.getCurrentUserId())) {
            throw new ForbiddenException("No tienes permiso para eliminar esta convocatoria");
        }

        ConvocatoriaScheduleHelper.assertConvocatoriaDeletable(convocatoria);

        convocatoriaRepository.deleteById(id);
    }

    private void validateSchedule(ConvocatoriaRequest request, Convocatoria existing) {
        LocalDateTime eventTime = request.getFechaHora() != null
                ? request.getFechaHora()
                : (existing != null ? existing.getFechaHora() : null);

        if (eventTime != null && request.getFechaHora() != null) {
            ConvocatoriaScheduleHelper.assertScheduleAllowed(eventTime, LocalDateTime.now());
        }

        if (request.getFechaLimiteInscripcion() != null && eventTime != null) {
            LocalDateTime limite = request.getFechaLimiteInscripcion();
            LocalDateTime now = LocalDateTime.now();
            if (!limite.isAfter(now)) {
                throw new BusinessException("El cierre de inscripciones debe ser en el futuro.");
            }
            if (!limite.isBefore(eventTime)) {
                throw new BusinessException("El cierre de inscripciones debe ser anterior al inicio del evento.");
            }
        }
    }

    private Grupo resolveGrupoForTipo(TipoInvitacion tipo, Long grupoId) {
        if (tipo != TipoInvitacion.GRUPO) {
            return null;
        }
        if (grupoId == null) {
            throw new BusinessException("Debes seleccionar un grupo para convocatorias restringidas por grupo.");
        }
        return grupoRepository.findById(grupoId)
                .orElseThrow(() -> new NotFoundException("Grupo no encontrado con id: " + grupoId));
    }

    private ConvocatoriaResponse toResponse(Convocatoria c) {
        return toResponse(c, false);
    }

    private ConvocatoriaResponse toResponse(Convocatoria c, boolean includeAccess) {
        ConvocatoriaResponse.ConvocatoriaResponseBuilder builder = ConvocatoriaResponse.builder()
                .id(c.getId())
                .titulo(c.getTitulo())
                .descripcion(c.getDescripcion())
                .deporteId(c.getDeporte() != null ? c.getDeporte().getId() : null)
                .deporteNombre(c.getDeporte() != null ? c.getDeporte().getNombre() : "Sin deporte")
                .fechaHora(c.getFechaHora())
                .fechaHoraFin(c.getFechaHoraFin())
                .duracionEstimadaMinutos(c.getDuracionEstimadaMinutos())
                .lugar(c.getLugar())
                .creadoPorId(c.getCreadoPor().getId())
                .creadoPorNombre(c.getCreadoPor().getNombre())
                .estado(c.getEstado())
                .fechaCreacion(c.getFechaCreacion())
                .cupoMaximo(c.getCupoMaximo())
                .categoria(c.getCategoria())
                .fechaAperturaInscripcion(c.getFechaAperturaInscripcion())
                .fechaLimiteInscripcion(c.getFechaLimiteInscripcion())
                .manejoExcedente(c.getManejoExcedente())
                .configuracionRecurrenteId(c.getConfiguracionRecurrente() != null ? c.getConfiguracionRecurrente().getId() : null)
                .deporteEsPorEquipos(c.getDeporte() != null ? c.getDeporte().getEsPorEquipos() : true)
                .tipoInvitacion(c.getTipoInvitacion() != null ? c.getTipoInvitacion() : TipoInvitacion.ABIERTA)
                .grupoId(c.getGrupo() != null ? c.getGrupo().getId() : null)
                .grupoNombre(c.getGrupo() != null ? c.getGrupo().getNombre() : null);

        LocalDateTime now = LocalDateTime.now();
        boolean fechaPasada = ConvocatoriaScheduleHelper.isDraftEventDatePassed(c, now);
        builder.fechaEventoPasada(fechaPasada)
                .puedePublicarse(ConvocatoriaScheduleHelper.canPublishDraft(c, now));

        if (includeAccess) {
            Long userId = securityService.getCurrentUserId();
            builder.puedeVer(convocatoriaAccessService.canView(c, userId))
                    .puedeInscribirse(convocatoriaAccessService.canSelfRegister(c, userId));
        }

        return builder.build();
    }
}
