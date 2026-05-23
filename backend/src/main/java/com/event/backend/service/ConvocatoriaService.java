package com.event.backend.service;

import com.event.backend.dto.convocatoria.ConvocatoriaRequest;
import com.event.backend.dto.convocatoria.ConvocatoriaResponse;
import com.event.backend.exception.BusinessException;
import com.event.backend.exception.ForbiddenException;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.Convocatoria;
import com.event.backend.model.Deporte;
import com.event.backend.model.EstadoConvocatoria;
import com.event.backend.model.Usuario;
import com.event.backend.repository.ConvocatoriaRepository;
import com.event.backend.repository.DeporteRepository;
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
    private final SecurityService securityService;

    @Transactional(readOnly = true)
    public List<ConvocatoriaResponse> findAll() {
        if (!securityService.isSuperAdmin()) {
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
        return convocatoriaRepository.findByEstadoNot(EstadoConvocatoria.BORRADOR).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaResponse> findByEstado(EstadoConvocatoria estado) {
        return convocatoriaRepository.findByEstado(estado).stream()
                .map(this::toResponse)
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
        return convocatoriaRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + id));
    }

    public ConvocatoriaResponse create(ConvocatoriaRequest request) {
        Usuario creador = securityService.getCurrentUser();
        Deporte deporte = deporteRepository.findById(request.getDeporteId())
                .orElseThrow(() -> new NotFoundException("Deporte no encontrado con id: " + request.getDeporteId()));

        if (request.getFechaHora() != null) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime eventTime = request.getFechaHora();
            if (eventTime.toLocalDate().isEqual(now.toLocalDate())) {
                if (eventTime.isBefore(now.plusHours(1))) {
                    throw new BusinessException("Para convocatorias del mismo día, la hora del evento debe ser al menos una hora posterior a la hora actual.");
                }
            } else if (eventTime.isBefore(now)) {
                throw new BusinessException("La fecha y hora de la convocatoria no puede ser en el pasado.");
            }
        }

        EstadoConvocatoria estado = request.getEstado() != null ? request.getEstado() : EstadoConvocatoria.BORRADOR;
        LocalDateTime fechaApertura = request.getFechaAperturaInscripcion();
        if (estado == EstadoConvocatoria.ABIERTA && fechaApertura == null) {
            fechaApertura = LocalDateTime.now();
        }

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
                .build();

        if (convocatoria.getFechaHoraFin() == null && convocatoria.getDuracionEstimadaMinutos() != null && convocatoria.getFechaHora() != null) {
            convocatoria.setFechaHoraFin(convocatoria.getFechaHora().plusMinutes(convocatoria.getDuracionEstimadaMinutos()));
        }

        convocatoria = convocatoriaRepository.save(convocatoria);
        return toResponse(convocatoria);
    }

    public ConvocatoriaResponse update(Long id, ConvocatoriaRequest request) {
        Convocatoria convocatoria = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + id));

        if (!securityService.isOwnerOrAdmin(convocatoria.getCreadoPor().getId())) {
            throw new ForbiddenException("No tienes permiso para editar esta convocatoria");
        }

        if (request.getFechaHora() != null) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime eventTime = request.getFechaHora();
            if (eventTime.toLocalDate().isEqual(now.toLocalDate())) {
                if (eventTime.isBefore(now.plusHours(1))) {
                    throw new BusinessException("Para convocatorias del mismo día, la hora del evento debe ser al menos una hora posterior a la hora actual.");
                }
            } else if (eventTime.isBefore(now)) {
                throw new BusinessException("La fecha y hora de la convocatoria no puede ser en el pasado.");
            }
        }

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

        convocatoria = convocatoriaRepository.save(convocatoria);
        return toResponse(convocatoria);
    }

    public ConvocatoriaResponse abrir(Long id) {
        Convocatoria convocatoria = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + id));

        if (!securityService.isOwnerOrAdmin(convocatoria.getCreadoPor().getId())) {
            throw new ForbiddenException("No tienes permiso para abrir esta convocatoria");
        }

        if (convocatoria.getEstado() != EstadoConvocatoria.BORRADOR) {
            throw new BusinessException("Solo se pueden abrir convocatorias en estado BORRADOR");
        }

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

        if (!securityService.isOwnerOrAdmin(convocatoria.getCreadoPor().getId())) {
            throw new ForbiddenException("No tienes permiso para cancelar esta convocatoria");
        }

        if (convocatoria.getEstado() == EstadoConvocatoria.FINALIZADA || convocatoria.getEstado() == EstadoConvocatoria.CANCELADA) {
            throw new BusinessException("No se puede cancelar una convocatoria " + convocatoria.getEstado().name().toLowerCase());
        }

        convocatoria.setEstado(EstadoConvocatoria.CANCELADA);
        convocatoria = convocatoriaRepository.save(convocatoria);
        log.info("Convocatoria {} → CANCELADA", id);
        return toResponse(convocatoria);
    }

    public void delete(Long id) {
        Convocatoria convocatoria = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + id));

        if (!securityService.isOwnerOrAdmin(convocatoria.getCreadoPor().getId())) {
            throw new ForbiddenException("No tienes permiso para eliminar esta convocatoria");
        }

        convocatoriaRepository.deleteById(id);
    }

    private ConvocatoriaResponse toResponse(Convocatoria c) {
        return ConvocatoriaResponse.builder()
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
                .build();
    }
}